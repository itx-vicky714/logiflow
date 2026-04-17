"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { seedShipments, statusConfig, modeIcon, riskColor, riskBg } from '@/lib/utils';
import type { Shipment } from '@/types';
import { Search, Download, CheckSquare, Filter } from 'lucide-react';
import dynamic from 'next/dynamic';
import { toast } from 'sonner';

const ShipmentDetailModal = dynamic(() => import('@/components/ShipmentDetailModal'), { ssr: false });

const TABS = ['All', 'Active', 'Delivered', 'Delayed'] as const;
type Tab = typeof TABS[number];

export default function ShipmentsPage() {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<Tab>('All');
  const [selected, setSelected] = useState<Shipment | null>(null);
  const [checked, setChecked] = useState<Set<string>>(new Set());

  const fetchData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await seedShipments(user.id);
    const { data } = await supabase
      .from('shipments')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    if (data) setShipments(data);
    setLoading(false);
  }, []);

  const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  const searchParam = searchParams?.get('search');

  useEffect(() => {
    const run = async () => { await fetchData(); };
    run();
    window.addEventListener('shipments-updated', fetchData);
    return () => window.removeEventListener('shipments-updated', fetchData);
  }, [fetchData]);

  useEffect(() => {
    if (searchParam) {
      const apply = async () => { setSearch(searchParam); };
      apply();
    }
  }, [searchParam]);

  const filtered = shipments.filter(s => {
    const matchSearch = !search ||
      s.shipment_code.toLowerCase().includes(search.toLowerCase()) ||
      s.origin.toLowerCase().includes(search.toLowerCase()) ||
      s.destination.toLowerCase().includes(search.toLowerCase());
    const matchTab =
      tab === 'All' ? true :
      tab === 'Active' ? ['in_transit', 'on_time', 'pending'].includes(s.status) :
      tab === 'Delivered' ? s.status === 'delivered' :
      tab === 'Delayed' ? s.status === 'delayed' : true;
    return matchSearch && matchTab;
  });

  const exportCSV = () => {
    const rows = [
      ['Code', 'Origin', 'Destination', 'Mode', 'Status', 'ETA', 'Cargo', 'Weight (kg)', 'Risk'],
      ...filtered.map(s => [
        s.shipment_code, s.origin, s.destination, s.mode, s.status,
        new Date(s.eta).toLocaleString('en-IN'), s.cargo_type, String(s.weight_kg), String(s.risk_score)
      ])
    ];
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'shipments.csv'; a.click();
    toast.success('Exported to CSV');
  };

  const toggleCheck = (id: string) => setChecked(prev => {
    const n = new Set(prev);
    n.has(id) ? n.delete(id) : n.add(id);
    return n;
  });

  const markDelivered = async () => {
    if (checked.size === 0) return;
    await supabase.from('shipments').update({ status: 'delivered' }).in('id', [...checked]);
    toast.success(`Marked ${checked.size} shipment(s) as delivered`);
    setChecked(new Set());
    fetchData();
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-12 bg-white rounded-xl animate-pulse border border-border" />
        <div className="h-96 bg-white rounded-xl animate-pulse border border-border" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">My Shipments</h1>
          <p className="text-sm text-slate-500 mt-1">{shipments.length} total shipments in your account</p>
        </div>
        <div className="flex gap-2">
          {checked.size > 0 && (
            <button onClick={markDelivered} className="flex items-center gap-2 px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
              <CheckSquare size={14} />
              Mark Delivered ({checked.size})
            </button>
          )}
          <button onClick={exportCSV} className="flex items-center gap-2 px-3 py-1.5 text-sm bg-white border border-border text-slate-700 rounded-lg hover:bg-slate-50 transition-colors">
            <Download size={14} />
            Export CSV
          </button>
        </div>
      </div>

      {/* Tabs + Search */}
      <div className="bg-white border border-border rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
        <div className="flex items-center justify-between p-4 border-b border-border gap-4 flex-wrap">
          <div className="flex gap-1">
            {TABS.map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                  tab === t ? 'bg-primary text-white' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Search..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-56 bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-slate-50 text-left">
                <th className="px-4 py-3 w-10"><input type="checkbox" onChange={e => setChecked(e.target.checked ? new Set(filtered.map(s=>s.id)) : new Set())} /></th>
                <th className="px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Shipment Code</th>
                <th className="px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider hidden sm:table-cell">Mode</th>
                <th className="px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Route</th>
                <th className="px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider hidden md:table-cell">ETA</th>
                <th className="px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider hidden lg:table-cell">Cargo</th>
                <th className="px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Risk</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(s => {
                const sc = statusConfig(s.status);
                return (
                  <tr
                    key={s.id}
                    className="hover:bg-slate-50 cursor-pointer transition-colors"
                    onClick={() => setSelected(s)}
                  >
                    <td className="px-4 py-3" onClick={e => { e.stopPropagation(); toggleCheck(s.id); }}>
                      <input type="checkbox" checked={checked.has(s.id)} onChange={() => toggleCheck(s.id)} />
                    </td>
                    <td className="px-4 py-3 font-mono text-xs font-medium text-slate-700">{s.shipment_code}</td>
                    <td className="px-4 py-3 text-base hidden sm:table-cell">{modeIcon(s.mode)}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900">{s.origin}</div>
                      <div className="text-xs text-slate-400">→ {s.destination}</div>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600 whitespace-nowrap hidden md:table-cell">
                      {new Date(s.eta).toLocaleDateString('en-IN', { day:'2-digit', month: 'short' })}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`status-badge ${sc.bg} ${sc.text}`}>{sc.label}</span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600 hidden lg:table-cell">{s.cargo_type}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-12 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${riskBg(s.risk_score)}`} style={{ width: `${s.risk_score}%` }} />
                        </div>
                        <span className={`text-xs font-medium ${riskColor(s.risk_score)}`}>{s.risk_score}</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={8} className="px-4 py-12 text-center text-slate-400 text-sm">No shipments found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selected && <ShipmentDetailModal shipment={selected} onClose={() => setSelected(null)} onUpdate={fetchData} />}
    </div>
  );
}
