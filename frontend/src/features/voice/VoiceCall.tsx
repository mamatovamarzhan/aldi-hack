// The voice call itself. Loaded only in the browser (the ElevenLabs SDK needs audio APIs),
// so the route stays server-renderable.
import { ConversationProvider, useConversation } from '@elevenlabs/react';
import { useBlocker, useNavigate } from '@tanstack/react-router';
import { Mic, MicOff } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { appCopy } from '@/shared/copy/app';
import { copy } from '@/shared/copy/patient';
import { finishVoice, previewCount, startVoice } from '@/features/session/remote';
import { saveCard } from '@/features/session/storage';
import { requestMic, stopMic } from '@/features/voice/mic';
import { AldiOrb } from '@/shared/ui/sky/AldiOrb';
import { ConfirmSheet } from '@/shared/ui/patient/ConfirmSheet';

type CallState = 'connecting' | 'live' | 'ending' | 'lost' | 'denied' | 'error';
const t = appCopy.voice;

function Call() {
  const navigate = useNavigate();
  const conversation = useConversation();
  const [state, setState] = useState<CallState>('connecting');
  const [filled, setFilled] = useState(0);
  const stateRef = useRef<CallState>('connecting');
  const intakeId = useRef<string | null>(null);
  const conversationId = useRef<string | null>(null);
  const finishing = useRef(false);
  const started = useRef(false);
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

  const connect = useCallback(async () => {
    go('connecting');
    // Permission was asked on the tap that led here; this confirms it and releases our own stream,
    // because the SDK opens its own.
    const mic = await requestMic();
    if (!mic) { go('denied'); return; }
    stopMic();
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
  }, [conversation, finish]);

  // The call starts as soon as the screen opens; the guard keeps a re-run from starting a second one.
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void connect();
  }, [connect]);

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

  // Leaving the screen during a live call interrupts the conversation, so it needs a confirmation.
  const blocker = useBlocker({ shouldBlockFn: () => stateRef.current === 'live', withResolver: true });
  const [askLeave, setAskLeave] = useState(false);
  const leaveOpen = askLeave || blocker.status === 'blocked';
  const stay = () => { setAskLeave(false); if (blocker.status === 'blocked') blocker.reset(); };
  const leave = () => {
    setAskLeave(false);
    if (blocker.status === 'blocked') blocker.reset();
    hangUp();
  };

  const live = state === 'live';
  const muted = live && conversation.isMuted;
  const status = state === 'connecting' ? t.connecting : state === 'lost' ? t.lost : muted ? t.muted : conversation.isSpeaking ? t.speaking : t.listening;

  return (
    <>
      <AldiOrb
        placement="call"
        agentState={live ? (conversation.isSpeaking ? 'talking' : 'listening') : state === 'ending' || state === 'lost' || state === 'connecting' ? 'thinking' : null}
        getInputVolume={live && !muted ? conversation.getInputVolume : undefined}
        getOutputVolume={live ? conversation.getOutputVolume : undefined}
      />

      {(state === 'connecting' || live || state === 'lost') && <p className="call-status" role="status">{status}</p>}

      {live && (
        <>
          {!conversation.isSpeaking && !muted && <p className="caption">{t.hint}</p>}
          <div className="card-patient w-full p-4 text-center font-bold" role="status">{copy.call.live(filled)}</div>
          <div className="flex w-full gap-3">
            <Button variant="patientSecondary" size="patient" className="flex-1" aria-pressed={muted} onClick={() => conversation.setMuted(!conversation.isMuted)}>
              {muted ? <MicOff aria-hidden="true" className="mr-2 size-5" /> : <Mic aria-hidden="true" className="mr-2 size-5" />}
              {muted ? t.unmute : t.mute}
            </Button>
            <Button variant="hangup" size="patient" className="flex-1" onClick={hangUp}>{copy.call.hangUp}</Button>
          </div>
          <button type="button" className="caption underline" onClick={() => setAskLeave(true)}>{t.back}</button>
        </>
      )}

      {state === 'connecting' && (
        <div className="glass-label w-full p-0">
          <Button variant="patientGhost" size="patient" className="w-full" onClick={() => { conversation.endSession(); void navigate({ to: '/' }); }}>{copy.call.notNow}</Button>
        </div>
      )}

      {state === 'ending' && <p className="call-status" role="status">{copy.call.ending}</p>}
      {state === 'lost' && <p className="caption">{copy.call.lost}</p>}

      {state === 'denied' && (
        <>
          <p className="call-status" role="alert">{t.micDenied}</p>
          <Button variant="patient" size="patient" className="w-full" onClick={() => void navigate({ to: '/text' })}>{t.continueText}</Button>
          <div className="glass-label w-full p-0">
            <Button variant="patientGhost" size="patient" className="w-full" onClick={() => void connect()}>{copy.call.retry}</Button>
          </div>
        </>
      )}

      {state === 'error' && (
        <>
          <p className="call-status" role="alert">{copy.call.error}</p>
          <Button variant="patientSecondary" size="patient" className="w-full" onClick={() => void connect()}>{copy.call.retry}</Button>
          <div className="glass-label w-full p-0">
            <Button variant="patientGhost" size="patient" className="w-full" onClick={() => void navigate({ to: '/text' })}>{copy.call.write}</Button>
          </div>
        </>
      )}

      <ConfirmSheet open={leaveOpen} title={t.leaveTitle} confirm={t.leaveConfirm} cancel={t.leaveStay} onConfirm={leave} onClose={stay}>
        <p>{t.leaveText}</p>
      </ConfirmSheet>
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
