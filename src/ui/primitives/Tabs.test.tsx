import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, test } from 'vitest';
import { TabList, TabPanel, Tabs, type TabsVariant } from './Tabs';

type View = 'followers' | 'portrait' | 'reviews';

function Panel({ variant }: { variant: TabsVariant }) {
  const [view, setView] = useState<View>('followers');
  return (
    <Tabs value={view} onValueChange={setView} variant={variant}>
      <TabList
        aria-label='Panel sections'
        items={[
          { value: 'followers', label: 'Followers', icon: <svg />, testId: 'tab-followers' },
          { value: 'portrait', label: 'Portrait', icon: <svg /> },
          { value: 'reviews', label: 'Reviews', icon: <svg />, dot: true, spaceBefore: true },
        ]}
      />
      <TabPanel value='followers'>followers view</TabPanel>
      <TabPanel value='portrait'>portrait view</TabPanel>
      <TabPanel value='reviews'>reviews view</TabPanel>
    </Tabs>
  );
}

describe('Tabs', () => {
  test('selects with clicks and arrow keys and shows the matching panel', async () => {
    render(<Panel variant='segmented' />);
    expect(screen.getByRole('tablist', { name: 'Panel sections' })).toBeTruthy();
    expect(screen.getByText('followers view')).toBeTruthy();
    await userEvent.click(screen.getByRole('tab', { name: 'Portrait' }));
    expect(screen.getByText('portrait view')).toBeTruthy();
    await userEvent.keyboard('{ArrowRight}');
    expect(screen.getByRole('tab', { name: 'Reviews' }).getAttribute('aria-selected')).toBe('true');
    expect(screen.getByTestId('tab-followers')).toBe(screen.getByRole('tab', { name: 'Followers' }));
  });

  test('the rail is vertical and keeps names for icon-only tabs', async () => {
    const { container } = render(<Panel variant='rail' />);
    const list = screen.getByRole('tablist', { name: 'Panel sections' });
    expect(list.getAttribute('aria-orientation')).toBe('vertical');
    const tab = screen.getByRole('tab', { name: 'Portrait' });
    expect(tab.getAttribute('title')).toBe('Portrait');
    expect(tab.querySelector('.sr-only')?.textContent).toBe('Portrait');
    expect(container.querySelector('.xh-tabs-spacer')).not.toBeNull();
    tab.focus();
    await userEvent.keyboard('{ArrowDown}');
    expect(screen.getByRole('tab', { name: 'Reviews' }).getAttribute('aria-selected')).toBe('true');
  });
});
