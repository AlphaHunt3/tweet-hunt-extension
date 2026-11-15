import { expect, type BrowserContext, type Page, type TestInfo } from '@playwright/test';
import { xcomUrl } from '../fixtures/accounts';
import { xhuntSelectors } from '../fixtures/selectors';
import { seedCompletedDomainSetup, setExtensionStorage } from './seedStorage';
import { waitForXHomeTimelineReady, waitForXhuntPanelSettled } from './xcomReady';

export async function normalizeXhuntState(context: BrowserContext) {
  await seedCompletedDomainSetup(context);
  await setExtensionStorage(context, {
    '@settings/showPanel': true,
    '@settings/showSidebarIcon': true,
    '@settings/showAvatarRank': true,
    '@settings/showTokenAnalysis': true,
    '@settings/showTweetAIAnalysis': true,
    '@settings/showArticleBottomRightArea': true,
    '@settings/showAiDetectButton': true,
    '@settings/showSearchPanel': true,
    '@settings/showNotes': true,
    '@settings/showReviews': true,
    '@settings/showAiAvatarButton': true,
    '@xhunt/panelMinimized': false,
    '@xhunt/panelWidth': 340,
    '@xhunt/floatingPanelMode': 'default',
  });
}

export async function openHomeWithXhunt(page: Page, context: BrowserContext) {
  await normalizeXhuntState(context);
  await page.goto(xcomUrl('/home'), { waitUntil: 'domcontentloaded' });
  await waitForXHomeTimelineReady(page);
  await expect(page.locator(xhuntSelectors.root).first()).toBeAttached({
    timeout: 30_000,
  });
}

export async function setSettingChecked(
  page: Page,
  key: string,
  checked: boolean,
  options: { forceWrite?: boolean } = {},
) {
  const item = page.locator(xhuntSelectors.settingsItem(key)).first();
  const toggle = page.locator(xhuntSelectors.settingsToggle(key)).first();

  await expect(item, `设置项 ${key} 应该可见`).toBeVisible({ timeout: 30_000 });
  await item.scrollIntoViewIfNeeded();

  const currentChecked = await toggle.isChecked();
  if (currentChecked === checked && !options.forceWrite) return;

  if (currentChecked === checked && options.forceWrite) {
    await toggle.click();
    await expect(toggle).toBeChecked({ checked: !checked, timeout: 30_000 });
    await page.waitForTimeout(300);
  }

  await toggle.click();
  await expect(toggle).toBeChecked({ checked, timeout: 30_000 });
  await page.waitForTimeout(500);
}

export async function expandSettingsGroup(page: Page, key: string) {
  const group = page.locator(xhuntSelectors.settingsGroup(key)).first();
  const header = page.locator(xhuntSelectors.settingsGroupHeader(key)).first();
  const body = group.locator('[data-settings-body]').first();

  // 柔光的分组可以折叠，「更多」里的分组是二级页：内容区不可见时点一下分组头
  if ((await group.count()) > 0 && (await body.isVisible().catch(() => false))) return;

  await expect(header, `设置分组 ${key} 应该可见`).toBeVisible({ timeout: 30_000 });
  await header.scrollIntoViewIfNeeded();
  await header.click();
  await expect(
    page.locator(xhuntSelectors.settingsGroup(key)).locator('[data-settings-body]').first(),
  ).toBeVisible({ timeout: 30_000 });
}

export async function openComposeModal(page: Page) {
  const composeSelectors = [
    '[data-testid="SideNav_NewTweet_Button"]',
    'a[href="/compose/post"]',
    'a[href="/compose/tweet"]',
  ];

  for (const selector of composeSelectors) {
    const locator = page.locator(selector).first();
    if (await locator.isVisible().catch(() => false)) {
      await locator.click();
      break;
    }
  }

  if (!(await page.locator('[role="dialog"] [role="textbox"]').first().isVisible().catch(() => false))) {
    await page.goto(xcomUrl('/compose/post'), { waitUntil: 'domcontentloaded' }).catch(() => undefined);
  }

  const textbox = page.locator('[role="dialog"] [role="textbox"], [data-testid="tweetTextarea_0"]').first();
  await expect(textbox).toBeVisible({ timeout: 30_000 });
  return textbox;
}

export async function attachOptionalScreenshot(
  page: Page,
  testInfo: TestInfo,
  name: string,
) {
  const fileName = `${name.replace(/[^a-z0-9_-]+/gi, '-').toLowerCase()}.png`;
  const screenshotPath = testInfo.outputPath(fileName);
  await page.screenshot({ path: screenshotPath, fullPage: false }).catch(() => undefined);
  await testInfo.attach(`evidence-${name}`, {
    path: screenshotPath,
    contentType: 'image/png',
  }).catch(() => undefined);
}

export async function waitForPanelWidth(page: Page, expectedWidth: number) {
  await expect
    .poll(async () => {
      const panel = page.locator(xhuntSelectors.fixedTwitterPanel).first();
      return panel.evaluate((element) => {
        const content = element.querySelector('.panel-route-content')?.parentElement as HTMLElement | null;
        const panelBox = content || (element as HTMLElement);
        return Math.round(panelBox.getBoundingClientRect().width);
      });
    }, { timeout: 30_000 })
    .toBeGreaterThanOrEqual(expectedWidth - 5);
  await waitForXhuntPanelSettled(page);
}
