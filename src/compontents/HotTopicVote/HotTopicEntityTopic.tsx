import React from 'react';
import { HelpCircle } from 'lucide-react';

interface HotTopicEntityTopicProps {
  summary: string;
}

export const HotTopicEntityTopic: React.FC<HotTopicEntityTopicProps> = React.memo(({ summary }) => {
  return (
    <div className='flex items-start gap-2 py-2 px-3 my-1 rounded-xl bg-slate-500/5 theme-border border'>
      <HelpCircle className='w-4 h-4 text-blue-400 shrink-0 mt-0.5' />
      <p className='text-xs theme-text-secondary leading-relaxed'>
        {summary}
      </p>
    </div>
  );
});

export default HotTopicEntityTopic;
