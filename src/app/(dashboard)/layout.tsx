"use client";

import React from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { TopBar } from '@/components/layout/TopBar';
import dynamic from 'next/dynamic';
import { SidebarProvider } from '@/context/SidebarContext';

const LogiBot = dynamic(() => import('@/components/ai/LogiBot'), { 
  ssr: false,
  loading: () => <div className="fixed bottom-8 right-8 w-16 h-16 bg-on-surface/10 rounded-full animate-pulse z-50" />
});

import { SearchProvider } from '@/context/SearchContext';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <SearchProvider>
        <div className="flex min-h-screen bg-surface">
          <Sidebar />
          <div className="flex flex-col flex-1 transition-all duration-300 lg:ml-64 min-h-screen">
            <TopBar />
            <main className="flex-1 pt-16 p-4 lg:p-12">
              <div className="max-w-[1600px] mx-auto animate-in fade-in slide-in-from-bottom-6 duration-1000">
                {children}
              </div>
            </main>
          </div>
          <React.Suspense fallback={null}>
            <LogiBot />
          </React.Suspense>
        </div>
      </SearchProvider>
    </SidebarProvider>
  );
}

