"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import {
  LayoutDashboard, Map, BarChart3, FileText, Settings, LogOut,
  Package, Plus, Zap, ChevronRight, ChevronLeft, Truck
} from 'lucide-react';
import { toast } from 'sonner';
import { useSidebar } from '@/context/SidebarContext';
import { motion, AnimatePresence } from 'framer-motion';

type NavItem = { name: string; href: string; icon: React.ElementType; exact?: boolean; exclude?: string; accent?: boolean };
type NavSection = { label: string; items: NavItem[] };

const NAV_SECTIONS: NavSection[] = [
  {
    label: 'Workspace',
    items: [
      { name: 'Dashboard',    href: '/dashboard',     icon: LayoutDashboard, exact: true },
      { name: 'Shipments',    href: '/shipments',     icon: Package,         exact: false, exclude: '/shipments/new' },
      { name: 'New Unit',     href: '/shipments/new', icon: Plus,            exact: true,  accent: true },
    ]
  },
  {
    label: 'Intelligence',
    items: [
      { name: 'Live Grid',    href: '/map',           icon: Map,             exact: false },
      { name: 'Analytics',    href: '/analytics',     icon: BarChart3,       exact: false },
      { name: 'Reports',      href: '/reports',       icon: FileText,        exact: false },
    ]
  },
  {
    label: 'Control',
    items: [
      { name: 'System Settings', href: '/settings',  icon: Settings,        exact: false },
    ]
  },
];

function isActive(href: string, pathname: string, exact?: boolean, exclude?: string): boolean {
  if (exclude && pathname.startsWith(exclude)) return false;
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(href + '/');
}

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { collapsed, toggle } = useSidebar();
  const [user, setUser] = useState<{ id: string; email?: string; user_metadata?: Record<string, string> } | null>(null);
  const [profile, setProfile] = useState<{ full_name?: string; company?: string; avatar_url?: string } | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUser(data.user);
        supabase.from('profiles').select('*').eq('id', data.user.id).single().then(({ data: p }) => {
          setProfile(p);
        });
      }
    });
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success('Logged out');
    router.push('/login');
  };

  const displayName = profile?.full_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User';
  const displayCompany = profile?.company || user?.user_metadata?.company || 'My Company';
  const initials = displayName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <aside className={`
      h-screen hidden md:flex flex-col sidebar-bg z-20 shrink-0
      transition-all duration-300 ease-out
      ${collapsed ? 'w-[64px]' : 'w-[248px]'}
    `}>
      {/* ── Logo ── */}
      <div className={`flex items-center border-b border-white/[0.06] shrink-0 ${collapsed ? 'justify-center h-20' : 'px-6 h-20 justify-between'}`}>
        {!collapsed ? (
          <>
            <Link href="/dashboard" className="flex items-center gap-3 min-w-0 group">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary to-cyan-500 flex items-center justify-center shrink-0 shadow-lg shadow-blue-900/40 group-hover:scale-105 transition-transform">
                <Zap size={18} className="text-white" />
              </div>
              <div className="flex flex-col">
                <div className="text-[17px] font-black tracking-tight text-white leading-none">
                  Logi<span className="text-cyan-400">Flow</span>
                </div>
                <div className="text-[9px] text-white/30 font-black tracking-[0.3em] uppercase mt-1">Enterprise</div>
              </div>
            </Link>
            <button onClick={toggle} className="p-2 rounded-xl text-white/20 hover:text-white hover:bg-white/5 transition-all shrink-0">
              <ChevronLeft size={16} />
            </button>
          </>
        ) : (
          <button onClick={toggle} className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary to-cyan-500 flex items-center justify-center shadow-lg shadow-blue-900/40">
            <Zap size={18} className="text-white" />
          </button>
        )}
      </div>

      {/* ── User Card ── */}
      <Link href="/settings" className={`flex items-center gap-3 border-b border-white/[0.06] hover:bg-white/5 transition-all shrink-0 ${collapsed ? 'justify-center px-2 py-3.5' : 'px-4 py-3.5'}`}>
        <div className="relative shrink-0">
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover ring-2 ring-white/20" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-cyan-400 flex items-center justify-center text-white text-xs font-black shadow-inner">
              {initials}
            </div>
          )}
          <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-[#0f172a] shadow-sm" />
        </div>
        {!collapsed && (
          <div className="flex-1 min-w-0">
            <div className="text-[13px] font-semibold text-white truncate leading-tight">{displayName}</div>
            <div className="text-[11px] text-white/40 truncate mt-0.5">{displayCompany}</div>
          </div>
        )}
      </Link>

      {/* ── Nav ── */}
      <nav className="flex-1 overflow-y-auto py-4 space-y-6 px-2">
        {NAV_SECTIONS.map(section => (
          <div key={section.label}>
            {!collapsed && (
              <div className="text-[9px] font-black text-white/25 tracking-[0.2em] uppercase px-3 mb-2">
                {section.label}
              </div>
            )}
            <div className="space-y-0.5">
              {section.items.map(item => {
                const active = isActive(item.href, pathname, item.exact, 'exclude' in item ? (item as { exclude?: string }).exclude : undefined);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    title={collapsed ? item.name : undefined}
                    className={`
                      relative flex items-center gap-3 rounded-xl text-[13px] font-semibold
                      transition-all duration-150 group
                      ${collapsed ? 'justify-center px-2 py-2.5' : 'px-3 py-2.5'}
                      ${active
                        ? item.accent
                          ? 'bg-gradient-to-r from-[#3b5bdb] to-[#0ea5e9] text-white shadow-lg shadow-blue-900/30'
                          : 'bg-white/10 text-white'
                        : 'text-white/50 hover:text-white hover:bg-white/[0.06]'
                      }
                    `}
                  >
                    {/* Active indicator bar */}
                    {active && !collapsed && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r-full bg-[#60a5fa]" />
                    )}

                    <Icon size={16} className={`shrink-0 transition-colors ${
                      active
                        ? 'text-white'
                        : 'text-white/40 group-hover:text-white/70'
                    }`} />

                    {!collapsed && (
                      <span className="flex-1 leading-none">{item.name}</span>
                    )}

                    {!collapsed && item.accent && !active && (
                      <span className="ml-auto text-[9px] bg-gradient-to-r from-indigo-400 to-cyan-400 text-white px-1.5 py-0.5 rounded-full font-black uppercase tracking-wider">
                        New
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* ── Logout ── */}
      <div className={`border-t border-white/[0.06] ${collapsed ? 'p-2' : 'p-3'}`}>
        <button
          onClick={handleLogout}
          title={collapsed ? 'Sign Out' : undefined}
          className={`flex items-center gap-3 w-full rounded-xl text-[13px] font-semibold text-white/40 hover:text-rose-400 hover:bg-rose-500/10 transition-all ${collapsed ? 'justify-center px-2 py-2.5' : 'px-3 py-2.5'}`}
        >
          <LogOut size={16} className="shrink-0" />
          {!collapsed && <span>Sign Out</span>}
        </button>
      </div>
    </aside>
  );
}
