'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import type { Shipment, Driver, DispatchRoute } from '@/types';
import { statusConfig, modeIcon, modeLabel, riskColor, riskLabel, formatCurrency, estimateRevenue, CITY_COORDS } from '@/lib/utils';
import { getRouteWeatherRisk, getWeatherRiskColor } from '@/lib/weather';
import { X, Loader2, MapPin, Shield, Truck, GitBranch, Mail, MessageSquare, CheckCircle, AlertTriangle, Send, ChevronRight, Clock, CloudLightning, Package, IndianRupee, Zap, User, Sparkles, ArrowRight, TrendingUp, Info } from 'lucide-react';
import { toast } from 'sonner';
import { format, addHours } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  shipment: Shipment;
  onClose: () => void;
  onUpdate: () => void;
}

type Tab = 'overview' | 'risk' | 'vehicle' | 'routes';

export default function ShipmentDetailModal({ shipment: initialShipment, onClose, onUpdate }: Props) {
  const [shipment, setShipment] = useState(initialShipment);
  const [tab, setTab] = useState<Tab>('overview');
  const [aiRisk, setAiRisk] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [activeDispatch, setActiveDispatch] = useState<(DispatchRoute & { drivers: Driver }) | null>(null);
  const [assigning, setAssigning] = useState(false);
  const [selectedDriverId, setSelectedDriverId] = useState('');

  const sc = statusConfig(shipment.status);
  const weatherRisk = getRouteWeatherRisk(shipment.origin, shipment.destination);
  const createdAt = new Date(shipment.created_at);
  const etaDate = new Date(shipment.eta);

  // Calculate KM based on coordinates
  const getDistanceKm = () => {
    const start = CITY_COORDS[shipment.origin] || [12.9716, 77.5946];
    const end = CITY_COORDS[shipment.destination] || [19.0760, 72.8777];
    const R = 6371; // km
    const dLat = (end[0] - start[0]) * Math.PI / 180;
    const dLon = (end[1] - start[1]) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(start[0] * Math.PI / 180) * Math.cos(end[0] * Math.PI / 180) * 
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return Math.round(R * c);
  };

  const distanceKm = getDistanceKm();

  const calculateProgress = () => {
    if (shipment.status === 'delivered') return 100;
    if (shipment.status === 'pending') return 0;
    const start = new Date(shipment.created_at).getTime();
    const end = new Date(shipment.eta).getTime();
    const now = Date.now();
    if (now >= end) return 95;
    const total = end - start;
    const current = now - start;
    return Math.min(Math.max(Math.round((current / total) * 100), 10), 98);
  };

  const progress = calculateProgress();

  useEffect(() => {
    if (tab === 'risk' && !aiRisk) {
      setAiLoading(true);
      fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: `Analyze risk for shipment ${shipment.shipment_code} from ${shipment.origin} to ${shipment.destination}. Weight: ${shipment.weight_kg}kg, Mode: ${shipment.mode}. Current risk score: ${shipment.risk_score}. Use plain English.`,
          history: [] 
        })
      })
      .then(res => res.json())
      .then(data => setAiRisk(data.text || 'Unable to generate AI analysis at this time.'))
      .catch(() => setAiRisk('Connection error while fetching AI analysis.'))
      .finally(() => setAiLoading(false));
    }
  }, [tab, shipment, aiRisk]);

  useEffect(() => {
    if (tab === 'vehicle') {
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
        const { data, error } = await supabase.from('dispatch_routes').insert({
            shipment_id: shipment.id,
            driver_id: selectedDriverId,
            status: 'active',
            stops: [
                { lat: startCoord[0], lng: startCoord[1], label: shipment.origin },
                { lat: endCoord[0], lng: endCoord[1], label: shipment.destination }
            ],
            current_stop_index: 0
        }).select('*, drivers(*)').single();
        if (error) throw error;
        await supabase.from('drivers').update({ status: 'on_trip' }).eq('id', selectedDriverId);
        setActiveDispatch(data);
        toast.success('Vehicle and driver assigned');
        onUpdate();
    } catch (err: unknown) {
        toast.error((err as Error).message || 'Assignment failed');
    } finally {
        setAssigning(false);
    }
  };

  const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: 'overview', label: 'Overview', icon: MapPin },
    { id: 'risk',     label: 'Risk Analysis', icon: Shield },
    { id: 'vehicle',  label: 'Vehicle & Crew',    icon: Truck },
    { id: 'routes',   label: 'Route History', icon: GitBranch },
  ];

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 md:p-6">
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" 
        onClick={onClose} 
      />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative bg-white rounded-[2.5rem] shadow-2xl w-full max-w-5xl h-[90vh] md:h-[85vh] flex flex-col overflow-hidden border border-slate-200"
      >
        {/* Header Section */}
        <div className="p-8 md:p-10 pb-6 shrink-0 flex items-start justify-between border-b border-slate-50">
           <div>
              <div className="flex items-center gap-2 mb-2">
                 <span className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em] bg-indigo-50 px-3 py-1 rounded-full">Shipment Details</span>
                 {shipment.status === 'in_transit' && <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />}
              </div>
              <div className="flex flex-wrap items-center gap-3 md:gap-4">
                 <h2 className="text-3xl md:text-4xl font-black text-slate-800 tracking-tighter uppercase">{shipment.shipment_code}</h2>
                 <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${sc.bg} ${sc.text} border border-white shadow-sm`}>
                    {sc.label}
                 </div>
                 <div className="px-4 py-1.5 bg-slate-100 rounded-full text-[10px] font-black uppercase tracking-widest text-slate-600 border border-slate-200 flex items-center gap-2">
                    {modeIcon(shipment.mode)} {modeLabel(shipment.mode)}
                 </div>
              </div>
              <div className="mt-4 flex items-center gap-3 text-slate-800 font-bold text-lg md:text-xl italic">
                 <span>{shipment.origin}</span>
                 <ArrowRight size={20} className="text-slate-300" />
                 <span>{shipment.destination}</span>
              </div>
           </div>
           
           <button onClick={onClose} className="w-10 h-10 md:w-12 md:h-12 rounded-2xl bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-all text-slate-600">
              <X size={20} />
           </button>
        </div>

        {/* Tab Navigation */}
        <div className="px-8 md:px-10 flex gap-6 md:gap-10 border-b border-slate-100 shrink-0 overflow-x-auto scrollbar-hide">
           {tabs.map(t => {
             const Icon = t.icon;
             const active = tab === t.id;
             return (
               <button 
                 key={t.id} 
                 onClick={() => setTab(t.id)}
                 className={`py-4 text-[11px] font-black uppercase tracking-[0.2em] relative flex items-center gap-2.5 transition-all whitespace-nowrap ${active ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-800'}`}
               >
                 <Icon size={14} className={active ? 'text-indigo-600' : 'text-slate-300'} />
                 {t.label}
                 {active && <motion.div layoutId="modal-tab-active" className="absolute bottom-0 left-0 right-0 h-1 bg-indigo-600 rounded-full" />}
               </button>
             );
           })}
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 md:p-10 bg-slate-50/50">
           <AnimatePresence mode="wait">
              {tab === 'overview' && (
                <motion.div key="overview" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-8">
                   <div className="bg-white rounded-[2rem] p-8 md:p-10 shadow-sm border border-slate-100">
                      <div className="flex justify-between items-end mb-6 font-black italic uppercase text-[10px] md:text-[11px] tracking-widest">
                         <span className="text-indigo-600">{shipment.origin}</span>
                         <span className="text-slate-400">Shipment Progress {progress}%</span>
                         <span className="text-indigo-600">{shipment.destination}</span>
                      </div>
                      <div className="relative h-3 bg-slate-100 rounded-full overflow-hidden mb-12">
                         <motion.div 
                           initial={{ width: 0 }} animate={{ width: `${progress}%` }}
                           className="absolute inset-y-0 left-0 bg-indigo-600 rounded-full shadow-[0_0_15px_rgba(79,70,229,0.4)]" />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
                         <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Expected Delivery</p>
                            <p className="text-lg md:text-xl font-black text-slate-800 tracking-tight italic uppercase">{format(etaDate, 'dd MMM, HH:mm')}</p>
                         </div>
                         <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Cargo Weight</p>
                            <p className="text-lg md:text-xl font-black text-slate-800 tracking-tight italic uppercase">{shipment.weight_kg?.toLocaleString()} KG</p>
                         </div>
                         <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Transit Distance</p>
                            <p className="text-lg md:text-xl font-black text-slate-800 tracking-tight italic uppercase">~{distanceKm} KM</p>
                         </div>
                      </div>
                   </div>

                   <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                      <div className="bg-white rounded-[2rem] p-8 border border-slate-100 shadow-sm">
                         <h4 className="text-[11px] font-black text-slate-800 uppercase tracking-[0.2em] mb-6 flex items-center gap-3">
                            <Package size={16} className="text-indigo-600" /> Cargo Details
                         </h4>
                         <div className="space-y-4">
                            {[
                              { label: 'Type', value: shipment.cargo_type },
                              { label: 'Estimated Value', value: shipment.declared_value ? formatCurrency(shipment.declared_value) : 'Not Disclosed' },
                              { label: 'Supplier Name', value: shipment.supplier_name },
                              { label: 'Bill of Lading', value: shipment.eway_bill || 'In Progress' }
                            ].map(row => (
                              <div key={row.label} className="flex justify-between py-3 border-b border-slate-50 last:border-0">
                                 <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">{row.label}</span>
                                 <span className="text-[13px] font-bold text-slate-700 tracking-tight italic uppercase">{row.value}</span>
                              </div>
                            ))}
                         </div>
                      </div>

                      <div className="bg-slate-900 rounded-[2rem] p-8 text-white flex flex-col justify-between shadow-xl">
                         <div>
                            <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                               <Info size={14} className="text-indigo-400" /> Status Notes
                            </h4>
                            <p className="text-sm md:text-[15px] leading-relaxed font-bold italic opacity-90">
                               {shipment.notes || "No notes added yet. All systems are being monitored for any issues."}
                            </p>
                         </div>
                         <button className="w-full py-4 mt-8 bg-white/10 border border-white/20 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-white/20 transition-all">
                            Add Status Update
                         </button>
                      </div>
                   </div>
                </motion.div>
              )}

              {tab === 'risk' && (
                <motion.div key="risk" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-8">
                   <div className="bg-white rounded-[2.5rem] p-10 shadow-sm border border-slate-100 flex flex-col md:flex-row gap-10 items-center">
                      <div className="relative shrink-0">
                         <div className={`w-36 h-36 md:w-40 md:h-40 rounded-full border-[10px] flex items-center justify-center transition-all ${
                           shipment.risk_score < 30 ? 'border-emerald-500' : shipment.risk_score < 70 ? 'border-amber-500' : 'border-rose-500'
                         }`}>
                           <div className="text-center">
                             <div className={`text-4xl md:text-5xl font-black italic tracking-tighter ${riskColor(shipment.risk_score)}`}>{shipment.risk_score}</div>
                             <div className="text-[9px] font-black uppercase tracking-widest text-slate-400 mt-1">AI Risk Score</div>
                           </div>
                         </div>
                         <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-slate-900 text-white rounded-full text-[9px] font-black uppercase tracking-widest shadow-lg">
                            {riskLabel(shipment.risk_score)}
                         </div>
                      </div>
                      
                      <div className="flex-1 bg-indigo-50/50 border border-indigo-100 rounded-[2rem] p-8">
                         <div className="flex items-center gap-2 mb-4">
                            <Sparkles size={16} className="text-indigo-600" />
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-900 italic">LogiFlow AI Analysis</span>
                         </div>
                         {aiLoading ? (
                            <div className="flex flex-col items-center justify-center py-6 gap-3">
                               <Loader2 size={24} className="animate-spin text-indigo-600" />
                               <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400">Analyzing live data...</span>
                            </div>
                         ) : (
                            <p className="text-[14px] md:text-[15px] italic font-bold text-indigo-900/80 leading-relaxed uppercase tracking-tight">
                               {aiRisk}
                            </p>
                         )}
                      </div>
                   </div>

                   <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="bg-white border border-slate-100 rounded-[2rem] p-8 flex gap-6 shadow-sm">
                         <div className={`w-3 h-3 rounded-full mt-1.5 shrink-0 ${weatherRisk.overallRisk > 60 ? 'bg-rose-500 animate-pulse' : 'bg-emerald-500'}`} />
                         <div>
                            <h5 className="text-[11px] font-black text-slate-800 uppercase tracking-widest mb-2">Weather Conditions</h5>
                            <p className="text-[13px] font-bold text-slate-500 italic uppercase tracking-tight leading-snug">
                               Hazard: {weatherRisk.primaryHazard}. Risk level is {weatherRisk.overallRisk >= 70 ? 'critical' : weatherRisk.overallRisk >= 40 ? 'elevated' : 'normal'}.
                            </p>
                         </div>
                      </div>
                      <div className="bg-white border border-slate-100 rounded-[2rem] p-8 flex gap-6 shadow-sm">
                         <div className={`w-3 h-3 rounded-full mt-1.5 shrink-0 ${shipment.mode === 'road' ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                         <div>
                            <h5 className="text-[11px] font-black text-slate-800 uppercase tracking-widest mb-2">Carrier Reliability</h5>
                            <p className="text-[13px] font-bold text-slate-500 italic uppercase tracking-tight leading-snug">
                               Transport via {modeLabel(shipment.mode)} is showing {shipment.mode === 'road' ? 'standard traffic delays' : 'high reliability ratings'}.
                            </p>
                         </div>
                      </div>
                   </div>
                </motion.div>
              )}

              {tab === 'vehicle' && (
                <motion.div key="vehicle" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-8">
                   {activeDispatch ? (
                     <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <div className="lg:col-span-2 space-y-8">
                           <div className="bg-slate-900 rounded-[2.5rem] p-10 text-white relative overflow-hidden">
                               <div className="relative z-10">
                                   <div className="flex items-center gap-3 mb-8">
                                       <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.5)] animate-pulse" />
                                       <span className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-400">Assigned Transit Unit</span>
                                   </div>
                                   <div className="flex items-center gap-6 md:gap-8">
                                       <div className="w-16 h-16 md:w-20 md:h-20 bg-white/10 border border-white/20 rounded-3xl flex items-center justify-center text-3xl md:text-4xl font-black italic uppercase">
                                          {activeDispatch.drivers?.full_name?.[0]}
                                       </div>
                                       <div>
                                          <h3 className="text-2xl md:text-3xl font-black italic tracking-tighter uppercase mb-1">{activeDispatch.drivers?.full_name}</h3>
                                          <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">{activeDispatch.drivers?.license_number} • {activeDispatch.drivers?.phone}</p>
                                       </div>
                                   </div>
                               </div>
                           </div>

                           <div className="bg-white border border-slate-100 rounded-[2.5rem] p-8 md:p-10 shadow-sm">
                              <h4 className="text-[11px] font-black text-slate-800 uppercase tracking-[0.2em] mb-8">Journey Milestone Progress</h4>
                              <div className="space-y-4">
                                 {activeDispatch.stops?.map((stop: any, idx: number) => (
                                   <div key={idx} className="flex items-center gap-6 md:gap-8 p-5 bg-slate-50/50 rounded-2xl border border-transparent hover:border-slate-100 transition-all">
                                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-[12px] font-black border ${idx <= (activeDispatch.current_stop_index || 0) ? 'bg-indigo-600 border-indigo-600 text-white shadow-md' : 'bg-white border-slate-200 text-slate-300'}`}>
                                         {idx === (activeDispatch.current_stop_index || 0) ? <Zap size={14} className="fill-white" /> : idx + 1}
                                      </div>
                                      <div>
                                         <p className="text-[14px] font-black text-slate-800 uppercase italic tracking-tight">{stop.label}</p>
                                         <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">
                                            {idx < (activeDispatch.current_stop_index || 0) ? 'Completed' : idx === (activeDispatch.current_stop_index || 0) ? 'Current Hub' : 'Upcoming'}
                                         </p>
                                      </div>
                                   </div>
                                 ))}
                              </div>
                           </div>
                        </div>

                        <div className="space-y-8">
                           <div className="bg-white border border-slate-200 rounded-[2.5rem] p-8 shadow-sm">
                              <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Status Overview</h5>
                              <div className="space-y-5">
                                 {[
                                   { label: 'Carrier Score', v: activeDispatch.drivers?.rating ? `${activeDispatch.drivers.rating}/5.0` : '4.8/5.0', color: 'text-slate-800' },
                                   { label: 'Vehicle Number', v: shipment.vehicle_number || 'TBA', color: 'text-slate-800' },
                                   { label: 'Transit Mode', v: modeLabel(shipment.mode), color: 'text-indigo-600' }
                                 ].map(st => (
                                   <div key={st.label} className="flex justify-between border-b border-slate-50 pb-4 last:border-0 last:pb-0">
                                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{st.label}</span>
                                      <span className={`text-[12px] font-black uppercase tracking-tight italic ${st.color}`}>{st.v}</span>
                                   </div>
                                 ))}
                              </div>
                           </div>
                           <button className="w-full py-5 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl hover:bg-black transition-all flex items-center justify-center gap-2">
                              <MessageSquare size={16} /> Send Alert to Driver
                           </button>
                        </div>
                     </div>
                   ) : (
                     <div className="max-w-xl mx-auto py-12 text-center space-y-10">
                        <div className="w-24 h-24 bg-slate-100 rounded-[2.5rem] mx-auto flex items-center justify-center text-slate-300 shadow-inner">
                           <Truck size={40} strokeWidth={1.5} />
                        </div>
                        <div>
                           <h3 className="text-3xl font-black text-slate-800 tracking-tighter italic uppercase">Vehicle Assignment</h3>
                           <p className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-3">Select a vehicle and driver for this shipment</p>
                        </div>
                        
                        <div className="space-y-5 max-w-sm mx-auto">
                           <div className="relative">
                              <User className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                              <select 
                                value={selectedDriverId}
                                onChange={(e) => setSelectedDriverId(e.target.value)}
                                className="w-full bg-white border-2 border-slate-100 rounded-2xl py-5 pl-14 pr-6 text-[12px] font-black italic text-slate-800 uppercase tracking-tight focus:outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-50 transition-all appearance-none cursor-pointer"
                              >
                                <option value="">Select Available Driver</option>
                                {drivers.map(d => (
                                  <option key={d.id} value={d.id}>{d.full_name} ({d.license_number})</option>
                                ))}
                              </select>
                           </div>
                           <button 
                             onClick={handleAssignDriver}
                             disabled={!selectedDriverId || assigning}
                             className="w-full py-5 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-lg hover:bg-indigo-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                           >
                              {assigning ? <Loader2 className="animate-spin" size={16} /> : (
                                <>Assign Vehicle & Pilot <ArrowRight size={14} /></>
                              )}
                           </button>
                        </div>
                     </div>
                   )}
                </motion.div>
              )}

              {tab === 'routes' && (
                <motion.div key="routes" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="bg-white rounded-[2.5rem] p-8 md:p-12 border border-slate-100 shadow-sm relative overflow-hidden">
                   <div className="absolute left-[3.2rem] md:left-[3.75rem] top-24 bottom-24 w-1 bg-slate-100 rounded-full" />
                   <div className="relative z-10 space-y-12">
                      <h4 className="text-[11px] font-black text-slate-800 uppercase tracking-[0.3em] mb-12 ml-4">Event History Log</h4>
                      {[
                        { e: 'Order Created', t: createdAt, s: 'completed' },
                        { e: 'Processing at Origin', t: addHours(createdAt, 2), s: 'completed' },
                        { e: 'Transit Started', t: addHours(createdAt, 5), s: shipment.status === 'pending' ? 'pending' : 'completed' },
                        { e: 'Expected Arrival', t: etaDate, s: shipment.status === 'delivered' ? 'completed' : 'pending' }
                      ].map((evt, idx) => (
                        <div key={idx} className="flex gap-8 md:gap-12 items-center">
                           <div className={`w-8 h-8 rounded-xl border-4 transition-all shrink-0 flex items-center justify-center ${evt.s === 'completed' ? 'bg-indigo-600 border-indigo-100 shadow-lg' : 'bg-white border-slate-100'}`}>
                              {evt.s === 'completed' && <CheckCircle size={14} className="text-white" />}
                              {evt.s === 'pending' && <Clock size={14} className="text-slate-300" />}
                           </div>
                           <div className="flex-1 pb-2 border-b border-slate-50">
                              <div className="flex justify-between items-end gap-4">
                                 <span className={`text-lg md:text-xl font-black italic tracking-tighter uppercase ${evt.s === 'completed' ? 'text-slate-800' : 'text-slate-300'}`}>{evt.e}</span>
                                 <span className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest">{format(evt.t, 'dd MMM, HH:mm')}</span>
                              </div>
                           </div>
                        </div>
                      ))}
                   </div>
                </motion.div>
              )}
           </AnimatePresence>
        </div>

        {/* Footer Actions */}
        <div className="px-8 md:px-10 py-6 md:py-8 border-t border-slate-100 bg-white shrink-0 flex flex-col md:flex-row gap-4 justify-between items-center">
           <button 
             onClick={() => toast.info('PDF report is being generated.')}
             className="w-full md:w-auto px-8 py-4 bg-slate-100 border border-slate-200 rounded-2xl text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] flex items-center justify-center gap-2 hover:bg-slate-200 transition-all"
           >
              <Mail size={16} /> Email Details
           </button>
           <button onClick={onClose} className="w-full md:w-auto px-12 py-4 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-lg hover:bg-indigo-700 transition-all">
              Close
           </button>
        </div>
      </motion.div>
    </div>
  );
}
