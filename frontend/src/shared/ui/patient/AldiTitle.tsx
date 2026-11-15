import GradientText from '@/components/ui/GradientText';
import { titleGradient } from './effects';
import { useSkyPhase } from '../sky/useSkyPhase';

export function AldiTitle() {
  const { colors, glow } = titleGradient(useSkyPhase());
  return (
    <h1 className="aldi-title text-center">
      <GradientText colors={colors} variant="flow" animationSpeed={12} scale={3} yoyo glow={glow}>Aldi</GradientText>
    </h1>
  );
}
