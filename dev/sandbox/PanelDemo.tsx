import { FixedTwitterPanel } from '~/compontents/area/FixedTwitterPanel';
import { MOCK_REVIEW_INFO, MOCK_ROOT_DATA, MOCK_TW_INFO, MOCK_USER_ID } from './mocks/fixtures';

export function PanelDemo() {
  return (
    <FixedTwitterPanel
      twInfo={MOCK_TW_INFO}
      deletedTweets={[]}
      loadingTwInfo={false}
      loadingDel={false}
      error={undefined}
      userId={MOCK_USER_ID}
      rootData={MOCK_ROOT_DATA}
      loadingRootData={false}
      reviewInfo={MOCK_REVIEW_INFO as never}
      userInfo={null}
      projectMemberData={null}
      loadingProjectMember={false}
    />
  );
}
