import { useLockFn } from 'ahooks';
import { useState } from 'react';
import { useI18n } from '~contents/hooks/i18n';
import useCurrentUrl from '~contents/hooks/useCurrentUrl';
import useWaitForElement from '~contents/hooks/useWaitForElement';
import { getTwitterAuthUrl } from '~contents/services/api.ts';
import { openNewTab } from '~contents/utils';
import { useLocalStorage } from '~storage/useLocalStorage';
import { useCrossPageSettings } from '~utils/settingsManager.ts';
import { NoteIcon, PlusIcon, TagIcon, XLogoIcon } from '../icons';
import { Button } from '../primitives/Button';
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverTitle,
  PopoverTrigger,
} from '../primitives/Popover';
import { TextField } from '../primitives/TextField';
import type { UiSkin } from '../skin/skins';
import { useUiSkin } from '../skin/useUiSkin';
import { useOfficialTags } from './useOfficialTags';
import { NOTE_MAX_LENGTH, useProfileNote } from './useProfileNote';

export interface ProfileTaglineProps {
  handle: string;
  twitterId?: string | number | null;
  fallbackNote?: string | null;
}

export function ProfileTagline({ handle, twitterId, fallbackNote }: ProfileTaglineProps) {
  const { lang } = useI18n();
  const { skin } = useUiSkin();
  const { isEnabled } = useCrossPageSettings();
  const currentUrl = useCurrentUrl();
  const ownProfile = useWaitForElement('main a[data-testid="editProfileButton"]', [currentUrl]);
  const tags = useOfficialTags(handle, twitterId, lang);

  const showTags = isEnabled('showOfficialTags') && tags.length > 0;
  const showNote = isEnabled('showNotes') && !ownProfile && Boolean(handle);
  if (!showTags && !showNote) return null;

  const tagText = tags.join(' · ');
  return (
    <div className='xh-ptagline'>
      {showTags && (
        <span className='xh-ptag' title={tagText}>
          {skin !== 'obsidian' && <TagIcon size={skin === 'native' ? 14 : 12} />}
          <span className='xh-ptag-text'>{tagText}</span>
        </span>
      )}
      {showNote && <NoteControl handle={handle} skin={skin} fallbackNote={fallbackNote} />}
    </div>
  );
}

function NoteControl({
  handle,
  skin,
  fallbackNote,
}: {
  handle: string;
  skin: UiSkin;
  fallbackNote?: string | null;
}) {
  const { t } = useI18n();
  const [token] = useLocalStorage<string>('@xhunt/token', '');
  const { note, loading, saving, save } = useProfileNote({ handle, token, fallbackNote });
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState('');

  const login = useLockFn(async () => {
    const ret = await getTwitterAuthUrl();
    if (ret?.url) {
      openNewTab(ret.url);
      setOpen(false);
    }
  });

  const submit = async () => {
    if (saving) return;
    if (await save(draft.trim())) setOpen(false);
  };

  const emptyLabel = skin === 'obsidian' ? t('note') : t('profileNoteAdd');
  const icon =
    note || skin === 'native' ? <NoteIcon size={skin === 'native' ? 14 : 12} /> : <PlusIcon size={12} />;

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        if (next) setDraft(note);
        setOpen(next);
      }}
    >
      <PopoverTrigger
        className='xh-pnote'
        data-xhunt-testid='note-entry'
        data-has-note={note ? '' : undefined}
        disabled={loading}
        title={note || undefined}
        aria-label={note ? `${t('profileNoteEditLabel')}：${note}` : undefined}
      >
        {loading ? (
          <span className='xh-pnote-text'>{t('loading')}</span>
        ) : (
          <>
            {icon}
            <span className='xh-pnote-text'>{note || emptyLabel}</span>
          </>
        )}
      </PopoverTrigger>
      <PopoverContent
        align='start'
        className='xh-pnote-pop'
        data-xhunt-testid={token ? 'note-editor' : 'note-login'}
      >
        <PopoverTitle>{t('profileNoteEditorTitle')}</PopoverTitle>
        {token ? (
          <>
            <TextField
              value={draft}
              onValueChange={setDraft}
              aria-label={t('note')}
              placeholder={t('enterNoteHere')}
              maxLength={NOTE_MAX_LENGTH}
              onSubmit={() => void submit()}
              onEscape={() => setOpen(false)}
              testId='note-input'
            />
            <div className='xh-pnote-foot'>
              <span className='xh-pnote-count'>
                {draft.length}/{NOTE_MAX_LENGTH}
              </span>
              <Button
                size='sm'
                onClick={() => setOpen(false)}
                disabled={saving}
                data-xhunt-testid='note-cancel-button'
              >
                {t('cancel')}
              </Button>
              <Button
                size='sm'
                variant='primary'
                onClick={() => void submit()}
                disabled={saving}
                data-xhunt-testid='note-save-button'
              >
                {t('save')}
              </Button>
            </div>
          </>
        ) : (
          <>
            <PopoverDescription>{t('loginRequired2')}</PopoverDescription>
            <Button size='sm' variant='primary' onClick={() => void login()}>
              <XLogoIcon size={14} />
              {t('profileLoginWithX')}
            </Button>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}
