'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import type { Shipment, Driver, DispatchRoute } from '@/types';
import { 
  statusConfig, modeIcon, modeLabel, riskColor, riskLabel, formatCurrency, 
  estimateRevenue, CITY_COORDS, calculateDistance 
} from '@/lib/utils';
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
import { ModeIcon } from '../common/ModeIcon';

interface Props {
  shipment: Shipment;
  onClose: () => void;
  onUpdate: () => void;
}

type Tab = 'overview' | 'risk' | 'vehicle' | 'routes';

const getRiskFactors = (shipment: Shipment) => {
  const factors = [];
  
  if (shipment.risk_score >= 70) {
    factors.push({
      level: 'high',
      title: 'High Risk Route',
      description: `${shipment.origin} to ${shipment.destination} corridor has elevated disruption probability.`,
      action: 'Consider rerouting via alternative highway'
    });
  }
  
  if (shipment.mode === 'road' && shipment.risk_score > 40) {
    factors.push({
      level: 'medium',
      title: 'Highway Congestion Risk',
      description: 'NH corridors on this route show above-average traffic delays.',
      action: 'Allow 20% buffer time for ETA'
    });
  }
  
  if (shipment.mode === 'sea') {
    factors.push({
      level: 'medium',
      title: 'Port Processing Delay',
      description: 'JNPT and major ports experiencing moderate congestion.',
      action: 'Confirm container slot 48 hours in advance'
    });
  }
  
  if (shipment.mode === 'air') {
    factors.push({
      level: 'low',
      title: 'Weather Dependency',
      description: 'Air freight routes subject to weather holds at origin airport.',
      action: 'Monitor DGCA weather advisories'
    });
  }
  
  if (shipment.priority === 'high') {
    factors.push({
      level: 'medium',
      title: 'High Priority Cargo',
      description: 'Priority shipment requires enhanced tracking and escalation protocol.',
      action: 'Assign dedicated tracking officer'
    });
  }
  
  if (shipment.declared_value && shipment.declared_value > 300000) {
    factors.push({
      level: 'low',
      title: 'High Value Cargo Insurance',
      description: `Declared value ₹${shipment.declared_value.toLocaleString('en-IN')} requires enhanced coverage.`,
      action: 'Verify transit insurance coverage'
    });
  }
  
  if (factors.length === 0) {
    factors.push({
      level: 'low',
      title: 'Normal Operations',
      description: 'No significant risk factors detected for this shipment.',
      action: 'Continue standard monitoring'
    });
  }
  
  return factors;
};

const getAltRoutes = (shipment: Shipment) => {
  const distance = calculateDistance(shipment.origin, shipment.destination);
  if (distance === null) return [];
  const routes = [];
  
  if (shipment.mode !== 'road') {
    routes.push({
      id: 1,
      mode: 'road',
      description: `Road freight via NH corridor`,
      distance: Math.round(distance * 1.15),
      estimatedHours: Math.round(distance * 1.15 / 50),
      cost: Math.round(distance * 1.15 * 45),
      riskScore: Math.max(10, shipment.risk_score - 20),
      pros: 'Door-to-door delivery, flexible timing',
      cons: 'Slower than current mode',
    });
  }
  
  if (shipment.mode !== 'rail' && distance > 300) {
    routes.push({
      id: 2,
      mode: 'rail',
      description: `Indian Railways / DFCCIL freight corridor`,
      distance: Math.round(distance * 1.1),
      estimatedHours: Math.round(distance * 1.1 / 65),
      cost: Math.round(distance * 1.1 * 28),
      riskScore: Math.max(10, shipment.risk_score - 30),
      pros: 'Lower cost, reliable schedule, lower risk',
      cons: 'Fixed pickup/drop points',
    });
  }
  
  if (shipment.mode !== 'air' && shipment.declared_value && shipment.declared_value > 200000) {
    routes.push({
      id: 3,
      mode: 'air',
      description: `Air cargo via IndiGo Cargo / Blue Dart`,
      distance: Math.round(distance * 0.85),
      estimatedHours: Math.round(distance * 0.85 / 600) + 3,
      cost: Math.round(distance * 0.85 * 180),
      riskScore: Math.max(5, shipment.risk_score - 40),
      pros: 'Fastest delivery, high security',
      cons: 'Highest cost option',
    });
  }
  
  return routes;
};

const getDriverInfo = (shipment: Shipment) => {
  const drivers = [
    { name: 'Rajesh Kumar Singh', age: 38, license: 'DL-0420110123456', experience: '14 years', phone: '+91 98765 43210', address: 'Sector 12, Dwarka, New Delhi - 110075' },
    { name: 'Suresh Yadav', age: 44, license: 'MH-04-20150056789', experience: '18 years', phone: '+91 87654 32109', address: 'Andheri East, Mumbai, Maharashtra - 400069' },
    { name: 'Mohan Das', age: 35, license: 'KA-0120130098765', experience: '10 years', phone: '+91 76543 21098', address: 'Whitefield, Bangalore, Karnataka - 560066' },
    { name: 'Amit Sharma', age: 41, license: 'GJ-0120120067890', experience: '15 years', phone: '+91 65432 10987', address: 'Navrangpura, Ahmedabad, Gujarat - 380009' },
    { name: 'Ravi Verma', age: 39, license: 'TN-0920140089012', experience: '12 years', phone: '+91 54321 09876', address: 'Anna Nagar, Chennai, Tamil Nadu - 600040' },
  ];
  const index = shipment.id ? shipment.id.charCodeAt(shipment.id.length - 1) % drivers.length : 0;
  return drivers[index];
};

const ShipmentDetailModal = React.memo(({ shipment: initialShipment, onClose, onUpdate }: Props) => {
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
    if (shipment.status === 'delivered') return 100;
    if (shipment.status === 'pending') return 0;
    if (!shipment.eta) return 45;
    
    const created = new Date(shipment.created_at).getTime();
    const eta = new Date(shipment.eta).getTime();
    const now = Date.now();
    
    if (isNaN(created) || isNaN(eta) || eta <= created) return 45;
    
    return Math.min(100, Math.max(0, 
      Math.round(((now - created) / (eta - created)) * 100)
    ));
  }, [shipment.status, shipment.eta, shipment.created_at]);

  const totalDistance = useMemo(() => 
    calculateDistance(shipment.origin, shipment.destination), 
  [shipment]);

  const coveredKm = totalDistance ? Math.round(totalDistance * (progressPercent / 100)) : null;
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
              <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shrink-0">
                 <ModeIcon mode={shipment.mode} size={24} />
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
                       <ModeIcon mode={shipment.mode} size={10} className="inline mr-1" /> {shipment.mode}
                    </span>
                    <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-widest ${shipment.risk_score >= 70 ? 'bg-red-50 text-red-600' : 'bg-slate-100 text-slate-500'}`}>
                       {shipment.risk_score >= 70 ? 'High Priority' : 'Normal Priority'}
                    </span>
                 </div>
              </div>
           </div>
           <button onClick={onClose} className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-all">
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
                 className={`py-4 text-[11px] font-black uppercase tracking-widest relative flex items-center gap-2 transition-all whitespace-nowrap ${active ? 'text-indigo-600' : 'text-slate-500 hover:text-slate-600'}`}
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
                      <h4 className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">
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
                         <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase">
                            <span>~{coveredKm} km covered</span>
                            <span>~{hoursLeft}h remaining</span>
                         </div>
                      </div>
                   </section>

                   {/* B) SHIPMENT METRICS */}
                   <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {[
                        { label: 'ETA Hours', val: hoursLeft > 0 ? `${hoursLeft}h` : '—', color: 'text-slate-800' },
                        { label: 'Weight (kg)', val: shipment.weight_kg ? shipment.weight_kg.toLocaleString('en-IN') : '—', color: 'text-slate-800' },
                        { label: 'Route KM', val: totalDistance ? `${totalDistance.toLocaleString()} km` : '—', color: 'text-slate-800' },
                        { 
                          label: 'Risk Score', 
                          val: `${shipment.risk_score}%`, 
                          style: shipment.risk_score >= 70 ? 'bg-red-50 border-red-200 text-red-600' : 
                                 shipment.risk_score >= 40 ? 'bg-amber-50 border-amber-200 text-amber-600' : 
                                 'bg-green-50 border-green-200 text-green-600'
                        }
                      ].map((box, i) => (
                        <div key={i} className={`rounded-xl p-4 border text-center ${box.style || 'bg-white border-slate-100'}`}>
                           <p className="text-2xl font-black tracking-tighter" style={{ color: box.color }}>{box.val}</p>
                           <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mt-1">{box.label}</p>
                        </div>
                      ))}
                   </section>

                   {/* C) ROUTE TIMELINE */}
                   <section className="space-y-6">
                      <h4 className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">
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
                                  <p className="text-[10px] font-bold text-slate-500">Shipment Departed</p>
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
                                  <p className="text-[10px] font-bold text-slate-500">Live GPS · {minutesAgo} min ago</p>
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
                                  <p className="text-[10px] font-bold text-slate-500">ETA ~{hoursLeft}h</p>
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
                      <h4 className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">
                        <Package size={12} className="text-indigo-600" /> Cargo & Supplier
                      </h4>
                      <div className="grid grid-cols-2 gap-4">
                         {[
                           { label: 'Cargo Type', val: shipment.cargo_type || '--' },
                           { label: 'Supplier', val: shipment.supplier_name || '--' },
                           { label: 'Weight', val: `${shipment.weight_kg?.toLocaleString('en-IN')} kg` },
                           { label: 'Highway / Route', val: shipment.reference_number || 'NH-48 Corridor' },
                           { label: 'Transport Mode', val: shipment.mode.toUpperCase(), icon: <ModeIcon mode={shipment.mode} size={14} /> },
                           { label: 'Status', val: shipment.status.toUpperCase(), color: getStatusColor(shipment.status) },
                         ].map((cell, i) => (
                           <div key={i} className="bg-slate-50 rounded-xl p-4 border border-slate-100/50">
                              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{cell.label}</p>
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
                      <h5 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Risk Factors</h5>
                      <div className="space-y-3">
                         {getRiskFactors(shipment).map((factor, i) => (
                           <div key={i} className={`p-4 rounded-xl border-l-4 ${
                             factor.level === 'high' ? 'border-red-500 bg-red-50' :
                             factor.level === 'medium' ? 'border-amber-500 bg-amber-50' :
                             'border-green-500 bg-green-50'
                           }`}>
                             <div className="flex items-center gap-2 mb-1">
                               <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${
                                 factor.level === 'high' ? 'bg-red-100 text-red-700' :
                                 factor.level === 'medium' ? 'bg-amber-100 text-amber-700' :
                                 'bg-green-100 text-green-700'
                               }`}>{factor.level}</span>
                               <span className="font-bold text-[12px] text-slate-800 tracking-tight">{factor.title}</span>
                             </div>
                             <p className="text-[11px] text-slate-600 font-medium leading-relaxed">{factor.description}</p>
                             <p className="text-[10px] text-slate-500 mt-2 font-bold uppercase italic tracking-wide">💡 {factor.action}</p>
                           </div>
                         ))}
                      </div>
                   </div>
                </motion.div>
              )}

              {tab === 'vehicle' && (
                <motion.div key="vehicle" className="space-y-6">
                   {/* Driver Card */}
                   <div className="bg-indigo-50 rounded-3xl p-6 border border-indigo-100">
                     <div className="flex items-center gap-4 mb-6">
                       <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center text-white text-xl font-bold shadow-lg">
                         {getDriverInfo(shipment).name.charAt(0)}
                       </div>
                       <div>
                         <div className="text-lg font-black text-slate-800 tracking-tight italic uppercase">{getDriverInfo(shipment).name}</div>
                         <div className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Master Commander</div>
                       </div>
                       <span className="ml-auto bg-green-500 text-white text-[9px] px-3 py-1 rounded-full font-black uppercase tracking-widest">
                         Active
                       </span>
                     </div>
                     
                     <div className="grid grid-cols-2 gap-4">
                       <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-4 border border-white">
                         <div className="text-[9px] text-slate-500 font-black uppercase tracking-widest mb-1">Fleet Tenure</div>
                         <div className="font-black text-slate-800 tracking-tighter text-lg">{getDriverInfo(shipment).experience}</div>
                       </div>
                       <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-4 border border-white">
                         <div className="text-[9px] text-slate-500 font-black uppercase tracking-widest mb-1">Age Index</div>
                         <div className="font-black text-slate-800 tracking-tighter text-lg">{getDriverInfo(shipment).age} Yrs</div>
                       </div>
                       <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-4 border border-white col-span-2">
                         <div className="text-[9px] text-slate-500 font-black uppercase tracking-widest mb-1">Operational Licence</div>
                         <div className="font-bold text-slate-800 font-mono text-sm tracking-widest break-all">{getDriverInfo(shipment).license}</div>
                       </div>
                       <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-4 border border-white col-span-2">
                         <div className="text-[9px] text-slate-500 font-black uppercase tracking-widest mb-1">Registered Node</div>
                         <div className="font-bold text-slate-800 text-xs leading-loose italic uppercase tracking-tight">{getDriverInfo(shipment).address}</div>
                       </div>
                     </div>
                   </div>
                   
                   {/* Current Route Progress */}
                   <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm relative overflow-hidden">
                     <div className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4">Live Transit Logic</div>
                     <div className="flex items-center gap-3 mb-4">
                       <div className="w-2 h-2 bg-indigo-600 rounded-full animate-ping"></div>
                       <span className="text-[12px] font-black text-slate-800 uppercase italic tracking-tight">
                         {shipment.origin} <span className="text-slate-300 mx-1">→</span> {shipment.destination}
                       </span>
                     </div>
                     <div className="h-2 bg-slate-100 rounded-full overflow-hidden mb-2">
                       <motion.div 
                         initial={{ width: 0 }}
                         animate={{ width: `${progressPercent}%` }}
                         className="bg-indigo-600 h-full rounded-full"
                       />
                     </div>
                     <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest text-right">{progressPercent}% Vector coverage confirmed</div>
                   </div>
                   
                   {/* Contact Protocol */}
                   <div className="grid grid-cols-2 gap-4">
                     <a 
                       href={`tel:${getDriverInfo(shipment).phone}`}
                       className="flex items-center justify-center gap-3 bg-indigo-600 text-white rounded-2xl py-5 text-[10px] font-black uppercase tracking-widest hover:bg-slate-900 transition-all shadow-lg active:scale-95"
                     >
                       📞 Voice Protocol
                     </a>
                     <a 
                       href={`sms:${getDriverInfo(shipment).phone}?body=Regarding shipment ${shipment.shipment_code}: Status update required immediately.`}
                       className="flex items-center justify-center gap-3 bg-slate-100 text-slate-800 rounded-2xl py-5 text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all active:scale-95"
                     >
                       💬 Comms Protocol
                     </a>
                   </div>
                </motion.div>
              )}

              {tab === 'routes' && (
                <motion.div key="routes" className="space-y-6">
                   <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 text-center border-dashed">
                      <Sparkles size={24} className="mx-auto mb-3 text-indigo-600" />
                      <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest">Advanced Vector Alternatives Synthesis</p>
                   </div>
                   
                   <div className="space-y-4">
                      {getAltRoutes(shipment).map((route) => (
                        <div key={route.id} className="border border-slate-100 rounded-[2rem] p-6 bg-white hover:border-indigo-200 hover:shadow-xl transition-all group overflow-hidden relative">
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                                <ModeIcon mode={route.mode} size={20} />
                              </div>
                              <span className="font-black text-slate-800 uppercase italic tracking-tight">{route.mode} Logistics</span>
                            </div>
                            <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full ${
                              route.riskScore < 30 ? 'bg-green-100 text-green-700' :
                              route.riskScore < 60 ? 'bg-amber-100 text-amber-700' :
                              'bg-red-100 text-red-700'
                            }`}>Risk Index: {route.riskScore}/100</span>
                          </div>
                          
                          <p className="text-[12px] font-bold text-slate-500 mb-6 italic">{route.description}</p>
                          
                          <div className="grid grid-cols-3 gap-3 mb-6">
                            <div className="text-center bg-slate-50 rounded-2xl p-4 border border-white">
                              <div className="font-black text-slate-800 tracking-tighter">{route.distance} KM</div>
                              <div className="text-[8px] text-slate-500 uppercase font-black tracking-widest mt-1">Distance</div>
                            </div>
                            <div className="text-center bg-slate-50 rounded-2xl p-4 border border-white">
                              <div className="font-black text-slate-800 tracking-tighter">~{route.estimatedHours}H</div>
                              <div className="text-[8px] text-slate-500 uppercase font-black tracking-widest mt-1">Cycle Time</div>
                            </div>
                            <div className="text-center bg-indigo-50 rounded-2xl p-4 border border-white">
                              <div className="font-black text-indigo-600 tracking-tighter">
                                ₹{route.cost.toLocaleString('en-IN')}
                              </div>
                              <div className="text-[8px] text-indigo-400 uppercase font-black tracking-widest mt-1">Est. Cost</div>
                            </div>
                          </div>
                          
                          <div className="space-y-2 mb-6">
                            <div className="flex items-center gap-2 text-[10px] font-bold text-emerald-600 uppercase tracking-tight">
                               <CheckCircle size={14} />
                               {route.pros}
                            </div>
                            <div className="flex items-center gap-2 text-[10px] font-bold text-rose-400 uppercase tracking-tight">
                               <X size={14} />
                               {route.cons}
                            </div>
                          </div>
                          
                          <button
                            type="button"
                            onClick={() => {
                              toast.success(
                                `Reroute approved: ${shipment.origin} → ${shipment.destination} via ${route.mode.toUpperCase()} (₹${route.cost.toLocaleString('en-IN')})`,
                                { duration: 4000 }
                              );
                            }}
                            className="w-full bg-slate-900 text-white rounded-2xl py-4 text-[10px] font-black uppercase tracking-widest hover:bg-green-600 transition-all shadow-lg active:scale-95"
                          >
                             Deploy Alternative Infrastructure — ₹{route.cost.toLocaleString('en-IN')}
                          </button>
                        </div>
                      ))}
                   </div>
                </motion.div>
              )}
           </AnimatePresence>
        </div>

        {/* BOTTOM ACTION BUTTONS */}
        <div className="p-6 md:p-8 sticky bottom-0 bg-white border-t border-slate-50 shrink-0 grid grid-cols-3 gap-3">
           <button 
             onClick={() => {
               const subject = encodeURIComponent(
                 `Shipment Protocol Update: ${shipment.shipment_code} — ${shipment.origin} to ${shipment.destination}`
               );
               const body = encodeURIComponent(
                 `Dear Ops Lead,\n\n` +
                 `System update for high-priority logistics stream:\n\n` +
                 `IDENTIFIER: ${shipment.shipment_code}\n` +
                 `VECTOR: ${shipment.origin} → ${shipment.destination}\n` +
                 `PLATFORM: ${shipment.mode?.toUpperCase()}\n` +
                 `PROTOCOL STATUS: ${shipment.status?.replace('_', ' ').toUpperCase()}\n` +
                 `CARGO SPEC: ${shipment.cargo_type || 'N/A'}\n` +
                 `MASS: ${shipment.weight_kg?.toLocaleString('en-IN')} kg\n` +
                 `VALUATION: ₹${shipment.declared_value?.toLocaleString('en-IN')}\n` +
                 `ARRIVAL TARGET: ${shipment.eta ? format(new Date(shipment.eta), 'dd MMM yyyy, HH:mm') : 'TBD'}\n` +
                 `RISK INDEX: ${shipment.risk_score}/100\n\n` +
                 `Please acknowledge network status update.\n\n` +
                 `Regards,\nLogiFlow Command Center\nlogiflow-lake.vercel.app`
               );
               window.open(`mailto:?subject=${subject}&body=${body}`);
               toast.success('Communication template deployed');
             }}
             className="bg-amber-500 text-white rounded-xl px-4 py-3 text-[10px] font-black uppercase tracking-widest hover:bg-amber-600 transition-all flex items-center justify-center gap-2 shadow-lg shadow-amber-100"
           >
              <Mail size={14} /> Email Lead
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
});

export default ShipmentDetailModal;
