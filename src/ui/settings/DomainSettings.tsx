import { useI18n } from '~contents/hooks/i18n';
import { useUserDomain, type DomainType } from '~contents/hooks/useUserDomain';
import { useLocalStorage } from '~storage/useLocalStorage';
import { SegmentedControl, Switch } from '../primitives';
import { AVATAR_RANK_MODE_KEY } from './AvatarRankSettings';
import { reloadPage } from './reloadPage';
import { SettingRow } from './SettingRow';

export function DomainSettings() {
  const { t, lang } = useI18n();
  const { domains, primaryDomain, addDomain, removeDomain, setPrimaryDomain } = useUserDomain();
  const [rankMode, setRankMode] = useLocalStorage<DomainType>(AVATAR_RANK_MODE_KEY, 'web3');

  const toggle = (domain: DomainType) => {
    if (!domains.includes(domain)) {
      addDomain(domain);
      return;
    }
    if (domains.length <= 1) return;
    removeDomain(domain);
    if (domain === 'ai' && rankMode === 'ai') {
      setRankMode('web3');
      reloadPage();
    }
  };

  const label = (domain: DomainType) =>
    domain === 'web3'
      ? lang === 'zh'
        ? t('domainWeb3Desc') || '区块链'
        : t('domainWeb3') || 'Web3'
      : lang === 'zh'
        ? t('domainAiDesc') || '人工智能'
        : t('domainAi') || 'AI';

  return (
    <>
      {(['web3', 'ai'] as const).map((domain) => (
        <SettingRow
          key={domain}
          labelled
          testId={`settings-item-domain-${domain}`}
          label={label(domain)}
          control={
            <Switch
              checked={domains.includes(domain)}
              disabled={domains.length === 1 && domains.includes(domain)}
              onCheckedChange={() => toggle(domain)}
              data-xhunt-testid={`settings-domain-toggle-${domain}`}
            />
          }
        />
      ))}
      {domains.includes('web3') && domains.includes('ai') ? (
        <SettingRow
          label={t('domainPriorityTitle') || '首选'}
          control={
            <SegmentedControl
              aria-label={t('domainPriorityTitle') || '首选'}
              size='sm'
              value={primaryDomain}
              onValueChange={setPrimaryDomain}
              options={[
                { value: 'web3', label: 'Web3', testId: 'settings-domain-primary-web3' },
                { value: 'ai', label: 'AI', testId: 'settings-domain-primary-ai' },
              ]}
            />
          }
        />
      ) : null}
    </>
  );
}
