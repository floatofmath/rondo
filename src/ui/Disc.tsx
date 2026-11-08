const SIZE = 200;
const CENTRE = SIZE / 2;
const RADIUS = 96;

function sectorPath(fraction: number): string {
  // The sector ends at 12 o'clock; its leading edge sweeps clockwise as time passes.
  const startAngle = (1 - fraction) * 2 * Math.PI;
  const x = CENTRE + RADIUS * Math.sin(startAngle);
  const y = CENTRE - RADIUS * Math.cos(startAngle);
  const largeArc = fraction > 0.5 ? 1 : 0;
  return `M ${CENTRE} ${CENTRE} L ${x} ${y} A ${RADIUS} ${RADIUS} 0 ${largeArc} 1 ${CENTRE} ${CENTRE - RADIUS} Z`;
}

export type DiscTone = 'neutral' | 'amber' | 'over';

interface Props {
  fraction: number;
  tone: DiscTone;
}

/** Time Timer style disc: the filled sector shows the time left and shrinks clockwise. */
export function Disc({ fraction, tone }: Props) {
  return (
    <svg className={`disc disc-${tone}`} viewBox={`0 0 ${SIZE} ${SIZE}`} aria-hidden="true">
      <circle className="disc-track" cx={CENTRE} cy={CENTRE} r={RADIUS} />
      {fraction >= 1 ? (
        <circle className="disc-fill" cx={CENTRE} cy={CENTRE} r={RADIUS} />
      ) : (
        fraction > 0 && <path className="disc-fill" d={sectorPath(fraction)} />
      )}
    </svg>
  );
}
