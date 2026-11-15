import { cx } from '~/ui/primitives/cx';

export interface RadarAxis {
  key: string;
  label: string;
  value: number;
}

const CX = 80;
const CY = 78;
const R = 62;
const RINGS = [1, 0.75, 0.5, 0.25];
const LABEL_UNITS = 8;

const round = (n: number) => Math.round(n * 100) / 100;
const charUnits = (char: string) => ((char.codePointAt(0) ?? 0) >= 0x2e80 ? 2 : 1);

export function shortAxisLabel(label: string) {
  const chars = Array.from(label.trim());
  if (chars.reduce((sum, char) => sum + charUnits(char), 0) <= LABEL_UNITS) return chars.join('');
  let used = 0;
  let out = '';
  for (const char of chars) {
    if (used + charUnits(char) > LABEL_UNITS - 1) break;
    used += charUnits(char);
    out += char;
  }
  return `${out}…`;
}

function point(index: number, count: number, ratio: number) {
  const angle = (Math.PI * 2 * index) / count - Math.PI / 2;
  return { x: CX + R * ratio * Math.cos(angle), y: CY + R * ratio * Math.sin(angle), cos: Math.cos(angle), sin: Math.sin(angle) };
}

const polygon = (ratios: number[]) =>
  ratios
    .map((ratio, index) => {
      const p = point(index, ratios.length, ratio);
      return `${round(p.x)},${round(p.y)}`;
    })
    .join(' ');

export interface RadarChartProps {
  axes: RadarAxis[];
  label: string;
  lang: string;
  className?: string;
}

export function RadarChart({ axes, label, lang, className }: RadarChartProps) {
  if (axes.length < 3) return null;
  const count = axes.length;
  const ratios = axes.map((axis) => Math.min(Math.max(Number(axis.value) || 0, 0), 100) / 100);
  const zh = lang === 'zh';
  const summary = `${label}${zh ? '：' : ': '}${axes
    .map((axis, index) => `${axis.label} ${Math.round(ratios[index] * 100)}`)
    .join(zh ? '，' : ', ')}`;

  return (
    <svg className={cx('xh-radar', className)} viewBox='-30 0 220 152' width={162} height={112} role='img' aria-label={summary}>
      {RINGS.map((ring) => (
        <polygon key={ring} className='xh-radar-grid' points={polygon(axes.map(() => ring))} />
      ))}
      {axes.map((axis, index) => {
        const end = point(index, count, 1);
        return <line key={axis.key} className='xh-radar-axis' x1={CX} y1={CY} x2={round(end.x)} y2={round(end.y)} />;
      })}
      <polygon className='xh-radar-shape' points={polygon(ratios)} />
      {ratios.map((ratio, index) => {
        const p = point(index, count, ratio);
        return <circle key={axes[index].key} className='xh-radar-dot' cx={round(p.x)} cy={round(p.y)} r={2.6} />;
      })}
      {axes.map((axis, index) => {
        const p = point(index, count, 1);
        const x = CX + (R + 7) * p.cos;
        const y = CY + (R + 7) * p.sin;
        const anchor = Math.abs(p.cos) < 0.2 ? 'middle' : p.cos > 0 ? 'start' : 'end';
        const dy = p.sin < -0.9 ? 0 : p.sin > 0.5 ? 9 : 3;
        return (
          <text key={axis.key} className='xh-radar-label' x={round(x)} y={round(y + dy)} textAnchor={anchor}>
            {shortAxisLabel(axis.label)}
          </text>
        );
      })}
    </svg>
  );
}
