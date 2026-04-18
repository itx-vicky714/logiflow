"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { seedShipments, statusConfig, modeIcon, riskColor, riskBg, estimateRevenue, formatCurrency } from '@/lib/utils';
import { getCityWeather, getRouteWeatherRisk, KEY_CITIES } from '@/lib/weather';
import type { Shipment, KPIData } from '@/types';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import {
  Package, Truck, CheckCircle, AlertTriangle, Cloud, RefreshCw, Activity, MoreHorizontal, ArrowRight
} from 'lucide-react';
import dynamic from 'next/dynamic';
import { format } from 'date-fns';
import { toast } from 'sonner';

const ShipmentDetailModal = dynamic(() => import('@/components/ShipmentDetailModal'), { ssr: false });

export default function DashboardPage() {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [kpi, setKpi] = useState<KPIData>({ total: 0, inTransit: 0, onTime: 0, delayed: 0, atRisk: 0, avgRisk: 0, revenue: 0 });
  const [selectedShipment, setSelectedShipment] = useState<Shipment | null>(null);
  const [mounted, setMounted] = useState(false);
  const [dbAlerts, setDbAlerts] = useState<{
    id: string;
    type: string;
    severity: string;
    title: string;
    message: string;
    cause?: string;
    recommended_action?: string;
    shipment?: string;
    status: string;
    is_read: boolean;
    created_at: string;
  }[]>([]);
  const [simulating, setSimulating] = useState(false);

  // Toggle state for UI mock
  const [revToggle, setRevToggle] = useState<'Daily' | 'Monthly'>('Monthly');

  const fetchData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await seedShipments(user.id);
    const { data } = await supabase.from('shipments').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
    if (data) {
      setShipments(data);
      const total = data.length;
      const inTransit = data.filter(s => s.status === 'in_transit').length;
      const onTime = data.filter(s => s.status === 'on_time').length;
      const delayed = data.filter(s => s.status === 'delayed').length;
      const atRisk = data.filter(s => s.risk_score > 70).length;
      const avgRisk = total > 0 ? Math.round(data.reduce((a, b) => a + b.risk_score, 0) / total) : 0;
      const revenue = data.filter(s => s.status === 'delivered' || s.status === 'on_time').reduce((sum, s) => sum + estimateRevenue(s), 0);
      setKpi({ total, inTransit, onTime, delayed, atRisk, avgRisk, revenue });
    }
    
    // Fetch DB Alerts
    const { data: alertsData } = await supabase.from('notifications').select('*').eq('user_id', user.id).eq('is_read', false).order('created_at', { ascending: false });
    if (alertsData) {
      setDbAlerts(alertsData);
    }
    
    setLoading(false);
  }, []);

  useEffect(() => {
    setMounted(true);
    fetchData();
    window.addEventListener('shipments-updated', fetchData);
    return () => window.removeEventListener('shipments-updated', fetchData);
  }, [fetchData]);

  const handleResolveDbAlert = async (alert: { id: string; recommended_action?: string; shipment?: string }) => {
    setSimulating(true);
    try {
      if (alert.recommended_action === 'reroute') {
        const s = shipments.find(sh => sh.shipment_code === alert.shipment);
        if (s && s.mode === 'road') {
          await supabase.from('shipments').update({ mode: 'rail', notes: 'Auto-rerouted via alert' }).eq('shipment_code', alert.shipment);
          toast.success('Rerouted to Rail successfully');
        } else {
          toast.success('Reroute suggestion applied');
        }
      } else {
        toast.success(`Action: ${alert.recommended_action || 'Acknowledged'}`);
      }
      await supabase.from('notifications').update({ is_read: true, status: 'resolved', resolved_at: new Date().toISOString() }).eq('id', alert.id);
      await fetchData();
    } catch {
      toast.error('Action failed');
    } finally {
      setSimulating(false);
    }
  };

  const cityWeathers = KEY_CITIES.slice(0, 2).map(getCityWeather);

  const modeChartData = (['road', 'rail', 'air', 'sea'] as const).map(m => ({
    name: m.charAt(0).toUpperCase() + m.slice(1),
    value: shipments.filter(s => s.mode === m).length,
    color: m === 'road' ? '#6366f1' : m === 'rail' ? '#8b5cf6' : m === 'air' ? '#0ea5e9' : '#14b8a6'
  })).filter(d => d.value > 0);

  const kpiCards = [
    { label: 'Total Shipments', icon: Package, value: kpi.total, text: 'text-indigo-600', bg: 'bg-indigo-50' },
    { label: 'In Transit', icon: Truck, value: kpi.inTransit, text: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'On Time', icon: CheckCircle, value: kpi.onTime, text: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Delayed', icon: AlertTriangle, value: kpi.delayed, text: 'text-red-500', bg: 'bg-red-50' },
  ];

  if (loading) return (
    <div className="space-y-6 flex h-full flex-col p-2">
       <div className="h-6 w-48 bg-slate-200 rounded animate-pulse" />
       <div className="grid grid-cols-4 gap-6"><div className="h-28 bg-white rounded-2xl animate-pulse"/><div className="h-28 bg-white rounded-2xl animate-pulse"/><div className="h-28 bg-white rounded-2xl animate-pulse"/><div className="h-28 bg-white rounded-2xl animate-pulse"/></div>
       <div className="flex-1 bg-white rounded-2xl animate-pulse" />
    </div>
  );

  return (
    <div className="bg-[#f5f7fb] min-h-full pb-10 space-y-8 font-sans">
      
      {/* 1. TOP KPI ROW */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Overview</h1>
        <button onClick={fetchData} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all active:scale-95">
          <RefreshCw size={16} />
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {kpiCards.map(card => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex flex-col justify-between hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${card.bg}`}>
                  <Icon size={18} className={card.text} />
                </div>
              </div>
              <div>
                <p className={`text-4xl font-black tracking-tight ${card.label === 'Delayed' ? 'text-red-600' : 'text-slate-900'}`}>{card.value}</p>
                <p className="text-[10px] uppercase font-bold tracking-widest text-slate-400 mt-1">{card.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* MAIN GRID LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        
        {/* LEFT COLUMN (span 2) */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* 3. MAIN REVENUE FORECAST CARD */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8">
            <div className="flex justify-between items-start mb-10">
              <div>
                <h2 className="text-[11px] uppercase tracking-widest font-black text-slate-400 mb-2">Revenue Forecast</h2>
                <div className="text-5xl font-black text-slate-900 tracking-tighter">
                  {formatCurrency(kpi.revenue)}
                </div>
                <div className="text-sm font-bold text-emerald-600 flex items-center gap-1 mt-2">
                  <Activity size={14}/> {kpi.revenue > 0 ? '+12.4% vs last period' : 'Awaiting data'}
                </div>
              </div>
              <div className="flex bg-slate-50 p-1.5 rounded-xl border border-slate-100">
                <button 
                  onClick={() => setRevToggle('Daily')}
                  className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${revToggle === 'Daily' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-400 hover:text-slate-600'}`}>
                  Daily
                </button>
                <button 
                  onClick={() => setRevToggle('Monthly')}
                  className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${revToggle === 'Monthly' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-400 hover:text-slate-600'}`}>
                  Monthly
                </button>
              </div>
            </div>

            {/* Simulated Chart visual aesthetic */}
            <div className="h-32 w-full flex items-end justify-between px-2 gap-2 opacity-80">
              {Array.from({length: 12}).map((_, i) => (
                <div key={i} className="w-full bg-indigo-50 rounded-t flex flex-col justify-end group">
                  <div 
                    className="w-full rounded-t bg-indigo-500/80 transition-all duration-500 group-hover:bg-indigo-600" 
                    style={{ height: `${Math.max(20, Math.random() * 100)}%` }} 
                  />
                </div>
              ))}
            </div>
          </div>

          {/* 5. RECENT SHIPMENTS TABLE */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden flex flex-col">
            <div className="p-6 border-b border-slate-50 flex items-center justify-between">
              <h2 className="text-lg font-black text-slate-900 tracking-tight">Recent Shipments</h2>
              <a href="/shipments" className="text-[11px] font-black uppercase tracking-widest text-indigo-600 flex items-center gap-1 hover:gap-2 transition-all">
                View All <ArrowRight size={12}/>
              </a>
            </div>
            
            <div className="overflow-x-auto">
               <table className="w-full text-left min-w-[600px]">
                 <thead>
                   <tr className="border-b border-slate-50">
                     <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Shipment ID</th>
                     <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Route</th>
                     <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">ETA</th>
                     <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Status</th>
                     <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Action</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-50">
                   {shipments.slice(0, 6).map(s => {
                     const isDelayed = s.status === 'delayed';
                     const isTransit = s.status === 'in_transit';
                     
                     const badgeCss = isTransit ? 'bg-indigo-50 text-indigo-700' : 
                                      isDelayed ? 'bg-red-50 text-red-700' : 
                                      'bg-slate-100 text-slate-600';
                     const sc = statusConfig(s.status);

                     return (
                       <tr key={s.id} onClick={() => setSelectedShipment(s)} className="hover:bg-slate-50 transition-colors cursor-pointer">
                         <td className="px-6 py-4">
                           <span className="font-mono text-sm font-bold text-slate-700">{s.shipment_code}</span>
                         </td>
                         <td className="px-6 py-4">
                           <div className="text-sm font-black text-slate-800">{s.origin} <span className="text-slate-400 font-normal px-1">→</span> {s.destination}</div>
                         </td>
                         <td className="px-6 py-4">
                           <span className="text-sm font-bold text-slate-600">{new Date(s.eta).toLocaleDateString()}</span>
                         </td>
                         <td className="px-6 py-4">
                           <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${badgeCss}`}>
                             {sc.label}
                           </span>
                         </td>
                         <td className="px-6 py-4 text-right">
                           <button className="text-slate-400 hover:text-indigo-600 transition-colors inline-block p-2">
                             <MoreHorizontal size={16} />
                           </button>
                         </td>
                       </tr>
                     );
                   })}
                   {shipments.length === 0 && (
                     <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-500 font-bold text-sm">No recent records found.</td></tr>
                   )}
                 </tbody>
               </table>
            </div>
          </div>
          
        </div>

        {/* RIGHT COLUMN (span 1) */}
        <div className="space-y-8">
          
          {/* 2. SMART ALERTS PANEL */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-black text-slate-900 tracking-tight">Smart Alerts</h2>
              {dbAlerts.length > 0 && (
                <span className="bg-red-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-sm">{dbAlerts.length} Action Required</span>
              )}
            </div>

            <div className="space-y-4 max-h-[300px] overflow-y-auto no-scrollbar">
              {dbAlerts.length === 0 && (
                <div className="text-center py-8 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  <CheckCircle size={24} className="text-emerald-400 mx-auto mb-2" />
                  <p className="text-[11px] font-black uppercase tracking-widest text-slate-500">All Systems Nominal</p>
                </div>
              )}
              {dbAlerts.slice(0,3).map(a => {
                const isRed = a.severity === 'critical' || a.severity === 'high';
                const accentColor = isRed ? 'border-l-red-500 bg-red-50/30' : 'border-l-amber-500 bg-amber-50/30';
                const titleColor = isRed ? 'text-red-800' : 'text-amber-800';

                return (
                  <div key={a.id} className={`p-4 rounded-r-xl border border-l-[3px] border-y-slate-100 border-r-slate-100 ${accentColor}`}>
                    <h4 className={`text-xs font-black uppercase tracking-wider mb-1 ${titleColor}`}>{a.title || a.message}</h4>
                    <p className="text-xs font-semibold text-slate-600 mb-3">{a.cause || a.message}</p>
                    <button 
                      onClick={() => handleResolveDbAlert(a)}
                      disabled={simulating}
                      className="text-[10px] font-black uppercase tracking-widest text-indigo-600 hover:text-indigo-800"
                    >
                      {a.recommended_action || 'Review Details'} →
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 4. WEATHER INTELLIGENCE CARD */}
          <div className="grid grid-cols-2 gap-4">
            {cityWeathers.map(w => {
              const wrBadge = w.riskLevel !== 'low' ? 'border-amber-200 bg-amber-50' : 'border-slate-100 bg-white';
              return (
                <div key={w.city} className={`rounded-2xl p-4 shadow-sm flex flex-col justify-between border ${wrBadge}`}>
                  <div className="flex justify-between items-start mb-4">
                    <span className="text-2xl drop-shadow-sm">{w.icon}</span>
                    <span className="text-lg font-black text-slate-900">{w.tempC}°</span>
                  </div>
                  <div>
                    <h4 className="text-[13px] font-black text-slate-800 tracking-tight">{w.city}</h4>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">{w.condition}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* 6. TRANSPORT BREAKDOWN CARD */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
            <h2 className="text-lg font-black text-slate-900 tracking-tight mb-6">Transport Modes</h2>
            
            <div className="relative">
              {mounted && modeChartData.length > 0 ? (
                <>
                  <div className="relative h-44 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={modeChartData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={2} dataKey="value" stroke="none">
                          {modeChartData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                        </Pie>
                        <Tooltip contentStyle={{ fontSize: 11, borderRadius: 12, border: '1px solid #e2e8f0', fontWeight: 800 }} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-2xl font-black text-slate-900">{kpi.total}</span>
                      <span className="text-[9px] uppercase tracking-widest font-black text-slate-400">Total</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-y-3 mt-4">
                    {modeChartData.map(d => (
                      <div key={d.name} className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                        <span className="text-xs font-bold text-slate-600">{d.name}</span>
                        <span className="ml-auto text-xs font-black text-slate-900">{d.value}</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="h-44 flex items-center justify-center text-slate-400 text-xs font-bold uppercase tracking-widest">No Active Modes</div>
              )}
            </div>
          </div>

        </div>
      </div>

      {selectedShipment && (
        <ShipmentDetailModal shipment={selectedShipment} onClose={() => setSelectedShipment(null)} onUpdate={fetchData} />
      )}
    </div>
  );
}
