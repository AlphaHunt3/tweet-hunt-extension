import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef } from 'react';
import { describe, expect, test, vi } from 'vitest';
import { AiPill, findKol, kolButtonLabel, SocialCircleButton, visibleKols } from './ProfileActions';

const t = (key: string) => key;

describe('kol chat helpers', () => {
  const list = [
    { twitter_handle: 'Mira_Onchain', type: 'official', visibility: 'public', name: 'Mira', perspective_name_zh: 'Mira 思维' },
    { twitter_handle: 'echolin', type: 'unofficial', visibility: 'tester', name: 'Echo' },
  ];

  test('a null list is empty, and non-public entries are only for testers', () => {
    expect(visibleKols(null, false)).toEqual([]);
    expect(visibleKols(list, false).map((kol) => kol.twitter_handle)).toEqual(['Mira_Onchain']);
    expect(visibleKols(list, true)).toHaveLength(2);
  });

  test('finds the KOL by handle, ignoring case and a leading @', () => {
    expect(findKol(list, '@mira_onchain')?.name).toBe('Mira');
    expect(findKol(list, '')).toBeUndefined();
  });

  test('labels official KOLs by their perspective name or the AI avatar label, others by name', () => {
    expect(kolButtonLabel(list[0], 'zh', t)).toBe('Mira 思维');
    expect(kolButtonLabel({ ...list[0], perspective_name_en: '' }, 'en', t)).toBe('aiAvatar');
    expect(kolButtonLabel(list[1], 'zh', t)).toBe('Echo思维');
    expect(kolButtonLabel(list[1], 'en', t)).toBe('Echo Perspective');
  });
});

test('the AI pill is a named button with a beta badge whose ref is the button itself', async () => {
  const onClick = vi.fn();
  const ref = createRef<HTMLButtonElement>();
  render(<AiPill ref={ref} label='Mira 思维' badge='Beta' onClick={onClick} />);
  const button = screen.getByRole('button', { name: /Mira 思维/ });
  expect(ref.current).toBe(button);
  expect(button.getAttribute('type')).toBe('button');
  expect(button.querySelector('.xh-beta')?.textContent).toBe('Beta');
  await userEvent.click(button);
  expect(onClick).toHaveBeenCalled();
});

test('the social circle button opens a dialog and can be disabled while loading', async () => {
  const onClick = vi.fn();
  const ref = createRef<HTMLButtonElement>();
  const { rerender } = render(
    <SocialCircleButton ref={ref} label='查看社交圈' badge='NEW' expanded={false} disabled={false} onClick={onClick} />,
  );
  const button = screen.getByRole('button', { name: '查看社交圈' });
  expect(ref.current).toBe(button);
  expect(button.getAttribute('aria-haspopup')).toBe('dialog');
  expect(button.getAttribute('aria-expanded')).toBe('false');
  expect(button.querySelector('.xh-newdot')?.textContent).toBe('NEW');
  await userEvent.click(button);
  expect(onClick).toHaveBeenCalledTimes(1);
  rerender(<SocialCircleButton ref={ref} label='查看社交圈' badge='NEW' expanded disabled onClick={onClick} />);
  expect((screen.getByRole('button', { name: '查看社交圈' }) as HTMLButtonElement).disabled).toBe(true);
  expect(screen.getByRole('button', { name: '查看社交圈' }).getAttribute('aria-expanded')).toBe('true');
});
