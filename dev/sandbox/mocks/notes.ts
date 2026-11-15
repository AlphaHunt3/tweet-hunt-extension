let stored = '';

export const getUserNote = async () => ({ note: stored });
export const saveUserNote = async ({ note }: { note: string }) => {
  await new Promise((resolve) => setTimeout(resolve, 300));
  stored = note;
  return { success: true };
};
