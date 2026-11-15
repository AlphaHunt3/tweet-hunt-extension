import { useState } from 'react';
import { useI18n } from '~contents/hooks/i18n';
import { UsersIcon } from '~/ui/icons';
import { TabList, TabPanel, Tabs } from '~/ui/primitives/Tabs';
import type { KolStat, KolTab, RankDomain } from '../kolRankItems';
import { DetailCard, DetailEmpty } from './DetailCard';
import { PersonChip } from './PersonChip';

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

export interface KolFollowersCardProps {
  kolFollow: any;
  domain: RankDomain;
  tabs: KolStat[];
  initialTab: KolTab;
}

export function KolFollowersCard({ kolFollow, domain, tabs, initialTab }: KolFollowersCardProps) {
  const { t } = useI18n();
  const [selected, setSelected] = useState<KolTab>(initialTab);
  const current = tabs.find((stat) => stat.tab === selected) ?? tabs[0];
  const list = current ? followerList(kolFollow, current.tab, domain) : [];
  const grid = list.length ? (
    <ul className='xh-kolf-grid'>
      {list.map((kol) => (
        <li key={kol.username}>
          <PersonChip handle={kol.username} name={kol.name} avatar={kol.avatar} />
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
