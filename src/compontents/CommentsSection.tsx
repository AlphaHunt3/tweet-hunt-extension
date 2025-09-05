import React, { useState, useEffect } from 'react';
import { MessageSquare, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Star } from 'lucide-react';
import { Comment } from '~types/review';
import { useI18n } from '~contents/hooks/i18n.ts';
import { useLocalStorage } from '~storage/useLocalStorage.ts';
import { getHandleComments } from '~contents/services/review.ts';
import { useRequest } from 'ahooks';
import { getRatingColor } from './ReviewHeader';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

interface CommentsSectionProps {
  userId: string;
  initialCommentsCount?: number;
}

export function CommentsSection({ userId, initialCommentsCount = 0 }: CommentsSectionProps) {
  // 默认展开
  const [isExpanded, setIsExpanded] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [reviewOnlyKol] = useLocalStorage('@xhunt/reviewOnlyKol', true);
  const { t } = useI18n();
  // const [theme] = useLocalStorage('@xhunt/theme', 'dark');
  const [commentsCount, setCommentsCount] = useState(0);

  const { data, loading, run: fetchComments } = useRequest(
    () => getHandleComments(userId, currentPage, 5, reviewOnlyKol),
    {
      refreshDeps: [userId, currentPage, reviewOnlyKol],
      manual: true,
      debounceWait: 100,
      debounceMaxWait: 100,
    }
  );

  // 初始加载和页面变化时加载评论
  useEffect(() => {
    if (userId) {
      fetchComments();
    }
  }, [userId, currentPage, reviewOnlyKol]);

  // 更新实际评论数量
  useEffect(() => {
    if (data?.pagination?.totalComments !== undefined) {
      setCommentsCount(data.pagination.totalComments);
    }
  }, [data]);

  // // 如果没有评论，不显示此组件
  // if (loading && !data) {
  //   return (
  //     <div className="theme-border border-b">
  //       <div className="p-3 flex items-center justify-between">
  //         <div className="flex items-center gap-2">
  //           <MessageSquare className="w-4 h-4 text-blue-400" />
  //           <h2 className="font-bold text-sm theme-text-primary">{t('comments')}</h2>
  //           <div className="w-4 h-4 animate-pulse rounded-full bg-gray-500/30"></div>
  //         </div>
  //       </div>
  //     </div>
  //   );
  // }

  if (loading || !loading && (!data || data.pagination.totalComments === 0)) {
    return null;
  }

  return (
    <div className="theme-border border-b">
      <div
        className="p-3 flex items-center justify-between cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-blue-400" />
          <h2 className="font-bold text-sm theme-text-primary">{t('comments')}</h2>
          <span className="text-sm theme-text-secondary">({commentsCount})</span>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 theme-text-secondary" />
        ) : (
          <ChevronDown className="w-4 h-4 theme-text-secondary" />
        )}
      </div>

      <div className={`${isExpanded ? '' : 'h-0'} overflow-hidden transition-[height] duration-200`}>
        <div className="p-3 space-y-4">
          {loading ? (
            <div className="flex justify-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-400"></div>
            </div>
          ) : data?.comments && data.comments.length > 0 ? (
            <>
              {data.comments.map((comment) => (
                <CommentItem key={comment.id} comment={comment} />
              ))}

              {/* Pagination - 始终显示，只要有数据 */}
              <div className="flex items-center justify-center gap-2 pt-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentPage(prev => Math.max(1, prev - 1));
                  }}
                  disabled={!data.pagination.hasPrevPage}
                  className={`p-1 rounded-full ${
                    data.pagination.hasPrevPage 
                      ? 'theme-hover theme-text-primary' 
                      : 'opacity-50 cursor-not-allowed theme-text-secondary'
                  }`}
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <span className="text-xs theme-text-secondary">
                  {data.pagination.page} / {data.pagination.totalPages}
                </span>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentPage(prev => Math.min(data.pagination.totalPages, prev + 1));
                  }}
                  disabled={!data.pagination.hasNextPage}
                  className={`p-1 rounded-full ${
                    data.pagination.hasNextPage 
                      ? 'theme-hover theme-text-primary' 
                      : 'opacity-50 cursor-not-allowed theme-text-secondary'
                  }`}
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </>
          ) : (
            <div className="text-center py-4 theme-text-secondary text-sm">
              {t('noComments')}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function CommentItem({ comment }: { comment: Comment }) {
  const { t } = useI18n();
  const [isExpanded, setIsExpanded] = useState(false);

  // 使用 updatedAt 而不是 createdAt 来格式化日期
  const formattedDate = dayjs(comment.updatedAt).fromNow();

  // 检查评论是否超过3行（大约150个字符）
  const isLongComment = comment.comment.length > 150;

  return (
    <div className="theme-bg-tertiary rounded-lg p-3 space-y-2">
      {/* 评论者信息 */}
      <div className="flex items-center gap-2">
        <div className="relative">
          <img
            src={comment.reviewer.avatar}
            alt={comment.reviewer.displayName}
            className="w-8 h-8 rounded-full"
            onError={(e) => {
              (e.target as HTMLImageElement).src = 'https://abs.twimg.com/sticky/default_profile_images/default_profile_400x400.png';
            }}
          />
          {/*<div className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-green-400 rounded-full theme-border" />*/}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-1">
            <span className="font-medium text-sm theme-text-primary">{comment.reviewer.displayName}</span>
            {comment.reviewer.isKOL && (
              <span className="text-xs bg-blue-500/20 text-blue-400 px-1 rounded">KOL</span>
            )}
          </div>
          <div className="flex items-center gap-1 text-xs theme-text-secondary">
            <span>@{comment.reviewer.username}</span>
            <span>•</span>
            <span>{formattedDate}</span>
          </div>
        </div>
        <div className="flex items-center">
          <Star className={`w-4 h-4 ${getRatingColor(comment.rating)}`} />
          <span className={`ml-1 text-sm font-medium ${getRatingColor(comment.rating)}`}>
            {comment.rating.toFixed(1)}
          </span>
        </div>
      </div>

      {/* 标签 */}
      {comment.tags && comment.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {comment.tags.map((tag, index) => (
            <span
              key={index}
              className="px-2 py-0.5 rounded-full bg-blue-500/10 text-xs theme-text-primary"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* 评论内容 */}
      <div className="text-sm theme-text-primary">
        {isLongComment ? (
          <>
            <div className="whitespace-pre-wrap text-xs">
              {isExpanded
                ? comment.comment
                : `${comment.comment.substring(0, 150)}...`}
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsExpanded(!isExpanded);
              }}
              className="text-blue-400 text-xs mt-1 hover:underline"
            >
              {isExpanded ? t('showLess') : t('showMore')}
            </button>
          </>
        ) : (
          <div className="whitespace-pre-wrap text-xs">{comment.comment}</div>
        )}
      </div>
    </div>
  );
}
