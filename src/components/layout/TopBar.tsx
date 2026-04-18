"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

import { useAuth } from '@/context/AuthContext';

export function TopBar() {
  const { user } = useAuth();

  const profileName = user?.email?.split('@')[0]?.replace(/[._]/g, ' ') || 'Guest User';
  const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(profileName)}&background=493ee5&color=fff&bold=true`;

  return (
    <header className="fixed top-0 right-0 left-64 h-20 z-40 bg-[#f7f9fb]/80 backdrop-blur-xl shadow-[0_4px_24px_rgba(25,28,30,0.06)]">
      <div className="flex items-center justify-between px-12 w-full h-full">
        
        {/* Search & Tactics */}
        <div className="flex items-center gap-8 flex-1">
          <span className="text-lg font-black text-[#191c1e] tracking-tight">Control Tower</span>
          
          <div className="relative w-full max-w-md focus-within:ring-2 focus-within:ring-[#493ee5]/20 rounded-lg">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-sm">search</span>
            <input 
              className="w-full bg-surface-container-highest/50 border-none rounded-lg pl-10 pr-4 py-2 text-sm focus:ring-0 outline-none" 
              placeholder="Search logistics IDs, vessels, or alerts..." 
              type="text"
            />
          </div>
          
          <div className="flex items-center gap-3 ml-2">
            <button className="px-4 py-2 bg-primary text-on-primary rounded-lg text-xs font-bold shadow-sm hover:opacity-90 transition-opacity">All Clear</button>
            <button className="px-4 py-2 border border-outline-variant text-on-surface rounded-lg text-xs font-bold hover:bg-surface-container transition-colors">Reset</button>
            <button className="px-4 py-2 border border-outline-variant text-on-surface rounded-lg text-xs font-bold hover:bg-surface-container transition-colors">Simulate</button>
          </div>
        </div>

        {/* Utilities & User Profile */}
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-4">
            <button className="w-10 h-10 flex items-center justify-center hover:bg-[#e0e3e5] rounded-lg transition-colors text-on-surface-variant">
              <span className="material-symbols-outlined">notifications</span>
            </button>
            <button className="w-10 h-10 flex items-center justify-center hover:bg-[#e0e3e5] rounded-lg transition-colors text-on-surface-variant">
              <span className="material-symbols-outlined">help_outline</span>
            </button>
            <button className="w-10 h-10 flex items-center justify-center hover:bg-[#e0e3e5] rounded-lg transition-colors text-on-surface-variant">
              <span className="material-symbols-outlined">apps</span>
            </button>
          </div>
          
          <div className="h-8 w-[1px] bg-outline-variant/30"></div>
          
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-xs font-bold text-on-surface capitalize">{profileName}</p>
              <p className="text-[10px] text-on-surface-variant font-medium">Head of Operations</p>
            </div>
            <img 
              alt="Profile" 
              className="w-10 h-10 rounded-full border-2 border-surface-container object-cover" 
              src={avatarUrl}
            />
          </div>
        </div>
      </div>
    </header>
  );
}
