import { useEffect, useState } from 'react';

const useCurrentUrl = () => {
  const [currentUrl, setCurrentUrl] = useState(window.location.href)
  useEffect(() => {
    const observer = new MutationObserver(() => {
      const newUrl = window.location.href
      if (newUrl !== currentUrl) {
        setCurrentUrl(newUrl)
      }
    })

    observer.observe(document, { subtree: true, childList: true })

    return () => {
      observer.disconnect()
    }
  }, [currentUrl])
  return currentUrl;
}

export default useCurrentUrl;
