import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, test } from 'vitest';
import { SegmentedControl } from './SegmentedControl';

function Language() {
  const [lang, setLang] = useState<'en' | 'zh'>('zh');
  return (
    <>
      <SegmentedControl
        aria-label='Language'
        value={lang}
        onValueChange={setLang}
        options={[
          { value: 'en', label: 'EN', testId: 'settings-language-en' },
          { value: 'zh', label: '中', testId: 'settings-language-zh' },
        ]}
      />
      <output>{lang}</output>
    </>
  );
}

describe('SegmentedControl', () => {
  test('is a named radio group with the current value checked', () => {
    render(<Language />);
    expect(screen.getByRole('radiogroup', { name: 'Language' })).toBeTruthy();
    expect(screen.getByRole('radio', { name: '中' }).getAttribute('aria-checked')).toBe('true');
    expect(screen.getByTestId('settings-language-en')).toBe(screen.getByRole('radio', { name: 'EN' }));
  });

  test('clicks and arrow keys change the value', async () => {
    render(<Language />);
    await userEvent.click(screen.getByRole('radio', { name: 'EN' }));
    expect(screen.getByRole('status').textContent).toBe('en');
    await userEvent.keyboard('{ArrowRight}');
    expect(screen.getByRole('status').textContent).toBe('zh');
  });
});
