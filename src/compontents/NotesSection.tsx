import React, { useEffect, useRef, useState } from 'react';
import { StickyNote, Loader2 } from 'lucide-react';
import { useRequest, useLockFn } from 'ahooks';
import { getUserNote, saveUserNote } from '~contents/services/notes.ts';
import { useI18n } from '~contents/hooks/i18n.ts';
import { useLocalStorage } from '~storage/useLocalStorage.ts';
import { useGlobalTips } from '~compontents/area/GlobalTips.tsx';
import { useInterceptShortcuts } from '~contents/hooks/useInterceptShortcuts.ts';
import { getTwitterAuthUrl } from '~contents/services/api.ts';
import { openNewTab } from '~contents/utils';
import ErrorBoundary from '~/compontents/ErrorBoundary.tsx';
import { FloatingContainer, FloatingContainerRef } from './FloatingContainer';
import { officialTagsManager } from '~/utils/officialTagsManager.ts';
import { ReviewStats } from '~types/review.ts';
import { useCrossPageSettings } from '~utils/settingsManager.ts';
import useCurrentUrl from '~contents/hooks/useCurrentUrl';
import useWaitForElement from '~contents/hooks/useWaitForElement';

interface NotesSectionProps {
  userId: string;
  twitterId?: string | number | null;
  reviewInfo: ReviewStats | undefined | null;
}

function _NotesSection({ userId, twitterId, reviewInfo }: NotesSectionProps) {
  const { t, lang } = useI18n();
  const { isEnabled } = useCrossPageSettings();
  const [token] = useLocalStorage('@xhunt/token', '');
  const [theme] = useLocalStorage('@xhunt/theme', 'dark');
  const [, setTips] = useGlobalTips();
  const [noteText, setNoteText] = useState('');
  const [displayNote, setDisplayNote] = useState(''); // 用于显示的备注
  const [originalNote, setOriginalNote] = useState('');
  const [officialTags, setOfficialTags] = useState<string[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const currentInputRef = useRef<HTMLTextAreaElement | HTMLInputElement | null>(
    null
  );
  const isComposingRef = useRef<boolean>(false);
  const targetRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<FloatingContainerRef>(null);
  const loginContainerRef = useRef<FloatingContainerRef>(null);

  const calcDisplayNote = displayNote || reviewInfo?.currentUserReview?.note;

  useInterceptShortcuts(currentInputRef, isComposingRef);

  // 检测是否为个人主页（存在“编辑个人资料”按钮）
  const currentUrl = useCurrentUrl();
  const editProfileButtonEl = useWaitForElement(
    'main a[data-testid="editProfileButton"]',
    [currentUrl]
  );

  // 获取官方标签 - 使用当前语言
  useEffect(() => {
    let mounted = true;
    const run = async () => {
      try {
        await officialTagsManager.init();
        const tags = officialTagsManager.getUserTags(
          userId,
          lang as 'zh' | 'en',
          twitterId == null ? null : String(twitterId)
        );
        if (mounted) setOfficialTags(tags || []);
      } catch {
        if (mounted) setOfficialTags([]);
      }
    };
    if (userId) run();
    return () => {
      mounted = false;
    };
  }, [userId, twitterId, lang]);

  const {
    data: userNote,
    run: fetchNote,
    loading: loadingNote,
  } = useRequest(() => getUserNote(userId), {
    manual: true,
    refreshDeps: [userId, token],
  });

  const { run: saveNote, loading: savingNote } = useRequest(saveUserNote, {
    manual: true,
    onSuccess: () => {
      setTips({
        text: t('noteSaveSuccess'),
        type: 'suc',
      });
      containerRef.current?.hide();
      setOriginalNote(noteText);
      setDisplayNote(noteText); // 保存成功后更新显示
      fetchNote();
    },
    onError: (error) => {
      setTips({
        text: `${t('noteSaveFailed')}: ${error}`,
        type: 'fail',
      });
    },
  });

  const onLoginClick = useLockFn(async () => {
    const ret = await getTwitterAuthUrl();
    if (ret?.url) {
      openNewTab(ret.url);
      loginContainerRef.current?.hide();
    }
  });

  useEffect(() => {
    if (userId && token) {
      fetchNote();
    }
  }, [userId, token]);

  useEffect(() => {
    if (userNote?.note) {
      setNoteText(userNote.note);
      setOriginalNote(userNote.note);
      setDisplayNote(userNote.note); // 初始化显示
    } else {
      setNoteText('');
      setOriginalNote('');
      setDisplayNote(''); // 初始化显示
    }
  }, [userNote]);

  const handleEdit = () => {
    if (!token) {
      loginContainerRef.current?.show();
      return;
    }
    containerRef.current?.show();
    setTimeout(() => {
      textareaRef.current?.focus();
    }, 100);
  };

  const handleSave = async () => {
    if (!userId || !token) return;

    try {
      const handlerAvatarImg = document.querySelector(
        'main [data-testid*="UserAvatar-Container"] img'
      ) as HTMLImageElement;
      const avatar = handlerAvatarImg?.src || '';
      const handlerNameInfoDiv = document.querySelector(
        "main [data-testid='UserName']"
      ) as HTMLDivElement;
      const handlerNameAllText = handlerNameInfoDiv?.textContent || '@';
      const [displayName] = handlerNameAllText.split('@');
      const xLink = window.location.origin + window.location.pathname;

      await saveNote({
        handle: userId,
        xLink,
        displayName: displayName.trim(),
        avatar,
        note: noteText.trim(),
      });
    } catch (error) {
      console.log('Save note error:', error);
    }
  };

  const handleCancel = () => {
    setNoteText(originalNote);
    containerRef.current?.hide();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      handleCancel();
    } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSave();
    }
  };

  // 修复输入法问题：使用 React 16 valueTracker 方法
  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    const maxLength = 30;

    // 限制长度
    const trimmedValue = newValue.slice(0, maxLength);

    // 更新状态
    setNoteText(trimmedValue);
  };

  const shouldShowOfficialTags =
    isEnabled('showOfficialTags') && officialTags.length > 0;
  const shouldShowNoteEntry = isEnabled('showNotes') && !editProfileButtonEl;
  const officialTagsText = officialTags.join(' · ');
  const isDark = theme === 'dark';
  const metaBg = isDark ? 'rgba(255,255,255,0.035)' : 'rgba(15,20,25,0.035)';
  const noteBg = isDark ? 'rgba(255,255,255,0.025)' : 'rgba(15,20,25,0.025)';

  return (
    <ErrorBoundary name='NotesSection'>
      <div className='flex flex-wrap items-center gap-1 max-w-[360px]'>
        {shouldShowOfficialTags && (
          <div
            className='inline-flex min-h-[22px] items-center rounded-full px-2 py-1 text-[12px] leading-none theme-text-secondary'
            title={officialTagsText}
            style={{
              background: metaBg,
            }}
          >
            <span className='flex flex-wrap items-center gap-x-1.5 gap-y-1'>
              {officialTags.map((tag, index) => (
                <React.Fragment key={`${tag}-${index}`}>
                  <span className='whitespace-nowrap'>{tag}</span>
                  {index < officialTags.length - 1 && (
                    <span className='shrink-0 theme-text-tertiary opacity-50'>
                      ·
                    </span>
                  )}
                </React.Fragment>
              ))}
            </span>
          </div>
        )}

        {shouldShowNoteEntry ? (
          <div className='flex items-center min-w-0'>
            {loadingNote ? (
              // 加载状态
              <div
                className='inline-flex h-[22px] items-center rounded-full px-2 text-[12px] leading-none theme-text-tertiary'
                style={{ background: noteBg }}
              >
                <span className='truncate'>{t('loading')}</span>
              </div>
            ) : calcDisplayNote && token ? (
              // 已有备注状态
              <div
                className='inline-flex h-[22px] max-w-[160px] cursor-pointer items-center rounded-full px-2 text-[12px] leading-none theme-text-tertiary transition-colors hover:theme-text-secondary'
                onClick={handleEdit}
                title={calcDisplayNote}
                ref={targetRef}
                style={{ background: noteBg }}
              >
                <span className='truncate'>{calcDisplayNote}</span>
              </div>
            ) : (
              // 未备注状态
              <div
                ref={targetRef}
                onClick={handleEdit}
                className='inline-flex h-[22px] cursor-pointer items-center rounded-full px-2 text-[12px] leading-none theme-text-tertiary opacity-60 transition-colors hover:theme-text-secondary hover:opacity-100'
                title={t('addNote')}
                style={{ background: noteBg }}
              >
                <span className='truncate'>{t('note')}</span>
              </div>
            )}
          </div>
        ) : null}

        {/* Note editing floating container */}
        <ErrorBoundary>
          {token && (
            <FloatingContainer
              ref={containerRef}
              targetRef={targetRef}
              offsetX={15}
              offsetY={20}
              maxWidth='300px'
              maxHeight='320px'
            >
              <div
                data-theme={theme}
                className='w-[280px] theme-bg-secondary rounded-2xl p-3.5 space-y-3 shadow-[0_12px_32px_rgba(0,0,0,0.22)] border theme-border'
              >
                <div className='flex items-center gap-2'>
                  <span className='flex h-7 w-7 items-center justify-center rounded-full bg-[#1d9bf0]/10'>
                    <StickyNote className='w-3.5 h-3.5 text-[#1d9bf0]' />
                  </span>
                  <h3 className='text-[13px] font-semibold theme-text-primary'>
                    {t('addNote')}
                  </h3>
                </div>

                {/* Note textarea */}
                <div>
                  <textarea
                    ref={textareaRef}
                    value={noteText}
                    onChange={handleTextareaChange}
                    onKeyDown={handleKeyDown}
                    onFocus={() => {
                      currentInputRef.current = textareaRef.current;
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
                    placeholder={t('enterNoteHere')}
                    className='theme-text-primary w-full h-20 px-3 py-2.5 rounded-xl border text-sm resize-none focus:outline-none focus:ring-1 focus:ring-[#1d9bf0]/40 focus:border-[#1d9bf0]/60 placeholder-gray-400 leading-relaxed transition-colors'
                    maxLength={30}
                    style={{
                      lineHeight: '1.5',
                      backgroundColor:
                        theme === 'dark'
                          ? 'rgba(255,255,255,0.04)'
                          : 'rgba(15,20,25,0.035)',
                      borderColor:
                        theme === 'dark'
                          ? 'rgba(139,152,165,0.22)'
                          : 'rgba(15,20,25,0.12)',
                    }}
                  />
                  <div className='flex items-center justify-between mt-1 text-xs theme-text-secondary'>
                    <span
                      className={`rounded-full px-1.5 py-0.5 ${
                        noteText.length > 30 ? 'text-red-500 font-medium' : ''
                      }`}
                    >
                      {noteText.length}/30
                    </span>
                    <span className='opacity-75 text-[11px]'>
                      Ctrl+Enter {t('save')}
                    </span>
                  </div>
                </div>

                {/* Action buttons */}
                <div className='flex gap-2 pt-1'>
                  <button
                    onClick={handleSave}
                    disabled={savingNote}
                    className='flex-1 py-2 rounded-full text-white text-sm font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed bg-[#1d9bf0] hover:bg-[#1a8cd8] flex items-center justify-center gap-2 shadow-sm'
                  >
                    {savingNote && <Loader2 className='w-4 h-4 animate-spin' />}
                    {t('save')}
                  </button>
                  <button
                    onClick={handleCancel}
                    disabled={savingNote}
                    className='px-4 py-2 rounded-full text-sm font-medium theme-text-secondary hover:theme-text-primary theme-hover transition-all duration-200 disabled:opacity-50'
                  >
                    {t('cancel')}
                  </button>
                </div>
              </div>
            </FloatingContainer>
          )}
        </ErrorBoundary>

        {/* Login prompt floating container */}
        <ErrorBoundary>
          {!token && (
            <FloatingContainer
              ref={loginContainerRef}
              targetRef={targetRef}
              offsetX={10}
              offsetY={10}
              maxWidth='280px'
              maxHeight='400px'
            >
              <div
                data-theme={theme}
                className='w-[260px] theme-bg-secondary rounded-lg p-4 space-y-4'
              >
                <button
                  onClick={onLoginClick}
                  className='w-full py-2.5 theme-text-primary bg-[#1d9bf0] hover:bg-[#1a8cd8] rounded-full transition-colors flex items-center justify-center gap-2 text-sm'
                >
                  <svg viewBox='0 0 24 24' className='w-4 h-4 fill-current'>
                    <path d='M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z' />
                  </svg>
                  {t('loginRequired2')}
                </button>
              </div>
            </FloatingContainer>
          )}
        </ErrorBoundary>
      </div>
    </ErrorBoundary>
  );
}

export const NotesSection = React.memo(_NotesSection);
