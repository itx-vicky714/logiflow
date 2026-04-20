'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useSidebar } from '@/context/SidebarContext';
import { AnimatePresence, motion } from 'framer-motion';
import { toast } from 'sonner';

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { isMobileOpen, closeMobile } = useSidebar();
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setUser(data.user);
    });

    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeMobile();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [closeMobile]);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      toast.success('Sign out successful');
      // Use window.location.replace for a clean contextual reset
      window.location.replace('/login');
    } catch (err) {
      console.error('Logout error', err);
      window.location.replace('/login');
    }
  };

  const navItems = [
    { name: 'Dashboard', href: '/dashboard', icon: 'dashboard' },
    { name: 'Live Map', href: '/map', icon: 'map' },
    { name: 'Add Shipment', href: '/shipments/new', icon: 'add' },
    { name: 'Shipments', href: '/shipments', icon: 'local_shipping' },
    { name: 'Analytics', href: '/analytics', icon: 'analytics' },
    { name: 'Reports', href: '/reports', icon: 'description' },
    { name: 'Settings', href: '/settings', icon: 'settings' },
  ];

  const sidebarContent = (
    <div className="flex flex-col h-full py-8">
      {/* Mobile Close */}
      <div className="lg:hidden absolute top-6 right-6">
        <button onClick={closeMobile} className="w-10 h-10 flex items-center justify-center hover:bg-black/5 rounded-full">
          <span className="material-symbols-outlined">close</span>
        </button>
      </div>

      {/* Logo Hub */}
      <div className="px-8 mb-12">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center shadow-lg shadow-indigo-100">
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>analytics</span>
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tighter text-[#191c1e]">LogiFlow</h1>
            <p className="text-[10px] uppercase tracking-[0.2em] text-[#493ee5] font-bold leading-none">B2B Logistics Hub</p>
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
              onClick={closeMobile}
              className={`${
                active ? 'text-indigo-600 font-semibold bg-indigo-50/50' : 'text-slate-600 font-medium hover:bg-slate-100/50'
              } flex items-center gap-3 py-3 px-8 transition-all duration-300 hover:text-indigo-600 scale-100 active:scale-95 rounded-xl mx-4 my-0.5`}
            >
              <span className="material-symbols-outlined">{item.icon}</span>
              <span>{item.name}</span>
            </Link>
          );
        })}
        
        <div className="px-8 mt-6">
          <Link href="/ai-chat" onClick={closeMobile} className="w-full bg-primary text-on-primary font-semibold flex items-center justify-center gap-2 py-3 rounded-xl shadow-sm hover:opacity-90 active:scale-95 transition-all duration-300 text-sm">
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
          Logout
        </button>
      </div>
    </div>
  );

  return (
    <>
      <AnimatePresence>
        {isMobileOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeMobile}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 lg:hidden"
            />
            <motion.aside 
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="h-screen w-72 fixed left-0 top-0 bg-slate-50 z-[60] flex flex-col font-['Inter'] lg:hidden shadow-2xl"
            >
              {sidebarContent}
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <aside className="h-screen w-64 fixed left-0 top-0 flex flex-col bg-slate-50 font-['Inter'] antialiased tracking-tight z-50 border-r border-slate-200/60 transition-transform duration-300 -translate-x-full lg:translate-x-0">
        {sidebarContent}
      </aside>
    </>
  );
}

