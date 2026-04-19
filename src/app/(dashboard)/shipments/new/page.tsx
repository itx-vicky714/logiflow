"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';

const ShipmentForm = dynamic(() => import('@/components/forms/ShipmentForm'), {
  ssr: false,
  loading: () => (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 pb-20 animate-pulse">
      <div className="lg:col-span-8 space-y-10">
        <div className="h-[100px] bg-surface-container-low rounded-2xl" />
        <div className="h-[600px] bg-surface-container-low rounded-3xl" />
      </div>
      <div className="lg:col-span-4 space-y-8">
        <div className="h-[400px] bg-surface-container-low rounded-3xl" />
        <div className="h-[200px] bg-surface-container-low rounded-[2.5rem]" />
      </div>
    </div>
  )
});

export default function NewShipmentPage() {
  const router = useRouter();

  return (
    <div className="pt-16 space-y-12 max-w-[1400px] mx-auto font-['Inter'] antialiased tracking-tight text-[#191c1e] animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Page Header */}
      <div className="flex items-center justify-between">
         <div className="flex items-center gap-6">
            <button 
              onClick={() => router.back()} 
              className="w-12 h-12 bg-surface-container-lowest border border-white/50 rounded-2xl flex items-center justify-center curated-shadow hover:scale-105 transition-all group active:scale-95"
            >
               <span className="material-symbols-outlined text-on-surface-variant group-hover:text-on-surface">arrow_back</span>
            </button>
            <div>
               <h1 className="text-4xl font-black text-on-surface tracking-tighter uppercase">Initialize Manifest</h1>
               <div className="flex items-center gap-2 mt-2">
                  <span className="status-pulse bg-primary" />
                  <p className="text-[10px] font-black text-on-surface-variant uppercase tracking-[0.3em]">System Online</p>
               </div>
            </div>
         </div>
      </div>

      <React.Suspense fallback={null}>
        <ShipmentForm />
      </React.Suspense>
    </div>
  );
}

