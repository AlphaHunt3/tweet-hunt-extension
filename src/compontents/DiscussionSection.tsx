import React, { useMemo } from 'react';
import { HoverStatItem } from '~/compontents/HoverStatItem.tsx';
import { PopularityInfoType } from '~types';
import { useI18n } from '~contents/hooks/i18n.ts';
import { DiscussionPanel } from './DiscussionPanel';

interface DiscussionSectionProps {
  userId: string;
  discussionInfo: PopularityInfoType | null | undefined;
  loadingDiscussionInfo: boolean;
}

function _DiscussionSection({ userId, discussionInfo, loadingDiscussionInfo }: DiscussionSectionProps) {
  const { t } = useI18n();

  // 直接从 discussionInfo 构造 discussionData
  const discussionData = useMemo(() => {
    if (!discussionInfo) return undefined;

    return {
      ca: discussionInfo.ca || '',
      symbol: discussionInfo.symbol || '',
      name: discussionInfo.name,
      twitter: discussionInfo.twitter,
      discussion1dCn: discussionInfo.discussion1dCn,
      discussion1dEn: discussionInfo.discussion1dEn,
      discussion7dCn: discussionInfo.discussion7dCn,
      discussion7dEn: discussionInfo.discussion7dEn
    };
  }, [discussionInfo]);

  const d1Total = useMemo(() => {
    return (discussionInfo?.discussion1dCn?.negativeBulletPoints.length || 0) + (discussionInfo?.discussion1dCn?.positiveBulletPoints.length || 0)
  }, [discussionInfo])
  const d7Total = useMemo(() => {
    return (discussionInfo?.discussion7dCn?.negativeBulletPoints.length || 0) + (discussionInfo?.discussion7dCn?.positiveBulletPoints.length || 0)
  }, [discussionInfo])

  return (
    <>
      {/*1d讨论*/}
      {!loadingDiscussionInfo && discussionInfo?.popularity1d && d1Total > 0 ? (
        <HoverStatItem
          label={t('discussion1d')}
          value={`(${discussionInfo.popularity1d})`}
          hoverContent={<DiscussionPanel data={discussionData} period="1d" loading={loadingDiscussionInfo} />}
          valueClassName="text-blue-700"
        />
      ) : null}

      {/*7d讨论*/}
      {!loadingDiscussionInfo && discussionInfo?.popularity7d && d7Total > 0 ? (
        <HoverStatItem
          label={t('discussion7d')}
          value={`(${discussionInfo.popularity7d})`}
          hoverContent={<DiscussionPanel data={discussionData} period="7d" loading={loadingDiscussionInfo} />}
          valueClassName="text-blue-700"
        />
      ) : null}
    </>
  );
}

export const DiscussionSection = React.memo(_DiscussionSection);
