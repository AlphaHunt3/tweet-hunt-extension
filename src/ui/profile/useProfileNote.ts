import { useRequest } from 'ahooks';
import { useEffect, useState } from 'react';
import { useGlobalTips } from '~compontents/area/GlobalTips.tsx';
import { useI18n } from '~contents/hooks/i18n';
import { getUserNote, saveUserNote } from '~contents/services/notes.ts';
import { readProfileIdentity } from './profileIdentity';

export const NOTE_MAX_LENGTH = 30;

export function useProfileNote({
  handle,
  token,
  fallbackNote,
}: {
  handle: string;
  token: string;
  fallbackNote?: string | null;
}) {
  const { t } = useI18n();
  const [, setTips] = useGlobalTips();
  const [localNote, setLocalNote] = useState('');

  const { data, run: fetchNote, loading } = useRequest(() => getUserNote(handle), { manual: true });
  const { runAsync: saveAsync, loading: saving } = useRequest(saveUserNote, { manual: true });

  useEffect(() => {
    setLocalNote('');
  }, [handle]);
  useEffect(() => {
    if (handle && token) fetchNote();
  }, [handle, token]);
  useEffect(() => {
    setLocalNote(data?.note || '');
  }, [data]);

  const save = async (note: string) => {
    if (!handle || !token) return false;
    try {
      await saveAsync({ handle, ...readProfileIdentity(), note });
      setTips({ text: t('noteSaveSuccess'), type: 'suc' });
      setLocalNote(note);
      fetchNote();
      return true;
    } catch (error) {
      setTips({ text: `${t('noteSaveFailed')}: ${error}`, type: 'fail' });
      return false;
    }
  };

  return {
    note: token ? localNote || fallbackNote || '' : '',
    loading,
    saving,
    save,
  };
}
