import React from 'react';
import { useLocalStorage } from '~storage/useLocalStorage';
import { formatRank } from '../js/utils';

interface AvatarRankBadgeProps {
  rank: number | null | undefined;
  isLoading: boolean;
  avatarRankMode: 'influence' | 'composite';
  theme?: string;
  loadingPlaceholder?: string;
}

const AvatarRankBadge: React.FC<AvatarRankBadgeProps> = ({
  rank,
  isLoading,
  avatarRankMode,
  theme,
  //   loadingPlaceholder = '~',
}) => {
  // 组件自治：决定是否显示排名徽章
  const [showAvatarRank, , { isLoading: isShowAvatarRankLoading }] =
    useLocalStorage('@settings/showAvatarRank', true);
  const [themeLocal] = useLocalStorage('@xhunt/theme', 'dark');

  // localStorage 还在加载或被用户关闭显示 -> 不渲染
  if (isShowAvatarRankLoading || !showAvatarRank) return null;

  const innerHTML = isLoading ? '~' : formatRank(rank, avatarRankMode);

  return (
    <div
      className={`xhunt-avatar-rank-badge ${
        rank && rank > 0 && rank <= 10000 ? 'high-ranked' : ''
      } ${isLoading ? 'loading' : ''}`}
      data-theme={themeLocal || theme}
    >
      <span
        className='xhunt-avatar-rank-text'
        dangerouslySetInnerHTML={{ __html: innerHTML }}
      />
    </div>
  );
};

export default AvatarRankBadge;
