import { MOCK_COMMENTS } from './fixtures';

export * from '../../../src/contents/services/review';

export const getHandleComments = async (_userId: string, page = 1) => {
  const { totalPages } = MOCK_COMMENTS.pagination;
  return {
    comments: MOCK_COMMENTS.comments.map((comment) => ({ ...comment, id: `${comment.id}-p${page}` })),
    pagination: { ...MOCK_COMMENTS.pagination, page, hasPrevPage: page > 1, hasNextPage: page < totalPages },
  };
};
export const userLogout = async () => null;
