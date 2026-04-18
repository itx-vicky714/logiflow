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

import { useRouter } from 'next/navigation';

const ShipmentDetailModal = dynamic(() => import('@/components/ShipmentDetailModal'), { ssr: false });

const HIGH_RISK_THRESHOLD = 70;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Memoized KPI Component to prevent re-renders durante initial hydration
const KPICard = React.memo(({ title, value, change, icon, iconColor, isError }: { 
  title: string; value: string | number; change: string; icon: string; iconColor: string; isError?: boolean 
}) => (
  <div className="bg-surface-container-lowest p-8 rounded-3xl curated-shadow border border-white/60 min-h-[170px] flex flex-col justify-between group hover:border-primary/20 transition-all">
    <p className="text-on-surface-variant text-[11px] font-bold uppercase tracking-widest leading-none">{title}</p>
    <div>
      <h2 className={`text-4xl font-bold tracking-tighter ${isError ? 'text-error' : 'text-on-surface'} mb-1`}>{value}</h2>
      <div className={`flex items-center gap-1 ${isError ? 'text-error' : 'text-[#493ee5]'} text-[10px] font-bold`}>
        <span className="material-symbols-outlined text-xs">{icon}</span>
        <span>{change}</span>
      </div>
    </div>
  </div>
));

export default function DashboardPage() {
  const router = useRouter();
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [kpi, setKpi] = useState<KPIData>({
    total: 0, inTransit: 0, onTime: 0, delayed: 0, atRisk: 0, avgRisk: 0, revenue: 0
  });
  const [selectedShipment, setSelectedShipment] = useState<Shipment | null>(null);
  const [dbAlerts, setDbAlerts] = useState<any[]>([]);

  const fetchData = useCallback(async () => {
    const performHeavyLogic = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      sessionStorage.setItem('logiflow_user', JSON.stringify(user));
      
      // Seed shipments in background
      await seedShipments(user.id);
      
      const { data } = await supabase
        .from('shipments').select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
        
      if (data) {
        // BREAK UP DATA PARSING (Long Task Mitigation)
        setTimeout(() => {
          const total      = data.length;
          const inTransit  = data.filter(s => s.status === 'in_transit').length;
          const onTime     = data.filter(s => s.status === 'on_time' || s.status === 'delivered').length;
          const delayed    = data.filter(s => s.status === 'delayed').length;
          const atRisk     = data.filter(s => s.risk_score >= HIGH_RISK_THRESHOLD).length;
          const avgRisk    = total > 0 ? Math.round(data.reduce((a, b) => a + b.risk_score, 0) / total) : 0;
          const revenue    = data
            .filter(s => s.status === 'delivered' || s.status === 'on_time' || s.status === 'in_transit')
            .reduce((sum, s) => sum + estimateRevenue(s), 0);
          
          const newKpi = { total, inTransit, onTime, delayed, atRisk, avgRisk, revenue };
          setKpi(newKpi);
          setShipments(data);
          sessionStorage.setItem('logiflow_kpi', JSON.stringify(newKpi));
        }, 0);
      }

      const { data: alertsData } = await supabase
        .from('notifications').select('*')
        .eq('user_id', user.id)
        .eq('is_read', false)
        .order('created_at', { ascending: false });
      if (alertsData) setDbAlerts(alertsData);
      setLoading(false);
    };

    const cachedKpi = sessionStorage.getItem('logiflow_kpi');
    if (cachedKpi) {
       setKpi(JSON.parse(cachedKpi));
       setLoading(false);
    }

    if ('requestIdleCallback' in window) {
       (window as any).requestIdleCallback(() => performHeavyLogic());
    } else {
       setTimeout(performHeavyLogic, 0);
    }
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
    const monthShipments = shipments.filter(s => {
      const date = new Date(s.created_at || s.eta);
      return date.getMonth() === i;
    });
    const monthlyRevenue = monthShipments.reduce((sum, s) => sum + estimateRevenue(s), 0);
    return { name: m, value: monthlyRevenue };
  });

  const seaPercent = Math.round(((modeCounts['sea'] || 0) / Math.max(1, shipments.length)) * 100) || 45;
  const airPercent = Math.round(((modeCounts['air'] || 0) / Math.max(1, shipments.length)) * 100) || 32;
  const roadPercent = Math.round(((modeCounts['road'] || 0) / Math.max(1, shipments.length)) * 100) || 23;

  const alerts = dbAlerts.length > 0 ? dbAlerts.slice(0, 3) : [];

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="status-pulse bg-primary w-12 h-12"></div>
    </div>
  );

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-1000">
      
      {/* Top Section: Dashboard KPIs & Sidebar Panels (9+3 Enforced) */}
      <section className="grid grid-cols-12 gap-10 mt-10 mb-6">
        <div className="col-span-12 lg:col-span-9">
          {/* KPI Cards Row (Increased Spacing & Width) */}
          <div className="grid grid-cols-4 gap-10">
             <KPICard title="Total Shipments" value={kpi.total.toLocaleString()} change="+14.2%" icon="trending_up" iconColor="#493ee5" />
             <KPICard title="In Transit" value={kpi.inTransit.toLocaleString()} change="Active now" icon="sync" iconColor="on-surface-variant" />
             <KPICard title="On Time" value="98.4%" change="Target met" icon="verified" iconColor="#493ee5" />
             <KPICard title="Delayed" value={kpi.delayed.toLocaleString()} change="Critical action" icon="warning" iconColor="error" isError />
          </div>

          {/* Revenue Graph Area (Increased bar gap and container padding) */}
          <div className="mt-10 w-full bg-surface-container-lowest p-12 rounded-3xl curated-shadow border border-white/60">
            <div className="flex items-center justify-between mb-12">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-widest text-on-surface mb-1">Revenue Forecast</h3>
                <p className="text-3xl font-bold tracking-tighter text-on-surface">
                  {formatCurrency(kpi.revenue)} <span className="text-[11px] font-bold text-on-surface-variant uppercase tracking-widest ml-2">USD Total Volume</span>
                </p>
              </div>
              <div className="flex bg-surface-container p-1 rounded-xl">
                <button className="px-6 py-2.5 text-[11px] font-bold rounded-lg text-on-surface-variant hover:text-on-surface transition-colors">Daily</button>
                <button className="px-6 py-2.5 text-[11px] font-bold rounded-lg bg-primary text-on-primary shadow-sm hover:opacity-90 transition-all">Monthly</button>
              </div>
            </div>
            
            <div className="h-64 flex items-end justify-between gap-6 relative mt-6">
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
        <div className="col-span-12 lg:col-span-3 flex flex-col gap-10">
          <div className="bg-surface-container-lowest p-10 rounded-3xl curated-shadow border border-white/60 flex-1">
            <div className="flex items-center justify-between mb-10">
              <h4 className="text-sm font-bold uppercase tracking-widest text-on-surface">Smart Alerts</h4>
              <span className="px-2 py-1 bg-error-container text-error text-[10px] font-bold rounded uppercase tracking-widest">
                {alerts.length} ACTION REQ.
              </span>
            </div>
            <div className="space-y-10">
              {alerts.length > 0 ? alerts.map((a, i) => (
                <div key={i} className="flex gap-6 group">
                  <div className={`w-[3px] h-12 ${a.type === 'risk' || a.type === 'delay' ? 'bg-error' : a.type === 'info' ? 'bg-primary' : 'bg-tertiary-container'} rounded-full transition-transform group-hover:scale-y-125`}></div>
                  <div>
                    <p className="text-[13px] font-semibold text-on-surface tracking-tight leading-none uppercase">{a.title}</p>
                    <p className="text-[11px] text-on-surface-variant mt-2 leading-relaxed font-medium">{a.message}</p>
                    <button className="text-[10px] font-bold text-primary mt-3 uppercase tracking-tighter hover:underline decoration-1 underline-offset-4">Details Protocol</button>
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

          <div className="bg-surface-container-low p-10 rounded-3xl curated-shadow border border-white/40">
            <h4 className="text-[11px] font-bold uppercase tracking-widest text-on-surface-variant mb-6">Weather Intelligence</h4>
            <div className="grid grid-cols-2 gap-4">
              {cityWeathers.map((w, idx) => (
                <div key={idx} className="bg-surface-container-lowest p-6 rounded-2xl flex flex-col gap-3 hover:shadow-lg transition-all border border-white/50">
                  <div className="flex items-center justify-between">
                    <span className={`material-symbols-outlined ${w.riskLevel === 'high' || w.riskLevel === 'severe' ? 'text-error' : 'text-primary'} text-2xl`}>
                      {w.condition === 'sunny' ? 'light_mode' : w.condition === 'storm' ? 'thunderstorm' : 'cloud'}
                    </span>
                    <span className="text-[13px] font-bold">{w.tempC}°C</span>
                  </div>
                  <div>
                    <p className="text-[12px] font-bold text-on-surface leading-none">{w.city}</p>
                    <p className={`text-[10px] mt-1 ${w.riskLevel === 'high' || w.riskLevel === 'severe' ? 'text-error font-bold' : 'text-on-surface-variant'} uppercase tracking-tighter`}>
                      {w.condition === 'storm' ? 'Alert: Storm' : 'Clear Flow'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Bottom Section: Operations Registry & Transport Modal (9+3 Enforced) */}
      <section className="grid grid-cols-12 gap-10">
        <div className="col-span-12 lg:col-span-9 bg-surface-container-lowest rounded-3xl curated-shadow border border-white/60 overflow-hidden" style={{ contentVisibility: 'auto', containIntrinsicSize: '0 500px' }}>
          <div className="p-12 border-b border-surface-container">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold uppercase tracking-widest text-on-surface">Recent Shipments</h4>
              <button 
                onClick={() => router.push('/shipments')}
                className="text-[12px] font-bold text-primary flex items-center gap-1 hover:underline decoration-1 underline-offset-4"
              >
                View Expanded Fleet <span className="material-symbols-outlined text-sm">chevron_right</span>
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-low/50">
                  <th className="px-12 py-8 text-[11px] font-bold text-on-surface-variant uppercase tracking-[0.1em]">Operational ID</th>
                  <th className="px-12 py-8 text-[11px] font-bold text-on-surface-variant uppercase tracking-[0.1em]">Target Terminal</th>
                  <th className="px-12 py-8 text-[11px] font-bold text-on-surface-variant uppercase tracking-[0.1em]">Tactical Status</th>
                  <th className="px-12 py-8 text-[11px] font-bold text-on-surface-variant uppercase tracking-[0.1em]">Registry ETA</th>
                  <th className="px-12 py-8 text-[11px] font-bold text-on-surface-variant uppercase tracking-[0.1em]">Terminal Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container">
                {shipments.slice(0, 5).map((s, i) => (
                  <tr key={i} onClick={() => setSelectedShipment(s)} className="hover:bg-surface-container-low transition-colors cursor-pointer group">
                    <td className="px-12 py-10">
                      <p className="text-sm font-semibold text-on-surface group-hover:text-primary transition-colors">#{s.shipment_code.split('-').pop()}</p>
                      <p className="text-[11px] text-on-surface-variant uppercase mt-1 tracking-tight font-medium">{s.cargo_type}</p>
                    </td>
                    <td className="px-12 py-10">
                      <p className="text-sm font-semibold text-on-surface uppercase tracking-tight">{s.destination}</p>
                      <p className="text-[11px] text-on-surface-variant uppercase mt-1 tracking-tight font-medium">Clearance Zone A</p>
                    </td>
                    <td className="px-12 py-10">
                      <span className={`inline-flex items-center gap-2 px-5 py-2.5 ${
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
                    <td className="px-12 py-10">
                      <p className={`text-sm font-semibold ${s.status === 'delayed' ? 'text-error' : 'text-on-surface'} tracking-tight`}>
                        {format(new Date(s.eta), 'MMM d, HH:mm')}
                      </p>
                    </td>
                    <td className="px-12 py-10">
                      <button className="w-12 h-12 rounded-xl flex items-center justify-center hover:bg-surface-container transition-all group-hover:bg-white shadow-sm">
                        <span className="material-symbols-outlined text-2xl text-on-surface-variant">more_vert</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Transport Breakdown Area */}
        <div className="col-span-12 lg:col-span-3 flex flex-col gap-10" style={{ contentVisibility: 'auto', containIntrinsicSize: '0 400px' }}>
          <div className="bg-surface-container-lowest p-12 rounded-3xl curated-shadow border border-white/60 flex-1 flex flex-col group overflow-hidden relative">
            <h4 className="text-sm font-bold uppercase tracking-widest text-on-surface mb-12">Logistics Distribution</h4>
            <div className="relative w-48 h-48 mx-auto mb-12 transition-transform duration-1000 group-hover:scale-105">
              <svg className="w-full h-full transform -rotate-90 rounded-full" viewBox="0 0 100 100">
                <circle cx="50" cy="50" fill="transparent" r="40" stroke="#f2f4f6" strokeWidth="12" />
                <circle cx="50" cy="50" fill="transparent" r="40" stroke="#493ee5" 
                        strokeDasharray="251.2" strokeDashoffset={251.2 * (1 - seaPercent/100)} 
                        strokeWidth="12" className="transition-all duration-1000" />
                <circle cx="50" cy="50" fill="transparent" r="40" stroke="#635bff" 
                        strokeDasharray="251.2" strokeDashoffset={251.2 * (1 - (seaPercent + airPercent)/100)} 
                        strokeWidth="12" className="transition-all duration-1000" />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <p className="text-3xl font-bold text-on-surface tracking-tighter italic">{Math.max(1, Math.round(shipments.length/1000))}k</p>
                <p className="text-[9px] font-bold text-on-surface-variant uppercase tracking-widest">Units</p>
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
