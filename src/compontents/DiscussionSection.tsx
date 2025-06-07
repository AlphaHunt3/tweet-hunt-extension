import React, { useRef, useEffect, useState, useMemo } from 'react';
import { HoverStatItem } from '~/compontents/HoverStatItem.tsx';
import { DiscussionData, PopularityInfoType } from '~types';
import { useRequest } from 'ahooks';
import { fetchTwitterDiscussionDetail } from '~contents/services/api.ts';
import { useI18n } from '~contents/hooks/i18n.ts';
import { DiscussionPanel } from './DiscussionPanel';

interface DiscussionSectionProps {
  userId: string;
  discussionInfo: PopularityInfoType | null;
  loadingDiscussionInfo: boolean;
}

function _DiscussionSection({ userId, discussionInfo, loadingDiscussionInfo }: DiscussionSectionProps) {
  const { t } = useI18n();
  const controllerRef = useRef<AbortController | null>(null);
  const [discussionDataForUI, setDiscussionDataForUI] = useState<DiscussionData | undefined>();

  const fetchData = (): Promise<DiscussionData | undefined> => {
    // 中止之前的请求
    if (controllerRef.current) {
      controllerRef.current.abort();
    }

    // 创建新的控制器
    const controller = new AbortController();
    controllerRef.current = controller;

    // 发起请求，传入 signal
    return fetchTwitterDiscussionDetail(userId, controller.signal);
  };

  const { data: discussionData, loading, run: fetchDiscussion } = useRequest<DiscussionData | undefined, []>(
    fetchData,
    {
      manual: true,
    }
  );

  // Clear discussion data and abort request when userId changes
  useEffect(() => {
    if (controllerRef.current) {
      controllerRef.current.abort();
    }
    setDiscussionDataForUI(undefined);
  }, [userId]);

  useEffect(() => {
    setDiscussionDataForUI(discussionData);
  }, [discussionData]);

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
          hoverContent={<DiscussionPanel data={discussionData} period="1d" loading={loading} />}
          onHover={() => {
            if (!discussionDataForUI) {
              fetchDiscussion();
            }
          }}
          valueClassName="text-blue-700"
        />
      ) : null}

      {/*7d讨论*/}
      {!loadingDiscussionInfo && discussionInfo?.popularity7d && d7Total > 0 ? (
        <HoverStatItem
          label={t('discussion7d')}
          value={`(${discussionInfo.popularity7d})`}
          hoverContent={<DiscussionPanel data={discussionData} period="7d" loading={loading} />}
          onHover={() => {
            if (!discussionDataForUI) {
              fetchDiscussion();
            }
          }}
          valueClassName="text-blue-700"
        />
      ) : null}
    </>
  );
}

export const DiscussionSection = React.memo(_DiscussionSection);
