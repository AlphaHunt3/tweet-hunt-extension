import React from 'react';

interface Tab {
  id: string;
  label: string;
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
          {tab.label}
        </button>
      ))}
    </div>
  );
}
