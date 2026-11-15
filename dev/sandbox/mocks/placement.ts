// 沙盒里没有 X 的个人页 DOM，固定一个 twitterId，让灵魂指数能请求假数据
export default function usePlacementTracking() {
  return { twitterId: '1450000000000000001', handler: 'mira_onchain', loading: false };
}
