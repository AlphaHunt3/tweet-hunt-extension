import React from 'react';

interface Tab {
  id: string;
  label: string;
  isNew?: boolean;
}

interface SecondaryTabsProps {
  tabs: Tab[];
  activeTab: string;
  onChange: (id: string) => void;
  className?: string;
}

export function SecondaryTabs({
  tabs,
  activeTab,
  onChange,
  className = '',
}: SecondaryTabsProps) {
  return (
    <div className={`flex items-center justify-center space-x-2 ${className}`}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          className={`px-4 py-1.5 text-xs rounded-lg transition-colors font-medium ${
            activeTab === tab.id
              ? 'bg-blue-500/10 text-blue-400'
              : 'theme-text-secondary theme-hover-bg-secondary'
          }`}
          onClick={() => onChange(tab.id)}
        >
          <span className='relative inline-flex items-center justify-center'>
            {tab.label}
            {tab.isNew && (
              <span className='absolute top-0 right-0 px-1 text-[8px] font-semibold text-white-500 rounded-full leading-none transform translate-x-full -translate-y-1/2'>
                <svg
                  className='w-5 h-[auto]'
                  viewBox='0 0 1024 1024'
                  version='1.1'
                  xmlns='http://www.w3.org/2000/svg'
                  width='64'
                  height='64'
                >
                  <path
                    d='M245.76 286.72h552.96c124.928 0 225.28 100.352 225.28 225.28s-100.352 225.28-225.28 225.28H0V532.48c0-135.168 110.592-245.76 245.76-245.76z m133.12 348.16V401.408H348.16v178.176l-112.64-178.176H204.8V634.88h30.72v-178.176L348.16 634.88h30.72z m182.272-108.544v-24.576h-96.256v-75.776h110.592v-24.576h-141.312V634.88h143.36v-24.576h-112.64v-83.968h96.256z m100.352 28.672l-34.816-151.552h-34.816l55.296 233.472H675.84l47.104-161.792 4.096-20.48 4.096 20.48 47.104 161.792h28.672l57.344-233.472h-34.816l-32.768 151.552-4.096 30.72-6.144-30.72-40.96-151.552h-30.72l-40.96 151.552-6.144 30.72-6.144-30.72z'
                    fill='#EE502F'
                  ></path>
                </svg>
              </span>
            )}
          </span>
        </button>
      ))}
    </div>
  );
}
