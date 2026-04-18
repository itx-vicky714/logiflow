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
    toast.success('Sign out successful');
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
    <aside className="h-screen w-64 fixed left-0 top-0 flex flex-col bg-[#f2f4f6] font-['Inter'] antialiased tracking-tight z-50 transition-all duration-300">
      <div className="flex flex-col h-full py-8">
        
        {/* Logo Hub */}
        <div className="px-8 mb-12">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary-container rounded-lg flex items-center justify-center text-on-primary">
              <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>analytics</span>
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tighter text-[#191c1e]">LogiFlow</h1>
              <p className="text-[10px] uppercase tracking-[0.2em] text-on-surface-variant font-bold leading-none">Editorial Logistics</p>
            </div>
          </div>
        </div>

        {/* Navigation Core */}
        <nav className="flex-1 space-y-1">
          {navItems.map((item) => {
            const active = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`${
                  active ? 'text-[#493ee5] font-semibold' : 'text-[#464555] font-medium'
                } flex items-center gap-3 py-3 px-8 transition-all duration-300 hover:text-[#493ee5] scale-100 active:scale-95`}
              >
                <span className="material-symbols-outlined">{item.icon}</span>
                <span>{item.name}</span>
              </Link>
            );
          })}
          
          <div className="px-8 mt-6">
            <Link href="/ai-chat" className="w-full bg-primary text-on-primary font-semibold flex items-center justify-center gap-2 py-3 rounded-xl shadow-sm hover:opacity-90 active:scale-95 transition-all duration-300 text-sm">
              <span className="material-symbols-outlined">forum</span>
              <span>Chat Support</span>
            </Link>
          </div>
        </nav>

        {/* System & Session */}
        <div className="px-8 mt-auto space-y-4">
          <div className="p-4 bg-surface-container rounded-2xl">
            <p className="text-xs font-semibold text-on-surface mb-2">System Status</p>
            <div className="flex items-center gap-2">
              <span className="status-pulse bg-primary"></span>
              <span className="text-[11px] text-on-surface-variant font-medium">All systems operational</span>
            </div>
          </div>
          
          <button 
            onClick={handleLogout}
            className="w-full py-2 text-[10px] uppercase tracking-[0.2em] font-black text-on-surface-variant/40 hover:text-error transition-colors text-center"
          >
            Terminal Logout
          </button>
        </div>
      </div>
    </aside>
  );
}
