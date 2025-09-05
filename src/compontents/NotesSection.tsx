import React, { useEffect, useRef, useState } from 'react';
import { StickyNote, Loader2 } from 'lucide-react';
import { useRequest, useLockFn } from 'ahooks';
import { getUserNote, saveUserNote } from '~contents/services/notes.ts';
import { useI18n } from '~contents/hooks/i18n.ts';
import { useLocalStorage } from '~storage/useLocalStorage.ts';
import { useGlobalTips } from '~compontents/area/GlobalTips.tsx';
import { useInterceptShortcuts } from '~contents/hooks/useInterceptShortcuts.ts';
import { getTwitterAuthUrl } from '~contents/services/api.ts';
import { openNewTab, windowGtag } from '~contents/utils';
import ErrorBoundary from '~/compontents/ErrorBoundary.tsx';
import TokenWordCloud from '~/compontents/TokenWordCloud.tsx';
import { FloatingContainer, FloatingContainerRef } from './FloatingContainer';
import { officialTagsManager } from '~/utils/officialTagsManager.ts';
import { ReviewStats } from '~types/review.ts';

interface NotesSectionProps {
  userId: string;
  reviewInfo: ReviewStats | undefined | null;
}

// 生成基于字符串的一致颜色
function generateTagColor(text: string): string {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = text.charCodeAt(i) + ((hash << 5) - hash);
  }

  // 生成柔和的颜色
  const hue = Math.abs(hash) % 360;
  const saturation = 45 + (Math.abs(hash) % 25); // 45-70%
  const lightness = 65 + (Math.abs(hash) % 20); // 65-85%

  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}

// 官方标签组件
function OfficialTag({ text }: { text: string }) {
  const [theme] = useLocalStorage('@xhunt/theme', 'dark');
  const backgroundColor = generateTagColor(text);

  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium h-7 pointer-events-none"
      style={{
        backgroundColor: theme === 'dark' ? `${backgroundColor}20` : `${backgroundColor}30`,
        borderWidth: '1px',
        borderStyle: 'solid',
        borderColor: theme === 'dark' ? 'rgba(207,217,223,0.45)' : '#CFD9DF',
        color: theme === 'dark' ? backgroundColor : `hsl(${backgroundColor.match(/\d+/)?.[0] || 0}, 70%, 35%)`,
      }}
    >
      {text}
    </span>
  );
}

function _NotesSection({ userId, reviewInfo }: NotesSectionProps) {
  const { t, lang } = useI18n();
  const [token] = useLocalStorage('@xhunt/token', '');
  const [theme] = useLocalStorage('@xhunt/theme', 'dark');
  const [, setTips] = useGlobalTips();
  const [noteText, setNoteText] = useState('');
  const [displayNote, setDisplayNote] = useState(''); // 用于显示的备注
  const [originalNote, setOriginalNote] = useState('');
  const [officialTags, setOfficialTags] = useState<string[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const currentInputRef = useRef<HTMLTextAreaElement | HTMLInputElement | null>(null);
  const isComposingRef = useRef<boolean>(false);
  const targetRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<FloatingContainerRef>(null);
  const loginContainerRef = useRef<FloatingContainerRef>(null);

  const calcDisplayNote = displayNote || reviewInfo?.currentUserReview?.note;

  useInterceptShortcuts(currentInputRef, isComposingRef);

  // 获取官方标签 - 使用当前语言
  useEffect(() => {
    if (userId) {
      const tags = officialTagsManager.getUserTags(userId, lang as 'zh' | 'en');
      setOfficialTags(tags);
    }
  }, [userId, lang]);

  const { data: userNote, run: fetchNote, loading: loadingNote } = useRequest(
    () => getUserNote(userId),
    {
      manual: true,
      refreshDeps: [userId, token]
    }
  );

  const { run: saveNote, loading: savingNote } = useRequest(
    saveUserNote,
    {
      manual: true,
      onSuccess: () => {
        setTips({
          text: t('noteSaveSuccess'),
          type: 'suc'
        });
        containerRef.current?.hide();
        setOriginalNote(noteText);
        setDisplayNote(noteText); // 保存成功后更新显示
        fetchNote();
      },
      onError: (error) => {
        setTips({
          text: `${t('noteSaveFailed')}: ${error}`,
          type: 'fail'
        });
      }
    }
  );

  const onLoginClick = useLockFn(async () => {
    windowGtag("event", "login");
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
      const handlerAvatarImg = document.querySelector('main [data-testid*="UserAvatar-Container"] img') as HTMLImageElement;
      const avatar = handlerAvatarImg?.src || '';
      const handlerNameInfoDiv = document.querySelector('main [data-testid=\'UserName\']') as HTMLDivElement;
      const handlerNameAllText = handlerNameInfoDiv?.textContent || '@';
      const [displayName] = handlerNameAllText.split('@');
      const xLink = window.location.origin + window.location.pathname;

      await saveNote({
        handle: userId,
        xLink,
        displayName: displayName.trim(),
        avatar,
        note: noteText.trim()
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

  return (
    <div className="inline-block" style={{
      marginLeft: 6
    }}>
      <div className="flex flex-col gap-1.5 max-w-[250px]">
        {/* 官方标签区域 - 始终占位 */}
        <div className="flex flex-wrap items-center gap-1.5">
          {officialTags.length > 0 ? (
            officialTags.map((tag, index) => (
              <OfficialTag key={index} text={tag} />
            ))
          ) : null}
        </div>

        {/* 备注区域 - 始终在下方 */}
        <div className="flex items-center">
          {loadingNote ? (
            // 加载状态
            <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-dashed theme-border h-6">
              <StickyNote className="w-3 h-3 theme-text-secondary opacity-60 flex-shrink-0" />
              <span className="text-xs theme-text-secondary opacity-70 truncate">{t('loading')}</span>
            </div>
          ) : calcDisplayNote && token ? (
            // 已有备注状态
            <div
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-dashed theme-border cursor-pointer hover:border-gray-400/60 hover:theme-bg-tertiary/30 text-xs font-medium theme-text-primary h-6"
              onClick={handleEdit}
              title={calcDisplayNote}
              ref={targetRef}
            >
              <StickyNote className="w-3 h-3 theme-text-secondary opacity-60 flex-shrink-0" />
              <span className="truncate">{calcDisplayNote}</span>
            </div>
          ) : (
            // 未备注状态
            <div
              ref={targetRef}
              onClick={handleEdit}
              className="cursor-pointer inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-dashed theme-border hover:border-gray-400/60 hover:theme-bg-tertiary/30 text-xs font-medium theme-text-secondary h-6"
              title={t('addNote')}
            >
              <StickyNote className="w-3 h-3 opacity-60 flex-shrink-0" />
              <span className="opacity-60 truncate">{t('addNote')}</span>
            </div>
          )}
        </div>

        {/* Note editing floating container */}
        <ErrorBoundary>
          {token && <FloatingContainer
						ref={containerRef}
						targetRef={targetRef}
						offsetX={15}
						offsetY={20}
						maxWidth="280px"
						maxHeight="320px"
					>
						<div data-theme={theme} className="w-[260px] theme-bg-secondary rounded-lg p-4 space-y-3 shadow-xl border theme-border">
							<div className="flex items-center gap-2 mb-2">
								<StickyNote className="w-4 h-4 text-blue-400" />
								<h3 className="text-sm font-medium theme-text-primary">{t('addNote')}</h3>
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
	                className="theme-text-primary w-full h-20 px-3 py-2 rounded-md bg-[#1d9bf0]/10 border border-[#1d9bf0]/30 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-[#1d9bf0]/50 focus:border-[#1d9bf0] placeholder-gray-400 leading-relaxed"
	                maxLength={30}
	                style={{ lineHeight: '1.5' }}
                />
								<div className="flex items-center justify-between mt-1 text-xs theme-text-secondary">
                  <span className={`${noteText.length > 30 ? 'text-red-500 font-medium' : ''}`}>
                    {noteText.length}/30
                  </span>
									<span className="opacity-75 text-[11px]">Ctrl+Enter {t('save')}</span>
								</div>
							</div>

              {/* Action buttons */}
							<div className="flex gap-2 pt-1">
								<button
									onClick={handleSave}
									disabled={savingNote}
									className="flex-1 py-2 rounded-md text-white text-sm font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed bg-[#1d9bf0] hover:bg-[#1a8cd8] flex items-center justify-center gap-2"
								>
                  {savingNote && <Loader2 className="w-4 h-4 animate-spin" />}
                  {t('save')}
								</button>
								<button
									onClick={handleCancel}
									disabled={savingNote}
									className="px-4 py-2 rounded-md text-sm font-medium theme-text-secondary hover:theme-text-primary theme-hover transition-all duration-200 disabled:opacity-50 border theme-border"
								>
                  {t('cancel')}
								</button>
							</div>
						</div>
					</FloatingContainer>}
        </ErrorBoundary>

        {/* Login prompt floating container */}
        <ErrorBoundary>
          {!token && <FloatingContainer
						ref={loginContainerRef}
						targetRef={targetRef}
						offsetX={10}
						offsetY={10}
						maxWidth="280px"
						maxHeight="400px"
					>
						<div data-theme={theme} className="w-[260px] theme-bg-secondary rounded-lg p-4 space-y-4">
							<div className="w-full theme-bg-tertiary rounded-lg overflow-hidden">
								<ErrorBoundary>
									<TokenWordCloud tokens={[]} height={120} emptyTips={t('noReviews')} />
								</ErrorBoundary>
							</div>
							<button
								onClick={onLoginClick}
								className="w-full py-2.5 theme-text-primary bg-[#1d9bf0] hover:bg-[#1a8cd8] rounded-full transition-colors flex items-center justify-center gap-2 text-sm"
							>
								<svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
									<path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
								</svg>
                {t('loginRequired2')}
							</button>
						</div>
					</FloatingContainer>}
        </ErrorBoundary>
      </div>
    </div>
  );
}

export const NotesSection = React.memo(_NotesSection);
