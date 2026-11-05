import { subscribeToMutation } from '~contents/hooks/useGlobalMutationObserver';
import { localStorageInstance } from '~storage/index';
import { navigateInX } from '~contents/utils/navigateInX';

const PENDING_BLOCK_KEY = '@xhunt/pending-block-intent';
const INTENT_TTL_MS = 30000;
const WAIT_TIMEOUT_MS = 10000;

export type NativeBlockAction = 'block' | 'unblock';

function currentPathHandle(): string {
  return window.location.pathname
    .replace(/^\//, '')
    .split('/')[0]
    .toLowerCase();
}

/**
 * 等待目标主页渲染完成后，自动执行屏蔽/解除屏蔽操作，唤起 X 官方确认弹窗
 * （最终确认由用户本人点击，插件不代为调用接口）
 */
function startNativeBlockAutomation(handle: string, action: NativeBlockAction) {
  let stage: 'menu' | 'block' = 'menu';
  let menuOpenedAt = 0;
  const startedAt = Date.now();
  let unsubscribe: (() => void) | null = null;
  let timeoutTimer: ReturnType<typeof setTimeout> | null = null;

  const finish = () => {
    if (timeoutTimer) {
      clearTimeout(timeoutTimer);
      timeoutTimer = null;
    }
    if (unsubscribe) {
      unsubscribe();
      unsubscribe = null;
    }
  };

  const clearIntent = () => {
    void localStorageInstance.remove(PENDING_BLOCK_KEY).catch(() => {});
  };

  // 目标主页内容确实渲染完成（而不是还停留在跳转前的旧页面），避免误点旧页面的菜单
  const isTargetProfileReady = () => {
    const nameEls = document.querySelectorAll(
      "div[data-testid='User-Name'], div[data-testid='UserName']"
    );
    for (const el of nameEls) {
      if ((el.textContent || '').toLowerCase().includes(`@${handle}`)) {
        return true;
      }
    }
    return false;
  };

  const tryProceed = () => {
    if (Date.now() - startedAt > WAIT_TIMEOUT_MS) {
      finish();
      return;
    }
    // 尚未跳转到目标主页时继续等待，避免误点其他主页的按钮
    if (currentPathHandle() !== handle) return;
    // 主页内容尚未切换到目标用户时继续等待
    if (!isTargetProfileReady()) return;

    if (action === 'unblock') {
      // 已屏蔽账号的主页头部直接展示“已屏蔽”按钮，点击即弹出官方解除确认框
      const unblockBtn = document.querySelector<HTMLElement>(
        'button[data-testid$="-unblock"]'
      );
      if (!unblockBtn) return;
      unblockBtn.click();
      clearIntent();
      finish();
      return;
    }

    if (stage === 'menu') {
      const moreBtn = document.querySelector<HTMLElement>(
        '[data-testid="userActions"]'
      );
      if (!moreBtn) return;
      moreBtn.click();
      menuOpenedAt = Date.now();
      stage = 'block';
      return;
    }
    // 已屏蔽的账号菜单里只有 unblock 项，无需再操作
    if (document.querySelector('[data-testid="unblock"]')) {
      finish();
      return;
    }
    const blockItem = document.querySelector<HTMLElement>(
      '[data-testid="block"]'
    );
    if (blockItem) {
      blockItem.click();
      // 弹窗已唤起，清理意图标记
      clearIntent();
      finish();
      return;
    }
    // 菜单未成功弹出（如点击时机过早被 X 重新渲染吞掉），1 秒后关掉残留菜单重试
    if (Date.now() - menuOpenedAt > 1000) {
      document.body.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'Escape',
          bubbles: true,
          cancelable: true,
        })
      );
      stage = 'menu';
    }
  };

  unsubscribe = subscribeToMutation(
    () => tryProceed(),
    { childList: true, subtree: true },
    { debugName: 'cleaner-native-block' }
  );
  timeoutTimer = setTimeout(() => {
    finish();
  }, WAIT_TIMEOUT_MS);

  // 节点可能已渲染完成，先立即尝试一次
  tryProceed();
}

/**
 * 跳转至目标用户的 X 主页并唤起官方屏蔽/解除屏蔽确认弹窗。
 * 走项目统一的 navigateInX SPA 跳转（pushState + 路由事件通知 + 失败兜底新标签），
 * 不整页刷新，设置面板的开关、路由、滚动位置与展开折叠状态均得以保留。
 */
export function launchNativeBlock(
  handle: string,
  action: NativeBlockAction = 'block'
) {
  const clean = handle.toLowerCase().replace(/^@/, '').trim();
  if (!clean) return;

  // 写入带时间戳的意图标记：若 SPA 跳转失败，navigateInX 会兜底新标签打开，
  // 新标签页内容脚本启动时由 consumePendingBlockIntent 消费该标记
  void localStorageInstance
    .set(PENDING_BLOCK_KEY, { handle: clean, action, ts: Date.now() })
    .catch(() => {});

  // 已在目标主页时无需跳转
  if (currentPathHandle() !== clean) {
    navigateInX(`https://x.com/${clean}`);
  }

  startNativeBlockAutomation(clean, action);
}

/**
 * 内容脚本启动时调用：处理兜底新标签/整页刷新场景留下的待处理标记
 */
export function consumePendingBlockIntent() {
  void (async () => {
    let intent:
      | { handle?: string; action?: NativeBlockAction; ts?: number }
      | null
      | undefined;
    try {
      intent = await localStorageInstance.get(PENDING_BLOCK_KEY);
    } catch {
      return;
    }
    if (!intent || typeof intent.handle !== 'string' || !intent.handle) return;
    try {
      await localStorageInstance.remove(PENDING_BLOCK_KEY);
    } catch {}
    if (typeof intent.ts !== 'number' || Date.now() - intent.ts > INTENT_TTL_MS) {
      return;
    }
    const handle = intent.handle.toLowerCase();
    // 仅当确实停留在目标主页时才执行
    if (currentPathHandle() !== handle) return;
    startNativeBlockAutomation(handle, intent.action === 'unblock' ? 'unblock' : 'block');
  })();
}
