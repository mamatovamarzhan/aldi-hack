import { ClientOnly, createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";

import { useRequireRole } from "@/features/auth/session";
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
  staticData: { patient: "call" },
  component: CallScreen,
});

// The call (ElevenLabs agent, live card count, card building) lives in features/voice/VoiceCall.
const VoiceCall = lazy(() => import("@/features/voice/VoiceCall"));

function CallScreen() {
  const me = useRequireRole("PATIENT");
  const orb = <AldiOrb placement="call" />;
  if (!me) return orb;
  return (
    <ClientOnly fallback={orb}>
      <Suspense fallback={orb}>
        <VoiceCall />
      </Suspense>
    </ClientOnly>
  );
}
