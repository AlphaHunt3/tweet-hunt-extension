import React, { useState, useEffect } from 'react';
import { NewTwitterUserData } from '~types';
import { Loader2, ExternalLink, Calendar, MessageSquare, Link2, MapPin, Clock } from 'lucide-react';
import { useI18n } from '~contents/hooks/i18n.ts';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

interface ProfileChangesPanelProps {
  userId: string;
  profileHistoryData?: NewTwitterUserData | null;
}

export function ProfileChangesPanel({ userId, profileHistoryData }: ProfileChangesPanelProps) {
  const { t } = useI18n();
  const [expandedChanges, setExpandedChanges] = useState<Set<number>>(new Set());
  const [bannerLoadErrors, setBannerLoadErrors] = useState<Set<string>>(new Set());

  // Use passed data instead of fetching
  const data = profileHistoryData;
  const loading = !data;
  const error = null;

  // Function to highlight differences between two texts
  const highlightDiff = (oldText: string, newText: string) => {
    if (!oldText && !newText) return { oldHighlighted: '', newHighlighted: '' };
    if (!oldText) return { oldHighlighted: '', newHighlighted: newText };
    if (!newText) return { oldHighlighted: oldText, newHighlighted: '' };

    // Simple character-by-character diff
    let oldHighlighted = '';
    let newHighlighted = '';

    // Find the longest common prefix
    let i = 0;
    while (i < oldText.length && i < newText.length && oldText[i] === newText[i]) {
      i++;
    }

    // Find the longest common suffix
    let j = 0;
    while (
      j < oldText.length - i &&
      j < newText.length - i &&
      oldText[oldText.length - 1 - j] === newText[newText.length - 1 - j]
    ) {
      j++;
    }

    // Extract the common parts and the different parts
    const commonPrefix = oldText.substring(0, i);
    const commonSuffix = j > 0 ? oldText.substring(oldText.length - j) : '';

    const oldDiff = oldText.substring(i, oldText.length - j);
    const newDiff = newText.substring(i, newText.length - j);

    // Highlight the differences
    oldHighlighted = commonPrefix + (oldDiff ? `<span class="text-red-500 font-medium">${oldDiff}</span>` : '') + commonSuffix;
    newHighlighted = commonPrefix + (newDiff ? `<span class="text-green-500 font-medium">${newDiff}</span>` : '') + commonSuffix;

    return { oldHighlighted, newHighlighted };
  };

  // 初始化时展开所有变更
  useEffect(() => {
    if (data && data.profile_his && data.profile_his.history) {
      const profileHistory = data.profile_his.history;
      const sortedHistory = [...profileHistory].sort((a, b) => {
        return new Date(b.first_record).getTime() - new Date(a.first_record).getTime();
      });

      // 创建一个包含所有索引的集合
      const allIndices = new Set(sortedHistory.map((_, index) => index));
      setExpandedChanges(allIndices);
    }
  }, [data]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-16">
        <Loader2 className="w-5 h-5 text-blue-400 animate-spin mb-2" />
        <p className="text-xs theme-text-secondary">{t('loading')}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-16">
        <p className="text-xs theme-text-secondary">{t('errorLoadingData')}</p>
      </div>
    );
  }

  if (!data || !data.profile_his || !data.profile_his.history || data.profile_his.history.length <= 1) {
    return (
      <div className="flex items-center justify-center h-16">
        <p className="text-xs theme-text-secondary">{t('noDataAvailable')}</p>
      </div>
    );
  }

  const profileHistory = data.profile_his.history;

  // 按时间排序，最新的在前面
  const sortedHistory = [...profileHistory].sort((a, b) => {
    return new Date(b.first_record).getTime() - new Date(a.first_record).getTime();
  });

  // 获取相邻记录之间的变化
  const changes = sortedHistory.map((profile, index) => {
    if (index === sortedHistory.length - 1) {
      // 第一条记录，没有之前的记录可比较
      return {
        profile,
        changes: profile.changed_field,
        timestamp: profile.first_record,
        isFirst: true
      };
    }

    const prevProfile = sortedHistory[index + 1];
    const changedFields = profile.changed_field;

    return {
      profile,
      prevProfile,
      changes: changedFields,
      timestamp: profile.first_record,
      isFirst: false
    };
  });

  // 格式化日期
  const formatDate = (date: string) => {
    return dayjs(date).format('YYYY.MM.DD HH:mm');
  };

  // 获取相对时间
  const getRelativeTime = (date: string) => {
    return dayjs(date).fromNow();
  };

  // 获取字段显示名称
  const getFieldDisplayName = (field: string) => {
    const fieldMap: Record<string, string> = {
      'description': t('description') || 'Bio',
      'url': t('website') || 'Website',
      'profile_banner_url': t('banner') || 'Banner',
      'profile_image_url': t('avatar') || 'Avatar',
      'name': t('name') || 'Name',
      'location': t('location') || 'Location',
      'pinned_tweet_id': t('pinnedTweet') || 'Pinned Tweet',
      'protected': t('protected') || 'Protected',
      'verified': t('verified') || 'Verified',
      'is_blue_verified': t('blueVerified') || 'Blue Verified'
    };

    return fieldMap[field] || field;
  };

  // 切换展开/折叠状态
  const toggleExpand = (index: number) => {
    setExpandedChanges(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  // 处理banner加载错误
  const handleBannerError = (url: string) => {
    setBannerLoadErrors(prev => {
      const newSet = new Set(prev);
      newSet.add(url);
      return newSet;
    });
  };

  // 渲染字段变化
  const renderFieldChange = (field: string, current: any, previous: any) => {
    switch (field) {
      case 'description': {
        const { oldHighlighted, newHighlighted } = highlightDiff(
          previous?.description || '',
          current.description || ''
        );
        return (
          <div className="space-y-1">
            <div className="flex items-center gap-1">
              <MessageSquare className="w-3 h-3 theme-text-secondary" />
              <span className="text-xs font-medium theme-text-primary">{getFieldDisplayName(field)}</span>
            </div>
            <div className="text-xs theme-text-primary">
              <span className="text-xs opacity-70 mb-0.5 block">{t('原来')}:</span>
              <div className="bg-opacity-50 rounded p-1.5 theme-bg-tertiary">
                {previous?.description ? (
                  <span dangerouslySetInnerHTML={{ __html: oldHighlighted }}></span>
                ) : (
                  <span className="italic opacity-50">Empty</span>
                )}
              </div>
            </div>
            <div className="text-xs theme-text-primary mt-1">
              <span className="text-xs opacity-70 mb-0.5 block">{t('现在')}:</span>
              <div className="bg-opacity-50 rounded p-1.5 theme-bg-tertiary">
                {current.description ? (
                  <span dangerouslySetInnerHTML={{ __html: newHighlighted }}></span>
                ) : (
                  <span className="italic opacity-50">Empty</span>
                )}
              </div>
            </div>
          </div>
        );
      }

      case 'url': {
        const { oldHighlighted, newHighlighted } = highlightDiff(
          previous?.url || '',
          current.url || ''
        );
        return (
          <div className="space-y-1">
            <div className="flex items-center gap-1">
              <Link2 className="w-3 h-3 theme-text-secondary" />
              <span className="text-xs font-medium theme-text-primary">{getFieldDisplayName(field)}</span>
            </div>
            <div className="text-xs theme-text-primary">
              <span className="text-xs opacity-70 mb-0.5 block">{t('原来')}:</span>
              {previous?.url ? (
                <div className="bg-opacity-50 rounded p-1.5 theme-bg-tertiary">
                  <span dangerouslySetInnerHTML={{ __html: oldHighlighted }}></span>
                  <a
                    href={previous.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-1 inline-flex items-center text-blue-400 hover:underline"
                  >
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              ) : (
                <span className="italic opacity-50">{t('noWebsite')}</span>
              )}
            </div>
            <div className="text-xs theme-text-primary mt-1">
              <span className="text-xs opacity-70 mb-0.5 block">{t('现在')}:</span>
              {current.url ? (
                <div className="bg-opacity-50 rounded p-1.5 theme-bg-tertiary">
                  <span dangerouslySetInnerHTML={{ __html: newHighlighted }}></span>
                  <a
                    href={current.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-1 inline-flex items-center text-blue-400 hover:underline"
                  >
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              ) : (
                <span className="italic opacity-50">{t('noWebsite')}</span>
              )}
            </div>
          </div>
        );
      }

      case 'location': {
        const { oldHighlighted, newHighlighted } = highlightDiff(
          previous?.location || '',
          current.location || ''
        );
        return (
          <div className="space-y-1">
            <div className="flex items-center gap-1">
              <MapPin className="w-3 h-3 theme-text-secondary" />
              <span className="text-xs font-medium theme-text-primary">{getFieldDisplayName(field)}</span>
            </div>
            <div className="text-xs theme-text-primary">
              <span className="text-xs opacity-70 mb-0.5 block">{t('原来')}:</span>
              <div className="bg-opacity-50 rounded p-1.5 theme-bg-tertiary">
                {previous?.location ? (
                  <span dangerouslySetInnerHTML={{ __html: oldHighlighted }}></span>
                ) : (
                  <span className="italic opacity-50">{t('noLocation')}</span>
                )}
              </div>
            </div>
            <div className="text-xs theme-text-primary mt-1">
              <span className="text-xs opacity-70 mb-0.5 block">{t('现在')}:</span>
              <div className="bg-opacity-50 rounded p-1.5 theme-bg-tertiary">
                {current.location ? (
                  <span dangerouslySetInnerHTML={{ __html: newHighlighted }}></span>
                ) : (
                  <span className="italic opacity-50">{t('noLocation')}</span>
                )}
              </div>
            </div>
          </div>
        );
      }

      case 'profile_banner_url':
        return (
          <div className="space-y-1">
            <div className="flex items-center gap-1">
              <span className="text-xs font-medium theme-text-primary">{getFieldDisplayName(field)}</span>
            </div>
            <div className="text-xs theme-text-primary">
              <span className="text-xs opacity-70 mb-0.5 block">{t('原来')}:</span>
              <div className="text-xs theme-text-secondary break-all mb-2">
                {previous?.profile_banner_url || <span className="italic opacity-50">{t('noBanner')}</span>}
              </div>
              {previous?.profile_banner_url && (
                <div className="rounded-md overflow-hidden mt-1 border theme-border">
                  <img
                    src={previous.profile_banner_url}
                    alt="Previous Banner"
                    className="w-full h-24 object-cover"
                    onError={(e) => {
                      handleBannerError(previous.profile_banner_url);
                      (e.target as HTMLImageElement).style.display = 'none';
                      (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                    }}
                  />
                  <div className="p-2 text-xs theme-text-secondary italic hidden">
                    Banner image failed to load
                  </div>
                </div>
              )}
            </div>
            <div className="text-xs theme-text-primary mt-3">
              <span className="text-xs opacity-70 mb-0.5 block">{t('现在')}:</span>
              <div className="text-xs theme-text-secondary break-all mb-2">
                {current.profile_banner_url || <span className="italic opacity-50">{t('noBanner')}</span>}
              </div>
              {current.profile_banner_url && (
                <div className="rounded-md overflow-hidden mt-1 border theme-border">
                  <img
                    src={current.profile_banner_url}
                    alt="Banner"
                    className="w-full h-24 object-cover"
                    onError={(e) => {
                      handleBannerError(current.profile_banner_url);
                      (e.target as HTMLImageElement).style.display = 'none';
                      (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                    }}
                  />
                  <div className="p-2 text-xs theme-text-secondary italic hidden">
                    {t('bannerUpdated')}
                  </div>
                </div>
              )}
            </div>
          </div>
        );

      case 'profile_image_url':
        return (
          <div className="space-y-1">
            <div className="flex items-center gap-1">
              <span className="text-xs font-medium theme-text-primary">{getFieldDisplayName(field)}</span>
            </div>
            <div className="text-xs theme-text-primary">
              <span className="text-xs opacity-70 mb-0.5 block">{t('原来')}:</span>
              <div className="text-xs theme-text-secondary break-all mb-2">
                {previous?.profile_image_url || <span className="italic opacity-50">{t('noAvatar')}</span>}
              </div>
              {previous?.profile_image_url && (
                <div className="flex items-center gap-2">
                  <img
                    src={previous.profile_image_url}
                    alt="Previous Avatar"
                    className="w-12 h-12 rounded-full border theme-border object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                      (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                    }}
                  />
                  <span className="text-xs theme-text-secondary italic hidden">Image failed to load</span>
                </div>
              )}
            </div>
            <div className="text-xs theme-text-primary mt-1">
              <span className="text-xs opacity-70 mb-0.5 block">{t('现在')}:</span>
              <div className="text-xs theme-text-secondary break-all mb-2">
                {current.profile_image_url || <span className="italic opacity-50">{t('noAvatar')}</span>}
              </div>
              {current.profile_image_url && (
                <div className="flex items-center gap-2">
                  <img
                    src={current.profile_image_url}
                    alt="Current Avatar"
                    className="w-12 h-12 rounded-full border theme-border object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                      (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                    }}
                  />
                  <span className="text-xs theme-text-secondary italic hidden">Image failed to load</span>
                </div>
              )}
            </div>
          </div>
        );

      case 'name': {
        const { oldHighlighted, newHighlighted } = highlightDiff(
          previous?.name || '',
          current.name || ''
        );
        return (
          <div className="space-y-1">
            <div className="flex items-center gap-1">
              <span className="text-xs font-medium theme-text-primary">{getFieldDisplayName(field)}</span>
            </div>
            <div className="text-xs theme-text-primary">
              <span className="text-xs opacity-70 mb-0.5 block">{t('原来')}:</span>
              <div className="bg-opacity-50 rounded p-1.5 theme-bg-tertiary">
                {previous?.name ? (
                  <span dangerouslySetInnerHTML={{ __html: oldHighlighted }}></span>
                ) : (
                  <span className="italic opacity-50">Empty</span>
                )}
              </div>
            </div>
            <div className="text-xs theme-text-primary mt-1">
              <span className="text-xs opacity-70 mb-0.5 block">{t('现在')}:</span>
              <div className="bg-opacity-50 rounded p-1.5 theme-bg-tertiary">
                {current.name ? (
                  <span dangerouslySetInnerHTML={{ __html: newHighlighted }}></span>
                ) : (
                  <span className="italic opacity-50">Empty</span>
                )}
              </div>
            </div>
          </div>
        );
      }

      default:
        return (
          <div className="space-y-1">
            <div className="flex items-center gap-1">
              <span className="text-xs font-medium theme-text-primary">{getFieldDisplayName(field)}</span>
            </div>
            <div className="text-xs theme-text-secondary">
              <span>{t('changed')}</span>
            </div>
          </div>
        );
    }
  };

  // 过滤掉没有变更的记录
  const filteredChanges = changes.filter(change => change.changes && change.changes.length > 0);

  if (filteredChanges.length === 0) {
    return (
      <div className="flex items-center justify-center h-16">
        <p className="text-xs theme-text-secondary">{t('noDataAvailable')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-2 py-2">
      {filteredChanges.map((change, index) => {
        const isExpanded = expandedChanges.has(index);

        return (
          <div
            key={`${change.timestamp}-${index}`}
            className="theme-border overflow-hidden rounded-lg"
          >
            {/* Header - always visible */}
            <div
              className="p-2 flex items-center justify-between cursor-pointer theme-hover"
              onClick={() => toggleExpand(index)}
            >
              <div className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-purple-400" />
                <span className="text-xs theme-text-secondary">{getRelativeTime(change.timestamp)}</span>
              </div>

              <div className="flex items-center gap-1">
                <div className="px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 text-xs">
                  {change.changes.length} {change.changes.length === 1 ? t('change') : t('changes')}
                </div>
              </div>
            </div>

            {/* Expanded content */}
            {isExpanded && change.changes.length > 0 && (
              <div className="px-3 pb-3 pt-1 border-t theme-border">
                <div className="flex items-center gap-1 mb-2">
                  <Calendar className="w-3.5 h-3.5 text-gray-400" />
                  <span className="text-xs theme-text-secondary">{formatDate(change.timestamp)}</span>
                </div>

                <div className="space-y-3 mt-2">
                  {change.changes.map((field: string, fieldIndex: any) => (
                    <div key={`${field}-${fieldIndex}`} className="theme-bg-tertiary p-2">
                      {renderFieldChange(
                        field,
                        change.profile,
                        change.prevProfile ? change.prevProfile : null
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
