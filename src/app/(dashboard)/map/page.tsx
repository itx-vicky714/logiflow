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
import { getRouteWeatherRisk } from '@/lib/weather';
import { motion, AnimatePresence } from 'framer-motion';
import ShipmentDetailModal from '@/components/ShipmentDetailModal';

const MapLayout = dynamic(() => import('@/components/MapLayout'), { ssr: false, loading: () => (
  <div className="flex-1 h-full min-h-[500px] flex items-center justify-center bg-slate-50/50 rounded-2xl border border-slate-100 shadow-inner">
    <div className="flex flex-col items-center gap-4">
      <div className="relative">
        <MapIcon size={32} className="text-slate-200" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
      <p className="text-slate-400 text-xs font-black uppercase tracking-widest">Initializing Geo-Spatial Engine...</p>
    </div>
  </div>
)});

type FilterType = 'All' | 'Active' | 'At Risk' | 'AI Fit';

export default function MapPage() {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [highlighted, setHighlighted] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterType>('All');
  const [modeFilter, setModeFilter] = useState<string>('all');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await seedShipments(user.id);
    const { data } = await supabase.from('shipments')
      .select('*')
      .eq('user_id', user.id)
      .neq('status', 'delivered')
      .order('risk_score', { ascending: false });
    if (data) setShipments(data);
    setLoading(false);
  }, []);

  const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  const highlightParam = searchParams?.get('highlight');
  const filterParam = searchParams?.get('filter');

  useEffect(() => { 
    fetchData(); 
  }, [fetchData]);

  useEffect(() => {
    if (filterParam && ['All', 'Active', 'At Risk', 'AI Fit'].includes(filterParam)) {
      setActiveFilter(filterParam as FilterType);
    }
  }, [filterParam]);

  useEffect(() => {
    if (highlightParam && shipments.length > 0) {
      setHighlighted(highlightParam);
    }
  }, [highlightParam, shipments]);

  const selectedShipment = useMemo(() => 
    shipments.find(s => s.id === highlighted), 
  [shipments, highlighted]);

  const fetchAiRisk = useCallback(async (s: Shipment) => {
    setIsAiLoading(true);
    setAiAnalysis(null);
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `Perform a detailed risk-scan analysis for shipment ${s.shipment_code} from ${s.origin} to ${s.destination}. Mode: ${s.mode}, Weight: ${s.weight_kg}kg, Score: ${s.risk_score}. Context: risk_analysis`,
          shipments: [s]
        })
      });
      const data = await res.json();
      setAiAnalysis(data.text);
    } catch (e) {
      setAiAnalysis(s.risk_score > 70 ? "High risk zone detected. Operational drift imminent." : "Stable transit parameters confirmed.");
    } finally {
      setIsAiLoading(false);
    }
  }, []);

  useEffect(() => {
    if (highlighted && selectedShipment) {
      fetchAiRisk(selectedShipment);
    } else {
      setAiAnalysis(null);
    }
  }, [highlighted, selectedShipment, fetchAiRisk]);

  const filtered = useMemo(() => {
    return shipments.filter(s => {
      if (modeFilter !== 'all' && s.mode !== modeFilter) return false;
      if (activeFilter === 'Active' && s.status !== 'in_transit') return false;
      if (activeFilter === 'At Risk') {
        const wr = getRouteWeatherRisk(s.origin, s.destination);
        if (s.risk_score < 60 && wr.overallRisk < 50 && s.status !== 'delayed') return false;
      }
      if (activeFilter === 'AI Fit') {
        if (s.risk_score >= 40 || s.status !== 'in_transit') return false;
      }
      return true;
    });
  }, [shipments, activeFilter, modeFilter]);

  const mapShipments = highlighted ? filtered.filter(s => s.id === highlighted) : filtered;

  return (
    <div className={`space-y-4 flex flex-col transition-all duration-300 ${isFullscreen ? 'fixed inset-0 z-[1000] bg-[#f8fafc] p-6' : 'h-[calc(100vh-8rem)] pt-4'}`}>
      
      {/* Header Container */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 shrink-0 bg-white/70 backdrop-blur-xl p-5 rounded-3xl border border-slate-200/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-3">
             <div className="w-10 h-10 bg-[#3350e9] text-white rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200">
               <Navigation size={22} />
             </div>
             LogiFlow Control Center
             <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.8)] animate-pulse" />
          </h1>
          <p className="text-[11px] font-bold text-slate-400 mt-1 uppercase tracking-[0.2em] ml-[52px]">Strategic Fleet Intelligence</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center p-1 bg-slate-50 border border-slate-200 rounded-2xl shadow-inner">
            {(['All', 'Active', 'At Risk', 'AI Fit'] as FilterType[]).map(f => (
              <button key={f} onClick={() => { setActiveFilter(f); setHighlighted(null); }}
                className={`flex items-center gap-2 px-4 py-2 text-[11px] font-black rounded-xl transition-all ${
                  activeFilter === f ? 'bg-white text-slate-900 shadow-md border border-slate-200' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {f}
              </button>
            ))}
          </div>

          <button onClick={fetchData} className="p-3 text-slate-400 hover:text-[#3b5bdb] hover:bg-indigo-50 border border-slate-200 bg-white rounded-2xl shadow-sm transition-all active:scale-95" title="Recalibrate Sensors">
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
          
          <button onClick={() => setIsFullscreen(!isFullscreen)} className="p-3 text-slate-400 hover:text-slate-800 hover:bg-slate-100 border border-slate-200 bg-white rounded-2xl shadow-sm transition-all active:scale-95 hidden lg:block">
            <Maximize2 size={18} />
          </button>
        </div>
      </div>

      <div className="flex-1 flex gap-0 relative overflow-hidden group/layout bg-slate-100 rounded-[2.5rem] border border-slate-200/50 shadow-inner">
        {/* Map Area - THE FOUNDATION */}
        <div className="flex-1 relative z-10 bg-white">
          <MapLayout shipments={mapShipments} highlighted={highlighted} />
          <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_120px_rgba(15,23,42,0.05)] z-20" />
          
          {/* Floating Manifest Panel - Non-blocking */}
          <div className="absolute top-6 left-6 z-[60] w-[320px] max-h-[calc(100vh-22rem)] pointer-events-none">
            <div className="pointer-events-auto bg-slate-900/40 backdrop-blur-xl border border-white/10 rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.3)] overflow-hidden flex flex-col">
              <div className="px-6 py-5 border-b border-white/5 flex items-center justify-between bg-white/5">
                <h3 className="text-[10px] font-black text-blue-400 uppercase tracking-[0.2em] flex items-center gap-2.5">
                  <Activity size={14} className="animate-pulse"/> LIVE MANIFEST
                </h3>
                <span className="bg-blue-500/10 text-blue-400 text-[9px] font-black px-2 py-0.5 rounded-lg border border-blue-500/20">{filtered.length} NODES</span>
              </div>
              
              <div className="overflow-y-auto p-3 space-y-2 max-h-[380px] no-scrollbar">
                {filtered.map(s => {
                  const sc = statusConfig(s.status);
                  const isSelected = highlighted === s.id;
                  return (
                    <motion.div 
                      key={s.id} 
                      onClick={() => setHighlighted(isSelected ? null : s.id)}
                      className={`p-4 rounded-3xl cursor-pointer transition-all duration-300 border ${
                        isSelected ? 'bg-white/10 border-blue-500/50 shadow-[0_0_20px_rgba(59,130,246,0.2)]' : 'bg-white/5 border-white/5 hover:bg-white/10'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-mono text-[8px] tracking-[0.2em] text-slate-400 font-black uppercase mb-1 flex items-center gap-2">
                            {s.shipment_code}
                          </div>
                          <div className="text-[12px] font-black text-white tracking-tight">
                            {s.origin} <span className="text-slate-600 px-0.5">→</span> {s.destination}
                          </div>
                        </div>
                        <div className="shrink-0 text-blue-400 opacity-80">
                          {modeIcon(s.mode)}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mt-3">
                        <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-lg border ${sc.bg} ${sc.text} border-current/20`}>
                          {sc.label}
                        </span>
                        <div className="flex-1" />
                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-tighter">{s.risk_score}% RISK</span>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Right Detail Panel - Integrated Side-by-side */}
        <AnimatePresence>
          {highlighted && selectedShipment && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 440, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ type: 'spring', damping: 30, stiffness: 200 }}
              className="shrink-0 bg-white border-l border-slate-200 z-[100] flex flex-col overflow-hidden shadow-2xl"
            >
              {/* Panel Header */}
              <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/30">
                <div className="flex items-center gap-5">
                  <div className="w-14 h-14 rounded-2xl bg-slate-900 text-white flex items-center justify-center shadow-xl">
                    {modeIcon(selectedShipment.mode)}
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-900 tracking-tight leading-none">{selectedShipment.shipment_code}</h3>
                    <p className="text-[10px] font-black text-indigo-500 mt-2 uppercase tracking-[0.2em]">{selectedShipment.cargo_type || 'Strategic Manifest'}</p>
                  </div>
                </div>
                <button onClick={() => setHighlighted(null)} className="p-2.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-2xl transition-all active:scale-90">
                  <X size={20} />
                </button>
              </div>

              {/* Panel Content */}
              <div className="flex-1 overflow-y-auto p-8 space-y-10 no-scrollbar">
                {/* Visual Metadata Grid */}
                <div className="grid grid-cols-2 gap-5">
                  <div className="bg-slate-50/80 rounded-3xl p-5 border border-slate-100 group hover:border-[#3b5bdb]/20 transition-all">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 group-hover:text-[#3b5bdb]">Market Valuation</p>
                    <p className="text-xl font-black text-slate-900 tabular-nums">{formatCurrency(selectedShipment.declared_value ?? 0)}</p>
                  </div>
                  <div className="bg-slate-50/80 rounded-3xl p-5 border border-slate-100 group hover:border-[#3b5bdb]/20 transition-all">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 group-hover:text-[#3b5bdb]">Telemetry Mass</p>
                    <p className="text-xl font-black text-slate-900 tabular-nums">{selectedShipment.weight_kg} kg</p>
                  </div>
                </div>

                {/* Vertical Logistics Chain */}
                <div className="space-y-6">
                  <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#3b5bdb]" /> Logic Flow Persistence
                  </h4>
                  <div className="relative pl-8 space-y-10 before:absolute before:left-[15px] before:top-2 before:bottom-2 before:w-px before:bg-slate-200">
                    <div className="relative">
                      <div className="absolute -left-[23px] top-1.5 w-4 h-4 rounded-full border-[3px] border-white bg-slate-900 shadow-sm" />
                      <div className="font-black text-[15px] text-slate-900">{selectedShipment.origin}</div>
                      <div className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1.5">Origin Node · Dispatch Confirmed</div>
                    </div>
                    <div className="relative">
                      <div className="absolute -left-[23px] top-1.5 w-4 h-4 rounded-full border-[3px] border-white bg-indigo-500 shadow-md animate-pulse" />
                      <div className="font-black text-[15px] text-slate-900">Active Transit Corridor</div>
                      <div className="text-[10px] text-indigo-500 font-black uppercase tracking-widest mt-1.5 flex items-center gap-2">
                        <Zap size={12} fill="currentColor"/> Real-time Telemetry Live
                      </div>
                    </div>
                    <div className="relative">
                      <div className="absolute -left-[23px] top-1.5 w-4 h-4 rounded-full border-[3px] border-white bg-slate-200 shadow-sm" />
                      <div className="font-black text-[15px] text-slate-900">{selectedShipment.destination}</div>
                      <div className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1.5">Terminal Arrival · ETA {new Date(selectedShipment.eta).toLocaleDateString()}</div>
                    </div>
                  </div>
                </div>

                {/* Intelligence Assessment */}
                <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform duration-700"><Sparkles size={80}/></div>
                  <div className="relative z-10">
                    <div className="flex items-center gap-4 mb-6">
                      <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20">
                        <ShieldAlert size={20} className="text-indigo-400" />
                      </div>
                      <h4 className="text-xs font-black uppercase tracking-[0.25em]">Neural Risk Scan</h4>
                    </div>
                    <p className="text-[14px] font-bold text-slate-300 leading-relaxed mb-8">
                      {isAiLoading ? (
                        <span className="flex items-center gap-2 animate-pulse">
                          <RefreshCw size={14} className="animate-spin" /> Analyzing trajectory...
                        </span>
                      ) : aiAnalysis || (selectedShipment.risk_score > 60 
                        ? 'Operational drift detected. Environmental factors indicate potential delivery window escalation.' 
                        : 'Current trajectory remains within nominal operational bounds.')}
                    </p>
                    <div className="flex items-center justify-between">
                       <span className="text-[10px] font-black uppercase tracking-widest text-[#3b5bdb] px-3 py-1.5 bg-white rounded-full">Score: {selectedShipment.risk_score}/100</span>
                       <button 
                         onClick={() => setIsModalOpen(true)}
                         className="text-[10px] font-black uppercase tracking-widest text-white/60 hover:text-white transition-colors flex items-center gap-1.5"
                       >
                         Analyze Full Path <ChevronRight size={12} />
                       </button>
                    </div>
                  </div>
                </div>

                {/* Hard Actions */}
                <div className="pt-4 flex flex-col gap-4">
                   <button className="w-full h-[64px] bg-[#3b5bdb] text-white rounded-[2rem] text-[13px] font-black uppercase tracking-[0.2em] hover:bg-indigo-600 transition-all shadow-2xl shadow-indigo-200 active:scale-95 flex items-center justify-center gap-3">
                     Command Ops Deck
                   </button>
                   <button className="w-full h-[64px] bg-white text-slate-900 border-2 border-slate-100 rounded-[2rem] text-[13px] font-black uppercase tracking-[0.2em] hover:bg-slate-50 transition-all active:scale-95">
                      Export Manifest
                   </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {isModalOpen && selectedShipment && (
        <ShipmentDetailModal 
          onClose={() => setIsModalOpen(false)} 
          shipment={selectedShipment} 
          onUpdate={fetchData}
        />
      )}
    </div>
  );
}
