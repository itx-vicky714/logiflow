"use client";

import React, { useEffect, useState } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { TopBar } from '@/components/layout/TopBar';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Zap } from 'lucide-react';
import dynamic from 'next/dynamic';
import { SidebarProvider } from '@/context/SidebarContext';

const LogiBot = dynamic(() => import('@/components/LogiBot'), { ssr: false });

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) router.push('/login');
      else setLoading(false);
    });
  }, [router]);

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center page-bg">
        <div className="flex flex-col items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#3b5bdb] to-[#0ea5e9] flex items-center justify-center shadow-xl shadow-blue-500/30 animate-pulse">
            <Zap size={26} className="text-white" />
          </div>
          <div className="text-center">
            <p className="font-black text-slate-800 text-[15px]">LogiFlow</p>
            <p className="text-[11px] font-bold text-slate-400 mt-1 uppercase tracking-widest">Loading Intelligence...</p>
          </div>
        </div>
      </div>
    );
  }

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
