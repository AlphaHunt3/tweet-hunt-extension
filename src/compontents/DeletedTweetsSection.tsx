import { useState } from 'react';
import { Trash2, ChevronDown, ChevronUp, Eye, MessageCircle, Heart, Repeat, Bookmark } from 'lucide-react';
import { DeletedTweet } from '~types';
import dayjs from 'dayjs';
import numeral from 'numeral';
import { useI18n } from '~contents/hooks/i18n.ts';
import { fetchDeletedStatus } from '~contents/services/api';

// Quote Tweet Component
function QuoteTweet({ quote }: { quote: DeletedTweet }) {
  const { t } = useI18n();

  const formatNumber = (num: number | undefined) => {
    if (num === undefined || num === null) return '0';
    return numeral(num || 0).format('0.[0]a').toUpperCase();
  };

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return '';
    const date = dayjs(dateString);
    const now = dayjs();
    const hoursAgo = now.diff(date, 'hour');

    if (hoursAgo < 24) {
      return date.format('h:mm A');
    } else {
      return date.format('MMM D');
    }
  };

  // 处理点击事件
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    // 调用 fetchDeletedStatus，不等待返回结果
    fetchDeletedStatus(quote.id);
    // 跳转到帖子详情页
    window.open(`https://x.com/${quote.profile?.username}/status/${quote.id}`, '_blank');
  };

  // Sanitize HTML content to prevent XSS attacks and modify video tags
  const sanitizeHtml = (html: string | undefined): string => {
    if (!html) return '';

    try {
      // Create a temporary div to parse the HTML
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = html;

      // Remove all script tags
      const scripts = tempDiv.querySelectorAll('script');
      scripts.forEach(script => script.remove());

      // Remove all event handlers (onclick, onload, etc.)
      const allElements = tempDiv.querySelectorAll('*');
      allElements.forEach(el => {
        // Remove all attributes that start with "on"
        Array.from(el.attributes).forEach(attr => {
          if (attr.name.startsWith('on') || attr.name === 'href' && attr.value.startsWith('javascript:')) {
            el.removeAttribute(attr.name);
          }
        });
      });

      // Remove iframe tags
      const iframes = tempDiv.querySelectorAll('iframe');
      iframes.forEach(iframe => iframe.remove());

      // Remove object and embed tags
      const objects = tempDiv.querySelectorAll('object, embed');
      objects.forEach(obj => obj.remove());

      // Make all links open in a new tab and add noopener noreferrer
      const links = tempDiv.querySelectorAll('a');
      links.forEach(link => {
        link.setAttribute('target', '_blank');
        link.setAttribute('rel', 'noopener noreferrer');
      });

      // Modify video tags to prevent autoplay
      const videos = tempDiv.querySelectorAll('video');
      videos.forEach(video => {
        // Remove autoplay attribute
        video.removeAttribute('autoplay');
        // Add controls
        video.setAttribute('controls', '');
        // Set preload to none
        video.setAttribute('preload', 'none');
        // Add playsInline for mobile
        video.setAttribute('playsinline', '');

        // Add error handling for videos
        video.setAttribute('onerror', 'this.style.display="none"');

        // Add poster if available
        if (video.hasAttribute('poster') === false) {
          // Try to find a thumbnail from source elements
          const sources = video.querySelectorAll('source');
          if (sources.length > 0) {
            // Could set a default poster here if needed
          }
        }
      });

      return tempDiv.innerHTML;
    } catch (error) {
      console.log('Error sanitizing HTML:', error);
      return '';
    }
  };

  return (
    <div className="mt-3 p-1 border border-gray-500/10 rounded-lg overflow-hidden cursor-pointer" onClick={handleClick}>
      {/* Quote Header */}
      <div className="p-2 flex items-start gap-2">
        <img
          src={quote.profile?.profile_image_url}
          alt={quote.profile?.name}
          className="w-6 h-6 rounded-full flex-shrink-0"
          onError={(e) => {
            (e.target as HTMLImageElement).src = 'https://abs.twimg.com/sticky/default_profile_images/default_profile_400x400.png';
          }}
        />
        <div className="flex-1 min-w-0">
          {/* Quote User Info */}
          <div className="flex items-center gap-1 mb-1">
            <span className="font-medium text-xs theme-text-primary truncate">{quote.profile?.name}</span>
            {quote.profile?.is_blue_verified && (
              <svg className="w-3 h-3 text-[#1d9bf0] flex-shrink-0" viewBox="0 0 22 22" fill="currentColor">
                <path d="M20.396 11c-.018-.646-.215-1.275-.57-1.816-.354-.54-.852-.972-1.438-1.246.223-.607.27-1.264.14-1.897-.131-.634-.437-1.218-.882-1.687-.47-.445-1.053-.75-1.687-.882-.633-.13-1.29-.083-1.897.14-.273-.587-.704-1.086-1.245-1.44S11.647 1.62 11 1.604c-.646.017-1.273.213-1.813.568s-.969.854-1.24 1.44c-.608-.223-1.267-.272-1.902-.14-.635.13-1.22.436-1.69.882-.445.47-.749 1.055-.878 1.688-.13.633-.08 1.29.144 1.896-.587.274-1.087.705-1.443 1.245-.356.54-.555 1.17-.574 1.817.02.647.218 1.276.574 1.817.356.54.856.972 1.443 1.245-.224.606-.274 1.263-.144 1.896.13.634.433 1.218.877 1.688.47.443 1.054.747 1.687.878.633.132 1.29.084 1.897-.136.274.586.705 1.084 1.246 1.439.54.354 1.17.551 1.816.569.647-.016 1.276-.213 1.817-.567s.972-.854 1.245-1.44c.604.239 1.266.296 1.903.164.636-.132 1.22-.447 1.68-.907.46-.46.776-1.044.908-1.681s.075-1.299-.165-1.903c.586-.274 1.084-.705 1.439-1.246.354-.54.551-1.17.569-1.816zM9.662 14.85l-3.429-3.428 1.293-1.302 2.072 2.072 4.4-4.794 1.347 1.246z"></path>
              </svg>
            )}
            <span className="text-xs theme-text-secondary truncate">@{quote.profile?.username}</span>
            <span className="text-xs theme-text-secondary">·</span>
            <span className="text-xs theme-text-secondary whitespace-nowrap">{formatDate(quote.create_time)}</span>
          </div>

          {/* Quote Content */}
          <div className="text-xs theme-text-primary mb-2 leading-relaxed">
            {quote.info?.html ? (
              <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(quote.info.html) }} />
            ) : (
              <div>{quote.text || <span className="italic text-gray-400">No content</span>}</div>
            )}
          </div>

          {/* Quote Stats */}
          <div className="flex items-center gap-3 theme-text-secondary text-xs">
            <div className="flex items-center gap-1">
              <MessageCircle className="w-3 h-3" />
              <span>{formatNumber(quote.statistic?.reply_count)}</span>
            </div>
            <div className="flex items-center gap-1">
              <Repeat className="w-3 h-3" />
              <span>{formatNumber(quote.statistic?.retweet_count)}</span>
            </div>
            <div className="flex items-center gap-1">
              <Heart className="w-3 h-3" />
              <span>{formatNumber(quote.statistic?.likes)}</span>
            </div>
            <div className="flex items-center gap-1">
              <Eye className="w-3 h-3" />
              <span>{formatNumber(quote.statistic?.views)}</span>
            </div>
          </div>
          {/* 查看原文链接 */}
          <div className="ml-auto">
            <a
              href={`https://x.com/${quote.profile?.username}/status/${quote.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300 transition-colors text-xs flex items-center gap-1"
              onClick={(e) => e.stopPropagation()}
            >
              <span>Link</span>
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

interface DeletedTweetsSectionProps {
  deletedTweets: DeletedTweet[];
  loadingDel: boolean;
  isHoverPanel?: boolean;
}

export function DeletedTweetsSection({ deletedTweets = [], loadingDel, isHoverPanel = false }: DeletedTweetsSectionProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const { t } = useI18n();

  const formatNumber = (num: number | undefined) => {
    if (num === undefined || num === null) return '0';
    return numeral(num || 0).format('0.[0]a').toUpperCase();
  };

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return '';
    const date = dayjs(dateString);
    const now = dayjs();
    const hoursAgo = now.diff(date, 'hour');

    if (hoursAgo < 24) {
      return date.format('h:mm A');
    } else {
      return date.format('MMM D');
    }
  };

  // 处理点击事件
  const handleTweetClick = (tweet: DeletedTweet) => {
    // 调用 fetchDeletedStatus，不等待返回结果
    fetchDeletedStatus(tweet.id);
    // 跳转到帖子详情页
    window.open(`https://x.com/${tweet.profile?.username}/status/${tweet.id}`, '_blank');
  };

  // Sanitize HTML content to prevent XSS attacks and modify video tags
  const sanitizeHtml = (html: string | undefined): string => {
    if (!html) return '';

    try {
      // Create a temporary div to parse the HTML
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = html;

      // Remove all script tags
      const scripts = tempDiv.querySelectorAll('script');
      scripts.forEach(script => script.remove());

      // Remove all event handlers (onclick, onload, etc.)
      const allElements = tempDiv.querySelectorAll('*');
      allElements.forEach(el => {
        // Remove all attributes that start with "on"
        Array.from(el.attributes).forEach(attr => {
          if (attr.name.startsWith('on') || attr.name === 'href' && attr.value.startsWith('javascript:')) {
            el.removeAttribute(attr.name);
          }
        });
      });

      // Remove iframe tags
      const iframes = tempDiv.querySelectorAll('iframe');
      iframes.forEach(iframe => iframe.remove());

      // Remove object and embed tags
      const objects = tempDiv.querySelectorAll('object, embed');
      objects.forEach(obj => obj.remove());

      // Make all links open in a new tab and add noopener noreferrer
      const links = tempDiv.querySelectorAll('a');
      links.forEach(link => {
        link.setAttribute('target', '_blank');
        link.setAttribute('rel', 'noopener noreferrer');
      });

      // Modify video tags to prevent autoplay
      const videos = tempDiv.querySelectorAll('video');
      videos.forEach(video => {
        // Remove autoplay attribute
        video.removeAttribute('autoplay');
        // Add controls
        video.setAttribute('controls', '');
        // Set preload to none
        video.setAttribute('preload', 'none');
        // Add playsInline for mobile
        video.setAttribute('playsinline', '');

        // Add error handling for videos
        video.setAttribute('onerror', 'this.style.display="none"');

        // Add poster if available
        if (video.hasAttribute('poster') === false) {
          // Try to find a thumbnail from source elements
          const sources = video.querySelectorAll('source');
          if (sources.length > 0) {
            // Could set a default poster here if needed
          }
        }
      });

      return tempDiv.innerHTML;
    } catch (error) {
      console.log('Error sanitizing HTML:', error);
      return '';
    }
  };

  return (
    Boolean(deletedTweets?.length) && <div>
      {!isHoverPanel && <div
				className="p-3 flex items-center justify-between cursor-pointer theme-border"
				onClick={() => setIsExpanded(!isExpanded)}
			>
				<div className="flex items-center gap-2">
					<Trash2 className="w-4 h-4 text-red-400" />
					<h2 className="font-bold text-sm theme-text-primary">{t('deletedTweets')}</h2>
				</div>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 theme-text-secondary" />
        ) : (
          <ChevronDown className="w-4 h-4 theme-text-secondary" />
        )}
			</div>}

			<div className={`${isExpanded ? '' : 'h-0'} overflow-hidden transition-[height] duration-200`}>
				<div className="p-3 space-y-4">
          {loadingDel && <span className="block text-center text-xs theme-text-secondary">{t('loading')}</span>}
          {!deletedTweets?.length && !loadingDel &&
						<span className="block text-center text-xs theme-text-secondary">No data</span>}
          {!loadingDel && deletedTweets?.length ? deletedTweets.map(tweet => (
            <div 
              key={tweet?.id} 
              className="theme-bg-tertiary rounded-lg overflow-hidden cursor-pointer transition-colors"
              onClick={() => handleTweetClick(tweet)}
            >
              {/* Tweet Header */}
              <div className="p-3 flex items-start gap-3">
                {/* User Avatar */}
                <img
                  src={tweet.profile?.profile_image_url}
                  alt={tweet.profile?.name}
                  className="w-8 h-8 rounded-full"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://abs.twimg.com/sticky/default_profile_images/default_profile_400x400.png';
                  }}
                />

                {/* User Info and Tweet Content */}
                <div className="flex-1 min-w-0">
                  {/* User Info */}
                  <div className="flex items-center gap-1 mb-0.5">
                    <span className="font-bold text-sm theme-text-primary truncate">{tweet.profile?.name}</span>
                    {tweet.profile?.is_blue_verified && (
                      <svg className="w-4 h-4 text-[#1d9bf0]" viewBox="0 0 22 22" fill="currentColor">
                        <path d="M20.396 11c-.018-.646-.215-1.275-.57-1.816-.354-.54-.852-.972-1.438-1.246.223-.607.27-1.264.14-1.897-.131-.634-.437-1.218-.882-1.687-.47-.445-1.053-.75-1.687-.882-.633-.13-1.29-.083-1.897.14-.273-.587-.704-1.086-1.245-1.44S11.647 1.62 11 1.604c-.646.017-1.273.213-1.813.568s-.969.854-1.24 1.44c-.608-.223-1.267-.272-1.902-.14-.635.13-1.22.436-1.69.882-.445.47-.749 1.055-.878 1.688-.13.633-.08 1.29.144 1.896-.587.274-1.087.705-1.443 1.245-.356.54-.555 1.17-.574 1.817.02.647.218 1.276.574 1.817.356.54.856.972 1.443 1.245-.224.606-.274 1.263-.144 1.896.13.634.433 1.218.877 1.688.47.443 1.054.747 1.687.878.633.132 1.29.084 1.897-.136.274.586.705 1.084 1.246 1.439.54.354 1.17.551 1.816.569.647-.016 1.276-.213 1.817-.567s.972-.854 1.245-1.44c.604.239 1.266.296 1.903.164.636-.132 1.22-.447 1.68-.907.46-.46.776-1.044.908-1.681s.075-1.299-.165-1.903c.586-.274 1.084-.705 1.439-1.246.354-.54.551-1.17.569-1.816zM9.662 14.85l-3.429-3.428 1.293-1.302 2.072 2.072 4.4-4.794 1.347 1.246z"></path>
                      </svg>
                    )}
                    <span className="text-xs theme-text-secondary">@{tweet.profile?.username}</span>
                    <span className="text-xs theme-text-secondary">·</span>
                    <span className="text-xs theme-text-secondary">{formatDate(tweet.create_time)}</span>
                  </div>

                  {/* Tweet Content */}
                  <div className="text-sm theme-text-primary mb-2">
                    {tweet.info?.html ? (
                      <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(tweet.info.html) }} />
                    ) : (
                      <div>{tweet.text || <span className="italic text-gray-400">No content</span>}</div>
                    )}
                  </div>

                  {/* Quote Tweet */}
                  {tweet.quote_status && (
                    <QuoteTweet quote={tweet.quote_status} />
                  )}

                  {/* Tweet Stats */}
                  <div className="flex items-center justify-between theme-text-secondary text-xs pt-1">
                    <div className="flex items-center gap-1">
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>{formatNumber(tweet.statistic?.reply_count)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Repeat className="w-3.5 h-3.5" />
                      <span>{formatNumber(tweet.statistic?.retweet_count)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Heart className="w-3.5 h-3.5" />
                      <span>{formatNumber(tweet.statistic?.likes)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Eye className="w-3.5 h-3.5" />
                      <span>{formatNumber(tweet.statistic?.views)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Bookmark className="w-3.5 h-3.5" />
                      <span>{formatNumber(tweet.statistic?.bookmark_count)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )) : null}
				</div>
			</div>
		</div>
  );
}

export default {};
