import { MOCK_COMMENTS, MOCK_USER } from './fixtures';

export * from '../../../src/contents/services/review';

export const getHandleComments = async (_userId: string, page = 1) => {
  const { totalPages } = MOCK_COMMENTS.pagination;
  return {
    comments: MOCK_COMMENTS.comments.map((comment) => ({ ...comment, id: `${comment.id}-p${page}` })),
    pagination: { ...MOCK_COMMENTS.pagination, page, hasPrevPage: page > 1, hasNextPage: page < totalPages },
  };
};
export const userLogout = async () => null;
export const updateUserInfo = async () => ({ ...MOCK_USER, evmAddresses: [] as string[] });
export const updateEvmAddresses = async (addresses: string[]) => ({ ...MOCK_USER, evmAddresses: addresses });
