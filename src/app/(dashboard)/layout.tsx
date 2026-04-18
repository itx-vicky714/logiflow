"use client";

import React from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { TopBar } from '@/components/layout/TopBar';
import dynamic from 'next/dynamic';
import { SidebarProvider } from '@/context/SidebarContext';

const LogiBot = dynamic(() => import('@/components/LogiBot'), { ssr: false });

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen bg-surface">
        <Sidebar />
        <div className="flex flex-col flex-1 ml-64 min-h-screen">
          <TopBar />
          <main className="flex-1 pt-20 p-12">
            <div className="max-w-[1600px] mx-auto animate-in fade-in slide-in-from-bottom-6 duration-1000">
              {children}
            </div>
          </main>
        </div>
        <LogiBot />
      </div>
    </SidebarProvider>
  );
}
