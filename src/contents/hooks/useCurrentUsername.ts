import { useEffect, useState } from 'react';
import { useDebounceEffect } from 'ahooks';
import useCurrentUrl from './useCurrentUrl';
import { useLocalStorage } from '~storage/useLocalStorage';
import useWaitForElement from './useWaitForElement';

export function useCurrentUsername() {
  const currentUrl = useCurrentUrl();
  const [username, setUsername] = useLocalStorage('@xhunt/current-username', '');
  const [domUsername, setDomUsername] = useState('');

  // Wait for the account switcher button
  const switcherButton = useWaitForElement('[data-testid="SideNav_AccountSwitcher_Button"]');

  // Initial load effect
  useEffect(() => {
    if (!username && switcherButton) {
      const avatarContainer = switcherButton.querySelector('div[data-testid^="UserAvatar-Container-"]');
      if (avatarContainer) {
        const testId = avatarContainer.getAttribute('data-testid');
        if (testId) {
          const extractedUsername = testId.replace('UserAvatar-Container-', '');
          if (extractedUsername) {
            setDomUsername(extractedUsername);
            setUsername(extractedUsername);
          }
        }
      }
    }
  }, [switcherButton, username]);

  // URL change effect
  useDebounceEffect(() => {
    const findUsername = () => {
      const switcherButton = document.querySelector('[data-testid="SideNav_AccountSwitcher_Button"]');
      if (!switcherButton) return null;

      const avatarContainer = switcherButton.querySelector('div[data-testid^="UserAvatar-Container-"]');
      if (!avatarContainer) return null;

      const testId = avatarContainer.getAttribute('data-testid');
      if (!testId) return null;

      return testId.replace('UserAvatar-Container-', '') || null;
    };

    const newUsername = findUsername();
    if (newUsername && newUsername !== domUsername) {
      setDomUsername(newUsername);
      setUsername(newUsername);
    }
  }, [currentUrl], {
    wait: 300,
    maxWait: 500
  });

  return username;
}
