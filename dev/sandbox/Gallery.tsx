import { useState } from 'react';
import {
  BellIcon,
  OverviewIcon,
  PortraitIcon,
  SlidersIcon,
  SparkleIcon,
  StarIcon,
  UsersIcon,
} from '~/ui/icons';
import {
  Avatar,
  Badge,
  Button,
  CollapsibleSection,
  IconButton,
  Meter,
  SearchField,
  SegmentedControl,
  Select,
  Switch,
  Tag,
  TabList,
  TabPanel,
  Tabs,
} from '~/ui/primitives';

type View = 'overview' | 'followers' | 'portrait' | 'reviews';

const VIEWS = [
  { value: 'overview', label: '概览', icon: <OverviewIcon size={18} /> },
  { value: 'followers', label: '关注者', icon: <UsersIcon size={18} /> },
  { value: 'portrait', label: '画像', icon: <PortraitIcon size={18} /> },
  { value: 'reviews', label: '点评', icon: <StarIcon size={18} />, dot: true },
] as const;

const row = { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' } as const;

export function Gallery() {
  const [view, setView] = useState<View>('followers');
  const [lang, setLang] = useState<'en' | 'zh'>('zh');
  const [sound, setSound] = useState<'s1' | 's8'>('s8');
  const [on, setOn] = useState(true);
  const [off, setOff] = useState(false);
  const [open, setOpen] = useState(true);
  const [q, setQ] = useState('');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, color: 'var(--xh-fg)', fontSize: 13 }}>
      <div style={row}>
        <Button>默认</Button>
        <Button variant='primary'>主要</Button>
        <Button variant='soft'>
          <SparkleIcon size={14} />问 AI
        </Button>
        <Button variant='inverse'>反色</Button>
        <Button size='sm'>小按钮</Button>
      </div>
      <div style={row}>
        <IconButton label='消息，有未读' dot>
          <BellIcon />
        </IconButton>
        <IconButton label='设置'>
          <SlidersIcon />
        </IconButton>
        <label style={row}>
          开启 <Switch checked={on} onCheckedChange={setOn} />
        </label>
        <label style={row}>
          关闭 <Switch checked={off} onCheckedChange={setOff} />
        </label>
      </div>
      <SearchField aria-label='搜索设置' placeholder='搜索设置，例如「头像排名」' value={q} onValueChange={setQ} shortcut='/' />
      <div style={row}>
        <SegmentedControl
          aria-label='语言'
          value={lang}
          onValueChange={setLang}
          size='sm'
          options={[
            { value: 'en', label: 'EN' },
            { value: 'zh', label: '中' },
          ]}
        />
        <Select
          aria-label='提示音效'
          value={sound}
          onValueChange={setSound}
          options={[
            { value: 's1', label: '音频 1' },
            { value: 's8', label: '音频 8' },
          ]}
        />
      </div>
      <SegmentedControl
        aria-label='KOL 范围'
        block
        value={view === 'overview' ? 'followers' : view}
        onValueChange={(v) => setView(v)}
        options={[
          { value: 'followers', label: '全球 1.2K' },
          { value: 'portrait', label: '中文 312' },
          { value: 'reviews', label: 'TOP100 86' },
        ]}
      />
      {(['segmented', 'underline'] as const).map((variant) => (
        <Tabs key={variant} value={view} onValueChange={setView} variant={variant}>
          <TabList aria-label={`面板分区（${variant}）`} items={VIEWS} />
          <TabPanel value={view} className='sr-only'>
            {view}
          </TabPanel>
        </Tabs>
      ))}
      <div style={{ display: 'flex', gap: 12, height: 220 }}>
        <div style={{ width: 48, padding: '10px 0', background: 'var(--xh-rail, var(--xh-sunken))', borderRadius: 12 }}>
          <Tabs value={view} onValueChange={setView} variant='rail'>
            <TabList aria-label='面板导航（rail）' items={VIEWS} className='h-full' />
            <TabPanel value={view} className='sr-only'>
              {view}
            </TabPanel>
          </Tabs>
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <CollapsibleSection title='通用' open={open} onOpenChange={setOpen}>
            <div style={{ ...row, paddingBottom: 6 }}>
              <Badge>KOL</Badge>
              <Badge tone='accent'>Beta</Badge>
              <Badge tone='up'>↑12</Badge>
              <Badge tone='down'>-3</Badge>
              <Badge tone='warn'>中风险</Badge>
              <Tag>DeFi</Tag>
            </div>
          </CollapsibleSection>
          <div style={row}>
            <Avatar name='Mira Chen' />
            <Avatar name='Lumen Labs' size='md' />
            <Avatar name='0xKai' size='sm' />
            <Avatar name='Echo Lin' size='xs' />
          </div>
          <Meter label='DeFi' value={86} />
          <Meter label='5 星' value={72} tone='warn' />
        </div>
      </div>
    </div>
  );
}
