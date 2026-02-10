import { SPECIAL_AUTHORED_RANK } from '~contents/constants/rank';

export const formatRank = (
  rank: number | null | undefined,
  avatarRankMode: 'influence' | 'composite',
  username?: string
): string => {
  if (rank === -2 && username) return '~';
  // 特殊值：SPECIAL_AUTHORED_RANK 表示“已认证作者无有效排名”，使用特殊展示
  if (rank === SPECIAL_AUTHORED_RANK) {
    if (window._xhunt_language === 'zh') {
      return `<span>✍️ <span style="transform: scale(0.88); display: inline-block;">创作者</span></span>`;
    } else {
      return "✍️ Creator";
    }
  }
  if (rank === undefined || rank === null || rank < 0) return '-';

  const icon = avatarRankMode === 'influence' ? '🏆' : '🏅';

  let trophy = '#';
  if (rank < 2000) {
    trophy = `<span data-xhunt-avatar-rank-mode="${avatarRankMode}" class="gold-trophy">${icon}</span>`;
  } else if (rank < 10000) {
    trophy = `<span data-xhunt-avatar-rank-mode="${avatarRankMode}" class="silver-trophy">${icon}</span>`;
  } else if (rank < 100000) {
    trophy = `<span data-xhunt-avatar-rank-mode="${avatarRankMode}" class="bronze-trophy">${icon}</span>`;
  }
  return `${trophy}${rank.toLocaleString()}`;
};
