type Translate = (key: string, fallback?: string) => string;

/** 将后端返回的精确/匿名量级排名格式化为本地化展示文案 */
export function formatXHuntRankLabel(
  rank: number | null | undefined,
  isAnonymous: boolean | undefined,
  lang: string,
  t: Translate
): string | null {
  const numericRank = Number(rank);
  if (!Number.isFinite(numericRank) || numericRank <= 0) {
    return null;
  }

  const formattedRank = Math.floor(numericRank).toLocaleString(
    lang === 'zh' ? 'zh-CN' : 'en-US'
  );
  const template = isAnonymous
    ? t('hotVoteRankApproximate', 'XHunt 排名约 {rank}')
    : t('hotVoteRankExact', 'XHunt 排名 {rank}');

  return template.replace('{rank}', formattedRank);
}
