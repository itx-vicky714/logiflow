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

type MapFilterType = 'All Routes' | 'Active Only' | 'At Risk' | 'Fit All';
type ModeFilterType = 'All' | 'road' | 'rail' | 'air' | 'sea' | 'risk';

export default function MapPage() {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [highlighted, setHighlighted] = useState<string | null>(null);
  
  // Top Controls Filter
  const [mapFilter, setMapFilter] = useState<MapFilterType>('All Routes');
  
  // Left Panel Filter
  const [modeFilter, setModeFilter] = useState<ModeFilterType>('All');
  
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

  useEffect(() => { 
    fetchData(); 
  }, [fetchData]);

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

  const mapShipments = useMemo(() => {
    return shipments.filter(s => {
      // Apply top control filters
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

  // Provide a quick label mapping for filters
  const leftFilterLabels: Record<ModeFilterType, string> = {
    'All': 'All', 'road': 'Truck', 'rail': 'Rail', 'air': 'Air', 'sea': 'Ship', 'risk': 'At Risk'
  };

  const getProgress = (s: Shipment) => s.status === 'delivered' ? 100 : s.status === 'pending' ? 10 : Math.max(15, Math.ceil(100 - s.risk_score));

  return (
    <div className={`flex flex-col ${isFullscreen ? 'fixed inset-0 z-[1000] bg-white' : 'h-[calc(100vh-6rem)] -mt-2'} overflow-hidden`}>
      <div className="flex flex-1 overflow-hidden relative">
        
        {/* ======================= LEFT PANEL ======================= */}
        <div className="w-[320px] shrink-0 bg-white shadow-md border-r border-slate-200 flex flex-col z-10">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-xl font-black text-slate-800 tracking-tight">Active Units</h2>
            <div className="bg-slate-100 text-slate-600 text-xs font-bold px-2.5 py-1 rounded-full">{leftPanelShipments.length}</div>
          </div>
          
          {/* Left Panel Filters */}
          <div className="p-3 border-b border-slate-100 custom-scrollbar overflow-x-auto whitespace-nowrap">
            <div className="flex gap-2">
              {(Object.keys(leftFilterLabels) as ModeFilterType[]).map(key => (
                <button 
                  key={key} 
                  onClick={() => setModeFilter(key)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors border ${
                    modeFilter === key ? 'bg-primary text-white border-primary shadow-sm' : 'bg-slate-50 text-slate-500 hover:bg-slate-100 border-slate-200'
                  }`}
                >
                  {leftFilterLabels[key]}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
            {leftPanelShipments.map(s => {
              const sc = statusConfig(s.status);
              const isSelected = highlighted === s.id;
              
              const isRed = s.status === 'delayed';
              const isYellow = s.risk_score > 60 && !isRed;
              const isGreen = !isRed && !isYellow;

              const badgeColor = isRed ? 'bg-red-100 text-red-700 border-red-200' : 
                                 isYellow ? 'bg-amber-100 text-amber-700 border-amber-200' : 
                                 'bg-emerald-100 text-emerald-700 border-emerald-200';
              const badgeText = isRed ? 'Delayed' : isYellow ? 'At Risk' : 'On Time';

              return (
                <div 
                  key={s.id} 
                  onClick={() => setHighlighted(isSelected ? null : s.id)}
                  className={`p-4 rounded-xl cursor-pointer transition-all border ${
                    isSelected ? 'bg-blue-50 border-primary shadow-[0_0_0_1px_rgba(59,130,246,1)]' : 'bg-white border-slate-200 shadow-sm hover:border-slate-300 hover:shadow'
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="text-[13px] font-black text-slate-800 tracking-tight">
                      {s.origin} <span className="text-slate-400 font-normal px-1">→</span> {s.destination}
                    </div>
                    <div className="text-slate-500">{modeIcon(s.mode)}</div>
                  </div>
                  
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
                      <Clock size={12}/> ETA: {new Date(s.eta).toLocaleDateString()}
                    </span>
                    <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border ${badgeColor}`}>
                      {badgeText}
                    </span>
                  </div>

                  <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${isRed ? 'bg-red-500' : isYellow ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${getProgress(s)}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ======================= CENTER MAP CONTAINER ======================= */}
        <div className="flex-1 relative bg-slate-50 overflow-hidden">
          
          {/* Top Controls Overlay */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] flex gap-2 p-1.5 bg-white shadow-md border border-slate-200 rounded-full">
            {(['All Routes', 'Active Only', 'At Risk', 'Fit All'] as MapFilterType[]).map(f => (
              <button 
                key={f} 
                onClick={() => setMapFilter(f)}
                className={`px-4 py-2 text-xs font-bold rounded-full transition-all ${
                  mapFilter === f ? 'bg-primary text-white shadow-sm' : 'bg-transparent text-slate-500 hover:bg-slate-100 hover:text-slate-800'
                }`}
              >
                {f}
              </button>
            ))}
            <button onClick={() => setIsFullscreen(!isFullscreen)} className="px-3 py-2 text-slate-400 hover:bg-slate-100 hover:text-slate-800 rounded-full transition-all">
              <Maximize2 size={16} />
            </button>
          </div>

          <MapLayout shipments={mapShipments} highlighted={highlighted} />

          {/* ======================= RIGHT DATA PANEL (FLOATING) ======================= */}
          <AnimatePresence>
            {highlighted && selectedShipment && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="absolute right-6 top-6 bottom-6 z-[1000] w-[340px] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden"
              >
                <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white text-primary border border-slate-200 flex items-center justify-center shadow-sm">
                      {modeIcon(selectedShipment.mode)}
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-slate-800 leading-none">{selectedShipment.shipment_code}</h3>
                      <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">{selectedShipment.cargo_type || 'General Cargo'}</p>
                    </div>
                  </div>
                  <button onClick={() => setHighlighted(null)} className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-200 rounded-xl transition-all">
                    <X size={16} />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-5 space-y-6">
                  
                  {/* Route Block */}
                  <div>
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Transit Route</h4>
                    <div className="relative pl-6 space-y-4 before:absolute before:left-[9px] before:top-2 before:bottom-2 before:w-[2px] before:bg-slate-200">
                      <div className="relative">
                        <div className="absolute -left-[23px] top-1.5 w-3 h-3 rounded-full border-2 border-white bg-slate-400" />
                        <div className="font-bold text-sm text-slate-800">{selectedShipment.origin}</div>
                      </div>
                      <div className="relative">
                        <div className="absolute -left-[23px] top-1.5 w-3 h-3 rounded-full border-2 border-white bg-primary shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                        <div className="font-bold text-sm text-slate-800">{selectedShipment.destination}</div>
                      </div>
                    </div>
                  </div>

                  {/* Metrics */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Mode</p>
                      <p className="text-sm font-black text-slate-800 capitalize">{selectedShipment.mode}</p>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Weight</p>
                      <p className="text-sm font-black text-slate-800">{selectedShipment.weight_kg} kg</p>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Supplier</p>
                      <p className="text-sm font-black text-slate-800 truncate">{selectedShipment.supplier_name || 'N/A'}</p>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">ETA</p>
                      <p className="text-sm font-black text-slate-800">{new Date(selectedShipment.eta).toLocaleDateString()}</p>
                    </div>
                  </div>

                  {/* Progress */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                       <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Progress</h4>
                       <span className="text-xs font-bold text-primary">{getProgress(selectedShipment)}%</span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${getProgress(selectedShipment)}%` }} />
                    </div>
                  </div>

                  {/* Risk Summary (Red Box as requested if risk is high, or standard if ok) */}
                  <div className={`p-4 rounded-xl border ${selectedShipment.risk_score > 60 || selectedShipment.status === 'delayed' ? 'bg-red-50 border-red-200' : 'bg-emerald-50 border-emerald-200'}`}>
                    <div className="flex gap-2 items-center mb-2">
                      <AlertCircle size={16} className={selectedShipment.risk_score > 60 || selectedShipment.status === 'delayed' ? 'text-red-600' : 'text-emerald-600'} />
                      <h4 className={`text-xs font-black uppercase tracking-widest ${selectedShipment.risk_score > 60 || selectedShipment.status === 'delayed' ? 'text-red-800' : 'text-emerald-800'}`}>Risk Analysis</h4>
                    </div>
                    <p className={`text-xs font-semibold leading-relaxed ${selectedShipment.risk_score > 60 || selectedShipment.status === 'delayed' ? 'text-red-700' : 'text-emerald-700'}`}>
                      {isAiLoading ? 'Analyzing trajectory risk...' : aiAnalysis || (selectedShipment.risk_score > 60 ? 'High risk zone detected. Operational delays highly probable based on current vectors.' : 'All operational parameters stable. No immediate risks flagged.')}
                    </p>
                  </div>

                  <button onClick={() => setIsModalOpen(true)} className="w-full py-3 bg-primary text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-blue-600 transition-all shadow-md active:scale-95">
                    View Full Details
                  </button>

                </div>
              </motion.div>
            )}
          </AnimatePresence>

        </div>
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
