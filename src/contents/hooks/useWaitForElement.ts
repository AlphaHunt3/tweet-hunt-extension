import { useEffect, useState } from 'react';

/** 自定义 Hook：等待目标元素出现 **/
function useWaitForElement(selector: string): HTMLElement | null {
  const [element, setElement] = useState<HTMLElement | null>(null)

  useEffect(() => {
    // 定义一个查找函数
    const checkForElement = () => {
      const el = document.querySelector(selector) as HTMLElement | null
      if (el) {
        setElement(el)
        return true
      }
      return false
    }

    // 如果元素已经存在，就直接设置
    if (checkForElement()) {
      return
    }

    // 如果元素还不存在，使用 MutationObserver 监听 DOM 变化
    const observer = new MutationObserver(() => {
      if (checkForElement()) {
        observer.disconnect()
      }
    })

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    })

    // 清理 observer
    return () => observer.disconnect()
  }, [selector])

  return element
}

export default useWaitForElement;
