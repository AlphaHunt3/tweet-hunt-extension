import React, { useState } from 'react';
import type { HotVoteOption } from './types';

interface PKAvatarProps {
  name: string;
  avatar?: string;
  borderColorClass: string;
  bgColorClass: string;
  textColorClass: string;
}

const PKAvatar: React.FC<PKAvatarProps> = React.memo(
  ({ name, avatar, borderColorClass, bgColorClass, textColorClass }) => {
    const [hasError, setHasError] = useState(false);

    return (
      <div
        className={`w-9 h-9 rounded-full overflow-hidden border-2 ${borderColorClass} ${bgColorClass} flex items-center justify-center shadow-sm shrink-0`}
      >
        {avatar && !hasError ? (
          <img
            src={avatar}
            alt={name}
            className='w-full h-full object-cover'
            onError={() => setHasError(true)}
          />
        ) : (
          <span className={`text-xs font-bold ${textColorClass} select-none`}>
            {name.slice(0, 1)}
          </span>
        )}
      </div>
    );
  }
);

interface HotTopicEntityPKProps {
  options: HotVoteOption[];
}

export const HotTopicEntityPK: React.FC<HotTopicEntityPKProps> = React.memo(({ options }) => {
  // 过滤出主要的PK对象（排除吃瓜选项）
  const pkCandidates = options.filter((opt) => !opt.isGua && !opt.name?.includes('瓜')).slice(0, 2);

  if (pkCandidates.length < 2) {
    return null;
  }

  const [left, right] = pkCandidates;

  return (
    <div className='flex items-center justify-around py-2 px-3 my-1 rounded-xl bg-slate-500/5 theme-border border'>
      {/* 左方人物 */}
      <div className='flex flex-col items-center gap-1.5 w-24'>
        <PKAvatar
          name={left.name}
          avatar={left.avatar}
          borderColorClass='border-blue-400/40'
          bgColorClass='bg-blue-500/10'
          textColorClass='text-blue-400'
        />
        <span
          className='text-xs font-semibold theme-text-primary text-center truncate max-w-full'
          title={left.name}
        >
          {left.name}
        </span>
      </div>

      {/* 中间 VS */}
      <div className='flex flex-col items-center justify-center select-none'>
        <span
          className='text-sm font-extrabold italic tracking-wider'
          style={{
            background: 'linear-gradient(135deg, #38bdf8 0%, #f43f5e 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          VS
        </span>
      </div>

      {/* 右方人物 */}
      <div className='flex flex-col items-center gap-1.5 w-24'>
        <PKAvatar
          name={right.name}
          avatar={right.avatar}
          borderColorClass='border-rose-400/40'
          bgColorClass='bg-rose-500/10'
          textColorClass='text-rose-400'
        />
        <span
          className='text-xs font-semibold theme-text-primary text-center truncate max-w-full'
          title={right.name}
        >
          {right.name}
        </span>
      </div>
    </div>
  );
});

export default HotTopicEntityPK;
