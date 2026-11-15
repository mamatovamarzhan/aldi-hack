import { ClientOnly, createFileRoute, useNavigate } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useState } from "react";

import { useRequireRole } from "@/features/auth/session";
import { CONSENT_VERSION } from "@/features/session/remote";
import { hasConsent } from "@/features/session/storage";
import { AldiOrb } from "@/shared/ui/sky/AldiOrb";

export const Route = createFileRoute("/call")({
  head: () => ({
    meta: [
      { title: "Aldi" },
      { name: "description", content: "Aldi" },
      { property: "og:title", content: "Aldi" },
      { property: "og:description", content: "Aldi" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  // No bottom menu here: during a call its controls stay in front.
  staticData: { patient: "call" },
  component: CallScreen,
});

// The call (ElevenLabs agent, live card count, card building) lives in features/voice/VoiceCall.
const VoiceCall = lazy(() => import("@/features/voice/VoiceCall"));

function CallScreen() {
  const navigate = useNavigate();
  const me = useRequireRole("PATIENT");
  const [allowed, setAllowed] = useState(false);
  // A conversation never starts before the consent screen.
  useEffect(() => {
    if (!me) return;
    if (hasConsent(CONSENT_VERSION)) setAllowed(true);
    else void navigate({ to: "/assistant", replace: true });
  }, [me, navigate]);

  const orb = <AldiOrb placement="call" />;
  if (!me || !allowed) return orb;
  return (
    <ClientOnly fallback={orb}>
      <Suspense fallback={orb}>
        <VoiceCall />
      </Suspense>
    </ClientOnly>
  );
}
