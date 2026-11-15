import { useState } from 'react';
import { useI18n } from '~contents/hooks/i18n';
import { UsersIcon } from '~/ui/icons';
import { Avatar } from '~/ui/primitives/Avatar';
import { TabList, TabPanel, Tabs } from '~/ui/primitives/Tabs';
import type { KolStat, KolTab, RankDomain } from '../kolRankItems';
import { useOfficialTags } from '../useOfficialTags';
import { DetailCard, DetailEmpty } from './DetailCard';

const LIST_FIELD: Record<KolTab, string> = {
  global: 'globalKolFollowers',
  top100: 'topKolFollowers',
  cn: 'cnKolFollowers',
};

export interface KolFollower {
  username: string;
  name?: string;
  avatar?: string;
}

export function followerList(kolFollow: any, tab: KolTab, domain: RankDomain): KolFollower[] {
  const list = kolFollow?.[`${LIST_FIELD[tab]}${domain === 'ai' ? 'Ai' : ''}`];
  return Array.isArray(list) ? list.filter((item) => item && typeof item.username === 'string' && item.username) : [];
}

function FollowerChip({ kol, lang }: { kol: KolFollower; lang: string }) {
  const tags = useOfficialTags(kol.username, null, lang).slice(0, 2);
  const name = kol.name || kol.username;
  return (
    <a
      className='xh-kolf'
      href={`https://x.com/${kol.username}`}
      target='_blank'
      rel='noopener noreferrer'
      title={`${name} (@${kol.username})`}
    >
      <Avatar name={name} src={kol.avatar} size='sm' />
      <span className='xh-kolf-name'>{name}</span>
      {tags.length ? (
        <span className='xh-kolf-tags'>
          {tags.map((tag) => (
            <span key={tag} className='xh-kolf-tag'>
              {tag}
            </span>
          ))}
        </span>
      ) : null}
    </a>
  );
}

export interface KolFollowersCardProps {
  kolFollow: any;
  domain: RankDomain;
  tabs: KolStat[];
  initialTab: KolTab;
}

export function KolFollowersCard({ kolFollow, domain, tabs, initialTab }: KolFollowersCardProps) {
  const { t, lang } = useI18n();
  const [selected, setSelected] = useState<KolTab>(initialTab);
  const current = tabs.find((stat) => stat.tab === selected) ?? tabs[0];
  const list = current ? followerList(kolFollow, current.tab, domain) : [];
  const grid = list.length ? (
    <ul className='xh-kolf-grid'>
      {list.map((kol) => (
        <li key={kol.username}>
          <FollowerChip kol={kol} lang={lang} />
        </li>
      ))}
    </ul>
  ) : (
    <DetailEmpty>{t('noData')}</DetailEmpty>
  );

  return (
    <DetailCard
      className='xh-kolf-card'
      icon={<UsersIcon />}
      title={t('kFollowingAnalytics')}
      subtitle={t(domain === 'ai' ? 'domainAi' : 'domainWeb3')}
    >
      {tabs.length > 1 && current ? (
        <Tabs value={current.tab} onValueChange={setSelected} variant='segmented'>
          <TabList
            aria-label={t('kFollowingAnalytics')}
            items={tabs.map((stat) => ({ value: stat.tab, label: `${stat.label} ${stat.value}` }))}
          />
          {tabs.map((stat) => (
            <TabPanel key={stat.tab} value={stat.tab}>
              {stat.tab === current.tab ? grid : null}
            </TabPanel>
          ))}
        </Tabs>
      ) : (
        grid
      )}
    </DetailCard>
  );
}
