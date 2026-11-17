import React, { useState } from 'react';
import {
  ChevronDown,
  ChevronLeft,
  PanelLeftClose,
  PanelLeftOpen,
  X
} from 'lucide-react';

/**
 * CollapsibleFeatureSidebar
 * Shared collapsible 16-feature sidebar for both Teacher & Student portals.
 * Supports smooth width drawer collapse (288px <-> 76px Icon Rail),
 * per-group accordion toggle, edge drawer handle, unclipped fixed tooltips,
 * and a slide-over Mobile Drawer on viewports < md.
 */
export default function CollapsibleFeatureSidebar({
  sidebarId = 'left-sidebar',
  toggleBtnId = 'btn-toggle-sidebar',
  edgeHandleId = 'btn-sidebar-edge-handle',
  accentColor = 'emerald', // 'emerald' | 'cyan'
  isCollapsed,
  onToggleCollapse,
  isMobileOpen = false,
  onCloseMobile = () => {},
  collapsedGroups,
  onToggleGroup,
  featureGroups,
  onSelectFeature,
  profileCard,
  collapsedAvatarText = 'GV',
  collapsedAvatarTitle = 'Tài khoản',
  securityBadge,
  footerStatusText,
  footerVersionText
}) {
  const [hoveredTooltip, setHoveredTooltip] = useState(null);

  const isEmerald = accentColor === 'emerald';
  const accentRingClass = isEmerald
    ? 'focus-visible:ring-emerald-500/60'
    : 'focus-visible:ring-cyan-500/60';
  const indicatorBgClass = isEmerald
    ? 'bg-emerald-500 dark:bg-[#00dfa2] shadow-[0_0_12px_rgba(0,223,162,0.75)]'
    : 'bg-sky-500 dark:bg-[#00b4d8] shadow-[0_0_12px_rgba(0,180,216,0.75)]';
  const edgeAccentHoverClass = isEmerald
    ? 'hover:border-emerald-500 hover:text-emerald-600 dark:hover:border-[#00dfa2] dark:hover:text-[#00dfa2]'
    : 'hover:border-sky-500 hover:text-sky-600 dark:hover:border-[#00b4d8] dark:hover:text-[#00b4d8]';

  const handleRailMouseEnter = (e, tooltipData) => {
    if (!isCollapsed) return;
    const rect = e.currentTarget.getBoundingClientRect();
    setHoveredTooltip({
      ...tooltipData,
      top: rect.top + rect.height / 2,
      left: rect.right + 12
    });
  };

  return (
    <>
      <aside
        id={sidebarId}
        aria-label="Thanh điều hướng tính năng"
        className={`sidebar-pro-shell relative md:sticky md:top-16 md:h-[calc(100vh-4rem)] border-r border-slate-200 dark:border-slate-800/80 bg-slate-50/85 dark:bg-[#0a1120] hidden md:flex flex-col justify-between shrink-0 z-20 ${
          isCollapsed ? 'w-[76px] min-w-[76px] px-2 py-3.5' : 'w-72 min-w-[288px] px-3.5 py-3.5'
        }`}
      >
      {/* Floating Edge Handle ("Nút sổ thanh công cụ" sát mép phải Sidebar) */}
      <button
        id={edgeHandleId}
        type="button"
        onClick={() => {
          setHoveredTooltip(null);
          onToggleCollapse();
        }}
        aria-label={isCollapsed ? 'Mở rộng thanh công cụ' : 'Thu gọn thanh công cụ'}
        aria-expanded={!isCollapsed}
        title={isCollapsed ? 'Sổ mở rộng thanh công cụ' : 'Ẩn / thu gọn thanh công cụ'}
        className={`sidebar-edge-handle ${edgeAccentHoverClass} ${accentRingClass} absolute top-6 -right-3.5 z-30 w-7 h-7 rounded-full bg-white dark:bg-[#0f192e] border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 shadow-lg flex items-center justify-center cursor-pointer focus:outline-none focus-visible:ring-2`}
      >
        <ChevronLeft
          className={`w-4 h-4 transition-transform duration-300 ease-out ${
            isCollapsed ? 'rotate-180' : 'rotate-0'
          }`}
        />
      </button>

      {/* Top Section: Header Drawer Toggle & Profile */}
      <div className="flex flex-col min-h-0 flex-1 space-y-3">
        {/* Toolbar Collapse / Expand Header Button */}
        <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'justify-between gap-2'}`}>
          {!isCollapsed && (
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 pl-1 whitespace-nowrap">
              Thanh Tính Năng (16)
            </span>
          )}
          <button
            id={toggleBtnId}
            type="button"
            onClick={() => {
              setHoveredTooltip(null);
              onToggleCollapse();
            }}
            onMouseEnter={(e) =>
              handleRailMouseEnter(e, {
                groupTitle: 'Thanh công cụ',
                label: 'Mở rộng thanh tính năng (16)',
                badge: 'Sổ'
              })
            }
            onMouseLeave={() => setHoveredTooltip(null)}
            aria-label={isCollapsed ? 'Mở rộng thanh công cụ' : 'Thu gọn thanh công cụ'}
            aria-expanded={!isCollapsed}
            className={`${accentRingClass} ${edgeAccentHoverClass} cursor-pointer rounded-xl border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-[#0f192e] text-slate-700 dark:text-slate-200 shadow-sm transition-all flex items-center justify-center focus:outline-none focus-visible:ring-2 ${
              isCollapsed
                ? 'w-11 h-11'
                : 'px-2.5 py-1.5 gap-1.5 text-[11px] font-bold hover:shadow'
            }`}
          >
            {isCollapsed ? (
              <PanelLeftOpen className="w-4 h-4" />
            ) : (
              <>
                <PanelLeftClose className="w-3.5 h-3.5" />
                <span>Thu gọn</span>
              </>
            )}
          </button>
        </div>

        {/* Quick Profile Card (Expanded) or Compact Avatar Badge (Collapsed Icon Rail) */}
        {isCollapsed ? (
          <div className="flex justify-center pb-1">
            <div
              onMouseEnter={(e) =>
                handleRailMouseEnter(e, {
                  groupTitle: 'Tài khoản đang dùng',
                  label: collapsedAvatarTitle,
                  badge: 'Online'
                })
              }
              onMouseLeave={() => setHoveredTooltip(null)}
              className={`relative w-11 h-11 rounded-2xl font-extrabold text-xs flex items-center justify-center border shadow-sm cursor-default transition-transform hover:scale-105 ${
                isEmerald
                  ? 'bg-emerald-500/15 text-emerald-700 dark:text-[#00dfa2] border-emerald-500/30'
                  : 'bg-cyan-500/15 text-sky-700 dark:text-[#00b4d8] border-cyan-500/30'
              }`}
            >
              {collapsedAvatarText}
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white dark:border-[#0a1120] animate-pulse" />
            </div>
          </div>
        ) : (
          <div className="animate-fadeIn">{profileCard}</div>
        )}

        {/* Scrollable 16-Feature Groups Navigation */}
        <nav
          aria-label="Danh sách 16 tính năng lớn"
          className={`flex-1 min-h-0 overflow-y-auto overflow-x-hidden pr-0.5 ${
            isCollapsed ? 'space-y-2' : 'space-y-3'
          }`}
        >
          {featureGroups.map((group) => {
            const isGroupCollapsed = Boolean(collapsedGroups[group.id]);

            if (isCollapsed) {
              return (
                <div
                  key={group.id}
                  className="pt-2 first:pt-0 border-t first:border-t-0 border-slate-200/80 dark:border-slate-800/80 flex flex-col items-center gap-1.5"
                >
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.key}
                        id={item.navId}
                        type="button"
                        onClick={() => onSelectFeature(item.key)}
                        onMouseEnter={(e) =>
                          handleRailMouseEnter(e, {
                            groupTitle: group.title,
                            label: item.label,
                            badge: item.badge
                          })
                        }
                        onMouseLeave={() => setHoveredTooltip(null)}
                        aria-label={item.label}
                        className={`sidebar-rail-btn ${accentRingClass} w-11 h-11 rounded-xl flex items-center justify-center cursor-pointer focus:outline-none focus-visible:ring-2 ${
                          item.isActive
                            ? `${item.activeClass} ring-1 ring-inset ring-current/20`
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white hover:bg-slate-200/70 dark:hover:bg-slate-800/70'
                        }`}
                      >
                        {item.isActive && (
                          <span className={`sidebar-active-indicator ${indicatorBgClass}`} />
                        )}
                        <Icon className={`w-[18px] h-[18px] ${item.iconClass}`} />
                        {item.badge != null && (
                          <span
                            className={`absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-[#0a1120] ${
                              typeof item.badge === 'number' || item.badge === 'LIVE'
                                ? 'bg-rose-500 animate-pulse'
                                : isEmerald
                                ? 'bg-emerald-500'
                                : 'bg-sky-500'
                            }`}
                          />
                        )}
                      </button>
                    );
                  })}
                </div>
              );
            }

            return (
              <div key={group.id} className="space-y-1">
                {/* Accordion Group Header */}
                <button
                  type="button"
                  onClick={() => onToggleGroup(group.id)}
                  aria-expanded={!isGroupCollapsed}
                  className="w-full flex items-center justify-between px-2 py-1 rounded-lg text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800/40 transition-colors cursor-pointer"
                >
                  <span className="truncate text-left">{group.title}</span>
                  <div className="flex items-center gap-1 shrink-0">
                    <span className="px-1.5 py-0.2 rounded bg-slate-200/70 dark:bg-slate-800 text-[9px] font-bold text-slate-600 dark:text-slate-400">
                      {group.items.length}
                    </span>
                    <ChevronDown
                      className={`w-3.5 h-3.5 transition-transform duration-300 ease-out ${
                        isGroupCollapsed ? '-rotate-90' : 'rotate-0'
                      }`}
                    />
                  </div>
                </button>

                {/* Accordion Group Body */}
                <div
                  className={`sidebar-group-accordion ${
                    isGroupCollapsed ? 'is-collapsed' : ''
                  }`}
                >
                  <div className="sidebar-group-inner space-y-1 pt-0.5">
                    {group.items.map((item) => {
                      const Icon = item.icon;
                      return (
                        <button
                          key={item.key}
                          id={item.navId}
                          type="button"
                          onClick={() => onSelectFeature(item.key)}
                          className={`sidebar-feature-btn ${accentRingClass} w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl text-xs font-bold cursor-pointer focus:outline-none focus-visible:ring-2 ${
                            item.isActive
                              ? item.activeClass
                              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
                          }`}
                        >
                          {item.isActive && (
                            <span className={`sidebar-active-indicator ${indicatorBgClass}`} />
                          )}
                          <div className="flex items-center gap-2.5 min-w-0">
                            <Icon className={`w-4 h-4 shrink-0 ${item.iconClass}`} />
                            <span className="text-left leading-snug truncate" title={item.label}>
                              {item.label}
                            </span>
                          </div>
                          {item.badge != null && (
                            <span
                              className={`text-[9px] px-1.5 py-0.5 rounded-full font-extrabold shrink-0 ${item.badgeClass}`}
                            >
                              {item.badge}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Security Badge inside scrollable area on Expanded mode */}
          {!isCollapsed && securityBadge && <div className="pt-2">{securityBadge}</div>}
        </nav>
      </div>

      {/* Bottom Status Footer */}
      {!isCollapsed ? (
        <div className="text-[11px] text-slate-500 pt-3 mt-2 border-t border-slate-200 dark:border-slate-800/80 space-y-1 shrink-0 animate-fadeIn">
          <div
            className={`flex items-center gap-1.5 font-semibold ${
              isEmerald
                ? 'text-emerald-600 dark:text-[#00dfa2]'
                : 'text-sky-600 dark:text-cyan-400'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full animate-pulse ${
                isEmerald ? 'bg-emerald-500' : 'bg-sky-500'
              }`}
            />
            <span>{footerStatusText}</span>
          </div>
          <div>{footerVersionText}</div>
        </div>
      ) : (
        <div className="pt-3 mt-2 border-t border-slate-200 dark:border-slate-800/80 flex justify-center shrink-0">
          <span
            title={footerStatusText}
            className={`w-2.5 h-2.5 rounded-full animate-pulse ${
              isEmerald ? 'bg-emerald-500' : 'bg-sky-500'
            }`}
          />
        </div>
      )}

      {/* Unclipped Glassmorphism Tooltip when Sidebar is in Icon Rail Mode */}
      {isCollapsed && hoveredTooltip && (
        <div
          role="tooltip"
          style={{
            position: 'fixed',
            top: `${hoveredTooltip.top}px`,
            left: `${hoveredTooltip.left}px`,
            transform: 'translateY(-50%)',
            zIndex: 70
          }}
          className="pointer-events-none"
        >
          <div className="sidebar-rail-tooltip px-3 py-2 rounded-xl bg-slate-900/95 dark:bg-[#0f192e]/95 text-white border border-slate-700/80 shadow-2xl min-w-[180px] max-w-[260px]">
            {hoveredTooltip.groupTitle && (
              <div className="text-[9px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">
                {hoveredTooltip.groupTitle}
              </div>
            )}
            <div className="flex items-center justify-between gap-2 text-xs font-extrabold">
              <span>{hoveredTooltip.label}</span>
              {hoveredTooltip.badge != null && (
                <span
                  className={`text-[9px] px-1.5 py-0.5 rounded-full font-extrabold shrink-0 ${
                    isEmerald
                      ? 'bg-emerald-500/20 text-[#00dfa2]'
                      : 'bg-cyan-500/20 text-[#00b4d8]'
                  }`}
                >
                  {hoveredTooltip.badge}
                </span>
              )}
            </div>
          </div>
        </div>
      )}
      </aside>

      {/* Mobile Slide-Over Drawer (16 Features for viewports < md) */}
      {isMobileOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-xs md:hidden animate-fadeIn"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <aside
            id={`${sidebarId}-mobile`}
            aria-label="Menu tính năng trên điện thoại"
            className="fixed inset-y-0 left-0 z-50 w-[85vw] max-w-[320px] bg-white dark:bg-[#0a1120] border-r border-slate-200 dark:border-slate-800 p-4 flex flex-col justify-between shadow-2xl md:hidden overflow-hidden"
          >
            <div className="flex flex-col min-h-0 flex-1 space-y-3">
              {/* Mobile Drawer Header */}
              <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-200 dark:border-slate-800">
                <span className="text-xs font-extrabold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                  Thanh Tính Năng (16)
                </span>
                <button
                  type="button"
                  onClick={onCloseMobile}
                  aria-label="Đóng menu"
                  className="w-10 h-10 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0f192e] text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white flex items-center justify-center cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Profile Card */}
              <div>{profileCard}</div>

              {/* Scrollable 16-Feature Groups */}
              <nav
                aria-label="Menu 16 tính năng trên điện thoại"
                className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden pr-0.5 space-y-3 no-scrollbar"
              >
                {featureGroups.map((group) => {
                  const isGroupCollapsed = Boolean(collapsedGroups[group.id]);
                  return (
                    <div key={group.id} className="space-y-1">
                      <button
                        type="button"
                        onClick={() => onToggleGroup(group.id)}
                        aria-expanded={!isGroupCollapsed}
                        className="w-full min-h-[38px] flex items-center justify-between px-2 py-1.5 rounded-lg text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/40 transition-colors cursor-pointer"
                      >
                        <span className="truncate text-left">{group.title}</span>
                        <div className="flex items-center gap-1 shrink-0">
                          <span className="px-1.5 py-0.2 rounded bg-slate-200/70 dark:bg-slate-800 text-[9px] font-bold text-slate-600 dark:text-slate-400">
                            {group.items.length}
                          </span>
                          <ChevronDown
                            className={`w-3.5 h-3.5 transition-transform duration-300 ease-out ${
                              isGroupCollapsed ? '-rotate-90' : 'rotate-0'
                            }`}
                          />
                        </div>
                      </button>

                      <div
                        className={`sidebar-group-accordion ${
                          isGroupCollapsed ? 'is-collapsed' : ''
                        }`}
                      >
                        <div className="sidebar-group-inner space-y-1 pt-0.5">
                          {group.items.map((item) => {
                            const Icon = item.icon;
                            return (
                              <button
                                key={item.key}
                                type="button"
                                onClick={() => {
                                  onSelectFeature(item.key);
                                  onCloseMobile();
                                }}
                                className={`sidebar-feature-btn ${accentRingClass} w-full min-h-[44px] flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl text-xs font-bold cursor-pointer focus:outline-none focus-visible:ring-2 ${
                                  item.isActive
                                    ? item.activeClass
                                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
                                }`}
                              >
                                {item.isActive && (
                                  <span className={`sidebar-active-indicator ${indicatorBgClass}`} />
                                )}
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <Icon className={`w-4 h-4 shrink-0 ${item.iconClass}`} />
                                  <span className="text-left leading-snug truncate">
                                    {item.label}
                                  </span>
                                </div>
                                {item.badge != null && (
                                  <span
                                    className={`text-[9px] px-1.5 py-0.5 rounded-full font-extrabold shrink-0 ${item.badgeClass}`}
                                  >
                                    {item.badge}
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {securityBadge && <div className="pt-2">{securityBadge}</div>}
              </nav>
            </div>

            {/* Footer */}
            <div className="text-[11px] text-slate-500 pt-3 mt-2 border-t border-slate-200 dark:border-slate-800/80 space-y-1 shrink-0">
              <div
                className={`flex items-center gap-1.5 font-semibold ${
                  isEmerald
                    ? 'text-emerald-600 dark:text-[#00dfa2]'
                    : 'text-sky-600 dark:text-cyan-400'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full animate-pulse ${
                    isEmerald ? 'bg-emerald-500' : 'bg-sky-500'
                  }`}
                />
                <span>{footerStatusText}</span>
              </div>
              <div>{footerVersionText}</div>
            </div>
          </aside>
        </>
      )}
    </>
  );
}
