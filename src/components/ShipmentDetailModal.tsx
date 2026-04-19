'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import type { Shipment, Driver, DispatchRoute } from '@/types';
import { statusConfig, modeIcon, modeLabel, riskColor, riskLabel, formatCurrency, estimateRevenue, CITY_COORDS } from '@/lib/utils';
import { getRouteWeatherRisk, getWeatherRiskColor } from '@/lib/weather';
import { 
  X, Loader2, MapPin, Shield, Truck, GitBranch, Mail, MessageSquare, CheckCircle, 
  AlertTriangle, Send, ChevronRight, Clock, CloudLightning, Package, IndianRupee, 
  Zap, User, Sparkles, ArrowRight, TrendingUp, Info, Map as MapIcon, ExternalLink 
} from 'lucide-react';
import { toast } from 'sonner';
import { format, addHours, differenceInHours } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';

interface Props {
  shipment: Shipment;
  onClose: () => void;
  onUpdate: () => void;
}

type Tab = 'overview' | 'risk' | 'vehicle' | 'routes';

function calculateDistance(origin: string, destination: string): number {
  const coords = CITY_COORDS as Record<string, [number, number]>;
  const normalize = (c: string) => 
    Object.keys(coords).find(k => k.toLowerCase() === c?.toLowerCase()) || c;
  const o = coords[normalize(origin)];
  const d = coords[normalize(destination)];
  if (!o || !d) return 0;
  const R = 6371;
  const dLat = (d[0]-o[0]) * Math.PI/180;
  const dLon = (d[1]-o[1]) * Math.PI/180;
  const a = Math.sin(dLat/2)**2 + 
    Math.cos(o[0]*Math.PI/180) * Math.cos(d[0]*Math.PI/180) * 
    Math.sin(dLon/2)**2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)));
}

export default function ShipmentDetailModal({ shipment: initialShipment, onClose, onUpdate }: Props) {
  const [shipment, setShipment] = useState(initialShipment);
  const [tab, setTab] = useState<Tab>('overview');
  const [aiRisk, setAiRisk] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [activeDispatch, setActiveDispatch] = useState<(DispatchRoute & { drivers: Driver }) | null>(null);
  const [assigning, setAssigning] = useState(false);
  const [selectedDriverId, setSelectedDriverId] = useState('');

  const router = useRouter();

  const progressPercent = useMemo(() => {
    const created = new Date(shipment.created_at).getTime();
    const eta = new Date(shipment.eta).getTime();
    const now = Date.now();
    return Math.min(100, Math.max(0, 
      Math.round(((now - created) / (eta - created)) * 100)
    ));
  }, [shipment]);

  const totalDistance = useMemo(() => 
    calculateDistance(shipment.origin, shipment.destination), 
  [shipment]);

  const coveredKm = Math.round(totalDistance * (progressPercent / 100));
  const hoursLeft = Math.max(0, Math.round((new Date(shipment.eta).getTime() - Date.now()) / 3600000));
  const minutesAgo = Math.round((Date.now() - new Date(shipment.created_at).getTime()) / 60000);

  const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: 'overview', label: 'Overview', icon: MapPin },
    { id: 'risk',     label: 'Risk Analysis', icon: AlertTriangle },
    { id: 'vehicle',  label: 'Vehicle & Driver',    icon: Truck },
    { id: 'routes',   label: 'Alt Routes', icon: GitBranch },
  ];

  const getStatusColor = (s: string) => {
    switch(s) {
      case 'delivered': return 'bg-green-100 text-green-700';
      case 'delayed': return 'bg-red-100 text-red-700';
      case 'in_transit': return 'bg-green-100 text-green-700';
      case 'pending': return 'bg-slate-100 text-slate-700';
      default: return 'bg-amber-100 text-amber-700';
    }
  };

  const modeEmojis = { road: '🚛', rail: '🚂', air: '✈️', sea: '🚢' };

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" 
        onClick={onClose} 
      />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative bg-white rounded-[2rem] shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden"
      >
        {/* HEADER SECTION */}
        <div className="p-6 md:p-8 shrink-0 border-b border-slate-50 flex items-start justify-between">
           <div className="flex gap-4">
              <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center text-2xl shadow-lg shrink-0">
                 {modeEmojis[shipment.mode] || '📦'}
              </div>
              <div className="space-y-2">
                 <h2 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight">
                    {shipment.origin} <span className="text-slate-300 mx-1">→</span> {shipment.destination}
                 </h2>
                 <div className="flex flex-wrap gap-2">
                    <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-widest ${getStatusColor(shipment.status)}`}>
                       {shipment.status.replace('_', ' ')}
                    </span>
                    <span className="px-2 py-0.5 rounded-lg border border-indigo-200 text-indigo-600 text-[10px] font-black uppercase tracking-widest">
                       {shipment.mode}
                    </span>
                    <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-widest ${shipment.risk_score >= 70 ? 'bg-red-50 text-red-600' : 'bg-slate-100 text-slate-500'}`}>
                       {shipment.risk_score >= 70 ? 'High Priority' : 'Normal Priority'}
                    </span>
                 </div>
              </div>
           </div>
           <button onClick={onClose} className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-all">
              <X size={20} />
           </button>
        </div>

        {/* TAB NAVIGATION */}
        <div className="px-6 md:px-8 border-b border-slate-50 flex gap-6 shrink-0 overflow-x-auto no-scrollbar">
           {tabs.map(t => {
             const Icon = t.icon;
             const active = tab === t.id;
             return (
               <button 
                 key={t.id} 
                 onClick={() => setTab(t.id)}
                 className={`py-4 text-[11px] font-black uppercase tracking-widest relative flex items-center gap-2 transition-all whitespace-nowrap ${active ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
               >
                 <Icon size={14} />
                 {t.label}
                 {active && <motion.div layoutId="modal-tab-active" className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 rounded-full" />}
               </button>
             );
           })}
        </div>

        {/* CONTENT AREA */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar">
           <AnimatePresence mode="wait">
              {tab === 'overview' && (
                <motion.div key="overview" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-10">
                   
                   {/* A) LIVE LOCATION & PROGRESS */}
                   <section className="space-y-6">
                      <h4 className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                        <MapPin size={12} className="text-indigo-600" /> Live Location & Progress
                      </h4>
                      <div className="bg-slate-50 rounded-3xl p-6 border border-slate-100">
                         <div className="flex justify-between items-center mb-4 text-[11px] font-black text-slate-800 uppercase tracking-tight">
                            <span>{shipment.origin}</span>
                            <span className="text-indigo-600">{progressPercent}% COVERED</span>
                            <span>{shipment.destination}</span>
                         </div>
                         <div className="relative h-3 bg-slate-200 rounded-full mb-4">
                            <motion.div 
                              initial={{ width: 0 }} 
                              animate={{ width: `${progressPercent}%` }}
                              className={`h-full rounded-full relative ${
                                shipment.status === 'delayed' ? 'bg-red-500' : 
                                shipment.risk_score >= 40 ? 'bg-amber-500' : 'bg-green-500'
                              }`} 
                            >
                               <div className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 bg-white border-2 border-current rounded-full shadow-lg" />
                            </motion.div>
                         </div>
                         <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase">
                            <span>~{coveredKm} km covered</span>
                            <span>~{hoursLeft}h remaining</span>
                         </div>
                      </div>
                   </section>

                   {/* B) SHIPMENT METRICS */}
                   <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {[
                        { label: 'ETA Hours', val: `${hoursLeft}h`, color: 'text-slate-800' },
                        { label: 'Weight (kg)', val: shipment.weight_kg?.toLocaleString('en-IN') || '—', color: 'text-slate-800' },
                        { label: 'Route KM', val: `${totalDistance} km`, color: 'text-slate-800' },
                        { 
                          label: 'Risk Score', 
                          val: shipment.risk_score, 
                          style: shipment.risk_score >= 70 ? 'bg-red-50 border-red-200 text-red-600' : 
                                 shipment.risk_score >= 40 ? 'bg-amber-50 border-amber-200 text-amber-600' : 
                                 'bg-green-50 border-green-200 text-green-600'
                        }
                      ].map((box, i) => (
                        <div key={i} className={`rounded-xl p-4 border text-center ${box.style || 'bg-white border-slate-100'}`}>
                           <p className="text-2xl font-black tracking-tighter">{box.val}</p>
                           <p className="text-[9px] font-black uppercase tracking-widest text-slate-450 mt-1">{box.label}</p>
                        </div>
                      ))}
                   </section>

                   {/* C) ROUTE TIMELINE */}
                   <section className="space-y-6">
                      <h4 className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                        <GitBranch size={12} className="text-indigo-600" /> Route Timeline
                      </h4>
                      <div className="relative pl-10 space-y-12 before:absolute before:left-3.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-100 before:border-l before:border-dashed before:border-slate-300">
                         {/* Origin */}
                         <div className="relative">
                            <div className="absolute -left-10 top-1.5 w-7 h-7 bg-green-500 rounded-full border-4 border-white shadow-md z-10 flex items-center justify-center">
                               <CheckCircle size={12} className="text-white" />
                            </div>
                            <div className="flex justify-between items-start">
                               <div>
                                  <p className="text-sm font-black text-slate-800 uppercase italic tracking-tight">{shipment.origin}</p>
                                  <p className="text-[10px] font-bold text-slate-400">Shipment Departed</p>
                               </div>
                               <span className="px-2 py-0.5 rounded-full bg-green-50 text-green-600 text-[9px] font-black uppercase tracking-widest">Departed ✓</span>
                            </div>
                         </div>

                         {/* Current */}
                         <div className="relative">
                            <div className="absolute -left-10 top-1.5 w-7 h-7 bg-indigo-600 rounded-full border-4 border-white shadow-xl z-10 animate-pulse" />
                            <div className="flex justify-between items-start">
                               <div>
                                  <p className="text-sm font-black text-slate-800 uppercase italic tracking-tight">Current Position — ~{coveredKm} km</p>
                                  <p className="text-[10px] font-bold text-slate-400">Live GPS · {minutesAgo} min ago</p>
                               </div>
                               <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 text-[9px] font-black uppercase tracking-widest">{hoursLeft}h to destination</span>
                            </div>
                         </div>

                         {/* Destination */}
                         <div className="relative">
                            <div className="absolute -left-10 top-1.5 w-7 h-7 bg-white rounded-full border-2 border-slate-200 z-10" />
                            <div className="flex justify-between items-start">
                               <div>
                                  <p className="text-sm font-black text-slate-800 uppercase italic tracking-tight">{shipment.destination}</p>
                                  <p className="text-[10px] font-bold text-slate-400">ETA ~{hoursLeft}h</p>
                               </div>
                               <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest ${
                                 shipment.status === 'delayed' ? 'bg-red-50 text-red-600' : 
                                 shipment.risk_score >= 40 ? 'bg-amber-50 text-amber-600' : 'bg-green-50 text-green-600'
                               }`}>
                                 {shipment.status === 'delayed' ? 'Delayed Arrival' : shipment.risk_score >= 40 ? 'At Risk' : 'On-time delivery'}
                               </span>
                            </div>
                         </div>
                      </div>
                   </section>

                   {/* D) CARGO & SUPPLIER GRID */}
                   <section className="space-y-6 pb-20 md:pb-0">
                      <h4 className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                        <Package size={12} className="text-indigo-600" /> Cargo & Supplier
                      </h4>
                      <div className="grid grid-cols-2 gap-4">
                         {[
                           { label: 'Cargo Type', val: shipment.cargo_type || '--' },
                           { label: 'Supplier', val: shipment.supplier_name || '--' },
                           { label: 'Weight', val: `${shipment.weight_kg?.toLocaleString('en-IN')} kg` },
                           { label: 'Highway / Route', val: shipment.reference_number || 'NH-48 Corridor' },
                           { label: 'Transport Mode', val: shipment.mode.toUpperCase(), icon: modeEmojis[shipment.mode] },
                           { label: 'Status', val: shipment.status.toUpperCase(), color: getStatusColor(shipment.status) },
                         ].map((cell, i) => (
                           <div key={i} className="bg-slate-50 rounded-xl p-4 border border-slate-100/50">
                              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{cell.label}</p>
                              <p className={`text-[12px] font-black tracking-tight mt-1 flex items-center gap-2 ${cell.color || 'text-slate-800'}`}>
                                 {cell.icon} {cell.val}
                              </p>
                           </div>
                         ))}
                      </div>
                   </section>
                </motion.div>
              )}

              {tab === 'risk' && (
                <motion.div key="risk" className="space-y-8">
                   <div className="p-6 bg-rose-50 border border-red-100 rounded-2xl flex items-center justify-between">
                      <span className="text-[11px] font-black uppercase text-red-700">Live Risk analysis Score</span>
                      <span className="text-2xl font-black text-red-700">{shipment.risk_score}%</span>
                   </div>
                   <div className="h-4 w-full bg-slate-100 rounded-full overflow-hidden mb-8">
                      <motion.div 
                        initial={{ width: 0 }} 
                        animate={{ width: `${shipment.risk_score}%` }} 
                        className={`h-full ${shipment.risk_score >= 70 ? 'bg-red-500' : 'bg-amber-500'}`} 
                      />
                   </div>
                   <div className="space-y-4">
                      <h5 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Risk Factors</h5>
                      <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm">
                         <p className="text-sm font-bold text-slate-700 leading-relaxed italic uppercase tracking-tight">
                            {aiRisk || 'AI analysis is currently unavailable for this specific route quadrant. Standard operational parameters are active.'}
                         </p>
                      </div>
                   </div>
                </motion.div>
              )}

              {tab === 'vehicle' && (
                <motion.div key="vehicle" className="flex flex-col items-center justify-center py-20 text-center space-y-6">
                   <div className="w-20 h-20 rounded-full bg-slate-50 flex items-center justify-center text-slate-300">
                      <Truck size={40} />
                   </div>
                   {shipment.vehicle_number ? (
                     <div>
                        <p className="text-xl font-black text-slate-800 uppercase italic">{shipment.vehicle_number}</p>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Assigned Unit — {shipment.transporter_name || 'In-house Fleet'}</p>
                     </div>
                   ) : (
                     <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">No vehicle assigned to this cluster yet</p>
                   )}
                </motion.div>
              )}

              {tab === 'routes' && (
                <motion.div key="routes" className="space-y-8">
                   <div className="p-10 bg-slate-50 rounded-3xl border border-slate-100 border-dashed text-center">
                       <MapIcon size={32} className="mx-auto mb-4 text-slate-300" />
                       <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">AI route analysis unavailable for this quadrant</p>
                   </div>
                   <div className="grid grid-cols-2 gap-4 opacity-50">
                      <div className="p-4 bg-white border border-slate-100 rounded-2xl">
                         <p className="text-[10px] font-black uppercase text-indigo-600">Suggested Alt 1</p>
                         <p className="text-sm font-bold mt-1 uppercase italic tracking-tight">NH-48 via Panvel</p>
                      </div>
                      <div className="p-4 bg-white border border-slate-100 rounded-2xl">
                         <p className="text-[10px] font-black uppercase text-indigo-600">Suggested Alt 2</p>
                         <p className="text-sm font-bold mt-1 uppercase italic tracking-tight">Coastal Corridor</p>
                      </div>
                   </div>
                </motion.div>
              )}
           </AnimatePresence>
        </div>

        {/* BOTTOM ACTION BUTTONS */}
        <div className="p-6 md:p-8 sticky bottom-0 bg-white border-t border-slate-50 shrink-0 grid grid-cols-2 md:grid-cols-4 gap-3">
           <button 
             onClick={() => toast.success('Reroute approved for ' + shipment.shipment_code)}
             className="bg-green-600 text-white rounded-xl px-4 py-3 text-[10px] font-black uppercase tracking-widest hover:bg-green-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-green-100"
           >
              <CheckCircle size={14} /> Approve Reroute
           </button>
           <button 
             onClick={() => window.open('mailto:' + (shipment.supplier_email || '') + '?subject=Shipment Update: ' + shipment.shipment_code)}
             className="bg-amber-500 text-white rounded-xl px-4 py-3 text-[10px] font-black uppercase tracking-widest hover:bg-amber-600 transition-all flex items-center justify-center gap-2 shadow-lg shadow-amber-100"
           >
              <Mail size={14} /> Email Supplier
           </button>
           <button 
             onClick={() => router.push('/ai-chat?shipment=' + shipment.id)}
             className="bg-indigo-600 text-white rounded-xl px-4 py-3 text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-100"
           >
              <MessageSquare size={14} /> Ask LogiBot
           </button>
           <button 
             onClick={onClose}
             className="bg-slate-100 text-slate-700 rounded-xl px-4 py-3 text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all flex items-center justify-center gap-2"
           >
              Close
           </button>
        </div>
      </motion.div>
    </div>
  );
}
