import React, { useState, useEffect, useRef } from 'react';
import { Users, Sparkles, Loader2 } from 'lucide-react';
import { ProjectMemberData, ProjectMember } from '~types';
import { useI18n } from '~contents/hooks/i18n.ts';
import { useLocalStorage } from '~storage/useLocalStorage.ts';
import { officialTagsManager } from '~/utils/officialTagsManager.ts';
import { useRequest } from 'ahooks';
import { rankService } from '~/utils/rankService';
import { useMainDataContext } from '~contents/contexts/MainDataContext.tsx';

interface ProjectMembersSectionProps {
  data: ProjectMemberData | null;
  isHoverPanel?: boolean;
}

// 生成基于字符串的一致颜色
function generateMemberColor(text: string): string {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = text.charCodeAt(i) + ((hash << 5) - hash);
  }

  // 生成柔和的颜色
  const hue = Math.abs(hash) % 360;
  const saturation = 45 + (Math.abs(hash) % 25); // 45-70%
  const lightness = 65 + (Math.abs(hash) % 20); // 65-85%

  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}

// 官方标签组件
function OfficialTag({ text, theme }: { text: string; theme: string }) {
  const [showTooltip, setShowTooltip] = useState(false);
  const backgroundColor = generateMemberColor(text);

  return (
    <span className='relative inline-block h-[14px] w-full'>
      <span
        className='inline-block items-center px-0.5 py-0.5 rounded text-[7px] font-medium whitespace-nowrap w-full overflow-hidden text-ellipsis text-center break-all'
        style={{
          backgroundColor:
            theme === 'dark' ? `${backgroundColor}20` : `${backgroundColor}30`,
          borderWidth: '0.5px',
          borderStyle: 'solid',
          borderColor: theme === 'dark' ? 'rgba(207,217,223,0.2)' : '#CFD9DF',
          color:
            theme === 'dark'
              ? backgroundColor
              : `hsl(${backgroundColor?.match(/\d+/)?.[0] || 0}, 70%, 35%)`,
        }}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        title={text} // 浏览器原生 tooltip 作为备选
      >
        {text}
      </span>

      {/* 自定义 tooltip */}
      {showTooltip && (
        <div className='absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 px-1.5 py-0.5 bg-gray-900 text-white text-[9px] rounded whitespace-nowrap z-50 pointer-events-none'>
          {text}
          <div className='absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-1 border-r-1 border-t-1 border-transparent border-t-gray-900'></div>
        </div>
      )}
    </span>
  );
}

// 成员卡片组件
function MemberCard({
  member,
  theme,
}: {
  member: ProjectMember;
  theme: string;
}) {
  const [showTooltip, setShowTooltip] = useState(false);
  const { lang } = useI18n();

  // 获取官方标签 - 使用当前语言
  const officialTags = officialTagsManager.getUserTags(
    member.handle,
    lang as 'zh' | 'en'
  );
  const displayTags = officialTags.slice(0, 2); // 最多显示2个标签

  return (
    <a
      href={`https://x.com/${member.handle}`}
      target='_blank'
      rel='noopener noreferrer'
      className='block p-0.5 rounded theme-hover transition-all duration-200 hover:shadow-sm group relative'
      title={`${member.name} (@${member.handle})`}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <div className='flex flex-col items-center space-y-1 min-w-0'>
        {/* 头像 */}
        <div>
          <img
            src={member.image}
            alt={member.name}
            className='w-8 h-8 rounded-full border theme-border flex-shrink-0 group-hover:ring-1 group-hover:ring-blue-400 transition-all object-cover'
            onError={(e) => {
              (e.target as HTMLImageElement).src =
                'https://abs.twimg.com/sticky/default_profile_images/default_profile_400x400.png';
            }}
          />
        </div>

        {/* 用户信息 */}
        <div className='flex flex-col items-center space-y-0.5 min-w-0 w-full'>
          {/* 用户名 - 限制一行显示，hover 显示完整内容 */}
          <div className='relative w-full'>
            <div
              className='text-[10px] font-medium theme-text-primary leading-tight text-center w-full px-0.5 truncate'
              title={member.name} // 浏览器原生 tooltip 作为备选
            >
              {member.name}
            </div>
          </div>

          {/* 官方标签 + level badge */}
          {(displayTags.length > 0 || member.level) && (
            <div className='flex items-center gap-[2px] flex-wrap justify-center w-full mt-0.5'>
              {displayTags.map((tag, index) => (
                <OfficialTag key={index} text={tag} theme={theme} />
              ))}
              {member.level && (
                <OfficialTag text={member.level} theme={theme} />
              )}
            </div>
          )}
        </div>
      </div>

      {/* Tooltip */}
      {showTooltip && (
        <div className='absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 px-1.5 py-0.5 bg-gray-900 text-white text-[10px] rounded whitespace-nowrap z-50 pointer-events-none'>
          <div className='text-center'>
            {member.name} (@{member.handle})
          </div>
          <div className='absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-1 border-r-1 border-t-1 border-transparent border-t-gray-900'></div>
        </div>
      )}
    </a>
  );
}

export function ProjectMembersSection({
  data,
  isHoverPanel = false,
}: ProjectMembersSectionProps) {
  const { t } = useI18n();
  const [theme] = useLocalStorage('@xhunt/theme', 'dark');
  const [memberRanks, setMemberRanks] = useState<Record<string, number>>({});
  const [loadingRanks, setLoadingRanks] = useState<Set<string>>(new Set());
  const [showLoading, setShowLoading] = useState(false);
  const [rankingSorted, setRankingSorted] = useState(false);
  const loadingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const { rootData } = useMainDataContext();

  const rootMembers = Array.isArray((rootData as any)?.members)
    ? ((rootData as any).members as Array<{
        name: string;
        position?: string;
        twitter?: string;
        avatar?: string;
      }>)
    : [];

  if (rootMembers.length > 0) {
    const totalMembers = rootMembers.length;
    const fixedWidth = isHoverPanel ? '350px' : 'auto';
    return (
      <div
        className={`theme-border ${isHoverPanel ? '' : 'border-b'}`}
        style={
          isHoverPanel
            ? {
                width: fixedWidth,
                minWidth: fixedWidth,
                maxWidth: fixedWidth,
              }
            : {}
        }
      >
        <div className='px-3 py-2 flex items-center justify-between'>
          <div className='flex items-center gap-2'>
            <Users className='w-4 h-4 text-purple-400' />
            <h2 className='font-bold text-sm theme-text-primary'>
              {t('projectMembers')}
            </h2>
            <span className='text-xs theme-text-secondary'>
              ({totalMembers})
            </span>
          </div>
          {isHoverPanel && (
            <a
              target={'_blank'}
              href={(rootData as any)?.projectLink}
              className='flex cursor-pointer items-center gap-1 px-2 py-1 rounded-full'
            >
              <span className='text-[10px] text-orange-400/80 hover:underline'>
                {t('source')}
              </span>
              <img
                src='https://oaewcvliegq6wyvp.public.blob.vercel-storage.com/rootdata-orange.png'
                alt='root-data'
                className='h-[24px] w-auto object-contain'
              />
            </a>
          )}
        </div>

        <div
          className='px-4 pb-2'
          style={
            isHoverPanel
              ? {
                  width: fixedWidth,
                  minWidth: fixedWidth,
                  maxWidth: fixedWidth,
                }
              : {}
          }
        >
          <div
            className='grid grid-cols-4 gap-2'
            style={isHoverPanel ? { width: '100%', minWidth: '100%' } : {}}
          >
            {rootMembers.map((m, idx) => {
              const content = (
                <div className='block p-0.5 rounded theme-hover transition-all duration-200 hover:shadow-sm group relative'>
                  <div className='flex flex-col items-center space-y-1 min-w-0'>
                    <div>
                      <img
                        src={
                          m.avatar ||
                          'https://abs.twimg.com/sticky/default_profile_images/default_profile_400x400.png'
                        }
                        alt={m.name}
                        className='w-8 h-8 rounded-full border theme-border flex-shrink-0 group-hover:ring-1 group-hover:ring-blue-400 transition-all object-cover'
                        onError={(e) => {
                          (e.target as HTMLImageElement).src =
                            'https://abs.twimg.com/sticky/default_profile_images/default_profile_400x400.png';
                        }}
                      />
                    </div>
                    <div className='flex flex-col items-center space-y-0.5 min-w-0 w-full'>
                      <div className='relative w-full'>
                        <div
                          className='text-[10px] font-medium theme-text-primary leading-tight text-center w-full px-0.5 truncate'
                          title={m.name}
                        >
                          {m.name}
                        </div>
                      </div>
                      {m.position && (
                        <div className='text-[9px] theme-text-secondary leading-tight text-center w-full px-0.5 truncate'>
                          {m.position}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );

              const href =
                m.twitter && m.twitter.trim().length > 0
                  ? m.twitter
                  : undefined;
              return href ? (
                <a
                  key={`${m.name}-${idx}`}
                  href={href}
                  target='_blank'
                  rel='noopener noreferrer'
                >
                  {content}
                </a>
              ) : (
                <div key={`${m.name}-${idx}`}>{content}</div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // 定义固定的显示顺序
  const FIXED_ORDER = [
    'founder/executive',
    'member',
    'investor/advisor',
    'contributor',
    'ex-member',
    'alumni',
  ];

  // 动态获取所有成员组
  const memberGroups = React.useMemo(() => {
    if (!data) return [];

    // 按照固定顺序获取有效的成员组
    const groups = FIXED_ORDER.filter((key) => {
      const members = data[key as keyof ProjectMemberData];
      return Array.isArray(members) && members.length > 0;
    }).map((key) => {
      const members = data[key as keyof ProjectMemberData];

      // 调用翻译函数
      const translatedTitle = t(key);

      return {
        key,
        title: translatedTitle,
        members: members as ProjectMember[],
      };
    });

    return groups;
  }, [data, t]);

  // 设置默认激活的tab（第一个有成员的分组）
  const [activeTab, setActiveTab] = useState<string>(() => {
    return memberGroups.length > 0 ? memberGroups[0].key : '';
  });

  // 当memberGroups变化时，更新activeTab
  useEffect(() => {
    if (
      memberGroups.length > 0 &&
      !memberGroups.find((g) => g.key === activeTab)
    ) {
      setActiveTab(memberGroups[0].key);
    }
  }, [memberGroups, activeTab]);

  // 获取当前激活分组的成员
  const activeGroup = memberGroups.find((group) => group.key === activeTab);
  const activeMembers = activeGroup?.members || [];

  // 获取成员排名
  useEffect(() => {
    if (!activeMembers.length) return;

    // 重置排序状态
    setRankingSorted(false);

    const usernames = activeMembers.map((member) => member.handle);

    // 清除之前的定时器
    if (loadingTimerRef.current) {
      clearTimeout(loadingTimerRef.current);
      loadingTimerRef.current = null;
    }

    // 设置加载状态，但延迟显示loading UI（延长到1500ms）
    setLoadingRanks(new Set(usernames));
    setShowLoading(false);

    // 1500ms后才显示loading UI，避免快速切换时的闪动
    loadingTimerRef.current = setTimeout(() => {
      setShowLoading(true);
    }, 1500);

    // 添加状态监听
    const removeCallback = rankService.addStatusCallback((loadingUsernames) => {
      setLoadingRanks(loadingUsernames);
    });

    const fetchMemberRanks = async () => {
      try {
        const ranks = await rankService.getRanks(usernames);
        setMemberRanks((prev) => ({ ...prev, ...ranks }));
      } catch (error) {
        console.log('Failed to fetch member ranks:', error);
      } finally {
        setShowLoading(false);
        setRankingSorted(true);
        if (loadingTimerRef.current) {
          clearTimeout(loadingTimerRef.current);
          loadingTimerRef.current = null;
        }
        removeCallback();
      }
    };

    fetchMemberRanks();
  }, [activeMembers]);

  // 按排名排序成员
  const sortedMembers = React.useMemo(() => {
    return [...activeMembers].sort((a, b) => {
      const rankA = memberRanks[a.handle] || Infinity;
      const rankB = memberRanks[b.handle] || Infinity;

      // 排名越小越靠前，没有排名的放在最后
      if (rankA === Infinity && rankB === Infinity) return 0;
      if (rankA === Infinity) return 1;
      if (rankB === Infinity) return -1;

      return rankA - rankB;
    });
  }, [activeMembers, memberRanks]);

  // 计算最大高度（HoverPanel需要固定高度）
  const maxHeight = React.useMemo(() => {
    if (!isHoverPanel) return 'auto';

    // 计算所有分组中成员的最大数量，确保有足够的空间
    const maxMembers =
      memberGroups.length > 0
        ? Math.max(...memberGroups.map((group) => group.members.length))
        : 0;
    // 每行4个成员，计算需要的行数
    const rows = Math.ceil(maxMembers / 4);
    // 每行约44px高度，加上tab导航和padding的高度，增加一些缓冲空间
    const baseHeight = 140; // tab导航、标题、padding等基础高度
    const contentHeight = Math.max(rows * 44, 120); // 内容区域最小120px
    return `${baseHeight + contentHeight}px`;
  }, [memberGroups, isHoverPanel]);

  // 计算固定宽度（HoverPanel需要固定宽度）
  const fixedWidth = React.useMemo(() => {
    if (!isHoverPanel) return 'auto';

    // 基础宽度：左右padding(24px) + 4列成员网格 + 列间距
    // 每个成员卡片约70px宽度，4列 = 280px，加上间距15px，总共295px
    // 再加上左右padding 24px，总共319px
    // 为了确保tab导航和头像有足够空间，设置为350px
    return '350px';
  }, [isHoverPanel]);

  // 计算总成员数
  const totalMembers = memberGroups.reduce(
    (total, group) => total + (group.members?.length || 0),
    0
  );

  if (memberGroups.length === 0 || totalMembers === 0) {
    return null;
  }

  // 显示所有成员，不做限制
  const displayMembers = sortedMembers;

  return (
    <div
      className={`theme-border ${isHoverPanel ? '' : 'border-b'}`}
      style={
        isHoverPanel
          ? {
              height: maxHeight,
              minHeight: maxHeight,
              width: fixedWidth,
              minWidth: fixedWidth,
              maxWidth: fixedWidth,
              // backgroundColor: 'blue'
            }
          : {}
      }
    >
      <div className='px-3 py-2 flex items-center justify-between'>
        <div className='flex items-center gap-2'>
          <Users className='w-4 h-4 text-purple-400' />
          <h2 className='font-bold text-sm theme-text-primary'>
            {t('projectMembers')}
          </h2>
          <span className='text-xs theme-text-secondary'>({totalMembers})</span>
          {isHoverPanel && (
            <div className='flex items-center gap-1'>
              <Sparkles className='w-2.5 h-2.5 text-yellow-400' />
              <span className='text-[10px] text-yellow-400'>
                {t('aiGenerated')}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Tab 导航 */}
      <div className='px-3 pb-1'>
        <div className='flex border-b theme-border overflow-x-auto'>
          {memberGroups.map((group) => (
            <button
              key={group.key}
              className={`flex-shrink-0 py-1.5 px-1.5 text-[10px] font-medium transition-colors border-b-2 whitespace-nowrap ${
                activeTab === group.key
                  ? 'text-purple-400 border-purple-400'
                  : 'theme-text-secondary border-transparent hover:theme-text-primary'
              }`}
              onClick={() => setActiveTab(group.key)}
            >
              {group.title} ({group.members.length})
            </button>
          ))}
        </div>
      </div>

      {/* 当前分组的成员列表 */}
      <div
        className='px-4 pb-2 relative overflow-hidden'
        style={
          isHoverPanel
            ? {
                height: 'auto',
                width: fixedWidth,
                minWidth: fixedWidth,
                maxWidth: fixedWidth,
                // backgroundColor: 'red'
              }
            : {}
        }
      >
        {(!rankingSorted || (showLoading && loadingRanks.size > 0)) && (
          <div className='flex items-center justify-center py-1 mb-1'>
            <Loader2 className='w-3 h-3 animate-spin text-purple-400 mr-1' />
            <span className='text-[10px] theme-text-secondary'>
              {'Loading...'}
            </span>
          </div>
        )}

        {rankingSorted && (
          <div
            className='grid grid-cols-4 gap-2'
            style={isHoverPanel ? { width: '100%', minWidth: '100%' } : {}}
          >
            {displayMembers.map((member, index) => (
              <MemberCard
                key={`${member.handle}-${index}`}
                member={member}
                theme={theme}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
