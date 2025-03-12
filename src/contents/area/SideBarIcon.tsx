import useShadowContainer from '~contents/hooks/useShadowContainer.ts';
import ReactDOM from 'react-dom';
import indexText from 'data-text:~/css/index.css';
import { useSize } from 'ahooks';
import useWaitForElement from '~contents/hooks/useWaitForElement.ts';
import { useStorage } from '@plasmohq/storage/dist/hook';

export function SideBarIcon() {
  const shadowRoot = useShadowContainer({
    selector: 'a[data-testid="AppTabBar_Profile_Link"]',
    styleText: indexText,
    useSiblings: true,
    siblingsStyle: 'width:auto;height:auto;max-width:100%;min-width:50.25px'
  });
  const [showPanel, setShowPanel] = useStorage('@settings/showPanel', true);
  const sidebar = useWaitForElement('nav[role]');
  const size = useSize(sidebar?.parentElement);
  const width = size?.width || 0;
  const isExpanded = width > 72;

  if (!shadowRoot) return null;
  return ReactDOM.createPortal(
    <div className={`sidebarItem ${isExpanded ? 'sidebarItemExpanded' : ''}`} onClick={() => {
      setShowPanel(!showPanel).then(r => r)
    }}>
      <img
        className="sidebarIcon"
        src="https://lh3.googleusercontent.com/07rhYmrhU7LpG-dQmEo8526pwp2gWaOWDoKEQLndhLxMqmXKKDMW3ZmAEVFLaG9c5iXN0GjWdl4x0mUnCHdnAkxGgg=s120"
        alt=""
      />
      {isExpanded && (
        <span className="sidebarText">TweetHunt</span>
      )}
    </div>,
    shadowRoot
  );
}
