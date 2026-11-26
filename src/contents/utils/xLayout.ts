// X web exposes native landmarks on the new layout. Keep the original
// anchors for accounts still on the data-testid layout.
export const sidebarNavAnchor =
  'a[data-testid="AppTabBar_Profile_Link"], nav:not(:has([data-testid="AppTabBar_Profile_Link"])):has(> a[href="/notifications"]) > a[href="/home"]';

export const sidebarPanelAnchor =
  'div[data-testid="sidebarColumn"] div[aria-label][tabindex] > div:first-child, main + aside div:has(> div > form[role="search"]) ~ section:first-of-type';

// The profile heading and the two relationship links share a header.
const profileHeader =
  'main:not(:has([data-testid="primaryColumn"])) div:not(article *)' +
  ':has(> div > a[href$="/following"])' +
  ':has(> div > a:is([href$="/followers"], [href$="/verified_followers"]))';

export const profileNameAnchor =
  `div[data-testid="UserName"], ${profileHeader} > div div:has(> span > :is(h1, h2))`;

export const profileFollowingLink =
  `${profileHeader} > div > a[href$="/following"]`;

export function followingLinkForProfile(handle: string) {
  return `${profileFollowingLink}[href="/${CSS.escape(handle)}/following" i]`;
}
