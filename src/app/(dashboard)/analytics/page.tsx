"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { seedShipments, estimateRevenue, formatCurrency, modeIcon } from '@/lib/utils';
import type { Shipment } from '@/types';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import dynamic from 'next/dynamic';
import { format, subDays, isAfter, isBefore, endOfDay } from 'date-fns';

const Charts = dynamic(() => import('@/components/charts/AnalyticsCharts'), { 
  ssr: false, 
  loading: () => <div className="h-64 animate-pulse bg-surface-container-low rounded-2xl" /> 
});

type TimeFilter = '7d' | '30d' | '90d';

export default function AnalyticsPage() {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('30d');
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const mountedRef = React.useRef(true);
  useEffect(() => {
    return () => { mountedRef.current = false; };
  }, []);

  const fetchData = useCallback(async () => {
    setIsRefreshing(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !mountedRef.current) return;
    await seedShipments(user.id);
    const { data } = await supabase.from('shipments').select('*').eq('user_id', user.id);
    if (data && mountedRef.current) setShipments(data);
    if (mountedRef.current) setLoading(false);
    setTimeout(() => {
      if (mountedRef.current) setIsRefreshing(false);
    }, 500);
  }, []);

  useEffect(() => { 
    fetchData();
  }, [fetchData]);

  const { filtered, daysCount } = useMemo(() => {
    const days = timeFilter === '7d' ? 7 : timeFilter === '30d' ? 30 : 90;
    const now = new Date();
    const cutoff = subDays(now, days);
    return {
      filtered: shipments.filter(s => isAfter(new Date(s.created_at), cutoff)),
      daysCount: days
    };
  }, [shipments, timeFilter]);

  const totalRevenue = filtered.reduce((a, s) => a + estimateRevenue(s), 0);
  const onTimeCount = filtered.filter(s => s.status === 'on_time' || s.status === 'delivered').length;
  const onTimePct = filtered.length > 0 ? Math.round((onTimeCount / filtered.length) * 100) : 0;
  const avgRisk = filtered.length > 0 ? Math.round(filtered.reduce((a, s) => a + s.risk_score, 0) / filtered.length) : 0;

  const volumeTrend = useMemo(() => {
    const points = daysCount === 7 ? 7 : 12;
    const step = Math.ceil(daysCount / points);
    return Array.from({ length: points }, (_, i) => {
      const d = subDays(new Date(), points - 1 - i);
      const start = subDays(d, 1);
      const bin = filtered.filter(s => {
        const cd = new Date(s.created_at);
        return isAfter(cd, start) && isBefore(cd, endOfDay(d));
      });
      return { 
        date: format(d, daysCount > 7 ? 'dd MMM' : 'EEE'), 
        shipments: bin.length, 
        revenue: bin.reduce((a,s) => a + estimateRevenue(s), 0),
        forecast: Math.round(bin.length * 1.1) // Simple forecast
      };
    });
  }, [filtered, daysCount]);

  const modeStats = (['road', 'rail', 'air', 'sea'] as const).map(m => {
    const ms = filtered.filter(s => s.mode === m);
    return {
      name: m.charAt(0).toUpperCase() + m.slice(1),
      count: ms.length,
      revenue: ms.reduce((a, s) => a + estimateRevenue(s), 0),
      delayed: ms.filter(s => s.status === 'delayed').length,
      on_time: ms.filter(s => s.status === 'on_time' || s.status === 'delivered').length,
      atRisk: ms.filter(s => s.risk_score > 70).length
    };
  });

  const disruptionData = modeStats.map(m => ({
    name: m.name,
    delayed: m.delayed,
    on_time: m.on_time,
    atRisk: m.atRisk
  }));

  if (loading) return (
    <div className="flex items-center justify-center min-h-[calc(100vh-12rem)]">
      <div className="status-pulse bg-primary w-12 h-12"></div>
    </div>
  );

  return (
    <div className="font-['Inter'] antialiased tracking-tight text-[#191c1e] animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
        <div>
          <h1 className="text-3xl font-black text-on-surface tracking-tighter uppercase">Intelligence Hub</h1>
          <div className="flex items-center gap-2 mt-2">
            <span className="status-pulse bg-primary"></span>
            <p className="text-[10px] font-black text-on-surface-variant uppercase tracking-[0.3em]">{filtered.length} Protocol nodes analyzed</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex bg-surface-container p-1 rounded-xl">
            {(['7d', '30d', '90d'] as TimeFilter[]).map(t => (
              <button 
                key={t} 
                onClick={() => setTimeFilter(t)}
                className={`px-5 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${
                  timeFilter === t ? 'bg-surface-container-lowest shadow-sm text-[#493ee5]' : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
          <button 
            onClick={fetchData} 
            className="w-12 h-12 flex items-center justify-center bg-surface-container-lowest border border-white/50 curated-shadow rounded-2xl text-on-surface-variant hover:text-primary transition-all active:scale-90"
          >
            <span className={`material-symbols-outlined ${isRefreshing ? 'animate-spin' : ''}`}>refresh</span>
          </button>
        </div>
      </div>

      {/* Impact Score Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        {[
          { label: 'Network Reliability', val: `${onTimePct}%`, icon: 'verified_user', sub: 'Protocol standard met', col: 'text-[#493ee5]' },
          { label: 'Gross Revenue', val: formatCurrency(totalRevenue), icon: 'payments', sub: 'Invoiced manifest', col: 'text-on-surface' },
          { label: 'Operational Safety', val: `${100 - avgRisk}/100`, icon: 'shield_with_heart', sub: 'Risk vector minimum', col: 'text-[#493ee5]' },
          { label: 'Active Fleet', val: filtered.length, icon: 'hub', sub: 'Moving across grid', col: 'text-on-surface' },
        ].map((card, i) => (
          <div key={i} className="bg-surface-container-lowest p-8 rounded-3xl border border-white/50 curated-shadow group hover:-translate-y-1 transition-all duration-300">
            <div className="w-12 h-12 bg-surface-container-low rounded-2xl flex items-center justify-center mb-6 text-primary group-hover:scale-110 transition-transform">
              <span className="material-symbols-outlined text-[24px]">{card.icon}</span>
            </div>
            <div className={`text-3xl font-black ${card.col} mb-2 tracking-tighter`}>{card.val}</div>
            <div className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest">{card.label}</div>
            <p className="text-[9px] text-on-surface-variant/40 mt-1 font-bold uppercase tracking-tighter">{card.sub}</p>
          </div>
        ))}
      </div>

      {/* Charts Visualization Section */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mb-10">
        
        {/* volume trend */}
        <div className="bg-surface-container-lowest p-10 rounded-3xl border border-white/50 curated-shadow">
          <div className="mb-10">
            <p className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest mb-2">Temporal Analysis</p>
            <h3 className="text-2xl font-black text-on-surface tracking-tighter">Volume & Flow Sync</h3>
          </div>
          <div className="h-[300px]">
            <Charts type="volume" data={volumeTrend} tooltipStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 40px rgba(0,0,0,0.08)', fontSize: '11px', fontWeight: 700 }} />
          </div>
        </div>

        {/* disruption analysis */}
        <div className="bg-surface-container-lowest p-10 rounded-3xl border border-white/50 curated-shadow">
          <div className="mb-10">
            <p className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest mb-2">Protocol Health</p>
            <h3 className="text-2xl font-black text-on-surface tracking-tighter">Disruption Matrix</h3>
          </div>
          <div className="h-[300px]">
            <Charts type="modePerf" data={disruptionData} tooltipStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 40px rgba(0,0,0,0.08)', fontSize: '11px', fontWeight: 700 }} />
          </div>
        </div>

      </div>

      {/* Intelligence Directive Banners */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {[
          { icon: 'bolt', title: 'Operational Efficiency', body: 'Rail corridors show a 24% higher efficiency margin compared to road haulage this period. Recommend increasing rail allocation.', col: 'bg-primary-fixed border-primary/20 text-[#493ee5]' },
          { icon: 'warning', title: 'Risk Abatement', body: 'Anomalies detected in coastal routes. Weather protocols suggest a 3-hour buffer on all pending maritime nodes.', col: 'bg-error-container border-error/20 text-error' },
          { icon: 'target', title: 'Financial Target', body: 'Revenue is tracking 12% above quarterly forecast. Standardized protocol optimization has saved ₹1.2M in fleet costs.', col: 'bg-[#493ee5] border-white/10 text-on-primary' },
        ].map((b, i) => (
          <div key={i} className={`p-8 rounded-3xl border ${b.col} relative overflow-hidden group hover:scale-[1.02] transition-transform duration-500`}>
            <span className="material-symbols-outlined absolute -right-8 -bottom-8 text-[140px] opacity-10 rotate-12 transition-transform group-hover:rotate-0 duration-700">{b.icon}</span>
            <div className="relative">
              <h4 className="text-[11px] font-black uppercase tracking-[0.2em] mb-4">{b.title}</h4>
              <p className="text-[14px] font-bold leading-relaxed italic">{b.body}</p>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
}
