"use client";

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import {
  generateShipmentCode, calcRiskScore, CITY_COORDS, getRouteOptions,
  riskColor, formatCurrency
} from '@/lib/utils';
import { getRouteWeatherRisk } from '@/lib/weather';
import type { ShipmentMode } from '@/types';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Truck, Train, Plane, Anchor, Package, User, Hash, FileText, 
  Calendar, Clock, AlertTriangle, ShieldCheck, Check, Sparkles, 
  ArrowRight, IndianRupee, Thermometer, CloudRain, Zap, ChevronRight, Info,
  Loader2, TrendingUp
} from 'lucide-react';
import { format } from 'date-fns';

const STEPS = [
  { label: 'Transport', icon: Truck },
  { label: 'Cargo', icon: Package },
  { label: 'Vehicle', icon: Hash },
  { label: 'Schedule', icon: Calendar },
  { label: 'Review', icon: ShieldCheck },
] as const;

const INDIAN_CITIES = Object.keys(CITY_COORDS).sort();

const MODE_OPTIONS = [
  { mode: 'road' as ShipmentMode, icon: Truck, label: 'Road', desc: 'Standard trucking' },
  { mode: 'rail' as ShipmentMode, icon: Train, label: 'Rail', desc: 'Rail freight' },
  { mode: 'air' as ShipmentMode, icon: Plane, label: 'Air', desc: 'Express air' },
  { mode: 'sea' as ShipmentMode, icon: Anchor, label: 'Sea', desc: 'Ocean cargo' },
] as const;

const CARGO_CATEGORIES = [
  { id: 'electronics', label: 'Electronics' },
  { id: 'textiles', label: 'Textiles' },
  { id: 'pharma', label: 'Pharmaceuticals' },
  { id: 'auto', label: 'Auto Parts' },
  { id: 'fmcg', label: 'FMCG' },
  { id: 'agri', label: 'Agriculture' },
  { id: 'chemicals', label: 'Chemicals' },
  { id: 'other', label: 'Other' },
];

const inputCls = "w-full bg-slate-50 border border-slate-200 rounded-xl py-4 px-5 text-[13px] text-slate-800 font-bold focus:ring-4 focus:ring-indigo-600/5 focus:border-indigo-600 outline-none transition-all placeholder-slate-400";
const labelCls = "block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2.5 ml-1";

const modeLabel = (m: string) => m.charAt(0).toUpperCase() + m.slice(1);

export default function ShipmentForm() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    mode: 'road' as ShipmentMode,
    origin: '', destination: '', transporter_name: '', vehicle_number: '',
    cargo_type: '', weight_kg: '', declared_value: '', supplier_name: '',
    supplier_email: '', eway_bill: '', eway_bill_expiry: '',
    fragile: false, cold_chain: false, hazardous: false, oversized: false,
    reference_number: '', departure: '', departure_time: '', eta: '',
    priority: 'normal', driver_contact: '', whatsapp_alerts: '', notes: '',
  });

  const setField = (k: keyof typeof form, v: string | boolean | number) => setForm(prev => ({ ...prev, [k]: v }));

  const routeOptions = useMemo(() => 
    form.origin && form.destination ? getRouteOptions(form.origin, form.destination, form.mode) : [], 
  [form.origin, form.destination, form.mode]);

  const primaryRoute = useMemo(() => 
    routeOptions.find(r => r.mode === form.mode), 
  [routeOptions, form.mode]);

  const riskScore = useMemo(() => 
    form.origin && form.destination ? calcRiskScore(form.mode, 'pending', parseFloat(form.weight_kg) || 1000) : 0, 
  [form.origin, form.destination, form.mode, form.weight_kg]);

  const weatherRisk = useMemo(() => 
    form.origin && form.destination ? getRouteWeatherRisk(form.origin, form.destination) : null,
  [form.origin, form.destination]);

  const estimatedPrice = useMemo(() => {
    if (!primaryRoute) return 0;
    const rates = { road: 18, air: 95, rail: 22, sea: 12 };
    return primaryRoute.km * rates[form.mode];
  }, [primaryRoute, form.mode]);

  const validate = (): string | null => {
    if (step === 0) {
      if (!form.origin) return 'Select starting city';
      if (!form.destination) return 'Select destination city';
      if (form.origin === form.destination) return 'Origin and destination must be different';
    }
    if (step === 1) {
      if (!form.cargo_type) return 'Select a cargo type';
      if (!form.weight_kg) return 'Enter shipment weight';
    }
    if (step === 2) {
      if (!form.vehicle_number) return 'Enter vehicle number';
    }
    if (step === 3) {
      if (!form.eta) return 'Select expected delivery date';
    }
    return null;
  };

  const next = () => {
    const err = validate();
    if (err) { toast.error(err); return; }
    setDirection(1);
    setStep(s => Math.min(s + 1, STEPS.length - 1));
  };

  const prev = () => {
    setDirection(-1);
    setStep(s => Math.max(s - 1, 0));
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Authentication session lost');

      const { error } = await supabase.from('shipments').insert({
        user_id: user.id,
        shipment_code: generateShipmentCode(),
        origin: form.origin, destination: form.destination,
        mode: form.mode, status: 'pending',
        eta: new Date(form.eta).toISOString(),
        cargo_type: form.cargo_type,
        weight_kg: parseFloat(form.weight_kg) || 0,
        declared_value: parseFloat(form.declared_value) || 0,
        supplier_name: form.supplier_name,
        supplier_email: form.supplier_email,
        vehicle_number: form.vehicle_number, transporter_name: form.transporter_name,
        eway_bill: form.eway_bill,
        reference_number: form.reference_number,
        driver_contact: form.driver_contact, whatsapp_alerts: form.whatsapp_alerts,
        priority: form.priority,
        special_handling: { fragile: form.fragile, cold_chain: form.cold_chain, hazardous: form.hazardous, oversized: form.oversized },
        notes: form.notes,
        risk_score: riskScore || 0,
      });

      if (error) throw error;
      toast.success('Shipment successfully created');
      router.push('/shipments');
    } catch (err: any) {
      toast.error(err.message || 'Failed to create shipment');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 md:gap-10 pb-20 mt-8">
        <div className="lg:col-span-8 space-y-8">
            {/* Stepper Progress */}
            <div className="premium-card p-6 md:p-8">
                <div className="flex justify-between items-center px-2 md:px-8">
                    {STEPS.map((s, i) => {
                        const Icon = s.icon;
                        const active = step === i;
                        const done = step > i;
                        return (
                            <div key={i} className="flex flex-col items-center relative z-10">
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500 border-2 ${
                                    active ? 'bg-indigo-600 border-indigo-600 text-white shadow-xl shadow-indigo-100 scale-110' : 
                                    done ? 'bg-emerald-50 text-emerald-600 border-emerald-100 shadow-sm' : 'bg-slate-50 text-slate-300 border-slate-100'
                                }`}>
                                    {done ? <Check size={20} strokeWidth={3} /> : <Icon size={20} />}
                                </div>
                                <span className={`text-[9px] font-black uppercase tracking-widest mt-4 ${active ? 'text-indigo-600' : 'text-slate-500'}`}>
                                    {s.label}
                                </span>
                                {i < STEPS.length - 1 && (
                                    <div className={`absolute left-full w-[calc(100%-48px)] h-0.5 top-6 -translate-x-1/2 z-[-1] ${done ? 'bg-emerald-200' : 'bg-slate-100'}`} />
                                )}
                            </div>
                        )
                    })}
                </div>
            </div>

            {/* Form Content */}
            <div className="premium-card overflow-hidden min-h-[500px] flex flex-col">
                <div className="flex-1 p-8 md:p-12">
                   <AnimatePresence mode="wait" custom={direction}>
                     <motion.div
                       key={step} 
                       custom={direction} 
                       initial={{ opacity: 0, x: direction * 40 }} 
                       animate={{ opacity: 1, x: 0 }} 
                       exit={{ opacity: 0, x: direction * -40 }}
                       transition={{ duration: 0.4, ease: "circOut" }}
                       className="space-y-10"
                     >
                       {step === 0 && (
                         <div className="space-y-10">
                            <div>
                               <label className={labelCls}>Select Transport Mode</label>
                               <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                  {MODE_OPTIONS.map(m => {
                                     const Icon = m.icon;
                                     const isActive = form.mode === m.mode;
                                     return (
                                        <button 
                                          key={m.mode} type="button" onClick={() => setField('mode', m.mode)} 
                                          className={`flex flex-col items-center p-6 rounded-2xl border-2 transition-all ${isActive ? 'border-indigo-600 bg-indigo-50/50 shadow-lg shadow-indigo-50' : 'border-slate-100 bg-white hover:border-slate-200'}`}
                                        >
                                           <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${isActive ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                                              <Icon size={24} />
                                           </div>
                                           <span className={`text-[11px] font-black uppercase tracking-widest ${isActive ? 'text-indigo-600' : 'text-slate-500'}`}>{m.label}</span>
                                        </button>
                                     )
                                  })}
                               </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                               <div>
                                  <label className={labelCls}>Origin City</label>
                                  <select value={form.origin} onChange={e => setField('origin', e.target.value)} className={inputCls}>
                                     <option value="">Select city</option>
                                     {INDIAN_CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                                  </select>
                               </div>
                               <div>
                                  <label className={labelCls}>Destination City</label>
                                  <select value={form.destination} onChange={e => setField('destination', e.target.value)} className={inputCls}>
                                     <option value="">Select city</option>
                                     {INDIAN_CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                                  </select>
                               </div>
                            </div>
                         </div>
                       )}

                       {step === 1 && (
                         <div className="space-y-10">
                            <div>
                               <label className={labelCls}>Cargo Category</label>
                               <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                  {CARGO_CATEGORIES.map(c => (
                                     <button 
                                       key={c.id} type="button" onClick={() => setField('cargo_type', c.label)} 
                                       className={`py-4 px-2 rounded-xl border-2 transition-all font-bold text-[11px] uppercase tracking-tighter ${form.cargo_type === c.label ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-slate-100 text-slate-500'}`}
                                     >
                                        {c.label}
                                     </button>
                                  ))}
                               </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                               <div>
                                  <label className={labelCls}>Weight (KG)</label>
                                  <input type="number" value={form.weight_kg} onChange={e => setField('weight_kg', e.target.value)} className={inputCls} placeholder="e.g. 1500" />
                               </div>
                               <div>
                                  <label className={labelCls}>Cargo Value (₹)</label>
                                  <input type="number" value={form.declared_value} onChange={e => setField('declared_value', e.target.value)} className={inputCls} placeholder="e.g. 50000" />
                               </div>
                            </div>

                            <div>
                               <label className={labelCls}>Supplier Name</label>
                               <input value={form.supplier_name} onChange={e => setField('supplier_name', e.target.value)} className={inputCls} placeholder="Company or Sender Name" />
                            </div>
                         </div>
                       )}

                       {step === 2 && (
                         <div className="space-y-10">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                               <div>
                                  <label className={labelCls}>Vehicle Number</label>
                                  <input value={form.vehicle_number} onChange={e => setField('vehicle_number', e.target.value)} className={inputCls} placeholder="e.g. KA-01-AB-1234" />
                               </div>
                               <div>
                                  <label className={labelCls}>Transport Partner</label>
                                  <input value={form.transporter_name} onChange={e => setField('transporter_name', e.target.value)} className={inputCls} placeholder="Logistics provider name" />
                               </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                               <div>
                                  <label className={labelCls}>E-Way Bill Number</label>
                                  <input value={form.eway_bill} onChange={e => setField('eway_bill', e.target.value)} className={inputCls} placeholder="Enter 12-digit code" />
                               </div>
                               <div>
                                  <label className={labelCls}>Reference ID (Optional)</label>
                                  <input value={form.reference_number} onChange={e => setField('reference_number', e.target.value)} className={inputCls} placeholder="Internal order ID" />
                               </div>
                            </div>
                         </div>
                       )}

                       {step === 3 && (
                         <div className="space-y-10">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                               <div>
                                  <label className={labelCls}>Expected Delivery (Local Time)</label>
                                  <input 
                                     type="datetime-local" 
                                     value={form.eta} 
                                     onChange={e => setField('eta', e.target.value)} 
                                     min={new Date(Date.now() + 3600000).toISOString().slice(0, 16)}
                                     className={inputCls} 
                                  />
                               </div>
                               <div>
                                  <label className={labelCls}>Priority Level</label>
                                  <select value={form.priority} onChange={e => setField('priority', e.target.value)} className={inputCls}>
                                     <option value="normal">Normal (Standard)</option>
                                     <option value="high">High (Priority)</option>
                                     <option value="urgent">Urgent (Immediate)</option>
                                  </select>
                               </div>
                            </div>

                            <div>
                               <label className={labelCls}>Operational Notes</label>
                               <textarea value={form.notes} onChange={e => setField('notes', e.target.value)} rows={4} className={inputCls + " resize-none"} placeholder="Special handling instructions, site contacts, etc." />
                            </div>
                         </div>
                       )}

                       {step === 4 && (
                         <div className="space-y-8">
                            <div className="flex items-center gap-4 py-6 border-b border-slate-100">
                               <div className="w-14 h-14 bg-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-lg">
                                  <ShieldCheck size={28} />
                               </div>
                               <div>
                                  <h3 className="text-2xl font-black text-slate-900 tracking-tighter uppercase italic">Final Review</h3>
                                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">Check all details before deploying</p>
                               </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                               <div className="space-y-4">
                                  <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest pb-2 border-b border-indigo-50">Route & Cargo</p>
                                  {[
                                    { l: 'Origin → Dest', v: `${form.origin} to ${form.destination}` },
                                    { l: 'Mode', v: `${modeLabel(form.mode)}` },
                                    { l: 'Cargo', v: `${form.cargo_type} (${form.weight_kg}kg)` },
                                    { l: 'Value', v: `${formatCurrency(parseFloat(form.declared_value) || 0)}` }
                                  ].map((row, i) => (
                                    <div key={i} className="flex justify-between items-center bg-slate-50 p-4 rounded-xl border border-slate-100 shadow-sm">
                                       <span className="text-[10px] font-black text-slate-500 uppercase">{row.l}</span>
                                       <span className="text-[12px] font-bold text-slate-900 uppercase italic">{row.v}</span>
                                    </div>
                                  ))}
                               </div>
                               <div className="space-y-4">
                                  <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest pb-2 border-b border-indigo-50">Schedule & Logistics</p>
                                  {[
                                    { l: 'Vehicle Number', v: form.vehicle_number },
                                    { l: 'Partner', v: form.transporter_name },
                                    { l: 'Expected Store', v: form.eta.replace('T', ' ') },
                                    { l: 'Priority', v: form.priority.toUpperCase() }
                                  ].map((row, i) => (
                                    <div key={i} className="flex justify-between items-center bg-slate-50 p-4 rounded-xl border border-slate-100">
                                       <span className="text-[10px] font-black text-slate-500 uppercase">{row.l}</span>
                                       <span className="text-[12px] font-bold text-slate-800 uppercase italic">{row.v}</span>
                                    </div>
                                  ))}
                               </div>
                            </div>
                         </div>
                       )}
                     </motion.div>
                   </AnimatePresence>
                </div>

                <div className="p-8 md:p-10 bg-slate-50 border-t border-slate-100 flex justify-between items-center shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)]">
                    <button 
                      onClick={prev} disabled={step === 0} 
                      className={`px-8 py-4 text-[10px] font-black uppercase tracking-[0.2em] rounded-2xl transition-all ${step === 0 ? 'opacity-0 pointer-events-none' : 'bg-white border border-slate-200 text-slate-500 hover:text-slate-800 shadow-sm hover:shadow-md'}`}
                    >
                       Go Back
                    </button>
                    <button 
                       onClick={step === STEPS.length - 1 ? handleSubmit : next} disabled={submitting}
                       className="px-10 py-5 bg-slate-900 text-white rounded-2xl text-[11px] font-black uppercase tracking-[0.3em] flex items-center gap-3 shadow-xl hover:bg-slate-800 transition-all active:scale-[0.98] border border-white/10"
                    >
                       {submitting ? <Loader2 className="animate-spin" size={16} /> : step === STEPS.length - 1 ? (
                         <>Create Shipment <Zap size={16} className="fill-white" /></>
                       ) : (
                         <>Continue to Next Step <ArrowRight size={16} /></>
                       )}
                    </button>
                </div>
            </div>
        </div>

        {/* Intelligence Sidebar */}
        <div className="lg:col-span-4 space-y-8">
            {/* Real-time Insights */}
            <div className="premium-card p-8 h-fit">
               <h4 className="text-[12px] font-black text-slate-900 uppercase tracking-widest mb-8 flex items-center gap-2">
                  <Sparkles size={16} className="text-indigo-600" /> AI Insights
               </h4>
               
               <div className="space-y-10">
                  {/* Distance & Time */}
                  {primaryRoute && (
                     <div className="space-y-4">
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Estimated Logistics</p>
                        <div className="grid grid-cols-2 gap-4">
                           <div className="p-5 bg-indigo-50/50 rounded-2xl border border-indigo-100">
                              <p className="text-[9px] font-black text-indigo-400 uppercase mb-1">Distance</p>
                              <p className="text-xl font-black text-indigo-900 italic">{primaryRoute.km} KM</p>
                           </div>
                           <div className="p-5 bg-indigo-50/50 rounded-2xl border border-indigo-100">
                              <p className="text-[9px] font-black text-indigo-400 uppercase mb-1">Time</p>
                              <p className="text-xl font-black text-indigo-900 italic">{primaryRoute.hours} HRS</p>
                           </div>
                        </div>
                     </div>
                  )}

                  {/* Pricing Prediction */}
                  {estimatedPrice > 0 && (
                     <div className="space-y-4">
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Cost Estimate</p>
                        <div className="p-6 bg-slate-900 rounded-3xl text-white relative overflow-hidden group">
                           <div className="absolute right-0 top-0 opacity-10 blur-sm group-hover:opacity-20 transition-all scale-150"><IndianRupee size={100} /></div>
                           <p className="text-[9px] font-black text-slate-500 uppercase mb-1 relative z-10">Market Average Rate</p>
                           <h3 className="text-3xl font-black italic tracking-tighter relative z-10">{formatCurrency(estimatedPrice)}</h3>
                           <p className="text-[9px] font-black text-emerald-400 uppercase mt-4 relative z-10 flex items-center gap-1.5"><TrendingUp size={12} /> Competitive Pricing</p>
                        </div>
                     </div>
                  )}

                  {/* Weather Risk */}
                  {weatherRisk && (
                     <div className="space-y-4">
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Weather Assessment</p>
                        <div className={`p-6 rounded-3xl border ${weatherRisk.overallRisk > 60 ? 'bg-rose-50 border-rose-100 text-rose-800' : 'bg-emerald-50 border-emerald-100 text-emerald-800'}`}>
                           <div className="flex items-center gap-2 mb-3">
                              <CloudRain size={16} />
                              <span className="text-[10px] font-black uppercase tracking-widest">{weatherRisk.primaryHazard} Warning</span>
                           </div>
                           <p className="text-[13px] font-bold italic leading-relaxed uppercase tracking-tight">
                              {weatherRisk.recommendation} • {weatherRisk.delayEstimateHours}H potential delay.
                           </p>
                        </div>
                     </div>
                  )}

                  {/* Placeholder if no data */}
                  {!form.origin && (
                     <div className="py-20 text-center space-y-4 opacity-40">
                        <div className="w-16 h-16 bg-slate-100 rounded-2xl mx-auto flex items-center justify-center text-slate-300">
                           <Zap size={32} />
                        </div>
                        <p className="text-[10px] font-black uppercase tracking-widest">Awaiting route data<br/>for analysis</p>
                     </div>
                  )}
               </div>
            </div>

            <div className="bg-indigo-600 p-8 rounded-[2.5rem] text-white shadow-xl relative overflow-hidden">
               <div className="relative z-10">
                  <div className="flex items-center gap-3 mb-4">
                     <Info size={16} className="text-indigo-200" />
                     <h4 className="text-[10px] font-black uppercase tracking-widest text-indigo-200">Pro Tip</h4>
                  </div>
                  <p className="text-[14px] leading-relaxed font-bold italic opacity-90">
                     Adding an accurate E-Way Bill now will allow our AI to pre-clear the shipment at terminal checkpoints automatically.
                  </p>
               </div>
               <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-white/5 rounded-full blur-3xl" />
            </div>
        </div>
    </div>
  );
}
