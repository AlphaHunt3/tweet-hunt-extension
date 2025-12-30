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
  const currentUrl = useCurrentUrl();

  const sectionDom = useWaitForElement('main [aria-label] section', [
    currentUrl,
  ]);
  useEffect(() => {
    if (!sectionDom) return;
    checkMainSectionAndFixZIndex();
  }, [sectionDom]);

  // 从两个位置获取用户名：a标签和UserName元素
  useDebounceEffect(
    () => {
      // 方法1: 从 a[data-testid='AppTabBar_Profile_Link'] 的 href 获取
      const profileLink = document.querySelector(
        "header nav a[data-testid='AppTabBar_Profile_Link']"
      ) as HTMLAnchorElement;
      let usernameFromLink: string | null = null;
      if (profileLink) {
        // 优先使用 getAttribute('href') 获取原始值（可能是相对路径）
        const hrefAttr = profileLink.getAttribute('href');
        if (hrefAttr) {
          // 提取 href 中的用户名，例如 "/luoyukun4" -> "luoyukun4"
          const match = hrefAttr.match(/^\/([^\/\?]+)/);
          if (match && match[1]) {
            usernameFromLink = match[1];
          }
        } else if (profileLink.href) {
          // 如果没有 href 属性，尝试从 href 属性中提取
          const url = new URL(profileLink.href);
          const pathname = url.pathname;
          const match = pathname.match(/\/([^\/\?]+)/);
          if (match && match[1]) {
            usernameFromLink = match[1];
          }
        }
      }

      // 方法2: 从 [data-testid="UserName"] 元素中查找 handle
      let usernameFromUserName: string | null = null;
      const usernameElement = document.querySelector(
        '[data-testid="primaryColumn"] [data-testid="UserName"]'
      );
      if (usernameElement) {
        const spans = usernameElement.querySelectorAll('span');
        for (const span of spans) {
          const text = span.textContent?.trim() || '';
          // 要求文本以 "@" 开头，并且 "@" 后只包含大小写字母、下划线或短横线
          if (text.startsWith('@') && /^@[A-Za-z_-]+$/.test(text)) {
            usernameFromUserName = text.slice(1); // 去掉 @ 返回
            break;
          }
        }
      }

      // 优先信任 a 标签中的值，如果不一致则使用 a 标签的值
      let finalUsername: string | null = null;
      if (usernameFromLink) {
        finalUsername = usernameFromLink;
      } else if (usernameFromUserName) {
        finalUsername = usernameFromUserName;
      }
      // console.log('finalUsername', finalUsername);
      // 如果找到了用户名且与当前存储的不同，则更新
      if (finalUsername && finalUsername !== username) {
        setUsername(finalUsername);
      }
    },
    [currentUrl, sectionDom],
    {
      wait: 100,
      maxWait: 500,
      leading: true,
    }
  );

  return (
    <div
      style={{
        opacity: 0,
      }}
    />
  );
}
