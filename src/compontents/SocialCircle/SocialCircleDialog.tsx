import React, { useEffect, useRef, useState } from 'react';
import { Check, Copy, Loader2, X } from 'lucide-react';
import type { KolInteractionsData } from '~contents/services/api';
import { useLocalStorage } from '~storage/useLocalStorage';
import SocialCircleGraph from './SocialCircleGraph';
import { renderSocialCirclePoster } from './renderSocialCirclePoster';
import { getProfileInitial, getSafeAvatarUrl } from './socialCircleLayout';

type Translate = (key: string, fallback?: string) => string;
const SOCIAL_CIRCLE_DIALOG_SCALE = 0.85;

const replaceTokens = (
  template: string,
  values: Record<string, string | number>,
) =>
  Object.entries(values).reduce(
    (result, [key, value]) => result.split(`{${key}}`).join(String(value)),
    template,
  );

const formatDate = (value: string, lang: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(lang === 'zh' ? 'zh-CN' : 'en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(date);
};

function ProfileAvatar({ data }: { data: KolInteractionsData }) {
  const avatar = getSafeAvatarUrl(data.kol.avatar);
  const [failed, setFailed] = useState(false);
  if (avatar && !failed) {
    return (
      <img
        src={avatar}
        alt=''
        className='h-10 w-10 rounded-full object-cover ring-2 ring-sky-400/40'
        onError={() => setFailed(true)}
      />
    );
  }

  return (
    <span
      aria-hidden='true'
      className='flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-[#1D9BF0] to-[#7C3AED] font-bold text-white ring-2 ring-sky-400/40'
    >
      {getProfileInitial(data.kol.name, data.kol.username)}
    </span>
  );
}

export default function SocialCircleDialog({
  isOpen,
  data,
  t,
  lang,
  triggerRef,
  onClose,
}: {
  isOpen: boolean;
  data: KolInteractionsData;
  t: Translate;
  lang: string;
  triggerRef: React.RefObject<HTMLButtonElement>;
  onClose: () => void;
}) {
  const [theme] = useLocalStorage<'light' | 'dark'>('@xhunt/theme', 'dark');
  const dialogRef = useRef<HTMLDivElement>(null);
  const exportingRef = useRef(false);
  const [exporting, setExporting] = useState(false);
  const [copySucceeded, setCopySucceeded] = useState(false);
  const [poster, setPoster] = useState<{
    data: KolInteractionsData;
    theme: 'light' | 'dark';
    madeBy: string;
    blob: Blob;
    url: string;
    isComplete: boolean;
  } | null>(null);
  const [previewFailed, setPreviewFailed] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  const profileName = data.kol.name || data.kol.username || 'XHunt';
  const title = replaceTokens(
    t('socialCircleTitle', "{name}'s social circle"),
    { name: profileName },
  );
  const dateRange = `${formatDate(data.window_start, lang)} — ${formatDate(
    data.window_end,
    lang,
  )}`;
  const madeBy = t('socialCircleMadeBy', 'Made by XHunt');
  const preview =
    poster?.data === data && poster.theme === theme && poster.madeBy === madeBy
      ? poster
      : null;

  useEffect(() => {
    if (!isOpen) return;
    const controller = new AbortController();
    const objectUrls: string[] = [];
    let hasPreview = false;
    setPreviewFailed(false);
    setStatusMessage('');

    const createPosters = async () => {
      const previewBlob = await renderSocialCirclePoster({
        data,
        theme,
        labels: { madeBy },
        signal: controller.signal,
        includeAvatars: false,
      });
      if (controller.signal.aborted) return;

      const previewUrl = URL.createObjectURL(previewBlob);
      objectUrls.push(previewUrl);
      hasPreview = true;
      setPoster({
        data,
        theme,
        madeBy,
        blob: previewBlob,
        url: previewUrl,
        isComplete: false,
      });

      const completeBlob = await renderSocialCirclePoster({
        data,
        theme,
        labels: { madeBy },
        signal: controller.signal,
      });
      if (controller.signal.aborted) return;

      const completeUrl = URL.createObjectURL(completeBlob);
      objectUrls.push(completeUrl);
      setPoster({
        data,
        theme,
        madeBy,
        blob: completeBlob,
        url: completeUrl,
        isComplete: true,
      });
    };

    void createPosters().catch(() => {
      if (controller.signal.aborted) return;
      if (!hasPreview) {
        setPreviewFailed(true);
        return;
      }

      setPoster((current) =>
        current ? { ...current, isComplete: true } : current,
      );
    });

    return () => {
      controller.abort();
      objectUrls.forEach((url) => URL.revokeObjectURL(url));
      setPoster(null);
    };
  }, [data, isOpen, madeBy, theme]);

  useEffect(() => {
    if (!isOpen) {
      setCopySucceeded(false);
      return;
    }
    if (!copySucceeded) return;

    const timer = window.setTimeout(() => setCopySucceeded(false), 3000);
    return () => window.clearTimeout(timer);
  }, [copySucceeded, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const focusTimer = window.setTimeout(() => dialogRef.current?.focus(), 0);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !exportingRef.current) {
        event.preventDefault();
        onClose();
        return;
      }
    };

    document.addEventListener('keydown', handleKeyDown, true);
    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener('keydown', handleKeyDown, true);
      const restoreTarget = triggerRef.current || previouslyFocused;
      window.setTimeout(() => restoreTarget?.focus?.(), 0);
    };
  }, [isOpen, onClose, triggerRef]);

  const copyImage = async () => {
    if (exportingRef.current || copySucceeded || !preview?.isComplete) {
      return;
    }
    exportingRef.current = true;
    setExporting(true);
    setStatusMessage('');
    try {
      if (!navigator.clipboard?.write || typeof ClipboardItem === 'undefined') {
        throw new Error('Image clipboard is unavailable');
      }
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': preview.blob }),
      ]);
      setCopySucceeded(true);
    } catch (error) {
      if ((error as DOMException)?.name === 'AbortError') return;
      setStatusMessage(
        t(
          'socialCircleCopyFailed',
          'Could not copy the image. Please try again.',
        ),
      );
    } finally {
      exportingRef.current = false;
      setExporting(false);
    }
  };

  if (!isOpen) return null;

  const actionButtonClass =
    'inline-flex min-h-10 items-center justify-center gap-1.5 rounded-full border px-3 text-xs font-semibold transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[#1D9BF0] focus-visible:ring-offset-2';
  const copyButtonClass = copySucceeded
    ? theme === 'light'
      ? 'cursor-not-allowed border-emerald-200 bg-emerald-50 text-emerald-700'
      : 'cursor-not-allowed border-emerald-700/70 bg-emerald-950/50 text-emerald-300'
    : `theme-border theme-text-primary theme-hover ${
        exporting || !preview?.isComplete ? 'cursor-wait opacity-60' : ''
      }`;

  return (
    <div data-theme={theme} style={{ display: 'contents' }}>
      <style>{`
        @media (prefers-reduced-motion: reduce) {
          .xhunt-social-circle-dialog *, .xhunt-social-circle-dialog *::before, .xhunt-social-circle-dialog *::after {
            animation-duration: 0.01ms !important;
            transition-duration: 0.01ms !important;
          }
        }
      `}</style>
      <div
        ref={dialogRef}
        role='dialog'
        aria-labelledby='xhunt-social-circle-title'
        tabIndex={-1}
        className='xhunt-social-circle-dialog relative flex max-h-[calc(100dvh-24px)] w-[min(480px,calc(100vw-24px))] flex-col overflow-hidden rounded-2xl border theme-border theme-bg-secondary shadow-[0_12px_32px_rgba(0,0,0,0.22)] outline-none'
        style={{ zoom: SOCIAL_CIRCLE_DIALOG_SCALE }}
      >
        <header className='flex shrink-0 items-center gap-3 border-b theme-border px-4 py-3.5 sm:px-5'>
          <ProfileAvatar data={data} />
          <div className='min-w-0 flex-1'>
            <h2
              id='xhunt-social-circle-title'
              className='truncate text-[15px] font-bold theme-text-primary sm:text-base'
            >
              {title}
            </h2>
            <div className='mt-0.5 flex flex-wrap items-center gap-x-2 text-[11px] theme-text-secondary'>
              <span>
                {t(
                  'socialCircleMutualWindow',
                  'Mutual interactions over the last 30 days',
                )}
              </span>
              <span aria-hidden='true'>·</span>
              <span>{dateRange}</span>
            </div>
          </div>
          <button
            type='button'
            aria-label={t('close', 'Close')}
            disabled={Boolean(exporting)}
            onClick={onClose}
            className='flex h-10 w-10 shrink-0 items-center justify-center rounded-full theme-text-secondary theme-hover transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1D9BF0] disabled:opacity-50'
          >
            <X className='h-5 w-5' aria-hidden='true' />
          </button>
        </header>

        <main className='min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-2 py-1 text-slate-300 sm:px-5 sm:py-2'>
          {preview ? (
            <SocialCircleGraph
              data={data}
              imageUrl={preview.url}
              t={t}
              onNavigate={onClose}
            />
          ) : (
            <div
              className='mx-auto flex aspect-square w-[min(100%,416px,calc(100dvh-220px))] items-center justify-center theme-text-secondary'
              role='status'
            >
              {previewFailed ? (
                <span className='px-4 text-center text-xs'>
                  {t(
                    'socialCircleExportFailed',
                    'Could not create the image. Try again.',
                  )}
                </span>
              ) : (
                <div className='flex flex-col items-center gap-2'>
                  <span
                    className='h-6 w-6 animate-spin rounded-full border-2 border-blue-400/20 border-t-blue-400'
                    aria-hidden='true'
                  />
                  <span className='text-xs theme-text-secondary'>
                    {t('loading', 'Loading')}
                  </span>
                </div>
              )}
            </div>
          )}
        </main>

        <footer className='shrink-0 border-t theme-border px-4 py-3 sm:px-5'>
          <div className='flex flex-wrap items-center justify-end gap-2.5'>
            <div className='flex flex-wrap items-center justify-end gap-2'>
              <button
                type='button'
                className={`${actionButtonClass} ${copyButtonClass}`}
                disabled={exporting || copySucceeded || !preview?.isComplete}
                onClick={() => void copyImage()}
              >
                {copySucceeded ? (
                  <Check className='h-4 w-4' aria-hidden='true' />
                ) : exporting ? (
                  <Loader2
                    className='h-4 w-4 animate-spin'
                    aria-hidden='true'
                  />
                ) : (
                  <Copy className='h-4 w-4' aria-hidden='true' />
                )}
                <span aria-live='polite'>
                  {copySucceeded
                    ? t('socialCircleCopySuccess', 'Image copied')
                    : t('socialCircleCopyImage', 'Copy image')}
                </span>
              </button>
            </div>
          </div>
          {statusMessage && (
            <div
              aria-live='polite'
              className='mt-1 text-right text-[10px] text-red-400'
            >
              {statusMessage}
            </div>
          )}
        </footer>
      </div>
    </div>
  );
}
