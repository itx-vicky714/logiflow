"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { supabase } from '@/lib/supabase';
import { seedShipments, modeIcon, statusConfig, formatCurrency } from '@/lib/utils';
import type { Shipment } from '@/types';
import { 
  RefreshCw, Filter, ShieldAlert, CheckCircle, Activity, Sparkles, Map as MapIcon, 
  Maximize2, ChevronRight, X, CloudRain, Package, Truck, Clock, Navigation, AlertCircle, Zap, TrendingUp, Search, ArrowRight
} from 'lucide-react';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean }> {
  constructor(props: any) { super(props); this.state = { hasError: false }; }
  static getDerivedStateFromError() { return { hasError: true }; }
  render() {
    if (this.state.hasError) return (
      <div className="flex-1 h-full min-h-[500px] flex items-center justify-center bg-slate-50 rounded-2xl border-2 border-dashed border-rose-200 text-rose-500">
        <div className="text-center group p-10">
          <AlertCircle size={48} className="mx-auto mb-4" />
          <p className="text-[11px] font-black uppercase tracking-widest leading-loose">Map Connection Failed<br/>Please refresh to reconnect</p>
        </div>
      </div>
    );
    return this.props.children;
  }
}

const MapLayout = dynamic(() => import('@/components/MapLayout'), { ssr: false, loading: () => (
  <div className="flex-1 h-full min-h-[500px] flex items-center justify-center bg-slate-50 rounded-2xl border border-slate-200 shadow-inner">
    <div className="flex flex-col items-center gap-4">
      <div className="relative">
        <MapIcon size={32} className="text-slate-300" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
      <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Loading Live Tracking...</p>
    </div>
  </div>
)});

type MapFilterType = 'All Shipments' | 'In Transit' | 'High Risk';
type ModeFilterType = 'All' | 'road' | 'rail' | 'air' | 'sea' | 'risk';

export default function MapPage() {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [highlighted, setHighlighted] = useState<string | null>(null);
  const [mapFilter, setMapFilter] = useState<MapFilterType>('All Shipments');
  const [modeFilter, setModeFilter] = useState<ModeFilterType>('All');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }
    
    // Ensure we have data
    await seedShipments(user.id);
    
    const { data } = await supabase.from('shipments')
      .select('*')
      .eq('user_id', user.id)
      .neq('status', 'delivered')
      .order('risk_score', { ascending: false });
    if (data) setShipments(data);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const selectedShipment = useMemo(() => 
    shipments.find(s => s.id === highlighted), 
  [shipments, highlighted]);

  const filteredShipments = useMemo(() => {
    return shipments.filter(s => {
      // Search
      const code = s.shipment_code.toLowerCase();
      const origin = s.origin.toLowerCase();
      const dest = s.destination.toLowerCase();
      const q = searchQuery.toLowerCase();
      if (q && !code.includes(q) && !origin.includes(q) && !dest.includes(q)) return false;

      // Map Filter
      if (mapFilter === 'In Transit' && s.status !== 'in_transit') return false;
      if (mapFilter === 'High Risk' && s.risk_score < 70 && s.status !== 'delayed') return false;
      
      // Mode Filter
      if (modeFilter === 'risk') {
          if (s.risk_score < 70 && s.status !== 'delayed') return false;
      } else if (modeFilter !== 'All') {
          if (s.mode !== modeFilter) return false;
      }

      return true;
    });
  }, [shipments, mapFilter, modeFilter, searchQuery]);

  const modeLabels: Record<ModeFilterType, string> = {
    'All': 'All', 'road': 'Road', 'rail': 'Rail', 'air': 'Air', 'sea': 'Sea', 'risk': 'At Risk'
  };

  const modeLabel = (m: string) => m.charAt(0).toUpperCase() + m.slice(1);

  if (loading) return (
    <div className="flex items-center justify-center h-[calc(100vh-12rem)]">
      <div className="status-pulse bg-indigo-600 w-12 h-12"></div>
    </div>
  );

  return (
    <div className={`flex flex-col ${isFullscreen ? 'fixed inset-0 z-[1000] bg-white p-6 md:p-12' : 'h-[calc(100vh-12rem)]'} overflow-hidden transition-all`}>
      <div className="flex flex-1 overflow-hidden relative gap-6">
        
        {/* Left Panel: Shipment List */}
        <div className="w-[320px] shrink-0 bg-white rounded-3xl border border-slate-200 shadow-xl flex flex-col z-10 overflow-hidden">
          <div className="p-8 pb-4 border-b border-slate-50">
            <h2 className="text-xl font-black text-slate-800 tracking-tighter">Live Updates</h2>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">{filteredShipments.length} matching shipments</p>
            
            <div className="mt-6 relative">
              <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text"
                placeholder="Search shipments..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 border-none rounded-xl py-3 pl-10 pr-4 text-[12px] font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-600/10 transition-all"
              />
            </div>
          </div>
          
          <div className="p-3 border-b border-slate-50 flex gap-2 overflow-x-auto scrollbar-hide whitespace-nowrap">
            {(Object.keys(modeLabels) as ModeFilterType[]).map(key => (
              <button 
                key={key} 
                onClick={() => setModeFilter(key)}
                className={`px-4 py-2 text-[10px] font-black rounded-lg transition-all uppercase tracking-widest ${
                  modeFilter === key ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'bg-slate-100 text-slate-500 hover:text-slate-800'
                }`}
              >
                {modeLabels[key]}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-hide">
            {filteredShipments.map(s => {
              const isActive = highlighted === s.id;
              const isHighRisk = s.risk_score >= 70 || s.status === 'delayed';
              return (
                <div 
                  key={s.id} 
                  onClick={() => setHighlighted(isActive ? null : s.id)}
                  className={`p-5 rounded-2xl cursor-pointer border transition-all ${
                    isActive ? 'bg-indigo-50 border-indigo-200 shadow-sm' : 'bg-white border-slate-100 hover:border-slate-300'
                  }`}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="text-[13px] font-bold text-slate-800 tracking-tight">
                      {s.origin} <span className="mx-1 text-slate-300">→</span> {s.destination}
                    </div>
                    <div className="w-7 h-7 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center text-indigo-600">
                      <span className="text-[14px]">{modeIcon(s.mode)}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black text-slate-400 flex items-center gap-1 uppercase tracking-widest">
                      <Clock size={12}/> {format(new Date(s.eta), 'dd MMM')}
                    </span>
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${isHighRisk ? 'bg-rose-500 animate-pulse' : 'bg-emerald-500'}`} />
                      <span className={`text-[9px] font-black uppercase tracking-widest ${isHighRisk ? 'text-rose-600' : 'text-slate-500'}`}>
                        {isHighRisk ? 'Priority' : 'Normal'}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Panel: Map & Quick Detail */}
        <div className="flex-1 relative bg-white rounded-3xl overflow-hidden border border-slate-200 shadow-lg">
          <ErrorBoundary>
            <MapLayout 
                shipments={filteredShipments} 
                highlighted={highlighted} 
                onMarkerClick={(id: string) => setHighlighted(id)} 
            />
          </ErrorBoundary>

          {/* Map View Controls */}
          <div className="absolute top-6 left-1/2 -translate-x-1/2 z-[1000] flex gap-2 p-1.5 bg-white/90 backdrop-blur-xl border border-slate-200 rounded-full shadow-2xl">
            {(['All Shipments', 'In Transit', 'High Risk'] as MapFilterType[]).map(f => (
              <button 
                key={f} 
                onClick={() => setMapFilter(f)}
                className={`px-5 py-2 text-[10px] font-black rounded-full transition-all uppercase tracking-widest ${
                  mapFilter === f ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-100' : 'text-slate-500 hover:bg-slate-50'
                }`}
              >
                {f}
              </button>
            ))}
            <button 
              onClick={() => setIsFullscreen(!isFullscreen)} 
              className="w-9 h-9 flex items-center justify-center text-slate-500 hover:bg-slate-100 rounded-full transition-all"
            >
              <Maximize2 size={16} />
            </button>
          </div>

          {/* Interactive Information Overlay */}
          <AnimatePresence>
            {highlighted && selectedShipment && (
              <motion.div 
                initial={{ opacity: 0, x: 20 }} 
                animate={{ opacity: 1, x: 0 }} 
                exit={{ opacity: 0, x: 20 }}
                className="absolute right-6 top-6 bottom-6 w-[360px] z-[1000] bg-white rounded-3xl border border-slate-200 shadow-2xl flex flex-col overflow-hidden"
              >
                {/* Overlay Header */}
                <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg">
                      <span className="text-[20px]">{modeIcon(selectedShipment.mode)}</span>
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-slate-800 tracking-tighter leading-none">{selectedShipment.shipment_code}</h3>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">{selectedShipment.cargo_type || 'General Cargo'}</p>
                    </div>
                  </div>
                  <button onClick={() => setHighlighted(null)} className="w-9 h-9 flex items-center justify-center bg-white rounded-xl border border-slate-200 text-slate-400 hover:text-slate-800 transition-all">
                    <X size={16} />
                  </button>
                </div>

                {/* Overlay Details */}
                <div className="flex-1 overflow-y-auto p-8 space-y-8 scrollbar-hide">
                  <div>
                    <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Actual Route</h5>
                    <div className="space-y-6 relative pl-6 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[2px] before:bg-slate-100">
                      <div className="relative">
                        <div className="absolute -left-[24px] top-1.5 w-4 h-4 rounded-full border-4 border-white bg-slate-200" />
                        <div className="font-black text-[15px] text-slate-800 uppercase italic tracking-tight">{selectedShipment.origin}</div>
                        <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Export Hub</div>
                      </div>
                      <div className="relative">
                        <div className="absolute -left-[24px] top-1.5 w-4 h-4 rounded-full border-4 border-white bg-indigo-600 animate-pulse shadow-lg" />
                        <div className="font-black text-[15px] text-slate-800 uppercase italic tracking-tight">{selectedShipment.destination}</div>
                        <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Delivery Destination</div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { label: 'Transport Mode', val: modeLabel(selectedShipment.mode) },
                      { label: 'Total Weight', val: `${selectedShipment.weight_kg.toLocaleString()} kg` },
                      { label: 'Arrival Date', val: format(new Date(selectedShipment.eta), 'dd MMM, HH:mm') },
                      { label: 'AI Risk Score', val: `${selectedShipment.risk_score}/100` },
                    ].map((m, i) => (
                      <div key={i} className="p-5 bg-slate-50 rounded-2xl border border-slate-100">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">{m.label}</p>
                        <p className="text-[13px] font-black text-slate-800 uppercase italic tracking-tighter truncate">{m.val}</p>
                      </div>
                    ))}
                  </div>

                  <div className={`p-6 rounded-[2rem] border ${selectedShipment.risk_score >= 70 ? 'bg-rose-50 border-rose-100 text-rose-700' : 'bg-indigo-50 border-indigo-100 text-indigo-700'}`}>
                    <div className="flex items-center gap-2 mb-3">
                      <Sparkles size={16} className="shrink-0" />
                      <p className="text-[10px] font-black uppercase tracking-widest italic">AI Guidance</p>
                    </div>
                    <p className="text-[13px] font-bold leading-relaxed uppercase tracking-tight italic opacity-80">
                      {selectedShipment.risk_score >= 70 ? 'High probability of delay. Emergency alternate route calculation suggested via road corridor.' : 'Transit parameters within normal range. Vessel and path integrity confirmed at 98.4% accuracy.'}
                    </p>
                  </div>

                  <button 
                    onClick={() => toast.success('Full telemetry profile synced')}
                    className="w-full py-5 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl hover:bg-black transition-all flex items-center justify-center gap-2"
                  >
                    View Comprehensive Profile <ArrowRight size={14} />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
