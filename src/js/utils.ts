export const formatRank = (rank?: number | null): string => {
  if (rank === undefined || rank === null || rank < 0) return '-';

  let trophy = '#';
  if (rank < 2000) {
    trophy = '<span class="gold-trophy">🏆</span>';
  } else if (rank < 10000) {
    trophy = '<span class="silver-trophy">🏆</span>';
  } else if (rank < 100000) {
    trophy = '<span class="bronze-trophy">🏆</span>';
  }
  return `${trophy}${rank.toLocaleString()}`;
};
