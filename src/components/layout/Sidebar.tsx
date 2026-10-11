import React from 'react';
import {
  LayoutDashboard,
  Layers,
  CheckCircle2,
  Calendar,
  Bell,
  FileBarChart2,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  FlaskConical,
} from 'lucide-react';

import { AuthUser } from '../../types';

interface SidebarProps {
  currentPath: string;
  onNavigate: (path: string) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
  unreadCount: number;
  currentUser?: AuthUser | null;
  onLogout?: () => void;
}

interface NavItem {
  name: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentPath,
  onNavigate,
  isCollapsed,
  onToggleCollapse,
  mobileOpen,
  onMobileClose,
  unreadCount,
}) => {
  const workspaceItems: NavItem[] = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Equipment', path: '/equipment', icon: Layers },
    { name: 'Calibration', path: '/calibration', icon: CheckCircle2 },
    { name: 'Calendar', path: '/calendar', icon: Calendar },
  ];

  const monitoringItems: NavItem[] = [
    { name: 'Notifications', path: '/notifications', icon: Bell, badge: unreadCount },
    { name: 'Reports', path: '/reports', icon: FileBarChart2 },
  ];

  const systemItems: NavItem[] = [
    { name: 'Settings', path: '/settings', icon: Settings },
  ];

  const isActive = (path: string) => {
    if (path === '/equipment') {
      return currentPath === '/equipment' || currentPath.startsWith('/equipment/');
    }
    return currentPath === path;
  };

  const renderNavSection = (title: string, items: NavItem[]) => (
    <div className="mb-6">
      {!isCollapsed && (
        <h4 className="px-3 mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
          {title}
        </h4>
      )}
      <ul className="space-y-1">
        {items.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);
          return (
            <li key={item.path}>
              <button
                onClick={() => {
                  onNavigate(item.path);
                  if (mobileOpen) onMobileClose();
                }}
                title={isCollapsed ? item.name : undefined}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all group ${
                  active
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                } ${isCollapsed ? 'justify-center px-2' : ''}`}
              >
                <Icon
                  className={`w-4 h-4 shrink-0 transition-colors ${
                    active ? 'text-white' : 'text-slate-400 group-hover:text-white'
                  }`}
                />
                {!isCollapsed && (
                  <span className="flex-1 text-left truncate">{item.name}</span>
                )}
                {!isCollapsed && item.badge !== undefined && item.badge > 0 && (
                  <span
                    className={`ml-auto text-[11px] font-semibold px-1.5 py-0.5 rounded-full ${
                      active ? 'bg-white text-blue-700' : 'bg-rose-500 text-white'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
                {isCollapsed && item.badge !== undefined && item.badge > 0 && (
                  <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-slate-900" />
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );

  const sidebarContent = (
    <div className="flex flex-col h-full bg-slate-900 text-slate-100 select-none">
      {/* Brand Header */}
      <div className={`h-16 flex items-center px-4 border-b border-slate-800 ${isCollapsed ? 'justify-center px-2' : 'justify-between'}`}>
        <div
          onClick={() => onNavigate('/dashboard')}
          className="flex items-center gap-2.5 cursor-pointer"
        >
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20 shrink-0">
            <FlaskConical className="w-4 h-4" />
          </div>
          {!isCollapsed && (
            <div className="flex flex-col">
              <span className="font-bold tracking-tight text-white text-base leading-none">
                CALIBTRACK
              </span>
              <span className="text-[10px] text-slate-400 tracking-wider uppercase mt-1">
                Lab Metrology Suite
              </span>
            </div>
          )}
        </div>

        {/* Desktop Collapse Toggle */}
        <button
          onClick={onToggleCollapse}
          className="hidden lg:flex p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <ChevronLeft className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-2">
        {renderNavSection('Workspace', workspaceItems)}
        {renderNavSection('Monitoring', monitoringItems)}
        {renderNavSection('System', systemItems)}
      </div>

      {/* ISO Compliance indicator (subtle laboratory badge) */}
      {!isCollapsed && (
        <div className="mx-3 mb-3 p-3 rounded-lg bg-slate-800/60 border border-slate-700/60 text-xs">
          <div className="flex items-center gap-2 text-slate-300 font-medium">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>ISO/IEC 17025 Ready</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
            Audit logging & NIST calibration standards active
          </p>
        </div>
      )}

      {/* User profile & logout at bottom */}
      <div className="p-3 border-t border-slate-800 bg-slate-900/90">
        <div className={`flex items-center gap-3 ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative shrink-0">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-700 to-indigo-500 text-white flex items-center justify-center font-semibold text-xs border border-slate-700 uppercase">
                {currentUser?.name ? currentUser.name.slice(0, 2) : 'AU'}
              </div>
              <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-slate-900" />
            </div>

            {!isCollapsed && (
              <div className="min-w-0">
                <p className="text-xs font-semibold text-white truncate">
                  {currentUser?.name || 'Staff User'}
                </p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span
                    className={`inline-block px-1.5 py-0.2 rounded text-[9px] font-semibold tracking-wider uppercase ${
                      currentUser?.role === 'ADMIN'
                        ? 'bg-purple-900/80 text-purple-200 border border-purple-700/50'
                        : 'bg-blue-900/80 text-blue-200 border border-blue-700/50'
                    }`}
                  >
                    {currentUser?.role || 'TECHNICIAN'}
                  </span>
                </div>
              </div>
            )}
          </div>

          {!isCollapsed && onLogout && (
            <button
              onClick={onLogout}
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Drawer Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-xs lg:hidden transition-opacity"
          onClick={onMobileClose}
        />
      )}

      {/* Mobile Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 lg:hidden transform transition-transform duration-200 ease-in-out ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {sidebarContent}
      </aside>

      {/* Desktop Fixed Sidebar */}
      <aside
        className={`hidden lg:block shrink-0 h-screen sticky top-0 transition-all duration-200 border-r border-slate-800 ${
          isCollapsed ? 'w-16' : 'w-64'
        }`}
      >
        {sidebarContent}
      </aside>
    </>
  );
};
