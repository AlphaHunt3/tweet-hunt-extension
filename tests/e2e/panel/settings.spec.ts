import { test, expect, type BrowserContext, type Page } from '../setup/extensionFixture';
import { xhuntSelectors } from '../fixtures/selectors';
import { openXhuntSettings } from '../setup/pluginActions';
import { getParsedExtensionStorage } from '../setup/seedStorage';
import { attachEvidence, attachEvidenceScreenshot } from '../setup/evidence';

const SETTINGS_UNDER_TEST = [
  {
    key: 'showSidebarIcon',
    storageKey: '@settings/showSidebarIcon',
    label: '显示侧边栏图标 / Show Sidebar Icon',
  },
  {
    key: 'showTweetAIAnalysis',
    storageKey: '@settings/showTweetAIAnalysis',
    label: '显示推文 AI 分析 / Show Tweet AI Analysis',
  },
  {
    key: 'showArticleBottomRightArea',
    storageKey: '@settings/showArticleBottomRightArea',
    label: '显示 XHunt 推广 / Show XHunt Boost Button',
  },
  {
    key: 'showAiDetectButton',
    storageKey: '@settings/showAiDetectButton',
    label: '显示 AI 评审按钮 / Show AI Review Button',
  },
];

async function setSettingChecked(page: Page, key: string, checked: boolean, options: { forceWrite?: boolean } = {}) {
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
  await page.waitForTimeout(300);
}

async function expectStorageValues(
  context: BrowserContext,
  expected: boolean,
) {
  const keys = SETTINGS_UNDER_TEST.map((setting) => setting.storageKey);
  const storage = await getParsedExtensionStorage<Record<string, unknown>>(
    context,
    keys,
  );

  for (const setting of SETTINGS_UNDER_TEST) {
    expect(
      storage[setting.storageKey],
      `${setting.storageKey} 应该持久化为 ${expected}`,
    ).toBe(expected);
  }

  return storage;
}

test.describe('XHunt settings page', () => {
  test('opens settings and persists multiple core switches', async ({ page, context }, testInfo) => {
    test.setTimeout(240_000);

    await openXhuntSettings(page, context);

    await expect(page.locator(xhuntSelectors.settingsPage).first()).toBeAttached({
      timeout: 30_000,
    });

    // 先归一化到开启状态，避免受上一次手工/测试残留状态影响。
    for (const setting of SETTINGS_UNDER_TEST) {
      await setSettingChecked(page, setting.key, true, { forceWrite: true });
    }
    const initialStorage = await expectStorageValues(context, true);
    await testInfo.attach('xhunt-settings-initial-storage', {
      body: JSON.stringify(initialStorage, null, 2),
      contentType: 'application/json',
    });
    await attachEvidenceScreenshot(page, testInfo, 'settings-core-switches-on');

    for (const setting of SETTINGS_UNDER_TEST) {
      await setSettingChecked(page, setting.key, false);
    }
    const disabledStorage = await expectStorageValues(context, false);
    await testInfo.attach('xhunt-settings-disabled-storage', {
      body: JSON.stringify(disabledStorage, null, 2),
      contentType: 'application/json',
    });
    await attachEvidenceScreenshot(page, testInfo, 'settings-core-switches-off');

    for (const setting of SETTINGS_UNDER_TEST) {
      await setSettingChecked(page, setting.key, true);
    }
    const restoredStorage = await expectStorageValues(context, true);
    await testInfo.attach('xhunt-settings-restored-storage', {
      body: JSON.stringify(restoredStorage, null, 2),
      contentType: 'application/json',
    });
    await attachEvidenceScreenshot(page, testInfo, 'settings-core-switches-restored');

    await attachEvidence(testInfo, [
      { name: '设置页入口', value: `${xhuntSelectors.panelSettingsButton} 点击后 ${xhuntSelectors.settingsPage} 已挂载` },
      { name: '覆盖开关数量', value: `${SETTINGS_UNDER_TEST.length}` },
      { name: '覆盖开关', value: SETTINGS_UNDER_TEST.map((setting) => `${setting.storageKey}（${setting.label}）`).join('；') },
      { name: '初始归一化', value: '全部切到 true，并验证 chrome.storage/plasmo storage 持久化为 true' },
      { name: '关闭验证', value: '逐个关闭后，全部开关 UI 变为关闭，storage 持久化为 false' },
      { name: '恢复验证', value: '逐个恢复后，全部开关 UI 变为开启，storage 持久化为 true，避免影响后续用例和手工使用' },
      { name: '证据附件', value: '包含三张设置页截图，以及 initial/disabled/restored 三份 storage JSON' },
    ]);
  });
});
