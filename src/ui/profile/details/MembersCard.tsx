import { useEffect, useMemo, useState } from 'react';
import { useI18n } from '~contents/hooks/i18n';
import { useLocalStorage } from '~storage/useLocalStorage';
import { rankService, type AvatarRankMode } from '~/utils/rankService';
import { UsersIcon } from '~/ui/icons';
import { TabList, TabPanel, Tabs } from '~/ui/primitives/Tabs';
import { DetailCard, DetailEmpty } from './DetailCard';
import { handleFromUrl, PersonChip } from './PersonChip';

const ROLE_ORDER = ['founder/executive', 'member', 'investor/advisor', 'contributor', 'ex-member', 'alumni'];

export interface ProjectMember {
  handle: string;
  name?: string;
  image?: string;
  level?: string;
}

export interface MemberGroup {
  key: string;
  title: string;
  members: ProjectMember[];
}

export interface RootMember {
  name: string;
  position?: string;
  twitter?: string;
  avatar?: string;
}

const isMemberList = (value: unknown): value is ProjectMember[] => Array.isArray(value) && value.length > 0;

export function memberGroups(data: Record<string, unknown> | null | undefined, t: (key: string) => string): MemberGroup[] {
  if (!data) return [];
  const keys = [
    ...ROLE_ORDER.filter((key) => isMemberList(data[key])),
    ...Object.keys(data).filter((key) => key !== 'handle' && !ROLE_ORDER.includes(key) && isMemberList(data[key])),
  ];
  return keys
    .map((key) => ({
      key,
      title: t(key),
      members: (data[key] as ProjectMember[]).filter((member) => member && typeof member.handle === 'string' && member.handle),
    }))
    .filter((group) => group.members.length > 0);
}

export function sortByRank(members: ProjectMember[], ranks: Record<string, number>): ProjectMember[] {
  const rankOf = (member: ProjectMember) => {
    const rank = ranks[member.handle];
    return typeof rank === 'number' && rank > 0 ? rank : Infinity;
  };
  return [...members].sort((a, b) => {
    const diff = rankOf(a) - rankOf(b);
    return Number.isNaN(diff) ? 0 : diff;
  });
}

function useMemberRanks(handles: string[]) {
  const [mode, , { isLoading }] = useLocalStorage<AvatarRankMode>('@settings/avatarRankMode', 'web3');
  const [ranks, setRanks] = useState<Record<string, number>>({});
  const key = handles.join(',');

  useEffect(() => {
    if (!key || isLoading) return;
    let alive = true;
    rankService
      .getRanks(key.split(','), mode)
      .then((next) => {
        if (alive) setRanks((prev) => ({ ...prev, ...next }));
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [key, mode, isLoading]);

  return ranks;
}

function MemberGrid({ members }: { members: ProjectMember[] }) {
  return (
    <ul className='xh-kolf-grid'>
      {members.map((member) => (
        <li key={member.handle}>
          <PersonChip handle={member.handle} name={member.name} avatar={member.image} extraTags={[member.level]} />
        </li>
      ))}
    </ul>
  );
}

export interface MembersCardProps {
  groups: Record<string, unknown> | null | undefined;
  rootData?: { members?: unknown; projectLink?: string } | null;
}

export function MembersCard({ groups: data, rootData }: MembersCardProps) {
  const { t } = useI18n();
  const rootMembers = useMemo(
    () => (Array.isArray(rootData?.members) ? (rootData.members as RootMember[]).filter((member) => member?.name) : []),
    [rootData],
  );
  const groups = useMemo(() => memberGroups(data, t), [data, t]);
  const [selected, setSelected] = useState<string | null>(null);
  const current = groups.find((group) => group.key === selected) ?? groups[0];
  const handles = useMemo(
    () => (rootMembers.length || !current ? [] : current.members.map((member) => member.handle)),
    [rootMembers, current],
  );
  const ranks = useMemberRanks(handles);
  const total = rootMembers.length || groups.reduce((sum, group) => sum + group.members.length, 0);

  let body;
  if (rootMembers.length) {
    body = (
      <ul className='xh-kolf-grid'>
        {rootMembers.map((member, index) => (
          <li key={`${index}-${member.name}`}>
            <PersonChip
              handle={handleFromUrl(member.twitter)}
              name={member.name}
              avatar={member.avatar}
              href={member.twitter}
              note={member.position}
            />
          </li>
        ))}
      </ul>
    );
  } else if (!current) {
    body = <DetailEmpty>{t('noData')}</DetailEmpty>;
  } else if (groups.length === 1) {
    body = <MemberGrid members={sortByRank(current.members, ranks)} />;
  } else {
    body = (
      <Tabs value={current.key} onValueChange={setSelected} variant='segmented'>
        <TabList
          aria-label={t('projectMembers')}
          items={groups.map((group) => ({ value: group.key, label: `${group.title} ${group.members.length}` }))}
        />
        {groups.map((group) => (
          <TabPanel key={group.key} value={group.key}>
            {group.key === current.key ? <MemberGrid members={sortByRank(group.members, ranks)} /> : null}
          </TabPanel>
        ))}
      </Tabs>
    );
  }

  const source = rootData?.projectLink ? (
    <a className='xh-dcard-link' href={rootData.projectLink} target='_blank' rel='noopener noreferrer'>
      {t('source')} · RootData
    </a>
  ) : null;

  return (
    <DetailCard
      className='xh-kolf-card xh-members-card'
      icon={<UsersIcon />}
      title={t('projectMembers')}
      subtitle={total ? t('memberCount').replace('{count}', String(total)) : undefined}
      footer={rootMembers.length ? source : groups.length ? t('membersAiNote') : null}
    >
      {body}
    </DetailCard>
  );
}
