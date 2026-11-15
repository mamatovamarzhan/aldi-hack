// The voice call itself. Loaded only in the browser (the ElevenLabs SDK needs audio APIs),
// so the route stays server-renderable.
import { ConversationProvider, useConversation } from '@elevenlabs/react';
import { useNavigate } from '@tanstack/react-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { copy } from '@/shared/copy/patient';
import { finishVoice, previewCount, startVoice } from '@/features/session/remote';
import { saveCard } from '@/features/session/storage';
import { requestMic, stopMic } from '@/features/voice/mic';
import { AldiOrb } from '@/shared/ui/sky/AldiOrb';

type CallState = 'incoming' | 'connecting' | 'live' | 'ending' | 'lost' | 'error';

function Call() {
  const navigate = useNavigate();
  const conversation = useConversation();
  const [state, setState] = useState<CallState>('incoming');
  const [filled, setFilled] = useState(0);
  const stateRef = useRef<CallState>('incoming');
  const intakeId = useRef<string | null>(null);
  const conversationId = useRef<string | null>(null);
  const finishing = useRef(false);
  const go = (next: CallState) => { stateRef.current = next; setState(next); };

  // The server takes the transcript from the voice provider and builds the card.
  const finish = useCallback(async () => {
    if (finishing.current) return;
    finishing.current = true;
    try {
      if (!intakeId.current || !conversationId.current) throw new Error('no conversation');
      saveCard(await finishVoice(intakeId.current, conversationId.current));
      void navigate({ to: '/card' });
    } catch {
      go('error');
    } finally {
      finishing.current = false;
    }
  }, [navigate]);

  const answer = async () => {
    // Ask for the microphone on the tap itself; the SDK then opens its own stream.
    const mic = await requestMic();
    if (!mic) { toast(copy.start.micUnavailable); return; }
    stopMic();
    go('connecting');
    try {
      const session = await startVoice();
      intakeId.current = session.intakeId;
      conversationId.current = null;
      conversation.startSession({
        signedUrl: session.sessionUrl,
        dynamicVariables: session.dynamicVariables,
        onConnect: ({ conversationId: id }) => { conversationId.current = id; go('live'); },
        onDisconnect: () => {
          // Ended by the agent or by a dropped connection: keep what was said.
          if (stateRef.current === 'live') { go('lost'); void finish(); }
        },
        onError: () => { if (stateRef.current === 'connecting') go('error'); },
      });
    } catch {
      go('error');
    }
  };

  const hangUp = () => {
    go('ending');
    conversation.endSession();
    void finish();
  };

  // «Карточка собирается… n из 8»: rows the agent has noted so far.
  useEffect(() => {
    if (state !== 'live' || !intakeId.current) return;
    const id = intakeId.current;
    const timer = setInterval(() => { previewCount(id).then(setFilled).catch(() => undefined); }, 3000);
    return () => clearInterval(timer);
  }, [state]);

  useEffect(() => () => { stopMic(); conversation.endSession(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const live = state === 'live';
  return (
    <>
      <AldiOrb
        placement="call"
        agentState={live ? (conversation.isSpeaking ? 'talking' : 'listening') : state === 'ending' || state === 'lost' || state === 'connecting' ? 'thinking' : null}
        getInputVolume={live ? conversation.getInputVolume : undefined}
        getOutputVolume={live ? conversation.getOutputVolume : undefined}
      />

      {(state === 'incoming' || state === 'connecting') && (
        <>
          <p className="call-status" role="status">{copy.call.incoming}</p>
          <Button variant="patient" size="patient" className="w-full" disabled={state === 'connecting'} onClick={() => void answer()}>{copy.call.answer}</Button>
          <div className="glass-label w-full p-0">
            <Button variant="patientGhost" size="patient" className="w-full" onClick={() => { conversation.endSession(); void navigate({ to: '/' }); }}>{copy.call.notNow}</Button>
          </div>
        </>
      )}

      {live && (
        <>
          <div className="card-patient w-full p-5 text-center font-bold" role="status">{copy.call.live(filled)}</div>
          <Button variant="hangup" size="patient" className="w-full" onClick={hangUp}>{copy.call.hangUp}</Button>
        </>
      )}

      {state === 'ending' && <p className="call-status" role="status">{copy.call.ending}</p>}
      {state === 'lost' && <p className="call-status" role="status">{copy.call.lost}</p>}

      {state === 'error' && (
        <>
          <p className="call-status" role="alert">{copy.call.error}</p>
          <Button variant="patientSecondary" size="patient" className="w-full" onClick={() => go('incoming')}>{copy.call.retry}</Button>
          <div className="glass-label w-full p-0">
            <Button variant="patientGhost" size="patient" className="w-full" onClick={() => void navigate({ to: '/text' })}>{copy.call.write}</Button>
          </div>
        </>
      )}
    </>
  );
}

export default function VoiceCall() {
  return (
    <ConversationProvider>
      <Call />
    </ConversationProvider>
  );
}
