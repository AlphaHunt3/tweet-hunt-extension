import { useI18n } from '~contents/hooks/i18n';
import { Avatar } from '~/ui/primitives/Avatar';
import { useOfficialTags } from '../useOfficialTags';

const HANDLE_IN_URL = /(?:x|twitter)\.com\/(?:#!\/)?@?([A-Za-z0-9_]{1,15})(?:[/?#]|$)/i;

export function handleFromUrl(url: string | null | undefined): string {
  return url ? (HANDLE_IN_URL.exec(url)?.[1] ?? '') : '';
}

export interface PersonChipProps {
  handle?: string | null;
  name?: string | null;
  avatar?: string | null;
  href?: string | null;
  note?: string | null;
  extraTags?: (string | null | undefined)[];
}

export function PersonChip({ handle, name, avatar, href, note, extraTags = [] }: PersonChipProps) {
  const { lang } = useI18n();
  const officialTags = useOfficialTags(handle || '', null, lang);
  const tags = [...extraTags, ...officialTags].filter((tag): tag is string => Boolean(tag)).slice(0, 2);
  const label = name || handle || '?';
  const target = href?.trim() || (handle ? `https://x.com/${handle}` : '');
  const body = (
    <>
      <Avatar name={label} src={avatar} size='sm' />
      <span className='xh-kolf-name'>{label}</span>
      {note ? <span className='xh-kolf-note'>{note}</span> : null}
      {tags.length ? (
        <span className='xh-kolf-tags'>
          {tags.map((tag) => (
            <span key={tag} className='xh-kolf-tag'>
              {tag}
            </span>
          ))}
        </span>
      ) : null}
    </>
  );
  return target ? (
    <a
      className='xh-kolf'
      href={target}
      target='_blank'
      rel='noopener noreferrer'
      title={handle ? `${label} (@${handle})` : label}
    >
      {body}
    </a>
  ) : (
    <span className='xh-kolf'>{body}</span>
  );
}
