"use client";

import React from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { TopBar } from '@/components/layout/TopBar';
import { supabase } from '@/lib/supabase';
import dynamic from 'next/dynamic';
import { SidebarProvider, useSidebar } from '@/context/SidebarContext';

const LogiBot = dynamic(() => import('@/components/LogiBot'), { ssr: false });

function DashboardLayoutContent({ children }: { children: React.ReactNode }) {
  const { collapsed } = useSidebar();

  return (
    <div className="flex min-h-screen bg-surface dark:bg-slate-900">
      <Sidebar />
      <div className={`flex flex-col flex-1 transition-all duration-300 ${collapsed ? 'ml-20' : 'ml-64'}`}>
        <TopBar />
        <main className="flex-1 pt-20 p-8 lg:p-12">
          <div className="max-w-[1600px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
            {children}
          </div>
        </main>
      </div>
      <LogiBot />
    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <DashboardLayoutContent>{children}</DashboardLayoutContent>
    </SidebarProvider>
  );
}
