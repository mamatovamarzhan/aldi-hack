import { ClientOnly } from '@tanstack/react-router';
import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import type { AgentState } from '@/components/ui/orb';
import { colors } from '../theme/tokens';

const Orb = lazy(() => import('@/components/ui/orb').then(m => ({ default: m.Orb })));
const ORB_COLORS: [string, string] = [colors.orbLilac, colors.orbAzure];

export type { AgentState };

type Props = {
  /** null: Start screen / nobody speaking; listening: user speaks; talking: Aldi speaks; thinking: card is being assembled. */
  agentState?: AgentState | undefined;
  /** Live call volumes (e.g. getInputVolume / getOutputVolume from ElevenLabs useConversation). */
  getInputVolume?: (() => number) | undefined;
  getOutputVolume?: (() => number) | undefined;
  placement?: 'start' | 'call' | 'card';
};

function Loaded({ onReady }: { onReady: () => void }) {
  useEffect(onReady, [onReady]);
  return null;
}

export function AldiOrb({ agentState = null, getInputVolume, getOutputVolume, placement = 'start' }: Props) {
  const root = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const [paused, setPaused] = useState(false);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let visible = true;
    const sync = () => setPaused(document.hidden || !visible);
    const observer = new IntersectionObserver(entries => { visible = entries[0]?.isIntersecting ?? true; sync(); });
    if (root.current) observer.observe(root.current);
    document.addEventListener('visibilitychange', sync); sync();
    return () => { observer.disconnect(); document.removeEventListener('visibilitychange', sync); };
  }, []);
  useEffect(() => {
    const patient = root.current?.closest<HTMLElement>('.theme-patient');
    if (!patient) return;
    patient.dataset['aldiSpeaking'] = agentState === 'talking' ? 'true' : 'false';
    return () => { delete patient.dataset['aldiSpeaking']; };
  }, [agentState]);
  const live = Boolean(getInputVolume || getOutputVolume);
  const frameloop = paused ? 'never' : reduced ? 'demand' : 'always';
  return <motion.div ref={root} layoutId="aldi-presence" transition={{ duration: reduced ? 0 : .8, ease: [.22, 1, .36, 1] }} className={`aldi-orb aldi-orb-${placement}`} data-orb-state={agentState ?? 'idle'} data-orb-ready={ready ? 'true' : undefined} aria-hidden="true">
    <div className={`orb-surface ${ready ? 'orb-loaded' : ''}`}>
      <ClientOnly fallback={null}><Suspense fallback={null}>
        <Orb colors={ORB_COLORS} seed={7} agentState={agentState} volumeMode={live ? 'manual' : 'auto'} getInputVolume={getInputVolume} getOutputVolume={getOutputVolume} frameloop={frameloop} className="orb-canvas" />
        <Loaded onReady={() => setReady(true)} />
      </Suspense></ClientOnly>
    </div>
  </motion.div>;
}
