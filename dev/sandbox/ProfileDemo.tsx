import type { CSSProperties } from 'react';
import ErrorBoundary from '~compontents/ErrorBoundary';
import { FollowedRightData } from '~compontents/area/FollowedRightData';
import { KolAiChatButton } from '~compontents/area/KolAiChatButton';
import { NameRightData } from '~compontents/area/NameRightData';
import SocialCircleFeature from '~compontents/SocialCircle/SocialCircleFeature';
import type { XPalette } from '~/ui/skin/xPalette';
import {
  MOCK_DELETED_TWEETS,
  MOCK_DISCUSSION,
  MOCK_PROJECT_MEMBERS,
  MOCK_PROJECT_ROOT_DATA,
  MOCK_PROJECT_TW_INFO,
  MOCK_RENAME_INFO,
  MOCK_REVIEW_INFO,
  MOCK_TW_INFO,
} from './mocks/fixtures';

// ?kind=project 换成项目账号，讨论、关联人物、投资这些卡片只有项目才有
const PROJECT = new URLSearchParams(location.search).get('kind') === 'project';
const TW_INFO = PROJECT ? MOCK_PROJECT_TW_INFO : MOCK_TW_INFO;

// 按 X 资料页真实的 data-testid 和文案搭；资料页组件按选择器找节点、挂自己的 Shadow Root
const X_CSS = `
.x-col { width: 600px; margin: 0 auto; border-inline: 1px solid var(--x-line); background: var(--host-bg); color: var(--host-fg);
  font: 15px/1.3125 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "PingFang SC", sans-serif; }
.x-banner { height: 200px; background: var(--x-banner); }
.x-head { display: flex; justify-content: space-between; align-items: flex-start; height: 76px; padding: 12px 16px 0; }
.x-avatar { display: grid; place-items: center; width: 134px; height: 134px; margin-top: -78px; border: 4px solid var(--host-bg);
  border-radius: 50%; background: #6b4f6b; color: #fff; font-size: 40px; font-weight: 700; }
.x-actions { display: flex; align-items: flex-start; gap: 8px; }
.x-follow { height: 36px; padding: 0 16px; border: 0; border-radius: 9999px; background: var(--host-fg); color: var(--host-bg);
  font-size: 15px; font-weight: 700; }
.x-info { padding: 4px 16px 16px; }
.x-name { font-size: 20px; font-weight: 800; line-height: 24px; }
.x-handle, .x-meta, .x-counts a { color: var(--x-fg-2); }
.x-bio { margin-top: 12px; }
.x-meta { margin-top: 12px; }
.x-counts { display: flex; flex-wrap: wrap; align-items: center; margin-top: 12px; font-size: 14px; }
.x-counts a { margin-inline-end: 20px; text-decoration: none; }
.x-counts b { color: var(--host-fg); }
`;

const X_COLORS: Record<XPalette, { line: string; fg2: string; banner: string }> = {
  default: { line: '#eff3f4', fg2: '#536471', banner: '#cfd9de' },
  dim: { line: '#38444d', fg2: '#8b98a5', banner: '#425364' },
  'lights-out': { line: '#2f3336', fg2: '#71767b', banner: '#333639' },
};

export function ProfileDemo({ palette }: { palette: XPalette }) {
  const colors = X_COLORS[palette];
  const vars = { '--x-line': colors.line, '--x-fg-2': colors.fg2, '--x-banner': colors.banner } as CSSProperties;
  return (
    <main style={vars}>
      <style>{X_CSS}</style>
      <div data-testid='primaryColumn' className='x-col'>
        <div className='x-banner' />
        <div className='x-head'>
          <div className='x-avatar'>MC</div>
          <div className='x-actions'>
            <div data-testid='placementTracking'>
              <button type='button' className='x-follow'>
                关注
              </button>
            </div>
          </div>
        </div>
        <div className='x-info'>
          <div data-testid='UserName'>
            <div className='x-name'>Mira Chen</div>
            <div className='x-handle'>@mira_onchain</div>
          </div>
          <div data-testid='UserDescription' className='x-bio'>
            链上研究员｜DeFi 与 AI Agent｜观点不构成投资建议
          </div>
          <div className='x-meta'>新加坡 · 2019 年 3 月加入</div>
          <div className='x-counts'>
            <a href='#following'>
              <b>1,284</b> 正在关注
            </a>
            <a href='#followers'>
              <b>8.6万</b> 关注者
            </a>
          </div>
        </div>
      </div>
      {/* 和 Main.tsx 一样每个挂载点包一层错误边界，一个出错不影响其余 */}
      <ErrorBoundary name='NameRightData'>
      <NameRightData
        newTwitterData={null}
        twInfo={TW_INFO}
        deletedTweets={MOCK_DELETED_TWEETS}
        deletedTweetsIsVip={true}
        loadingTwInfo={false}
        loadingDel={false}
        error={null}
        rootData={PROJECT ? MOCK_PROJECT_ROOT_DATA : null}
        loadingRootData={false}
        renameInfo={MOCK_RENAME_INFO}
        reviewInfo={MOCK_REVIEW_INFO}
        loadingRenameInfo={false}
        discussionInfo={PROJECT ? MOCK_DISCUSSION : null}
        loadingDiscussionInfo={false}
        projectMemberData={PROJECT ? MOCK_PROJECT_MEMBERS : null}
        loadingProjectMember={false}
      />
      </ErrorBoundary>
      <ErrorBoundary name='FollowedRightData'>
      <FollowedRightData
        twInfo={TW_INFO}
        error={null}
        userId='mira_onchain'
        loadingTwInfo={false}
        reviewInfo={MOCK_REVIEW_INFO}
        refreshAsyncReviewInfo={async () => {}}
        refreshAsyncUserInfo={async () => {}}
        loadingReviewInfo={false}
      />
      </ErrorBoundary>
      <ErrorBoundary name='SocialCircleFeature'>
        <SocialCircleFeature />
      </ErrorBoundary>
      <ErrorBoundary name='KolAiChatButton'>
        <KolAiChatButton />
      </ErrorBoundary>
    </main>
  );
}
