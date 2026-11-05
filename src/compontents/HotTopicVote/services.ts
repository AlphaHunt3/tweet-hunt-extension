import { openNewTab } from '~contents/utils';
import {
  fetchActiveHotVoteTopic,
  submitHotVote,
  submitRevote,
  fetchHotVoteComments,
  postHotVoteComment,
  fetchAllHotVotes,
  clearActiveHotVoteTopicCache,
  getTwitterAuthUrl,
  kbPrefix,
} from '~contents/services/api';

export {
  fetchActiveHotVoteTopic,
  submitHotVote,
  submitRevote,
  fetchHotVoteComments,
  postHotVoteComment,
  fetchAllHotVotes,
  clearActiveHotVoteTopicCache,
};

export async function triggerTwitterLogin() {
  try {
    const res = await getTwitterAuthUrl();
    if (res?.url) {
      openNewTab(res.url);
      return;
    }
  } catch {}
  openNewTab(`${kbPrefix}/api/xhunt/auth/twitter`);
}
