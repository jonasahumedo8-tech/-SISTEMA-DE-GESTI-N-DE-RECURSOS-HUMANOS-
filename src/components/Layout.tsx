import React, { useEffect, useRef, useState } from 'react';
import {
  BarChart3,
  Bell,
  Briefcase,
  Building2,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  FileWarning,
  LayoutDashboard,
  LogOut,
  Menu,
  Search,
  Settings,
  UserSearch,
  Users,
  X,
} from 'lucide-react';
import { Employee, ModuleKey, UserSession } from '../types/hr';
import { BrandLogo, EmployeeAvatar } from './ui/Primitives';

interface NavItem {
  key: ModuleKey;
  label: string;
  icon: React.ReactNode;
}

const NAV_ITEMS: NavItem[] = [
  { key: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-[18px] h-[18px]" /> },
  { key: 'employees', label: 'Empleados', icon: <Users className="w-[18px] h-[18px]" /> },
  { key: 'departments', label: 'Departamentos', icon: <Building2 className="w-[18px] h-[18px]" /> },
  { key: 'positions', label: 'Cargos', icon: <Briefcase className="w-[18px] h-[18px]" /> },
  { key: 'attendance', label: 'Asistencia', icon: <Clock className="w-[18px] h-[18px]" /> },
  { key: 'incidents', label: 'Novedades laborales', icon: <FileWarning className="w-[18px] h-[18px]" /> },
  { key: 'search', label: 'Consultar empleados', icon: <UserSearch className="w-[18px] h-[18px]" /> },
  { key: 'reports', label: 'Reportes', icon: <BarChart3 className="w-[18px] h-[18px]" /> },
  { key: 'settings', label: 'Configuración', icon: <Settings className="w-[18px] h-[18px]" /> },
];

export interface AppNotification {
  id: string;
  title: string;
  description: string;
  type: 'warning' | 'info' | 'alert';
  module: ModuleKey;
}

export function Layout({
  activeModule,
  onSelectModule,
  user,
  companyName,
  onLogout,
  selectedDate,
  onDateChange,
  notifications,
  employees,
  onQuickSelectEmployee,
  children,
}: {
  activeModule: ModuleKey;
  onSelectModule: (mod: ModuleKey) => void;
  user: UserSession;
  companyName: string;
  onLogout: () => void;
  selectedDate: string;
  onDateChange: (date: string) => void;
  notifications: AppNotification[];
  employees: Employee[];
  onQuickSelectEmployee: (emp: Employee) => void;
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [globalQuery, setGlobalQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);

  const searchRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchFocused(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    }
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  const searchMatches =
    globalQuery.trim().length >= 2
      ? employees
          .filter((e) => {
            const q = globalQuery.toLowerCase();
            return (
              `${e.first_name} ${e.last_name}`.toLowerCase().includes(q) ||
              e.document_number.toLowerCase().includes(q) ||
              e.employee_code.toLowerCase().includes(q) ||
              (e.department_name || '').toLowerCase().includes(q)
            );
          })
          .slice(0, 6)
      : [];

  const currentNav = NAV_ITEMS.find((n) => n.key === activeModule);

  const sidebarContent = (isMobile: boolean) => (
    <div className="flex flex-col h-full bg-[#172554] text-white select-none">
      {/* Brand + Company Icon */}
      <div className="h-16 px-4 flex items-center justify-between border-b border-white/10 shrink-0">
        <BrandLogo dark collapsed={!isMobile && collapsed} />
        {isMobile ? (
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 cursor-pointer"
            aria-label="Cerrar menú"
          >
            <X className="w-5 h-5" />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            aria-label={collapsed ? 'Expandir menú' : 'Contraer menú'}
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        )}
      </div>

      {/* Company Context Banner */}
      {(!collapsed || isMobile) && (
        <div className="px-4 py-3 border-b border-white/10 flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-md bg-white/10 flex items-center justify-center shrink-0">
            <Building2 className="w-4 h-4 text-[#93C5FD]" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-white truncate">{companyName}</p>
            <p className="text-[11px] text-[#93C5FD] truncate">Gestión inteligente del talento</p>
          </div>
        </div>
      )}

      {/* Navigation Links */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1" aria-label="Menú principal">
        {NAV_ITEMS.map((item) => {
          const active = activeModule === item.key;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => {
                onSelectModule(item.key);
                if (isMobile) setMobileOpen(false);
              }}
              title={!isMobile && collapsed ? item.label : undefined}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors duration-150 cursor-pointer ${
                active
                  ? 'bg-[#2563EB] text-white shadow-xs'
                  : 'text-[#CBD5E1] hover:text-white hover:bg-white/10'
              } ${!isMobile && collapsed ? 'justify-center px-0' : ''}`}
            >
              <span className="shrink-0">{item.icon}</span>
              {(isMobile || !collapsed) && (
                <span className="truncate whitespace-nowrap">{item.label}</span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Bottom Admin Profile + Logout */}
      <div className="p-3 border-t border-white/10 shrink-0">
        {isMobile || !collapsed ? (
          <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-white/5">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-full bg-[#2563EB] text-white font-display font-semibold text-xs flex items-center justify-center shrink-0">
                {user.avatar_initials}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-white truncate">{user.name}</p>
                <p className="text-[11px] text-[#93C5FD] truncate">{user.role}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onLogout}
              title="Cerrar sesión"
              className="p-2 rounded-lg text-[#CBD5E1] hover:text-white hover:bg-white/10 transition-colors cursor-pointer shrink-0"
              aria-label="Cerrar sesión"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={onLogout}
            title="Cerrar sesión"
            className="w-full py-2.5 rounded-xl flex items-center justify-center text-[#CBD5E1] hover:text-white hover:bg-white/10 cursor-pointer"
            aria-label="Cerrar sesión"
          >
            <LogOut className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-[#F8FAFC] text-[#0F172A]">
      {/* Fixed Desktop Sidebar */}
      <aside
        className={`hidden lg:block fixed inset-y-0 left-0 z-30 transition-all duration-200 ${
          collapsed ? 'w-[72px]' : 'w-[252px]'
        }`}
      >
        {sidebarContent(false)}
      </aside>

      {/* Mobile Drawer Sidebar */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-[#0F172A]/50"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="relative w-68 max-w-[82vw] h-full z-10 shadow-2xl">
            {sidebarContent(true)}
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <div
        className={`flex-1 flex flex-col min-w-0 transition-all duration-200 ${
          collapsed ? 'lg:pl-[72px]' : 'lg:pl-[252px]'
        }`}
      >
        {/* Top Context Header (56px-64px single row) */}
        <header className="sticky top-0 z-20 h-16 bg-white/95 backdrop-blur border-b border-[#E2E8F0] px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4 no-print">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="lg:hidden p-2 -ml-2 rounded-lg text-[#475569] hover:bg-[#F1F5F9] cursor-pointer"
              aria-label="Abrir navegación"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="hidden sm:flex items-center gap-2 text-xs text-[#64748B] whitespace-nowrap">
              <span>HumanPro</span>
              <span aria-hidden="true">/</span>
              <span className="font-semibold text-[#0F172A]">{currentNav?.label}</span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 sm:gap-3 flex-1 justify-end max-w-2xl">
            {/* Global Search */}
            <div ref={searchRef} className="relative flex-1 max-w-xs">
              <Search className="w-4 h-4 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="search"
                value={globalQuery}
                onFocus={() => setSearchFocused(true)}
                onChange={(e) => {
                  setGlobalQuery(e.target.value);
                  setSearchFocused(true);
                }}
                placeholder="Buscar colaborador o documento..."
                className="w-full h-9 pl-9 pr-3 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] text-xs text-[#0F172A] placeholder:text-[#94A3B8] focus:bg-white focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/15"
              />
              {searchFocused && globalQuery.trim().length >= 2 && (
                <div className="absolute right-0 left-0 mt-1.5 bg-white border border-[#E2E8F0] rounded-xl shadow-lg overflow-hidden z-40">
                  {searchMatches.length === 0 ? (
                    <div className="px-4 py-3 text-xs text-[#64748B]">
                      Sin coincidencias para "{globalQuery}"
                    </div>
                  ) : (
                    <div className="divide-y divide-[#F1F5F9]">
                      {searchMatches.map((emp) => (
                        <button
                          key={emp.id}
                          type="button"
                          onClick={() => {
                            setGlobalQuery('');
                            setSearchFocused(false);
                            onQuickSelectEmployee(emp);
                          }}
                          className="w-full px-3.5 py-2.5 flex items-center gap-3 hover:bg-[#F8FAFC] text-left cursor-pointer"
                        >
                          <EmployeeAvatar
                            firstName={emp.first_name}
                            lastName={emp.last_name}
                            photoUrl={emp.photo_url}
                            size="sm"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-semibold text-[#0F172A] truncate">
                              {emp.first_name} {emp.last_name}
                            </p>
                            <p className="text-[11px] text-[#64748B] truncate">
                              {emp.position_name || 'Sin cargo'} · {emp.document_number}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Date Selector */}
            <div className="hidden md:flex items-center gap-1.5 h-9 px-2.5 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC]">
              <Calendar className="w-3.5 h-3.5 text-[#64748B]" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => onDateChange(e.target.value)}
                className="bg-transparent text-xs font-medium text-[#0F172A] focus:outline-none tabular-nums cursor-pointer"
                aria-label="Selector de fecha"
              />
            </div>

            {/* Notifications Popover */}
            <div ref={notifRef} className="relative">
              <button
                type="button"
                onClick={() => setNotifOpen((o) => !o)}
                className="relative w-9 h-9 rounded-lg border border-[#E2E8F0] bg-white hover:bg-[#F8FAFC] flex items-center justify-center text-[#475569] cursor-pointer"
                aria-label="Notificaciones"
              >
                <Bell className="w-4 h-4" />
                {notifications.length > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-[#2563EB] text-white text-[10px] font-bold flex items-center justify-center tabular-nums">
                    {notifications.length}
                  </span>
                )}
              </button>

              {notifOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white border border-[#E2E8F0] rounded-2xl shadow-lg overflow-hidden z-40">
                  <div className="px-4 py-3 border-b border-[#E2E8F0] flex items-center justify-between">
                    <span className="font-display font-semibold text-xs text-[#0F172A]">
                      Notificaciones del sistema
                    </span>
                    <span className="text-[11px] text-[#64748B]">{notifications.length} avisos</span>
                  </div>
                  <div className="divide-y divide-[#F1F5F9] max-h-72 overflow-y-auto">
                    {notifications.map((n) => (
                      <button
                        key={n.id}
                        type="button"
                        onClick={() => {
                          setNotifOpen(false);
                          onSelectModule(n.module);
                        }}
                        className="w-full px-4 py-3 text-left hover:bg-[#F8FAFC] transition-colors cursor-pointer"
                      >
                        <p className="text-xs font-semibold text-[#0F172A]">{n.title}</p>
                        <p className="text-[11px] text-[#64748B] mt-0.5">{n.description}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Admin Profile */}
            <button
              type="button"
              onClick={() => onSelectModule('settings')}
              className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-full hover:bg-[#F8FAFC] transition-colors cursor-pointer shrink-0"
              title={`${user.name} (${user.role})`}
            >
              <div className="w-8 h-8 rounded-full bg-[#172554] text-white font-display font-semibold text-xs flex items-center justify-center">
                {user.avatar_initials}
              </div>
              <span className="hidden xl:block text-xs font-medium text-[#0F172A] whitespace-nowrap">
                {user.name}
              </span>
            </button>
          </div>
        </header>

        {/* Primary Viewport */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1600px] w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
