import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useId, useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { ApiError } from "@/shared/api/client";
import { authCopy } from "@/shared/copy/auth";
import { homeFor, login, takeLoginReason } from "@/features/auth/session";
import { AldiTitle } from "@/shared/ui/patient/AldiTitle";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Aldi" }, { name: "description", content: "Aldi" }] }),
  staticData: { patient: "veil" },
  component: LoginScreen,
});

const t = authCopy.login;

// Demo accounts exist only in seeded demo data (fictional people). Shown in development,
// or when a build is explicitly marked as a demo.
const DEMO = import.meta.env.DEV || import.meta.env["VITE_DEMO"] === "true";
const DEMO_PASSWORD = "aldi-demo-2026";

function LoginScreen() {
  const navigate = useNavigate();
  const loginId = useId();
  const passwordId = useId();
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (takeLoginReason() === "expired") setNotice(t.expired); }, []);

  const enter = async (loginName: string, pass: string) => {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      void navigate({ to: homeFor(await login(loginName, pass)), replace: true });
    } catch (e) {
      const code = e instanceof ApiError ? e.code : "";
      setError(code === "INVALID_CREDENTIALS" ? t.wrong : code === "RATE_LIMITED" ? t.locked : e instanceof ApiError ? e.message : t.failed);
      setBusy(false);
    }
  };
  const submit = (event: FormEvent) => { event.preventDefault(); void enter(name, password); };

  return (
    <>
      <AldiTitle />
      <form onSubmit={submit} className="card-patient flex w-full flex-col gap-4 p-5">
        <h1 className="screen-title">{t.title}</h1>
        {notice && <p role="status" className="rounded-xl border border-border p-3 text-base">{notice}</p>}
        <p className="text-text-muted">{t.hint}</p>
        <label htmlFor={loginId} className="text-sm text-text-muted">{t.login}</label>
        <input id={loginId} value={name} onChange={e => setName(e.target.value)} autoComplete="username" autoCapitalize="none" required className="patient-textarea w-full rounded-xl border border-border p-3" />
        <label htmlFor={passwordId} className="text-sm text-text-muted">{t.password}</label>
        <input id={passwordId} type="password" value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password" required className="patient-textarea w-full rounded-xl border border-border p-3" />
        {error && <p role="alert" className="font-bold text-uncertain-foreground">{error}</p>}
        <Button type="submit" variant="patient" size="patient" className="w-full" disabled={busy || !name || !password}>{t.submit}</Button>
        <Link to="/invite" className="back-link self-center">{t.haveInvite}</Link>
      </form>

      {DEMO && (
        <section className="card-patient flex w-full flex-col gap-3 p-5" aria-label={authCopy.demo.title}>
          <h2 className="font-bold">{authCopy.demo.title}</h2>
          <p className="text-base text-text-muted">{authCopy.demo.note}</p>
          <Button variant="patientSecondary" size="patient" className="w-full" disabled={busy} onClick={() => void enter("mama.demo", DEMO_PASSWORD)}>{authCopy.demo.patient}</Button>
          <Button variant="patientSecondary" size="patient" className="w-full" disabled={busy} onClick={() => void enter("doctor.demo", DEMO_PASSWORD)}>{authCopy.demo.doctor}</Button>
        </section>
      )}
    </>
  );
}
