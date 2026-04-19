"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { supabase } from '@/lib/supabase';
import { seedShipments, modeIcon, statusConfig, formatCurrency } from '@/lib/utils';
import type { Shipment } from '@/types';
import { 
  RefreshCw, Filter, ShieldAlert, CheckCircle, Activity, Sparkles, Map as MapIcon, 
  Maximize2, ChevronRight, X, CloudRain, Package, Truck, Clock, Navigation, AlertCircle, Zap
} from 'lucide-react';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean }> {
  constructor(props: any) { super(props); this.state = { hasError: false }; }
  static getDerivedStateFromError() { return { hasError: true }; }
  render() {
    if (this.state.hasError) return (
      <div className="flex-1 h-full min-h-[500px] flex items-center justify-center bg-surface-container-low/50 rounded-2xl border border-dashed border-error/30 text-error">
        <div className="text-center group p-8">
          <span className="material-symbols-outlined text-4xl mb-4 group-hover:rotate-12 transition-transform">map_error</span>
          <p className="text-[10px] font-black uppercase tracking-widest leading-loose">Map Protocol Failure:<br/>Tile Server Connection Interrupted</p>
        </div>
      </div>
    );
    return this.props.children;
  }
}

const MapLayout = dynamic(() => import('@/components/MapLayout'), { ssr: false, loading: () => (
  <div className="flex-1 h-full min-h-[500px] flex items-center justify-center bg-surface-container-low/50 rounded-2xl border border-white shadow-inner">
    <div className="flex flex-col items-center gap-4">
      <div className="relative">
        <MapIcon size={32} className="text-outline-variant" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
      <p className="text-on-surface-variant text-[10px] font-black uppercase tracking-widest">Initializing Protocol...</p>
    </div>
  </div>
)});

type MapFilterType = 'All Routes' | 'Active Only' | 'At Risk';
type ModeFilterType = 'All' | 'road' | 'rail' | 'air' | 'sea' | 'risk';

export default function MapPage() {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [highlighted, setHighlighted] = useState<string | null>(null);
  const [mapFilter, setMapFilter] = useState<MapFilterType>('All Routes');
  const [modeFilter, setModeFilter] = useState<ModeFilterType>('All');
  const [isFullscreen, setIsFullscreen] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }
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

  const mapShipments = useMemo(() => {
    return shipments.filter(s => {
      if (mapFilter === 'Active Only' && s.status !== 'in_transit') return false;
      if (mapFilter === 'At Risk' && s.risk_score < 60 && s.status !== 'delayed') return false;
      return true;
    });
  }, [shipments, mapFilter]);

  const leftPanelShipments = useMemo(() => {
    return mapShipments.filter(s => {
      if (modeFilter === 'All') return true;
      if (modeFilter === 'risk') return s.risk_score >= 60 || s.status === 'delayed';
      return s.mode === modeFilter;
    });
  }, [mapShipments, modeFilter]);

  const leftFilterLabels: Record<ModeFilterType, string> = {
    'All': 'All', 'road': 'Truck', 'rail': 'Rail', 'air': 'Air', 'sea': 'Ship', 'risk': 'At Risk'
  };

  if (loading) return (
    <div className="flex items-center justify-center h-[calc(100vh-12rem)]">
      <div className="status-pulse bg-primary w-12 h-12"></div>
    </div>
  );

  return (
    <div className={`flex flex-col ${isFullscreen ? 'fixed inset-0 z-[1000] bg-surface p-12' : 'h-[calc(100vh-12rem)]'} overflow-hidden font-['Inter'] tracking-tight`}>
      <div className="flex flex-1 overflow-hidden relative gap-6">
        
        {/* Left Panel: Active Units */}
        <div className="w-[360px] shrink-0 bg-surface-container-lowest rounded-2xl border border-white/50 curated-shadow flex flex-col z-10 overflow-hidden">
          <div className="p-8 border-b border-surface-container flex items-center justify-between">
            <div>
              <h2 className="text-xl font-black text-on-surface tracking-tighter">Active Units</h2>
              <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mt-1">{leftPanelShipments.length} Active nodes</p>
            </div>
          </div>
          
          <div className="p-4 border-b border-surface-container flex gap-2 overflow-x-auto custom-scrollbar no-scrollbar whitespace-nowrap">
            {(Object.keys(leftFilterLabels) as ModeFilterType[]).map(key => (
              <button 
                key={key} 
                onClick={() => setModeFilter(key)}
                className={`px-4 py-2 text-[10px] font-bold rounded-xl transition-all ${
                  modeFilter === key ? 'bg-primary text-on-primary shadow-sm shadow-primary/20' : 'bg-surface-container-low text-on-surface-variant hover:text-on-surface'
                } uppercase tracking-widest`}
              >
                {leftFilterLabels[key]}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
            {leftPanelShipments.map(s => {
              const isSelected = highlighted === s.id;
              const isRed = s.status === 'delayed';
              const isYellow = s.risk_score > 60 && !isRed;
              return (
                <div 
                  key={s.id} 
                  onClick={() => setHighlighted(isSelected ? null : s.id)}
                  className={`p-6 rounded-2xl cursor-pointer transition-all border ${
                    isSelected ? 'bg-primary-fixed border-primary/20 shadow-sm' : 'bg-surface-container-low border-transparent hover:border-outline-variant/30'
                  }`}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="text-[13px] font-black text-on-surface tracking-tight leading-tight">
                      {s.origin} <span className="text-outline-variant font-normal">→</span> {s.destination}
                    </div>
                    <div className="w-8 h-8 rounded-lg bg-surface-container-lowest border border-white/50 flex items-center justify-center text-primary shadow-sm">
                      <span className="text-[14px]">{modeIcon(s.mode)}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-on-surface-variant flex items-center gap-1.5 uppercase tracking-widest">
                      <Clock size={12}/> {format(new Date(s.eta), 'dd MMM')}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className={`status-pulse ${isRed ? 'bg-error' : isYellow ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                      <span className={`text-[9px] font-black uppercase tracking-widest ${isRed ? 'text-error' : 'text-on-surface-variant'}`}>
                        {isRed ? 'Delayed' : isYellow ? 'At Risk' : 'Optimal'}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Center Map Container */}
        <div className="flex-1 relative bg-surface-container-low rounded-2xl overflow-hidden border border-white/50 curated-shadow">
          <ErrorBoundary>
            <MapLayout shipments={mapShipments} highlighted={highlighted} />
          </ErrorBoundary>

          {/* Top Map Controls */}
          <div className="absolute top-8 left-1/2 -translate-x-1/2 z-[1000] flex gap-2 p-2 bg-surface-container-lowest/80 backdrop-blur-xl border border-white/50 rounded-full shadow-xl">
            {(['All Routes', 'Active Only', 'At Risk'] as MapFilterType[]).map(f => (
              <button 
                key={f} 
                onClick={() => setMapFilter(f)}
                className={`px-5 py-2 text-[10px] font-bold rounded-full transition-all uppercase tracking-widest ${
                  mapFilter === f ? 'bg-primary text-on-primary shadow-md shadow-primary/20' : 'text-on-surface-variant hover:bg-surface-container-lowest'
                }`}
              >
                {f}
              </button>
            ))}
            <button onClick={() => setIsFullscreen(!isFullscreen)} className="w-9 h-9 flex items-center justify-center text-on-surface-variant hover:bg-surface-container-lowest rounded-full transition-all">
              <Maximize2 size={16} />
            </button>
          </div>

          {/* Right Floating Panel: Strategic Details */}
          <AnimatePresence>
            {highlighted && selectedShipment && (
              <motion.div 
                initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
                className="absolute right-8 top-8 bottom-8 w-[380px] z-[1000] bg-surface-container-lowest rounded-2xl border border-white/50 curated-shadow shadow-2xl flex flex-col overflow-hidden"
              >
                <div className="p-8 border-b border-surface-container flex items-center justify-between bg-surface-container-low/30">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-surface-container-lowest border border-white/50 flex items-center justify-center text-primary shadow-sm">
                      <span className="text-[20px]">{modeIcon(selectedShipment.mode)}</span>
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-on-surface tracking-tighter leading-none">{selectedShipment.shipment_code}</h3>
                      <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mt-1.5">{selectedShipment.cargo_type || 'Manifested unit'}</p>
                    </div>
                  </div>
                  <button onClick={() => setHighlighted(null)} className="w-8 h-8 flex items-center justify-center bg-surface-container-lowest rounded-lg border border-white/50 text-on-surface-variant hover:text-on-surface transition-all">
                    <X size={16} />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
                  <div>
                    <p className="text-label-md text-on-surface-variant mb-4">Route Trajectory</p>
                    <div className="space-y-6 relative pl-6 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[1px] before:bg-surface-container">
                      <div className="relative">
                        <div className="absolute -left-[23px] top-1.5 w-3 h-3 rounded-full border border-surface-container-lowest bg-surface-container" />
                        <div className="font-bold text-sm text-on-surface leading-tight">{selectedShipment.origin}</div>
                        <div className="text-[10px] text-on-surface-variant font-medium">Standardized Origin Hub</div>
                      </div>
                      <div className="relative">
                        <div className="absolute -left-[23px] top-1.5 w-3 h-3 rounded-full border border-surface-container-lowest bg-primary status-pulse" />
                        <div className="font-bold text-sm text-on-surface leading-tight">{selectedShipment.destination}</div>
                        <div className="text-[10px] text-on-surface-variant font-medium">Arrival Terminal</div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { label: 'Carrier Mode', val: selectedShipment.mode },
                      { label: 'Manifest Mass', val: `${selectedShipment.weight_kg}kg` },
                      { label: 'Protocol ETA', val: format(new Date(selectedShipment.eta), 'dd MMM') },
                      { label: 'Risk Vector', val: `${selectedShipment.risk_score}/100` },
                    ].map((m, i) => (
                      <div key={i} className="p-4 bg-surface-container-low rounded-2xl border border-white/50">
                        <p className="text-[9px] font-bold text-on-surface-variant uppercase tracking-widest mb-1">{m.label}</p>
                        <p className="text-[13px] font-black text-on-surface capitalize truncate">{m.val}</p>
                      </div>
                    ))}
                  </div>

                  <div className={`p-6 rounded-2xl border ${selectedShipment.risk_score > 60 ? 'bg-error/5 border-error/10 text-error' : 'bg-primary/5 border-primary/10 text-primary'}`}>
                    <div className="flex items-center gap-2 mb-3">
                      <Activity size={16} />
                      <p className="text-[10px] font-black uppercase tracking-[0.1em]">Atmospheric Intelligence</p>
                    </div>
                    <p className="text-[12px] font-medium leading-relaxed italic opacity-80">
                      {selectedShipment.risk_score > 60 ? 'Significant operational drift detected. High risk factor due to terminal congestion and weather patterns.' : 'Parameters stable. Optimal transit protocol confirmed by neural analysis.'}
                    </p>
                  </div>

                  <button className="btn-precision-primary py-4 text-[11px] uppercase tracking-widest w-full">
                    Deploy Strategic Details
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
