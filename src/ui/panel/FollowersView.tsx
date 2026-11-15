import { useState, type ReactNode } from 'react';
import { useI18n } from '~contents/hooks/i18n';
import { useUserDomain } from '~contents/hooks/useUserDomain';
import { ChevronDownIcon, UsersIcon } from '../icons';
import { Avatar, Badge, Button, RowButton, SegmentedControl } from '../primitives';
import { cx } from '../primitives/cx';
import { formatCount } from '../shells/HomeChrome';
import { useUiSkin } from '../skin/useUiSkin';
import { CardHeader, EmptyState, PanelCard } from './PanelSection';

type Scope = 'global' | 'cn' | 'top';

interface KolFollower {
  username: string;
  name?: string;
  avatar?: string;
}

const SCOPES: Record<Scope, { list: string; count: string; label: string }> = {
  global: { list: 'globalKolFollowers', count: 'globalKolFollowersCount', label: 'panelKolScopeGlobal' },
  cn: { list: 'cnKolFollowers', count: 'cnKolFollowersCount', label: 'panelKolScopeCn' },
  top: { list: 'topKolFollowers', count: 'topKolFollowersCount', label: 'panelKolScopeTop' },
};

export function FollowersView({ twInfo }: { twInfo: any }) {
  const { t } = useI18n();
  const { skin } = useUiSkin();
  const { primaryDomain } = useUserDomain();
  const [scope, setScope] = useState<Scope>('global');
  const [expanded, setExpanded] = useState(false);
  const kol = twInfo?.kolFollow ?? {};
  const suffix = primaryDomain === 'ai' ? 'Ai' : '';
  const listOf = (key: Scope): KolFollower[] => {
    const list = kol[SCOPES[key].list + suffix];
    return Array.isArray(list) ? list : [];
  };
  const countOf = (key: Scope) => kol[SCOPES[key].count + suffix] ?? listOf(key).length;
  const followers = listOf(scope);
  const limit = skin === 'soft' ? 8 : 6;
  const shown = expanded ? followers : followers.slice(0, limit);
  const toggleLabel = expanded ? t('showLess') : t('showMore');
  const chevron = <ChevronDownIcon size={14} className={cx('transition-transform', expanded && 'rotate-180')} />;

  return (
    <PanelCard>
      <CardHeader
        icon={skin === 'native' ? null : <UsersIcon size={14} />}
        title={t('kFollowingAnalytics')}
        aside={<Badge>{primaryDomain === 'ai' ? 'AI' : 'Web3'}</Badge>}
      />
      <SegmentedControl
        aria-label={t('panelKolScopeLabel')}
        variant={skin === 'soft' ? 'tiles' : 'default'}
        size={skin === 'obsidian' ? 'sm' : 'md'}
        block
        value={scope}
        onValueChange={(next) => {
          setScope(next);
          setExpanded(false);
        }}
        options={(['global', 'cn', 'top'] as const).map((key) => ({
          value: key,
          label:
            skin === 'soft' ? (
              <>
                <span>{t(SCOPES[key].label)}</span>
                <b>{formatCount(countOf(key))}</b>
              </>
            ) : (
              `${t(SCOPES[key].label)} ${formatCount(countOf(key))}`
            ),
        }))}
      />
      <div className='mt-3'>
        {followers.length === 0 ? (
          <EmptyState>{t('panelNoFollowers')}</EmptyState>
        ) : skin === 'soft' ? (
          <ul className='grid grid-cols-4 gap-x-1 gap-y-2'>
            {shown.map((follower) => (
              <li key={follower.username}>
                <FollowerLink follower={follower} className='flex-col gap-1.5 rounded-xl px-1 py-1.5 text-center'>
                  <Avatar name={follower.name || follower.username} src={follower.avatar} size='md' />
                  <span className='w-full truncate text-[11px] font-medium leading-tight'>
                    {follower.name || follower.username}
                  </span>
                </FollowerLink>
              </li>
            ))}
          </ul>
        ) : (
          <ul className='obsidian:-mx-1.5 native:-mx-4'>
            {shown.map((follower, index) => (
              <li key={follower.username}>
                <FollowerLink
                  follower={follower}
                  className='obsidian:rounded-[9px] obsidian:px-1.5 obsidian:py-[6px] native:gap-3 native:px-4 native:py-2.5'
                >
                  {skin === 'obsidian' ? (
                    <span className='w-4 shrink-0 text-right font-xh-mono text-[11px] tabular-nums text-xh-fg-2'>
                      {index + 1}
                    </span>
                  ) : null}
                  <Avatar name={follower.name || follower.username} src={follower.avatar} size={skin === 'native' ? 'lg' : 'md'} />
                  <span className='min-w-0 flex-1 leading-tight'>
                    <span className='block truncate obsidian:text-[12.5px] obsidian:font-medium native:text-[15px] native:font-bold'>
                      {follower.name || follower.username}
                    </span>
                    <span className='block truncate text-xh-fg-2 obsidian:text-[11.5px] native:text-[14px]'>
                      @{follower.username}
                    </span>
                  </span>
                </FollowerLink>
              </li>
            ))}
          </ul>
        )}
      </div>
      {followers.length > limit ? (
        skin === 'native' ? (
          <RowButton
            onClick={() => setExpanded((value) => !value)}
            className='-mx-4 -mb-3 mt-1 w-[calc(100%+2rem)] px-4 py-3 text-[15px] text-xh-accent-fg'
          >
            {toggleLabel}
          </RowButton>
        ) : (
          <Button size='sm' block onClick={() => setExpanded((value) => !value)} className='mt-2.5'>
            {toggleLabel}
            {chevron}
          </Button>
        )
      ) : null}
    </PanelCard>
  );
}

function FollowerLink({ follower, className, children }: { follower: KolFollower; className?: string; children: ReactNode }) {
  return (
    <a
      href={`https://x.com/${follower.username}`}
      target='_blank'
      rel='noopener noreferrer'
      title={`${follower.name || follower.username} (@${follower.username})`}
      className={cx('xh-rowbtn', className)}
    >
      {children}
    </a>
  );
}
