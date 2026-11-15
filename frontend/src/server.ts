import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!isH3SwallowedErrorBody(body)) return response;

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function isH3SwallowedErrorBody(body: string): boolean {
  try {
    const payload = JSON.parse(body) as { unhandled?: unknown; message?: unknown };
    return payload.unhandled === true && payload.message === "HTTPError";
  } catch {
    return false;
  }
}

// Where the backend API lives (for example https://aldi-api.up.railway.app). Set it as a secret or
// environment variable named API_ORIGIN on the hosting; VITE_API_ORIGIN works at build time.
function apiOrigin(env: unknown): string | undefined {
  const fromEnv = (env as Record<string, unknown> | null | undefined)?.["API_ORIGIN"];
  const fromProcess = typeof process !== "undefined" ? process.env?.["API_ORIGIN"] : undefined;
  const value = (typeof fromEnv === "string" && fromEnv) || fromProcess || (import.meta.env["VITE_API_ORIGIN"] as string | undefined);
  return value ? value.replace(/\/+$/, "") : undefined;
}

// The browser always calls /api on this site; the server passes the request on to the backend.
// This keeps the session cookie first-party, so sign-in works without cross-site cookies.
async function proxyApi(request: Request, origin: string): Promise<Response> {
  const url = new URL(request.url);
  const headers = new Headers(request.headers);
  headers.delete("host");
  const init: RequestInit = { method: request.method, headers, redirect: "manual" };
  if (request.method !== "GET" && request.method !== "HEAD") init.body = await request.arrayBuffer();
  try {
    const upstream = await fetch(`${origin}${url.pathname}${url.search}`, init);
    const responseHeaders = new Headers(upstream.headers);
    // The body is passed through as decoded bytes; the hosting compresses it again at the edge.
    responseHeaders.delete("content-encoding");
    responseHeaders.delete("content-length");
    return new Response(upstream.body, { status: upstream.status, headers: responseHeaders });
  } catch (error) {
    console.error(error);
    return Response.json({ error: { code: "NETWORK", message: "Сервер недоступен" } }, { status: 502 });
  }
}

// Hosting compresses every response at the edge. Never compress a body (gzip, brotli,
// CompressionStream) or set content-encoding here or in a server route: the body gets encoded
// twice and renders garbled.
export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    try {
      if (new URL(request.url).pathname.startsWith("/api/")) {
        const origin = apiOrigin(env);
        if (origin) return await proxyApi(request, origin);
        return Response.json({ error: { code: "NOT_CONFIGURED", message: "Не задан адрес сервера (API_ORIGIN)" } }, { status: 503 });
      }
      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      return await normalizeCatastrophicSsrResponse(response);
    } catch (error) {
      console.error(error);
      return new Response(renderErrorPage(), {
        status: 500,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
  },
};
