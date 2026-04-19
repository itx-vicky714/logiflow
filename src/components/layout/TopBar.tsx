'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSidebar } from '@/context/SidebarContext';
import { useAuth } from '@/context/AuthContext';
import { useSearch } from '@/context/SearchContext';

export function TopBar() {
  const { user } = useAuth();
  const { toggleMobile } = useSidebar();
  const { query, setQuery } = useSearch();

  const profileName = user?.email?.split('@')[0]?.replace(/[._]/g, ' ') || 'Guest User';
  const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(profileName)}&background=493ee5&color=fff&bold=true`;

  return (
    <header className="fixed top-0 right-0 left-0 lg:left-64 h-20 z-40 bg-[#f7f9fb]/80 backdrop-blur-xl shadow-[0_4px_24px_rgba(25,28,30,0.06)] border-b border-surface-container/50 transition-all duration-300">
      <div className="flex items-center justify-between px-4 lg:px-12 w-full h-full">
        
        {/* Mobile Toggle & Brand */}
        <div className="flex lg:hidden items-center gap-3">
          <button onClick={toggleMobile} className="w-10 h-10 flex items-center justify-center hover:bg-black/5 rounded-lg active:scale-90 transition-all">
            <span className="material-symbols-outlined">menu</span>
          </button>
          <span className="text-sm font-black tracking-tighter uppercase italic">LogiFlow</span>
        </div>

        {/* Search & Tactics */}
        <div className="flex items-center gap-4 lg:gap-6 flex-1 min-w-0 mr-4 lg:mr-8 ml-2 lg:ml-0">
          <span className="text-lg font-black text-[#191c1e] tracking-tight shrink-0 hidden lg:block">Control Tower</span>
          
          <div className="relative flex-1 max-w-md h-10 focus-within:ring-2 focus-within:ring-[#493ee5]/20 rounded-lg min-w-0 sm:min-w-[200px]">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-sm w-4 h-4 flex items-center justify-center">search</span>
            <input 
              className="w-full h-full bg-surface-container-highest/50 border-none rounded-lg pl-10 pr-4 py-2 text-sm focus:ring-0 outline-none" 
              placeholder="Search logistics IDs..." 
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          
          <div className="flex items-center gap-2 shrink-0">
            <button className="px-4 h-9 bg-primary text-on-primary rounded-lg text-xs font-bold shadow-sm hover:opacity-90 transition-opacity whitespace-nowrap">All Clear</button>
            <button 
              onClick={() => setQuery('')}
              className="px-4 h-9 border border-outline-variant text-on-surface rounded-lg text-xs font-bold hover:bg-surface-container transition-colors whitespace-nowrap"
            >
              Reset
            </button>
            <button className="px-4 h-9 border border-outline-variant text-on-surface rounded-lg text-xs font-bold hover:bg-surface-container transition-colors whitespace-nowrap">Simulate</button>
          </div>
        </div>

        {/* Utilities & User Profile */}
        <div className="flex items-center gap-6 shrink-0">
          <div className="flex items-center gap-4">
            <button className="w-10 h-10 flex items-center justify-center hover:bg-[#e0e3e5] rounded-lg transition-colors text-on-surface-variant">
              <span className="material-symbols-outlined w-6 h-6 flex items-center justify-center">notifications</span>
            </button>
            <button className="w-10 h-10 flex items-center justify-center hover:bg-[#e0e3e5] rounded-lg transition-colors text-on-surface-variant">
              <span className="material-symbols-outlined w-6 h-6 flex items-center justify-center">help_outline</span>
            </button>
            <button className="w-10 h-10 flex items-center justify-center hover:bg-[#e0e3e5] rounded-lg transition-colors text-on-surface-variant">
              <span className="material-symbols-outlined w-6 h-6 flex items-center justify-center">apps</span>
            </button>
          </div>
          
          <div className="h-8 w-[1px] bg-outline-variant/30"></div>
          
          <div className="flex items-center gap-3 w-[180px] justify-end">
            <div className="text-right">
              <p className="text-xs font-bold text-on-surface capitalize truncate w-24">{profileName}</p>
              <p className="text-[10px] text-on-surface-variant font-medium">Head of Operations</p>
            </div>
            <img 
              alt="Profile" 
              className="w-10 h-10 rounded-full border-2 border-surface-container object-cover shrink-0" 
              src={avatarUrl}
            />
          </div>
        </div>
      </div>
    </header>
  );
}
