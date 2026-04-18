"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import {
  seedShipments, modeIcon, riskColor,
  estimateRevenue, formatCurrency
} from '@/lib/utils';
import { getCityWeather, KEY_CITIES } from '@/lib/weather';
import type { Shipment, KPIData } from '@/types';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip
} from 'recharts';
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

  const modeChartData = [
    { name: 'Sea Freight', value: modeCounts['sea'] || 0, color: '#493ee5' },
    { name: 'Air Express', value: modeCounts['air'] || 0, color: '#635bff' },
    { name: 'Road Transit', value: modeCounts['road'] || 0, color: '#e0e3e5' },
  ].filter(d => d.value > 0);

  const barData = MONTHS.map((m, i) => {
    const weights = [0.05, 0.08, 0.06, 0.09, 0.07, 0.1, 0.04, 0.12, 0.08, 0.11, 0.1, 0.1];
    return { name: m, value: Math.round(kpi.revenue * weights[i]) };
  });

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="status-pulse bg-primary w-12 h-12"></div>
    </div>
  );

  return (
    <div className="font-['Inter'] antialiased tracking-tight text-[#191c1e] animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* Hero Section: High-End Metrics */}
      <section className="grid grid-cols-12 gap-6 mb-6 mt-6">
        <div className="col-span-12 lg:col-span-8">
          <div className="grid grid-cols-4 gap-6">
            {[
              { label: 'Total Shipments', value: kpi.total.toLocaleString(), trend: '+14.2%', icon: 'trending_up', color: 'primary' },
              { label: 'In Transit', value: kpi.inTransit.toLocaleString(), detail: 'Active now', icon: 'sync', color: 'on-surface-variant' },
              { label: 'On Time', value: '98.4%', detail: 'Target met', icon: 'verified', color: 'primary' },
              { label: 'Delayed', value: kpi.delayed.toLocaleString(), trend: 'Critical action', icon: 'warning', color: 'error' },
            ].map((item, i) => (
              <div key={i} className="bg-surface-container-lowest p-6 rounded-2xl curated-shadow border border-white/50">
                <p className="text-on-surface-variant text-[11px] font-bold uppercase tracking-widest mb-4">{item.label}</p>
                <h2 className={`text-3xl font-black tracking-tighter ${item.color === 'error' ? 'text-error' : 'text-on-surface'} mb-1`}>{item.value}</h2>
                <div className={`flex items-center gap-1 ${item.color === 'error' ? 'text-error' : 'text-primary'} text-[10px] font-bold`}>
                  <span className="material-symbols-outlined text-xs">{item.icon}</span>
                  <span>{item.trend || item.detail}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Revenue Forecast Visualizer */}
          <div className="mt-6 w-full bg-surface-container-lowest p-8 rounded-2xl curated-shadow border border-white/50">
            <div className="flex items-center justify-between mb-10">
              <div>
                <h3 className="text-sm font-black uppercase tracking-widest text-on-surface mb-1">Revenue Forecast</h3>
                <p className="text-2xl font-black tracking-tighter text-on-surface">
                  {formatCurrency(kpi.revenue)} <span className="text-[11px] font-bold text-on-surface-variant uppercase tracking-widest ml-2">USD Terminal Volume</span>
                </p>
              </div>
              <div className="flex bg-surface-container p-1 rounded-xl">
                 <button className="px-5 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg text-on-surface-variant hover:text-on-surface transition-all">Daily</button>
                 <button className="px-5 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg bg-primary text-on-primary shadow-lg shadow-primary/20 transition-all">Monthly</button>
              </div>
            </div>
            
            <div className="h-48 flex items-end justify-between gap-4 relative mt-6 px-1">
              {barData.map((data, idx) => {
                const maxVal = Math.max(...barData.map(d => d.value));
                const height = maxVal > 0 ? (data.value / maxVal) * 100 : 0;
                return (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-4 group bar-container relative h-full justify-end">
                    <div className="tooltip absolute -top-10 bg-on-surface text-inverse-on-surface text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg opacity-0 transition-all pointer-events-none whitespace-nowrap z-10 shadow-xl">
                      {formatCurrency(data.value)}
                    </div>
                    <div className="w-full rounded-t-lg chart-bar relative overflow-hidden" style={{ height: `${height}%` }}>
                       <div className="absolute inset-0 bg-gradient-to-t from-white/10 to-transparent opacity-30"></div>
                    </div>
                    <span className="text-[10px] font-black text-on-surface-variant uppercase tracking-tighter opacity-50 group-hover:opacity-100 transition-opacity">{data.name}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Tactical Alerts & Intelligence */}
        <div className="col-span-12 lg:col-span-4 flex flex-col gap-6">
          <div className="bg-surface-container-lowest p-8 rounded-2xl curated-shadow border border-white/50 flex-1">
            <div className="flex items-center justify-between mb-8">
              <h4 className="text-sm font-black uppercase tracking-widest text-on-surface italic">Smart Alerts</h4>
              {dbAlerts.length > 0 && (
                <span className="px-3 py-1 bg-error-container text-error text-[10px] font-black rounded uppercase tracking-widest">
                  {dbAlerts.length} Action Req.
                </span>
              )}
            </div>
            <div className="space-y-8">
              {dbAlerts.length > 0 ? dbAlerts.slice(0, 3).map((a, i) => (
                <div key={i} className="flex gap-5 group">
                  <div className={`w-1.5 h-14 ${a.type === 'risk' ? 'bg-error' : 'bg-primary'} rounded-full transition-transform group-hover:scale-y-110`}></div>
                  <div className="flex-1">
                    <p className="text-xs font-black text-on-surface uppercase tracking-tight mb-1">{a.title}</p>
                    <p className="text-[11px] font-bold text-on-surface-variant leading-relaxed line-clamp-2 italic">{a.message}</p>
                    <button className="text-[10px] font-black text-primary mt-3 uppercase tracking-widest hover:underline decoration-2">Reroute Critical Node</button>
                  </div>
                </div>
              )) : (
                <div className="flex flex-col items-center justify-center h-48 text-center bg-surface-container-low/30 rounded-2xl border border-dashed border-outline-variant/30">
                   <span className="material-symbols-outlined text-outline-variant text-4xl mb-3 opacity-30">notifications_off</span>
                   <p className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest">Operational Silence</p>
                </div>
              )}
            </div>
          </div>

          <div className="bg-surface-container-low/50 p-6 rounded-2xl curated-shadow border border-white/30 backdrop-blur-sm">
            <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-on-surface-variant mb-5 ml-1">Weather Stratos Intelligence</h4>
            <div className="grid grid-cols-2 gap-4">
              {cityWeathers.map((w, idx) => (
                <div key={idx} className="bg-surface-container-lowest p-5 rounded-xl flex flex-col gap-3 shadow-sm border border-white/50 hover:-translate-y-1 transition-transform">
                  <div className="flex items-center justify-between">
                    <span className={`material-symbols-outlined ${w.riskLevel === 'high' || w.riskLevel === 'severe' ? 'text-error' : 'text-primary'} text-[22px]`}>
                      {w.condition === 'sunny' ? 'light_mode' : w.condition === 'storm' ? 'thunderstorm' : 'cloud'}
                    </span>
                    <span className="text-sm font-black text-on-surface tracking-tighter">{w.tempC}°C</span>
                  </div>
                  <div>
                    <p className="text-[11px] font-black text-on-surface uppercase tracking-tight mb-0.5">{w.city} Hub</p>
                    <p className={`text-[9px] ${w.riskLevel === 'high' || w.riskLevel === 'severe' ? 'text-error animate-pulse' : 'text-on-surface-variant'} font-black uppercase tracking-widest`}>
                      {w.riskLevel === 'high' || w.riskLevel === 'severe' ? `Critical: ${w.condition.replace('_', ' ')}` : w.condition.replace('_', ' ')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Terminal Grid: Tables & Breakdown */}
      <section className="grid grid-cols-12 gap-8">
        <div className="col-span-12 lg:col-span-8 bg-surface-container-lowest rounded-[2.5rem] curated-shadow border border-white/50 overflow-hidden transition-all duration-500">
          <div className="p-10 border-b border-surface-container/50 bg-surface-container-low/20">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-black uppercase tracking-[0.2em] text-on-surface italic">Operational Registry</h4>
              <button onClick={() => fetchData()} className="text-[10px] font-black text-primary uppercase tracking-widest flex items-center gap-2 hover:opacity-80 active:scale-95 transition-all">
                Audit Entire Manifest <span className="material-symbols-outlined text-[16px]">east</span>
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-surface-container-low/50">
                  <th className="px-10 py-5 text-[10px] font-black text-on-surface-variant uppercase tracking-widest">Protocol ID</th>
                  <th className="px-10 py-5 text-[10px] font-black text-on-surface-variant uppercase tracking-widest">Strategic Node</th>
                  <th className="px-10 py-5 text-[10px] font-black text-on-surface-variant uppercase tracking-widest text-center">Status</th>
                  <th className="px-10 py-5 text-[10px] font-black text-on-surface-variant uppercase tracking-widest">Arrival Target</th>
                  <th className="px-10 py-5 text-[10px] font-black text-on-surface-variant uppercase tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container">
                {shipments.slice(0, 5).map((s, i) => (
                  <tr key={i} onClick={() => setSelectedShipment(s)} className="hover:bg-surface-container-low/30 transition-all cursor-pointer group">
                    <td className="px-10 py-7">
                      <p className="text-[13px] font-black text-on-surface tracking-tighter group-hover:text-primary transition-colors font-mono italic">#{s.shipment_code.split('-').pop()}</p>
                      <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mt-1 opacity-50">{s.cargo_type}</p>
                    </td>
                    <td className="px-10 py-7">
                      <p className="text-[13px] font-black text-on-surface tracking-tight uppercase leading-none mb-1">{s.destination}</p>
                      <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest opacity-40">Gateway Terminal Active</p>
                    </td>
                    <td className="px-10 py-7 text-center">
                      <span className={`inline-flex items-center gap-2 px-4 py-1.5 ${
                        s.status === 'delayed' ? 'bg-error-container text-error' : 
                        s.status === 'pending' ? 'bg-surface-container-highest text-on-surface-variant' :
                        'bg-primary-fixed text-on-primary-fixed-variant'
                      } text-[10px] font-black rounded-full uppercase tracking-widest border border-white`}>
                        <span className={`w-2 h-2 ${
                          s.status === 'delayed' ? 'bg-error' : 
                          s.status === 'pending' ? 'bg-outline' : 
                          'bg-primary'
                        } rounded-full status-pulse`}></span>
                        {s.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-10 py-7">
                      <p className={`text-[13px] font-black ${s.status === 'delayed' ? 'text-error' : 'text-on-surface'} tracking-tighter italic`}>
                        {format(new Date(s.eta), 'MMM d, HH:mm')}
                      </p>
                    </td>
                    <td className="px-10 py-7 text-right">
                      <button className="w-10 h-10 rounded-xl inline-flex items-center justify-center hover:bg-surface-container-low transition-all group-hover:scale-110">
                        <span className="material-symbols-outlined text-[20px] text-on-surface-variant">open_in_new</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="col-span-12 lg:col-span-4 flex flex-col gap-6">
          <div className="bg-surface-container-lowest p-10 rounded-[2.5rem] curated-shadow border border-white/50 flex-1 flex flex-col items-center relative overflow-hidden group">
            <span className="material-symbols-outlined absolute -right-6 -bottom-6 text-[120px] opacity-[0.03] rotate-12 transition-transform duration-1000 group-hover:scale-125">hub</span>
            <h4 className="w-full text-sm font-black uppercase tracking-[0.2em] text-on-surface mb-10 italic">Vector Distribution</h4>
            
            <div className="relative w-56 h-56 mx-auto mb-10">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie 
                    data={modeChartData} 
                    cx="50%" cy="50%" 
                    innerRadius={75} outerRadius={95} 
                    paddingAngle={8} dataKey="value" stroke="none"
                    animationBegin={200} animationDuration={1000}
                  >
                    {modeChartData.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Pie>
                  <RechartsTooltip contentStyle={{ borderRadius: '16px', border: 'none', fontSize: '11px', fontWeight: 900, textTransform: 'uppercase', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <p className="text-4xl font-black text-on-surface tracking-tighter italic">{shipments.length}</p>
                <p className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest opacity-30 mt-1">Total Nodes</p>
              </div>
            </div>
            
            <div className="w-full space-y-5">
              {modeChartData.map((d, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-2xl hover:bg-surface-container-low transition-colors">
                  <div className="flex items-center gap-4">
                    <span className="w-4 h-4 rounded-lg shadow-sm" style={{ backgroundColor: d.color }}></span>
                    <span className="text-[12px] font-black text-on-surface uppercase tracking-tight italic">{d.name}</span>
                  </div>
                  <span className="text-[12px] font-black text-primary bg-primary-fixed px-3 py-1 rounded-lg">
                    {Math.round((d.value / Math.max(1, shipments.length)) * 100)}%
                  </span>
                </div>
              ))}
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
