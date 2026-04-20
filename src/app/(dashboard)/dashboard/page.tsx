"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import {
  seedShipments, riskColor,
  estimateRevenue, formatCurrency, modeLabel
} from '@/lib/utils';
import { getCityWeather, KEY_CITIES } from '@/lib/weather';
import type { Shipment, KPIData } from '@/types';
import dynamic from 'next/dynamic';
import { format, subDays } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';

import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ModeIcon } from '@/components/ModeIcon';

const ShipmentDetailModal = dynamic(() => import('@/components/ShipmentDetailModal'), { ssr: false });

const HIGH_RISK_THRESHOLD = 70;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];


// Memoized KPI Component to prevent re-renders
const KPICard = React.memo(({ title, value, change, icon, iconColor, isError }: { 
  title: string; value: string | number; change: string; icon: string; iconColor: string; isError?: boolean 
}) => (
  <motion.div 
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    whileHover={{ y: -4 }}
    className="premium-card p-6 lg:p-8 relative overflow-hidden group"
  >
    <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
    <p className="text-slate-500 text-[10px] lg:text-[11px] font-bold uppercase tracking-widest leading-none relative z-10">{title}</p>
    <div className="relative z-10">
      <h2 className={`text-2xl lg:text-4xl font-black tracking-tighter ${isError ? 'text-rose-600' : 'text-slate-900'} mb-1 mt-4`}>{value}</h2>
      <div className={`flex items-center gap-1 ${isError ? 'text-rose-500' : 'text-indigo-600'} text-[10px] font-bold`}>
        <span className="material-symbols-outlined text-xs lg:text-sm">{icon}</span>
        <span>{change}</span>
      </div>
    </div>
  </motion.div>
));

const SkeletonCard = () => (
  <div className="bg-slate-50 p-8 rounded-3xl border border-slate-100 min-h-[170px] animate-pulse">
    <div className="h-3 w-20 bg-slate-200 rounded mb-auto"></div>
    <div className="h-10 w-24 bg-slate-200 rounded mt-4"></div>
  </div>
);

export default function DashboardPage() {
  const router = useRouter();
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedShipment, setSelectedShipment] = useState<Shipment | null>(null);
  const [dbAlerts, setDbAlerts] = useState<any[]>([]);
  const [viewMode, setViewMode] = useState<'daily' | 'monthly'>('monthly');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');


  const fetchData = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      await seedShipments(user.id);
      
      const { data } = await supabase
        .from('shipments')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
        
      if (data) {
        setShipments(data);
      }

      const { data: alertsData } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_read', false)
        .order('created_at', { ascending: false });
      if (alertsData) setDbAlerts(alertsData);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const { modeCounts, seaPercent, airPercent, roadPercent } = React.useMemo(() => {
    const counts = shipments.reduce((acc, s) => {
      acc[s.mode] = (acc[s.mode] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      modeCounts: counts,
      seaPercent: Math.round(((counts['sea'] || 0) / Math.max(1, shipments.length)) * 100),
      airPercent: Math.round(((counts['air'] || 0) / Math.max(1, shipments.length)) * 100),
      roadPercent: Math.round(((counts['road'] || 0) / Math.max(1, shipments.length)) * 100),
    };
  }, [shipments]);

  const barData = React.useMemo(() => {
    return viewMode === 'monthly' 
      ? MONTHS.map((m, i) => {
          const monthShipments = shipments.filter(s => {
            const date = new Date(s.created_at || s.eta);
            return date.getMonth() === i;
          });
          const monthlyRevenue = monthShipments.reduce((sum, s) => sum + estimateRevenue(s) * 0.025, 0);
          return { name: m, value: monthlyRevenue };
        })
      : Array.from({ length: 7 }).map((_, i) => {
          const d = new Date();
          d.setDate(d.getDate() - (6 - i));
          const dayShipments = shipments.filter(s => {
            const date = new Date(s.created_at || s.eta);
            return date.toDateString() === d.toDateString();
          });
          const dailyRevenue = dayShipments.reduce((sum, s) => sum + estimateRevenue(s) * 0.025, 0);
          return { name: format(d, 'MMM d'), value: dailyRevenue };
        });
  }, [shipments, viewMode]);

  const stats = React.useMemo(() => {
    const total = shipments.length;
    const inTransit = shipments.filter(s => s.status === 'in_transit').length;
    const delayed = shipments.filter(s => s.status === 'delayed').length;
    const onTime = shipments.filter(s => s.status === 'on_time').length;
    const atRisk = shipments.filter(s => s.risk_score >= 70).length;
    const revenue = shipments.reduce((sum, s) => sum + estimateRevenue(s) * 0.025, 0);
    
    return {
      total,
      inTransit,
      delayed,
      onTime,
      atRisk,
      revenue,
      onTimePct: total > 0 ? Math.round((onTime / total) * 100) : 0
    };
  }, [shipments]);

  const cityWeathers = React.useMemo(() => KEY_CITIES.slice(0, 2).map(getCityWeather), []);
  const alerts = React.useMemo(() => dbAlerts.length > 0 ? dbAlerts.slice(0, 3) : [], [dbAlerts]);

  if (loading) return (
    <div className="pt-16 px-12">
      <div className="h-8 w-48 bg-slate-100 rounded animate-pulse mb-8"></div>
      <div className="grid grid-cols-12 gap-10">
        <div className="col-span-9 space-y-10">
          <div className="grid grid-cols-6 gap-6">
            {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
          <div className="h-80 bg-slate-50 rounded-3xl animate-pulse"></div>
        </div>
        <div className="col-span-3 space-y-10">
          <div className="h-80 bg-slate-50 rounded-3xl animate-pulse"></div>
          <div className="h-40 bg-slate-50 rounded-3xl animate-pulse"></div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="pt-16 animate-in fade-in slide-in-from-bottom-4 duration-1000">
      
      {/* Top Section: Dashboard KPIs & Sidebar Panels (9+3 Enforced) */}
      <section className="grid grid-cols-12 gap-10 mt-10 mb-6">
        <div className="col-span-12 lg:col-span-9">
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
            <h3 className="text-xl font-black text-slate-800 tracking-tighter uppercase italic">
              Shipment Operations Control
            </h3>
          </div>

          {/* KPI Cards Row */}
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4 lg:gap-6">
             <KPICard title="Total Orders" value={stats.total.toLocaleString()} change="+14.2%" icon="trending_up" iconColor="#493ee5" />
             <KPICard title="In Transit" value={stats.inTransit.toLocaleString()} change="Active now" icon="sync" iconColor="on-surface-variant" />
             <KPICard title="On Time" value={`${stats.onTimePct}%`} change="Target met" icon="verified" iconColor="#493ee5" />
             <KPICard title="Delayed" value={stats.delayed.toLocaleString()} change="Needs Attention" icon="warning" iconColor="error" isError />
             <KPICard title="High Risk" value={stats.atRisk.toLocaleString()} change="Review Data" icon="gpp_maybe" iconColor="error" isError={stats.atRisk > 0} />
             <KPICard title="System Alerts" value={dbAlerts.length.toLocaleString()} change="Real-time" icon="bolt" iconColor="#493ee5" />
          </div>

          {/* Revenue Graph Area */}
          <div className="mt-6 lg:mt-10 w-full premium-card p-6 lg:p-12">
            <div className="flex items-center justify-between mb-12">
              <div>
                <h3 className="text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-2">Revenue Forecast</h3>
                <p className="text-3xl font-black tracking-tighter text-slate-900">
                  {formatCurrency(stats.revenue)} <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-2">Estimated Flow</span>
                </p>
              </div>
              <div className="flex bg-slate-100/50 p-1 rounded-2xl border border-slate-200/50">
                <button 
                  onClick={() => setViewMode('daily')}
                  className={`px-6 py-2 text-[11px] font-bold rounded-lg transition-all ${viewMode === 'daily' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                >
                  Daily
                </button>
                <button 
                  onClick={() => setViewMode('monthly')}
                  className={`px-6 py-2 text-[11px] font-bold rounded-lg transition-all ${viewMode === 'monthly' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                >
                  Monthly
                </button>
              </div>
            </div>
            
            <div className="h-64 flex items-end justify-between gap-2 md:gap-6 relative mt-6 overflow-x-auto pb-4 scrollbar-hide">
              {barData.map((data, idx) => {
                 const maxVal = Math.max(...barData.map(d => d.value));
                 const height = maxVal > 0 ? (data.value / maxVal) * 100 : 0;
                 return (
                   <div key={idx} className="flex-1 flex flex-col items-center gap-5 group bar-container relative h-full justify-end">
                     <div className="tooltip absolute -top-10 bg-inverse-surface text-inverse-on-surface text-[10px] font-bold px-2 py-1.5 rounded-lg opacity-0 transition-all pointer-events-none whitespace-nowrap z-20">
                        {formatCurrency(data.value)}
                     </div>
                     <div className="w-full rounded-t-sm chart-bar transition-all duration-500 hover:opacity-90" style={{ height: `${Math.max(10, height)}%` }}></div>
                     <span className="text-[11px] font-bold text-on-surface-variant uppercase tracking-tighter">{data.name}</span>
                   </div>
                 );
              })}
            </div>
          </div>
        </div>

        {/* Tactical Panels Column */}
        <div className="col-span-12 lg:col-span-3 flex flex-col gap-6 lg:gap-10">
          <div className="premium-card p-6 lg:p-10 flex-1">
            <div className="flex items-center justify-between mb-10">
              <h4 className="text-[11px] font-black uppercase tracking-widest text-slate-900">System Alerts</h4>
              <span className="px-3 py-1.5 bg-rose-50 text-rose-600 text-[10px] font-black rounded-full border border-rose-100 uppercase tracking-widest">
                {alerts.length} Action
              </span>
            </div>
            <div className="space-y-10">
              {alerts.length > 0 ? alerts.map((a, i) => (
                <div key={i} className="flex gap-6 group">
                  <div className={`w-[3px] h-12 ${a.type === 'risk' || a.type === 'delay' ? 'bg-error' : a.type === 'info' ? 'bg-primary' : 'bg-tertiary-container'} rounded-full transition-transform group-hover:scale-y-125`}></div>
                  <div>
                    <p className="text-[13px] font-semibold text-on-surface tracking-tight leading-none uppercase">{a.title}</p>
                    <p className="text-[11px] text-on-surface-variant mt-2 leading-relaxed font-medium">{a.message}</p>
                    <button className="text-[10px] font-bold text-primary mt-3 uppercase tracking-tighter hover:underline decoration-1 underline-offset-4">View Details</button>
                  </div>
                </div>
              )) : (
                <div className="py-10 text-center space-y-4">
                  <span className="material-symbols-outlined text-4xl text-on-surface-variant/20 block">notifications_none</span>
                  <p className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest">No Recent Disruptions</p>
                </div>
              )}
            </div>
          </div>

          <div className="bg-slate-50 p-6 lg:p-10 rounded-3xl border border-slate-200/60 shadow-sm">
            <h4 className="text-[11px] font-black uppercase tracking-widest text-slate-500 mb-6 font-headline">Weather Intel</h4>
            <div className="grid grid-cols-2 gap-4">
              {cityWeathers.map((w, idx) => (
                <div key={idx} className="bg-white p-6 rounded-2xl flex flex-col gap-3 hover:shadow-md transition-all border border-slate-100">
                  <div className="flex items-center justify-between">
                    <span className={`material-symbols-outlined ${w.riskLevel === 'high' || w.riskLevel === 'severe' ? 'text-rose-600' : 'text-indigo-600'} text-2xl`}>
                      {w.condition === 'sunny' ? 'light_mode' : w.condition === 'storm' ? 'thunderstorm' : 'cloud'}
                    </span>
                    <span className="text-[13px] font-black text-slate-900">{w.tempC}°C</span>
                  </div>
                  <div>
                    <p className="text-[12px] font-black text-slate-900 leading-none">{w.city}</p>
                    <p className={`text-[10px] mt-1.5 ${w.riskLevel === 'high' || w.riskLevel === 'severe' ? 'text-rose-600 font-bold' : 'text-slate-500'} uppercase tracking-tight`}>
                      {w.condition === 'storm' ? 'Severe Risk' : 'Clear Skies'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Bottom Section: Operations Registry & Transport Modal */}
      <section className="grid grid-cols-12 gap-6 lg:gap-10">
        <div className="col-span-12 lg:col-span-9 premium-card overflow-hidden" style={{ contentVisibility: 'auto', containIntrinsicSize: '0 500px' }}>
          <div className="p-6 lg:p-12 border-b border-slate-100">
            <div className="flex items-center justify-between">
              <h4 className="text-[11px] font-black uppercase tracking-widest text-slate-900">Active Shipments</h4>
              <button 
                onClick={() => router.push('/shipments')}
                className="text-[11px] font-black text-indigo-600 flex items-center gap-1 hover:underline decoration-2 underline-offset-8 uppercase tracking-widest"
              >
                Full Fleet <span className="material-symbols-outlined text-sm">chevron_right</span>
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-low/50">
                  <th className="px-12 py-8 text-[11px] font-bold text-on-surface-variant uppercase tracking-[0.1em]">Shipment ID</th>
                  <th className="px-12 py-8 text-[11px] font-bold text-on-surface-variant uppercase tracking-[0.1em]">Destination</th>
                  <th className="px-12 py-8 text-[11px] font-bold text-on-surface-variant uppercase tracking-[0.1em]">Status</th>
                  <th className="px-12 py-8 text-[11px] font-bold text-on-surface-variant uppercase tracking-[0.1em]">ETA Schedule</th>
                  <th className="px-12 py-8 text-[11px] font-bold text-on-surface-variant uppercase tracking-[0.1em]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container">
                {shipments.slice(0, 5).map((s, i) => (
                  <tr key={i} onClick={() => setSelectedShipment(s)} className="hover:bg-surface-container-low transition-colors cursor-pointer group">
                    <td className="px-6 lg:px-12 py-6 lg:py-10">
                      <p className="text-sm font-semibold text-on-surface group-hover:text-primary transition-colors">#{s.shipment_code.split('-').pop()}</p>
                      <p className="text-[10px] lg:text-[11px] text-on-surface-variant uppercase mt-1 tracking-tight font-medium">{s.cargo_type}</p>
                    </td>
                    <td className="px-6 lg:px-12 py-6 lg:py-10">
                      <p className="text-sm font-semibold text-on-surface uppercase tracking-tight">{s.destination}</p>
                      <p className="text-[10px] lg:text-[11px] text-on-surface-variant uppercase mt-1 tracking-tight font-medium hidden md:block">Clearance Zone</p>
                    </td>
                    <td className="px-6 lg:px-12 py-6 lg:py-10">
                      <span className={`inline-flex items-center gap-2 px-3 lg:px-5 py-1.5 lg:py-2.5 ${
                        s.status === 'delayed' ? 'bg-error-container text-error' : 
                        s.status === 'pending' ? 'bg-surface-container-highest text-on-surface-variant' :
                        'bg-primary-fixed text-on-primary-fixed-variant'
                      } text-[10px] font-bold rounded-full uppercase tracking-widest border border-white/50 shadow-sm`}>
                        <span className={`w-2 h-2 ${
                          s.status === 'delayed' ? 'bg-error' : 
                          s.status === 'pending' ? 'bg-outline' : 
                          'bg-primary'
                        } rounded-full`}></span>
                        {s.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="hidden sm:table-cell px-6 lg:px-12 py-6 lg:py-10">
                      <p className={`text-sm font-semibold ${s.status === 'delayed' ? 'text-error' : 'text-on-surface'} tracking-tight`}>
                        {format(new Date(s.eta), 'MMM d, HH:mm')}
                      </p>
                    </td>
                    <td className="px-6 lg:px-12 py-6 lg:py-10">
                      <button 
                        onClick={(e) => { e.stopPropagation(); setSelectedShipment(s); }}
                        className="w-12 h-12 rounded-xl flex items-center justify-center hover:bg-surface-container transition-all group-hover:bg-white shadow-sm"
                      >
                        <div className="w-10 h-10 rounded-xl bg-surface-container-low border border-white/50 flex items-center justify-center text-primary shadow-sm group-hover:bg-surface-container-lowest transition-all">
                           <ModeIcon mode={s.mode} size={18} />
                        </div>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Transport Breakdown Area */}
        <div className="col-span-12 lg:col-span-3 flex flex-col gap-6 lg:gap-10" style={{ contentVisibility: 'auto', containIntrinsicSize: '0 400px' }}>
          <div className="premium-card p-8 lg:p-12 flex-1 flex flex-col group overflow-hidden relative">
            <h4 className="text-[11px] font-black uppercase tracking-widest text-slate-900 mb-12">Modal Distribution</h4>
            <div className="relative w-48 h-48 mx-auto mb-12 transition-transform duration-1000 group-hover:scale-105">
              <svg className="w-full h-full transform -rotate-90 rounded-full" viewBox="0 0 100 100">
                <circle cx="50" cy="50" fill="transparent" r="40" stroke="#f8fafc" strokeWidth="12" />
                <circle cx="50" cy="50" fill="transparent" r="40" stroke="#4f46e5" 
                        strokeDasharray="251.2" strokeDashoffset={251.2 * (1 - seaPercent/100)} 
                        strokeWidth="12" className="transition-all duration-1000" />
                <circle cx="50" cy="50" fill="transparent" r="40" stroke="#818cf8" 
                        strokeDasharray="251.2" strokeDashoffset={251.2 * (1 - (seaPercent + airPercent)/100)} 
                        strokeWidth="12" className="transition-all duration-1000" />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <p className="text-3xl font-black text-slate-900 tracking-tighter italic">{Math.max(1, Math.round(shipments.length/10))}</p>
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Active</p>
              </div>
            </div>
            <div className="space-y-6">
              <div className="flex items-center justify-between group/row cursor-default">
                <div className="flex items-center gap-4">
                  <span className="w-4 h-4 rounded-full bg-primary shadow-sm" />
                  <span className="text-sm font-semibold text-on-surface group-hover/row:text-primary transition-colors">Sea Freight</span>
                </div>
                <span className="text-sm font-bold text-on-surface">{seaPercent}%</span>
              </div>
              <div className="flex items-center justify-between group/row cursor-default">
                <div className="flex items-center gap-4">
                  <span className="w-4 h-4 rounded-full bg-primary-container shadow-sm" />
                  <span className="text-sm font-semibold text-on-surface group-hover/row:text-primary transition-colors">Air Express</span>
                </div>
                <span className="text-sm font-bold text-on-surface">{airPercent}%</span>
              </div>
              <div className="flex items-center justify-between group/row cursor-default">
                <div className="flex items-center gap-4">
                  <span className="w-4 h-4 rounded-full bg-surface-variant shadow-sm" />
                  <span className="text-sm font-semibold text-on-surface group-hover/row:text-primary transition-colors">Road Transit</span>
                </div>
                <span className="text-sm font-bold text-on-surface">{roadPercent}%</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {selectedShipment && (
        <ShipmentDetailModal
          shipment={selectedShipment}
          onClose={() => setSelectedShipment(null)}
          onUpdate={fetchData}
        />
      )}
    </div>
  );
}

