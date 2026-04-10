import React, { useState } from 'react';
import { useDebounceEffect, useRequest } from 'ahooks';
import {
  fetchTwitterRankBatchNew as fetchTwitterRankByUsernames,
  postAuthCreator,
  fetchE2EActivities,
  getTwitterAuthUrl,
} from '~contents/services/api';
import { useI18n } from '~contents/hooks/i18n.ts';
import { useCrossPageSettings } from '~utils/settingsManager';
import { CloseConfirmDialog } from './CloseConfirmDialog';
import { HunterCampaignBanner } from './HunterCampaign/HunterCampaignBanner';
import { EngageToEarn } from './EngageToEarn';
import { LoginRequired } from './LoginRequired';
import { X } from 'lucide-react';
import { localStorageInstance } from '~storage/index.ts';
import { rankService } from '~utils/rankService';
import { useLocalStorage } from '~storage/useLocalStorage';
import { TwitterInitialStateCurrentUser } from '~types';
import { useGlobalTips } from '~compontents/area/GlobalTips.tsx';
import { openNewTab } from '~contents/utils';
import {
  SPECIAL_AUTHORED_RANK,
  VALID_RANK_THRESHOLD,
} from '~contents/constants/rank';

function isDarkTheme(theme: unknown) {
  return String(theme || '').toLowerCase() === 'dark';
}

export interface HunterEarnSectionProps {
  activeHunterCampaigns: any[];
}

type CreatorAuthStatusCode = 0 | 1 | 2 | 3 | 4;

function getAuthCooldownAllowed(recordTime?: string): boolean {
  if (!recordTime) return true;
  const t = Date.parse(recordTime);
  if (!Number.isFinite(t)) return true;
  const diffMs = Date.now() - t;
  const days = diffMs / (1000 * 60 * 60 * 24);
  return days >= 28;
}

export function HunterEarnSection({
  activeHunterCampaigns,
}: HunterEarnSectionProps) {
  const { t } = useI18n();
  const { isEnabled } = useCrossPageSettings();
  const [, setTips] = useGlobalTips();
  const [showCloseConfirm, setShowCloseConfirm] = React.useState(false);
  const [savedTab, setSavedTab, { isLoading: isLoadingSavedTab }] = useLocalStorage<'hunter' | 'engage'>(
    '@xhunt/hunterEarnSelectedTab',
    'hunter'
  );
  const [lastViewedHunter, setLastViewedHunter] = useLocalStorage<string>(
    '@xhunt/hunterEarnLastViewedHunter',
    ''
  );
  const [lastViewedEngage, setLastViewedEngage] = useLocalStorage<string>(
    '@xhunt/hunterEarnLastViewedEngage',
    ''
  );
  const [newestEngageTweetId, setNewestEngageTweetId] = React.useState<
    string | null
  >(null);
  const [token] = useLocalStorage('@xhunt/token', '');
  const [theme] = useLocalStorage('@xhunt/theme', 'dark');
  const dark = isDarkTheme(theme);
  const [authorVerifyStatus, setAuthorVerifyStatus] = useState('idle');
  const isAuthorVerifyPending = authorVerifyStatus === 'pending';
  const [currentUsername] = useLocalStorage('@xhunt/current-username', '');
  const [showEngageInEarn, setShowEngageInEarn] = React.useState(false);
  const portalRef = React.useRef<HTMLDivElement>(null);
  const [userRank, setUserRank] = React.useState<number | null>(null);
  const [isRankLoading, setIsRankLoading] = React.useState(true);
  const [userInfo] = useLocalStorage<TwitterInitialStateCurrentUser | null>(
    '@xhunt/initial-state-current-user',
    null
  );

  const userName = userInfo?.screen_name || currentUsername;

  const [creatorAuth, setCreatorAuth] = React.useState<
    | {
      status: CreatorAuthStatusCode;
      recordTime?: string;
    }
    | null
  >(null);

  const { run: refreshCreatorAuth } = useRequest(
    async () => {
      if (!userName) return;

      const rows = await fetchTwitterRankByUsernames([userName], true);
      const first = rows?.[0];
      const st = first?.auth_creator?.status;
      const recordTime = first?.auth_creator?.record_time;

      if (typeof st === 'number') {
        const status = st as CreatorAuthStatusCode;
        setCreatorAuth({ status, recordTime });

        if (status === 1) {
          setAuthorVerifyStatus('pending');
        } else {
          setAuthorVerifyStatus('idle');
        }
      } else {
        setCreatorAuth(null);
        setAuthorVerifyStatus('idle');
      }

      if (first?.kolRank !== undefined) {
        await rankService.updateRanks({ [userName]: first.kolRank }, 'influence');
        setUserRank(first.kolRank);
      }
    },
    {
      manual: true,
    }
  );

  // 获取当前用户 rank + 认证状态
  React.useEffect(() => {
    const fetchRank = async () => {
      if (!userName) {
        setIsRankLoading(false);
        return;
      }
      setIsRankLoading(true);
      try {
        const ranks = await rankService.getRanks([userName], 'influence');
        const rank = ranks[userName];
        setUserRank(rank !== undefined ? rank : null);

        refreshCreatorAuth();
      } catch (err) {
        console.error('[HunterEarnSection] Failed to fetch rank:', err);
        setUserRank(null);
        setCreatorAuth(null);
        setAuthorVerifyStatus('idle');
      } finally {
        setIsRankLoading(false);
      }
    };
    fetchRank();
  }, [userName, refreshCreatorAuth]);

  React.useEffect(() => {
    if (creatorAuth?.status !== 1) return;

    const timer = window.setInterval(() => {
      refreshCreatorAuth();
    }, 30000);

    return () => {
      window.clearInterval(timer);
    };
  }, [creatorAuth?.status, refreshCreatorAuth]);

  //TEST xhunt eran 本地测试
  const showHunter = isEnabled('showHunterCampaign');
  const showEngage = isEnabled('showEngageToEarn');
  const showingEngage = showEngage && (!showHunter || showEngageInEarn);
  const [e2eStatus, setE2EStatus] = React.useState<
    'all' | 'active' | 'complete' | 'review'
  >('active');

  // 初始化：根据保存的选择和可用性设置初始状态
  const initializedRef = React.useRef(false);
  useDebounceEffect(() => {
    if (isLoadingSavedTab) return;
    if (initializedRef.current) return;
    if (!showHunter && !showEngage) return;

    if (savedTab === 'engage' && showEngage) {
      setShowEngageInEarn(true);
      initializedRef.current = true;
      return;
    }
    if (savedTab === 'hunter' && showHunter) {
      setShowEngageInEarn(false);
      initializedRef.current = true;
      return;
    }

    if (savedTab === 'engage' && !showEngage) {
      setShowEngageInEarn(false);
      setSavedTab('hunter');
      initializedRef.current = true;
      return;
    }
    if (savedTab === 'hunter' && !showHunter) {
      setShowEngageInEarn(true);
      setSavedTab('engage');
      initializedRef.current = true;
      return;
    }
    initializedRef.current = true;
  }, [showHunter, showEngage, savedTab, setSavedTab, isLoadingSavedTab], {
    wait: 300,
    maxWait: 1000,
    leading: false,
    trailing: true,
  });

  // 当 showingEngage 变化时，更新本地存储
  React.useEffect(() => {
    if (isLoadingSavedTab) return;
    if (!initializedRef.current) {
      return;
    }
    if (showingEngage && showEngage) {
      setSavedTab('engage');
    } else if (!showingEngage && showHunter) {
      setSavedTab('hunter');
    }
  }, [showEngage, showHunter]);

  // 拉取 Engage 活动列表用于小红点判断（仅在 showEngage 时）
  React.useEffect(() => {
    if (!showEngage) return;
    let cancelled = false;
    const load = async () => {
      try {
        const result = await fetchE2EActivities();
        if (cancelled || !result?.data) return;
        const data = result.data as any;
        const active = Array.isArray(data?.active) ? data.active : [];
        // 按 start_time 倒序，取第一个（最新进行中活动）
        const sorted = [...active].sort((a, b) => {
          const sa = (a?.detail?.start_time || '') as string;
          const sb = (b?.detail?.start_time || '') as string;
          return sb.localeCompare(sa);
        });
        const first = sorted[0];
        const tweetId = first?.detail?.tweet_id ?? null;
        if (!cancelled) setNewestEngageTweetId(tweetId);
      } catch {
        if (!cancelled) setNewestEngageTweetId(null);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [showEngage]);

  // 排序后第一个 Hunter 活动 id（用于小红点）- 必须在所有 early return 之前调用
  const sortedHunterCampaigns = React.useMemo(
    () =>
      [...(activeHunterCampaigns || [])].sort(
        (a, b) => (b.sortWeight ?? 0) - (a.sortWeight ?? 0)
      ),
    [activeHunterCampaigns]
  );
  const firstHunterId = sortedHunterCampaigns[0]?.id ?? null;
  const hasHunterDot =
    showHunter &&
    Boolean(firstHunterId) &&
    firstHunterId !== (lastViewedHunter || '');
  const hasEngageDot =
    showEngage &&
    Boolean(newestEngageTweetId) &&
    newestEngageTweetId !== (lastViewedEngage || '');

  const handleHunterTabClick = React.useCallback(() => {
    setShowEngageInEarn(false);
    if (firstHunterId) setLastViewedHunter(firstHunterId);
    setSavedTab('hunter');
  }, [firstHunterId, setLastViewedHunter]);
  const handleEngageTabClick = React.useCallback(() => {
    setShowEngageInEarn(true);
    if (newestEngageTweetId) setLastViewedEngage(newestEngageTweetId);
    setSavedTab('engage');
  }, [newestEngageTweetId, setLastViewedEngage]);

  if (!userName) {
    return <></>;
  }

  if (!showHunter && !showEngage) {
    return <></>;
  }

  if (isRankLoading) {
    return <></>;
  }

  const isCreatorAuthed =
    Number(creatorAuth?.status) === 2 ||
    Number(userRank) === SPECIAL_AUTHORED_RANK;
  const isInCooldown =
    (creatorAuth?.status === 3 || creatorAuth?.status === 4) &&
    !getAuthCooldownAllowed(creatorAuth?.recordTime);

  const unRankedUser =
    !userRank || userRank <= 0 || userRank >= VALID_RANK_THRESHOLD;

  if (unRankedUser && !isCreatorAuthed && isInCooldown) {
    // 这种代表用户未上榜，且未认证，且在冷却期，需要等下次认证。
    return <></>;
  }

  return (
    <div className='relative' ref={portalRef}>
      <div className='px-4 pt-3 flex items-center justify-between'>
        <div className='flex items-center gap-2'>
          {showHunter && (
            <button
              type='button'
              className={`relative inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${!showingEngage
                ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow'
                : 'theme-bg-secondary theme-text-secondary hover:opacity-80'
                }`}
              onClick={handleHunterTabClick}
              aria-label={t('xhuntEarnTitle')}
            >
              <span>{t('xhuntEarnTitle1')}</span>
              {hasHunterDot && (
                <span className='absolute -top-0 right-0 h-2 w-2 rounded-full bg-red-500 border border-white shadow-sm' />
              )}
            </button>
          )}
          {showEngage && (
            <button
              type='button'
              className={`relative inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${showingEngage
                ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow'
                : 'theme-bg-secondary theme-text-secondary hover:opacity-80'
                }`}
              onClick={handleEngageTabClick}
              aria-label={t('engageToEarn')}
            >
              <span>{t('engageToEarn1')}</span>
              {hasEngageDot && (
                <span className='absolute -top-0 right-0 h-2 w-2 rounded-full bg-red-500 border border-white shadow-sm' />
              )}
            </button>
          )}
        </div>
        <div className='flex items-center gap-1'>
          {(showHunter || showEngage) && (
            <button
              type='button'
              aria-label={
                showingEngage
                  ? 'Close Engage To Earn'
                  : 'Close Hunter Campaign'
              }
              title='Close'
              className='p-1.5 rounded-md theme-hover theme-text-primary'
              onClick={() => setShowCloseConfirm(true)}
            >
              <X className='w-4 h-4' />
            </button>
          )}
        </div>
      </div>

      {unRankedUser && !isCreatorAuthed ? <>{
        isInCooldown ? <></> : (
          <div className='-mt-1 z-10 relative'>
            <div className='flex flex-col items-center text-center'>
              <div
                className='flex h-12 w-12 items-center justify-center rounded-2xl'
                style={{
                  background: dark
                    ? 'linear-gradient(135deg, rgba(59,130,246,0.10), rgba(168,85,247,0.10))'
                    : 'linear-gradient(135deg, rgba(59,130,246,0.18), rgba(168,85,247,0.18))',
                }}
              >
                <svg
                  className='w-full h-full'
                  height='800'
                  node-id='1'
                  template-height='800'
                  template-width='800'
                  version='1.1'
                  viewBox='0 0 800 800'
                  width='800'
                  xmlns='http://www.w3.org/2000/svg'
                >
                  <defs node-id='166'>
                    <linearGradient
                      gradientUnits='objectBoundingBox'
                      id='SVGID_1_'
                      node-id='12'
                      spreadMethod='pad'
                      x1='399.4451'
                      x2='399.4451'
                      y1='159.3104'
                      y2='714.802'
                    >
                      <stop
                        offset='0.00000009590021'
                        stopColor='#f4f2fb'
                      />
                      <stop offset='1' stopColor='#e1eef5' />
                    </linearGradient>
                    <linearGradient
                      gradientUnits='objectBoundingBox'
                      id='SVGID_2_'
                      node-id='16'
                      spreadMethod='pad'
                      x1='448.6747'
                      x2='599.4954'
                      y1='600.6242'
                      y2='339.3951'
                    >
                      <stop offset='0.3619' stopColor='#b4c9db' />
                      <stop offset='0.8978' stopColor='#ecf0f9' />
                    </linearGradient>
                    <linearGradient
                      gradientUnits='objectBoundingBox'
                      id='SVGID_3_'
                      node-id='21'
                      spreadMethod='pad'
                      x1='114.5269'
                      x2='114.5269'
                      y1='540.6995'
                      y2='403.525'
                    >
                      <stop offset='0.2267' stopColor='#d0dceb' />
                      <stop offset='0.7893' stopColor='#ecf1fb' />
                    </linearGradient>
                    <linearGradient
                      gradientUnits='objectBoundingBox'
                      id='SVGID_4_'
                      node-id='26'
                      spreadMethod='pad'
                      x1='114.5287'
                      x2='114.5287'
                      y1='418.7567'
                      y2='569.89'
                    >
                      <stop offset='0' stopColor='#ecf1fb' />
                      <stop offset='0.818' stopColor='#b6c9dd' />
                    </linearGradient>
                    <linearGradient
                      gradientUnits='objectBoundingBox'
                      id='SVGID_5_'
                      node-id='31'
                      spreadMethod='pad'
                      x1='615.6557'
                      x2='615.6557'
                      y1='449.1776'
                      y2='360.8531'
                    >
                      <stop offset='0.2267' stopColor='#d0dceb' />
                      <stop offset='0.7893' stopColor='#ecf1fb' />
                    </linearGradient>
                    <linearGradient
                      gradientUnits='objectBoundingBox'
                      id='SVGID_6_'
                      node-id='36'
                      spreadMethod='pad'
                      x1='615.6569'
                      x2='615.6569'
                      y1='370.6605'
                      y2='467.9728'
                    >
                      <stop offset='0' stopColor='#ecf1fb' />
                      <stop offset='0.818' stopColor='#b6c9dd' />
                    </linearGradient>
                    <linearGradient
                      gradientUnits='objectBoundingBox'
                      id='SVGID_7_'
                      node-id='41'
                      spreadMethod='pad'
                      x1='672.3656'
                      x2='672.3656'
                      y1='544.7239'
                      y2='510.393'
                    >
                      <stop offset='0.2267' stopColor='#d0dceb' />
                      <stop offset='0.7893' stopColor='#ecf1fb' />
                    </linearGradient>
                    <linearGradient
                      gradientUnits='objectBoundingBox'
                      id='SVGID_8_'
                      node-id='45'
                      spreadMethod='pad'
                      x1='672.4261'
                      x2='672.4261'
                      y1='514.7277'
                      y2='569.9913'
                    >
                      <stop offset='0' stopColor='#ecf1fb' />
                      <stop offset='0.818' stopColor='#b6c9dd' />
                    </linearGradient>
                    <linearGradient
                      gradientUnits='objectBoundingBox'
                      id='SVGID_9_'
                      node-id='49'
                      spreadMethod='pad'
                      x1='461.5738'
                      x2='426.8195'
                      y1='86.571'
                      y2='146.7671'
                    >
                      <stop offset='0' stopColor='#ffdb80' />
                      <stop offset='1' stopColor='#ffbb24' />
                    </linearGradient>
                    <linearGradient
                      gradientUnits='objectBoundingBox'
                      id='SVGID_10_'
                      node-id='53'
                      spreadMethod='pad'
                      x1='419.2366'
                      x2='419.2366'
                      y1='117.0371'
                      y2='174.4911'
                    >
                      <stop offset='0' stopColor='#f9fafe' />
                      <stop offset='1' stopColor='#e5edf7' />
                    </linearGradient>
                    <linearGradient
                      gradientUnits='objectBoundingBox'
                      id='SVGID_11_'
                      node-id='57'
                      spreadMethod='pad'
                      x1='602.4979'
                      x2='178.1419'
                      y1='555.1212'
                      y2='310.1191'
                    >
                      <stop offset='0.15' stopColor='#afc5d8' />
                      <stop offset='1' stopColor='#dfe8f9' />
                    </linearGradient>
                    <linearGradient
                      gradientUnits='objectBoundingBox'
                      id='SVGID_12_'
                      node-id='61'
                      spreadMethod='pad'
                      x1='556.2148'
                      x2='214.8945'
                      y1='607.2558'
                      y2='265.9355'
                    >
                      <stop offset='0.15' stopColor='#b6cadc' />
                      <stop offset='1' stopColor='#dfe8f9' />
                    </linearGradient>
                    <linearGradient
                      gradientUnits='objectBoundingBox'
                      id='SVGID_13_'
                      node-id='65'
                      spreadMethod='pad'
                      x1='402.5954'
                      x2='262.6231'
                      y1='349.0299'
                      y2='349.0299'
                    >
                      <stop offset='0.15' stopColor='#afc5d8' />
                      <stop offset='1' stopColor='#dfe8f9' />
                    </linearGradient>
                    <linearGradient
                      gradientUnits='objectBoundingBox'
                      id='SVGID_14_'
                      node-id='69'
                      spreadMethod='pad'
                      x1='402.5954'
                      x2='262.6231'
                      y1='417.068'
                      y2='417.068'
                    >
                      <stop offset='0.15' stopColor='#afc5d8' />
                      <stop offset='1' stopColor='#dfe8f9' />
                    </linearGradient>
                    <linearGradient
                      gradientUnits='objectBoundingBox'
                      id='SVGID_15_'
                      node-id='73'
                      spreadMethod='pad'
                      x1='356.7839'
                      x2='262.6231'
                      y1='485.2961'
                      y2='485.2961'
                    >
                      <stop offset='0.15' stopColor='#afc5d8' />
                      <stop offset='1' stopColor='#dfe8f9' />
                    </linearGradient>
                    <linearGradient
                      gradientUnits='objectBoundingBox'
                      id='SVGID_16_'
                      node-id='77'
                      spreadMethod='pad'
                      x1='398.5092'
                      x2='262.6231'
                      y1='351.263'
                      y2='351.263'
                    >
                      <stop offset='0' stopColor='#ebf2fa' />
                      <stop offset='0.5247' stopColor='#fdfeff' />
                    </linearGradient>
                    <linearGradient
                      gradientUnits='objectBoundingBox'
                      id='SVGID_17_'
                      node-id='81'
                      spreadMethod='pad'
                      x1='398.5092'
                      x2='262.6231'
                      y1='419.351'
                      y2='419.351'
                    >
                      <stop offset='0' stopColor='#ebf2fa' />
                      <stop offset='0.5247' stopColor='#fdfeff' />
                    </linearGradient>
                    <linearGradient
                      gradientUnits='objectBoundingBox'
                      id='SVGID_18_'
                      node-id='85'
                      spreadMethod='pad'
                      x1='353.6578'
                      x2='262.6231'
                      y1='487.4395'
                      y2='487.4395'
                    >
                      <stop offset='0' stopColor='#ebf2fa' />
                      <stop offset='0.5247' stopColor='#fdfeff' />
                    </linearGradient>
                    <linearGradient
                      gradientUnits='objectBoundingBox'
                      id='SVGID_19_'
                      node-id='89'
                      spreadMethod='pad'
                      x1='615.7809'
                      x2='458.2957'
                      y1='588.131'
                      y2='430.6458'
                    >
                      <stop offset='0.15' stopColor='#afc5d8' />
                      <stop offset='1' stopColor='#dfe8f9' />
                    </linearGradient>
                    <linearGradient
                      gradientUnits='objectBoundingBox'
                      id='SVGID_20_'
                      node-id='93'
                      spreadMethod='pad'
                      x1='608.686'
                      x2='457.0784'
                      y1='589.3483'
                      y2='437.7407'
                    >
                      <stop offset='0' stopColor='#c7d4e5' />
                      <stop offset='0.6872' stopColor='#e8eff8' />
                    </linearGradient>
                    <linearGradient
                      gradientUnits='objectBoundingBox'
                      id='SVGID_21_'
                      node-id='100'
                      spreadMethod='pad'
                      x1='-2873.2231'
                      x2='-2892.1953'
                      y1='1367.3894'
                      y2='1334.529'
                    >
                      <stop offset='0.5555' stopColor='#4673bc' />
                      <stop offset='0.9553' stopColor='#6a94e0' />
                    </linearGradient>
                    <linearGradient
                      gradientUnits='objectBoundingBox'
                      id='SVGID_22_'
                      node-id='105'
                      spreadMethod='pad'
                      x1='-1195.0238'
                      x2='-1195.0238'
                      y1='413.7065'
                      y2='392.89'
                    >
                      <stop offset='0' stopColor='#f4b9a4' />
                      <stop offset='0.652' stopColor='#fad1bb' />
                    </linearGradient>
                    <linearGradient
                      gradientUnits='objectBoundingBox'
                      id='SVGID_23_'
                      node-id='109'
                      spreadMethod='pad'
                      x1='-1209.6047'
                      x2='-1209.6047'
                      y1='433.0524'
                      y2='407.19'
                    >
                      <stop offset='0' stopColor='#fad96e' />
                      <stop offset='1' stopColor='#ffb32c' />
                    </linearGradient>
                    <linearGradient
                      gradientUnits='objectBoundingBox'
                      id='SVGID_24_'
                      node-id='113'
                      spreadMethod='pad'
                      x1='-1205.1876'
                      x2='-1171.5303'
                      y1='397.2899'
                      y2='397.2899'
                    >
                      <stop offset='0' stopColor='#4f5c7c' />
                      <stop offset='1' stopColor='#274168' />
                    </linearGradient>
                    <linearGradient
                      gradientUnits='objectBoundingBox'
                      id='SVGID_25_'
                      node-id='117'
                      spreadMethod='pad'
                      x1='-1207.9128'
                      x2='-1174.8274'
                      y1='393.3894'
                      y2='393.3894'
                    >
                      <stop offset='0' stopColor='#18264b' />
                      <stop offset='0.652' stopColor='#2d3c65' />
                    </linearGradient>
                    <linearGradient
                      gradientUnits='objectBoundingBox'
                      id='SVGID_26_'
                      node-id='121'
                      spreadMethod='pad'
                      x1='-1188.4199'
                      x2='-1188.4199'
                      y1='413.0585'
                      y2='392.1122'
                    >
                      <stop offset='0' stopColor='#f4b9a4' />
                      <stop offset='0.652' stopColor='#fad1bb' />
                    </linearGradient>
                    <linearGradient
                      gradientUnits='objectBoundingBox'
                      id='SVGID_27_'
                      node-id='125'
                      spreadMethod='pad'
                      x1='-1128.7451'
                      x2='-1128.7451'
                      y1='5.8541'
                      y2='-22.7881'
                    >
                      <stop offset='0' stopColor='#f4b9a4' />
                      <stop offset='0.652' stopColor='#fad1bb' />
                    </linearGradient>
                    <linearGradient
                      gradientUnits='objectBoundingBox'
                      id='SVGID_28_'
                      node-id='129'
                      spreadMethod='pad'
                      x1='-1152.2739'
                      x2='-1190.8937'
                      y1='-872.1565'
                      y2='-872.1565'
                    >
                      <stop offset='0' stopColor='#4f5c7c' />
                      <stop offset='1' stopColor='#274168' />
                    </linearGradient>
                    <linearGradient
                      gradientUnits='objectBoundingBox'
                      id='SVGID_29_'
                      node-id='133'
                      spreadMethod='pad'
                      x1='-1222.1006'
                      x2='-1145.0049'
                      y1='448.8328'
                      y2='448.8328'
                    >
                      <stop offset='0' stopColor='#18264b' />
                      <stop offset='0.652' stopColor='#2d3c65' />
                    </linearGradient>
                    <linearGradient
                      gradientUnits='objectBoundingBox'
                      id='SVGID_30_'
                      node-id='137'
                      spreadMethod='pad'
                      x1='-1119.8882'
                      x2='-1253.1588'
                      y1='431.3131'
                      y2='431.3131'
                    >
                      <stop offset='0' stopColor='#445677' />
                      <stop offset='1' stopColor='#293861' />
                    </linearGradient>
                    <linearGradient
                      gradientUnits='objectBoundingBox'
                      id='SVGID_31_'
                      node-id='141'
                      spreadMethod='pad'
                      x1='-1751.1182'
                      x2='-1751.1182'
                      y1='631.4767'
                      y2='522.5195'
                    >
                      <stop offset='0' stopColor='#fad96e' />
                      <stop offset='1' stopColor='#ffb32c' />
                    </linearGradient>
                    <linearGradient
                      gradientUnits='objectBoundingBox'
                      id='SVGID_32_'
                      node-id='146'
                      spreadMethod='pad'
                      x1='-1165.8843'
                      x2='-1143.5342'
                      y1='397.0909'
                      y2='397.0909'
                    >
                      <stop offset='0' stopColor='#f4b9a4' />
                      <stop offset='0.652' stopColor='#fad1bb' />
                    </linearGradient>
                    <linearGradient
                      gradientUnits='objectBoundingBox'
                      id='SVGID_33_'
                      node-id='150'
                      spreadMethod='pad'
                      x1='-1235.9202'
                      x2='-1235.9202'
                      y1='445.1025'
                      y2='376.4123'
                    >
                      <stop offset='0' stopColor='#fad96e' />
                      <stop offset='0.5439' stopColor='#ffb32c' />
                    </linearGradient>
                  </defs>
                  <g node-id='475'>
                    <g node-id='487'>
                      <g node-id='488'>
                        <path
                          d='M 482.70 200.66 C 444.33 230.95 361.96 234.47 301.53 198.44 C 241.10 162.41 129.53 167.06 99.31 233.31 C 69.09 299.56 136.50 364.64 112.09 412.29 C 87.68 459.94 6.33 527.34 62.12 608.69 C 117.91 690.04 188.72 669.31 231.34 661.14 C 315.51 645.01 421.13 776.81 539.96 677.27 C 608.43 619.92 710.40 719.36 750.13 595.91 C 782.91 494.05 664.46 456.41 700.16 387.88 C 738.12 315.00 730.83 228.64 689.70 186.82 C 651.39 147.87 548.95 148.36 482.70 200.66 Z'
                          fill='url(#SVGID_1_)'
                          fillRule='nonzero'
                          group-id='6,18,19'
                          node-id='377'
                          stroke='none'
                          target-height='628.94'
                          target-width='776.58'
                          target-x='6.33'
                          target-y='147.87'
                        />
                        <path
                          d='M 350.11 543.72 C 354.75 531.79 413.72 385.36 413.72 385.36 L 687.78 390.36 L 621.99 576.26 L 350.11 543.72 Z'
                          fill='url(#SVGID_2_)'
                          fillRule='nonzero'
                          group-id='6,18,19'
                          node-id='379'
                          stroke='none'
                          target-height='190.90002'
                          target-width='337.67004'
                          target-x='350.11'
                          target-y='385.36'
                        />
                        <g node-id='491'>
                          <path
                            d='M 115.31 403.77 C 115.31 403.77 115.09 403.20 114.79 403.81 C 112.09 409.30 87.64 468.77 85.70 514.67 C 85.70 514.67 81.62 541.04 115.81 540.69 C 144.35 540.40 143.59 516.09 143.49 507.90 C 143.11 474.68 115.31 403.77 115.31 403.77 Z'
                            fill='url(#SVGID_3_)'
                            fillRule='nonzero'
                            group-id='6,18,19,22'
                            node-id='383'
                            stroke='none'
                            target-height='137.83997'
                            target-width='62.730003'
                            target-x='81.62'
                            target-y='403.2'
                          />
                          <g node-id='494'>
                            <path
                              d='M 114.53 569.89 C 113.98 569.89 113.53 569.44 113.53 568.89 L 113.53 419.76 C 113.53 419.21 113.98 418.76 114.53 418.76 C 115.08 418.76 115.53 419.21 115.53 419.76 L 115.53 568.89 C 115.53 569.44 115.08 569.89 114.53 569.89 Z'
                              fill='url(#SVGID_4_)'
                              fillRule='nonzero'
                              group-id='6,18,19,22,25'
                              node-id='387'
                              stroke='none'
                              target-height='151.13'
                              target-width='1.9999924'
                              target-x='113.53'
                              target-y='418.76'
                            />
                          </g>
                        </g>
                      </g>
                    </g>
                  </g>
                </svg>
              </div>

              <div className='mt-1.5 text-[12px] font-semibold theme-text-primary'>
                {isAuthorVerifyPending
                  ? t('hunterEarnVerifyAuthorPendingTitle')
                  : t('hunterEarnVerifyAuthorTitle')}
              </div>
              <div className='text-[10px] leading-4 theme-text-secondary max-w-[320px]'>
                {isAuthorVerifyPending
                  ? t('hunterEarnVerifyAuthorPendingDesc')
                  : t('hunterEarnVerifyAuthorDesc')}
              </div>

              {!isAuthorVerifyPending && (
                <div className='mt-2 flex flex-col items-center gap-1.5'>
                  <button
                    type='button'
                    className={`inline-flex items-center justify-center rounded-full px-4 py-1.5 text-[11px] font-semibold shadow-sm transition-colors bg-transparent border ${dark
                      ? 'text-blue-300 border-blue-400/40 hover:border-blue-300/70 hover:text-blue-200 opacity-95 hover:opacity-100'
                      : 'text-blue-600 border-blue-500/70 hover:border-blue-500/90 hover:text-blue-500 opacity-80 hover:opacity-100'
                      }`}
                    onClick={async () => {
                      if (!token) {
                        try {
                          const ret = await getTwitterAuthUrl();
                          if (ret?.url) openNewTab(ret.url);
                        } catch { }
                        return;
                      }

                      const confirmed = window.confirm(
                        t('hunterEarnVerifyAuthorConfirmAlert')
                      );
                      if (!confirmed) return;

                      const userId = String(userInfo?.id_str || '').trim();
                      if (!userId) return;

                      try {
                        const ret = await postAuthCreator({ user_id: userId });
                        const action =
                          (ret as any)?.data?.data?.action ??
                          (ret as any)?.data?.action;
                        if (action === '认证中') {
                          setAuthorVerifyStatus('pending');
                          setTips({
                            text: t('hunterEarnVerifyAuthorSubmittedTip'),
                            type: 'suc',
                          });
                        } else if (action === '禁止认证') {
                          setTips({
                            text: t('hunterEarnVerifyAuthorBlockedTip'),
                            type: 'fail',
                          });
                        }
                      } catch {
                        // ignore
                      }
                    }}
                  >
                    {t('hunterEarnVerifyAuthorCta')}
                  </button>
                </div>
              )}
            </div>
          </div>
        )
      }</> : (
        <>
          {showingEngage ? (
            <div className='px-4 pt-3'>
              <LoginRequired showInCenter={true}>
                <EngageToEarn
                  className=''
                  embedded={true}
                  externalStatus={e2eStatus}
                  onStatusChange={(next) => setE2EStatus(next)}
                  onNewestActiveActivityChange={(tweetId) => {
                    setNewestEngageTweetId(tweetId);
                    if (showingEngage && tweetId) setLastViewedEngage(tweetId);
                  }}
                  portalContainer={portalRef.current}
                />
              </LoginRequired>
            </div>
          ) : (
            <>
              {sortedHunterCampaigns.length === 0 ? (
                <div className='px-4 pt-3 text-xs text-center theme-text-secondary'>
                  {t('noActivitiesPleaseFollow')}{' '}
                  <a
                    href='https://x.com/xhunt_ai'
                    className='text-blue-500 hover:underline'
                  >
                    @xhunt_ai
                  </a>{' '}
                  {t('latestUpdates')}
                </div>
              ) : (
                sortedHunterCampaigns.map((campaignConfig) => (
                  <div data-sort-weight={campaignConfig.sortWeight ?? 0} key={campaignConfig.id} className='px-4 pt-3'>
                    <HunterCampaignBanner
                      campaignConfig={campaignConfig}
                      defaultExpanded={false}
                    />
                  </div>
                ))
              )}
            </>
          )}
        </>
      )}

      {(showHunter || showingEngage) && (
        <CloseConfirmDialog
          isOpen={showCloseConfirm}
          onClose={() => setShowCloseConfirm(false)}
          onConfirm={async () => {
            setShowCloseConfirm(false);
            try {
              if (showingEngage) {
                await localStorageInstance.set('@settings/showEngageToEarn', false);
              } else if (showHunter) {
                await localStorageInstance.set('@settings/showHunterCampaign', false);
              }
            } catch { }
          }}
          prefixKey='confirmCloseTrendingPrefix'
          suffixKey='confirmCloseTrendingSuffix'
        />
      )}
    </div>
  );
}
