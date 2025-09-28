import { useEffect, useState } from 'react';
import { useDebounce } from 'ahooks';
import useCurrentUrl from '~contents/hooks/useCurrentUrl';
import { extractUsernameFromUrl } from '~contents/utils';
import { NewTwitterUserData } from '~types';

export interface DOMUserInfo {
  username: string;    // Twitter handle (without @)
  name: string;        // Display name
  avatar: string;      // Avatar URL
  source: 'data-testid' | 'dom' | 'fallback';  // Where the info was extracted from
}

/**
 * Extract username and display name from document title
 * @returns {object | null} Object with username and name, or null if not found
 */
function extractUserInfoFromTitle(): { username: string; name: string } | null {
  try {
    const titleText = document.title || '';
    const titleMatch = titleText.match(/^(.+?)\s+\(@([^)]+)\)/);

    if (!titleMatch) {
      return null;
    }

    return {
      name: titleMatch[1].trim(),
      username: titleMatch[2].trim()
    };
  } catch (error) {
    console.log('Error extracting user info from title:', error);
    return null;
  }
}

/**
 * Validate extracted username against document title
 * @param extractedUsername Username extracted from DOM
 * @returns {boolean} True if username matches title, false otherwise
 */
function validateUsernameWithTitle(extractedUsername: string): boolean {
  try {
    const titleInfo = extractUserInfoFromTitle();
    if (!titleInfo) return false;

    // Case insensitive comparison
    return titleInfo.username.toLowerCase() === extractedUsername.toLowerCase();
  } catch (error) {
    console.log('Error validating username with title:', error);
    return false;
  }
}

/**
 * Extracts user information from Twitter page DOM
 * @param userId - The user ID from URL
 * @returns User information or null if not found
 */
export function extractUserInfoFromDOM(userId: string): DOMUserInfo | null {
  try {
    if (!userId) return null;

    // Get title information for validation
    const titleInfo = extractUserInfoFromTitle();

    // 1. HIGHEST PRIORITY: Try to extract using data-testid selectors
    const avatarImg = document.querySelector('main [data-testid*="UserAvatar-Container"] img') as HTMLImageElement;
    const nameInfoDiv = document.querySelector('main [data-testid="UserName"]') as HTMLDivElement;

    if (avatarImg?.src && nameInfoDiv?.textContent) {
      const avatar = avatarImg.src;
      const nameAllText = nameInfoDiv.textContent || '@';
      const nameParts = nameAllText.split('@');

      if (nameParts.length > 1) {
        const name = nameParts[0].trim();

        // Validate userId against title
        if (titleInfo && userId.toLowerCase() !== titleInfo.username.toLowerCase()) {
          // If userId doesn't match title, the page might still be loading
          return null;
        }

        return {
          username: userId,
          name,
          avatar,
          source: 'data-testid'
        };
      }
    }

    // 2. SECOND PRIORITY: Try to extract avatar from profile image div
    const mainElement = document.querySelector('main');
    if (!mainElement) return null;

    // Find profile image div with background-image style
    const avatarDiv = mainElement.querySelector('div[style*=\'background-image: url("https://pbs.twimg.com/profile_images/\']');
    if (!avatarDiv) return null;

    // Extract avatar URL from style
    const style = avatarDiv.getAttribute('style') || '';
    const avatarMatch = style.match(/url\("([^"]+)"\)/);
    if (!avatarMatch || !avatarMatch[1]) return null;

    const avatar = avatarMatch[1];

    // 3. Use title information if available
    if (!titleInfo) {
      // If title doesn't match expected format, validate userId
      if (!validateUsernameWithTitle(userId)) {
        return null;
      }

      return {
        username: userId,
        name: userId,
        avatar,
        source: 'dom'
      };
    }

    const name = titleInfo.name;
    const username = titleInfo.username;

    // Verify username matches userId (case insensitive)
    if (username.toLowerCase() !== userId.toLowerCase()) {
      // If usernames don't match, page might be still loading
      return null;
    }

    return {
      username,
      name,
      avatar,
      source: 'dom'
    };
  } catch (error) {
    console.log('Error extracting user info from DOM:', error);
    return null;
  }
}

/**
 * Hook to get user information with retry logic
 * @param userId - The user ID from URL
 * @param newTwitterData - Data from fetchTwitterInfoNew (优先使用)
 * @param isLoadingTwitterData - Whether fetchTwitterInfoNew is loading
 * @param maxRetries - Maximum number of retries
 * @param retryInterval - Interval between retries in ms
 * @returns User information and loading state
 */
export function useDOMUserInfo(
  userId: string,
  newTwitterData?: NewTwitterUserData | null,
  isLoadingTwitterData?: boolean,
  maxRetries = 5,
  retryInterval = 1500
): { userInfo: DOMUserInfo | null; isLoading: boolean } {
  const [userInfo, setUserInfo] = useState<DOMUserInfo | null>(null);
  const [isDOMLoading, setIsDOMLoading] = useState(true);
  const [retryCount, setRetryCount] = useState(0);
  const currentUrl = useCurrentUrl();
  const debouncedUserId = useDebounce(userId, { wait: 500 });

  // 计算最终的 loading 状态
  const isLoading = isLoadingTwitterData || isDOMLoading;

  useEffect(() => {
    if (!debouncedUserId) {
      setIsDOMLoading(false);
      setRetryCount(0);
      return;
    }

    // 如果正在加载 Twitter 数据，等待加载完成
    if (isLoadingTwitterData) {
      setIsDOMLoading(true);
      return;
    }

    // 优先使用 NewTwitterUserData 中的 profile 信息
    if (newTwitterData?.profile) {
      const profile = newTwitterData.profile;
      setUserInfo({
        username: profile.username_raw || profile.username,
        name: profile.name,
        avatar: profile.profile_image_url,
        source: 'data-testid' // 标记为来自 API 数据
      });
      setIsDOMLoading(false);
      setRetryCount(0);
      return;
    }

    // 如果没有 NewTwitterUserData，才从 DOM 提取
    setUserInfo(null);
    setIsDOMLoading(true);

    // Try to extract user info immediately
    let extractedInfo = extractUserInfoFromDOM(debouncedUserId);

    // If userId is empty but we have a URL, try to extract from URL
    if (!extractedInfo && !debouncedUserId && currentUrl) {
      const usernameFromUrl = extractUsernameFromUrl(currentUrl);
      if (usernameFromUrl) {
        extractedInfo = extractUserInfoFromDOM(usernameFromUrl);
      }
    }

    if (extractedInfo) {
      setUserInfo(extractedInfo);
      setIsDOMLoading(false);
      setRetryCount(0);
      return;
    }

    // If not successful, retry with exponential backoff
    if (retryCount < maxRetries) {
      const timer = setTimeout(() => {
        let retryExtractedInfo = extractUserInfoFromDOM(debouncedUserId);

        // If userId is empty but we have a URL, try to extract from URL
        if (!retryExtractedInfo && !debouncedUserId && currentUrl) {
          const usernameFromUrl = extractUsernameFromUrl(currentUrl);
          if (usernameFromUrl) {
            retryExtractedInfo = extractUserInfoFromDOM(usernameFromUrl);
          }
        }

        if (retryExtractedInfo) {
          setUserInfo(retryExtractedInfo);
          setIsDOMLoading(false);
          setRetryCount(0);
        } else {
          setRetryCount(prev => prev + 1);
        }
      }, retryInterval * Math.pow(1.5, retryCount));

      return () => clearTimeout(timer);
    } else if (isDOMLoading) {
      // After max retries, set loading to false but keep userInfo as null
      setIsDOMLoading(false);
    }
  }, [debouncedUserId, retryCount, currentUrl, maxRetries, retryInterval, newTwitterData, isLoadingTwitterData]);

  return { userInfo, isLoading };
}
