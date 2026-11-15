import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { copy } from "@/shared/copy/patient";
import { currentMic, getInputVolume, requestMic, stopMic } from "@/features/voice/mic";
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

type CallState = "incoming" | "live" | "ending" | "lost" | "error";

function CallScreen() {
  const navigate = useNavigate();
  const [state, setState] = useState<CallState>("incoming");

  // Connection lost: the microphone stream ended during the call.
  useEffect(() => {
    if (state !== "live") return;
    const track = currentMic()?.getAudioTracks()[0];
    if (!track) return;
    const onEnded = () => setState("lost");
    track.addEventListener("ended", onEnded);
    return () => track.removeEventListener("ended", onEnded);
  }, [state]);

  // No voice agent is connected yet, so nothing is collected: ending and lost settle on the error state.
  useEffect(() => {
    if (state !== "ending" && state !== "lost") return;
    const timer = setTimeout(() => setState("error"), state === "ending" ? 2000 : 2600);
    return () => clearTimeout(timer);
  }, [state]);

  useEffect(() => () => stopMic(), []);

  const answer = async () => {
    const mic = await requestMic();
    if (!mic) { toast(copy.start.micUnavailable); return; }
    setState("live");
  };
  const hangUp = () => { stopMic(); setState("ending"); };

  return (
    <>
      <AldiOrb placement="call" agentState={state === "ending" ? "thinking" : null} getInputVolume={state === "live" ? getInputVolume : undefined} />

      {state === "incoming" && (
        <>
          <p className="call-status" role="status">{copy.call.incoming}</p>
          <Button variant="patient" size="patient" className="w-full" onClick={() => void answer()}>{copy.call.answer}</Button>
          <div className="glass-label w-full p-0">
            <Button variant="patientGhost" size="patient" className="w-full" onClick={() => { stopMic(); void navigate({ to: "/" }); }}>{copy.call.notNow}</Button>
          </div>
        </>
      )}

      {state === "live" && (
        <>
          <div className="card-patient w-full p-5 text-center font-bold" role="status">{copy.call.live(0)}</div>
          <Button variant="hangup" size="patient" className="w-full" onClick={hangUp}>{copy.call.hangUp}</Button>
        </>
      )}

      {state === "ending" && <p className="call-status" role="status">{copy.call.ending}</p>}
      {state === "lost" && <p className="call-status" role="status">{copy.call.lost}</p>}

      {state === "error" && (
        <>
          <p className="call-status" role="alert">{copy.call.error}</p>
          <Button variant="patientSecondary" size="patient" className="w-full" onClick={() => setState("incoming")}>{copy.call.retry}</Button>
          <div className="glass-label w-full p-0">
            <Button variant="patientGhost" size="patient" className="w-full" onClick={() => void navigate({ to: "/text" })}>{copy.call.write}</Button>
          </div>
        </>
      )}
    </>
  );
}
