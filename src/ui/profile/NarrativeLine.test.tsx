import { render, screen } from '@testing-library/react';
import { expect, test, vi } from 'vitest';
import { NarrativeLine, pickNarrative } from './NarrativeLine';

vi.mock('~contents/hooks/i18n', () => ({
  useI18n: () => ({ t: (key: string) => key, lang: 'zh', setLang: () => {} }),
}));

test('shows the narrative in the interface language after the AI label', () => {
  render(<NarrativeLine narrative={{ cn: '长期跟踪再质押与链上收益策略。', en: 'Restaking.' }} />);
  const line = screen.getByText(/长期跟踪再质押/);
  expect(line.tagName).toBe('P');
  expect(line.firstElementChild?.textContent).toBe('aiNarrative');
});

test('renders nothing when the interface language has no text', () => {
  const { container } = render(<NarrativeLine narrative={{ cn: '  ', en: 'Restaking.' }} />);
  expect(container.firstChild).toBeNull();
});

test('pickNarrative follows the language without falling back', () => {
  expect(pickNarrative({ cn: '中文', en: 'English' }, 'en')).toBe('English');
  expect(pickNarrative({ cn: '', en: 'English' }, 'zh')).toBe('');
  expect(pickNarrative(null, 'zh')).toBe('');
});
