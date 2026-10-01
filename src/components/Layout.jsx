import React, { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { ROLE_LABELS } from '@/lib/tenantContext';
import { firebaseClient } from '@/api/firebaseClient';
import BrandMark from '@/components/BrandMark';
import {
  LayoutDashboard, Inbox, Building2, FileText, GitBranch, Calendar,
  Phone, ShieldCheck, LogOut, Menu, X, Users, ClipboardList, Headphones, Eye,
  Megaphone, Radio, Settings as SettingsIcon, Bell, Sparkles, UserCog
} from 'lucide-react';

const NAV_GROUPS = [
  {
    label: 'Work',
    items: [
      { label: 'Dashboard', path: '/', icon: LayoutDashboard, roles: null },
      { label: 'Agent Workspace', path: '/workspace', icon: Headphones, roles: null },
      { label: 'Lead Inbox', path: '/leads', icon: Inbox, roles: null },
      { label: 'Supervisor', path: '/supervisor', icon: Eye, roles: ['admin', 'super_admin', 'org_admin', 'brand_admin', 'supervisor'] },
      { label: 'Appointments', path: '/appointments', icon: Calendar, roles: null },
    ],
  },
  {
    label: 'Programs',
    items: [
      { label: 'Campaigns', path: '/campaigns', icon: Megaphone, roles: null },
      { label: 'Lead Sources', path: '/lead-sources', icon: Radio, roles: null },
      { label: 'Brands', path: '/brands', icon: Building2, roles: null },
      { label: 'Scripts', path: '/scripts', icon: FileText, roles: null },
      { label: 'Qualification Forms', path: '/qualification-forms', icon: ClipboardList, roles: null },
      { label: 'Routing Rules', path: '/routing-rules', icon: GitBranch, roles: null },
    ],
  },
  {
    label: 'Administration',
    items: [
      { label: 'Clients', path: '/clients', icon: Building2, roles: ['super_admin', 'lms_super_admin'] },
      { label: 'Admin Portal', path: '/admin', icon: UserCog, roles: ['admin', 'super_admin', 'org_admin', 'brand_admin'] },
      { label: 'Phone Numbers', path: '/phone-numbers', icon: Phone, roles: null },
      { label: 'Client Contacts', path: '/business-owners', icon: Users, roles: null },
      { label: 'Audit Log', path: '/audit-log', icon: ShieldCheck, roles: ['admin', 'super_admin', 'org_admin', 'supervisor', 'auditor'] },
      { label: 'Settings', path: '/settings', icon: SettingsIcon, roles: ['admin', 'super_admin', 'org_admin', 'brand_admin'] },
    ],
  },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [notificationStatus, setNotificationStatus] = useState('');
  const role = user?.role || 'lead_response_agent';
  const roleLabel = ROLE_LABELS[role] || role;
  const isPreviewAccess = false;
  const tenantOptions = user?.tenantOptions || [];

  const canSee = (item) => !item.roles || item.roles.includes(role);
  const isActive = (item) => location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
  const currentItem = NAV_GROUPS.flatMap(group => group.items).find(isActive);
  const initials = (user?.full_name || user?.email || 'Link Agent').split(/[\s@]+/).slice(0, 2).map(part => part[0]?.toUpperCase()).join('');

  const handleLogout = () => {
    logout(false);
    navigate('/login');
  };

  const handleTenantChange = async (event) => {
    const tenantId = event.target.value;
    if (!tenantId || tenantId === user?.organization_id) return;
    await firebaseClient.auth.switchTenant(tenantId);
    setMobileOpen(false);
    window.location.assign('/');
  };
  const toggleNotifications = async () => {
    setNotificationsOpen(open => !open);
    if (notificationsOpen) return;
    setNotificationStatus('Loading notifications…');
    try {
      const rows = await firebaseClient.entities.Notification.list(100);
      setNotifications(rows.filter(row => [user?.id, 'all'].includes(row.recipientUid)));
      setNotificationStatus('');
    } catch { setNotificationStatus('Notifications could not be loaded. Please try again.'); }
  };

  const Navigation = () => (
    <nav className="flex-1 overflow-y-auto px-3 pb-5" aria-label="CRM navigation">
      {NAV_GROUPS.map(group => {
        const items = group.items.filter(canSee);
        if (!items.length) return null;
        return (
          <div key={group.label} className="mb-5">
            <p className="mb-2 px-3 text-[9px] font-bold uppercase tracking-[.22em] text-[#C9A24B]/75">{group.label}</p>
            <div className="space-y-1">
              {items.map(item => {
                const Icon = item.icon;
                const active = isActive(item);
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileOpen(false)}
                    className={`flex min-h-10 items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition ${active ? 'bg-white/10 text-white shadow-sm' : 'text-white/55 hover:bg-white/[.06] hover:text-white'}`}
                  >
                    <Icon className={`h-[18px] w-[18px] shrink-0 ${active ? 'text-[#C9A24B]' : ''}`} />
                    <span className="min-w-0 flex-1 truncate">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        );
      })}
    </nav>
  );

  const Sidebar = ({ mobile = false }) => (
    <aside className={`${mobile ? 'flex' : 'hidden lg:flex'} h-full w-[278px] shrink-0 flex-col border-r border-white/[.08] bg-[#001922] text-white`}>
      <div className="flex h-[78px] shrink-0 items-center border-b border-white/[.08] px-6">
        <BrandMark />
      </div>
      <div className="px-4 py-4">
        <Link to="/workspace" onClick={() => setMobileOpen(false)} className="flex w-full items-center gap-3 rounded-xl border border-[#C9A24B]/25 bg-[#C9A24B]/10 px-4 py-3 text-xs font-bold text-[#ead486] transition hover:bg-[#C9A24B]/15">
          <Sparkles className="h-4 w-4" /> Open agent workspace
        </Link>
      </div>
      <div className="px-4 pb-4">
        <label htmlFor={mobile ? 'active-tenant-mobile' : 'active-tenant'} className="mb-1.5 block text-[9px] font-bold uppercase tracking-[.2em] text-white/45">Active client</label>
        <select
          id={mobile ? 'active-tenant-mobile' : 'active-tenant'}
          value={user?.organization_id || ''}
          onChange={handleTenantChange}
          className="w-full rounded-lg border border-white/15 bg-white/10 px-3 py-2.5 text-xs font-semibold text-white outline-none focus:border-[#C9A24B]"
        >
          {tenantOptions.map((tenant) => <option key={tenant.tenantId} value={tenant.tenantId} className="bg-[#001922] text-white">{tenant.name}</option>)}
        </select>
      </div>
      <Navigation />
      <div className="shrink-0 border-t border-white/[.08] p-3">
        <div className="flex items-center gap-3 rounded-xl px-3 py-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#C9A24B] text-xs font-bold text-[#001922]">{initials}</span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{user?.full_name || user?.email || 'Link Agent'}</p>
            <p className="truncate text-[10px] text-white/42">{roleLabel}</p>
          </div>
          <button onClick={handleLogout} className="rounded-lg p-2 text-white/45 transition hover:bg-white/[.06] hover:text-white" aria-label="Sign out">
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-[#F7F1E6]">
      <Sidebar />

      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <button aria-label="Close navigation" onClick={() => setMobileOpen(false)} className="absolute inset-0 bg-black/55 backdrop-blur-sm" />
          <div className="relative h-full">
            <Sidebar mobile />
            <button onClick={() => setMobileOpen(false)} className="absolute right-3 top-3 rounded-lg p-2 text-white/70 hover:bg-white/10" aria-label="Close menu">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-[70px] shrink-0 items-center justify-between border-b border-[#001922]/10 bg-[#fbfaf7]/95 px-4 backdrop-blur sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button onClick={() => setMobileOpen(true)} className="rounded-lg border border-[#001922]/10 bg-white p-2 shadow-sm lg:hidden" aria-label="Open CRM navigation">
              <Menu className="h-5 w-5" />
            </button>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-[#243b3e]">{currentItem?.label || 'GMS Agent CRM'}</p>
              <p className="hidden text-[10px] text-[#879192] sm:block">Lead response, qualification and routing operations</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isPreviewAccess && <span className="items-center gap-2 rounded-full border border-rose-300 bg-rose-100 px-3 py-1.5 text-[10px] font-bold text-rose-800 sm:inline-flex">Preview access only</span>}
            <button onClick={toggleNotifications} aria-expanded={notificationsOpen} className="relative rounded-lg border border-[#001922]/10 bg-white p-2.5 shadow-sm" aria-label="Notifications">
              <Bell className="h-4 w-4 text-[#334a4d]" />
            </button>
            <Link to={['super_admin', 'admin'].includes(role) ? '/settings' : '/workspace'} aria-label="Open account workspace" className="flex h-9 w-9 items-center justify-center rounded-full bg-[#001922] text-[10px] font-bold text-white">{initials}</Link>
            {notificationsOpen && <section aria-label="Notifications" className="absolute right-4 top-[65px] z-40 max-h-80 w-[min(360px,90vw)] overflow-auto rounded-xl border bg-white p-4 shadow-xl"><div className="flex justify-between"><h2 className="font-semibold">Notifications</h2><button onClick={() => setNotificationsOpen(false)} aria-label="Close notifications"><X size={18} /></button></div>{notificationStatus ? <p role="status" className="mt-3 text-sm">{notificationStatus}</p> : notifications.length ? notifications.map(item => <div key={item.id} className="mt-3 border-t pt-3"><p className="text-sm font-semibold">{item.title}</p><p className="mt-1 text-xs">{item.body}</p></div>) : <p className="mt-3 text-sm">No notifications for this client.</p>}</section>}
          </div>
        </header>
        <main className="min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto max-w-[1440px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8 xl:px-10">
            {isPreviewAccess && <div role="status" className="mb-5 rounded-xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-900">PREVIEW ONLY: CRM data and actions are not confirmed live. Do not enter real customer information.</div>}
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

