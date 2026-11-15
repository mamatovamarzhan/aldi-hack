import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useId, useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { ApiError } from "@/shared/api/client";
import { authCopy } from "@/shared/copy/auth";
import { homeFor, login } from "@/features/auth/session";
import { AldiTitle } from "@/shared/ui/patient/AldiTitle";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Aldi" }, { name: "description", content: "Aldi" }] }),
  staticData: { patient: "veil" },
  component: LoginScreen,
});

function LoginScreen() {
  const navigate = useNavigate();
  const loginId = useId();
  const passwordId = useId();
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const role = await login(name, password);
      void navigate({ to: homeFor(role), replace: true });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : authCopy.login.failed);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <AldiTitle />
      <form onSubmit={e => void submit(e)} className="card-patient flex w-full flex-col gap-4 p-5">
        <h1 className="screen-title">{authCopy.login.title}</h1>
        <p className="text-text-muted">{authCopy.login.hint}</p>
        <label htmlFor={loginId} className="text-sm text-text-muted">{authCopy.login.login}</label>
        <input id={loginId} value={name} onChange={e => setName(e.target.value)} autoComplete="username" autoCapitalize="none" required className="patient-textarea w-full rounded-xl border border-border p-3" />
        <label htmlFor={passwordId} className="text-sm text-text-muted">{authCopy.login.password}</label>
        <input id={passwordId} type="password" value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password" required className="patient-textarea w-full rounded-xl border border-border p-3" />
        {error && <p role="alert" className="font-bold text-uncertain-foreground">{error}</p>}
        <Button type="submit" variant="patient" size="patient" className="w-full" disabled={busy || !name || !password}>{authCopy.login.submit}</Button>
      </form>
    </>
  );
}
