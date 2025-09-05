import React from 'react';

interface Tab {
  id: string;
  label: string;
}

interface TabsProps {
  tabs: Tab[];
  activeTab: string;
  onChange: (id: string) => void;
}

export function Tabs({ tabs, activeTab, onChange }: TabsProps) {
  return (
    <div className="flex border-b theme-border">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
            activeTab === tab.id 
              ? 'text-blue-400 border-b-2 border-blue-400' 
              : 'theme-text-secondary hover:theme-text-primary'
          }`}
          onClick={() => onChange(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}