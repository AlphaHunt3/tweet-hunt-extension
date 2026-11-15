import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DetailCard, DetailEmpty, DetailNote } from './DetailCard';
import { MeterRow } from './MeterRow';
import { RadarChart, shortAxisLabel } from './RadarChart';

vi.mock('~contents/hooks/i18n', () => ({
  useI18n: () => ({ t: (key: string) => key, lang: 'zh' }),
}));

describe('DetailCard', () => {
  it('renders the header, body and footer parts it is given', () => {
    const { container } = render(
      <DetailCard title='灵魂指数' subtitle='@mira' aside={<span>87</span>} footer='近 90 天' footerEnd='仅供参考'>
        <DetailNote label='分析原因'>原创比例高</DetailNote>
      </DetailCard>,
    );
    expect(screen.getByText('灵魂指数')).toBeTruthy();
    expect(screen.getByText('@mira')).toBeTruthy();
    expect(screen.getByText('87')).toBeTruthy();
    expect(screen.getByText('分析原因')).toBeTruthy();
    expect(container.querySelector('.xh-dcard-foot')?.textContent).toBe('近 90 天仅供参考');
  });

  it('leaves out the body and footer when there is nothing to show', () => {
    const { container } = render(<DetailCard title='排名' />);
    expect(container.querySelector('.xh-dcard-body')).toBeNull();
    expect(container.querySelector('.xh-dcard-foot')).toBeNull();
  });

  it('renders an empty state as text', () => {
    render(<DetailEmpty>noData</DetailEmpty>);
    expect(screen.getByText('noData')).toBeTruthy();
  });
});

describe('MeterRow', () => {
  it('names the meter by its label and shows the rounded value', () => {
    render(<MeterRow label='账户' value={89.6} hint='账号信息是否真实' />);
    expect(screen.getByRole('meter', { name: '账户' }).getAttribute('aria-valuenow')).toBe('90');
    expect(screen.getByText('90')).toBeTruthy();
    expect(screen.getByText('账户').getAttribute('title')).toBe('账号信息是否真实');
  });

  it('shows a dash for a missing value', () => {
    render(<MeterRow label='内容' value={null} />);
    expect(screen.getByText('—')).toBeTruthy();
  });
});

describe('RadarChart', () => {
  const axes = [
    { key: 'a', label: '账户', value: 90 },
    { key: 'b', label: '内容', value: 82 },
    { key: 'c', label: '互动', value: 76 },
    { key: 'd', label: '排名', value: 88 },
    { key: 'e', label: 'KOL', value: 140 },
  ];

  it('draws one dot per axis and describes every value', () => {
    const { container } = render(<RadarChart axes={axes} label='灵魂指数五维雷达' lang='zh' />);
    expect(container.querySelectorAll('.xh-radar-dot')).toHaveLength(5);
    expect(container.querySelectorAll('.xh-radar-grid')).toHaveLength(4);
    expect(screen.getByRole('img', { name: '灵魂指数五维雷达：账户 90，内容 82，互动 76，排名 88，KOL 100' })).toBeTruthy();
  });

  it('puts the first axis straight up', () => {
    const { container } = render(<RadarChart axes={axes} label='r' lang='en' />);
    const top = container.querySelector('.xh-radar-axis');
    expect([top?.getAttribute('x2'), top?.getAttribute('y2')]).toEqual(['80', '16']);
  });

  it('draws nothing with fewer than three axes', () => {
    const { container } = render(<RadarChart axes={axes.slice(0, 2)} label='r' lang='en' />);
    expect(container.querySelector('svg')).toBeNull();
  });

  it('shortens long labels by width', () => {
    expect(shortAxisLabel('AI Agent')).toBe('AI Agent');
    expect(shortAxisLabel('Model evals')).toBe('Model e…');
    expect(shortAxisLabel('二级交易')).toBe('二级交易');
    expect(shortAxisLabel('基础设施建设')).toBe('基础设…');
  });
});
