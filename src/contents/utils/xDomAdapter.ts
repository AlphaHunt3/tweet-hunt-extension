import { extractUsernameFromUrl } from '~contents/utils';

/**
 * X 新旧版 DOM 兼容层。
 *
 * 新版规则的取样依据：
 * - X Web 版本：85bccbebc7d381b85a0568ea1b4d9493ef135745
 * - Profile 快照：BITWU.ETH (@Bitwux)
 * - Home 快照：主页时间线
 *
 * 可信度定义：
 * - 高：语义属性或业务 URL，可跨语言，且在快照中能唯一确认。
 * - 中：语义锚点可靠，但最终节点需要依赖少量稳定的父子关系推导。
 * - 低：依赖外观、文本或易变化层级。本文件原则上不使用低可信度规则；
 *   无法可靠识别时返回 null，让对应功能安全降级。
 *
 * 新版 DOM 映射表：
 *
 * | 能力/返回值              | 新版识别依据                                                   | 可信度 | 说明 |
 * |--------------------------|----------------------------------------------------------------|--------|------|
 * | Profile handler          | meta[property="profile:username"]，URL handler 兜底            | 高     | meta 是页面身份数据，不依赖可见文案 |
 * | Profile root             | main + /{handler}/photo                                        | 高     | photo 业务 URL 用于确认当前 main 是资料页 |
 * | Profile avatarImg        | a[href="/{handler}/photo"] 内的 img                            | 高     | 头像业务链接唯一 |
 * | Profile twitterId        | /{handler}/header_photo 内 profile_banners URL；已匹配身份的 head 兜底 | 高  | banner 路径中的首段数字为用户 ID；必须先排除 SPA 残留 |
 * | Profile nameHost         | photo 锚点确认资料页后，取 article 外 h1 的两级父节点            | 中     | h1 语义稳定，父级用于给插件留出同行/同列挂载空间 |
 * | Profile noteHost         | nameHost 内文本等于 @handler 的直接子分支                       | 中     | 将备注接在 handler 后，不占用独立行 |
 * | Profile actionHost       | photo 锚点同一布局行中、包含 button/xds-button 的兄弟节点         | 中     | 不依赖 class，但依赖头像与操作区同处一行 |
 * | Profile followButton     | actionHost 内 person-follow/person-following 图标所属 button     | 高     | data-icon 是动作语义，不读取多语言 aria-label |
 * | Profile followState      | person-following/check 与 person-add/follow 图标                 | 高     | 图标语义直接区分已关注/未关注 |
 * | Profile statsHost        | a[href="/{handler}/following"] 的父节点                        | 高     | 关注数据使用稳定业务 URL，不读取“关注者”等文案 |
 * | 左侧 Profile 入口        | nav 内 person/person-fill 图标 + 单段 profile href               | 高     | 同时校验图标和非保留用户名路径 |
 * | 右侧栏挂载点             | aside + SearchBox_Search_Input，优先其结构内 section             | 中     | aside/搜索框可靠，section 位置为结构推导 |
 * | Tweet card/article       | [role="link"][data-href*="/status/"] > article + post-avatar  | 高     | status URL 与作者头像组合，排除普通 article |
 * | Tweet id/handler         | data-href 的 /{handler}/status/{id} + 头像 profile href          | 高     | 两个业务 URL 可交叉兜底 |
 * | Tweet avatarHost         | [data-post-avatar="true"] 内 .x-avatar                         | 高     | data-post-avatar 是帖子作者头像语义标记 |
 * | Tweet authorNameHost     | 同 handler 的 display-name 链接与 @handle 链接的公共祖先         | 中     | 链接身份可靠，公共祖先用于挂特殊标记 |
 * | Tweet textHost           | 当前顶层 article 内首个 div[dir="auto"][lang]                  | 中     | 限定 closest(article) 防止串到引用帖；仍依赖正文顺序 |
 * | Tweet moreButton         | use[href="#icon-more-dots-hor"] 所属 button                    | 高     | SVG symbol 名称具有明确动作语义 |
 * | Tweet detail             | 当前 URL tweet id + article 内同 id 的 status 业务链接           | 高     | 避免把相关推文或引用推文当成详情主帖 |
 * | Compose modal            | dialog + media-upload-dropzone + multiline textarea             | 中     | 弹窗语义可靠，最终挂载动作按钮为结构推导 |
 * | Home composer            | main [data-media-upload-dropzone] + multiline textarea          | 高     | 两个语义锚点同时存在才认为是首页编辑器 |
 * | Home submit 挂载点       | dropzone 内无 SVG 的 xds-button                                 | 中     | 当前为文字发帖按钮；找不到时退回 dropzone |
 * | Home compose text        | dropzone 内 textarea.value                                      | 高     | 原生表单值，不读取占位文案 |
 *
 * 维护约束：
 * 1. 优先业务 URL、role、data-*、meta、SVG data-icon；不使用 base-ui 动态 ID。
 * 2. 不把长 Tailwind class 或本地化 aria-label 作为主选择器。
 * 3. 每项能力独立做 legacy/new fallback，避免用一个全局 isNewX 决定全部结构。
 * 4. 新版 Compose 弹窗、Inline Reply、Tweet Detail 尚无快照，不在这里猜测兼容。
 */

export type XDomVariant = 'legacy' | 'new' | 'unknown';
export type XFollowState = 'follow' | 'unfollow' | null;

const LEGACY_PROFILE_ROOT_SELECTOR =
  'div[data-testid="primaryColumn"] div[data-testid="placementTracking"]';
const LEGACY_PROFILE_NAME_SELECTOR = 'main [data-testid="UserName"]';
const LEGACY_TWEET_SELECTOR = 'article[data-testid="tweet"]';

/**
 * 实时识别当前 X 页面版本。
 * 老版标记优先，避免首屏过渡期间被新版的通用链接结构误判。
 */
export const resolveXDomVariant = (): XDomVariant => {
  let variant: XDomVariant = 'unknown';
  if (
    document.querySelector(
      'a[data-testid="AppTabBar_Profile_Link"], div[data-testid="primaryColumn"], div[data-testid="placementTracking"]',
    )
  ) {
    variant = 'legacy';
  } else if (
    document.querySelector(
      'nav svg[data-icon], [role="link"][data-href*="/status/"] > article',
    )
  ) {
    variant = 'new';
  }

  return variant;
};

const RESERVED_PATHS = new Set([
  'home',
  'explore',
  'notifications',
  'messages',
  'bookmarks',
  'search',
  'settings',
  'compose',
  'jobs',
  'i',
]);

const normalizeHandle = (value?: string | null) =>
  String(value || '')
    .trim()
    .replace(/^@+/, '')
    .toLowerCase();

const getPathname = (href?: string | null): string => {
  if (!href) return '';
  try {
    return new URL(href, window.location.origin).pathname;
  } catch {
    return '';
  }
};

const getProfileHandleFromHref = (href?: string | null): string => {
  const pathname = getPathname(href);
  const segments = pathname.split('/').filter(Boolean);
  if (segments.length !== 1) return '';
  const candidate = normalizeHandle(segments[0]);
  if (!candidate || RESERVED_PATHS.has(candidate)) return '';
  return candidate;
};

const findAnchorByPath = (
  root: ParentNode,
  pathname: string,
): HTMLAnchorElement | null => {
  const normalizedPath = pathname.toLowerCase();
  const anchors = root.querySelectorAll<HTMLAnchorElement>('a[href]');
  for (const anchor of anchors) {
    if (getPathname(anchor.getAttribute('href')).toLowerCase() === normalizedPath) {
      return anchor;
    }
  }
  return null;
};

const findCommonAncestor = (
  first: HTMLElement,
  second: HTMLElement,
  boundary: HTMLElement,
): HTMLElement | null => {
  let current: HTMLElement | null = first;
  while (current && current !== boundary) {
    if (current.contains(second)) return current;
    current = current.parentElement;
  }
  return boundary.contains(second) ? boundary : null;
};

const findButtonByIcon = (
  root: ParentNode,
  iconNames: string[],
): HTMLButtonElement | null => {
  const icons = root.querySelectorAll<SVGElement>('svg[data-icon]');
  for (const icon of icons) {
    if (!iconNames.includes(icon.getAttribute('data-icon') || '')) continue;
    const button = icon.closest<HTMLButtonElement>('button');
    if (button) return button;
  }
  return null;
};

const getLegacyFollowState = (
  followButton: HTMLButtonElement | null,
): XFollowState => {
  const testId = followButton?.getAttribute('data-testid') || '';
  if (testId.includes('unfollow')) return 'unfollow';
  if (testId.includes('follow')) return 'follow';
  return null;
};

const getNewFollowState = (
  actionRoot: ParentNode | null,
): XFollowState => {
  if (!actionRoot) return null;
  if (
    actionRoot.querySelector(
      'svg[data-icon="icon-person-following"], svg[data-icon="icon-person-check"]',
    )
  ) {
    return 'unfollow';
  }
  if (
    actionRoot.querySelector(
      'svg[data-icon="icon-person-add"], svg[data-icon="icon-person-follow"]',
    )
  ) {
    return 'follow';
  }
  return null;
};

export interface ProfileDomSnapshot {
  variant: XDomVariant;
  twitterId: string;
  root: HTMLElement | null;
  actionHost: HTMLElement | null;
  nameHost: HTMLElement | null;
  noteHost: HTMLElement | null;
  statsHost: HTMLElement | null;
  avatarImg: HTMLImageElement | null;
  bannerImg: HTMLImageElement | null;
  followButton: HTMLButtonElement | null;
  handler: string;
  displayName: string;
  avatar: string;
  followState: XFollowState;
}

const logProfileDom = (snapshot: ProfileDomSnapshot): ProfileDomSnapshot => {
  return snapshot;
};

const getTwitterIdFromProfileBanner = (value?: string | null): string => {
  const match = String(value || '').match(
    /\/profile_banners\/(\d+)(?:\/|$)/,
  );
  return match?.[1] || '';
};

const doesDocumentHeadMatchProfile = (
  handler: string,
  metaHandler: string,
): boolean => {
  const canonicalHandler = getProfileHandleFromHref(
    document
      .querySelector<HTMLLinkElement>('link[rel="canonical"]')
      ?.getAttribute('href'),
  );
  const ogUrlHandler = getProfileHandleFromHref(
    document
      .querySelector<HTMLMetaElement>('meta[property="og:url"]')
      ?.content,
  );
  const normalizedHandler = normalizeHandle(handler);
  return [normalizeHandle(metaHandler), canonicalHandler, ogUrlHandler].some(
    (candidate) => candidate === normalizedHandler,
  );
};

/**
 * 新版 X 不再把数字 ID 放进关注按钮，但背景图 URL 仍使用
 * /profile_banners/{twitterId}/...。SPA 切换后 head 和旧资料 DOM 会短暂残留，
 * 因此只读取明确属于当前 handler 的 header_photo，或已由身份 meta 确认的 head。
 */
const resolveProfileBannerTwitterId = (
  main: HTMLElement,
  handler: string,
  metaHandler: string,
): string => {
  const headerPhotoAnchor = findAnchorByPath(
    main,
    `/${handler}/header_photo`,
  );
  const headerImage =
    headerPhotoAnchor?.querySelector<HTMLImageElement>('img') || null;
  const profileDomId = [
    headerImage?.currentSrc,
    headerImage?.getAttribute('src'),
    headerImage?.getAttribute('srcset'),
  ]
    .map(getTwitterIdFromProfileBanner)
    .find(Boolean);
  if (profileDomId) return profileDomId;

  if (!doesDocumentHeadMatchProfile(handler, metaHandler)) return '';

  const twitterImageId = getTwitterIdFromProfileBanner(
    document
      .querySelector<HTMLMetaElement>('meta[name="twitter:image"]')
      ?.content,
  );
  if (twitterImageId) return twitterImageId;

  const preloadIds = Array.from(
    document.querySelectorAll<HTMLLinkElement>(
      'link[rel="preload"][as="image"]',
    ),
  )
    .flatMap((link) => [
      link.getAttribute('href'),
      link.getAttribute('imagesrcset'),
    ])
    .map(getTwitterIdFromProfileBanner)
    .filter(Boolean);
  const uniquePreloadIds = Array.from(new Set(preloadIds));
  // 如果 SPA 过渡期同时存在两个人的 preload，宁可走接口兜底也不能串人。
  return uniquePreloadIds.length === 1 ? uniquePreloadIds[0] : '';
};

export const resolveProfileDom = (
  handlerInput?: string,
): ProfileDomSnapshot => {
  const urlHandler = normalizeHandle(
    handlerInput || extractUsernameFromUrl(window.location.href),
  );
  const legacyRoot = document.querySelector<HTMLElement>(
    LEGACY_PROFILE_ROOT_SELECTOR,
  );
  const legacyName = document.querySelector<HTMLElement>(
    LEGACY_PROFILE_NAME_SELECTOR,
  );
  const legacyFollowButton =
    legacyRoot?.querySelector<HTMLButtonElement>(
      'button[data-testid$="-follow"], button[data-testid$="-unfollow"]',
    ) || null;
  const handlerFromAria = (
    legacyFollowButton?.getAttribute('aria-label') || ''
  ).match(/@([A-Za-z0-9_]+)/)?.[1];
  const legacyHandler = normalizeHandle(handlerFromAria || urlHandler);
  const legacyAvatarImg = document.querySelector<HTMLImageElement>(
    'div[data-testid="primaryColumn"] [data-testid*="UserAvatar-Container"] img',
  );
  const legacyBannerImg = legacyHandler
    ? findAnchorByPath(document, `/${legacyHandler}/header_photo`)
        ?.querySelector<HTMLImageElement>('img') || null
    : null;
  const legacyFollowingAnchor = legacyHandler
    ? findAnchorByPath(document, `/${legacyHandler}/following`)
    : null;

  const metaHandler = normalizeHandle(
    document
      .querySelector<HTMLMetaElement>('meta[property="profile:username"]')
      ?.content,
  );
  // SPA 路由切换时 profile meta 可能短暂保留上一位用户；显式 URL handler 优先。
  const handler = urlHandler || metaHandler;
  // 缺少 profile:username 不能视为匹配；SPA 切换期间 author/og:image
  // 可能仍属于上一位用户，必须由任一明确的 head 身份字段确认。
  const headMatchesHandler = doesDocumentHeadMatchProfile(handler, metaHandler);
  const main = document.querySelector<HTMLElement>('main');
  if (!main || !handler) {
    return logProfileDom({
      variant: legacyRoot || legacyName ? 'legacy' : 'unknown',
      twitterId: '',
      root: legacyRoot || legacyName || main,
      actionHost: legacyRoot,
      nameHost: legacyName,
      noteHost: legacyName,
      statsHost: legacyFollowingAnchor?.parentElement?.parentElement || null,
      avatarImg: legacyAvatarImg,
      bannerImg: legacyBannerImg,
      followButton: legacyFollowButton,
      handler: legacyHandler || handler,
      displayName:
        (legacyName?.textContent || '').split('@')[0]?.trim() || '',
      avatar: legacyAvatarImg?.src || '',
      followState: getLegacyFollowState(legacyFollowButton),
    });
  }

  const photoAnchor = findAnchorByPath(main, `/${handler}/photo`);
  const headerPhotoAnchor = findAnchorByPath(main, `/${handler}/header_photo`);
  const newFollowingAnchor = findAnchorByPath(main, `/${handler}/following`);
  // /photo 先确认这是资料页，再使用 article 外的 h1，避免误取时间线帖子标题。
  const profileH1 = photoAnchor
    ? Array.from(main.querySelectorAll<HTMLHeadingElement>('h1')).find(
        (heading) => !heading.closest('article'),
      ) || null
    : null;
  const nameHost =
    profileH1?.parentElement?.parentElement || profileH1?.parentElement || null;
  const handleTextElement = nameHost
    ? Array.from(nameHost.querySelectorAll<HTMLElement>('span')).find(
        (element) =>
          element.children.length === 0 &&
          normalizeHandle(element.textContent) === handler,
      ) || null
    : null;
  let newNoteHost = handleTextElement;
  while (newNoteHost?.parentElement && newNoteHost.parentElement !== nameHost) {
    newNoteHost = newNoteHost.parentElement;
  }
  const photoRow = photoAnchor?.parentElement || null;
  // 新版没有 placementTracking：从头像所在行寻找操作按钮组，不依赖易变 class。
  const newActionHost =
    photoRow && photoAnchor
      ? (Array.from(photoRow.children).find(
          (child): child is HTMLElement =>
            child instanceof HTMLElement &&
            child !== photoAnchor &&
            Boolean(child.querySelector('button, a[data-slot="xds-button"]')),
        ) ?? null)
      : null;
  const newFollowButton = findButtonByIcon(newActionHost || main, [
    'icon-person-following',
    'icon-person-check',
    'icon-person-add',
    'icon-person-follow',
  ]);
  const newAvatarImg = photoAnchor?.querySelector<HTMLImageElement>('img') || null;
  const newBannerImg =
    headerPhotoAnchor?.querySelector<HTMLImageElement>('img') || null;
  const authorMeta = document.querySelector<HTMLMetaElement>(
    'meta[name="author"]',
  );
  const imageMeta = document.querySelector<HTMLMetaElement>(
    'meta[property="og:image"]',
  );
  const profileBannerTwitterId = resolveProfileBannerTwitterId(
    main,
    handler,
    metaHandler,
  );

  return logProfileDom({
    // 老版同样存在 /{handler}/photo，必须优先使用老版专属节点判定。
    variant:
      legacyRoot || legacyName ? 'legacy' : photoAnchor ? 'new' : 'unknown',
    twitterId:
      legacyRoot || legacyName ? '' : profileBannerTwitterId,
    root: legacyRoot || legacyName || photoAnchor?.closest<HTMLElement>('main') || main,
    actionHost: legacyRoot || newActionHost,
    nameHost: legacyName || nameHost,
    noteHost: legacyName || newNoteHost,
    statsHost:
      legacyRoot || legacyName
        ? legacyFollowingAnchor?.parentElement?.parentElement || null
        : newFollowingAnchor?.parentElement || null,
    avatarImg:
      legacyRoot || legacyName ? legacyAvatarImg : newAvatarImg,
    bannerImg:
      legacyRoot || legacyName ? legacyBannerImg : newBannerImg,
    followButton: legacyFollowButton || newFollowButton,
    handler: legacyHandler || handler,
    displayName:
      (legacyName?.textContent || '').split('@')[0]?.trim() ||
      (headMatchesHandler ? authorMeta?.content : '') ||
      profileH1?.textContent?.trim() ||
      '',
    avatar:
      legacyAvatarImg?.src ||
      (headMatchesHandler ? imageMeta?.content : '') ||
      newAvatarImg?.src ||
      '',
    followState:
      getLegacyFollowState(legacyFollowButton) ||
      getNewFollowState(newActionHost || main),
  });
};

export const resolveSidebarProfileLink = (): HTMLAnchorElement | null => {
  const legacy = document.querySelector<HTMLAnchorElement>(
    'a[data-testid="AppTabBar_Profile_Link"]',
  );
  if (legacy) return legacy;

  const navs = document.querySelectorAll<HTMLElement>('nav');
  for (const nav of navs) {
    // 图标只负责定位候选入口，profile href 校验负责排除其它 person 类入口。
    const icons = nav.querySelectorAll<SVGElement>(
      'svg[data-icon="icon-person"], svg[data-icon="icon-person-fill"]',
    );
    for (const icon of icons) {
      const anchor = icon.closest<HTMLAnchorElement>('a[href]');
      if (anchor && getProfileHandleFromHref(anchor.getAttribute('href'))) {
        return anchor;
      }
    }
  }
  return null;
};

export const resolveNewSidebarInsertionAnchor = (): HTMLElement | null => {
  const navs = document.querySelectorAll<HTMLElement>('nav');
  for (const nav of navs) {
    const premiumLink = Array.from(
      nav.querySelectorAll<HTMLAnchorElement>('a[href]'),
    ).find((anchor) => {
      const pathname = getPathname(anchor.getAttribute('href'));
      return (
        pathname === '/i/premium_sign_up' ||
        Boolean(anchor.querySelector('svg[data-icon="icon-verified-premium"]'))
      );
    });
    if (premiumLink) {
      return premiumLink;
    }

    const profileLink = Array.from(
      nav.querySelectorAll<HTMLAnchorElement>('a[href]'),
    ).find((anchor) => {
      const hasProfileIcon = Boolean(
        anchor.querySelector(
          'svg[data-icon="icon-person"], svg[data-icon="icon-person-fill"]',
        ),
      );
      return (
        hasProfileIcon &&
        Boolean(getProfileHandleFromHref(anchor.getAttribute('href')))
      );
    });
    if (!profileLink) continue;

    let previous = profileLink.previousElementSibling;
    while (
      previous instanceof HTMLElement &&
      (previous.getAttribute('data-plasmo-shadow-container') === 'true' ||
        previous.getAttribute('data-xhunt-new-sidebar-host') === 'true')
    ) {
      previous = previous.previousElementSibling;
    }
    if (previous instanceof HTMLElement) {
      return previous;
    }
  }
  return null;
};

export const resolveRightRailBase = (): HTMLElement | null => {
  const legacy = document.querySelector<HTMLElement>(
    "div[data-testid='sidebarColumn'] div[aria-label][tabindex] > div:first-child",
  );
  if (legacy) return legacy;

  const aside = document.querySelector<HTMLElement>('aside');
  // 同时要求 aside 和搜索框，避免把 main 内的普通 section 当成右侧栏。
  const searchInput = aside?.querySelector<HTMLInputElement>(
    'form[role="search"] input[data-testid="SearchBox_Search_Input"]',
  );
  if (!aside || !searchInput) return null;

  let current: HTMLElement | null = searchInput.closest('form');
  while (current && current !== aside) {
    const directSection = Array.from(current.children).find(
      (child) => child.tagName === 'SECTION',
    );
    if (directSection instanceof HTMLElement) {
      return directSection;
    }
    current = current.parentElement;
  }

  return aside.querySelector<HTMLElement>('section');
};

export interface TweetDomSnapshot {
  variant: XDomVariant;
  article: HTMLElement;
  card: HTMLElement;
  tweetId: string;
  handler: string;
  displayName: string;
  avatarHost: HTMLElement | null;
  avatarImg: HTMLImageElement | null;
  authorNameHost: HTMLElement | null;
  textHost: HTMLElement | null;
  moreButton: HTMLButtonElement | null;
}

const resolveLegacyTweetDom = (
  article: HTMLElement,
): TweetDomSnapshot | null => {
  if (!article.matches(LEGACY_TWEET_SELECTOR)) return null;
  const authorNameHost = article.querySelector<HTMLElement>(
    'div[data-testid="User-Name"], div[data-testid="UserName"]',
  );
  const profileLinks = authorNameHost?.querySelectorAll<HTMLAnchorElement>(
    'a[href]',
  );
  let handler = '';
  profileLinks?.forEach((link) => {
    handler ||= getProfileHandleFromHref(link.getAttribute('href'));
  });
  const statusLink = article.querySelector<HTMLAnchorElement>(
    'a[href*="/status/"]',
  );
  const tweetId = getPathname(statusLink?.getAttribute('href')).match(
    /\/status\/(\d+)/,
  )?.[1] || '';
  const avatarHost = article.querySelector<HTMLElement>(
    '[data-testid="Tweet-User-Avatar"] [data-testid^="UserAvatar-Container-"], [data-testid^="UserAvatar-Container-"]',
  );
  const avatarImg = avatarHost?.querySelector<HTMLImageElement>('img') || null;

  return {
    variant: 'legacy',
    article,
    card: article,
    tweetId,
    handler,
    displayName:
      authorNameHost?.querySelector('span')?.textContent?.trim() || '',
    avatarHost,
    avatarImg,
    authorNameHost,
    textHost: article.querySelector<HTMLElement>('[data-testid="tweetText"]'),
    moreButton: article.querySelector<HTMLButtonElement>(
      'button[data-testid="caret"]',
    ),
  };
};

const getStatusMatch = (href?: string | null) =>
  getPathname(href).match(/^\/([A-Za-z0-9_]+)\/status\/(\d+)/);

const findStatusMatchInArticle = (
  article: HTMLElement,
  expectedTweetId: string,
): RegExpMatchArray | null => {
  const candidates = article.querySelectorAll<HTMLElement>(
    'a[href*="/status/"], [data-href*="/status/"]',
  );
  for (const candidate of candidates) {
    if (candidate.closest('article') !== article) continue;
    const match = getStatusMatch(
      candidate.getAttribute('data-href') || candidate.getAttribute('href'),
    );
    if (match?.[2] === expectedTweetId) return match;
  }
  return null;
};

const resolveNewTweetDom = (
  article: HTMLElement,
  expectedTweetId = '',
): TweetDomSnapshot | null => {
  const parent = article.parentElement;
  const isStatusCard = Boolean(
    parent &&
      parent.getAttribute('role') === 'link' &&
      parent.getAttribute('data-href')?.includes('/status/'),
  );
  const detailStatusMatch = expectedTweetId
    ? findStatusMatchInArticle(article, expectedTweetId)
    : null;
  // 新版页面中 article 用途较多，必须同时满足 status 卡片和作者头像语义锚点。
  if (
    !parent ||
    (!isStatusCard && !detailStatusMatch) ||
    parent.getAttribute('data-slot') === 'embedded-tweet-frame' ||
    !article.querySelector('[data-post-avatar="true"]')
  ) {
    return null;
  }

  const card = isStatusCard ? parent : article;
  const statusMatch = isStatusCard
    ? getStatusMatch(parent.getAttribute('data-href'))
    : detailStatusMatch;
  const avatarMarker = article.querySelector<HTMLElement>(
    '[data-post-avatar="true"]',
  );
  const avatarAnchor = avatarMarker?.querySelector<HTMLAnchorElement>(
    'a[href]',
  );
  const handler = normalizeHandle(
    getProfileHandleFromHref(avatarAnchor?.getAttribute('href')) ||
      statusMatch?.[1],
  );
  const profileLinks = Array.from(
    article.querySelectorAll<HTMLAnchorElement>('a[href]'),
  ).filter(
    (link) =>
      link.closest('article') === article &&
      normalizeHandle(getProfileHandleFromHref(link.getAttribute('href'))) ===
        handler,
  );
  // 新版时间线的 data-post-avatar 可能只是布局占位，真实头像位于作者信息行。
  const avatarProfileLink = profileLinks.find((link) =>
    Boolean(link.querySelector('.x-avatar img, img')),
  );
  const markerAvatarHost =
    avatarMarker?.querySelector<HTMLElement>('.x-avatar') || null;
  const linkedAvatarHost =
    avatarProfileLink?.querySelector<HTMLElement>('.x-avatar') ||
    avatarProfileLink ||
    null;
  const avatarHost =
    (markerAvatarHost?.querySelector('img') ? markerAvatarHost : null) ||
    linkedAvatarHost ||
    markerAvatarHost ||
    avatarMarker;
  const avatarImg = avatarHost?.querySelector<HTMLImageElement>('img') || null;
  const authorLinks = profileLinks.filter(
    (link) =>
      !link.closest('[data-post-avatar="true"]') &&
      link !== avatarProfileLink &&
      !link.querySelector('img, .x-avatar'),
  );
  const displayLink = authorLinks.find(
    (link) => {
      const text = link.textContent?.trim() || '';
      return Boolean(text && !text.startsWith('@'));
    },
  );
  const handleLink = authorLinks.find((link) =>
    link.textContent?.trim().startsWith('@'),
  );
  const authorNameHost =
    displayLink && handleLink
      ? findCommonAncestor(displayLink, handleLink, article)
      : displayLink?.parentElement || handleLink?.parentElement || null;
  const textHosts = Array.from(
    article.querySelectorAll<HTMLElement>('div[dir="auto"][lang]'),
    // 引用帖也可能有相同正文结构，只接受属于当前顶层 article 的节点。
  ).filter((element) => element.closest('article') === article);
  const moreIcon = Array.from(
    article.querySelectorAll<SVGUseElement>('use[href]'),
  ).find((use) => use.getAttribute('href') === '#icon-more-dots-hor');
  const moreButton =
    article
      .querySelector<SVGElement>('svg[data-icon="icon-more-dots-hor"]')
      ?.closest<HTMLButtonElement>('button') ||
    moreIcon?.closest<HTMLButtonElement>('button') ||
    null;

  return {
    variant: 'new',
    article,
    card,
    tweetId: statusMatch?.[2] || '',
    handler,
    displayName: displayLink?.textContent?.trim() || '',
    avatarHost,
    avatarImg,
    authorNameHost,
    textHost: textHosts[0] || null,
    moreButton,
  };
};

export const resolveTweetDom = (
  article: HTMLElement,
): TweetDomSnapshot | null =>
  resolveLegacyTweetDom(article) || resolveNewTweetDom(article);

export const resolveTweetCards = (
  root: ParentNode = document,
): TweetDomSnapshot[] => {
  const snapshots: TweetDomSnapshot[] = [];
  const seen = new Set<HTMLElement>();
  const candidates = root.querySelectorAll<HTMLElement>(
    `${LEGACY_TWEET_SELECTOR}, [role="link"][data-href*="/status/"] > article`,
  );
  candidates.forEach((article) => {
      if (seen.has(article)) return;
      const snapshot = resolveTweetDom(article);
      if (!snapshot) return;
      seen.add(article);
      snapshots.push(snapshot);
    });
  return snapshots;
};

const logTweetDetailDom = (
  snapshot: TweetDomSnapshot | null,
): TweetDomSnapshot | null => {
  return snapshot;
};

/**
 * 解析当前详情页的主推文。新版详情页的 article 不一定由可点击的
 * status card 包裹，因此使用当前 URL 中的 tweet id 与 article 内的
 * status 业务链接交叉确认，避免误取“相关推文”或引用推文。
 */
export const resolveTweetDetailDom = (
  tweetIdInput?: string,
): TweetDomSnapshot | null => {
  const tweetId =
    String(tweetIdInput || '').match(/^\d+$/)?.[0] ||
    window.location.pathname.match(/\/status\/(\d+)/)?.[1] ||
    '';
  if (!tweetId) return logTweetDetailDom(null);

  const legacyArticles = Array.from(
    document.querySelectorAll<HTMLElement>(LEGACY_TWEET_SELECTOR),
  );
  const legacyArticle =
    legacyArticles.find((article) =>
      Array.from(article.querySelectorAll<HTMLAnchorElement>('a[href]')).some(
        (anchor) => getStatusMatch(anchor.getAttribute('href'))?.[2] === tweetId,
      ),
    ) ||
    legacyArticles.find((article) => article.getAttribute('tabindex') === '-1');
  if (legacyArticle) {
    return logTweetDetailDom(resolveLegacyTweetDom(legacyArticle));
  }

  const cardSnapshot = resolveTweetCards().find(
    (snapshot) => snapshot.tweetId === tweetId,
  );
  if (cardSnapshot) return logTweetDetailDom(cardSnapshot);

  const articles = document.querySelectorAll<HTMLElement>('article');
  for (const article of articles) {
    const snapshot = resolveNewTweetDom(article, tweetId);
    if (snapshot?.tweetId === tweetId) {
      return logTweetDetailDom(snapshot);
    }
  }
  return logTweetDetailDom(null);
};

export const resolveTweetDetailMoreButton = (): HTMLButtonElement | null =>
  resolveTweetDetailDom()?.moreButton || null;

export const resolveAvatarHandle = (avatarHost: HTMLElement): string => {
  const testId = avatarHost.getAttribute('data-testid') || '';
  const legacyMatch = testId.match(/^UserAvatar-Container-(.+)$/);
  if (legacyMatch?.[1] && legacyMatch[1] !== 'unknown') {
    return normalizeHandle(legacyMatch[1]);
  }

  const anchor = avatarHost.closest<HTMLAnchorElement>('a[href]') ||
    avatarHost.querySelector<HTMLAnchorElement>('a[href]');
  const hrefHandle = getProfileHandleFromHref(anchor?.getAttribute('href'));
  if (hrefHandle) return hrefHandle;

  const alt = avatarHost.querySelector<HTMLImageElement>('img[alt^="@"]')?.alt;
  return normalizeHandle(alt);
};

export const isTweetAvatarHost = (avatarHost: HTMLElement): boolean =>
  Boolean(
    avatarHost.closest('[data-testid="Tweet-User-Avatar"]') ||
      avatarHost.closest('article [data-post-avatar="true"]'),
  );

export const resolveHomeComposerBase = (): HTMLElement | null => {
  const legacy = document.querySelector<HTMLElement>(
    "div[data-testid='primaryColumn'] div.css-175oi2r.r-1h8ys4a",
  );
  if (legacy) return legacy;

  const dropzone = document.querySelector<HTMLElement>(
    'main [data-media-upload-dropzone]',
  );
  // dropzone 与 textarea 必须成对出现，避免媒体上传弹层被误认为首页编辑器。
  if (!dropzone?.querySelector('textarea[aria-multiline="true"]')) {
    return null;
  }

  const submitButton = Array.from(
    dropzone.querySelectorAll<HTMLButtonElement>('button[data-slot="xds-button"]'),
  ).find((button) => button.type === 'button' && !button.querySelector('svg'));
  return submitButton || dropzone;
};

const findNewComposerDropzone = (root: ParentNode): HTMLElement | null => {
  if (
    root instanceof HTMLElement &&
    root.hasAttribute('data-media-upload-dropzone') &&
    root.querySelector('textarea[aria-multiline="true"]')
  ) {
    return root;
  }

  const dropzones = root.querySelectorAll<HTMLElement>(
    '[data-media-upload-dropzone]',
  );
  for (const dropzone of dropzones) {
    if (dropzone.querySelector('textarea[aria-multiline="true"]')) {
      return dropzone;
    }
  }
  return null;
};

const resolveComposeModalRoot = (): HTMLElement | null => {
  const modalRoots = document.querySelectorAll<HTMLElement>(
    '[role="dialog"][aria-modal="true"], dialog[open], [role="dialog"], dialog',
  );
  for (const modalRoot of modalRoots) {
    if (findNewComposerDropzone(modalRoot)) return modalRoot;
  }

  // 新版弹窗由 portal 渲染时可能没有 dialog 语义；排除 main 内的首页发帖器。
  const dropzones = document.querySelectorAll<HTMLElement>(
    '[data-media-upload-dropzone]',
  );
  for (const dropzone of dropzones) {
    if (
      !dropzone.closest('main') &&
      dropzone.querySelector('textarea[aria-multiline="true"]')
    ) {
      return dropzone;
    }
  }
  return null;
};

export const resolveComposeModalBase = (): HTMLElement | null => {
  const legacy = document.querySelector<HTMLElement>(
    "div[data-viewportview] button[data-testid='unsentButton']",
  );
  if (legacy) return legacy;

  const modalRoot = resolveComposeModalRoot();
  if (!modalRoot) return null;
  const dropzone = findNewComposerDropzone(modalRoot);
  if (!dropzone) return null;

  // 优先挂在编辑器外的文字动作旁（当前是 Draft），避免依赖本地化文案。
  const headerAction = Array.from(
    modalRoot.querySelectorAll<HTMLButtonElement>(
      'button[data-slot="xds-button"]',
    ),
  ).find((button) => !dropzone.contains(button) && !button.querySelector('svg'));
  if (headerAction) {
    return headerAction;
  }

  const nativeHeaderAction = Array.from(
    modalRoot.querySelectorAll<HTMLButtonElement>('button'),
  ).find(
    (button) =>
      !dropzone.contains(button) &&
      !button.querySelector('svg') &&
      Boolean(button.textContent?.trim()),
  );
  if (nativeHeaderAction) {
    return nativeHeaderAction;
  }

  const submitButton = Array.from(
    dropzone.querySelectorAll<HTMLButtonElement>(
      'button[data-slot="xds-button"]',
    ),
  ).find((button) => button.type === 'button' && !button.querySelector('svg'));
  return submitButton || dropzone;
};

export const getComposeText = (root: ParentNode = document): string => {
  const legacyEditor = root.querySelector<HTMLElement>(
    "div[data-testid='tweetTextarea_0RichTextInputContainer'] div[class~='DraftEditor-root']",
  );
  if (legacyEditor) {
    const lines = Array.from(
      legacyEditor.querySelectorAll<HTMLElement>('div[data-block="true"]'),
    ).map((block) => {
      if (block.querySelector('br[data-text="true"]')) return '';
      return Array.from(block.querySelectorAll('span[data-text="true"]'))
        .map((span) => span.textContent || '')
        .join('');
    });
    return lines.join('\n').trim();
  }

  const dropzone = findNewComposerDropzone(root);
  return (
    dropzone?.querySelector<HTMLTextAreaElement>(
      'textarea[aria-multiline="true"]',
    )?.value || ''
  ).trim();
};

export const getComposeModalText = (): string => {
  const legacyBase = document.querySelector<HTMLElement>(
    "div[data-viewportview] button[data-testid='unsentButton']",
  );
  const legacyRoot = legacyBase?.closest<HTMLElement>('div[data-viewportview]');
  if (legacyRoot) return getComposeText(legacyRoot);

  const modalRoot = resolveComposeModalRoot();
  return modalRoot ? getComposeText(modalRoot) : '';
};

export const resolveComposeModalEditor = (): HTMLElement | null => {
  const legacyBase = document.querySelector<HTMLElement>(
    "div[data-viewportview] button[data-testid='unsentButton']",
  );
  const legacyRoot = legacyBase?.closest<HTMLElement>('div[data-viewportview]');
  if (legacyRoot) {
    return legacyRoot.querySelector<HTMLElement>(
      "div[data-testid='tweetTextarea_0RichTextInputContainer']",
    );
  }

  const modalRoot = resolveComposeModalRoot();
  return modalRoot ? findNewComposerDropzone(modalRoot) : null;
};

export const getHomeComposerText = (): string => {
  const main = document.querySelector<HTMLElement>('main');
  return main ? getComposeText(main) : '';
};

export const resolveHomeComposerEditor = (): HTMLElement | null => {
  const main = document.querySelector<HTMLElement>('main');
  return main ? findNewComposerDropzone(main) : null;
};

