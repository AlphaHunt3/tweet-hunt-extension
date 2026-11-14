import { render, screen } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import { AVATAR_COLORS, Avatar, avatarColor, initials } from './Avatar';
import { Badge, Tag } from './Badge';
import { Meter } from './Meter';

function luminance(hex: string) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const f = (v: number) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

describe('Badge and Tag', () => {
  test('carry their tone', () => {
    render(
      <>
        <Badge tone='up'>↑12</Badge>
        <Tag>DeFi</Tag>
      </>,
    );
    expect(screen.getByText('↑12').dataset.tone).toBe('up');
    expect(screen.getByText('DeFi').className).toContain('xh-tag');
  });
});

describe('Avatar', () => {
  test('falls back to initials without an image', () => {
    render(<Avatar name='Mira Chen' size='md' />);
    expect(screen.getByText('MC')).toBeTruthy();
  });

  test('initials handle handles, single words and CJK names', () => {
    expect(initials('@mira_onchain')).toBe('MO');
    expect(initials('米拉')).toBe('米拉');
    expect(initials('  ')).toBe('?');
  });

  test('picks a stable colour that keeps white initials readable', () => {
    expect(avatarColor('Mira Chen')).toBe(avatarColor('Mira Chen'));
    for (const colour of AVATAR_COLORS) {
      expect(1.05 / (luminance(colour) + 0.05)).toBeGreaterThanOrEqual(4.5);
    }
  });
});

describe('Meter', () => {
  test('is a named meter with its value', () => {
    render(<Meter label='DeFi' value={86} />);
    const meter = screen.getByRole('meter', { name: 'DeFi' });
    expect(meter.getAttribute('aria-valuenow')).toBe('86');
  });
});
