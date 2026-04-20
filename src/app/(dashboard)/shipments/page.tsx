"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { seedShipments, statusConfig, modeIcon, riskColor, formatCurrency } from '@/lib/utils';
import type { Shipment } from '@/types';
import dynamic from 'next/dynamic';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { ModeIcon } from '@/components/ModeIcon';
import { Filter, Search } from 'lucide-react';

const ShipmentDetailModal = dynamic(() => import('@/components/ShipmentDetailModal'), { ssr: false });

const TABS = ['All', 'Active', 'Delivered', 'Delayed'] as const;
type Tab = typeof TABS[number];

import { useSearch } from '@/context/SearchContext';

export default function ShipmentsPage() {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const { query: search, setQuery: setSearch } = useSearch();
  const [tab, setTab] = useState<Tab>('All');
  const [selected, setSelected] = useState<Shipment | null>(null);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [showStatusFilter, setShowStatusFilter] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
        setShowStatusFilter(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

  useEffect(() => {
    const run = async () => {
        await fetchData();
    };
    run();
  }, [fetchData]);

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
        new Date(s.eta).toLocaleString(), s.cargo_type, String(s.weight_kg), String(s.risk_score)
      ])
    ];
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `LogiFlow_Shipments_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    toast.success('Shipments Exported');
  };

  const toggleCheck = (id: string) => setChecked(prev => {
    const n = new Set(prev);
    n.has(id) ? n.delete(id) : n.add(id);
    return n;
  });

  const markDelivered = async () => {
    if (checked.size === 0) return;
    const { error } = await supabase.from('shipments').update({ status: 'delivered' }).in('id', [...checked]);
    if (error) {
      toast.error('Failed to update status');
    } else {
      toast.success(`Marked ${checked.size} unit(s) as delivered`);
      setChecked(new Set());
      fetchData();
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-[calc(100vh-12rem)]">
      <div className="status-pulse bg-primary w-12 h-12"></div>
    </div>
  );

  return (
    <div className="font-['Inter'] antialiased tracking-tight text-[#191c1e] animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* Page Header */}
      <div className="pt-6 px-6 flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
        <div>
          <h1 className="text-3xl font-black text-on-surface tracking-tighter">Shipment Inventory</h1>
          <div className="flex items-center gap-2 mt-2">
            <span className="status-pulse bg-primary"></span>
            <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-[0.2em]">{shipments.length} Shipments listed</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {checked.size > 0 && (
            <button 
              onClick={markDelivered} 
              className="bg-primary text-on-primary py-3 px-6 text-[11px] font-black uppercase tracking-widest rounded-xl shadow-lg shadow-primary/20 hover:opacity-90 active:scale-95 transition-all"
            >
              Mark Delivered ({checked.size})
            </button>
          )}
          <button 
            onClick={exportCSV} 
            className="flex items-center gap-3 py-3 px-6 text-[11px] font-black uppercase tracking-widest rounded-xl border border-outline-variant bg-surface-container-lowest hover:bg-surface-container transition-all active:scale-95"
          >
            <span className="material-symbols-outlined text-sm">download</span>
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Filtration & Search Bar */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white p-6 rounded-3xl border border-slate-200/60 shadow-sm mb-8">
        <div className="flex bg-slate-50 p-1 rounded-2xl w-full md:w-auto">
          {TABS.map(t => (
            <button 
              key={t} 
              onClick={() => setTab(t)}
              className={`flex-1 md:flex-none px-6 py-2.5 text-[11px] font-bold uppercase tracking-widest rounded-xl transition-all ${
                tab === t ? 'bg-white shadow-sm text-[#493ee5]' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
        
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-80">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search shipments, routes, or IDs..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full h-12 pl-12 pr-4 bg-slate-50 border border-slate-100 rounded-2xl text-[13px] text-on-surface font-medium outline-none focus:bg-white focus:ring-4 focus:ring-[#493ee5]/10 transition-all"
            />
          </div>
          <div className="relative" ref={filterRef}>
            <button 
              onClick={() => setShowStatusFilter(!showStatusFilter)}
              className={`h-12 w-12 flex items-center justify-center rounded-2xl transition-all active:scale-95 border ${
                showStatusFilter ? 'bg-[#493ee5] text-white border-[#493ee5] shadow-lg shadow-indigo-100' : 'bg-white text-slate-600 border-slate-200/80 hover:bg-slate-50'
              }`}
            >
              <Filter size={18} />
            </button>
            {showStatusFilter && (
              <div className="absolute top-14 right-0 w-56 bg-white rounded-2xl shadow-2xl border border-slate-100 p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="px-3 py-2 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50 mb-1">Filter by Risk</div>
                {['Critical Risk', 'Medium Risk', 'Stable'].map((p) => (
                  <button key={p} className="w-full text-left px-4 py-3 text-[12px] font-bold text-slate-600 hover:bg-slate-50 rounded-xl transition-colors">
                    {p}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Database Table */}
      <div className="bg-surface-container-lowest rounded-2xl border border-white/50 curated-shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-surface-container-low/50">
                <th className="px-8 py-4 w-12 text-center border-r border-surface-container/20">
                  <input 
                    type="checkbox" 
                    className="w-4 h-4 rounded border-outline-variant text-primary focus:ring-primary/20 bg-surface"
                    onChange={e => setChecked(e.target.checked ? new Set(filtered.map(s => s.id)) : new Set())} 
                  />
                </th>
                <th className="px-8 py-4 text-[10px] font-black text-on-surface-variant uppercase tracking-widest">Shipment ID</th>
                <th className="px-8 py-4 text-[10px] font-black text-on-surface-variant uppercase tracking-widest">Route</th>
                <th className="px-8 py-4 text-[10px] font-black text-on-surface-variant uppercase tracking-widest">Status</th>
                <th className="px-8 py-4 text-[10px] font-black text-on-surface-variant uppercase tracking-widest hidden lg:table-cell">Cargo Description</th>
                <th className="px-8 py-4 text-[10px] font-black text-on-surface-variant uppercase tracking-widest text-right">Risk Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container">
              {filtered.map(s => {
                const isDelayed = s.status === 'delayed';
                return (
                  <tr 
                    key={s.id} 
                    onClick={() => setSelected(s)}
                    className="hover:bg-surface-container-low/30 cursor-pointer transition-all group border border-transparent hover:border-indigo-100 rounded-2xl"
                  >
                    <td className="px-8 py-6 text-center border-r border-surface-container/10" onClick={e => e.stopPropagation()}>
                      <input 
                        type="checkbox" 
                        checked={checked.has(s.id)} 
                        onChange={() => toggleCheck(s.id)}
                        className="w-4 h-4 rounded border-outline-variant text-primary focus:ring-primary/20 bg-surface"
                      />
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-surface-container-low border border-white/50 flex items-center justify-center text-primary shadow-sm group-hover:bg-surface-container-lowest transition-all">
                           <ModeIcon mode={s.mode} size={18} />
                        </div>
                        <div className="font-bold text-[13px] text-on-surface tracking-tight">#{s.shipment_code.split('-').pop()}</div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="text-[13px] font-bold text-on-surface leading-tight">{s.destination}</div>
                      <div className="text-[10px] text-on-surface-variant font-medium mt-1">Via {s.origin} hub</div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-3">
                        <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-tight ${
                          isDelayed ? 'bg-error-container text-error' : 'bg-primary-fixed text-[#493ee5]'
                        }`}>
                          {statusConfig(s.status).label}
                        </span>
                        <div className="text-[10px] text-on-surface-variant font-bold flex items-center gap-1.5 uppercase">
                          <span className="material-symbols-outlined text-[14px]">schedule</span>
                          {format(new Date(s.eta), 'dd MMM')}
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6 hidden lg:table-cell">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-outline-variant text-md">inventory_2</span>
                        <span className="text-[12px] font-medium text-on-surface-variant line-clamp-1">{s.cargo_type}</span>
                      </div>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <div className="inline-flex items-center gap-3">
                        <div className="w-24 h-1.5 bg-surface-container-low rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all duration-1000 ${s.risk_score > HIGH_RISK_THRESHOLD ? 'bg-error' : 'bg-primary'}`} 
                            style={{ width: `${s.risk_score}%` }} 
                          />
                        </div>
                        <span className={`text-[12px] font-black w-8 ${s.risk_score > HIGH_RISK_THRESHOLD ? 'text-error' : 'text-on-surface'}`}>{s.risk_score}</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-8 py-24 text-center">
                    <div className="w-16 h-16 bg-surface-container-low rounded-2xl flex items-center justify-center mx-auto mb-6 text-outline-variant border border-white shadow-inner">
                       <span className="material-symbols-outlined text-4xl">inventory</span>
                    </div>
                    <h3 className="text-sm font-black text-on-surface uppercase tracking-widest">No Shipments Found</h3>
                    <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mt-2">
                      {search ? 'No shipments found matching your search' : 'Initializing shipments...'}
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selected && (
        <ShipmentDetailModal 
          shipment={selected} 
          onClose={() => setSelected(null)} 
          onUpdate={fetchData} 
        />
      )}
    </div>
  );
}

const HIGH_RISK_THRESHOLD = 70;

