"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import {
  seedShipments, statusConfig, modeIcon, riskColor, riskBg,
  estimateRevenue, formatCurrency
} from '@/lib/utils';
import { getCityWeather, getRouteWeatherRisk, KEY_CITIES } from '@/lib/weather';
import type { Shipment, KPIData } from '@/types';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts';
import {
  Package, Truck, CheckCircle, AlertTriangle, ShieldAlert,
  RefreshCw, MoreHorizontal, ArrowRight, Cloud, Zap,
  Activity, Clock, Eye
} from 'lucide-react';
import dynamic from 'next/dynamic';
import { format } from 'date-fns';
import { toast } from 'sonner';

const ShipmentDetailModal = dynamic(() => import('@/components/ShipmentDetailModal'), { ssr: false });

// ─── Bar chart data (revenue forecast by month) ────────────────────────────
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTHLY_BARS = [120, 180, 150, 210, 170, 230, 195, 260, 220, 290, 250, 310];
const DAILY_BARS   = [32,  45,  38,  52,  41,  60,  48,  65,  55,  72,  63,  80];

export default function DashboardPage() {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [kpi, setKpi] = useState<KPIData>({
    total: 0, inTransit: 0, onTime: 0, delayed: 0, atRisk: 0, avgRisk: 0, revenue: 0
  });
  const [selectedShipment, setSelectedShipment] = useState<Shipment | null>(null);
  const [mounted, setMounted] = useState(false);
  const [dbAlerts, setDbAlerts] = useState<{
    id: string; type: string; severity: string; title: string;
    message: string; cause?: string; recommended_action?: string;
    shipment?: string; status: string; is_read: boolean; created_at: string;
  }[]>([]);
  const [simulating, setSimulating] = useState(false);
  const [revToggle, setRevToggle] = useState<'Daily' | 'Monthly'>('Monthly');

  // ─── Data Fetch ────────────────────────────────────────────────────────────
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
      const total     = data.length;
      const inTransit = data.filter(s => s.status === 'in_transit').length;
      const onTime    = data.filter(s => s.status === 'on_time').length;
      const delayed   = data.filter(s => s.status === 'delayed').length;
      const atRisk    = data.filter(s => s.risk_score > 70).length;
      const avgRisk   = total > 0 ? Math.round(data.reduce((a, b) => a + b.risk_score, 0) / total) : 0;
      const revenue   = data
        .filter(s => s.status === 'delivered' || s.status === 'on_time')
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
    setMounted(true);
    fetchData();
    window.addEventListener('shipments-updated', fetchData);
    return () => window.removeEventListener('shipments-updated', fetchData);
  }, [fetchData]);

  // ─── Alert Actions ─────────────────────────────────────────────────────────
  const handleSimulateAlerts = async () => {
    if (shipments.length === 0) return toast.info('No shipments to analyze');
    setSimulating(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSimulating(false); return; }
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
      if (s.status === 'delayed')
        newAlerts.push({ user_id: user.id, type: 'delay', severity: 'high',
          title: `Delay on ${s.shipment_code}`,
          message: `⚠️ ${s.shipment_code} delayed: ${s.origin} → ${s.destination}`,
          cause: `Risk score: ${s.risk_score}. Check for route issues.`,
          recommended_action: 'reroute', shipment: s.shipment_code, status: 'active' });
      if (s.risk_score > 80 && s.status !== 'delivered')
        newAlerts.push({ user_id: user.id, type: 'risk', severity: 'critical',
          title: `Critical Risk: ${s.shipment_code}`,
          message: `🔴 Risk score ${s.risk_score}/100`,
          cause: `${s.mode} mode, ${s.cargo_type} cargo. Requires review.`,
          recommended_action: 'assign driver', shipment: s.shipment_code, status: 'active' });
      if (weatherRisk.overallRisk > 60 && s.status === 'in_transit')
        newAlerts.push({ user_id: user.id, type: 'weather', severity: 'medium',
          title: `Weather: ${weatherRisk.primaryHazard}`,
          message: `🌧️ Route ${s.origin} → ${s.destination}`,
          cause: weatherRisk.recommendation,
          recommended_action: 'acknowledge', shipment: s.shipment_code, status: 'active' });
      if (hoursToEta > 0 && hoursToEta < 24 && s.status === 'in_transit')
        newAlerts.push({ user_id: user.id, type: 'info', severity: 'low',
          title: 'Approaching ETA',
          message: `⏰ ${s.shipment_code} arriving ${Math.round(hoursToEta)}h`,
          cause: 'Prepare receiving dock.',
          recommended_action: 'dismiss informational', shipment: s.shipment_code, status: 'active' });
    });
    if (newAlerts.length > 0) {
      await supabase.from('notifications').update({ is_read: true }).eq('user_id', user.id).eq('is_read', false);
      await supabase.from('notifications').insert(newAlerts.slice(0, 4));
      toast.success(`Generated ${Math.min(4, newAlerts.length)} alerts.`);
      fetchData();
    } else {
      toast.info('All nominal. No alert triggers matched.');
    }
    setSimulating(false);
  };

  const handleResolveDbAlert = async (alert: { id: string; recommended_action?: string; shipment?: string }) => {
    setSimulating(true);
    try {
      if (alert.recommended_action === 'reroute') {
        const s = shipments.find(sh => sh.shipment_code === alert.shipment);
        if (s && s.mode === 'road') {
          await supabase.from('shipments').update({ mode: 'rail', notes: 'Auto-rerouted via alert' }).eq('shipment_code', alert.shipment);
          toast.success('Rerouted to Rail successfully');
        } else { toast.success('Reroute suggestion applied'); }
      } else {
        toast.success(`Action: ${alert.recommended_action || 'Acknowledged'}`);
      }
      await supabase.from('notifications').update({ is_read: true, status: 'resolved', resolved_at: new Date().toISOString() }).eq('id', alert.id);
      await fetchData();
    } catch { toast.error('Action failed'); }
    finally { setSimulating(false); }
  };

  // ─── Derived Data ──────────────────────────────────────────────────────────
  const cityWeathers = KEY_CITIES.slice(0, 2).map(getCityWeather);

  const modeChartData = (['road', 'rail', 'air', 'sea'] as const).map(m => ({
    name: m === 'road' ? 'Road Transit' : m === 'rail' ? 'Rail Express' : m === 'air' ? 'Air Express' : 'Sea Freight',
    value: shipments.filter(s => s.mode === m).length,
    color: m === 'road' ? '#6366f1' : m === 'rail' ? '#8b5cf6' : m === 'air' ? '#0ea5e9' : '#14b8a6',
  })).filter(d => d.value > 0);

  const totalTransport = modeChartData.reduce((a, b) => a + b.value, 0);

  const barData = revToggle === 'Monthly'
    ? MONTHS.map((m, i) => ({ name: m, value: MONTHLY_BARS[i] }))
    : MONTHS.slice(0, 7).map((m, i) => ({ name: m.slice(0,1), value: DAILY_BARS[i] }));

  // ─── Alert accent map ─────────────────────────────────────────────────────
  const alertAccent = (severity: string) => {
    if (severity === 'critical') return 'border-l-red-500';
    if (severity === 'high')     return 'border-l-orange-500';
    if (severity === 'medium')   return 'border-l-blue-500';
    return 'border-l-teal-500';
  };

  // ─── Loading skeleton ─────────────────────────────────────────────────────
  if (loading) return (
    <div className="space-y-6 p-1">
      <div className="h-7 w-44 bg-slate-200 rounded-xl animate-pulse" />
      <div className="grid grid-cols-4 gap-5">
        {[...Array(4)].map((_, i) => <div key={i} className="h-28 bg-white rounded-2xl animate-pulse border border-slate-100" />)}
      </div>
      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 h-80 bg-white rounded-2xl animate-pulse border border-slate-100" />
        <div className="h-80 bg-white rounded-2xl animate-pulse border border-slate-100" />
      </div>
    </div>
  );

  return (
    <div className="space-y-6 font-sans">

      {/* ── Page Title Row ─────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-black text-slate-900 tracking-tight leading-tight">Control Tower</h1>
          <p className="text-[11px] text-slate-400 font-semibold mt-0.5 uppercase tracking-widest">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5 animate-pulse" />
            LogiFlow · {format(new Date(), 'dd MMMM yyyy')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-3 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
            All Clear
          </span>
          <button
            onClick={fetchData}
            className="px-3 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 border border-slate-200 transition-all"
          >
            Reset
          </button>
          <button
            onClick={handleSimulateAlerts}
            disabled={simulating}
            className="px-3 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-full bg-indigo-600 text-white hover:bg-indigo-700 transition-all disabled:opacity-60 shadow-sm"
          >
            {simulating ? 'Simulating...' : 'Simulate'}
          </button>
        </div>
      </div>

      {/* ── KPI Row + Smart Alerts ─────────────────────────────────────── */}
      <div className="grid grid-cols-12 gap-5 items-start">

        {/* KPI Cards — 9 cols */}
        <div className="col-span-9 grid grid-cols-4 gap-5">
          {/* Total Shipments */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="w-9 h-9 bg-slate-100 rounded-xl flex items-center justify-center">
                <Package size={17} className="text-slate-500" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total</span>
            </div>
            <div>
              <div className="text-3xl font-black text-slate-900 tabular-nums">{kpi.total}</div>
              <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1">Total Shipments</div>
              <div className="text-[10px] font-semibold text-slate-400 mt-1">{kpi.inTransit} active now</div>
            </div>
          </div>

          {/* In Transit */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center">
                <Truck size={17} className="text-blue-500" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Moving</span>
            </div>
            <div>
              <div className="text-3xl font-black text-blue-600 tabular-nums">{kpi.inTransit}</div>
              <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1">In Transit</div>
              <div className="text-[10px] font-semibold text-slate-400 mt-1">Across all routes</div>
            </div>
          </div>

          {/* On Time */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="w-9 h-9 bg-emerald-50 rounded-xl flex items-center justify-center">
                <CheckCircle size={17} className="text-emerald-500" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Good</span>
            </div>
            <div>
              <div className="text-3xl font-black text-emerald-600 tabular-nums">{kpi.onTime}</div>
              <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1">On Time</div>
              <div className="text-[10px] font-semibold text-slate-400 mt-1">Met SLA target</div>
            </div>
          </div>

          {/* Delayed */}
          <div className="bg-white rounded-2xl border border-red-100 shadow-sm p-5 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="w-9 h-9 bg-red-50 rounded-xl flex items-center justify-center">
                <AlertTriangle size={17} className="text-red-500" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest text-red-400">Alert</span>
            </div>
            <div>
              <div className="text-3xl font-black text-red-600 tabular-nums">{kpi.delayed}</div>
              <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1">Delayed</div>
              <div className="text-[10px] font-semibold text-red-400 mt-1">Requires attention</div>
            </div>
          </div>
        </div>

        {/* Smart Alerts — 3 cols */}
        <div className="col-span-3 bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[13px] font-black text-slate-800">Smart Alerts</h3>
            {dbAlerts.length > 0 && (
              <span className="bg-red-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full tracking-wide">
                {dbAlerts.length} Action Req.
              </span>
            )}
          </div>

          <div className="space-y-3 max-h-[168px] overflow-y-auto pr-0.5">
            {dbAlerts.length === 0 ? (
              <div className="py-6 text-center">
                <CheckCircle size={22} className="text-emerald-400 mx-auto mb-2" />
                <p className="text-[11px] font-black text-slate-500">All systems nominal</p>
              </div>
            ) : (
              dbAlerts.slice(0, 3).map(a => (
                <div
                  key={a.id}
                  className={`pl-3 border-l-2 ${alertAccent(a.severity)} pr-3 py-2 rounded-r-lg bg-slate-50`}
                >
                  <div className="text-[11px] font-black text-slate-800 truncate">{a.title || a.message}</div>
                  <div className="text-[10px] text-slate-500 leading-snug mt-0.5 line-clamp-2">{a.cause || a.message}</div>
                  <button
                    onClick={() => handleResolveDbAlert(a)}
                    disabled={simulating}
                    className="text-[10px] font-black text-indigo-600 hover:text-indigo-800 mt-1 uppercase tracking-wide"
                  >
                    {a.recommended_action || 'Review'} →
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ── Revenue + Weather + Breakdown ───────────────────────────────── */}
      <div className="grid grid-cols-12 gap-5 items-start">

        {/* Revenue Forecast — 9 cols */}
        <div className="col-span-9 bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <div className="flex items-start justify-between mb-6">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Revenue Forecast</p>
              <div className="text-4xl font-black text-slate-900 tracking-tighter">{formatCurrency(kpi.revenue)}</div>
              <div className="flex items-center gap-1.5 mt-2">
                <Activity size={13} className="text-emerald-500" />
                <span className="text-[11px] font-bold text-emerald-600">
                  {kpi.revenue > 0 ? '+12.4% vs last period' : 'Awaiting delivery data'}
                </span>
              </div>
            </div>
            {/* Toggle */}
            <div className="flex bg-slate-100 rounded-xl p-1 gap-1">
              {(['Daily', 'Monthly'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setRevToggle(t)}
                  className={`px-4 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${
                    revToggle === t
                      ? 'bg-white text-slate-800 shadow-sm'
                      : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Bar Chart */}
          {mounted && (
            <div style={{ height: 160 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData} barSize={22} margin={{ top: 0, right: 0, bottom: 0, left: -30 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8', textAnchor: 'middle' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis tick={{ fontSize: 9, fill: '#cbd5e1' }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ fontSize: 11, borderRadius: 10, border: '1px solid #e2e8f0', fontWeight: 700 }}
                    cursor={{ fill: 'rgba(99,102,241,0.06)' }}
                  />
                  <Bar
                    dataKey="value"
                    radius={[6, 6, 0, 0]}
                    fill="url(#barGradient)"
                  >
                    <defs>
                      <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#6366f1" />
                        <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.5} />
                      </linearGradient>
                    </defs>
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: Weather + Transport */}
        <div className="col-span-3 space-y-5">

          {/* Weather Intelligence */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-4">
              <Cloud size={14} className="text-sky-500" />
              <h3 className="text-[12px] font-black text-slate-800">Weather Intelligence</h3>
            </div>
            <div className="space-y-3">
              {cityWeathers.map(w => (
                <div
                  key={w.city}
                  className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100 hover:bg-sky-50/50 transition-colors"
                >
                  <span className="text-2xl">{w.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-[12px] font-black text-slate-800 truncate">{w.city}</div>
                    <div className="text-[10px] font-semibold text-slate-400">{w.condition}</div>
                  </div>
                  <div className="text-[15px] font-black text-slate-900 shrink-0">{w.tempC}°</div>
                </div>
              ))}
            </div>
          </div>

          {/* Transport Breakdown */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <h3 className="text-[12px] font-black text-slate-800 mb-4">Transport Breakdown</h3>
            {mounted && modeChartData.length > 0 ? (
              <>
                <div className="relative" style={{ height: 140 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={modeChartData}
                        cx="50%" cy="50%"
                        innerRadius={42} outerRadius={60}
                        paddingAngle={2}
                        dataKey="value"
                        stroke="none"
                      >
                        {modeChartData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                      </Pie>
                      <Tooltip
                        contentStyle={{ fontSize: 11, borderRadius: 10, border: '1px solid #e2e8f0', fontWeight: 700 }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  {/* Center label */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-[18px] font-black text-slate-900 leading-none">{totalTransport}k</span>
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 mt-0.5">units</span>
                  </div>
                </div>
                <div className="mt-3 space-y-2">
                  {modeChartData.map(d => (
                    <div key={d.name} className="flex items-center gap-2.5">
                      <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                      <span className="text-[11px] font-semibold text-slate-600 flex-1">{d.name}</span>
                      <span className="text-[11px] font-black text-slate-800">
                        {totalTransport > 0 ? Math.round((d.value / totalTransport) * 100) : 0}%
                      </span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="h-32 flex items-center justify-center text-slate-400 text-xs font-bold uppercase tracking-widest">
                No Data
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Recent Shipments ─────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-50">
          <div>
            <h2 className="text-[14px] font-black text-slate-900">Recent Shipments</h2>
            <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-widest mt-0.5">
              Last {Math.min(shipments.length, 6)} records
            </p>
          </div>
          <a
            href="/shipments"
            className="flex items-center gap-1.5 text-[11px] font-black text-indigo-600 hover:text-indigo-800 uppercase tracking-widest transition-colors"
          >
            View All Shipments <ArrowRight size={12} />
          </a>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[640px]">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-100">
                <th className="px-6 py-3.5 text-[10px] font-black uppercase tracking-widest text-slate-400">Tracking ID</th>
                <th className="px-6 py-3.5 text-[10px] font-black uppercase tracking-widest text-slate-400">Destination</th>
                <th className="px-6 py-3.5 text-[10px] font-black uppercase tracking-widest text-slate-400">Status</th>
                <th className="px-6 py-3.5 text-[10px] font-black uppercase tracking-widest text-slate-400">ETA</th>
                <th className="px-6 py-3.5 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {shipments.slice(0, 6).map(s => {
                const eta = new Date(s.eta);
                const isOverdue = eta < new Date() && s.status !== 'delivered';
                const etaStr   = s.status === 'delivered'
                  ? 'Delivered'
                  : isOverdue
                    ? 'Overdue!'
                    : format(eta, 'dd MMM yyyy');

                // Badge style matching reference
                const badgeCss =
                  s.status === 'in_transit' || s.status === 'dispatched'
                    ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                    : s.status === 'delayed'
                      ? 'bg-red-50 text-red-700 border border-red-200'
                      : s.status === 'on_time' || s.status === 'delivered'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-slate-100 text-slate-600 border border-slate-200';

                const sc = statusConfig(s.status);

                return (
                  <tr
                    key={s.id}
                    onClick={() => setSelectedShipment(s)}
                    className="hover:bg-slate-50/80 cursor-pointer transition-colors group"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2.5">
                        <span className="text-lg">{modeIcon(s.mode)}</span>
                        <div>
                          <div className="font-mono text-[12px] font-black text-slate-700 group-hover:text-indigo-600 transition-colors">
                            {s.shipment_code}
                          </div>
                          <div className="text-[10px] text-slate-400 font-semibold">{s.cargo_type}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-[13px] font-black text-slate-800">{s.destination}</div>
                      <div className="text-[10px] text-slate-400 font-semibold">from {s.origin}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${badgeCss}`}>
                        {sc.label}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className={`text-[12px] font-black ${isOverdue ? 'text-red-600' : 'text-slate-700'}`}>
                        <Clock size={10} className="inline mr-1 opacity-60" />
                        {etaStr}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="p-2 rounded-lg text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 transition-all">
                        <MoreHorizontal size={16} />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {shipments.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-14 text-center">
                    <Package size={28} className="text-slate-200 mx-auto mb-3" />
                    <p className="text-slate-400 font-bold text-sm">No shipments found</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

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
