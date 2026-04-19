"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import type { Shipment, Driver } from '@/types';
import { statusConfig, modeIcon, modeLabel, riskColor, riskLabel, formatCurrency, estimateRevenue, CITY_COORDS } from '@/lib/utils';
import { getRouteWeatherRisk, getWeatherRiskColor } from '@/lib/weather';
import { X, Loader2, MapPin, Shield, Truck, GitBranch, Mail, MessageSquare, CheckCircle, AlertTriangle, Send, ChevronRight, Clock, CloudLightning, Package, IndianRupee, Zap, User, Sparkles, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { format, addHours, subHours } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  shipment: Shipment;
  onClose: () => void;
  onUpdate: () => void;
}

type Tab = 'overview' | 'fleet' | 'risk' | 'weather' | 'timeline';

interface DispatchRoute {
  stops?: { label: string; lat?: number; lng?: number }[];
  current_stop_index?: number;
  drivers?: {
    full_name?: string;
    license_number?: string;
    phone?: string;
    rating?: number;
  };
  status?: string;
  [key: string]: unknown;
}

export default function ShipmentDetailModal({ shipment: initialShipment, onClose, onUpdate }: Props) {
  const [shipment, setShipment] = useState(initialShipment);
  const [tab, setTab] = useState<Tab>('overview');
  const [aiRisk, setAiRisk] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [activeDispatch, setActiveDispatch] = useState<DispatchRoute | null>(null);
  const [assigning, setAssigning] = useState(false);
  const [selectedDriverId, setSelectedDriverId] = useState('');
  const [emailModal, setEmailModal] = useState(false);
  const [emailPreview, setEmailPreview] = useState({ to: '', subject: '', body: '' });

  const sc = statusConfig(shipment.status);
  const weatherRisk = getRouteWeatherRisk(shipment.origin, shipment.destination);
  const createdAt = new Date(shipment.created_at);
  const etaDate = new Date(shipment.eta);
  const calculateProgress = () => {
    if (shipment.status === 'delivered') return 100;
    if (shipment.status === 'pending') return 0;
    const start = new Date(shipment.created_at).getTime();
    const end = new Date(shipment.eta).getTime();
    const now = Date.now();
    if (now >= end) return 95; // Almost there if past ETA
    const total = end - start;
    const current = now - start;
    return Math.min(Math.max(Math.round((current / total) * 100), 10), 98);
  };
  const progress = calculateProgress();
  const approxKm = 1240;

  useEffect(() => {
    if (tab === 'risk' && !aiRisk) {
      setAiLoading(true);
      fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: `Analyze risk for shipment ${shipment.shipment_code} from ${shipment.origin} to ${shipment.destination}. Mass: ${shipment.weight_kg}kg, Mode: ${shipment.mode}. Current risk score: ${shipment.risk_score}.`,
          history: [] 
        })
      })
      .then(res => res.json())
      .then(data => setAiRisk(data.text || 'Protocol anomaly: Narrative diagnostic unreachable.'))
      .catch(() => setAiRisk('Secure terminal linkage failure during risk synthesis.'))
      .finally(() => setAiLoading(false));
    }
  }, [tab, shipment, aiRisk]);

  useEffect(() => {
    if (tab === 'fleet') {
        const fetchFleet = async () => {
            const { data: dData } = await supabase.from('drivers').select('*').eq('status', 'available');
            if (dData) setDrivers(dData);
            const { data: dispData } = await supabase.from('dispatch_routes').select('*, drivers(*)').eq('shipment_id', shipment.id).single();
            if (dispData) setActiveDispatch(dispData);
        };
        fetchFleet();
    }
  }, [tab, shipment.id]);

  const handleAssignDriver = async () => {
      const selectedDriver = drivers.find(d => d.id === selectedDriverId);
      if (!selectedDriver) return;
      setAssigning(true);
      try {
          const startCoord = CITY_COORDS[shipment.origin] || [20, 78];
          const endCoord = CITY_COORDS[shipment.destination] || [21, 79];
          
          const midLat = (startCoord[0] + endCoord[0]) / 2;
          const midLng = (startCoord[1] + endCoord[1]) / 2;

          const { data, error } = await supabase.from('dispatch_routes').insert({
              shipment_id: shipment.id,
              driver_id: selectedDriverId,
              status: 'active',
              stops: [
                  { lat: startCoord[0], lng: startCoord[1], label: shipment.origin },
                  { lat: midLat, lng: midLng, label: 'Mid-Transit Node' },
                  { lat: endCoord[0], lng: endCoord[1], label: shipment.destination }
              ],
              current_stop_index: 0
          }).select('*, drivers(*)').single();
          if (error) throw error;
          await supabase.from('drivers').update({ status: 'on_trip' }).eq('id', selectedDriverId);
          setActiveDispatch(data);
          toast.success('Fleet unit assigned');
      } catch (err: any) {
          toast.error(err.message || 'Assignment failed');
      } finally {
          setAssigning(false);
      }
  };

  const tabs: { id: Tab; label: string; icon: any }[] = [
    { id: 'overview', label: 'Manifest', icon: MapPin },
    { id: 'fleet',    label: 'Units',    icon: Truck },
    { id: 'risk',     label: 'Intelligence', icon: Shield },
    { id: 'weather',  label: 'Atmosphere', icon: CloudLightning },
    { id: 'timeline', label: 'History', icon: Clock },
  ];

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-6 font-['Inter']">
      <motion.div 
        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        className="absolute inset-0 bg-on-surface/40 backdrop-blur-md" 
        onClick={onClose} 
      />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="relative bg-white rounded-[3rem] shadow-2xl w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden border border-white"
      >
        {/* Header */}
        <div className="p-10 pb-6 shrink-0 flex items-start justify-between">
           <div>
              <div className="flex items-center gap-3 mb-2">
                 <span className="text-[12px] font-black text-slate-400 uppercase tracking-[0.3em]">Operational Node</span>
                 <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              </div>
              <div className="flex items-center gap-4">
                 <h2 className="text-4xl font-black text-on-surface tracking-tighter uppercase">{shipment.shipment_code}</h2>
                 <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${sc.bg} ${sc.text} border border-white shadow-sm`}>
                    {sc.label}
                 </div>
                 <div className="px-4 py-1.5 bg-surface-container-low rounded-full text-[10px] font-black uppercase tracking-widest text-slate-600 border border-slate-100 flex items-center gap-2">
                    {modeIcon(shipment.mode)} {modeLabel(shipment.mode)}
                 </div>
              </div>
              <div className="mt-6 flex items-center gap-3 text-on-surface font-bold text-lg italic">
                 <span>{shipment.origin}</span>
                 <ArrowRight size={18} className="text-slate-300" />
                 <span>{shipment.destination}</span>
              </div>
           </div>
           
           <button onClick={onClose} className="w-12 h-12 rounded-2xl bg-surface-container-low flex items-center justify-center hover:bg-surface-container transition-all text-on-surface-variant">
              <X size={20} />
           </button>
        </div>

        {/* Tab Selection */}
        <div className="px-10 flex gap-8 border-b border-slate-50 shrink-0 overflow-x-auto scrollbar-hide">
           {tabs.map(t => {
             const Icon = t.icon;
             const active = tab === t.id;
             return (
               <button 
                 key={t.id} 
                 onClick={() => setTab(t.id)}
                 className={`py-4 text-[11px] font-black uppercase tracking-[0.2em] relative flex items-center gap-2.5 transition-all ${active ? 'text-primary' : 'text-slate-400 hover:text-on-surface'}`}
               >
                 <Icon size={14} className={active ? 'text-primary' : 'text-slate-300'} />
                 {t.label}
                 {active && <motion.div layoutId="modal-tab" className="absolute bottom-0 left-0 right-0 h-1 bg-primary rounded-full" />}
               </button>
             );
           })}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-10 bg-surface/30">
           <AnimatePresence mode="wait">
              {tab === 'overview' && (
                <motion.div key="ov" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-8">
                   <div className="bg-white rounded-[2.5rem] p-10 curated-shadow border border-white">
                      <div className="flex justify-between items-end mb-6 font-black italic uppercase text-[12px] tracking-widest">
                         <span className="text-primary">{shipment.origin} Node</span>
                         <span className="text-slate-300">Phase Completion {progress}%</span>
                         <span className="text-primary">{shipment.destination} Node</span>
                      </div>
                      <div className="relative h-4 bg-surface-container-low rounded-full overflow-hidden mb-12 border border-slate-50">
                         <motion.div 
                           initial={{ width: 0 }} animate={{ width: `${progress}%` }}
                           className="absolute inset-y-0 left-0 bg-primary rounded-full shadow-[0_0_20px_rgba(59,130,246,0.5)]" />
                      </div>
                      <div className="grid grid-cols-3 gap-12">
                         <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Estimated Arrival</p>
                            <p className="text-xl font-black text-on-surface tracking-tight italic uppercase">{format(etaDate, 'dd MMM, HH:mm')}</p>
                         </div>
                         <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Payload Mass</p>
                            <p className="text-xl font-black text-on-surface tracking-tight italic uppercase">{shipment.weight_kg?.toLocaleString()} KG</p>
                         </div>
                         <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Vector Risk</p>
                            <p className={`text-xl font-black tracking-tight italic uppercase ${riskColor(shipment.risk_score)}`}>{riskLabel(shipment.risk_score)} / {shipment.risk_score}</p>
                         </div>
                      </div>
                   </div>

                   <div className="grid grid-cols-2 gap-8">
                      <div className="bg-white rounded-[2.5rem] p-8 border border-white shadow-sm overflow-hidden">
                         <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.2em] mb-6 flex items-center gap-3">
                            <Package size={14} className="text-primary" /> Cargo Metadata
                         </h4>
                         <div className="space-y-4">
                            {[
                              { label: 'Classification', value: shipment.cargo_type },
                              { label: 'Financial Value', value: shipment.declared_value ? formatCurrency(shipment.declared_value) : 'Null' },
                              { label: 'Supplier Entity', value: shipment.supplier_name },
                              { label: 'Bill Registry', value: shipment.eway_bill || 'Protocol Pend' }
                            ].map(row => (
                              <div key={row.label} className="flex justify-between py-3 border-b border-slate-50">
                                 <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">{row.label}</span>
                                 <span className="text-[13px] font-bold text-on-surface tracking-tight italic uppercase">{row.value}</span>
                              </div>
                            ))}
                         </div>
                      </div>

                      <div className="bg-on-surface rounded-[2.5rem] p-8 text-white flex flex-col justify-between shadow-2xl">
                         <div>
                            <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6">Operator Protocol</h4>
                            <p className="text-[14px] leading-relaxed font-bold italic opacity-80">
                               {shipment.notes || "No active operator notes for this sequence. System monitoring active on all nodes."}
                            </p>
                         </div>
                         <button className="w-full py-4 mt-8 bg-white/10 border border-white/20 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-white/20 transition-all">
                            Append Observation
                         </button>
                      </div>
                   </div>
                </motion.div>
              )}

              {tab === 'fleet' && (
                <motion.div key="fl" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-8">
                   {activeDispatch ? (
                     <div className="grid grid-cols-3 gap-8">
                        <div className="col-span-2 space-y-8">
                           <div className="bg-on-surface rounded-[2.5rem] p-10 text-white relative overflow-hidden group">
                               <div className="absolute top-0 right-0 p-10 opacity-10 blur-sm group-hover:opacity-20 transition-all scale-150 rotate-12"><Truck size={120} /></div>
                               <div className="relative z-10">
                                   <div className="flex items-center gap-4 mb-8">
                                       <div className="w-4 h-4 rounded-full bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.5)] animate-pulse" />
                                       <span className="text-[11px] font-black uppercase tracking-[0.4em] text-emerald-500">Active Transit Unit</span>
                                   </div>
                                   <div className="flex items-center gap-8">
                                       <div className="w-20 h-20 bg-white/5 border border-white/10 rounded-3xl flex items-center justify-center text-5xl font-black italic uppercase">
                                          {activeDispatch.drivers?.full_name?.[0]}
                                       </div>
                                       <div>
                                          <h3 className="text-3xl font-black italic tracking-tighter uppercase mb-1">{activeDispatch.drivers?.full_name}</h3>
                                          <p className="text-[12px] font-black text-slate-500 uppercase tracking-[0.3em] font-mono">{activeDispatch.drivers?.license_number} • {activeDispatch.drivers?.phone}</p>
                                       </div>
                                   </div>
                               </div>
                           </div>

                           <div className="bg-white border border-slate-50 rounded-[2.5rem] p-10 shadow-sm">
                              <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.2em] mb-8">Live Transit Nodes</h4>
                              <div className="space-y-4">
                                 {activeDispatch.stops?.map((stop, idx) => (
                                   <div key={idx} className="flex items-center gap-8 p-6 bg-surface/50 rounded-3xl border border-transparent hover:border-slate-50 transition-all">
                                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-[13px] font-black border ${idx <= (activeDispatch.current_stop_index || 0) ? 'bg-primary border-primary text-white shadow-lg' : 'bg-white border-slate-100 text-slate-300'}`}>
                                         {idx === (activeDispatch.current_stop_index || 0) ? <Zap size={18} /> : idx + 1}
                                      </div>
                                      <div>
                                         <p className="text-[15px] font-black text-on-surface uppercase italic tracking-tight">{stop.label}</p>
                                         <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">
                                            {idx < (activeDispatch.current_stop_index || 0) ? 'Stage Verified' : idx === (activeDispatch.current_stop_index || 0) ? 'Active Target' : 'Protocol Queue'}
                                         </p>
                                      </div>
                                   </div>
                                 ))}
                              </div>
                           </div>
                        </div>

                        <div className="space-y-8">
                           <div className="bg-surface-container-low/50 border border-slate-50 rounded-[2.5rem] p-8">
                              <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Telemetry Health</h5>
                              <div className="space-y-6">
                                 {[
                                   { label: 'Fatigue Stat', v: 'Optimized', color: 'text-emerald-500' },
                                   { label: 'Unit Vessel ID', v: shipment.vehicle_number || 'TBA', color: 'text-on-surface' },
                                   { label: 'Success Rating', v: activeDispatch.drivers?.rating || '4.9/5.0', color: 'text-on-surface' }
                                 ].map(st => (
                                   <div key={st.label} className="flex justify-between border-b border-slate-100 pb-4">
                                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{st.label}</span>
                                      <span className={`text-[12px] font-black uppercase tracking-tight italic ${st.color}`}>{st.v}</span>
                                   </div>
                                 ))}
                              </div>
                           </div>

                           <button className="w-full py-6 bg-on-surface text-white rounded-[2rem] text-[11px] font-black uppercase tracking-[0.3em] shadow-xl hover:bg-black transition-all flex items-center justify-center gap-3">
                              <MessageSquare size={16} /> Broadcast Alert
                           </button>
                        </div>
                     </div>
                   ) : (
                     <div className="max-w-2xl mx-auto py-16 text-center space-y-12">
                        <div className="w-32 h-32 bg-surface-container-low rounded-[3rem] mx-auto flex items-center justify-center text-slate-300 shadow-inner border border-white">
                           <Truck size={60} strokeWidth={1.5} />
                        </div>
                        <div>
                           <h3 className="text-4xl font-black text-on-surface tracking-tighter italic uppercase">Resource Activation Required</h3>
                           <p className="text-[12px] font-bold text-slate-400 uppercase tracking-[0.3em] mt-4 font-mono">Assign a tactical unit to begin fulfillment sequence</p>
                        </div>
                        
                        <div className="space-y-6 max-w-md mx-auto">
                           <div className="relative group">
                              <User className="absolute left-8 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors" size={20} />
                              <select 
                                value={selectedDriverId}
                                onChange={(e) => setSelectedDriverId(e.target.value)}
                                className="w-full bg-white border-2 border-slate-50 rounded-[2rem] py-6 pl-16 pr-8 text-[13px] font-black italic text-on-surface uppercase tracking-tight focus:outline-none focus:border-primary focus:ring-8 focus:ring-primary/5 transition-all appearance-none cursor-pointer shadow-sm"
                              >
                                <option value="">Select Priority Operator</option>
                                {drivers.map(d => (
                                  <option key={d.id} value={d.id}>{d.full_name} • {d.license_number}</option>
                                ))}
                              </select>
                           </div>
                           <button 
                             onClick={handleAssignDriver}
                             disabled={!selectedDriverId || assigning}
                             className="w-full py-6 bg-on-surface text-white rounded-[2rem] text-[11px] font-black uppercase tracking-[0.3em] shadow-2xl hover:bg-black transition-all disabled:opacity-50 flex items-center justify-center gap-3 active:scale-[0.98]"
                           >
                              {assigning ? <Loader2 className="animate-spin" size={18} /> : (
                                <>Initiate fulfillment sequence <Zap size={16} className="fill-white" /></>
                              )}
                           </button>
                        </div>
                     </div>
                   )}
                </motion.div>
              )}

              {tab === 'risk' && (
                <motion.div key="rk" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-8">
                   <div className="bg-white rounded-[2.5rem] p-10 curated-shadow border border-white flex gap-12 items-center">
                      <div className="relative shrink-0">
                         <div className={`w-40 h-40 rounded-full border-[12px] flex items-center justify-center transition-all ${
                           shipment.risk_score < 30 ? 'border-emerald-500' : shipment.risk_score < 70 ? 'border-amber-500' : 'border-rose-500'
                         }`}>
                           <div className="text-center">
                             <div className={`text-5xl font-black italic tracking-tighter ${riskColor(shipment.risk_score)}`}>{shipment.risk_score}</div>
                             <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1">Neural Score</div>
                           </div>
                         </div>
                         <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 px-5 py-2 bg-on-surface text-white rounded-full text-[10px] font-black uppercase tracking-widest shadow-xl">
                            {riskLabel(shipment.risk_score)}
                         </div>
                      </div>
                      
                      <div className="flex-1 bg-surface-container-low/50 border border-slate-50 rounded-[2rem] p-8">
                         <div className="flex items-center gap-3 mb-6">
                            <Sparkles size={16} className="text-primary" />
                            <span className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-900 italic">Gemini Neural Insight</span>
                         </div>
                         {aiLoading ? (
                            <div className="flex flex-col items-center justify-center py-6 gap-3 opacity-40">
                               <Loader2 size={32} className="animate-spin text-primary" />
                               <span className="text-[10px] font-black uppercase tracking-widest">Synthesizing telemetry...</span>
                            </div>
                         ) : (
                            <p className="text-[15px] italic font-bold text-on-surface leading-relaxed uppercase tracking-tight opacity-70">
                               {aiRisk}
                            </p>
                         )}
                      </div>
                   </div>

                   <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      {[
                        { f: 'Transit Vector', l: shipment.mode === 'road' ? 'high' : 'low', d: 'Standard regional road congestion affecting corridor bandwidth.' },
                        { f: 'Atmosphere Hazard', l: weatherRisk.overallRisk > 60 ? 'critical' : 'nominal', d: `${weatherRisk.primaryHazard} detected. Atmosphere fluctuation confirmed.` }
                      ].map(f => (
                         <div key={f.f} className="bg-white border border-slate-50 rounded-[2.5rem] p-8 flex gap-6 shadow-sm">
                            <div className={`w-3 h-3 rounded-full mt-1.5 shrink-0 ${f.l === 'critical' ? 'bg-rose-500 animate-pulse shadow-[0_0_12px_rgba(244,63,94,0.5)]' : f.l === 'high' ? 'bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.3)]' : 'bg-emerald-500'}`} />
                            <div>
                               <h5 className="text-[11px] font-black text-slate-900 uppercase tracking-widest mb-2">{f.f} • {f.l}</h5>
                               <p className="text-[13px] font-bold text-slate-500 leading-snug tracking-tight italic uppercase">{f.d}</p>
                            </div>
                         </div>
                      ))}
                   </div>
                </motion.div>
              )}

              {tab === 'weather' && (
                <motion.div key="wt" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-8">
                   <div className="bg-on-surface rounded-[3rem] p-12 text-white relative overflow-hidden group">
                      <div className="absolute top-0 right-0 p-12 opacity-10 group-hover:opacity-20 transition-all scale-150 rotate-6"><CloudLightning size={140} /></div>
                      <div className="relative z-10 grid grid-cols-2 lg:grid-cols-4 gap-12">
                         <div className="col-span-2">
                            <div className="flex items-center gap-4 mb-6">
                               <div className="w-12 h-12 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center text-4xl">⛈️</div>
                               <div>
                                  <h4 className="text-2xl font-black italic tracking-tighter uppercase mb-1">Atmospheric Audit</h4>
                                  <p className="text-[11px] font-black opacity-50 uppercase tracking-[0.3em]">Live Doppler Corridor Sync</p>
                               </div>
                            </div>
                            <p className="text-[16px] font-black italic uppercase leading-relaxed text-blue-100 opacity-80 max-w-lg">
                               Primary Hazard: {weatherRisk.primaryHazard}. Protocol suggests {weatherRisk.recommendation}.
                            </p>
                         </div>
                         <div className="flex flex-col justify-center border-l border-white/10 pl-12">
                            <span className="text-[10px] font-black opacity-50 uppercase tracking-widest mb-2">Severity</span>
                            <span className="text-3xl font-black italic tracking-tight uppercase text-blue-400">{weatherRisk.overallRisk}/100</span>
                         </div>
                         <div className="flex flex-col justify-center border-l border-white/10 pl-12">
                            <span className="text-[10px] font-black opacity-50 uppercase tracking-widest mb-2">Drift Projection</span>
                            <span className="text-3xl font-black italic tracking-tight uppercase text-emerald-400">+{weatherRisk.delayEstimateHours}H</span>
                         </div>
                      </div>
                   </div>

                   <div className="grid grid-cols-2 gap-8">
                      {weatherRisk.conditions.map((loc, idx) => (
                        <div key={idx} className="bg-white border border-slate-50 rounded-[2.5rem] p-8 shadow-sm">
                           <div className="flex justify-between items-start mb-6">
                              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{idx === 0 ? 'Origin Node' : 'Target Node'}</span>
                              <div className="px-3 py-1 bg-surface-container-low rounded-full text-[9px] font-black uppercase tracking-widest">Live telemetry</div>
                           </div>
                           <h5 className="text-xl font-black text-on-surface italic uppercase tracking-tighter mb-4">{loc.location}</h5>
                           <p className="text-[14px] font-bold text-slate-500 leading-relaxed uppercase tracking-tight italic">
                              Conditions indicating <span className="text-on-surface underline decoration-primary decoration-4 underline-offset-4">{loc.condition.replace('_', ' ')}</span>. {loc.impact}
                           </p>
                        </div>
                      ))}
                   </div>
                </motion.div>
              )}

              {tab === 'timeline' && (
                <motion.div key="tm" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="bg-white rounded-[2.5rem] p-12 border border-slate-50 shadow-sm relative overflow-hidden">
                   <div className="absolute left-[3.75rem] top-24 bottom-24 w-1 bg-surface-container-low rounded-full shrink-0" />
                   <div className="relative z-10 space-y-12 pl-4">
                      <h4 className="text-[12px] font-black text-slate-900 uppercase tracking-[0.3em] mb-12 ml-4">Event Sequence Log</h4>
                      {[
                        { e: 'Origin Dispatch', t: createdAt, s: 'verified' },
                        { e: 'Hub Entry Protocol', t: addHours(createdAt, 4), s: 'verified' },
                        { e: 'Coritdor Transit', t: addHours(createdAt, 12), s: 'active' },
                        { e: 'Final Terminus', t: etaDate, s: 'queue' }
                      ].map((evt, idx) => (
                        <div key={idx} className="flex gap-12 items-center group">
                           <div className={`w-8 h-8 rounded-xl border-4 transition-all shrink-0 flex items-center justify-center ${evt.s === 'verified' ? 'bg-primary border-blue-100 shadow-xl' : evt.s === 'active' ? 'bg-on-surface border-slate-200 animate-pulse' : 'bg-white border-slate-50'}`}>
                              {evt.s === 'verified' && <CheckCircle size={14} className="text-white" />}
                              {evt.s === 'active' && <div className="w-1.5 h-1.5 rounded-full bg-primary" />}
                           </div>
                           <div className="flex-1 pb-2">
                             <div className="flex justify-between items-end">
                                <span className={`text-xl font-black italic tracking-tighter uppercase ${evt.s === 'verified' ? 'text-on-surface' : evt.s === 'active' ? 'text-primary' : 'text-slate-300'}`}>{evt.e}</span>
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{format(evt.t, 'dd MMM, HH:mm')}</span>
                             </div>
                             <div className="h-px bg-slate-50 mt-4 group-last:hidden" />
                           </div>
                        </div>
                      ))}
                   </div>
                </motion.div>
              )}
           </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="px-10 py-8 border-t border-slate-50 bg-white shrink-0 flex justify-between items-center">
           <button 
             onClick={() => toast.info('Email telemetry report pending deployment.')}
             className="px-8 py-4 bg-surface-container-low border border-slate-100 rounded-2xl text-[10px] font-black text-on-surface uppercase tracking-[0.2em] flex items-center gap-3 hover:bg-surface-container transition-all"
           >
              <Mail size={16} /> Broadcast Report
           </button>
           <button onClick={onClose} className="px-8 py-4 bg-on-surface text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-lg hover:bg-black transition-all">
              Terminate View
           </button>
        </div>
      </motion.div>
    </div>
  );
}
