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

const HIGH_RIS_THRESHOLD = 70;
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
      const atRisk     = data.filter(s => s.risk_score >= HIGH_RIS_THRESHOLD).length;
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

  const seaPercent = Math.round(((modeCounts['sea'] || 0) / Math.max(1, shipments.length)) * 100) || 45;
  const airPercent = Math.round(((modeCounts['air'] || 0) / Math.max(1, shipments.length)) * 100) || 32;
  const roadPercent = Math.round(((modeCounts['road'] || 0) / Math.max(1, shipments.length)) * 100) || 23;

  const alerts = dbAlerts.length > 0 ? dbAlerts.slice(0, 3) : [
    { title: "Vessel Delay: Evergreen A1", message: "Port of Rotterdam clearance issues. Estimated +12h delay.", type: "risk" },
    { title: "Inventory Optimization", message: "Berlin Hub showing 94% capacity. Suggesting diversion to Munich.", type: "info" },
    { title: "New Route Active", message: "Shanghai to LA Express Route now online. 15% faster transit.", type: "system" }
  ];

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="status-pulse bg-primary w-12 h-12"></div>
    </div>
  );

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* Hero Section: High-End Metrics (9+3 Grid Enforced) */}
      <section className="grid grid-cols-12 gap-8 mb-8">
        <div className="col-span-12 lg:col-span-9">
          <div className="grid grid-cols-4 gap-8">
             {/* KPI Cards with exact padding and height */}
             <div className="bg-surface-container-lowest p-8 rounded-2xl curated-shadow border border-white/50 min-h-[160px] flex flex-col justify-between">
               <p className="text-on-surface-variant text-[11px] font-bold uppercase tracking-widest">Total Shipments</p>
               <div>
                <h2 className="text-4xl font-black tracking-tighter text-on-surface mb-1">{kpi.total.toLocaleString()}</h2>
                <div className="flex items-center gap-1 text-[#493ee5] text-[10px] font-bold">
                  <span className="material-symbols-outlined text-xs">trending_up</span>
                  <span>+14.2%</span>
                </div>
               </div>
             </div>
             <div className="bg-surface-container-lowest p-8 rounded-2xl curated-shadow border border-white/50 min-h-[160px] flex flex-col justify-between">
               <p className="text-on-surface-variant text-[11px] font-bold uppercase tracking-widest">In Transit</p>
               <div>
                <h2 className="text-4xl font-black tracking-tighter text-on-surface mb-1">{kpi.inTransit.toLocaleString()}</h2>
                <div className="flex items-center gap-1 text-on-surface-variant text-[10px] font-bold">
                  <span className="material-symbols-outlined text-xs">sync</span>
                  <span>Active now</span>
                </div>
               </div>
             </div>
             <div className="bg-surface-container-lowest p-8 rounded-2xl curated-shadow border border-white/50 min-h-[160px] flex flex-col justify-between">
               <p className="text-on-surface-variant text-[11px] font-bold uppercase tracking-widest">On Time</p>
               <div>
                <h2 className="text-4xl font-black tracking-tighter text-on-surface mb-1">98.4%</h2>
                <div className="flex items-center gap-1 text-[#493ee5] text-[10px] font-bold">
                  <span className="material-symbols-outlined text-xs">verified</span>
                  <span>Target met</span>
                </div>
               </div>
             </div>
             <div className="bg-surface-container-lowest p-8 rounded-2xl curated-shadow border border-white/50 min-h-[160px] flex flex-col justify-between">
               <p className="text-on-surface-variant text-[11px] font-bold uppercase tracking-widest">Delayed</p>
               <div>
                <h2 className="text-4xl font-black tracking-tighter text-error mb-1">{kpi.delayed.toLocaleString()}</h2>
                <div className="flex items-center gap-1 text-error text-[10px] font-bold">
                  <span className="material-symbols-outlined text-xs">warning</span>
                  <span>Critical action</span>
                </div>
               </div>
             </div>
          </div>

          {/* Revenue Forecast Visualizer (Increased padding and bar gap) */}
          <div className="mt-8 w-full bg-surface-container-lowest p-10 rounded-2xl curated-shadow border border-white/50">
            <div className="flex items-center justify-between mb-10">
              <div>
                <h3 className="text-sm font-black uppercase tracking-widest text-on-surface mb-1">Revenue Forecast</h3>
                <p className="text-3xl font-black tracking-tighter text-on-surface">
                  {formatCurrency(kpi.revenue)} <span className="text-[11px] font-bold text-on-surface-variant uppercase tracking-widest ml-2">USD Total Volume</span>
                </p>
              </div>
              <div className="flex bg-surface-container p-1 rounded-lg">
                <button className="px-5 py-2 text-xs font-bold rounded-md text-on-surface-variant hover:text-on-surface transition-colors">Daily</button>
                <button className="px-5 py-2 text-xs font-bold rounded-md bg-primary text-on-primary shadow-sm hover:opacity-90">Monthly</button>
              </div>
            </div>
            
            <div className="h-56 flex items-end justify-between gap-5 relative mt-6">
              {barData.map((data, idx) => {
                 const maxVal = Math.max(...barData.map(d => d.value));
                 const height = maxVal > 0 ? (data.value / maxVal) * 100 : 0;
                 return (
                   <div key={idx} className="flex-1 flex flex-col items-center gap-4 group bar-container relative h-full justify-end">
                     <div className="tooltip absolute -top-8 bg-inverse-surface text-inverse-on-surface text-[10px] font-bold px-2 py-1 rounded opacity-0 transition-all pointer-events-none whitespace-nowrap z-10">
                        {formatCurrency(data.value)}
                     </div>
                     <div className="w-full rounded-t-sm chart-bar" style={{ height: `${height}%` }}></div>
                     <span className="text-[11px] font-bold text-on-surface-variant">{data.name}</span>
                   </div>
                 );
              })}
            </div>
          </div>
        </div>

        {/* Tactical Panels (3 Column Enforced) */}
        <div className="col-span-12 lg:col-span-3 flex flex-col gap-8">
          <div className="bg-surface-container-lowest p-8 rounded-2xl curated-shadow border border-white/50 flex-1">
            <div className="flex items-center justify-between mb-8">
              <h4 className="text-sm font-black uppercase tracking-widest text-on-surface">Smart Alerts</h4>
              <span className="px-2 py-1 bg-error-container text-error text-[10px] font-black rounded uppercase tracking-widest">
                {alerts.length} ACTION REQ.
              </span>
            </div>
            <div className="space-y-8">
              {alerts.map((a, i) => (
                <div key={i} className="flex gap-5 group">
                  <div className={`w-[3px] h-12 ${a.type === 'risk' ? 'bg-error' : a.type === 'info' ? 'bg-primary' : 'bg-tertiary-container'} rounded-full transition-transform group-hover:scale-y-110`}></div>
                  <div>
                    <p className="text-[13px] font-bold text-on-surface tracking-tight">{a.title}</p>
                    <p className="text-[11px] text-on-surface-variant mt-1 leading-relaxed">{a.message}</p>
                    <button className="text-[10px] font-black text-primary mt-2 uppercase tracking-tighter hover:underline decoration-2">Reroute Shipment</button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-surface-container-low p-8 rounded-2xl curated-shadow border border-white/30">
            <h4 className="text-[11px] font-bold uppercase tracking-widest text-on-surface-variant mb-6">Weather Intelligence</h4>
            <div className="grid grid-cols-1 gap-4">
              {cityWeathers.map((w, idx) => (
                <div key={idx} className="bg-surface-container-lowest p-5 rounded-xl flex flex-col gap-2 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between">
                    <span className={`material-symbols-outlined ${w.riskLevel === 'high' || w.riskLevel === 'severe' ? 'text-error' : 'text-primary'} text-xl`}>
                      {w.condition === 'sunny' ? 'light_mode' : w.condition === 'storm' ? 'thunderstorm' : 'cloud'}
                    </span>
                    <span className="text-xs font-black">{w.tempC}°C</span>
                  </div>
                  <p className="text-[12px] font-bold text-on-surface">{w.city} Hub</p>
                  <p className={`text-[10px] ${w.riskLevel === 'high' || w.riskLevel === 'severe' ? 'text-error font-bold' : 'text-on-surface-variant'} uppercase tracking-tighter`}>
                    {w.condition === 'storm' ? 'Alert: Storm' : 'Clear Flow'}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Registry & Distribution Table (9+3 Grid Enforced) */}
      <section className="grid grid-cols-12 gap-8 mt-8">
        <div className="col-span-12 lg:col-span-9 bg-surface-container-lowest rounded-2xl curated-shadow border border-white/50 overflow-hidden">
          <div className="p-10 border-b border-surface-container">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-black uppercase tracking-widest text-on-surface">Recent Shipments</h4>
              <button className="text-[12px] font-bold text-primary flex items-center gap-1 hover:underline">
                View All Shipments <span className="material-symbols-outlined text-sm">chevron_right</span>
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-surface-container-low">
                  <th className="px-10 py-5 text-[10px] font-black text-on-surface-variant uppercase tracking-widest">Tracking ID</th>
                  <th className="px-10 py-5 text-[10px] font-black text-on-surface-variant uppercase tracking-widest">Destination</th>
                  <th className="px-10 py-5 text-[10px] font-black text-on-surface-variant uppercase tracking-widest">Status</th>
                  <th className="px-10 py-5 text-[10px] font-black text-on-surface-variant uppercase tracking-widest">ETA</th>
                  <th className="px-10 py-5 text-[10px] font-black text-on-surface-variant uppercase tracking-widest">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container">
                {shipments.slice(0, 5).map((s, i) => (
                  <tr key={i} onClick={() => setSelectedShipment(s)} className="hover:bg-surface-container-low flex-1 transition-colors cursor-pointer group">
                    <td className="px-10 py-8">
                      <p className="text-sm font-bold text-on-surface group-hover:text-primary transition-colors">#{s.shipment_code.split('-').pop()}</p>
                      <p className="text-[11px] text-on-surface-variant uppercase tracking-tight">{s.cargo_type}</p>
                    </td>
                    <td className="px-10 py-8">
                      <p className="text-sm font-bold text-on-surface uppercase tracking-tight">{s.destination}</p>
                      <p className="text-[11px] text-on-surface-variant uppercase tracking-tight">Active Terminal</p>
                    </td>
                    <td className="px-10 py-8">
                      <span className={`inline-flex items-center gap-2 px-4 py-2 ${
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
                    <td className="px-10 py-8">
                      <p className={`text-sm font-bold ${s.status === 'delayed' ? 'text-error' : 'text-on-surface'} tracking-tight`}>
                        {format(new Date(s.eta), 'MMM d, HH:mm')}
                      </p>
                    </td>
                    <td className="px-10 py-8">
                      <button className="w-10 h-10 rounded-lg flex items-center justify-center hover:bg-surface-container transition-all">
                        <span className="material-symbols-outlined text-xl text-on-surface-variant">more_vert</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Transport Breakdown Chart (Center value fix & stroke matching) */}
        <div className="col-span-12 lg:col-span-3 flex flex-col gap-8">
          <div className="bg-surface-container-lowest p-10 rounded-2xl curated-shadow border border-white/50 flex-1 flex flex-col group overflow-hidden relative">
            <h4 className="text-sm font-black uppercase tracking-widest text-on-surface mb-10">Transport Breakdown</h4>
            <div className="relative w-56 h-56 mx-auto mb-10 transition-transform duration-1000 group-hover:scale-105">
              <svg className="w-full h-full transform -rotate-90 shadow-sm rounded-full" viewBox="0 0 100 100">
                <circle cx="50" cy="50" fill="transparent" r="38" stroke="#eceef0" strokeWidth="14" />
                <circle cx="50" cy="50" fill="transparent" r="38" stroke="#493ee5" 
                        strokeDasharray="238.64" strokeDashoffset={238.64 * (1 - seaPercent/100)} 
                        strokeWidth="14" className="transition-all duration-1000" />
                <circle cx="50" cy="50" fill="transparent" r="38" stroke="#635bff" 
                        strokeDasharray="238.64" strokeDashoffset={238.64 * (1 - (seaPercent + airPercent)/100)} 
                        strokeWidth="14" className="transition-all duration-1000" />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <p className="text-4xl font-black text-on-surface tracking-tighter">{Math.max(1, Math.round(shipments.length/1000))}k</p>
                <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Units</p>
              </div>
            </div>
            <div className="space-y-5">
              <div className="flex items-center justify-between group/row cursor-default">
                <div className="flex items-center gap-3">
                  <span className="w-3.5 h-3.5 rounded-full bg-primary shadow-sm" />
                  <span className="text-sm font-bold text-on-surface group-hover/row:text-primary transition-colors">Sea Freight</span>
                </div>
                <span className="text-sm font-black text-on-surface">{seaPercent}%</span>
              </div>
              <div className="flex items-center justify-between group/row cursor-default">
                <div className="flex items-center gap-3">
                  <span className="w-3.5 h-3.5 rounded-full bg-primary-container shadow-sm" />
                  <span className="text-sm font-bold text-on-surface group-hover/row:text-primary transition-colors">Air Express</span>
                </div>
                <span className="text-sm font-black text-on-surface">{airPercent}%</span>
              </div>
              <div className="flex items-center justify-between group/row cursor-default">
                <div className="flex items-center gap-3">
                  <span className="w-3.5 h-3.5 rounded-full bg-surface-variant shadow-sm" />
                  <span className="text-sm font-bold text-on-surface group-hover/row:text-primary transition-colors">Road Transit</span>
                </div>
                <span className="text-sm font-black text-on-surface">{roadPercent}%</span>
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
