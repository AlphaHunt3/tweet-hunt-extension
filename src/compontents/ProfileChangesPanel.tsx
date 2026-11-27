import React, { useState, useEffect } from 'react';
import {
  Loader2,
  ExternalLink,
  Calendar,
  MessageSquare,
  Link2,
  MapPin,
  Clock,
  ImageOff,
} from 'lucide-react';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { useI18n } from '~contents/hooks/i18n.ts';
import type { NewTwitterUserData } from '~types';
import { diffText, type TextDiffPart } from '~utils/textDiff';

dayjs.extend(relativeTime);

interface ProfileChangesPanelProps {
  userId: string;
  profileHistoryData?: NewTwitterUserData | null;
  loading?: boolean;
}

function DiffLine({
  parts,
  version,
}: {
  parts: TextDiffPart[];
  version: 'before' | 'after';
}) {
  return parts.map((part, index) => {
    if (
      (version === 'before' && part.kind === 'insert') ||
      (version === 'after' && part.kind === 'delete')
    ) {
      return null;
    }

    if (part.kind === 'equal') {
      return (
        <React.Fragment key={`${part.kind}-${index}`}>
          {part.text}
        </React.Fragment>
      );
    }

    const isWhitespaceOnly = /^\s+$/u.test(part.text);
    const visibleText = isWhitespaceOnly
      ? part.text
          .replace(/\r\n?/g, '\n')
          .replace(/\u00a0/g, '⍽')
          .replace(/ /g, '␠')
          .replace(/\t/g, '⇥')
          .replace(/\n/g, '↵\n')
      : part.text;

    return (
      <span
        key={`${part.kind}-${index}`}
        className={
          part.kind === 'delete'
            ? `text-red-500 font-medium ${
                isWhitespaceOnly ? 'rounded-sm bg-red-500/10 px-0.5' : ''
              }`
            : `text-green-500 font-medium ${
                isWhitespaceOnly ? 'rounded-sm bg-green-500/10 px-0.5' : ''
              }`
        }
      >
        {visibleText}
      </span>
    );
  });
}

function httpsImageUrl(value: unknown) {
  return typeof value === 'string' && value.startsWith('https://')
    ? value
    : null;
}

function profileImageUrls(record: any, field: string) {
  if (!record) return [];

  const primaryUrl = httpsImageUrl(record[field]);
  const backup = record[field.replace(/_url$/, '_backup')];
  const backupUrls =
    backup && typeof backup === 'object' && !Array.isArray(backup)
      ? [httpsImageUrl(backup.source_url), httpsImageUrl(backup.url)]
      : [];

  return [primaryUrl, ...backupUrls].filter(
    (url, index, values): url is string =>
      Boolean(url) && values.indexOf(url) === index,
  );
}

function ProfileHistoryImage({
  urls,
  alt,
  className,
  emptyFallback,
  errorFallback,
}: {
  urls: string[];
  alt: string;
  className: string;
  emptyFallback: React.ReactNode;
  errorFallback: React.ReactNode;
}) {
  const [urlIndex, setUrlIndex] = useState(0);
  const url = urls[urlIndex];

  if (!url) {
    return <>{urls.length > 0 ? errorFallback : emptyFallback}</>;
  }

  return (
    <img
      key={url}
      src={url}
      alt={alt}
      className={className}
      onError={() => setUrlIndex((index) => index + 1)}
    />
  );
}

export function ProfileChangesPanel({
  userId,
  profileHistoryData,
  loading: loadingProp,
}: ProfileChangesPanelProps) {
  const { t, lang } = useI18n();
  const [expandedChanges, setExpandedChanges] = useState<Set<number>>(
    new Set()
  );

  // Use passed data instead of fetching
  const data = profileHistoryData;
  const loading = typeof loadingProp === 'boolean' ? loadingProp : !data;
  const error = null;

  // 初始化时展开所有变更
  useEffect(() => {
    if (data && data.profile_his && data.profile_his.history) {
      const profileHistory = data.profile_his.history;
      const sortedHistory = [...profileHistory].sort((a, b) => {
        return (
          new Date(b.first_record).getTime() -
          new Date(a.first_record).getTime()
        );
      });

      // 创建一个包含所有索引的集合
      const allIndices = new Set(sortedHistory.map((_, index) => index));
      setExpandedChanges(allIndices);
    }
  }, [data]);

  if (loading) {
    return (
      <div className='flex flex-col items-center justify-center h-16'>
        <Loader2 className='w-5 h-5 text-blue-400 animate-spin mb-2' />
        <p className='text-xs theme-text-secondary'>{t('loading')}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className='flex items-center justify-center h-16'>
        <p className='text-xs theme-text-secondary'>{t('errorLoadingData')}</p>
      </div>
    );
  }

  if (
    !data ||
    !data.profile_his ||
    !data.profile_his.history ||
    data.profile_his.history.length <= 1
  ) {
    return (
      <div className='flex items-center justify-center h-16'>
        <p className='text-xs theme-text-secondary'>{t('noDataAvailable')}</p>
      </div>
    );
  }

  const profileHistory = data.profile_his.history;

  // 按时间排序，最新的在前面
  const sortedHistory = [...profileHistory].sort((a, b) => {
    return (
      new Date(b.first_record).getTime() - new Date(a.first_record).getTime()
    );
  });

  // 获取相邻记录之间的变化
  const changes = sortedHistory.map((profile, index) => {
    if (index === sortedHistory.length - 1) {
      // 第一条记录，没有之前的记录可比较
      return {
        profile,
        changes: profile.changed_field,
        timestamp: profile.first_record,
        isFirst: true,
      };
    }

    const prevProfile = sortedHistory[index + 1];
    const changedFields = profile.changed_field;

    return {
      profile,
      prevProfile,
      changes: changedFields,
      timestamp: profile.first_record,
      isFirst: false,
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
      description: t('description') || 'Bio',
      url: t('website') || 'Website',
      profile_banner_url: t('banner') || 'Banner',
      profile_image_url: t('avatar') || 'Avatar',
      name: t('name') || 'Name',
      location: t('location') || 'Location',
      pinned_tweet_id: t('pinnedTweet') || 'Pinned Tweet',
      protected: t('protected') || 'Protected',
      verified: t('verified') || 'Verified',
      is_blue_verified: t('blueVerified') || 'Blue Verified',
      username: t('handler') || 'Handler',
    };

    return fieldMap[field] || field;
  };

  // 切换展开/折叠状态
  const toggleExpand = (index: number) => {
    setExpandedChanges((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  // 渲染字段变化
  const renderFieldChange = (field: string, current: any, previous: any) => {
    switch (field) {
      case 'description': {
        const parts = diffText(
          (previous?.description || '').replaceAll('\\n', '\n'),
          (current.description || '').replaceAll('\\n', '\n'),
          lang,
        );
        return (
          <div className='space-y-1'>
            <div className='flex items-center gap-1'>
              <MessageSquare className='w-3 h-3 theme-text-secondary' />
              <span className='text-xs font-medium theme-text-primary'>
                {getFieldDisplayName(field)}
              </span>
            </div>
            <div className='text-xs theme-text-primary'>
              <span className='text-xs opacity-70 mb-0.5 block'>
                {t('原来')}:
              </span>
              <div className='bg-opacity-50 rounded p-1.5 theme-bg-tertiary'>
                {previous?.description ? (
                  <span className='whitespace-pre-wrap break-words'>
                    <DiffLine parts={parts} version='before' />
                  </span>
                ) : (
                  <span className='italic opacity-50'>Empty</span>
                )}
              </div>
            </div>
            <div className='text-xs theme-text-primary mt-1'>
              <span className='text-xs opacity-70 mb-0.5 block'>
                {t('现在')}:
              </span>
              <div className='bg-opacity-50 rounded p-1.5 theme-bg-tertiary'>
                {current.description ? (
                  <span className='whitespace-pre-wrap break-words'>
                    <DiffLine parts={parts} version='after' />
                  </span>
                ) : (
                  <span className='italic opacity-50'>Empty</span>
                )}
              </div>
            </div>
          </div>
        );
      }

      case 'url': {
        const parts = diffText(
          previous?.url || '',
          current.url || '',
          lang,
        );
        return (
          <div className='space-y-1'>
            <div className='flex items-center gap-1'>
              <Link2 className='w-3 h-3 theme-text-secondary' />
              <span className='text-xs font-medium theme-text-primary'>
                {getFieldDisplayName(field)}
              </span>
            </div>
            <div className='text-xs theme-text-primary'>
              <span className='text-xs opacity-70 mb-0.5 block'>
                {t('原来')}:
              </span>
              {previous?.url ? (
                <div className='bg-opacity-50 rounded p-1.5 theme-bg-tertiary'>
                  <span className='whitespace-pre-wrap break-words'>
                    <DiffLine parts={parts} version='before' />
                  </span>
                  <a
                    href={previous.url}
                    target='_blank'
                    rel='noopener noreferrer'
                    className='ml-1 inline-flex items-center text-blue-400 hover:underline'
                  >
                    <ExternalLink className='w-3 h-3' />
                  </a>
                </div>
              ) : (
                <span className='italic opacity-50'>{t('noWebsite')}</span>
              )}
            </div>
            <div className='text-xs theme-text-primary mt-1'>
              <span className='text-xs opacity-70 mb-0.5 block'>
                {t('现在')}:
              </span>
              {current.url ? (
                <div className='bg-opacity-50 rounded p-1.5 theme-bg-tertiary'>
                  <span className='whitespace-pre-wrap break-words'>
                    <DiffLine parts={parts} version='after' />
                  </span>
                  <a
                    href={current.url}
                    target='_blank'
                    rel='noopener noreferrer'
                    className='ml-1 inline-flex items-center text-blue-400 hover:underline'
                  >
                    <ExternalLink className='w-3 h-3' />
                  </a>
                </div>
              ) : (
                <span className='italic opacity-50'>{t('noWebsite')}</span>
              )}
            </div>
          </div>
        );
      }

      case 'location': {
        const parts = diffText(
          previous?.location || '',
          current.location || '',
          lang,
        );
        return (
          <div className='space-y-1'>
            <div className='flex items-center gap-1'>
              <MapPin className='w-3 h-3 theme-text-secondary' />
              <span className='text-xs font-medium theme-text-primary'>
                {getFieldDisplayName(field)}
              </span>
            </div>
            <div className='text-xs theme-text-primary'>
              <span className='text-xs opacity-70 mb-0.5 block'>
                {t('原来')}:
              </span>
              <div className='bg-opacity-50 rounded p-1.5 theme-bg-tertiary'>
                {previous?.location ? (
                  <span className='whitespace-pre-wrap break-words'>
                    <DiffLine parts={parts} version='before' />
                  </span>
                ) : (
                  <span className='italic opacity-50'>{t('noLocation')}</span>
                )}
              </div>
            </div>
            <div className='text-xs theme-text-primary mt-1'>
              <span className='text-xs opacity-70 mb-0.5 block'>
                {t('现在')}:
              </span>
              <div className='bg-opacity-50 rounded p-1.5 theme-bg-tertiary'>
                {current.location ? (
                  <span className='whitespace-pre-wrap break-words'>
                    <DiffLine parts={parts} version='after' />
                  </span>
                ) : (
                  <span className='italic opacity-50'>{t('noLocation')}</span>
                )}
              </div>
            </div>
          </div>
        );
      }

      case 'profile_banner_url': {
        const previousUrls = profileImageUrls(previous, field);
        const currentUrls = profileImageUrls(current, field);
        return (
          <div className='space-y-1'>
            <div className='flex items-center gap-1'>
              <span className='text-xs font-medium theme-text-primary'>
                {getFieldDisplayName(field)}
              </span>
            </div>
            <div className='text-xs theme-text-primary'>
              <span className='text-xs opacity-70 mb-0.5 block'>
                {t('原来')}:
              </span>
              <div className='rounded-md overflow-hidden mt-1 border theme-border'>
                <ProfileHistoryImage
                  key={previousUrls.join('|')}
                  urls={previousUrls}
                  alt={`${t('原来')} ${getFieldDisplayName(field)}`}
                  className='w-full h-24 object-cover'
                  emptyFallback={
                    <div className='p-2 text-xs theme-text-secondary italic'>
                      {t('noBanner')}
                    </div>
                  }
                  errorFallback={
                    <div className='flex h-24 w-full items-center justify-center theme-bg-secondary'>
                      <ImageOff
                        aria-hidden='true'
                        className='h-7 w-7 theme-text-tertiary'
                      />
                    </div>
                  }
                />
              </div>
            </div>
            <div className='text-xs theme-text-primary mt-3'>
              <span className='text-xs opacity-70 mb-0.5 block'>
                {t('现在')}:
              </span>
              <div className='rounded-md overflow-hidden mt-1 border theme-border'>
                <ProfileHistoryImage
                  key={currentUrls.join('|')}
                  urls={currentUrls}
                  alt={`${t('现在')} ${getFieldDisplayName(field)}`}
                  className='w-full h-24 object-cover'
                  emptyFallback={
                    <div className='p-2 text-xs theme-text-secondary italic'>
                      {t('noBanner')}
                    </div>
                  }
                  errorFallback={
                    <div className='flex h-24 w-full items-center justify-center theme-bg-secondary'>
                      <ImageOff
                        aria-hidden='true'
                        className='h-7 w-7 theme-text-tertiary'
                      />
                    </div>
                  }
                />
              </div>
            </div>
          </div>
        );
      }

      case 'profile_image_url': {
        const previousUrls = profileImageUrls(previous, field);
        const currentUrls = profileImageUrls(current, field);
        return (
          <div className='space-y-1'>
            <div className='flex items-center gap-1'>
              <span className='text-xs font-medium theme-text-primary'>
                {getFieldDisplayName(field)}
              </span>
            </div>
            <div className='text-xs theme-text-primary'>
              <span className='text-xs opacity-70 mb-0.5 block'>
                {t('原来')}:
              </span>
              <div className='flex items-center gap-2'>
                <ProfileHistoryImage
                  key={previousUrls.join('|')}
                  urls={previousUrls}
                  alt={`${t('原来')} ${getFieldDisplayName(field)}`}
                  className='w-12 h-12 rounded-full border theme-border object-cover'
                  emptyFallback={
                    <span className='italic opacity-50'>{t('noAvatar')}</span>
                  }
                  errorFallback={
                    <div className='flex h-12 w-12 items-center justify-center rounded-full border theme-border theme-bg-secondary'>
                      <ImageOff
                        aria-hidden='true'
                        className='h-6 w-6 theme-text-tertiary'
                      />
                    </div>
                  }
                />
              </div>
            </div>
            <div className='text-xs theme-text-primary mt-1'>
              <span className='text-xs opacity-70 mb-0.5 block'>
                {t('现在')}:
              </span>
              <div className='flex items-center gap-2'>
                <ProfileHistoryImage
                  key={currentUrls.join('|')}
                  urls={currentUrls}
                  alt={`${t('现在')} ${getFieldDisplayName(field)}`}
                  className='w-12 h-12 rounded-full border theme-border object-cover'
                  emptyFallback={
                    <span className='italic opacity-50'>{t('noAvatar')}</span>
                  }
                  errorFallback={
                    <div className='flex h-12 w-12 items-center justify-center rounded-full border theme-border theme-bg-secondary'>
                      <ImageOff
                        aria-hidden='true'
                        className='h-6 w-6 theme-text-tertiary'
                      />
                    </div>
                  }
                />
              </div>
            </div>
          </div>
        );
      }

      case 'name': {
        const parts = diffText(
          previous?.name || '',
          current.name || '',
          lang,
        );
        return (
          <div className='space-y-1'>
            <div className='flex items-center gap-1'>
              <span className='text-xs font-medium theme-text-primary'>
                {getFieldDisplayName(field)}
              </span>
            </div>
            <div className='text-xs theme-text-primary'>
              <span className='text-xs opacity-70 mb-0.5 block'>
                {t('原来')}:
              </span>
              <div className='bg-opacity-50 rounded p-1.5 theme-bg-tertiary'>
                {previous?.name ? (
                  <span className='whitespace-pre-wrap break-words'>
                    <DiffLine parts={parts} version='before' />
                  </span>
                ) : (
                  <span className='italic opacity-50'>Empty</span>
                )}
              </div>
            </div>
            <div className='text-xs theme-text-primary mt-1'>
              <span className='text-xs opacity-70 mb-0.5 block'>
                {t('现在')}:
              </span>
              <div className='bg-opacity-50 rounded p-1.5 theme-bg-tertiary'>
                {current.name ? (
                  <span className='whitespace-pre-wrap break-words'>
                    <DiffLine parts={parts} version='after' />
                  </span>
                ) : (
                  <span className='italic opacity-50'>Empty</span>
                )}
              </div>
            </div>
          </div>
        );
      }

      case 'username': {
        const parts = diffText(
          previous?.username || '',
          current.username || '',
          lang,
        );
        return (
          <div className='space-y-1'>
            <div className='flex items-center gap-1'>
              <span className='text-xs font-medium theme-text-primary'>
                {getFieldDisplayName(field)}
              </span>
            </div>
            <div className='text-xs theme-text-primary'>
              <span className='text-xs opacity-70 mb-0.5 block'>
                {t('原来')}:
              </span>
              <div className='bg-opacity-50 rounded p-1.5 theme-bg-tertiary'>
                {previous?.username ? (
                  <span className='whitespace-pre-wrap break-words'>
                    <DiffLine parts={parts} version='before' />
                  </span>
                ) : (
                  <span className='italic opacity-50'>Empty</span>
                )}
              </div>
            </div>
            <div className='text-xs theme-text-primary mt-1'>
              <span className='text-xs opacity-70 mb-0.5 block'>
                {t('现在')}:
              </span>
              <div className='bg-opacity-50 rounded p-1.5 theme-bg-tertiary'>
                {current.username ? (
                  <span className='whitespace-pre-wrap break-words'>
                    <DiffLine parts={parts} version='after' />
                  </span>
                ) : (
                  <span className='italic opacity-50'>Empty</span>
                )}
              </div>
            </div>
          </div>
        );
      }

      default:
        return (
          <div className='space-y-1'>
            <div className='flex items-center gap-1'>
              <span className='text-xs font-medium theme-text-primary'>
                {getFieldDisplayName(field)}
              </span>
            </div>
            <div className='text-xs theme-text-secondary'>
              <span>{t('changed')}</span>
            </div>
          </div>
        );
    }
  };

  // 过滤掉没有变更的记录
  const filteredChanges = changes.filter(
    (change) => change.changes && change.changes.length > 0
  );

  if (filteredChanges.length === 0) {
    return (
      <div className='flex items-center justify-center h-16'>
        <p className='text-xs theme-text-secondary'>{t('noDataAvailable')}</p>
      </div>
    );
  }

  return (
    <div className='space-y-2 py-2'>
      {filteredChanges.map((change, index) => {
        const isExpanded = expandedChanges.has(index);

        return (
          <div
            key={`${change.timestamp}-${index}`}
            className='theme-border overflow-hidden rounded-lg'
          >
            {/* Header - always visible */}
            <div
              className='p-2 flex items-center justify-between cursor-pointer theme-hover'
              onClick={() => toggleExpand(index)}
            >
              <div className='flex items-center gap-1'>
                <Clock className='w-3.5 h-3.5 text-purple-400' />
                <span className='text-xs theme-text-secondary'>
                  {getRelativeTime(change.timestamp)}
                </span>
              </div>

              <div className='flex items-center gap-1'>
                <div className='px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 text-xs'>
                  {change.changes.length}{' '}
                  {change.changes.length === 1 ? t('change') : t('changes')}
                </div>
              </div>
            </div>

            {/* Expanded content */}
            {isExpanded && change.changes.length > 0 && (
              <div className='px-3 pb-3 pt-1 border-t theme-border'>
                <div className='flex items-center gap-1 mb-2'>
                  <Calendar className='w-3.5 h-3.5 text-gray-400' />
                  <span className='text-xs theme-text-secondary'>
                    {formatDate(change.timestamp)}
                  </span>
                </div>

                <div className='space-y-3 mt-2'>
                  {change.changes.map((field: string, fieldIndex: any) => (
                    <div
                      key={`${field}-${fieldIndex}`}
                      className='theme-bg-tertiary p-2'
                    >
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
