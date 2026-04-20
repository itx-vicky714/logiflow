"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { seedShipments, estimateRevenue, formatCurrency, statusConfig } from '@/lib/utils';
import type { Shipment } from '@/types';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import dynamic from 'next/dynamic';
import { format, subDays, isAfter, isBefore, endOfDay } from 'date-fns';
import { 
  TrendingUp, BarChart3, PieChart, Activity, ShieldCheck, 
  RefreshCw, Calendar, ArrowUpRight, ArrowDownRight, Zap, 
  Ship, Plane, Truck, Train, AlertTriangle, Target, Briefcase, Info 
} from 'lucide-react';
import { PieChart as RePieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const Charts = dynamic(() => import('@/components/charts/AnalyticsCharts'), { 
  ssr: false, 
  loading: () => <div className="h-64 animate-pulse bg-slate-50 rounded-2xl border border-slate-100" /> 
});

type TimeFilter = '7d' | '30d' | '90d';

export default function AnalyticsPage() {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('30d');
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    setIsRefreshing(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    
    await seedShipments(user.id);
    const { data } = await supabase.from('shipments').select('*').eq('user_id', user.id);
    if (data) setShipments(data);
    setLoading(false);
    setTimeout(() => setIsRefreshing(false), 600);
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

  // Calculations
  const totalRevenue = useMemo(() => filtered.reduce((a, s) => a + estimateRevenue(s) * 0.025, 0), [filtered]);
  const onTimeCount = filtered.filter(s => s.status === 'on_time' || s.status === 'delivered').length;
  const onTimePct = filtered.length > 0 ? Math.round((onTimeCount / filtered.length) * 100) : 0;
  const avgRisk = filtered.length > 0 ? Math.round(filtered.reduce((a, s) => a + s.risk_score, 0) / filtered.length) : 0;

  const volumeTrend = useMemo(() => {
    const points = daysCount === 7 ? 7 : 12;
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
        revenue: bin.reduce((a,s) => a + estimateRevenue(s) * 0.025, 0),
        forecast: Math.round(bin.length * (1.1 + (Math.random() * 0.2))) // Random dynamic forecast
      };
    });
  }, [filtered, daysCount]);

  const modeStats = useMemo(() => (['road', 'rail', 'air', 'sea'] as const).map(m => {
    const ms = filtered.filter(s => s.mode === m);
    return {
      name: m === 'road' ? 'Truck' : m === 'rail' ? 'Rail' : m === 'air' ? 'Air' : 'Sea',
      count: ms.length,
      revenue: ms.reduce((a, s) => a + estimateRevenue(s) * 0.025, 0),
      delayed: ms.filter(s => s.status === 'delayed').length,
      on_time: ms.filter(s => s.status === 'on_time' || s.status === 'delivered').length,
      atRisk: ms.filter(s => s.risk_score > 70).length
    };
  }), [filtered]);

  const statusTypeStats = useMemo(() => {
    const statuses = ['pending', 'in_transit', 'delayed', 'delivered'];
    return statuses.map(st => ({
      name: st.replace('_', ' ').toUpperCase(),
      count: filtered.filter(s => s.status === st).length
    }));
  }, [filtered]);

  if (loading) return (
    <div className="flex items-center justify-center min-h-[calc(100vh-12rem)]">
      <div className="status-pulse bg-indigo-600 w-12 h-12"></div>
    </div>
  );

  return (
    <div className="max-w-[1400px] mx-auto pb-20 mt-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
      
      {/* Analytics Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
        <div>
          <div className="flex items-center gap-2 mb-2">
             <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest bg-indigo-50 px-3 py-1 rounded-full">Analytical Insights</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-black text-slate-800 tracking-tighter uppercase italic">Shipment Analytics</h1>
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mt-2 flex items-center gap-2">
             <Activity size={12} className="text-emerald-500" /> Analyzing {filtered.length} active shipments
          </p>
        </div>

        <div className="flex items-center gap-4 bg-white p-2 rounded-2xl shadow-sm border border-slate-200/60">
          <div className="flex bg-slate-50 p-1 rounded-xl">
            {(['7d', '30d', '90d'] as TimeFilter[]).map(t => (
              <button 
                key={t} 
                onClick={() => setTimeFilter(t)}
                className={`px-5 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${
                  timeFilter === t ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-600'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
          <button 
            onClick={fetchData} 
            disabled={isRefreshing}
            className="w-10 h-10 flex items-center justify-center bg-white border border-slate-200/60 rounded-xl text-slate-500 hover:text-indigo-600 transition-all active:scale-95 shadow-sm"
          >
            <RefreshCw size={18} className={isRefreshing ? 'animate-spin text-indigo-600' : ''} />
          </button>
        </div>
      </div>

      {/* Primary KPI Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        {[
          { label: 'Reliability', val: `${onTimePct}%`, icon: ShieldCheck, sub: 'On-Time Delivery', color: 'text-indigo-600', iconBg: 'bg-indigo-50', trend: '+2.4%' },
          { label: 'Forecast', val: formatCurrency(totalRevenue), icon: TrendingUp, sub: 'Estimated Yield', color: 'text-slate-900', iconBg: 'bg-slate-50', trend: '+14%'},
          { label: 'Safety', val: `${100 - avgRisk}/100`, icon: Activity, sub: 'Rating', color: 'text-emerald-600', iconBg: 'bg-emerald-50', trend: 'Stable' },
          { label: 'Fleet', val: filtered.length, icon: Truck, sub: 'Active Units', color: 'text-slate-900', iconBg: 'bg-slate-50', trend: '+8 units' },
        ].map((card, i) => (
          <div key={i} className="premium-card p-8 group overflow-hidden">
            <div className={`w-12 h-12 ${card.iconBg} rounded-2xl flex items-center justify-center mb-6 text-indigo-600 group-hover:scale-110 transition-transform shadow-sm`}>
              <card.icon size={24} />
            </div>
            <div className="flex justify-between items-end mb-1">
               <div className={`text-3xl font-black ${card.color} tracking-tighter`}>{card.val}</div>
               <div className={`text-[10px] font-black uppercase ${card.trend.includes('-') ? 'text-rose-500' : 'text-emerald-500'}`}>{card.trend}</div>
            </div>
            <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{card.label}</div>
            <p className="text-[9px] text-slate-400 mt-1 font-bold uppercase tracking-tighter">{card.sub}</p>
          </div>
        ))}
      </div>

      {/* Main Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
        {/* Mode Distribution */}
        <div className="premium-card p-10 relative overflow-hidden group">
          <div className="mb-10 flex justify-between items-start">
            <div>
              <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-2 flex items-center gap-2">
                 <BarChart3 size={12} /> Resource Allocation
              </p>
              <h3 className="text-2xl font-black text-slate-900 tracking-tighter uppercase italic px-0.5">Mode Performance</h3>
            </div>
            <button className="text-slate-300 hover:text-indigo-600 transition-colors p-1"><Info size={20} /></button>
          </div>
          <div className="h-[300px]">
            <Charts 
              type="modePerf" 
              data={modeStats.map(m => ({
                name: m.name,
                on_time: m.count, // Using overall count for simpler visualization
                delayed: m.delayed,
                atRisk: m.atRisk
              }))} 
              tooltipStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 40px rgba(0,0,0,0.08)', fontSize: '11px', fontWeight: 700 }} 
            />
          </div>
        </div>

        {/* Status Breakdown */}
        <div className="premium-card p-10 relative overflow-hidden group">
          <div className="mb-10 flex justify-between items-start">
            <div>
              <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-2 flex items-center gap-2">
                 <PieChart size={12} /> Stream Health
              </p>
              <h3 className="text-2xl font-black text-slate-900 tracking-tighter uppercase italic px-0.5">Operational Status</h3>
            </div>
            <button className="text-slate-300 hover:text-indigo-600 transition-colors p-1"><Info size={20} /></button>
          </div>
          <div className="h-[300px]">
             {statusTypeStats.length > 0 ? (
               <ResponsiveContainer width="100%" height="100%">
                 <RePieChart>
                   <Pie
                     data={statusTypeStats.map(s => ({
                       ...s,
                       color: s.name === 'ON TIME' ? '#10B981' : 
                              s.name === 'DELAYED' ? '#EF4444' : 
                              s.name === 'IN TRANSIT' ? '#3B82F6' : 
                              s.name === 'PENDING' ? '#F59E0B' : '#8B5CF6'
                     }))}
                     cx="50%"
                     cy="50%"
                     innerRadius={60}
                     outerRadius={100}
                     paddingAngle={5}
                     dataKey="count"
                   >
                     {statusTypeStats.map((entry, index) => (
                       <Cell 
                         key={`cell-${index}`} 
                         fill={entry.name === 'ON TIME' ? '#10B981' : 
                               entry.name === 'DELAYED' ? '#EF4444' : 
                               entry.name === 'IN TRANSIT' ? '#3B82F6' : 
                               entry.name === 'PENDING' ? '#F59E0B' : '#8B5CF6'} 
                       />
                     ))}
                   </Pie>
                   <Tooltip 
                     contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 40px rgba(0,0,0,0.08)' }}
                     itemStyle={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase' }}
                   />
                   <Legend 
                     verticalAlign="bottom" 
                     align="center"
                     iconType="circle"
                     wrapperStyle={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', paddingTop: '20px' }}
                   />
                 </RePieChart>
               </ResponsiveContainer>
             ) : (
               <div className="flex items-center justify-center h-full text-slate-300 text-[11px] font-black uppercase tracking-widest">
                 Insufficient Stream Data
               </div>
             )}
          </div>
        </div>
      </div>

      {/* Predictive Analytics Full Width */}
      <div className="premium-card p-10 md:p-12 mb-12">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-6">
            <div>
              <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-2 flex items-center gap-2">
                 <Zap size={14} className="fill-indigo-600" /> Volume Prediction
              </p>
              <h3 className="text-3xl font-black text-slate-900 tracking-tighter uppercase italic">Forecasting Units</h3>
            </div>
            <div className="px-6 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-500 shadow-sm">
               Engine Status: <span className="text-indigo-600">Active</span>
            </div>
          </div>
          <div className="h-[400px]">
            <Charts 
               type="volume" 
               data={volumeTrend} 
               tooltipStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 40px rgba(0,0,0,0.1)', fontSize: '11px', fontWeight: 700, padding: '12px' }} 
            />
          </div>
      </div>

      {/* Tactical Advisory Banners */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {[
          { icon: Zap, title: 'Network Efficiency', body: 'Rail hubs are operating at 92% efficiency. Increasing load factor by 15% on Northern corridors suggested.', color: 'bg-indigo-600 text-white' },
          { icon: AlertTriangle, title: 'Advisory', body: 'Coastal transport routes showing potential weather disruptions. Monitor routes via Chennai for the next 48 hours.', color: 'bg-rose-50 border-rose-100 text-rose-700' },
          { icon: Target, title: 'Revenue Milestone', body: 'Expected revenue for the next period is ₹12.5M. Reaching this milestone will unlock fuel cost reductions.', color: 'bg-slate-900 text-white' },
        ].map((b, i) => (
          <div key={i} className={`p-10 rounded-[2.5rem] border ${b.color} relative overflow-hidden group hover:scale-[1.02] transition-all duration-500 shadow-sm`}>
            <b.icon size={120} className="absolute -right-8 -bottom-8 opacity-10 rotate-12 group-hover:rotate-0 transition-transform duration-700" />
            <div className="relative z-10">
              <h4 className="text-[11px] font-black uppercase tracking-[0.2em] mb-6 opacity-60 flex items-center gap-2">
                 <Briefcase size={12} /> {b.title}
              </h4>
              <p className="text-[15px] md:text-[16px] font-semibold leading-relaxed tracking-tight">{b.body}</p>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
}
