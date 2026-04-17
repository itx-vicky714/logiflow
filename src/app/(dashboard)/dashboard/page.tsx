"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { seedShipments, statusConfig, modeIcon, riskColor, riskBg, estimateRevenue, formatCurrency } from '@/lib/utils';
import { getCityWeather, getRouteWeatherRisk, KEY_CITIES, getWeatherRiskColor, getWeatherRiskBadge } from '@/lib/weather';
import type { Shipment, KPIData } from '@/types';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import {
  Package, Truck, CheckCircle, AlertTriangle, ShieldAlert, IndianRupee,
  TrendingUp, Eye, Cloud, X, GitBranch, RefreshCw, Loader2, Activity
} from 'lucide-react';
import dynamic from 'next/dynamic';
import { format } from 'date-fns';
import { toast } from 'sonner';

const ShipmentDetailModal = dynamic(() => import('@/components/ShipmentDetailModal'), { ssr: false });

// Removed local buildAlerts in favor of Supabase notifications

export default function DashboardPage() {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [kpi, setKpi] = useState<KPIData>({ total: 0, inTransit: 0, onTime: 0, delayed: 0, atRisk: 0, avgRisk: 0, revenue: 0 });
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
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

  const handleSimulateAlerts = async () => {
    if (shipments.length === 0) return toast.info('No shipments to analyze');
    setSimulating(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    
    const now = new Date();
    const newAlerts: {
      user_id: string; type: string; severity: string; title: string;
      message: string; cause: string; recommended_action: string;
      shipment: string; status: string;
    }[] = [];
    
    shipments.forEach(s => {
      const eta = new Date(s.eta);
      const hoursToEta = (eta.getTime() - now.getTime()) / 3600000;
      const weatherRisk = getRouteWeatherRisk(s.origin, s.destination);

      if (s.status === 'delayed') {
        newAlerts.push({ user_id: user.id, type: 'delay', severity: 'high', title: `Delay on ${s.shipment_code}`, message: `⚠️ ${s.shipment_code} delayed: ${s.origin} → ${s.destination}`, cause: `Risk score: ${s.risk_score}. Check for route issues.`, recommended_action: 'reroute', shipment: s.shipment_code, status: 'active' });
      }
      if (s.risk_score > 80 && s.status !== 'delivered') {
        newAlerts.push({ user_id: user.id, type: 'risk', severity: 'critical', title: `Critical Risk: ${s.shipment_code}`, message: `🔴 Risk score ${s.risk_score}/100`, cause: `${s.mode} mode, ${s.cargo_type} cargo. Requires review.`, recommended_action: 'assign driver', shipment: s.shipment_code, status: 'active' });
      }
      if (weatherRisk.overallRisk > 60 && s.status === 'in_transit') {
        newAlerts.push({ user_id: user.id, type: 'weather', severity: 'medium', title: `Weather: ${weatherRisk.primaryHazard}`, message: `🌧️ Route ${s.origin} → ${s.destination}`, cause: weatherRisk.recommendation, recommended_action: 'acknowledge', shipment: s.shipment_code, status: 'active' });
      }
      if (hoursToEta > 0 && hoursToEta < 24 && s.status === 'in_transit') {
        newAlerts.push({ user_id: user.id, type: 'info', severity: 'low', title: `Approaching ETA`, message: `⏰ ${s.shipment_code} arriving ${Math.round(hoursToEta)}h`, cause: 'Prepare receiving dock.', recommended_action: 'dismiss informational', shipment: s.shipment_code, status: 'active' });
      }
    });

    if (newAlerts.length > 0) {
      // Clear old unread first to avoid spam
      await supabase.from('notifications').update({ is_read: true }).eq('user_id', user.id).eq('is_read', false);
      await supabase.from('notifications').insert(newAlerts.slice(0, 4));
      toast.success(`Generated ${Math.min(4, newAlerts.length)} deterministic alerts.`);
      fetchData();
    } else {
      toast.info('All nominal. No alert triggers matched.');
    }
    setSimulating(false);
  };

  const handleResolveDbAlert = async (alert: { id: string; recommended_action?: string; shipment?: string }) => {
    setSimulating(true); // just use this for loading state
    try {
      if (alert.recommended_action === 'reroute') {
        const s = shipments.find(sh => sh.shipment_code === alert.shipment);
        if (s && s.mode === 'road') {
          await supabase.from('shipments').update({ mode: 'rail', notes: 'Auto-rerouted via alert' }).eq('shipment_code', alert.shipment);
          toast.success('Rerouted to Rail successfully');
        } else {
          toast.success('Reroute suggestion applied');
        }
      } else if (alert.recommended_action === 'acknowledge') {
        toast.success('Alert acknowledged');
      } else if (alert.recommended_action === 'assign driver') {
        toast.success('Driver assigned via alert');
      } else if (alert.recommended_action === 'dismiss informational') {
        toast.success('Alert dismissed');
      } else {
        toast.success('Action executed');
      }
      
      await supabase.from('notifications').update({ is_read: true, status: 'resolved', resolved_at: new Date().toISOString() }).eq('id', alert.id);
      await fetchData();
    } catch {
      toast.error('Action failed');
    } finally {
      setSimulating(false);
    }
  };

  // City weather for widget
  const cityWeathers = KEY_CITIES.slice(0, 6).map(getCityWeather);

  const filteredShipments = shipments.filter(s => {
    const matchSearch = !search ||
      s.shipment_code.toLowerCase().includes(search.toLowerCase()) ||
      s.origin.toLowerCase().includes(search.toLowerCase()) ||
      s.destination.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || s.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const modeChartData = (['road', 'rail', 'air', 'sea'] as const).map(m => ({
    name: m.charAt(0).toUpperCase() + m.slice(1),
    value: shipments.filter(s => s.mode === m).length,
    color: m === 'road' ? '#f97316' : m === 'rail' ? '#3b82f6' : m === 'air' ? '#8b5cf6' : '#14b8a6'
  })).filter(d => d.value > 0);

  const kpiCards = [
    { label: 'Total Shipments', icon: Package,       value: String(kpi.total),            gradient: 'from-slate-600 to-slate-800',    bg: 'bg-slate-100',    iconColor: 'text-slate-700',  barColor: 'bg-slate-400',    borderColor: 'border-t-slate-400' },
    { label: 'In Transit',      icon: Truck,          value: String(kpi.inTransit),       gradient: 'from-blue-600 to-indigo-700',    bg: 'bg-blue-50',      iconColor: 'text-blue-600',   barColor: 'bg-blue-500',     borderColor: 'border-t-blue-500' },
    { label: 'On Time',         icon: CheckCircle,    value: String(kpi.onTime),          gradient: 'from-emerald-500 to-green-700',  bg: 'bg-emerald-50',   iconColor: 'text-emerald-600',barColor: 'bg-emerald-500',  borderColor: 'border-t-emerald-500' },
    { label: 'Delayed',         icon: AlertTriangle,  value: String(kpi.delayed),         gradient: 'from-red-500 to-rose-700',       bg: 'bg-red-50',       iconColor: 'text-red-600',    barColor: 'bg-red-500',      borderColor: 'border-t-red-500' },
    { label: 'At Risk',         icon: ShieldAlert,    value: String(kpi.atRisk),          gradient: 'from-amber-500 to-orange-600',   bg: 'bg-amber-50',     iconColor: 'text-amber-600',  barColor: 'bg-amber-500',    borderColor: 'border-t-amber-500' },
    { label: 'Revenue',         icon: IndianRupee,    value: formatCurrency(kpi.revenue), gradient: 'from-emerald-500 to-teal-700',   bg: 'bg-teal-50',      iconColor: 'text-teal-700',   barColor: 'bg-teal-500',     borderColor: 'border-t-teal-500' },
  ];

  const alertSeverityStyle: Record<string, string> = {
    critical: 'bg-red-50 border-red-200',
    high:     'bg-orange-50 border-orange-200',
    medium:   'bg-amber-50 border-amber-200',
    low:      'bg-blue-50 border-blue-100',
  };

  const alertTextStyle: Record<string, { title: string; cause: string }> = {
    critical: { title: 'text-red-700',    cause: 'text-red-600' },
    high:     { title: 'text-orange-700', cause: 'text-orange-600' },
    medium:   { title: 'text-amber-700',  cause: 'text-amber-600' },
    low:      { title: 'text-blue-700',   cause: 'text-blue-600' },
  };

  if (loading) return (
    <div className="space-y-5">
      <div className="h-8 w-48 bg-slate-200 rounded animate-pulse" />
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {Array.from({length:6}).map((_,i)=><div key={i} className="h-24 bg-white border border-border rounded-xl animate-pulse"/>)}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/40 backdrop-blur-xl p-6 rounded-[24px] border border-slate-200/60 shadow-sm">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight leading-none">Control Tower</h1>
          <p className="text-[11px] font-black text-slate-400 mt-2.5 flex items-center gap-2 uppercase tracking-[0.2em] ml-1">
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse inline-block shadow-[0_0_8px_rgba(16,185,129,0.5)]"/>
            LogiFlow Global Operations · {format(new Date(), 'dd MMMM yyyy').toUpperCase()}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="px-5 py-2.5 bg-indigo-50/50 border border-indigo-100 rounded-2xl text-center min-w-[120px]">
             <div className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-0.5">Fleet Signal</div>
             <div className="text-sm font-black text-[#3350e9]">98% NOMINAL</div>
          </div>
          <button
            onClick={fetchData}
            className="flex items-center gap-2 px-5 py-3 text-[11px] font-black border border-slate-200 bg-white text-slate-600 hover:text-[#3350e9] hover:border-indigo-200 hover:bg-indigo-50 rounded-2xl transition-all shadow-sm uppercase tracking-widest active:scale-95"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Recalibrate
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {kpiCards.map(card => {
          const Icon = card.icon;
          return (
            <div key={card.label} className={`kpi-card border-t-2 ${card.borderColor}`}>
              <div className={`w-9 h-9 ${card.bg} rounded-xl flex items-center justify-center mb-3`}>
                <Icon size={17} className={card.iconColor} />
              </div>
              <div className="text-xl font-black text-slate-900 tracking-tight tabular-nums">{card.value}</div>
              <div className="text-[11px] font-bold text-slate-500 mt-1 leading-tight uppercase tracking-wide">{card.label}</div>
            </div>
          );
        })}
      </div>

      {/* Weather Intelligence Strip */}
      <div className="bg-white border border-border rounded-2xl p-5 shadow-sm">
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-7 h-7 bg-sky-50 border border-sky-100 rounded-xl flex items-center justify-center">
            <Cloud size={14} className="text-sky-600" />
          </div>
          <div>
            <h3 className="text-[13px] font-black text-slate-800">Weather Intelligence</h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Key freight hubs · Live conditions</p>
          </div>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {cityWeathers.map(w => (
            <div key={w.city} className={`relative rounded-xl p-3 border text-center cursor-default hover:scale-105 transition-transform ${getWeatherRiskColor(w.riskLevel)}`}>
              <div className="text-xl mb-1">{w.icon}</div>
              <div className="text-[11px] font-black leading-tight text-slate-800">{w.city}</div>
              <div className="text-[15px] font-black mt-0.5 text-slate-900">{w.tempC}°C</div>
              <div className="text-[9px] font-bold opacity-60 mt-0.5 uppercase tracking-wide">{w.windKmph}km/h</div>
              {w.riskLevel !== 'low' && (
                <div className={`absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full border-2 border-white ${getWeatherRiskBadge(w.riskLevel)}`} />
              )}
            </div>
          ))}
        </div>
        {cityWeathers.some(w => w.warning) && (
          <div className="mt-3 flex flex-wrap gap-2">
            {cityWeathers.filter(w => w.warning).map(w => (
              <div key={w.city} className="text-[11px] font-bold bg-amber-50 border border-amber-200 text-amber-800 px-3 py-1.5 rounded-full">
                ⚠️ {w.warning}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Shipment Table */}
        <div className="lg:col-span-2 bg-white border border-border rounded-2xl shadow-sm flex flex-col min-h-0 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-black text-slate-800 text-[14px] flex items-center gap-2">
              <Package size={16} className="text-[#3b5bdb]" />
              Recent Shipments
            </h3>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">{filteredShipments.length} records</span>
          </div>
          <div className="px-4 py-3 border-b border-slate-100 flex gap-2">
            <input
              type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search ID, origin, destination..."
              className="flex-1 text-[13px] font-semibold bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-[#3b5bdb] transition-all placeholder-slate-400 text-slate-800"
            />
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
              className="text-[13px] font-semibold bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none text-slate-700 focus:border-[#3b5bdb]">
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="in_transit">In Transit</option>
              <option value="on_time">On Time</option>
              <option value="delayed">Delayed</option>
              <option value="delivered">Delivered</option>
            </select>
          </div>
          <div className="w-full overflow-x-auto min-h-0 min-w-0">
            <table className="w-full text-sm min-w-[600px]">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/30 text-left">
                  {['Shipment', 'Mode', 'Route', 'ETA', 'Status', 'Risk', ''].map(h => (
                    <th key={h} className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredShipments.slice(0, 10).map(s => {
                  const sc = statusConfig(s.status);
                  const eta = new Date(s.eta);
                  const isOverdue = eta < new Date() && s.status !== 'delivered';
                  const etaStr = s.status === 'delivered' ? 'Delivered' : isOverdue ? 'Overdue!' : format(eta, 'dd MMM');
                  const wr = getRouteWeatherRisk(s.origin, s.destination);
                  return (
                    <tr key={s.id} className="hover:bg-indigo-50/30 cursor-pointer transition-colors group" onClick={() => setSelectedShipment(s)}>
                      <td className="px-4 py-3.5">
                        <div className="font-mono text-[12px] font-black text-slate-700 group-hover:text-[#3b5bdb] transition-colors">{s.shipment_code}</div>
                        {wr.overallRisk > 60 && <div className="text-[10px] text-amber-600 font-bold mt-0.5">🌧️ weather risk</div>}
                      </td>
                      <td className="px-4 py-3.5 text-lg">{modeIcon(s.mode)}</td>
                      <td className="px-4 py-3.5">
                        <div className="font-black text-[13px] text-slate-800">{s.origin}</div>
                        <div className="text-[11px] font-semibold text-slate-400">→ {s.destination}</div>
                      </td>
                      <td className={`px-4 py-3.5 text-[12px] font-black whitespace-nowrap ${isOverdue ? 'text-red-600' : 'text-slate-600'}`}>{etaStr}</td>
                      <td className="px-4 py-3.5">
                        <span className={`badge ${sc.bg} ${sc.text}`}>{sc.label}</span>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <div className="w-14 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${riskBg(s.risk_score)}`} style={{ width: `${s.risk_score}%` }} />
                          </div>
                          <span className={`text-[12px] font-black ${riskColor(s.risk_score)}`}>{s.risk_score}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <button className="p-1.5 rounded-lg text-slate-300 hover:text-[#3b5bdb] hover:bg-indigo-50 transition-colors">
                          <Eye size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {filteredShipments.length === 0 && (
                  <tr><td colSpan={7} className="px-4 py-16 text-center">
                    <Package size={32} className="text-slate-200 mx-auto mb-3" />
                    <p className="text-slate-400 font-bold text-[13px]">No shipments found</p>
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-5">
          {/* Smart Alerts */}
          <div className="bg-white border border-border rounded-2xl shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-black text-slate-800 text-[14px] flex items-center gap-2">
                <AlertTriangle size={15} className="text-amber-500" />
                Smart Alerts
              </h3>
              {dbAlerts.length > 0 && (
                <span className="bg-rose-100 text-rose-600 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wide">
                  {dbAlerts.length} Active
                </span>
              )}
            </div>
            <div className="space-y-2.5 max-h-80 overflow-y-auto">
              <div className="flex items-center gap-2 mb-3">
                <button onClick={handleSimulateAlerts} disabled={simulating} className="flex-1 text-[10px] uppercase font-black tracking-widest text-[#3b5bdb] hover:bg-indigo-50 border border-indigo-100 rounded-lg py-2 transition-all disabled:opacity-50">
                  {simulating ? 'Simulating...' : 'Simulate Engine Trigger'}
                </button>
              </div>
              {dbAlerts.length === 0 && (
                <div className="text-center py-6">
                  <div className="w-10 h-10 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-2">
                    <CheckCircle size={20} className="text-emerald-400" />
                  </div>
                  <p className="font-black text-[13px] text-slate-600">All systems normal</p>
                  <p className="text-[11px] text-slate-400 font-semibold mt-1">No active alerts from engine</p>
                </div>
              )}
              {dbAlerts.map(a => {
                const styles = alertTextStyle[a.severity] ?? alertTextStyle.low;
                return (
                  <div key={a.id} className={`p-3.5 rounded-xl border ${alertSeverityStyle[a.severity]}`}>
                    <div className={`text-[12px] font-black mb-1 ${styles.title}`}>{a.title || a.message}</div>
                    <div className={`text-[11px] font-semibold leading-relaxed mb-2.5 ${styles.cause} opacity-80`}>{a.cause || a.message}</div>
                    <button
                      onClick={() => handleResolveDbAlert(a)}
                      disabled={simulating}
                      className={`flex items-center gap-1.5 text-[11px] font-black px-3 py-1.5 bg-white/70 hover:bg-white border border-current/20 rounded-lg transition-all disabled:opacity-60 ${styles.title} uppercase tracking-wide`}
                    >
                      <Activity size={10} />
                      {a.recommended_action || 'Acknowledge'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Transport Breakdown */}
          <div className="bg-white border border-border rounded-2xl shadow-sm p-5">
            <h3 className="font-black text-slate-800 text-[14px] mb-4">Transport Breakdown</h3>
            {mounted && modeChartData.length > 0 ? (
              <>
                <div style={{ width: '100%', height: 160, minHeight: 160 }}>
                  <ResponsiveContainer width="100%" height={160}>
                    <PieChart>
                      <Pie data={modeChartData} cx="50%" cy="50%" innerRadius={45} outerRadius={68} paddingAngle={3} dataKey="value" stroke="none">
                        {modeChartData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                      </Pie>
                      <Tooltip contentStyle={{ fontSize: 11, borderRadius: 12, border: '1px solid #e2e8f0', fontWeight: 700 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="grid grid-cols-2 gap-x-3 gap-y-2 mt-3">
                  {modeChartData.map(d => (
                    <div key={d.name} className="flex items-center gap-2 text-[12px]">
                      <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                      <span className="font-semibold text-slate-600">{d.name}</span>
                      <span className="ml-auto font-black text-slate-800">{d.value}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="h-32 flex items-center justify-center text-slate-400 text-sm font-bold">No data</div>
            )}
          </div>
        </div>
      </div>

      {selectedShipment && (
        <ShipmentDetailModal shipment={selectedShipment} onClose={() => setSelectedShipment(null)} onUpdate={fetchData} />
      )}
    </div>
  );
}
