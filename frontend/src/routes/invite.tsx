import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useId, useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { ApiError } from "@/shared/api/client";
import { authCopy } from "@/shared/copy/auth";
import { acceptInvitation, homeFor } from "@/features/auth/session";
import { AldiTitle } from "@/shared/ui/patient/AldiTitle";

export const Route = createFileRoute("/invite")({
  head: () => ({ meta: [{ title: "Aldi" }, { name: "description", content: "Aldi" }] }),
  staticData: { patient: "veil" },
  component: InviteScreen,
});

const t = authCopy.invite;

/** First sign-in: the link from the doctor carries a one-time code; the patient sets her own login and password. */
function InviteScreen() {
  const navigate = useNavigate();
  const tokenId = useId();
  const loginId = useId();
  const passwordId = useId();
  const [token, setToken] = useState("");
  const [fromLink, setFromLink] = useState(false);
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [expired, setExpired] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const value = new URLSearchParams(window.location.search).get("token")?.trim();
    if (!value) return;
    setToken(value);
    setFromLink(true);
    // The one-time code should not stay in the address bar or the history.
    window.history.replaceState(null, "", window.location.pathname);
  }, []);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      void navigate({ to: homeFor(await acceptInvitation(token.trim(), name, password)), replace: true });
    } catch (e) {
      const code = e instanceof ApiError ? e.code : "";
      if (code === "INVITATION_INVALID") setExpired(true);
      else setError(code === "LOGIN_TAKEN" ? t.loginTaken : code === "INVALID_INPUT" ? t.invalid : t.failed);
      setBusy(false);
    }
  };

  return (
    <>
      <AldiTitle />
      {expired ? (
        <section className="card-patient flex w-full flex-col gap-4 p-5" role="alert">
          <h1 className="screen-title">{t.title}</h1>
          <p>{t.expired}</p>
          <Link to="/login" className="back-link self-center">{t.toLogin}</Link>
        </section>
      ) : (
        <form onSubmit={e => void submit(e)} className="card-patient flex w-full flex-col gap-4 p-5">
          <h1 className="screen-title">{t.title}</h1>
          <p className="text-text-muted">{t.hint}</p>
          {!fromLink && (
            <>
              <label htmlFor={tokenId} className="text-sm text-text-muted">{t.token}</label>
              <input id={tokenId} value={token} onChange={e => setToken(e.target.value)} autoCapitalize="none" autoComplete="off" required className="patient-textarea w-full rounded-xl border border-border p-3" />
            </>
          )}
          <label htmlFor={loginId} className="text-sm text-text-muted">{t.login}</label>
          <input id={loginId} value={name} onChange={e => setName(e.target.value)} autoComplete="username" autoCapitalize="none" required minLength={3} aria-describedby={`${loginId}-help`} className="patient-textarea w-full rounded-xl border border-border p-3" />
          <p id={`${loginId}-help`} className="-mt-2 text-sm text-text-muted">{t.loginHelp}</p>
          <label htmlFor={passwordId} className="text-sm text-text-muted">{t.password}</label>
          <input id={passwordId} type="password" value={password} onChange={e => setPassword(e.target.value)} autoComplete="new-password" required minLength={8} aria-describedby={`${passwordId}-help`} className="patient-textarea w-full rounded-xl border border-border p-3" />
          <p id={`${passwordId}-help`} className="-mt-2 text-sm text-text-muted">{t.passwordHelp}</p>
          {error && <p role="alert" className="font-bold text-uncertain-foreground">{error}</p>}
          <Button type="submit" variant="patient" size="patient" className="w-full" disabled={busy || !token || name.length < 3 || password.length < 8}>{t.submit}</Button>
          <Link to="/login" className="back-link self-center">{t.toLogin}</Link>
        </form>
      )}
    </>
  );
}
