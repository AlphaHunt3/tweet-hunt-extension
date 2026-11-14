import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';
import { RowButton, SegmentedControl } from '../primitives';
import { CardHeader, EmptyState, PanelCard, Skeleton } from './PanelSection';

describe('PanelSection', () => {
  test('renders a titled card, an empty state and a hidden skeleton', () => {
    render(
      <>
        <PanelCard id='card'>
          <CardHeader title='KOL 关注分析' aside={<span>Web3</span>} />
        </PanelCard>
        <EmptyState>还没有点评</EmptyState>
        <Skeleton className='h-4' />
      </>,
    );
    expect(screen.getByRole('heading', { name: 'KOL 关注分析' })).toBeTruthy();
    expect(document.getElementById('card')?.textContent).toContain('Web3');
    expect(screen.getByText('还没有点评')).toBeTruthy();
    expect(document.querySelector('.xh-skeleton')?.getAttribute('aria-hidden')).toBe('true');
  });

  test('segmented control can render as tiles', () => {
    render(
      <SegmentedControl
        aria-label='KOL scope'
        variant='tiles'
        value='global'
        onValueChange={() => {}}
        options={[
          { value: 'global', label: 'Global' },
          { value: 'cn', label: 'Chinese' },
        ]}
      />,
    );
    expect(screen.getByRole('radiogroup', { name: 'KOL scope' }).getAttribute('data-variant')).toBe('tiles');
  });

  test('row button is a full-width button', async () => {
    const onClick = vi.fn();
    render(<RowButton onClick={onClick}>Open reviews</RowButton>);
    const row = screen.getByRole('button', { name: 'Open reviews' });
    expect(row.className).toContain('xh-rowbtn');
    await userEvent.click(row);
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
