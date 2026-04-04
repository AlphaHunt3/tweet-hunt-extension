import React from 'react';
import { createPortal } from 'react-dom';
import { useScroll } from 'ahooks';
import { ChevronDown, ChevronRight, Filter, X } from 'lucide-react';
import { useI18n } from '~contents/hooks/i18n';
import { useGlobalResize } from '~contents/hooks/useGlobalResize';
import { useGlobalScroll } from '~contents/hooks/useGlobalScroll';
import { useTagTranslation } from '~contents/hooks/useTagTranslation';
import { useLocalStorage } from '~storage/useLocalStorage';

type TagGroup = {
  id: string;
  name: string;
  count: number;
  children?: Array<{ id: string; name: string; count: number }>;
};

type HotTweetItem = {
  id?: string;
  rank?: number;
  score?: number;
  tweet?: {
    ai?: {
      domain_tag?: string;
      hot_tags?: string[];
      crypto_sub_tags?: string[];
      ai_sub_tags?: string[];
    };
  };
};

export function TweetTagFilter(props: {
  scrollContainerRef: React.RefObject<HTMLElement | null>;
  items: HotTweetItem[];
  selectedType: 'domain' | 'hot' | null;
  selectedGroupId: string | null;
  selectedSubTagId: string | null;
  selectedHotTag: string | null;
  onChange: (next: {
    type: 'domain' | 'hot' | null;
    groupId: string | null;
    subTagId: string | null;
    hotTag: string | null;
  }) => void;
  /** 筛选悬浮框展开/收起时回调，便于父组件锁定列表滚动 */
  onExpandChange?: (expanded: boolean) => void;
}) {
  const { t } = useI18n();
  const { translateTag } = useTagTranslation();
  const {
    scrollContainerRef,
    items,
    selectedType,
    selectedGroupId,
    selectedSubTagId,
    selectedHotTag,
    onChange,
    onExpandChange,
  } = props;
  const [expandedGroupId, setExpandedGroupId] = React.useState<string | null>(
    null
  );
  const [subMenuPlacement, setSubMenuPlacement] = React.useState<
    Record<string, { left?: number; top?: number; bottom?: number }>
  >({});
  const [subMenuAnchorRects, setSubMenuAnchorRects] = React.useState<
    Record<string, { left: number; top: number; right: number; bottom: number; width: number; height: number }>
  >({});
  const [isHovered, setIsHovered] = React.useState(false);
  const closeTimerRef = React.useRef<number | null>(null);
  const openTimerRef = React.useRef<number | null>(null);
  const subCloseTimerRef = React.useRef<number | null>(null);
  const subOpenTimerRef = React.useRef<number | null>(null);
  const groupAnchorRefs = React.useRef<Record<string, HTMLDivElement | null>>({});

  const tagStats = React.useMemo(() => {
    const domainCount = new Map<string, number>();
    const cryptoSubCount = new Map<string, number>();
    const aiSubCount = new Map<string, number>();
    const hotTagCount = new Map<string, number>();

    for (const it of items) {
      const ai = it?.tweet?.ai;
      if (!ai) continue;

      const domain = String(ai.domain_tag || '').trim();
      if (domain) domainCount.set(domain, (domainCount.get(domain) || 0) + 1);

      const cryptoSubs = Array.isArray(ai.crypto_sub_tags)
        ? ai.crypto_sub_tags
        : [];
      for (const s of cryptoSubs) {
        const key = String(s || '').trim();
        if (!key) continue;
        cryptoSubCount.set(key, (cryptoSubCount.get(key) || 0) + 1);
      }

      const aiSubs = Array.isArray(ai.ai_sub_tags) ? ai.ai_sub_tags : [];
      for (const s of aiSubs) {
        const key = String(s || '').trim();
        if (!key) continue;
        aiSubCount.set(key, (aiSubCount.get(key) || 0) + 1);
      }

      const hotTags = Array.isArray(ai.hot_tags) ? ai.hot_tags : [];
      for (const s of hotTags) {
        const key = String(s || '').trim();
        if (!key) continue;
        hotTagCount.set(key, (hotTagCount.get(key) || 0) + 1);
      }
    }

    return { domainCount, cryptoSubCount, aiSubCount, hotTagCount };
  }, [items]);

  const domainGroups: TagGroup[] = React.useMemo(() => {
    const fixed = ['crypto', 'ai'];
    const all = new Set<string>(fixed);
    for (const k of Array.from(tagStats.domainCount.keys())) all.add(k);

    return Array.from(all)
      .filter(Boolean)
      .map((id) => {
        const children =
          id === 'crypto'
            ? Array.from(tagStats.cryptoSubCount.entries())
              .sort((a, b) => b[1] - a[1])
              .map(([sid, c]) => ({ id: sid, name: sid, count: c }))
            : id === 'ai'
              ? Array.from(tagStats.aiSubCount.entries())
                .sort((a, b) => b[1] - a[1])
                .map(([sid, c]) => ({ id: sid, name: sid, count: c }))
              : undefined;

        const count = children
          ? children.reduce((sum, c) => sum + (c.count || 0), 0)
          : tagStats.domainCount.get(id) || 0;

        return {
          id,
          name: id,
          count,
          children,
        };
      })
      .sort((a, b) => {
        if (a.id === 'crypto') return -1;
        if (b.id === 'crypto') return 1;
        if (a.id === 'ai') return -1;
        if (b.id === 'ai') return 1;
        return b.count - a.count;
      });
  }, [tagStats]);

  const hotTagGroups: TagGroup[] = React.useMemo(() => {
    return Array.from(tagStats.hotTagCount.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([id, c]) => ({ id, name: id, count: c }));
  }, [tagStats]);

  const hotTagCountRange = React.useMemo(() => {
    if (hotTagGroups.length === 0) return { min: 0, max: 0 };
    let min = Number.POSITIVE_INFINITY;
    let max = 0;
    for (const g of hotTagGroups) {
      const c = Number(g.count || 0);
      if (c < min) min = c;
      if (c > max) max = c;
    }
    if (!Number.isFinite(min)) min = 0;
    return { min, max };
  }, [hotTagGroups]);

  const [theme] = useLocalStorage<'light' | 'dark' | ''>('@xhunt/theme', 'dark');

  const getHotTagStyle = React.useCallback((count: number) => {
    const min = hotTagCountRange.min;
    const max = hotTagCountRange.max;
    const denom = Math.max(1, max - min);
    const ratio = Math.min(1, Math.max(0, (count - min) / denom));

    const isDark = theme === 'dark';

    // 非常淡的暖色系（不刺眼），深浅随 count 增加
    // 白天模式更淡一些；黑夜模式需要更高对比度，否则看不清
    const alpha = isDark ? 0.03 + ratio * 0.08 : 0.008 + ratio * 0.05;
    const borderAlpha = isDark ? 0.22 + ratio * 0.22 : 0.1 + ratio * 0.2;

    return {
      backgroundColor: `rgba(240, 45, 99, ${alpha})`,
      borderColor: `rgba(240, 45, 99, ${borderAlpha})`,
    } as React.CSSProperties;
  }, [hotTagCountRange, theme]);

  const selectedGroup = React.useMemo(() => {
    if (selectedType !== 'domain') return null;
    return domainGroups.find((g) => g.id === selectedGroupId) || null;
  }, [selectedType, selectedGroupId, domainGroups]);

  const selectedSubTag = React.useMemo(() => {
    if (!selectedGroup || !selectedSubTagId) return null;
    const children = selectedGroup.children || [];
    return children.find((c) => c.id === selectedSubTagId) || null;
  }, [selectedGroup, selectedSubTagId]);

  const hasAnySelection = Boolean(
    selectedType || selectedHotTag || selectedGroupId || selectedSubTagId
  );

  const summaryText = React.useMemo(() => {
    if (!hasAnySelection) return t('tweet_tag_filter_all_tags');

    if (selectedType === 'hot') {
      if (!selectedHotTag) return t('tweet_tag_filter_hot_tags');
      const g = hotTagGroups.find((x) => x.id === selectedHotTag);
      const hotName = g ? translateTag(g.name) : translateTag(selectedHotTag);
      return g
        ? `${t('tweet_tag_filter_hot')} / ${hotName} (${g.count})`
        : `${t('tweet_tag_filter_hot')} / ${hotName}`;
    }

    if (!selectedGroup) return t('tweet_tag_filter_domain_tags');

    if (!selectedSubTag) {
      const name = String(selectedGroup.name || '');
      const display = ['crypto', 'ai'].includes(name.toLowerCase())
        ? name.toLowerCase().charAt(0).toUpperCase() + name.toLowerCase().slice(1)
        : name;
      return `${translateTag(display)} (${selectedGroup.count})`;
    }

    return `${translateTag(selectedGroup.name)} / ${translateTag(selectedSubTag.name)}`;
  }, [
    t,
    translateTag,
    hasAnySelection,
    selectedType,
    selectedHotTag,
    selectedGroup,
    selectedSubTag,
    hotTagGroups,
  ]);

  // 预览标签：当没有选中时显示部分标签
  const previewTags = React.useMemo(() => {
    const tags: Array<{ id: string; name: string; count: number; type: 'domain' | 'hot' }> = [];

    // 添加前3个 domain 标签
    domainGroups.slice(0, 2).forEach((g) => {
      tags.push({ id: g.id, name: g.name, count: g.count, type: 'domain' });
    });

    // 添加前2个 hot 标签
    hotTagGroups.slice(0, 3).forEach((g) => {
      tags.push({ id: g.id, name: g.name, count: g.count, type: 'hot' });
    });

    return tags;
  }, [domainGroups, hotTagGroups]);

  const scroll = useScroll(scrollContainerRef);
  const isAtTop = (scroll?.top || 0) <= 4;

  const showExpanded = isHovered;

  React.useEffect(() => {
    onExpandChange?.(isHovered);
    return () => onExpandChange?.(false);
  }, [isHovered, onExpandChange]);

  const clearSubCloseTimer = React.useCallback(() => {
    if (subCloseTimerRef.current) {
      window.clearTimeout(subCloseTimerRef.current);
      subCloseTimerRef.current = null;
    }
  }, []);

  const clearOpenTimer = React.useCallback(() => {
    if (openTimerRef.current) {
      window.clearTimeout(openTimerRef.current);
      openTimerRef.current = null;
    }
  }, []);

  const clearSubOpenTimer = React.useCallback(() => {
    if (subOpenTimerRef.current) {
      window.clearTimeout(subOpenTimerRef.current);
      subOpenTimerRef.current = null;
    }
  }, []);

  const scheduleCloseExpandedGroup = React.useCallback((groupId: string) => {
    clearSubCloseTimer();
    subCloseTimerRef.current = window.setTimeout(() => {
      setExpandedGroupId((prev) => (prev === groupId ? null : prev));
    }, 200);
  }, [clearSubCloseTimer]);

  // window 滚动：用全局 hook 统一监听，避免多组件各自 addEventListener
  useGlobalScroll(() => {
    if (!expandedGroupId) return;
    const el = groupAnchorRefs.current[expandedGroupId];
    if (!el) return;
    const r = el.getBoundingClientRect();
    setSubMenuAnchorRects((prev) => ({
      ...prev,
      [expandedGroupId]: {
        left: r.left,
        top: r.top,
        right: r.right,
        bottom: r.bottom,
        width: r.width,
        height: r.height,
      },
    }));
  }, [expandedGroupId]);

  // window resize：用全局 hook 统一监听
  useGlobalResize(() => {
    if (!expandedGroupId) return;
    const el = groupAnchorRefs.current[expandedGroupId];
    if (!el) return;
    const r = el.getBoundingClientRect();
    setSubMenuAnchorRects((prev) => ({
      ...prev,
      [expandedGroupId]: {
        left: r.left,
        top: r.top,
        right: r.right,
        bottom: r.bottom,
        width: r.width,
        height: r.height,
      },
    }));
  }, [expandedGroupId]);

  return (
    <div
      className='sticky top-0 z-[70]'
      onMouseEnter={() => {
        // 清除关闭定时器
        if (closeTimerRef.current) {
          window.clearTimeout(closeTimerRef.current);
          closeTimerRef.current = null;
        }
        // 如果已经显示，不需要延迟
        if (isHovered) return;
        // 设置 800ms 延迟显示
        clearOpenTimer();
        openTimerRef.current = window.setTimeout(() => {
          setIsHovered(true);
        }, 800);
      }}
      onMouseLeave={() => {
        // 清除打开定时器
        clearOpenTimer();
        // 设置关闭延迟
        if (closeTimerRef.current) {
          window.clearTimeout(closeTimerRef.current);
        }
        closeTimerRef.current = window.setTimeout(() => {
          setIsHovered(false);
          setExpandedGroupId(null);
        }, 120);
      }}
    >
      <button
        type='button'
        className={`group w-full border px-3 py-1.5 text-left transition-colors ${isAtTop ? 'rounded-xl' : 'rounded-none'
          } ${'theme-border theme-hover'}`}
        style={{
          backgroundColor: 'var(--xhunt-web-bg)',
        }}
        onClick={() => {
          // 点击立即显示/隐藏，清除所有定时器
          clearOpenTimer();
          if (closeTimerRef.current) {
            window.clearTimeout(closeTimerRef.current);
            closeTimerRef.current = null;
          }
          setIsHovered((v) => !v);
          if (showExpanded) {
            setExpandedGroupId(null);
          }
        }}
      >
        <div className='flex items-center justify-between gap-3'>
          <div className='min-w-0 flex items-center gap-2 flex-1'>
            <span className='inline-flex h-7 w-7 items-center justify-center rounded-lg theme-bg-tertiary/30 theme-border border group-hover:theme-bg-tertiary/45 transition-colors shrink-0'>
              <Filter className='h-4 w-4 theme-text-tertiary' />
            </span>
            {hasAnySelection ? (
              <div className='min-w-0'>
                <div className='text-xs font-semibold theme-text-primary truncate'>
                  {summaryText}
                </div>
              </div>
            ) : (
              <div className='min-w-0 flex items-center gap-1.5 overflow-hidden'>
                {previewTags.slice(0, 4).map((tag) => {
                  const displayName = ['crypto', 'ai'].includes(tag.name.toLowerCase())
                    ? tag.name.toLowerCase().charAt(0).toUpperCase() + tag.name.toLowerCase().slice(1)
                    : tag.name;
                  return (
                    <span
                      key={`${tag.type}-${tag.id}`}
                      className='inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium theme-bg-tertiary/20 theme-border-soft theme-text-primary shrink-0 whitespace-nowrap'
                    >
                      {translateTag(displayName)}
                    </span>
                  );
                })}
                {previewTags.length > 4 && (
                  <span className='text-[10px] theme-text-tertiary shrink-0 whitespace-nowrap'>
                    ...
                  </span>
                )}
              </div>
            )}
          </div>

          <div className='flex items-center gap-2 shrink-0'>
            {hasAnySelection && (
              <button
                type='button'
                className='p-1 rounded-full theme-hover'
                onClick={(e) => {
                  e.stopPropagation();
                  onChange({
                    type: null,
                    groupId: null,
                    subTagId: null,
                    hotTag: null,
                  });
                }}
                aria-label={t('clear_filter')}
              >
                <X className='w-3.5 h-3.5 theme-text-tertiary' />
              </button>
            )}

            {showExpanded ? (
              <ChevronDown className='w-4 h-4 theme-text-tertiary' />
            ) : (
              <ChevronRight className='w-4 h-4 theme-text-tertiary' />
            )}
          </div>
        </div>
      </button>

      <div
        className={`absolute left-0 right-0 top-full mt-1 z-50 rounded-xl border theme-border theme-bg-primary p-3 shadow-lg transition-all duration-150 ${showExpanded
          ? 'opacity-100 translate-y-0 pointer-events-auto'
          : 'opacity-0 -translate-y-1 pointer-events-none'
          }`}
        style={{
          backgroundColor: 'var(--xhunt-web-bg)',
          backgroundImage: 'none',
          opacity: showExpanded ? 1 : 0,
        }}
        onMouseEnter={() => {
          // 鼠标进入弹层时，清除关闭定时器
          if (closeTimerRef.current) {
            window.clearTimeout(closeTimerRef.current);
            closeTimerRef.current = null;
          }
          // 如果还没显示，立即显示（因为已经通过了延迟）
          if (!isHovered) {
            clearOpenTimer();
            setIsHovered(true);
          }
        }}
        onMouseLeave={() => {
          // 鼠标离开弹层时，设置关闭延迟
          clearOpenTimer();
          if (closeTimerRef.current) {
            window.clearTimeout(closeTimerRef.current);
          }
          closeTimerRef.current = window.setTimeout(() => {
            setIsHovered(false);
            setExpandedGroupId(null);
          }, 120);
        }}
      >
        <div className='space-y-4'>
          {/* Domain Tags 分组 */}
          {domainGroups.length > 0 && (
            <div>
              <div className='text-xs font-semibold theme-text-secondary mb-2'>
                {t('tweet_tag_filter_domain_tags')}
              </div>
              <div className='flex flex-wrap gap-2'>
                {domainGroups.map((g) => {
                  const isExpandedGroup = expandedGroupId === g.id;
                  const isSelected = selectedType === 'domain' && selectedGroupId === g.id;
                  const hasChildren = (g.children?.length || 0) > 0;

                  return (
                    <div
                      key={g.id}
                      ref={(el) => {
                        groupAnchorRefs.current[g.id] = el;
                      }}
                      className='relative'
                      onMouseEnter={(e) => {
                        if (hasChildren) {
                          clearSubOpenTimer();
                          clearSubCloseTimer();

                          const anchorEl = e.currentTarget as HTMLElement;
                          const placement: { left?: number; top?: number; bottom?: number } = {};

                          if (g.id === 'crypto') {
                            placement.left = 8;
                          } else if (g.id === 'ai') {
                            placement.left = -40;
                          } else {
                            placement.left = -40;
                          }

                          const estimatedHeight = 180;
                          const gap = 2;
                          const containerEl = scrollContainerRef.current;
                          if (containerEl) {
                            const anchorRect = anchorEl.getBoundingClientRect();
                            const containerRect = containerEl.getBoundingClientRect();
                            const availableBottom = containerRect.bottom - anchorRect.bottom;
                            if (availableBottom < estimatedHeight + gap) {
                              placement.bottom = anchorEl.offsetHeight + gap;
                            } else {
                              placement.top = anchorEl.offsetHeight + gap;
                            }
                          }

                          setSubMenuPlacement((prev) => ({
                            ...prev,
                            [g.id]: placement,
                          }));
                          const rect = anchorEl.getBoundingClientRect();
                          setSubMenuAnchorRects((prev) => ({
                            ...prev,
                            [g.id]: {
                              left: rect.left,
                              top: rect.top,
                              right: rect.right,
                              bottom: rect.bottom,
                              width: rect.width,
                              height: rect.height,
                            },
                          }));

                          subOpenTimerRef.current = window.setTimeout(() => {
                            setExpandedGroupId(g.id);
                          }, 800);
                        }
                      }}
                      onMouseLeave={() => {
                        if (hasChildren) {
                          clearSubOpenTimer();
                          scheduleCloseExpandedGroup(g.id);
                        }
                      }}
                    >
                      <button
                        type='button'
                        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors ${isSelected
                          ? 'bg-zinc-500/40 border-zinc-500/50 text-[var(--text-primary)] font-semibold'
                          : 'theme-bg-tertiary/20 theme-border-soft theme-text-primary hover:theme-bg-tertiary/40'
                          }`}
                        onClick={() => {
                          // 先选中一级标签（进行筛选）
                          onChange({
                            type: 'domain',
                            groupId: g.id,
                            subTagId: null,
                            hotTag: null,
                          });

                          if (hasChildren) {
                            // 点击有二级菜单的分组时，立即打开/关闭二级菜单
                            clearSubOpenTimer();
                            clearSubCloseTimer();

                            setExpandedGroupId((prev) => {
                              const next = prev === g.id ? null : g.id;

                              if (next) {
                                // 确保有定位信息与 anchor rect（点击打开时）
                                const anchorEl = groupAnchorRefs.current[g.id];
                                if (!subMenuPlacement[g.id] || !subMenuAnchorRects[g.id]) {
                                  const placement: {
                                    left?: number;
                                    top?: number;
                                    bottom?: number;
                                  } = {};

                                  if (g.id === 'crypto') {
                                    placement.left = 8;
                                  } else if (g.id === 'ai') {
                                    placement.left = -40;
                                  } else {
                                    placement.left = -40;
                                  }

                                  const estimatedHeight = 180;
                                  const gap = 2;
                                  const containerEl = scrollContainerRef.current;
                                  if (containerEl && anchorEl) {
                                    const anchorRect = anchorEl.getBoundingClientRect();
                                    const containerRect = containerEl.getBoundingClientRect();
                                    const availableBottom = containerRect.bottom - anchorRect.bottom;
                                    if (availableBottom < estimatedHeight + gap) {
                                      placement.bottom = anchorEl.offsetHeight + gap;
                                    } else {
                                      placement.top = anchorEl.offsetHeight + gap;
                                    }
                                  }

                                  setSubMenuPlacement((prevPlc) => ({
                                    ...prevPlc,
                                    [g.id]: { ...placement, ...(prevPlc[g.id] || {}) },
                                  }));
                                  if (anchorEl) {
                                    const rect = anchorEl.getBoundingClientRect();
                                    setSubMenuAnchorRects((prev) => ({
                                      ...prev,
                                      [g.id]: {
                                        left: rect.left,
                                        top: rect.top,
                                        right: rect.right,
                                        bottom: rect.bottom,
                                        width: rect.width,
                                        height: rect.height,
                                      },
                                    }));
                                  }
                                }
                              }

                              return next;
                            });
                          } else {
                            // 没有子菜单时，关闭其他已展开的二级菜单
                            setExpandedGroupId(null);
                          }
                        }}
                      >
                        <span className='truncate max-w-[110px]'>
                          {translateTag(
                            ['crypto', 'ai'].includes(String(g.name || '').toLowerCase())
                              ? String(g.name || '').toLowerCase().charAt(0).toUpperCase() +
                              String(g.name || '').toLowerCase().slice(1)
                              : String(g.name || '')
                          )} ({g.count})
                        </span>
                        {hasChildren ? (
                          isExpandedGroup ? (
                            <ChevronDown className='w-3.5 h-3.5 opacity-80' />
                          ) : (
                            <ChevronRight className='w-3.5 h-3.5 opacity-70' />
                          )
                        ) : null}
                      </button>

                      {/* 二级菜单通过 Portal 渲染，避免被父级 overflow 裁切 */}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 二级标签浮层通过 Portal 渲染到 body，避免被父级 overflow 裁切 */}
          {expandedGroupId &&
            (() => {
              const g = domainGroups.find((x) => x.id === expandedGroupId);
              const anchor = subMenuAnchorRects[expandedGroupId];
              const placement = subMenuPlacement[expandedGroupId];
              if (!g?.children?.length || !anchor || !placement) return null;
              const fixedStyle: React.CSSProperties = {
                position: 'fixed',
                zIndex: 60,
                minWidth: 240,
                maxWidth: 320,
                left: anchor.left + (placement.left ?? 0),
                ...(placement.top != null
                  ? { top: anchor.bottom + placement.top - 16 }
                  : placement.bottom != null && typeof window !== 'undefined'
                    ? { bottom: window.innerHeight - anchor.bottom + placement.bottom }
                    : {}),
              };
              return createPortal(
                <div
                  className='rounded-xl border p-2 shadow-lg'
                  style={{
                    backgroundColor: theme === 'dark' ? '#15202b' : '#ffffff',
                    borderColor: theme === 'dark' ? '#374151' : '#eff3f4',
                    backgroundImage: 'none',
                    ...fixedStyle,
                  }}
                  onMouseEnter={() => {
                    if (closeTimerRef.current) {
                      window.clearTimeout(closeTimerRef.current);
                      closeTimerRef.current = null;
                    }
                    setIsHovered(true);
                    clearSubCloseTimer();
                    setExpandedGroupId(expandedGroupId);
                  }}
                  onMouseLeave={() => scheduleCloseExpandedGroup(expandedGroupId)}
                >
                  <div className='flex flex-wrap gap-2'>
                    {(g.children || []).map((c) => {
                      const active = selectedSubTagId === c.id;
                      return (
                        <button
                          key={c.id}
                          type='button'
                          className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] transition-colors ${active
                            ? 'font-semibold'
                            : ''
                            }`}
                          style={active
                            ? {
                                backgroundColor: 'rgba(161, 161, 170, 0.4)',
                                borderColor: 'rgba(161, 161, 170, 0.5)',
                                color: theme === 'dark' ? '#ffffff' : '#000000',
                              }
                            : {
                                backgroundColor: theme === 'dark' ? 'rgba(30, 39, 50, 0.2)' : 'rgba(243, 244, 246, 0.2)',
                                borderColor: theme === 'dark' ? 'rgba(163, 172, 184, 0.4)' : 'rgba(107, 114, 128, 0.2)',
                                color: theme === 'dark' ? '#ffffff' : '#000000',
                              }
                          }
                          onClick={() => {
                            onChange({
                              type: 'domain',
                              groupId: g.id,
                              subTagId: c.id,
                              hotTag: null,
                            });
                          }}
                        >
                          {translateTag(c.name)} ({c.count})
                        </button>
                      );
                    })}
                  </div>
                </div>,
                document.body
              );
            })()}

          {/* Hot Tags 分组 */}
          {hotTagGroups.length > 0 && (
            <div>
              <div className='text-xs font-semibold theme-text-secondary mb-2'>
                <svg className="w-3.5 h-3.5 mr-0.5 inline-block" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="5077" width="64" height="64"><path d="M206.9 348.7c53.2-60.2 95.8-127.2 90.6-200.9-0.5-7.5-0.4-15-0.9-22.4-0.3-3.6 2.4-6.7 6.1-7 2.2-0.1 4.3-0.3 6.4-0.3 160.2 0 290.1 124 290.1 276.9 0 11.5-0.8 22.7-2.3 33.8-0.8 6.1 6.4 9.7 10.8 5.4 46.2-44.6 76.7-103.9 82.8-170.2 0.4-4.6 5.5-7.3 9.7-4.9 106.4 62.5 177.5 174.3 177.5 302.3 0 146.3-92.9 271.9-225.5 326-24 9.8-50.7 11.2-75.7 4-57.3-16.4-111.5-46.7-156.9-90.8-17-16.6-31.8-34.5-44.9-53.2-3-4.4-9.7-3.4-11.3 1.5-13.5 39.1-19.9 79.9-19.3 120.8 0.1 4.8-4.9 8-9.3 5.9-118.5-59.3-199.7-177.5-199.7-314.2 0-76.2 24.1-149.5 67-207.3" fill="#F02D63" p-id="5078"></path></svg>
                {t('tweet_tag_filter_hot_tags')}
              </div>
              <div className='flex flex-wrap gap-2'>
                {hotTagGroups.map((g) => {
                  const isSelected = selectedType === 'hot' && selectedHotTag === g.id;

                  return (
                    <button
                      key={g.id}
                      type='button'
                      style={isSelected
                        ? {
                          backgroundColor:
                            theme === 'dark'
                              ? 'rgba(240, 45, 99, 0.3)'
                              : 'rgba(240, 45, 99, 0.3)',
                          borderColor:
                            theme === 'dark'
                              ? 'rgba(240, 45, 99, 0.55)'
                              : 'rgba(240, 45, 99, 0.38)',
                        }
                        : getHotTagStyle(g.count)}
                      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors ${isSelected
                        ? 'text-[var(--text-primary)] font-semibold'
                        : 'theme-border-soft theme-text-primary hover:theme-bg-tertiary/40'
                        }`}
                      onClick={() => {
                        onChange({
                          type: 'hot',
                          groupId: null,
                          subTagId: null,
                          hotTag: g.id,
                        });
                        setExpandedGroupId(null);
                      }}
                    >
                      <span className='truncate max-w-[110px]'>
                        {translateTag(g.name)} ({g.count})
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
