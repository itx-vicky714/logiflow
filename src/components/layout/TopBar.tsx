"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export function TopBar() {
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setUser(data.user);
    });
  }, []);

  const profileName = user?.email?.split('@')[0]?.replace('.', ' ') || 'Alex Thorne';
  const initial = profileName.charAt(0).toUpperCase();

  return (
    <header className="fixed top-0 right-0 left-64 h-20 z-40 bg-surface-bright/80 dark:bg-slate-950/80 backdrop-blur-xl shadow-[0_4px_24px_rgba(25,28,30,0.06)] dark:shadow-none transition-all duration-300">
      <div className="flex items-center justify-between px-12 w-full h-full">
        
        {/* Search & Control Center */}
        <div className="flex items-center gap-8 flex-1">
          <span className="text-lg font-black text-on-surface dark:text-white tracking-tighter uppercase italic">Control Tower</span>
          
          <div className="relative w-full max-w-md focus-within:ring-2 focus-within:ring-primary/10 rounded-xl transition-all">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px]">search</span>
            <input 
              className="w-full bg-surface-container-highest/40 border-none rounded-xl pl-12 pr-4 py-2.5 text-[13px] font-medium text-on-surface focus:ring-0 outline-none placeholder-on-surface-variant/30 transition-all font-['Inter']" 
              placeholder="Search logistics IDs, vessels, or alerts..." 
              type="text"
            />
          </div>
          
          <div className="flex items-center gap-3 ml-2">
            <button className="px-5 py-2 bg-primary text-on-primary rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-primary/20 hover:opacity-95 transition-all active:scale-95">All Clear</button>
            <button className="px-5 py-2 border border-outline-variant text-on-surface rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-surface-container transition-all active:scale-95">Reset</button>
            <button className="px-5 py-2 border border-outline-variant text-on-surface rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-surface-container transition-all active:scale-95">Simulate</button>
          </div>
        </div>

        {/* Tactical Profile & Utils */}
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-2">
            {[
              { icon: 'notifications', badge: true },
              { icon: 'help_outline', badge: false },
              { icon: 'apps', badge: false }
            ].map((btn, i) => (
              <button key={i} className="w-11 h-11 flex items-center justify-center hover:bg-surface-container rounded-xl transition-all relative text-on-surface-variant">
                <span className="material-symbols-outlined text-[22px]">{btn.icon}</span>
                {btn.badge && <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-error rounded-full border-2 border-surface-bright status-pulse" />}
              </button>
            ))}
          </div>
          
          <div className="h-8 w-[1px] bg-outline-variant/30"></div>
          
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-[13px] font-black text-on-surface capitalize leading-none mb-1">{profileName}</p>
              <p className="text-[9px] text-on-surface-variant font-black uppercase tracking-[0.2em] opacity-40">Operational Terminal Leader</p>
            </div>
            <div className="relative group cursor-pointer">
               <img 
                 alt="Profile" 
                 src="https://lh3.googleusercontent.com/aida-public/AB6AXuDtgAcrhKb8HrSgQ09IMvCc0Vcr33B8t8L4aWBvR9ub1imyHsNuK_BtbZOr_10PtjVyGolb90d5mNXDqBHQXugKR0eJMJRW1BugdvNVJ02O4Je6X7JmY2JyC3WYja9DkRSddM0ARZZ-7MRuNUWo1Y1DqUgdpP4r6ATeIt1E77l7BtidolwzJTeqYVh2CDcGUWo6b6jSa5wVEfL1Pg_SFQVlT2GXGQSgfP9RjsikFXW_IIItLjyXDeGzR7eOg-GMhSyLrI83zskFQqk"
                 className="w-11 h-11 rounded-2xl border-2 border-surface-container shadow-sm group-hover:scale-110 transition-transform duration-500 object-cover"
               />
               <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-primary rounded-full border-2 border-surface-bright status-pulse" />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
