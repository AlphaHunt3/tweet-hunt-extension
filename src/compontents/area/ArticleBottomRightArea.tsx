import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import ReactDOM from 'react-dom';
import useShadowContainer from '~contents/hooks/useShadowContainer.ts';
import cssText from 'data-text:~/css/style.css';
import { useI18n } from '~contents/hooks/i18n.ts';
import {
  BoostPanelEventDetail,
  XHUNT_BOOST_PANEL_EVENT,
} from '../ArticleBoostPanel';
import useCurrentUrl from '~contents/hooks/useCurrentUrl';
import { extractStatusIdFromUrl } from '~contents/utils';
import { useCrossPageSettings } from '~utils/settingsManager.ts';
import usePersistentPortalHost from '~contents/hooks/usePersistentPortalHost';

const ARTICLE_SELECTOR = "article[data-testid='tweet'][tabindex='-1']";

function _ArticleBottomRightArea() {
  const { t } = useI18n();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const currentUrl = useCurrentUrl();
  const { isEnabled } = useCrossPageSettings();
  const articleId = useMemo(
    () => String(extractStatusIdFromUrl(currentUrl)).toLocaleLowerCase(),
    [currentUrl]
  );
  const shadowRoot = useShadowContainer({
    selector: ARTICLE_SELECTOR,
    styleText: cssText,
    useSiblings: true,
    siblingsPosition: 'beforeend',
    siblingsStyle:
      'position:absolute;bottom:63px;right:18px;pointer-events:none;z-index:99;',
    autoZIndex: false,
    onShadowCreated: (_, target) => {
      const baseEl = target.parentElement as HTMLElement | null;
      const hasThumb = !!baseEl?.querySelector('div[data-testid="thumbnail"]');
      (target as HTMLElement).style.bottom = hasThumb ? '187px' : '63px';
    },
  });
  const portalHost = usePersistentPortalHost(shadowRoot);

  const baseBtnClass =
    'xhunt-article-bottom-right group flex items-center rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all duration-200 focus:outline-none overflow-hidden';
  const buttonClassName = `${baseBtnClass} bg-gradient-to-r from-blue-500 to-purple-500 text-white hover:opacity-90`;
  const iconClassName = 'h-4 w-4 text-white';

  const togglePanel = useCallback(() => {
    if (!buttonRef.current) return;
    const nextState = !isPanelOpen;
    setIsPanelOpen(nextState);
    window.dispatchEvent(
      new CustomEvent<BoostPanelEventDetail>(XHUNT_BOOST_PANEL_EVENT, {
        detail: {
          open: nextState,
          anchor: buttonRef.current,
          source: 'button',
        },
      })
    );
  }, [isPanelOpen]);

  useEffect(() => {
    const handler = (event: Event) => {
      const customEvent = event as CustomEvent<BoostPanelEventDetail>;
      if (customEvent.detail.source === 'panel') {
        setIsPanelOpen(customEvent.detail.open);
      }
    };
    window.addEventListener(XHUNT_BOOST_PANEL_EVENT, handler);
    return () => {
      window.removeEventListener(XHUNT_BOOST_PANEL_EVENT, handler);
    };
  }, []);

  if (!shadowRoot || !articleId || !isEnabled('showArticleBottomRightArea')) {
    return null;
  }

  return ReactDOM.createPortal(
    <button
      data-article-id={articleId}
      type='button'
      ref={buttonRef}
      onClick={togglePanel}
      aria-pressed={isPanelOpen}
      className={buttonClassName}
      style={{ pointerEvents: 'auto' }}
    >
      <svg
        className={iconClassName}
        viewBox='0 0 1024 1024'
        xmlns='http://www.w3.org/2000/svg'
        aria-hidden='true'
      >
        <path
          d='M780.288 750.592H244.736V415.744C244.736 229.376 396.288 79.872 460.8 24.576c29.696-24.576 71.68-24.576 101.376 0 65.536 55.296 217.088 204.8 217.088 391.168v334.848z m-453.632-81.92h371.712V415.744c0-150.528-128-277.504-186.368-326.656-57.344 49.152-186.368 176.128-186.368 326.656v252.928zM509.952 87.04z'
          fill='currentColor'
        />
        <path
          d='M326.656 750.592H148.48c-43.008 0-78.848-34.816-78.848-78.848v-76.8c0-26.624 13.312-51.2 34.816-65.536l221.184-146.432v367.616z m-175.104-81.92h92.16v-133.12l-92.16 61.44v71.68zM875.52 750.592H697.344V384l221.184 146.432c22.528 14.336 34.816 38.912 34.816 65.536v76.8c1.024 41.984-34.816 77.824-77.824 77.824z m-96.256-81.92h92.16v-71.68l-92.16-61.44v133.12zM513.024 489.472c-64.512 0-116.736-52.224-116.736-116.736S449.536 256 513.024 256s116.736 52.224 116.736 116.736-52.224 116.736-116.736 116.736z m0-151.552c-18.432 0-34.816 15.36-34.816 34.816s15.36 34.816 34.816 34.816 34.816-15.36 34.816-34.816S532.48 337.92 513.024 337.92zM512 1017.856c-22.528 0-40.96-18.432-40.96-40.96v-163.84c0-22.528 18.432-40.96 40.96-40.96s40.96 18.432 40.96 40.96v163.84c0 22.528-18.432 40.96-40.96 40.96zM351.232 953.344c-22.528 0-40.96-18.432-40.96-40.96v-66.56c0-22.528 18.432-40.96 40.96-40.96s40.96 18.432 40.96 40.96v66.56c0 22.528-18.432 40.96-40.96 40.96zM673.792 953.344c-22.528 0-40.96-18.432-40.96-40.96v-66.56c0-22.528 18.432-40.96 40.96-40.96s40.96 18.432 40.96 40.96v66.56c0 22.528-18.432 40.96-40.96 40.96z'
          fill='currentColor'
        />
      </svg>
      <span
        className={`tracking-wide whitespace-nowrap transition-all duration-200 ${
          isPanelOpen
            ? 'ml-2 max-w-[120px] opacity-100'
            : 'ml-0 max-w-0 opacity-0 group-hover:ml-2 group-hover:max-w-[120px] group-hover:opacity-100 group-focus-visible:ml-2 group-focus-visible:max-w-[120px] group-focus-visible:opacity-100'
        }`}
      >
        {t('xhuntBoost')}
      </span>
    </button>,
    portalHost!
  );
}

export default React.memo(_ArticleBottomRightArea);
