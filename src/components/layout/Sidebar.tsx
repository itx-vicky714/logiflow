"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setUser(data.user);
    });
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success('System session terminated');
    router.push('/login');
  };

  const navItems = [
    { name: 'Dashboard', href: '/dashboard', icon: 'dashboard' },
    { name: 'Add Shipment', href: '/shipments/new', icon: 'add' },
    { name: 'Shipments', href: '/shipments', icon: 'local_shipping' },
    { name: 'Analytics', href: '/analytics', icon: 'analytics' },
    { name: 'Reports', href: '/reports', icon: 'description' },
    { name: 'Settings', href: '/settings', icon: 'settings' },
  ];

  return (
    <aside className="h-screen w-64 fixed left-0 top-0 flex flex-col bg-surface-container-low dark:bg-slate-900 font-['Inter'] antialiased tracking-tight z-50">
      <div className="flex flex-col h-full py-8">
        
        {/* Branding Hub */}
        <div className="px-8 mb-12">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary-container rounded-lg flex items-center justify-center text-on-primary shadow-sm shadow-primary/20">
              <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>analytics</span>
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tighter text-[#191c1e] dark:text-slate-100">Precision</h1>
              <p className="text-[10px] uppercase tracking-[0.2em] text-on-surface-variant font-bold leading-none">Editorial Logistics</p>
            </div>
          </div>
        </div>

        {/* Tactical Navigation */}
        <nav className="flex-1 space-y-1">
          {navItems.map((item) => {
            const active = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`${
                  active ? 'text-primary font-bold' : 'text-on-surface-variant font-medium'
                } flex items-center gap-3 py-3.5 px-8 transition-all duration-300 hover:text-primary scale-100 active:scale-95 group`}
              >
                <span className={`material-symbols-outlined transition-transform duration-500 ${active ? 'fill-1' : 'group-hover:rotate-12'}`}>{item.icon}</span>
                <span className="tracking-tight">{item.name}</span>
                {active && <div className="absolute left-0 w-1 h-6 bg-primary rounded-r-full" />}
              </Link>
            );
          })}
        </nav>

        {/* Global Action & Status */}
        <div className="px-8 mt-auto space-y-4">
          <Link href="/ai-chat" className="w-full bg-primary text-on-primary font-bold flex items-center justify-center gap-2 py-3.5 rounded-xl shadow-lg shadow-primary/10 hover:opacity-95 active:scale-95 transition-all duration-300 text-xs">
            <span className="material-symbols-outlined text-sm">forum</span>
            <span className="uppercase tracking-widest">Chat Support</span>
          </Link>

          <div className="p-4 bg-surface-container rounded-2xl border border-white/40">
            <p className="text-[10px] font-black uppercase tracking-widest text-on-surface mb-2">System Status</p>
            <div className="flex items-center gap-2">
              <span className="status-pulse bg-primary"></span>
              <span className="text-[11px] text-on-surface-variant font-bold tracking-tight">Active Node Sync</span>
            </div>
          </div>
          
          <button 
            onClick={handleLogout}
            className="w-full py-2 text-[10px] uppercase tracking-[0.3em] font-black text-on-surface-variant/40 hover:text-error transition-colors text-center"
          >
            Sign Out Session
          </button>
        </div>
      </div>
    </aside>
  );
}
