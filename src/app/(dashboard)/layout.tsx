"use client";

import React from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { TopBar } from '@/components/layout/TopBar';
import { supabase } from '@/lib/supabase';
import dynamic from 'next/dynamic';
import { SidebarProvider } from '@/context/SidebarContext';

const LogiBot = dynamic(() => import('@/components/LogiBot'), { ssr: false });

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <div className="flex h-screen overflow-hidden page-bg">
        <Sidebar />
        <div className="flex flex-col flex-1 overflow-hidden min-w-0">
          <TopBar />
          <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
            <div className="max-w-[1600px] mx-auto">
              {children}
            </div>
          </main>
        </div>
        <LogiBot />
      </div>
    </SidebarProvider>
  );
}
