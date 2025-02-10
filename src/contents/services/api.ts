interface KOLStats {
  engagementRate: number
  averageRetweets: number
  top10Tweets: Array<{
    content: string
    retweetCount: number
  }>
  profitStats: {
    totalIncome: number
    monthlyIncome: number
    growthRate: number
  }
  deletedTweets: Array<{
    content: string
    deletedAt: string
  }>
}

// Mock 数据生成函数
const generateMockData = (userId: string): KOLStats => {
  return {
    engagementRate: 5.2,
    averageRetweets: 156,
    top10Tweets: [
      {
        content: "Web3 的未来发展趋势分析",
        retweetCount: 1234
      },
      {
        content: "如何成为一名优秀的开发者",
        retweetCount: 987
      }
    ],
    profitStats: {
      totalIncome: 12345,
      monthlyIncome: 2345,
      growthRate: 15.7
    },
    deletedTweets: [
      {
        content: "这是一条已删除的推文1",
        deletedAt: "2024-01-20T10:30:00Z"
      },
      {
        content: "这是一条已删除的推文2",
        deletedAt: "2024-01-19T15:45:00Z"
      },
      {
        content: "这是一条已删除的推文3",
        deletedAt: "2024-01-18T08:20:00Z"
      }
    ]
  }
}

// 模拟 API 延迟
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

export const fetchKOLStats = async (userId: string): Promise<KOLStats> => {
  try {
    // 模拟网络延迟 500-1500ms
    await delay(500 + Math.random() * 1000)

    // 模拟偶尔的网络错误
    if (Math.random() < 0.1) { // 10% 的概率发生错误
      throw new Error('网络请求失败')
    }

    return generateMockData(userId)
  } catch (error) {
    console.error('Error fetching KOL stats:', error)
    throw error
  }
}
