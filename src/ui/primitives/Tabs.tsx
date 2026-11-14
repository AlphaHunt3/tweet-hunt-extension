import { Tabs as UiTabs, TabsIndicator, TabsList, TabsPanel, TabsTab } from '@ui-sdk/react/tabs';
import { createContext, Fragment, useContext, type ReactNode } from 'react';
import { cx } from './cx';

export type TabsVariant = 'segmented' | 'underline' | 'rail';

const VariantContext = createContext<TabsVariant>('segmented');

export interface TabsProps<T extends string> {
  value: T;
  onValueChange: (value: T) => void;
  variant: TabsVariant;
  className?: string;
  children: ReactNode;
}

export function Tabs<T extends string>({ value, onValueChange, variant, className, children }: TabsProps<T>) {
  return (
    <VariantContext.Provider value={variant}>
      <UiTabs
        value={value}
        onValueChange={(next) => {
          if (next !== null) onValueChange(next as T);
        }}
        orientation={variant === 'rail' ? 'vertical' : 'horizontal'}
        className={cx('xh-tabs', className)}
        data-variant={variant}
      >
        {children}
      </UiTabs>
    </VariantContext.Provider>
  );
}

export interface TabItem<T extends string> {
  value: T;
  label: string;
  icon?: ReactNode;
  dot?: boolean;
  spaceBefore?: boolean;
  testId?: string;
}

export interface TabListProps<T extends string> {
  items: readonly TabItem<T>[];
  'aria-label': string;
  className?: string;
}

export function TabList<T extends string>({ items, className, ...rest }: TabListProps<T>) {
  const iconOnly = useContext(VariantContext) === 'rail';
  return (
    <TabsList aria-label={rest['aria-label']} className={cx('xh-tabs-list', className)}>
      <TabsIndicator className='xh-tabs-indicator' />
      {items.map((item) => (
        <Fragment key={item.value}>
          {item.spaceBefore ? <span aria-hidden='true' className='xh-tabs-spacer' /> : null}
          <TabsTab
            value={item.value}
            title={iconOnly ? item.label : undefined}
            className='xh-tabs-tab'
            data-xhunt-testid={item.testId}
          >
            {item.icon}
            <span className={iconOnly ? 'sr-only' : undefined}>{item.label}</span>
            {item.dot ? <span aria-hidden='true' className='xh-tabs-dot' /> : null}
          </TabsTab>
        </Fragment>
      ))}
    </TabsList>
  );
}

export function TabPanel({ value, className, children }: { value: string; className?: string; children: ReactNode }) {
  return (
    <TabsPanel value={value} className={cx('xh-tabs-panel', className)}>
      {children}
    </TabsPanel>
  );
}
