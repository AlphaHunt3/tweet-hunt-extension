interface TwitterUserInfo {
  userId: string
  username: string
  displayName: string
}

const waitForElement = (selector: string, maxAttempts = 10, interval = 1000): Promise<Element | null> => {
  return new Promise((resolve) => {
    let attempts = 0

    const check = () => {
      attempts++
      const element = document.querySelector(selector)
      console.log('attempts', element, selector)
      if (element) {
        resolve(element)
        return
      }

      if (attempts >= maxAttempts) {
        resolve(null)
        return
      }

      setTimeout(check, interval)
    }

    check()
  })
}

export const parseTwitterUserInfo = async (): Promise<TwitterUserInfo | null> => {
  try {
    // 等待用户名元素加载
    const usernameElement = await waitForElement('[data-testid="UserName"]')
    if (!usernameElement) {
      console.log('未找到用户名元素')
      return null
    }

    // 获取显示名和用户名
    const displayNameElement = usernameElement.querySelector('span')
    const usernameSpanElement = usernameElement.querySelector('div > span')

    if (!displayNameElement || !usernameSpanElement) {
      console.log('未找到显示名或用户名元素')
      return null
    }

    const displayName = displayNameElement.textContent || ''
    const username = usernameSpanElement.textContent?.replace('@', '') || ''

    // 从 URL 中获取用户 ID（实际上就是用户名）
    // Twitter 的用户页面 URL 格式为: twitter.com/username
    const userId = username // 直接使用用户名作为 ID

    // 等待关注统计元素加载
    const followStatsElements = await waitForElement('[data-testid="UserProfileHeader_Items"]')
    if (!followStatsElements) {
      console.log('未找到关注统计元素')
      return null
    }

    return {
      userId,
      username,
      displayName
    }
  } catch (error) {
    console.error('Error parsing Twitter user info:', error)
    return null
  }
}
