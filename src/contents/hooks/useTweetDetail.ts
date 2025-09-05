import { useMemo } from 'react';
import useCurrentUrl from './useCurrentUrl';

interface TweetDetailInfo {
  username: string;
  tweetId: string;
  isTweetDetail: boolean;
}

/**
 * Hook to check if current URL is a Twitter/X tweet detail page
 * and extract username and tweet ID
 * 
 * @returns {TweetDetailInfo} Object containing username, tweetId and isTweetDetail flag
 * 
 * @example
 * // For URL: https://x.com/elonmusk/status/1953886838445552084
 * // Returns: { username: 'elonmusk', tweetId: '1953886838445552084', isTweetDetail: true }
 * 
 * // For URL: https://x.com/user-name/status/1953886838445552084
 * // Returns: { username: 'user-name', tweetId: '1953886838445552084', isTweetDetail: true }
 * 
 * // For URL: https://x.com/user_name/status/1953886838445552084
 * // Returns: { username: 'user_name', tweetId: '1953886838445552084', isTweetDetail: true }
 * 
 * // For URL: https://x.com/elonmusk
 * // Returns: { username: '', tweetId: '', isTweetDetail: false }
 */
const useTweetDetail = (): TweetDetailInfo => {
  const currentUrl = useCurrentUrl();

  const tweetInfo = useMemo(() => {
    try {
      const url = new URL(currentUrl);
      
      // Check if it's a Twitter/X domain
      if (!url.hostname.includes('x.com') && !url.hostname.includes('twitter.com')) {
        return {
          username: '',
          tweetId: '',
          isTweetDetail: false
        };
      }

      const pathSegments = url.pathname.split('/').filter(segment => segment.length > 0);
      
      // Check if path matches tweet detail pattern: /username/status/tweetId
      if (pathSegments.length >= 3 && pathSegments[1] === 'status') {
        const username = pathSegments[0];
        const tweetId = pathSegments[2];
        
        // Validate username (should not be empty and should be alphanumeric with underscores, hyphens, and dots)
        if (username && /^[a-zA-Z0-9_.-]+$/.test(username) && tweetId) {
          return {
            username,
            tweetId,
            isTweetDetail: true
          };
        }
      }

      return {
        username: '',
        tweetId: '',
        isTweetDetail: false
      };
    } catch (error) {
      // If URL parsing fails, return empty values
      return {
        username: '',
        tweetId: '',
        isTweetDetail: false
      };
    }
  }, [currentUrl]);

  return tweetInfo;
};

export default useTweetDetail;
