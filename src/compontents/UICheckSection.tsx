import { useEffect } from 'react';
import { useLocalStorage } from '~storage/useLocalStorage';
import useWaitForElement from '~contents/hooks/useWaitForElement.ts';
import useCurrentUrl from '~contents/hooks/useCurrentUrl.ts';

export function UICheckSection() {
  const [username, setUsername] = useLocalStorage('@xhunt/current-username', '');
  const [theme, setTheme] = useLocalStorage('@xhunt/theme', 'dark');
  const currentUrl = useCurrentUrl();

  // Wait for the account switcher button with 60s timeout
  const switcherButton = useWaitForElement('[data-testid="SideNav_AccountSwitcher_Button"]', [], 60000);
  const sectionDom = useWaitForElement('main section[aria-labelledby="accessible-list-1"]', [], 60000);
  useEffect(() => {
    if (!switcherButton) return;

    // Get username from switcher button
    const avatarContainer = switcherButton.querySelector('div[data-testid^="UserAvatar-Container-"]');
    if (avatarContainer) {
      const testId = avatarContainer.getAttribute('data-testid');
      if (testId) {
        const extractedUsername = testId.replace('UserAvatar-Container-', '');
        if (extractedUsername && extractedUsername !== username) {
          setUsername(extractedUsername);
        }
      }
    }

    // Check and update theme if needed
    // @ts-ignore
    const _theme = (document?.documentElement?.style || {})?.['color-scheme'];
    const newTheme = _theme === 'light' ? 'light' : 'dark';

    if (theme !== newTheme) {
      setTheme(newTheme);
    }

    const body = document.body;
    if (body && !body.hasAttribute('data-theme')) {
      body.setAttribute('data-theme', newTheme);
    }
  }, [switcherButton, currentUrl, username, theme]);

  useEffect(() => {
    if (!sectionDom) return;
    checkAndFixZIndex()
  }, [sectionDom]);

  return <div style={{
    opacity: 0
  }} />;
}

/** 必须修复，不然悬浮框有问题 **/
const checkAndFixZIndex = () => {
  const section = document.querySelector('main section[aria-labelledby="accessible-list-1"]');
  if (!section) return false;

  const prevSibling = section.previousElementSibling?.previousElementSibling as HTMLElement;
  if (prevSibling) {
    prevSibling.style.zIndex = '99';

    // 查找第一个 div 子元素
    let firstDiv: HTMLElement | null = null;
    for (let i = 0; i < prevSibling.children.length; i++) {
      const child = prevSibling.children[i];
      if (child.tagName === 'DIV') {
        firstDiv = child as HTMLElement;
        break;
      }
    }

    if (firstDiv) {
      firstDiv.style.zIndex = '99';
    }
  }
  return !!prevSibling;
};
