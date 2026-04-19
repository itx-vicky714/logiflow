"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import dynamic from 'next/dynamic';
import { supabase } from '@/lib/supabase';
import { seedShipments, modeIcon, statusConfig, formatCurrency } from '@/lib/utils';
import type { Shipment } from '@/types';
import { 
  RefreshCw, Filter, ShieldAlert, CheckCircle, Activity, Sparkles, Map as MapIcon, 
  Maximize2, ChevronRight, X, CloudRain, Package, Truck, Clock, Navigation, AlertCircle, Zap, TrendingUp, Search, ArrowRight,
  Plane, Ship, Train, Menu
} from 'lucide-react';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { ModeIcon } from '@/components/ModeIcon';

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
  const [searchQuery, setSearchQuery] = useState('');
  const [isMobileListOpen, setIsMobileListOpen] = useState(false);
  const mapRef = useRef<any>(null);

  // Trigger map resize when panels toggle
  useEffect(() => {
    const timer = setTimeout(() => {
      if (mapRef.current) mapRef.current.invalidateSize();
    }, 400); // 400ms to account for framer-motion transitions
    return () => clearTimeout(timer);
  }, [highlighted]);

  useEffect(() => {
    const handleResize = () => mapRef.current?.invalidateSize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
    <div className="fixed inset-0 top-[64px] left-[256px] flex items-center justify-center bg-white z-[10]">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Initializing Control Tower...</p>
      </div>
    </div>
  );

  return (
    <div className="fixed top-[64px] left-0 md:left-[256px] right-0 bottom-0 bg-white flex flex-col md:flex-row overflow-hidden">
      
      {/* Mobile Toggle Button */}
      <button 
        onClick={() => setIsMobileListOpen(!isMobileListOpen)}
        className="md:hidden fixed bottom-6 left-6 z-[1001] bg-indigo-600 text-white px-6 py-4 rounded-2xl shadow-2xl font-black text-xs uppercase tracking-widest flex items-center gap-3 active:scale-95 transition-transform"
      >
        <Menu size={18} />
        {isMobileListOpen ? 'Close List' : `Shipments (${filteredShipments.length})`}
      </button>

      {/* LEFT PANEL: Shipment List */}
      <aside className={`
        fixed inset-0 z-[1000] md:relative md:inset-auto
        w-full md:w-[340px] md:min-w-[340px] h-full
        bg-white border-r border-slate-100 flex flex-col shrink-0
        transition-transform duration-300 ease-in-out
        ${isMobileListOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className="p-6 border-b border-slate-50">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-[18px] font-black text-slate-900 tracking-tight">Live Shipments</h2>
            {isMobileListOpen && (
              <button onClick={() => setIsMobileListOpen(false)} className="p-2 text-slate-400 md:hidden">
                <X size={20} />
              </button>
            )}
          </div>
          <p className="text-[13px] font-bold text-slate-400">{filteredShipments.length} Active Shipments</p>
          
          <div className="mt-6 relative">
            <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text"
              placeholder="Search by ID or City..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border-none rounded-xl py-3 pl-10 pr-4 text-[12px] font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-600/10 transition-all border border-transparent focus:border-indigo-100"
            />
          </div>
        </div>
        
        {/* Filter Tabs */}
        <div className="px-4 py-3 border-b border-slate-50 flex gap-2 overflow-x-auto no-scrollbar whitespace-nowrap">
          {(Object.keys(modeLabels) as ModeFilterType[]).map(key => (
            <button 
              key={key} 
              onClick={() => setModeFilter(key)}
              className={`px-4 py-2 text-[10px] font-black rounded-full transition-all uppercase tracking-widest border ${
                modeFilter === key 
                  ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-100' 
                  : 'bg-white border-slate-100 text-slate-500 hover:border-slate-300 hover:text-slate-800'
              }`}
            >
              {modeLabels[key]}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
          {filteredShipments.map(s => {
            const isActive = highlighted === s.id;
            const isHighRisk = s.risk_score >= 70 || s.status === 'delayed';
            const statusConfig = {
              in_transit: { label: 'ON TIME', bg: 'bg-green-100', text: 'text-green-700' },
              delayed: { label: 'DELAYED', bg: 'bg-red-100', text: 'text-red-700' },
              risk: { label: 'AT RISK', bg: 'bg-amber-100', text: 'text-amber-700' }
            };
            
            const currentStatus = isHighRisk && s.status !== 'delayed' ? 'risk' : s.status;
            const config = (statusConfig as any)[currentStatus as any] || statusConfig.in_transit;

            return (
              <motion.div 
                layoutId={`card-${s.id}`}
                key={s.id} 
                onClick={() => {
                  setHighlighted(isActive ? null : s.id);
                  if (window.innerWidth < 768) setIsMobileListOpen(false);
                }}
                className={`p-4 rounded-xl cursor-pointer border transition-all relative overflow-hidden group ${
                  isActive ? 'bg-indigo-50 border-indigo-500 shadow-sm' : 'bg-white border-slate-100 hover:border-indigo-300 hover:shadow-md'
                }`}
              >
                <div className="flex justify-between items-start mb-3">
                  <span className="text-[12px] font-black text-indigo-600 tracking-tight">{s.shipment_code}</span>
                  <span className={`px-2 py-1 rounded text-[9px] font-black uppercase tracking-widest ${config.bg} ${config.text}`}>
                    {config.label}
                  </span>
                </div>
                
                <div className="flex items-center gap-2 mb-4">
                  <div className="text-[13px] font-bold text-slate-800 tracking-tight flex-1 truncate">
                    {s.origin} <span className="text-slate-300 mx-1">→</span> {s.destination}
                  </div>
                  <div className="text-slate-400 group-hover:text-indigo-600 transition-colors">
                    <ModeIcon mode={s.mode} size={18} />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    <span>ETA: {format(new Date(s.eta), 'dd MMM')}</span>
                    <span>Progress: 65%</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: '65%' }}
                      className={`h-full ${isHighRisk ? 'bg-amber-500' : 'bg-indigo-600'}`}
                    />
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </aside>

      {/* MAP CONTAINER - Takes remaining space */}
      <main className="flex-1 relative h-full min-w-0 overflow-hidden">
        <ErrorBoundary>
          <MapLayout 
              shipments={filteredShipments} 
              highlighted={highlighted} 
              onMarkerClick={(id: string) => setHighlighted(id)} 
              onMapReady={(map: any) => { mapRef.current = map; }}
          />
        </ErrorBoundary>

        {/* View Filters Overlay */}
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
        </div>
      </main>

      {/* RIGHT DETAIL PANEL */}
      <AnimatePresence>
        {highlighted && selectedShipment && (
          <motion.aside 
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className={`
              fixed bottom-0 left-0 right-0 z-[1002] md:static
              w-full md:w-[320px] md:min-w-[320px] h-[70vh] md:h-full
              bg-white border-l border-slate-100 flex flex-col shrink-0
              shadow-[-10px_0_30px_rgba(0,0,0,0.05)] md:shadow-none
              rounded-t-[2rem] md:rounded-none
            `}
          >
            <div className="p-6 border-b border-slate-50 flex items-center justify-between sticky top-0 bg-white z-10 text-slate-900">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-lg uppercase font-black">
                   <ModeIcon mode={selectedShipment.mode} size={20} />
                </div>
                <div>
                  <h3 className="text-[16px] font-black tracking-tight">{selectedShipment.shipment_code}</h3>
                  <div className="flex gap-2 mt-1">
                    <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${
                       selectedShipment.risk_score >= 70 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                    }`}>
                      {selectedShipment.status === 'delayed' ? 'DELAYED' : 'ON TIME'}
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 text-[8px] font-black uppercase tracking-widest">
                      {selectedShipment.mode}
                    </span>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => setHighlighted(null)} 
                className="w-8 h-8 flex items-center justify-center bg-slate-50 rounded-lg text-slate-400 hover:text-slate-900 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
              <div className="space-y-4">
                <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Route</h5>
                <div className="space-y-3 relative pl-4 before:absolute before:left-[19px] before:top-2 before:bottom-2 before:w-[1px] before:bg-slate-100">
                   <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full bg-slate-200 border-2 border-white z-10" />
                      <div>
                        <p className="text-[12px] font-black text-slate-900">{selectedShipment.origin}</p>
                        <p className="text-[9px] text-slate-400 font-bold uppercase">Origin</p>
                      </div>
                   </div>
                   <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full bg-indigo-600 border-2 border-white z-10 animate-pulse" />
                      <div>
                        <p className="text-[12px] font-black text-slate-900">{selectedShipment.destination}</p>
                        <p className="text-[9px] text-slate-400 font-bold uppercase">Destination</p>
                      </div>
                   </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Mode', val: selectedShipment.mode },
                  { label: 'Weight', val: `${selectedShipment.weight_kg.toLocaleString()} kg` },
                  { label: 'ETA', val: format(new Date(selectedShipment.eta), 'dd MMM, HH:mm') },
                  { label: 'Risk Score', val: `${selectedShipment.risk_score}%` },
                ].map((item, i) => (
                  <div key={i} className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">{item.label}</p>
                    <p className="text-[11px] font-black text-slate-900 uppercase truncate">{item.val}</p>
                  </div>
                ))}
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Risk</h5>
                  <span className={`text-[11px] font-black ${
                    selectedShipment.risk_score >= 70 ? 'text-red-600' : selectedShipment.risk_score >= 40 ? 'text-amber-600' : 'text-green-600'
                  }`}>
                    {selectedShipment.risk_score}%
                  </span>
                </div>
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div 
                    className={`h-full transition-all duration-500 ${
                      selectedShipment.risk_score >= 70 ? 'bg-red-500' : selectedShipment.risk_score >= 40 ? 'bg-amber-500' : 'bg-green-500'
                    }`} 
                    style={{ width: `${selectedShipment.risk_score}%` }} 
                  />
                </div>
              </div>

              <div className="space-y-4">
                <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Cargo</h5>
                <div className="space-y-2">
                  <div className="flex justify-between text-[11px] font-bold">
                    <span className="text-slate-400">Type</span>
                    <span className="text-slate-900">{selectedShipment.cargo_type}</span>
                  </div>
                  <div className="flex justify-between text-[11px] font-bold">
                    <span className="text-slate-400">Value</span>
                    <span className="text-slate-900">{formatCurrency(selectedShipment.declared_value || 0)}</span>
                  </div>
                  <div className="flex justify-between text-[11px] font-bold">
                    <span className="text-slate-400">Supplier</span>
                    <span className="text-slate-900">{selectedShipment.supplier_name || 'N/A'}</span>
                  </div>
                </div>
              </div>

              <div className="pt-4 space-y-3">
                <button className="w-full py-4 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-black transition-colors">
                  View Full Details
                </button>
                <a 
                  href={`mailto:shipments@logiflow.io?subject=Inquiry for ${selectedShipment.shipment_code}`}
                  className="w-full py-4 bg-white border border-slate-200 text-slate-900 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-colors flex items-center justify-center gap-2"
                >
                  Email Supplier
                </a>
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </div>
  );
}
