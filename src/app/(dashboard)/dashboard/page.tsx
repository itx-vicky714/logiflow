"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import {
  seedShipments, modeIcon, riskColor,
  estimateRevenue, formatCurrency, modeLabel
} from '@/lib/utils';
import { getCityWeather, KEY_CITIES } from '@/lib/weather';
import type { Shipment, KPIData } from '@/types';
import dynamic from 'next/dynamic';
import { format } from 'date-fns';

const ShipmentDetailModal = dynamic(() => import('@/components/ShipmentDetailModal'), { ssr: false });

const HIGH_RISK_THRESHOLD = 70;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function DashboardPage() {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [kpi, setKpi] = useState<KPIData>({
    total: 0, inTransit: 0, onTime: 0, delayed: 0, atRisk: 0, avgRisk: 0, revenue: 0
  });
  const [selectedShipment, setSelectedShipment] = useState<Shipment | null>(null);
  const [dbAlerts, setDbAlerts] = useState<any[]>([]);

  const fetchData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await seedShipments(user.id);
    const { data } = await supabase
      .from('shipments').select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    if (data) {
      setShipments(data);
      const total      = data.length;
      const inTransit  = data.filter(s => s.status === 'in_transit').length;
      const onTime     = data.filter(s => s.status === 'on_time').length;
      const delayed    = data.filter(s => s.status === 'delayed').length;
      const atRisk     = data.filter(s => s.risk_score >= HIGH_RISK_THRESHOLD).length;
      const avgRisk    = total > 0 ? Math.round(data.reduce((a, b) => a + b.risk_score, 0) / total) : 0;
      const revenue    = data
        .filter(s => s.status === 'delivered' || s.status === 'on_time' || s.status === 'in_transit')
        .reduce((sum, s) => sum + estimateRevenue(s), 0);
      setKpi({ total, inTransit, onTime, delayed, atRisk, avgRisk, revenue });
    }

    const { data: alertsData } = await supabase
      .from('notifications').select('*')
      .eq('user_id', user.id)
      .eq('is_read', false)
      .order('created_at', { ascending: false });
    if (alertsData) setDbAlerts(alertsData);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const cityWeathers = KEY_CITIES.slice(0, 2).map(getCityWeather);

  const modeCounts = shipments.reduce((acc, s) => {
    acc[s.mode] = (acc[s.mode] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const barData = MONTHS.map((m, i) => {
    const weights = [0.05, 0.08, 0.06, 0.09, 0.07, 0.1, 0.04, 0.12, 0.08, 0.11, 0.1, 0.1];
    return { name: m, value: Math.round(kpi.revenue * weights[i]) };
  });

  const seaPercent = Math.round(((modeCounts['sea'] || 0) / Math.max(1, shipments.length)) * 100);
  const airPercent = Math.round(((modeCounts['air'] || 0) / Math.max(1, shipments.length)) * 100);
  const roadPercent = Math.round(((modeCounts['road'] || 0) / Math.max(1, shipments.length)) * 100);

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="status-pulse bg-primary w-12 h-12"></div>
    </div>
  );

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* Hero Section: High-End Metrics */}
      <section className="grid grid-cols-12 gap-6 mb-6">
        <div className="col-span-12 lg:col-span-8">
          <div className="grid grid-cols-4 gap-6">
             {/* KPI Cards */}
             <div className="bg-surface-container-lowest p-6 rounded-2xl curated-shadow border border-white/50">
               <p className="text-on-surface-variant text-[11px] font-bold uppercase tracking-widest mb-4">Total Shipments</p>
               <h2 className="text-3xl font-black tracking-tighter text-on-surface mb-1">{kpi.total.toLocaleString()}</h2>
               <div className="flex items-center gap-1 text-[#493ee5] text-[10px] font-bold">
                 <span className="material-symbols-outlined text-xs">trending_up</span>
                 <span>+14.2%</span>
               </div>
             </div>
             <div className="bg-surface-container-lowest p-6 rounded-2xl curated-shadow border border-white/50">
               <p className="text-on-surface-variant text-[11px] font-bold uppercase tracking-widest mb-4">In Transit</p>
               <h2 className="text-3xl font-black tracking-tighter text-on-surface mb-1">{kpi.inTransit.toLocaleString()}</h2>
               <div className="flex items-center gap-1 text-on-surface-variant text-[10px] font-bold">
                 <span className="material-symbols-outlined text-xs">sync</span>
                 <span>Active now</span>
               </div>
             </div>
             <div className="bg-surface-container-lowest p-6 rounded-2xl curated-shadow border border-white/50">
               <p className="text-on-surface-variant text-[11px] font-bold uppercase tracking-widest mb-4">On Time</p>
               <h2 className="text-3xl font-black tracking-tighter text-on-surface mb-1">98.4%</h2>
               <div className="flex items-center gap-1 text-[#493ee5] text-[10px] font-bold">
                 <span className="material-symbols-outlined text-xs">verified</span>
                 <span>Target met</span>
               </div>
             </div>
             <div className="bg-surface-container-lowest p-6 rounded-2xl curated-shadow border border-white/50">
               <p className="text-on-surface-variant text-[11px] font-bold uppercase tracking-widest mb-4">Delayed</p>
               <h2 className="text-3xl font-black tracking-tighter text-error mb-1">{kpi.delayed.toLocaleString()}</h2>
               <div className="flex items-center gap-1 text-error text-[10px] font-bold">
                 <span className="material-symbols-outlined text-xs">warning</span>
                 <span>Critical action</span>
               </div>
             </div>
          </div>

          {/* Revenue Forecast Visualizer */}
          <div className="mt-6 w-full bg-surface-container-lowest p-8 rounded-2xl curated-shadow border border-white/50">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-sm font-black uppercase tracking-widest text-on-surface mb-1">Revenue Forecast</h3>
                <p className="text-2xl font-black tracking-tighter text-on-surface">
                  {formatCurrency(kpi.revenue)} <span className="text-[11px] font-bold text-on-surface-variant uppercase tracking-widest ml-2">USD Total Volume</span>
                </p>
              </div>
              <div className="flex bg-surface-container p-1 rounded-lg">
                <button className="px-4 py-1.5 text-xs font-bold rounded-md text-on-surface-variant hover:text-on-surface transition-colors">Daily</button>
                <button className="px-4 py-1.5 text-xs font-bold rounded-md bg-primary text-on-primary shadow-sm hover:opacity-90">Monthly</button>
              </div>
            </div>
            
            <div className="h-48 flex items-end justify-between gap-3 relative mt-6">
              {barData.map((data, idx) => {
                 const maxVal = Math.max(...barData.map(d => d.value));
                 const height = maxVal > 0 ? (data.value / maxVal) * 100 : 0;
                 return (
                   <div key={idx} className="flex-1 flex flex-col items-center gap-3 group bar-container relative h-full justify-end">
                     <div className="tooltip absolute -top-8 bg-inverse-surface text-inverse-on-surface text-[10px] font-bold px-2 py-1 rounded opacity-0 transition-all pointer-events-none whitespace-nowrap z-10">
                        {formatCurrency(data.value)}
                     </div>
                     <div className="w-full rounded-t-sm chart-bar" style={{ height: `${height}%` }}></div>
                     <span className="text-[10px] font-bold text-on-surface-variant">{data.name}</span>
                   </div>
                 );
              })}
            </div>
          </div>
        </div>

        {/* Tactical Panels */}
        <div className="col-span-12 lg:col-span-4 flex flex-col gap-6">
          <div className="bg-surface-container-lowest p-8 rounded-2xl curated-shadow border border-white/50 flex-1">
            <div className="flex items-center justify-between mb-6">
              <h4 className="text-sm font-black uppercase tracking-widest text-on-surface italic">Smart Alerts</h4>
              {dbAlerts.length > 0 && (
                <span className="px-2 py-1 bg-error-container text-error text-[10px] font-black rounded uppercase tracking-widest">
                  {dbAlerts.length} ACTION REQ.
                </span>
              )}
            </div>
            <div className="space-y-6">
              {dbAlerts.length > 0 ? dbAlerts.slice(0, 3).map((a, i) => (
                <div key={i} className="flex gap-4 group">
                  <div className={`w-1.5 h-12 ${a.type === 'risk' ? 'bg-error' : 'bg-primary'} rounded-full transition-transform group-hover:scale-y-110`}></div>
                  <div>
                    <p className="text-xs font-bold text-on-surface uppercase tracking-tight">{a.title}</p>
                    <p className="text-[11px] text-on-surface-variant mt-1 leading-relaxed italic">{a.message}</p>
                    <button className="text-[10px] font-black text-primary mt-2 uppercase tracking-tighter hover:underline decoration-2">Reroute Shipment</button>
                  </div>
                </div>
              )) : (
                <p className="text-xs font-bold text-slate-300 italic text-center py-10">No active alerts</p>
              )}
            </div>
          </div>

          <div className="bg-surface-container-low p-6 rounded-2xl curated-shadow border border-white/30">
            <h4 className="text-[11px] font-bold uppercase tracking-widest text-on-surface-variant mb-4">Weather Intelligence</h4>
            <div className="grid grid-cols-2 gap-3">
              {cityWeathers.map((w, idx) => (
                <div key={idx} className="bg-surface-container-lowest p-4 rounded-lg flex flex-col gap-2 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between">
                    <span className={`material-symbols-outlined ${w.riskLevel === 'high' || w.riskLevel === 'severe' ? 'text-error' : 'text-primary'} text-lg`}>
                      {w.condition === 'sunny' ? 'light_mode' : w.condition === 'storm' ? 'thunderstorm' : 'cloud'}
                    </span>
                    <span className="text-xs font-black">{w.tempC}°C</span>
                  </div>
                  <p className="text-[11px] font-bold text-on-surface">{w.city} Hub</p>
                  <p className={`text-[9px] ${w.riskLevel === 'high' || w.riskLevel === 'severe' ? 'text-error font-bold' : 'text-on-surface-variant'} uppercase tracking-tighter`}>
                    {w.condition === 'storm' ? 'Alert: Storm' : 'Clear Flow'}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Terminal Registry */}
      <section className="grid grid-cols-12 gap-6">
        <div className="col-span-12 lg:col-span-8 bg-surface-container-lowest rounded-2xl curated-shadow border border-white/50 overflow-hidden">
          <div className="p-8 border-b border-surface-container">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-black uppercase tracking-widest text-on-surface">Recent Shipments</h4>
              <button className="text-[11px] font-bold text-primary flex items-center gap-1 hover:underline">
                View All Shipments <span className="material-symbols-outlined text-sm">chevron_right</span>
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-surface-container-low">
                  <th className="px-8 py-4 text-[10px] font-black text-on-surface-variant uppercase tracking-widest">Tracking ID</th>
                  <th className="px-8 py-4 text-[10px] font-black text-on-surface-variant uppercase tracking-widest">Destination</th>
                  <th className="px-8 py-4 text-[10px] font-black text-on-surface-variant uppercase tracking-widest">Status</th>
                  <th className="px-8 py-4 text-[10px] font-black text-on-surface-variant uppercase tracking-widest">ETA</th>
                  <th className="px-8 py-4 text-[10px] font-black text-on-surface-variant uppercase tracking-widest">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container">
                {shipments.slice(0, 5).map((s, i) => (
                  <tr key={i} onClick={() => setSelectedShipment(s)} className="hover:bg-surface-container-low/50 transition-colors cursor-pointer group">
                    <td className="px-8 py-6">
                      <p className="text-xs font-bold text-on-surface group-hover:text-primary transition-colors">#{s.shipment_code.split('-').pop()}</p>
                      <p className="text-[10px] text-on-surface-variant uppercase tracking-tight">{s.cargo_type}</p>
                    </td>
                    <td className="px-8 py-6">
                      <p className="text-xs font-bold text-on-surface uppercase tracking-tight">{s.destination}</p>
                      <p className="text-[10px] text-on-surface-variant uppercase tracking-tight">Active Terminal</p>
                    </td>
                    <td className="px-8 py-6">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 ${
                        s.status === 'delayed' ? 'bg-error-container text-error' : 
                        s.status === 'pending' ? 'bg-surface-container-highest text-on-surface-variant' :
                        'bg-primary-fixed text-on-primary-fixed-variant'
                      } text-[10px] font-black rounded-full uppercase tracking-widest border border-white shadow-sm`}>
                        <span className={`w-1.5 h-1.5 ${
                          s.status === 'delayed' ? 'bg-error' : 
                          s.status === 'pending' ? 'bg-outline' : 
                          'bg-primary'
                        } rounded-full`}></span>
                        {s.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-8 py-6">
                      <p className={`text-xs font-bold ${s.status === 'delayed' ? 'text-error' : 'text-on-surface'} italic tracking-tight`}>
                        {format(new Date(s.eta), 'MMM d, HH:mm')}
                      </p>
                    </td>
                    <td className="px-8 py-6">
                      <button className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-surface-container transition-all">
                        <span className="material-symbols-outlined text-lg text-on-surface-variant">more_vert</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Transport Breakdown Chart */}
        <div className="col-span-12 lg:col-span-4 flex flex-col gap-6">
          <div className="bg-surface-container-lowest p-8 rounded-2xl curated-shadow border border-white/50 flex-1 flex flex-col group overflow-hidden relative">
            <h4 className="text-sm font-black uppercase tracking-widest text-on-surface mb-8 italic">Transport Breakdown</h4>
            <div className="relative w-48 h-48 mx-auto mb-8 transition-transform duration-1000 group-hover:scale-105">
              <svg className="w-full h-full transform -rotate-90 shadow-sm rounded-full" viewBox="0 0 100 100">
                <circle cx="50" cy="50" fill="transparent" r="40" stroke="#eceef0" strokeWidth="12" />
                <circle cx="50" cy="50" fill="transparent" r="40" stroke="#493ee5" 
                        strokeDasharray="251.2" strokeDashoffset={251.2 * (1 - seaPercent/100)} 
                        strokeWidth="12" className="transition-all duration-1000" />
                <circle cx="50" cy="50" fill="transparent" r="40" stroke="#635bff" 
                        strokeDasharray="251.2" strokeDashoffset={251.2 * (1 - (seaPercent + airPercent)/100)} 
                        strokeWidth="12" className="transition-all duration-1000" />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <p className="text-3xl font-black text-on-surface tracking-tighter italic">{Math.round(shipments.length/1000)}k</p>
                <p className="text-[9px] font-bold text-on-surface-variant uppercase tracking-widest">Units</p>
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between group/row cursor-default">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-primary shadow-sm" />
                  <span className="text-xs font-bold text-on-surface group-hover/row:text-primary transition-colors">Sea Freight</span>
                </div>
                <span className="text-xs font-black text-on-surface">{seaPercent}%</span>
              </div>
              <div className="flex items-center justify-between group/row cursor-default">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-primary-container shadow-sm" />
                  <span className="text-xs font-bold text-on-surface group-hover/row:text-primary transition-colors">Air Express</span>
                </div>
                <span className="text-xs font-black text-on-surface">{airPercent}%</span>
              </div>
              <div className="flex items-center justify-between group/row cursor-default">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-surface-variant shadow-sm" />
                  <span className="text-xs font-bold text-on-surface group-hover/row:text-primary transition-colors">Road Transit</span>
                </div>
                <span className="text-xs font-black text-on-surface">{roadPercent}%</span>
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
