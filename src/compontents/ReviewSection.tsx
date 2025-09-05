import React, { useRef, useState } from 'react';
import { Loader2, Plus, Star, X } from 'lucide-react';
import { ReviewStats, UserInfo } from '~types/review.ts';
import { useInterceptShortcuts } from '~contents/hooks/useInterceptShortcuts.ts';
import { delHandeReviewInfo, postHandeReviewInfo } from '~contents/services/review.ts';
import { useRequest } from 'ahooks';
import { useGlobalTips } from '~compontents/area/GlobalTips.tsx';
import { calculateTagCharLength, windowGtag } from '~contents/utils';
import { useI18n } from '~contents/hooks/i18n.ts';

const PRESET_TAGS = {
  kol: [
    '投研', '二级', '套利', '打新', 'Meme',
    '段子手', '宏观', '空投', '美女', '科学家',
    '创业者', 'VC', '假冒账户', '诈骗犯', '黑名单',
    'degen', '鲸鱼', '钻石手', '车头', '大佬',
    '喊单', '反指', '舔狗', '抄袭', '镰刀', '纸手'
  ],
  project: [
    '团队豪华', '宏大叙事', '技术领先', '被反撸',
    '老鼠仓', '诈骗项目', '求拉盘'
  ]
} as const;

interface ReviewSectionProps {
  stats: ReviewStats | undefined | null;
  handler: string;
  toggle: () => void;
  refreshAsyncReviewInfo: () => Promise<ReviewStats | undefined>;
  refreshAsyncUserInfo: () => Promise<UserInfo | undefined>;
}

function _ReviewSection({
  handler,
  toggle,
  stats,
  refreshAsyncReviewInfo,
  refreshAsyncUserInfo
}: ReviewSectionProps) {
  const { t } = useI18n();
  const [rating, setRating] = useState(Number(stats?.currentUserReview?.rating || 0));
  const [hoverRating, setHoverRating] = useState(0);
  const [selectedTags, setSelectedTags] = useState<string[]>(stats?.currentUserReview?.tags || []);
  const [customTag, setCustomTag] = useState('');
  const [comment, setComment] = useState(stats?.currentUserReview?.comment || '');
  const activeCategory = stats?.isKol ? 'kol' : 'project';
  const [isAddingTag, setIsAddingTag] = useState(false);
  const [errorInfo, setErrorInfo] = useState('');
  const [, setTips] = useGlobalTips();
  const { runAsync: postHandeReviewInfoExec, loading: postReviewInfoLoading } = useRequest(postHandeReviewInfo, {
    debounceWait: 300,
    debounceLeading: true,
    debounceTrailing: false,
    manual: true,
  });

  const getRatingColor = (starRating: number, currentRating: number) => {
    if (starRating <= (Number(currentRating) + 0.5)) {
      if (currentRating <= 2.5) return 'text-red-400 fill-red-400';
      if (currentRating <= 3.5) return 'text-orange-400 fill-orange-400';
      if (currentRating <= 4.5) return 'text-yellow-400 fill-yellow-400';
      return 'text-green-400 fill-green-400';
    }
    return 'theme-text-secondary';
  };

  const handleSubmit = async () => {
    windowGtag('event', 'handleSubmit')
    if (!handler) {
      setErrorInfo(t('invalidHandler'));
      return;
    }

    try {
      setErrorInfo('');
      const handlerAvatarImg = document.querySelector('main [data-testid*="UserAvatar-Container"] img') as HTMLImageElement;
      const avatar = handlerAvatarImg?.src || '';
      const handlerNameInfoDiv = document.querySelector('main [data-testid=\'UserName\']') as HTMLDivElement;
      const handlerNameAllText = handlerNameInfoDiv?.textContent || '@';
      const [displayName] = handlerNameAllText.split('@');
      const xLink = window.location.origin + window.location.pathname;

      if (!rating || selectedTags.length === 0) {
        setErrorInfo(t('ratingAndTagsRequired'));
        return;
      }

      await postHandeReviewInfoExec({
        xLink,
        handle: handler,
        displayName: displayName.trim(),
        avatar,
        followers: 0,
        following: 0,
        rating,
        tags: (selectedTags || []).slice(0, 5),
        comment: comment || ''
      });

      setTips({
        text: t('reviewSubmitSuccess'),
        type: 'suc'
      });
      windowGtag('event', 'handleSubmitSuc', {
        value: `${handler} | ${rating} | ${JSON.stringify((selectedTags || []).slice(0, 5))}`
      })
      await refreshAsyncReviewInfo();
      await refreshAsyncUserInfo();
      toggle();
    } catch (err) {
      setErrorInfo(String(err));
      setTips({
        text: `${t('reviewSubmitFailed')}:${String(err)}`,
        type: 'fail'
      });
    }
  };

  const delReview = async () => {
    try {
      if (!handler) {
        setErrorInfo(t('invalidHandler'));
        return;
      }
      windowGtag('event', 'delReview')
      toggle();
      await delHandeReviewInfo(handler);
      await refreshAsyncReviewInfo();
      await refreshAsyncUserInfo();
      setTips({
        text: t('delReviewSuccess'),
        type: 'suc'
      });
    } catch (err) {
      setTips({
        text: `删除失败:${String(err)}`,
        type: 'fail'
      });
    }
  }

  const addCustomTag = () => {
    if (selectedTags && selectedTags?.length >= 5) return;
    const trimmedTag = customTag.trim();
    if (trimmedTag && !selectedTags.includes(trimmedTag)) {
      windowGtag('event', 'addCustomTag', {
        value: trimmedTag
      })
      setSelectedTags(prev => [...prev, trimmedTag]);
      setCustomTag('');
      setIsAddingTag(false);
    }
  };

  const removeTag = (tag: string) => {
    setSelectedTags(prev => prev.filter(t => t !== tag));
  };

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const inputAddRef = useRef<HTMLInputElement | null>(null);
  const currentInputRef = useRef<HTMLTextAreaElement | HTMLInputElement | null>(null);
  const isComposingRef = useRef<boolean>(false);
  useInterceptShortcuts(currentInputRef, isComposingRef);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    let result = '';
    let totalLength = 0;

    for (let i = 0; i < rawValue.length; i++) {
      const char = rawValue[i];
      const charLength = calculateTagCharLength(char);

      if (totalLength + charLength <= 30) {
        result += char;
        totalLength += charLength;
      } else {
        break;
      }
    }

    setCustomTag(result);
  };

  const handleStarHover = (starValue: number, isHalf: boolean) => {
    setHoverRating(isHalf ? starValue - 0.5 : starValue);
  };

  const handleStarClick = (starValue: number, isHalf: boolean) => {
    const newRating = isHalf ? starValue - 0.5 : starValue;
    setRating(rating === newRating ? 0 : newRating);
  };

  const handleMouseLeave = () => {
    setHoverRating(0);
  };

  const renderStar = (starValue: number) => {
    const displayRating = Number(hoverRating || rating);
    const isFullStar = starValue <= displayRating;
    const isHalfStar = !isFullStar && starValue - 0.5 <= displayRating;
    const colorClass = getRatingColor(starValue, displayRating);
    return (
      <div key={starValue} className="relative">
        {/* Left half (for half-star) */}
        <div
          className="absolute left-0 w-1/2 h-full cursor-pointer z-10"
          onMouseEnter={() => handleStarHover(starValue, true)}
          onClick={() => handleStarClick(starValue, true)}
        />
        {/* Right half (for full star) */}
        <div
          className="absolute right-0 w-1/2 h-full cursor-pointer z-10"
          onMouseEnter={() => handleStarHover(starValue, false)}
          onClick={() => handleStarClick(starValue, false)}
        />
        {/* Star icon */}
        {isHalfStar ? (
          <div className="relative">
            <Star className={`w-5 h-5 ${colorClass.replace('fill-', 'none-')} transition-all duration-200`} strokeWidth={1.5} />
            <div className="absolute inset-0 overflow-hidden w-1/2">
              <Star className={`w-5 h-5 ${colorClass} transition-all duration-200`} fill="currentColor" strokeWidth={1.5} />
            </div>
          </div>
        ) : (
          <Star
            className={`w-5 h-5 ${colorClass} transition-all duration-200`}
            strokeWidth={1.5}
            fill={isFullStar ? 'currentColor' : 'none'}
          />
        )}
      </div>
    );
  };

  if (!stats) return null;

  return <div className="p-3 space-y-4">
    {/* Star Rating */}
    <div
      className="flex items-center gap-1.5"
      onMouseLeave={handleMouseLeave}
    >
      {[1, 2, 3, 4, 5].map((star) => renderStar(star))}
      {(rating > 0 || hoverRating > 0) && (
        <span className={`ml-2 text-sm font-medium ${getRatingColor(1, Number(hoverRating || rating))}`}>
          {Number(hoverRating || rating).toFixed(1)}
        </span>
      )}
    </div>

    {/* Tags */}
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {selectedTags.map((tag) => (
          <span
            key={tag}
            className="theme-text-primary inline-flex items-center gap-1 px-2 py-1 rounded-full bg-[#1d9bf0]/10 text-xs"
          >
            {tag}
            <button
              onClick={() => removeTag(tag)}
              className="hover:text-red-400 transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
        {!isAddingTag && (
          <button
            disabled={selectedTags?.length >= 5}
            onClick={() => setIsAddingTag(true)}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-full border border-dashed border-[#1d9bf0]/30 theme-text-primary hover:border-[#1d9bf0] text-xs transition-colors"
          >
            <Plus className="w-3 h-3" />
            {t('addTag')}
          </button>
        )}
      </div>

      {isAddingTag && (
        <div className="flex items-center gap-2">
          <input
            maxLength={20}
            ref={inputAddRef}
            type="text"
            value={customTag}
            onFocus={() => {
              currentInputRef.current = inputAddRef.current;
              setErrorInfo('');
            }}
            onBlur={() => {
              currentInputRef.current = null;
            }}
            onCompositionStart={() => {
              isComposingRef.current = true;
            }}
            onCompositionEnd={() => {
              isComposingRef.current = false;
            }}
            onChange={handleInputChange}
            placeholder={t('customTag')}
            className="theme-text-primary flex-1 px-2 py-1 rounded bg-[#1d9bf0]/10 border border-[#1d9bf0]/30 text-xs focus:outline-none focus:ring-1 focus:ring-[#1d9bf0] placeholder-gray-400"
          />
          <button
            disabled={selectedTags?.length >= 5}
            onClick={addCustomTag}
            className="whitespace-nowrap px-2 py-1 rounded bg-[#1d9bf0] text-white text-xs hover:bg-[#1a8cd8] transition-colors"
          >
            {t('add')}
          </button>
          <button
            onClick={() => setIsAddingTag(false)}
            className="p-1 theme-text-secondary hover:theme-text-primary"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Preset Tags */}
      <div className="flex flex-wrap gap-2 border-t theme-border pt-2">
        {((stats?.defaultTags || PRESET_TAGS)[activeCategory]).map((tag: string) => {
          const isTagIncluded = selectedTags.includes(tag);
          return <button
            key={tag}
            onClick={() => {
              if (selectedTags.length >= 5) {
                setErrorInfo(t('maxTagsError'));
                return;
              }
              if (!isTagIncluded) {
                setSelectedTags(prev => [...prev, tag]);
              }
            }}
            disabled={isTagIncluded}
            className={`px-2 py-1 rounded-full text-xs transition-colors ${
              isTagIncluded
                ? 'bg-[#1d9bf0]/5 theme-text-secondary cursor-not-allowed'
                : 'bg-[#1d9bf0]/10 hover:bg-[#1d9bf0]/20 theme-text-primary'
            }`}
            style={stats?.defaultTags?.colorTags?.[tag] ? {
              color: stats?.defaultTags?.colorTags?.[tag]?.color,
              background: stats?.defaultTags?.colorTags?.[tag]?.bg,
              opacity: isTagIncluded ? 0.5 : 1
            } : {}}
          >
            {tag}
          </button>
        })}
      </div>
    </div>

    {/*comment */}
    <textarea
      maxLength={200}
      ref={textareaRef}
      value={comment}
      onFocus={() => {
        currentInputRef.current = textareaRef.current;
        setErrorInfo('');
      }}
      onBlur={() => {
        currentInputRef.current = null;
      }}
      onChange={(e) => {
        setComment(String(e.target.value).slice(0, 300));
      }}
      onCompositionStart={() => {
        isComposingRef.current = true;
      }}
      onCompositionEnd={() => {
        isComposingRef.current = false;
      }}
      placeholder={t('commentPlaceholder')}
      className="theme-text-primary w-full h-24 px-3 py-2 rounded bg-[#1d9bf0]/10 border border-[#1d9bf0]/30 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-[#1d9bf0] placeholder-gray-400"
    />

    <button
      onClick={handleSubmit}
      disabled={!rating || selectedTags.length === 0 || postReviewInfoLoading}
      className="w-full py-2 rounded text-white text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-[#1d9bf0] hover:bg-[#1a8cd8]"
    >
      {postReviewInfoLoading && <Loader2 className="inline-block animate-spin h-4 w-4 mr-2" />}
      {stats?.currentUserReview ? t('modifyReview') : t('submitReview')}
    </button>

    {stats?.currentUserReview && (
      <button
        onClick={delReview}
        type="button"
        className="w-full py-1 text-sm font-medium text-red-500 transition-colors hover:text-red-700 focus:outline-none"
      >
        {t('delReview')}
      </button>
    )}
    {errorInfo &&
			<div className={'text-red-500 text-sm font-medium text-left w-full whitespace-normal transform -translate-y-2 mx-auto'}>{errorInfo}</div>}
  </div>;
}

export const ReviewSection = React.memo(_ReviewSection);
