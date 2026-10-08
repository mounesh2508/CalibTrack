import React, { useState } from 'react';
import { Menu, Search, Bell, Plus, Check } from 'lucide-react';
import { Button } from '../common/Button';
import { NotificationItem, Equipment } from '../../types';

interface HeaderProps {
  currentPath: string;
  onNavigate: (path: string) => void;
  onOpenMobileSidebar: () => void;
  notifications: NotificationItem[];
  equipmentList: Equipment[];
}

export const Header: React.FC<HeaderProps> = ({
  currentPath,
  onNavigate,
  onOpenMobileSidebar,
  notifications,
  equipmentList,
}) => {
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showNotifMenu, setShowNotifMenu] = useState(false);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const getPageTitle = (path: string) => {
    if (path === '/dashboard') return { title: 'Dashboard', section: 'Workspace' };
    if (path === '/equipment') return { title: 'Equipment Registry', section: 'Workspace' };
    if (path === '/equipment/new') return { title: 'Register New Equipment', section: 'Equipment' };
    if (path.startsWith('/equipment/')) return { title: 'Equipment Details', section: 'Equipment' };
    if (path === '/calibration') return { title: 'Calibration Management', section: 'Workspace' };
    if (path === '/calendar') return { title: 'Calibration Calendar', section: 'Workspace' };
    if (path === '/notifications') return { title: 'Notification Center', section: 'Monitoring' };
    if (path === '/reports') return { title: 'Compliance & Reports', section: 'Monitoring' };
    if (path === '/settings') return { title: 'System Settings', section: 'System' };
    return { title: 'CalibTrack', section: 'Overview' };
  };

  const pageInfo = getPageTitle(currentPath);

  const filteredEquipment = searchQuery.trim()
    ? equipmentList.filter(
        (eq) =>
          eq.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          eq.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
          eq.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
          eq.manufacturer.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  return (
    <>
      <header className="h-16 bg-white border-b border-slate-200/90 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30 shadow-2xs">
        {/* Left: Mobile Toggle & Page Context */}
        <div className="flex items-center gap-3">
          <button
            onClick={onOpenMobileSidebar}
            className="lg:hidden p-2 -ml-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
            aria-label="Open navigation menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="hidden sm:inline-block font-medium text-slate-400">
              {pageInfo.section}
            </span>
            <span className="hidden sm:inline-block text-slate-300">/</span>
            <span className="font-semibold text-slate-800 text-sm tracking-tight">
              {pageInfo.title}
            </span>
          </div>
        </div>

        {/* Right: Search, Quick Add, Notifications, User */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Quick Search trigger */}
          <button
            onClick={() => setShowSearchModal(true)}
            className="flex items-center gap-2 h-9 px-3 text-xs text-slate-400 bg-slate-50 hover:bg-slate-100 border border-slate-200/80 rounded-lg transition-colors cursor-pointer"
          >
            <Search className="w-4 h-4 text-slate-400" />
            <span className="hidden md:inline">Quick search equipment...</span>
            <kbd className="hidden md:inline-flex items-center px-1.5 py-0.5 text-[10px] text-slate-400 bg-white border border-slate-200 rounded font-mono">
              ⌘K
            </kbd>
          </button>

          {/* Quick Add Equipment button */}
          {currentPath !== '/equipment/new' && (
            <Button
              variant="outline"
              size="sm"
              icon={<Plus className="w-4 h-4 text-blue-600" />}
              onClick={() => onNavigate('/equipment/new')}
              className="hidden sm:inline-flex"
            >
              Add Equipment
            </Button>
          )}

          {/* Notifications dropdown trigger */}
          <div className="relative">
            <button
              onClick={() => setShowNotifMenu(!showNotifMenu)}
              className="relative p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
              aria-label="View notifications"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white" />
              )}
            </button>

            {/* Quick Notification preview popover */}
            {showNotifMenu && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowNotifMenu(false)}
                />
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-lg border border-slate-200 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                  <div className="p-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <div>
                      <h4 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
                        Notifications
                      </h4>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {unreadCount} unread alert{unreadCount === 1 ? '' : 's'}
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        onNavigate('/notifications');
                        setShowNotifMenu(false);
                      }}
                      className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                    >
                      View all
                    </button>
                  </div>
                  <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
                    {notifications.slice(0, 4).map((n) => (
                      <div
                        key={n.id}
                        onClick={() => {
                          setShowNotifMenu(false);
                          if (n.equipmentId) onNavigate(`/equipment/${n.equipmentId}`);
                          else onNavigate('/notifications');
                        }}
                        className={`p-3 text-xs hover:bg-slate-50 cursor-pointer transition-colors ${
                          !n.read ? 'bg-blue-50/30' : ''
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-semibold text-slate-800">{n.title}</p>
                          <span className="text-[10px] text-slate-400 shrink-0">{n.timestamp}</span>
                        </div>
                        <p className="text-slate-600 mt-1 line-clamp-2 leading-relaxed text-[11px]">
                          {n.description}
                        </p>
                      </div>
                    ))}
                  </div>
                  <div className="p-2 border-t border-slate-100 bg-slate-50/70 text-center">
                    <button
                      onClick={() => {
                        onNavigate('/notifications');
                        setShowNotifMenu(false);
                      }}
                      className="text-xs text-slate-600 hover:text-slate-900 font-medium w-full py-1"
                    >
                      Open Notification Center →
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* User Avatar */}
          <div
            onClick={() => onNavigate('/settings')}
            className="flex items-center gap-2 pl-2 border-l border-slate-200 cursor-pointer group"
            title="Account & System Settings"
          >
            <div className="w-8 h-8 rounded-full bg-blue-600/10 text-blue-700 font-semibold text-xs flex items-center justify-center border border-blue-200/80 group-hover:border-blue-400 transition-colors">
              AU
            </div>
            <div className="hidden xl:block text-left">
              <p className="text-xs font-semibold text-slate-800 leading-none">Admin User</p>
              <p className="text-[10px] text-slate-400 mt-0.5">QA Metrologist</p>
            </div>
          </div>
        </div>
      </header>

      {/* Global Quick Search Modal */}
      {showSearchModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4">
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs"
            onClick={() => setShowSearchModal(false)}
          />
          <div className="relative w-full max-w-xl bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden z-10">
            <div className="p-3 border-b border-slate-100 flex items-center gap-3">
              <Search className="w-5 h-5 text-slate-400 ml-1" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search equipment by code, name, category, or manufacturer..."
                className="w-full text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
                autoFocus
              />
              <kbd
                onClick={() => setShowSearchModal(false)}
                className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded cursor-pointer hover:bg-slate-200"
              >
                ESC
              </kbd>
            </div>

            <div className="max-h-80 overflow-y-auto p-2">
              {searchQuery.trim() === '' ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  Type an equipment name (e.g. &quot;Balance&quot;, &quot;Spectrophotometer&quot;) or code (e.g. &quot;EQ-2024-001&quot;)
                </div>
              ) : filteredEquipment.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  No equipment matched &quot;{searchQuery}&quot;
                </div>
              ) : (
                <div className="space-y-1">
                  {filteredEquipment.map((eq) => (
                    <div
                      key={eq.id}
                      onClick={() => {
                        setShowSearchModal(false);
                        onNavigate(`/equipment/${eq.id}`);
                      }}
                      className="p-3 rounded-lg hover:bg-slate-50 cursor-pointer flex items-center justify-between border border-transparent hover:border-slate-200 transition-colors"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-semibold text-blue-600">
                            {eq.code}
                          </span>
                          <span className="font-medium text-xs text-slate-900">{eq.name}</span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          {eq.manufacturer} · {eq.location}
                        </p>
                      </div>
                      <span className="text-[11px] font-medium text-slate-600">
                        {eq.daysRemaining < 0
                          ? `${Math.abs(eq.daysRemaining)}d overdue`
                          : `Due in ${eq.daysRemaining}d`}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
