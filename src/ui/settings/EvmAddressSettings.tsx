import { useEffect, useState } from 'react';
import { updateEvmAddresses } from '~contents/services/review.ts';
import { useI18n } from '~contents/hooks/i18n';
import type { UserInfo } from '~types/review.ts';
import { cleanErrorMessage } from '~utils/dataValidation';
import { Button, TextField } from '../primitives';
import { cx } from '../primitives/cx';
import { ROW_PAD } from './SettingRow';

const EVM_ADDRESS = /^0x[a-fA-F0-9]{40}$/;

export const isValidEvmAddress = (address: string) => !address || EVM_ADDRESS.test(address);

export function formatEvmInput(value: string): string | null {
  const cleaned = value.replace(/[^a-fA-F0-9x]/g, '');
  if (!cleaned) return '';
  const formatted = cleaned !== '0' && !cleaned.startsWith('0x') ? `0x${cleaned}` : cleaned;
  return formatted.length <= 42 ? formatted : null;
}

export const shortAddress = (address: string) => `${address.slice(0, 6)}…${address.slice(-4)}`;

export function EvmAddressSettings({ userInfo, onSaved }: { userInfo?: UserInfo | null; onSaved: () => void }) {
  const { t } = useI18n();
  const bound: string = userInfo?.evmAddresses?.[0] ?? '';
  const [address, setAddress] = useState(bound);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);
  useEffect(() => setAddress(bound), [bound]);

  const invalid = address.length > 0 && !isValidEvmAddress(address);

  const change = (value: string) => {
    const next = formatEvmInput(value);
    if (next === null) return;
    setAddress(next);
    setError('');
    setSuccess('');
  };

  const save = async () => {
    if (saving) return;
    if (address && !isValidEvmAddress(address)) {
      setError(t('mantleHunterEvmAddressFormatIncorrect') || 'Invalid EVM address format');
      return;
    }
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const updated = await updateEvmAddresses(address.trim() ? [address.trim()] : []);
      if (updated) {
        onSaved();
        setSuccess(t('evmBindSuccess'));
      } else {
        setError(t('noteSaveFailed') || 'Save failed');
      }
    } catch (err: any) {
      if (err?.errorDetails) {
        const { error: code, message } = err.errorDetails;
        setError(cleanErrorMessage(message || code || err || ''));
      } else {
        setError(cleanErrorMessage(err?.message || t('noteSaveFailed') || 'Save failed'));
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={cx('flex flex-col gap-2.5', ROW_PAD)}>
      <p className='text-[11.5px] leading-relaxed text-xh-fg-2 native:text-[13px]'>{t('evmAddressBindingTip')}</p>
      <div className='flex items-center gap-2'>
        <TextField
          aria-label={t('evmAddressBinding')}
          placeholder={t('mantleHunterPlaceholderEvmAddress') || '0x...'}
          value={address}
          onValueChange={change}
          onSubmit={() => {
            if (!invalid) void save();
          }}
          invalid={invalid || Boolean(error)}
          className='min-w-0 flex-1 font-xh-mono'
          testId='settings-evm-address-input'
        />
        <Button size='sm' variant='primary' disabled={saving || invalid} aria-busy={saving || undefined} onClick={() => void save()}>
          {saving ? (
            <span aria-hidden='true' className='size-3 animate-spin rounded-full border-2 border-current border-t-transparent' />
          ) : null}
          {bound ? t('modify') : t('save')}
        </Button>
      </div>
      {success ? (
        <p role='status' className='text-[11.5px] font-medium text-xh-up'>
          {success}
        </p>
      ) : null}
      {error || invalid ? (
        <p role={error ? 'alert' : undefined} className='text-[11.5px] font-medium text-xh-down'>
          {error || t('mantleHunterEvmAddressFormatIncorrect')}
        </p>
      ) : null}
    </div>
  );
}
