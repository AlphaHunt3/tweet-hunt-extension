import { expect, test } from '@playwright/test';
import {
  profileFollowingLink,
  profileNameAnchor,
  sidebarNavAnchor,
  sidebarPanelAnchor,
} from '../../src/contents/utils/xLayout';

test.use({ channel: 'chromium' });

test('keeps the original XHunt panel anchors on the legacy layout', async ({ page }) => {
  await page.setContent(`
    <nav role="navigation"><a href="/home"></a><a href="/notifications"></a>
      <a data-testid="AppTabBar_Profile_Link" id="profile"></a></nav>
    <main><div data-testid="primaryColumn"><div data-testid="UserName" id="name"></div></div>
      <div data-testid="sidebarColumn"><div aria-label="Timeline" tabindex="0">
        <div id="panel"></div></div></div></main>`);
  await expect(page.locator(sidebarNavAnchor)).toHaveId('profile');
  await expect(page.locator(sidebarPanelAnchor)).toHaveId('panel');
  await expect(page.locator(profileNameAnchor)).toHaveId('name');
  await expect(page.locator(profileFollowingLink)).toHaveCount(0);
});

test('finds the native X web panels without using translated labels', async ({ page }) => {
  await page.setContent(`
    <nav><a id="home" href="/home"></a><a href="/notifications"></a></nav>
    <main><div><div><div><a href="/example/photo"></a></div>
      <div id="name"><span><h1>Example</h1></span><span>@example</span></div></div>
      <div><a href="/example/following"></a><a href="/example/verified_followers"></a></div></div>
      <article><span><h2>Embedded account</h2></span></article></main>
    <aside><div><div><div><form role="search"></form></div></div>
      <section id="panel"></section><section></section></div></aside>`);
  await expect(page.locator(sidebarNavAnchor)).toHaveId('home');
  await expect(page.locator(sidebarPanelAnchor)).toHaveId('panel');
  await expect(page.locator(profileNameAnchor)).toHaveId('name');
  await expect(page.locator(profileFollowingLink)).toHaveAttribute('href', '/example/following');
});

test('leaves unrelated headings, navigation and search results alone', async ({ page }) => {
  await page.setContent(`
    <main><div><span><h1>Search results</h1></span></div>
      <article><div><div><div><span><h2>Quoted account</h2></span></div></div>
        <div><a href="/someone/following"></a><a href="/someone/followers"></a></div>
      </div></article></main>
    <aside><section>Suggestions</section><nav><a href="/home"></a></nav></aside>`);
  for (const selector of [sidebarNavAnchor, sidebarPanelAnchor, profileNameAnchor, profileFollowingLink]) {
    await expect(page.locator(selector)).toHaveCount(0);
  }
});
