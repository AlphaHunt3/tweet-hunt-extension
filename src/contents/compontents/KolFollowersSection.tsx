import React, { useState } from 'react';
import { Users2 } from 'lucide-react';
import { KolData, KolTabType, KolFollower } from '~types';
import numeral from 'numeral';
import { useI18n } from '~contents/hooks/i18n.ts';
import { formatNumber } from '~contents/utils';

interface KolFollowersSectionProps {
  kolData: KolData;
  isHoverPanel?: boolean;
  defaultTab?: KolTabType;
}

export function KolFollowersSection({ kolData, defaultTab = 'global', isHoverPanel = false }: KolFollowersSectionProps) {
  const [activeKolTab, setActiveKolTab] = useState<KolTabType>(defaultTab as KolTabType);

  const getActiveKolList = (): KolFollower[] => {
    let result: KolFollower[] = [];

    switch (activeKolTab) {
      case 'global':
        result = kolData?.kolFollow?.globalKolFollowers || [];
        break;
      case 'cn':
        result = kolData?.kolFollow?.cnKolFollowers || [];
        break;
      case 'top100':
        result = kolData?.kolFollow?.topKolFollowers || [];
        break;
      default:
        result = kolData?.kolFollow?.globalKolFollowers || [];
    }

    // Ensure we're returning an array
    return Array.isArray(result) ? result : [];
  };

  // Get follower counts based on available data
  const globalFollowers = kolData?.kolFollow?.globalKolFollowersCount || 0

  const cnFollowers = kolData?.kolFollow?.cnKolFollowersCount || 0

  const topFollowers = kolData?.kolFollow?.topKolFollowersCount || 0;

  const activeKolList = getActiveKolList();
  const { t } = useI18n();

  return (
    <div className="p-3 border-b border-gray-700">
      {!isHoverPanel && <div className="flex items-center gap-2 mb-2">
				<Users2 className="w-4 h-4 text-blue-400" />
				<h2 className="font-bold text-sm">{t('kFollowingAnalytics')}</h2>
			</div>}

      {!isHoverPanel && <div className="grid grid-cols-3 gap-2 mb-3">
				<button
					className={`text-center py-1 px-2 rounded-md text-xs transition-colors ${activeKolTab === 'global' ? 'bg-blue-500/20 text-blue-400' : 'hover:bg-gray-700/30'}`}
					onClick={() => setActiveKolTab('global')}
				>
					<p className="text-gray-400">{t('KOL_Followers')}</p>
					<p className="font-bold">{formatNumber(globalFollowers)}</p>
				</button>
				<button
					className={`text-center py-1 px-2 rounded-md text-xs transition-colors ${activeKolTab === 'cn' ? 'bg-blue-500/20 text-blue-400' : 'hover:bg-gray-700/30'}`}
					onClick={() => setActiveKolTab('cn')}
				>
					<p className="text-gray-400">{t('CN_KOLs')}</p>
					<p className="font-bold">{formatNumber(cnFollowers)}</p>
				</button>
				<button
					className={`text-center py-1 px-2 rounded-md text-xs transition-colors ${activeKolTab === 'top100' ? 'bg-blue-500/20 text-blue-400' : 'hover:bg-gray-700/30'}`}
					onClick={() => setActiveKolTab('top100')}
				>
					<p className="text-gray-400">{t('TOP100_KOLs')}</p>
					<p className="font-bold">{formatNumber(topFollowers)}</p>
				</button>
			</div>}

      {activeKolList && activeKolList?.length ? <div>
        <div className="flex flex-wrap gap-0">
          {(activeKolList || []).slice(0, 13).map((follower) => (
            <a
              key={follower?.username}
              href={`https://x.com/${follower?.username}`}
              target={'_blank'}
              className="block relative group -ml-1 first:ml-0"
            >
              <img
                src={follower?.avatar}
                alt={follower?.name}
                className="w-7 h-7 rounded-full hover:ring-2 hover:ring-blue-400 transition-all border-2 border-[#15202b] hover:relative hover:z-10"
              />
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-xs rounded opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none transition-opacity z-20">
                {follower?.name}
              </div>
            </a>
          ))}
        </div>
      </div> : null}
    </div>
  );
}
