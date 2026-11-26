import { profileNameAnchor, sidebarNavAnchor, sidebarPanelAnchor } from '../../../src/contents/utils/xLayout';
import { profilePath, searchPath, statusPath } from './accounts';

export type XDomContractLevel = 'P0' | 'P1' | 'P2';
export type XDomContractPrepare = 'none' | 'compose-modal';

export interface XDomContract {
  name: string;
  path: string;
  selector: string;
  level: XDomContractLevel;
  usage: string;
  minCount?: number;
  prepare?: XDomContractPrepare;
  skipWhenRuntimePathMissing?: boolean;
}


export const xDomContracts: XDomContract[] = [
  {
    name: 'global-main',
    path: '/home',
    selector: 'main',
    level: 'P0',
    usage: 'system initialization, global page body and notification target fallback',
  },
  {
    name: 'sidebar-navigation-entry',
    path: '/home',
    selector: sidebarNavAnchor,
    level: 'P0',
    usage: 'XHunt navigation and onboarding entry',
  },
  {
    name: 'sidebar-panel',
    path: '/home',
    selector: sidebarPanelAnchor,
    level: 'P1',
    usage: 'XHunt desktop sidebar below search',
  },
  {
    name: 'profile-link-auth-signal',
    path: '/home',
    selector: '[data-testid="AppTabBar_Profile_Link"]',
    level: 'P0',
    usage: 'x.com logged-in environment signal used before XHunt tests',
  },
  {
    name: 'primary-column',
    path: profilePath(),
    selector: 'div[data-testid="primaryColumn"]',
    level: 'P0',
    usage: 'profile primary column and placement tracking root',
  },
  {
    name: 'profile-user-name',
    path: profilePath(),
    selector: profileNameAnchor,
    level: 'P0',
    usage: 'profile name data injection and handler fallback',
  },
  {
    name: 'target-profile-placement-tracking',
    path: '/{targetProfile}',
    selector: 'div[data-testid="primaryColumn"] div[data-testid="placementTracking"]',
    level: 'P0',
    usage: 'external profile relationship area and follow-state data extraction',
    skipWhenRuntimePathMissing: true,
  },
  {
    name: 'profile-avatar-container',
    path: profilePath(),
    selector: '[data-testid^="UserAvatar-Container-"]',
    level: 'P0',
    usage: 'avatar rank injection target',
  },
  {
    name: 'tweet-text',
    path: searchPath(),
    selector: '[data-testid="tweetText"]',
    level: 'P0',
    usage: 'tweet text parsing and token highlight',
  },
  {
    name: 'editable-textbox',
    path: '/home',
    selector: '[contenteditable="true"], [role="textbox"]',
    level: 'P0',
    usage: 'compose/comment/reply assistant input detection',
    prepare: 'compose-modal',
  },
  {
    name: 'banner-header',
    path: '/home',
    selector: 'header[role="banner"]',
    level: 'P1',
    usage: 'floating layer z-index reference',
  },
  {
    name: 'main-section',
    path: '/home',
    selector: 'main [aria-label] section',
    level: 'P1',
    usage: 'shadow container page area positioning',
  },
  {
    name: 'user-profile-schema',
    path: profilePath(),
    selector: 'script[type="application/ld+json"][data-testid="UserProfileSchema-test"]',
    level: 'P1',
    usage: 'structured user info extraction fallback',
  },
  {
    name: 'profile-edit-button',
    path: profilePath(),
    selector: 'main a[data-testid="editProfileButton"]',
    level: 'P1',
    usage: 'own-profile detection',
  },
  {
    name: 'profile-avatar-img',
    path: profilePath(),
    selector: 'div[data-testid="primaryColumn"] [data-testid*="UserAvatar-Container"] img',
    level: 'P1',
    usage: 'profile avatar image extraction',
  },
  {
    name: 'article-context',
    path: searchPath(),
    selector: 'article, article[data-testid]',
    level: 'P1',
    usage: 'tweet card context lookup',
  },
  {
    name: 'status-page-tweet-text',
    path: statusPath(),
    selector: '[data-testid="tweetText"]',
    level: 'P1',
    usage: 'tweet detail analysis button context',
  },
  {
    name: 'target-profile-follow-button-test-id',
    path: '/{targetProfile}',
    selector: 'button[data-testid$="-follow"], button[data-testid$="-unfollow"]',
    level: 'P1',
    usage: 'external profile follow relationship state extraction',
    skipWhenRuntimePathMissing: true,
  },
  {
    name: 'progressbar',
    path: '/home',
    selector: '[role="progressbar"], [data-testid="progressBar"], [data-testid="progressBar-bar"]',
    level: 'P2',
    usage: 'navigation loading-state detection',
  },
  {
    name: 'error-detail',
    path: '/home',
    selector: 'div[data-testid="error-detail"]',
    level: 'P2',
    usage: 'x.com error page detection; only present in error cases',
    minCount: 0,
  },
];
