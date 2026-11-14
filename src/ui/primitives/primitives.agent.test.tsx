import { render, screen } from '@testing-library/react';
import { createAgent } from '@ui-sdk/react/agent';
import { useState } from 'react';
import { expect, test } from 'vitest';
import {
  Button,
  CollapsibleSection,
  IconButton,
  SearchField,
  SegmentedControl,
  Select,
  Switch,
  TabList,
  TabPanel,
  Tabs,
} from './index';

const agent = createAgent();

function Settings() {
  const [tab, setTab] = useState<'general' | 'avatar'>('general');
  const [lang, setLang] = useState<'en' | 'zh'>('zh');
  const [sound, setSound] = useState<'s1' | 's8'>('s8');
  const [on, setOn] = useState(true);
  const [open, setOpen] = useState(true);
  const [q, setQ] = useState('');
  return (
    <div>
      <IconButton label='Close panel'>
        <svg />
      </IconButton>
      <SearchField aria-label='Search settings' placeholder='Search' value={q} onValueChange={setQ} />
      <Tabs value={tab} onValueChange={setTab} variant='segmented'>
        <TabList
          aria-label='Settings sections'
          items={[
            { value: 'general', label: 'General' },
            { value: 'avatar', label: 'Avatar rank' },
          ]}
        />
        <TabPanel value='general'>
          <CollapsibleSection title='Common' open={open} onOpenChange={setOpen}>
            <SegmentedControl
              aria-label='Language'
              value={lang}
              onValueChange={setLang}
              options={[
                { value: 'en', label: 'EN' },
                { value: 'zh', label: '中' },
              ]}
            />
            <Select
              aria-label='Notification sound'
              value={sound}
              onValueChange={setSound}
              options={[
                { value: 's1', label: 'Sound 1' },
                { value: 's8', label: 'Sound 8' },
              ]}
            />
            <label>
              Token analysis
              <Switch checked={on} onCheckedChange={setOn} />
            </label>
          </CollapsibleSection>
        </TabPanel>
        <TabPanel value='avatar'>avatar</TabPanel>
      </Tabs>
      <Button variant='primary'>Clear cache</Button>
    </div>
  );
}

test('an agent can find and use every primitive by name', async () => {
  render(<Settings />);
  const components = agent.snapshot().filter((entry) => !entry.offPage && entry.component !== 'more');
  for (const entry of components) {
    expect(entry.label, `${entry.component} ${entry.ref} has no name`).toBeTruthy();
  }
  const labels = components.map((entry) => entry.label);
  for (const label of [
    'Close panel',
    'Search settings',
    'Settings sections',
    'Common',
    'Language',
    'Notification sound',
    'Token analysis',
    'Clear cache',
  ]) {
    expect(labels, `${label} is missing from the snapshot`).toContain(label);
  }

  const result = await agent.act({
    steps: [
      { ref: 'Language', action: 'setValue', args: ['en'] },
      { ref: 'Notification sound', action: 'setValue', args: ['s1'] },
      { ref: 'Token analysis', action: 'setChecked', args: [false] },
      { ref: 'Search settings', action: 'setValue', args: ['avatar'] },
    ],
  });
  expect(result.ok, result.error?.message).toBe(true);
  expect(screen.getByRole('radio', { name: 'EN' }).getAttribute('aria-checked')).toBe('true');
  expect(screen.getByRole('switch', { name: 'Token analysis' }).getAttribute('aria-checked')).toBe('false');
  expect((screen.getByRole('searchbox', { name: 'Search settings' }) as HTMLInputElement).value).toBe('avatar');
});
