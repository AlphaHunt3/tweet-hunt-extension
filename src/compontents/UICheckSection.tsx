import { useEffect } from 'react';
import { useLocalStorage } from '~storage/useLocalStorage';
import useWaitForElement from '~contents/hooks/useWaitForElement.ts';
import useCurrentUrl from '~contents/hooks/useCurrentUrl.ts';
import { checkMainSectionAndFixZIndex } from '~contents/hooks/useShadowContainer.ts';
import { useDebounceEffect } from 'ahooks';

export function UICheckSection() {
  const [username, setUsername] = useLocalStorage(
    '@xhunt/current-username',
    ''
  );
  const [theme, setTheme] = useLocalStorage('@xhunt/theme', 'dark');
  const currentUrl = useCurrentUrl();

  // Wait for the account switcher button with 60s timeout
  const switcherButton = useWaitForElement(
    '[data-testid="SideNav_AccountSwitcher_Button"]',
    [],
    60000
  );
  const sectionDom = useWaitForElement('main [aria-label] section', [], 60000);
  useEffect(() => {
    if (!switcherButton) return;

    // Get username from switcher button
    const avatarContainer = switcherButton.querySelector(
      'div[data-testid^="UserAvatar-Container-"]'
    );
    if (avatarContainer) {
      const testId = avatarContainer.getAttribute('data-testid');
      if (testId) {
        const extractedUsername = testId.replace('UserAvatar-Container-', '');
        if (extractedUsername && extractedUsername !== username) {
          setUsername(extractedUsername);
        }
      }
    }
  }, [switcherButton, currentUrl, username, theme]);

  useEffect(() => {
    if (!sectionDom) return;
    checkMainSectionAndFixZIndex();
  }, [sectionDom]);

  return (
    <div
      style={{
        opacity: 0,
      }}
    />
  );
}
