import type { ReactNode } from 'react';
import ClickSpark from '@/components/ui/ClickSpark';
import { Button } from '@/components/ui/button';
import { SPARK_COLORS, sparkGlow } from './effects';
import { useSkyPhase } from '../sky/useSkyPhase';
import { Caption } from './Caption';

/** Primary patient action with the spark burst. Only for «Поговорить с Aldi», «Собрать карточку», «Отправить врачу». */
export function SparkPrimary({ children, caption, disabled = false, onClick }: { children: ReactNode; caption?: string; disabled?: boolean; onClick: () => void }) {
  const glow = sparkGlow(useSkyPhase());
  return (
    <div className="w-full">
      <ClickSpark sparkColor={SPARK_COLORS} shape="star" sparkCount={10} sparkSize={10} sparkWidth={2} sparkRadius={34} duration={650} easing="ease-out" randomness={0.4} glow={glow} ring layer="back" disabled={disabled} style={{ height: 'auto' }}>
        <Button variant="patient" size="patient" className="w-full" disabled={disabled} onClick={onClick}>{children}</Button>
      </ClickSpark>
      {caption && <Caption>{caption}</Caption>}
    </div>
  );
}
