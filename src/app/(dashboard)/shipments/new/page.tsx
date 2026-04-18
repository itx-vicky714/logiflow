"use client";

import React, { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import {
  generateShipmentCode, calcRiskScore, CITY_COORDS, getRouteOptions,
  modeIcon, formatCurrency, riskColor
} from '@/lib/utils';
import type { ShipmentMode } from '@/types';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

const STEPS = [
  { label: 'Tactical Route', desc: 'Vector & Node alignment' },
  { label: 'Payload Profile', desc: 'Mass & Category spec' },
  { label: 'Temporal Sync', desc: 'Schedule & Priority' },
  { label: 'Protocol Launch', desc: 'Final manifest audit' },
] as const;

const INDIAN_CITIES = Object.keys(CITY_COORDS).sort();

const MODE_OPTIONS = [
  { mode: 'road' as ShipmentMode, icon: 'local_shipping', label: 'Road', desc: 'Standard Grid' },
  { mode: 'rail' as ShipmentMode, icon: 'train', label: 'Rail', desc: 'Heavy Freight' },
  { mode: 'air' as ShipmentMode, icon: 'flight', label: 'Orbital', desc: 'Express Peak' },
  { mode: 'sea' as ShipmentMode, icon: 'directions_boat', label: 'Deep Sea', desc: 'Volume Bulk' },
] as const;

const CARGO_CATEGORIES = [
  { id: 'electronics', icon: 'smartphone', label: 'Electronics' },
  { id: 'textiles', icon: 'apparel', label: 'Textiles' },
  { id: 'pharmaceuticals', icon: 'health_and_safety', label: 'Pharma' },
  { id: 'auto_parts', icon: 'settings', label: 'Auto Parts' },
  { id: 'fmcg', icon: 'shopping_basket', label: 'FMCG' },
  { id: 'agriculture', icon: 'agriculture', label: 'Agriculture' },
  { id: 'chemicals', icon: 'science', label: 'Chemicals' },
  { id: 'machinery', icon: 'precision_manufacturing', label: 'Machinery' },
  { id: 'handicrafts', icon: 'palette', label: 'Handicrafts' },
  { id: 'it_equipment', icon: 'computer', label: 'IT Equipment' },
  { id: 'other', icon: 'package_2', label: 'Other' },
];

const inputCls = "w-full bg-surface-container-low border-none rounded-xl py-4 px-6 text-[13px] text-on-surface font-bold focus:ring-2 focus:ring-[#493ee5]/10 outline-none transition-all placeholder-on-surface-variant/30";
const labelCls = "block text-[10px] font-black text-on-surface-variant uppercase tracking-[0.2em] mb-3 ml-1";

export default function NewShipmentPage() {
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

  const routeOptions = form.origin && form.destination ? getRouteOptions(form.origin, form.destination, form.mode) : [];
  const primaryRoute = routeOptions.find(r => r.mode === form.mode);
  const riskScore = form.origin && form.destination ? calcRiskScore(form.mode, 'pending', parseFloat(form.weight_kg) || 1000) : null;

  const validate = (): string | null => {
    if (step === 0) {
      if (!form.origin) return 'Select origin hub';
      if (!form.destination) return 'Select target terminus';
      if (form.origin === form.destination) return 'Hubs must be unique';
    }
    if (step === 1) {
      if (!form.cargo_type) return 'Select payload character';
      if (!form.weight_kg) return 'Enter payload mass';
      if (!form.supplier_name) return 'Enter entity identity';
    }
    if (step === 2) {
      if (!form.eta) return 'Establish ETA protocol';
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
      if (!user) throw new Error('User Protocol Null');

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
      toast.success('Manifest Protocol Deployed');
      router.push('/shipments');
    } catch (err: any) {
      toast.error(err.message || 'Deployment Failure');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-12 max-w-[1400px] mx-auto font-['Inter'] antialiased tracking-tight text-[#191c1e] animate-in fade-in slide-in-from-bottom-4 duration-700">

      {/* Page Header */}
      <div className="flex items-center justify-between">
         <div className="flex items-center gap-6">
            <button 
              onClick={() => router.back()} 
              className="w-12 h-12 bg-surface-container-lowest border border-white/50 rounded-2xl flex items-center justify-center curated-shadow hover:scale-105 transition-all group active:scale-95"
            >
               <span className="material-symbols-outlined text-on-surface-variant group-hover:text-on-surface">arrow_back</span>
            </button>
            <div>
               <h1 className="text-4xl font-black text-on-surface tracking-tighter uppercase">Initialize Manifest</h1>
               <div className="flex items-center gap-2 mt-2">
                  <span className="status-pulse bg-primary" />
                  <p className="text-[10px] font-black text-on-surface-variant uppercase tracking-[0.3em]">Sequence {step + 1} of 4 • Protocol Stable</p>
               </div>
            </div>
         </div>
      </div>

      {/* Stepper Logic with Precision Styling */}
      <div className="bg-surface-container-lowest rounded-2xl p-4 border border-white/50 curated-shadow">
         <div className="flex p-2 gap-2">
            {STEPS.map((s, i) => (
               <div key={i} className={`flex-1 flex flex-col items-center py-5 rounded-xl transition-all duration-500 relative ${step === i ? 'bg-surface-container text-on-surface' : 'text-on-surface-variant/40'}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center mb-1 text-[11px] font-black italic ${step === i ? 'bg-primary text-on-primary' : i < step ? 'text-[#493ee5]' : 'text-on-surface-variant/20'}`}>
                     {i < step ? <span className="material-symbols-outlined text-[14px]">check</span> : i + 1}
                  </div>
                  <span className="text-[9px] font-black uppercase tracking-widest">{s.label}</span>
                  {step === i && <motion.div layoutId="step-dot" className="absolute -bottom-1 w-1 h-1 bg-primary rounded-full" />}
               </div>
            ))}
         </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 pb-20">
        
        {/* Main Content Area */}
        <div className="lg:col-span-8 space-y-10">
           <div className="bg-surface-container-lowest rounded-3xl border border-white/50 curated-shadow overflow-hidden">
             <AnimatePresence mode="wait" custom={direction}>
               <motion.div
                 key={step} custom={direction} initial={{ opacity: 0, x: direction * 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: direction * -40 }}
                 transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                 className="p-12 space-y-10"
               >
                 {step === 0 && (
                   <div className="space-y-10">
                      <div className="space-y-3">
                         <label className={labelCls}>Tactical Vector Strategy</label>
                         <div className="grid grid-cols-4 gap-4">
                            {MODE_OPTIONS.map(m => (
                               <button 
                                 key={m.mode} type="button" onClick={() => setField('mode', m.mode)} 
                                 className={`flex flex-col items-center p-6 rounded-2xl border-2 transition-all hover:scale-105 ${form.mode === m.mode ? 'border-primary bg-primary-fixed shadow-lg shadow-primary/10' : 'border-surface-container-low bg-surface-container-low/50 grayscale opacity-40 hover:grayscale-0 hover:opacity-100'}`}
                               >
                                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${form.mode === m.mode ? 'bg-primary text-on-primary' : 'bg-surface-container-lowest'}`}>
                                     <span className="material-symbols-outlined text-[24px]">{m.icon}</span>
                                  </div>
                                  <span className={`text-[11px] font-black uppercase tracking-widest ${form.mode === m.mode ? 'text-[#493ee5]' : 'text-on-surface-variant'}`}>{m.label}</span>
                               </button>
                            ))}
                         </div>
                      </div>

                      <div className="grid grid-cols-2 gap-8">
                         <div>
                            <label className={labelCls}>Origin Hub Node</label>
                            <select value={form.origin} onChange={e => setField('origin', e.target.value)} className={inputCls}>
                               <option value="">Select Origin</option>
                               {INDIAN_CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                         </div>
                         <div>
                            <label className={labelCls}>Target Terminus Node</label>
                            <select value={form.destination} onChange={e => setField('destination', e.target.value)} className={inputCls}>
                               <option value="">Select Destination</option>
                               {INDIAN_CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                         </div>
                      </div>

                      <div className="grid grid-cols-2 gap-8">
                         <div>
                            <label className={labelCls}>Vessel / HGV Identification</label>
                            <input value={form.vehicle_number} onChange={e => setField('vehicle_number', e.target.value)} className={inputCls} placeholder="Terminal ID Code" />
                         </div>
                         <div>
                            <label className={labelCls}>Contract Logistics Provider</label>
                            <input value={form.transporter_name} onChange={e => setField('transporter_name', e.target.value)} className={inputCls} placeholder="Fleet Organization" />
                         </div>
                      </div>
                   </div>
                 )}

                 {step === 1 && (
                   <div className="space-y-10">
                      <div className="space-y-3">
                         <label className={labelCls}>Payload Categorization</label>
                         <div className="grid grid-cols-4 gap-3">
                            {CARGO_CATEGORIES.map(c => (
                               <button 
                                 key={c.id} type="button" onClick={() => setField('cargo_type', c.label)} 
                                 className={`p-4 rounded-xl border-2 transition-all text-center flex flex-col items-center gap-2 ${form.cargo_type === c.label ? 'border-primary bg-primary-fixed text-on-surface shadow-md' : 'border-surface-container-low bg-surface-container-low/30 grayscale opacity-40 hover:grayscale-0 hover:opacity-100'}`}
                               >
                                  <span className={`material-symbols-outlined text-[18px] ${form.cargo_type === c.label ? 'text-[#493ee5]' : 'text-on-surface-variant'}`}>{c.icon}</span>
                                  <span className="text-[9px] font-black uppercase tracking-widest">{c.label}</span>
                               </button>
                            ))}
                         </div>
                      </div>

                      <div className="grid grid-cols-2 gap-8">
                         <div>
                            <label className={labelCls}>Operational Mass (KG)</label>
                            <input type="number" value={form.weight_kg} onChange={e => setField('weight_kg', e.target.value)} className={inputCls} placeholder="0.00" />
                         </div>
                         <div>
                            <label className={labelCls}>Declared Protocol Value (₹)</label>
                            <input type="number" value={form.declared_value} onChange={e => setField('declared_value', e.target.value)} className={inputCls} placeholder="0.00" />
                         </div>
                      </div>

                      <div className="grid grid-cols-2 gap-8">
                         <div>
                            <label className={labelCls}>Supplier Organization</label>
                            <input value={form.supplier_name} onChange={e => setField('supplier_name', e.target.value)} className={inputCls} placeholder="Entity Identity" />
                         </div>
                         <div>
                            <label className={labelCls}>E-Way Bill Registry</label>
                            <input value={form.eway_bill} onChange={e => setField('eway_bill', e.target.value)} className={inputCls} placeholder="Validated ID" />
                         </div>
                      </div>

                      <div className="space-y-3">
                         <label className={labelCls}>Advanced Handling Protocols</label>
                         <div className="flex flex-wrap gap-4">
                            {[
                               { k: 'fragile', l: 'Sensitive Handle', i: 'frailty' },
                               { k: 'cold_chain', l: 'Thermal Controlled', i: 'thermostat' },
                               { k: 'hazardous', l: 'Protocol Hazard', i: 'warning' },
                               { k: 'oversized', l: 'Critical Dimension', i: 'aspect_ratio' }
                            ].map(opt => (
                               <button 
                                 key={opt.k} type="button" onClick={() => setField(opt.k as any, !form[opt.k as keyof typeof form])} 
                                 className={`px-6 py-4 rounded-xl border-2 text-[10px] font-black uppercase tracking-widest flex items-center gap-3 transition-all ${form[opt.k as keyof typeof form] ? 'bg-on-surface text-inverse-on-surface border-on-surface shadow-lg' : 'bg-surface-container-low/30 border-transparent text-on-surface-variant'}`}
                               >
                                  <span className="material-symbols-outlined text-[16px]">{opt.i}</span> {opt.l}
                                </button>
                            ))}
                         </div>
                      </div>
                   </div>
                 )}

                 {step === 2 && (
                   <div className="space-y-10">
                      <div className="grid grid-cols-2 gap-8">
                         <div>
                            <label className={labelCls}>Tactical Priority</label>
                            <select value={form.priority} onChange={e => setField('priority', e.target.value)} className={inputCls}>
                               <option value="normal">Standard Operational</option>
                               <option value="high">Priority Vector</option>
                               <option value="urgent">Critical Urgency</option>
                            </select>
                         </div>
                         <div>
                            <label className={labelCls}>Target Delivery Window (ETA)</label>
                            <input type="datetime-local" value={form.eta} onChange={e => setField('eta', e.target.value)} className={inputCls} />
                         </div>
                      </div>

                      <div className="grid grid-cols-2 gap-8">
                         <div>
                            <label className={labelCls}>Driver Node Identity</label>
                            <input value={form.driver_contact} onChange={e => setField('driver_contact', e.target.value)} className={inputCls} placeholder="+91 Protocol Line" />
                         </div>
                         <div>
                            <label className={labelCls}>Internal Reference Registry</label>
                            <input value={form.reference_number} onChange={e => setField('reference_number', e.target.value)} className={inputCls} placeholder="Manifest Code" />
                         </div>
                      </div>

                      <div className="space-y-3">
                         <label className={labelCls}>Instructional Payload</label>
                         <textarea value={form.notes} onChange={e => setField('notes', e.target.value)} rows={4} className={inputCls + " resize-none"} placeholder="Operational specifics..." />
                      </div>
                   </div>
                 )}

                 {step === 3 && (
                   <div className="space-y-12">
                      <div className="flex items-center gap-6 py-8 border-b border-surface-container">
                         <div className="w-16 h-16 bg-primary-fixed rounded-3xl flex items-center justify-center text-primary shadow-sm">
                            <span className="material-symbols-outlined text-[32px]">verified</span>
                         </div>
                         <div>
                            <h3 className="text-2xl font-black italic uppercase tracking-tighter">Manifest Audit</h3>
                            <p className="text-[10px] font-black text-on-surface-variant uppercase tracking-[0.2em] mt-1">Review all vector parameters before launch</p>
                         </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                         <div className="space-y-6">
                            <p className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest border-b border-surface-container pb-2">Deployment Strategy</p>
                            <div className="space-y-5">
                               {[
                                 { l: 'Target Corridor', v: `${form.origin} ⇾ ${form.destination}` },
                                 { l: 'Vector Mode', v: `${form.mode.toUpperCase()} Transit` },
                                 { l: 'Payload character', v: `${form.cargo_type} || ${form.weight_kg}KG` }
                               ].map((audit, i) => (
                                 <div key={i} className="flex justify-between items-center italic">
                                   <span className="text-[11px] font-black text-on-surface-variant/60 uppercase">{audit.l}</span>
                                   <span className="text-[13px] font-black text-on-surface uppercase">{audit.v}</span>
                                 </div>
                               ))}
                            </div>
                         </div>
                         <div className="space-y-6">
                            <p className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest border-b border-surface-container pb-2">Temporal Protocol</p>
                            <div className="space-y-5">
                               {[
                                 { l: 'Priority Status', v: `${form.priority} Protocol`, err: form.priority === 'urgent' },
                                 { l: 'Delivery window', v: form.eta.replace('T', ' ') },
                                 { l: 'Supplier Entity', v: form.supplier_name, dim: true }
                               ].map((audit, i) => (
                                 <div key={i} className="flex justify-between items-center italic">
                                   <span className="text-[11px] font-black text-on-surface-variant/60 uppercase">{audit.l}</span>
                                   <span className={`text-[13px] font-black uppercase ${audit.err ? 'text-error' : 'text-on-surface'} ${audit.dim ? 'opacity-40' : ''}`}>{audit.v}</span>
                                 </div>
                               ))}
                            </div>
                         </div>
                      </div>
                   </div>
                 )}
               </motion.div>
             </AnimatePresence>

             {/* Footer Navigation */}
             <div className="px-12 py-10 bg-surface-container-low/30 border-t border-surface-container flex items-center justify-between">
                <button 
                  onClick={prev} disabled={step === 0} 
                  className={`flex items-center gap-3 text-[10px] font-black uppercase tracking-widest py-4 px-8 rounded-2xl transition-all ${step === 0 ? 'opacity-0' : 'bg-surface-container-lowest border border-white/50 hover:curated-shadow active:scale-95'}`}
                >
                   <span className="material-symbols-outlined text-[16px]">west</span>
                   <span>Revert Protocol</span>
                </button>
                <div className="flex gap-4">
                   <button 
                     onClick={step === STEPS.length - 1 ? handleSubmit : next} disabled={submitting}
                     className="px-12 py-5 bg-on-surface text-inverse-on-surface rounded-2xl text-[11px] font-black uppercase tracking-[0.3em] flex items-center gap-4 shadow-2xl hover:opacity-95 active:scale-95 transition-all"
                   >
                      {submitting ? <span className="status-pulse bg-primary w-4 h-4" /> : step === STEPS.length - 1 ? (
                        <>Deploy Operational Node <span className="material-symbols-outlined text-[16px]">bolt</span></>
                      ) : (
                        <>Sequence Next <span className="material-symbols-outlined text-[16px]">east</span></>
                      )}
                   </button>
                </div>
             </div>
           </div>
        </div>

        {/* Tactical Pre-Auth Sidebar */}
        <div className="lg:col-span-4 space-y-8">
           <div className="bg-surface-container-lowest rounded-3xl p-8 curated-shadow border border-white/50">
              <h4 className="text-[11px] font-black text-on-surface-variant uppercase tracking-widest mb-8">Vector Telemetry</h4>
              <div className="space-y-10">
                 {form.origin && form.destination && (
                    <div className="relative pl-6 space-y-8 border-l-2 border-surface-container">
                       <div className="absolute top-0 -left-[5px] w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]" />
                       <div className="absolute bottom-0 -left-[5px] w-2 h-2 rounded-full bg-error shadow-[0_0_10px_rgba(186,22,22,0.3)]" />
                       <div>
                          <p className="text-[9px] font-black text-on-surface-variant uppercase mb-1">Origin Node</p>
                          <p className="text-xl font-black text-on-surface italic uppercase tracking-tighter">{form.origin}</p>
                       </div>
                       <div>
                          <p className="text-[9px] font-black text-on-surface-variant uppercase mb-1">Target Terminus</p>
                          <p className="text-xl font-black text-on-surface italic uppercase tracking-tighter">{form.destination}</p>
                       </div>
                    </div>
                 )}

                 {primaryRoute && (
                    <div className="grid grid-cols-2 gap-4">
                       <div className="bg-surface-container-low p-5 rounded-2xl border border-white/50">
                          <p className="text-[8px] font-black text-on-surface-variant uppercase mb-1">Bandwidth</p>
                          <p className="text-xl font-black text-on-surface italic">{primaryRoute.km}KM</p>
                       </div>
                       <div className="bg-surface-container-low p-5 rounded-2xl border border-white/50">
                          <p className="text-[8px] font-black text-on-surface-variant uppercase mb-1">Latency</p>
                          <p className="text-xl font-black text-on-surface italic">{primaryRoute.hours}H</p>
                       </div>
                    </div>
                 )}

                 {riskScore !== null && (
                    <div className="bg-on-surface p-8 rounded-[2rem] text-inverse-on-surface shadow-xl">
                       <div className="flex justify-between items-center mb-6">
                          <span className="material-symbols-outlined text-[#493ee5] text-[24px]">shield</span>
                          <span className="text-[11px] font-black uppercase italic tracking-widest text-[#493ee5]">Risk Matrix</span>
                       </div>
                       <div className="text-5xl font-black italic tracking-tighter mb-4">{riskScore}</div>
                       <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden mb-4">
                          <motion.div initial={{ width: 0 }} animate={{ width: `${riskScore}%` }} className={`h-full ${riskScore > 70 ? 'bg-error' : 'bg-primary'}`} />
                       </div>
                       <p className="text-[9px] font-black uppercase tracking-[0.2em] opacity-40">Dynamic Score analysis finalized</p>
                    </div>
                 )}
              </div>
           </div>

           <div className="bg-[#493ee5] p-10 rounded-[2.5rem] text-on-primary curated-shadow relative overflow-hidden group">
              <span className="material-symbols-outlined absolute top-0 -right-4 text-[120px] opacity-10 rotate-12 group-hover:rotate-6 group-hover:scale-110 transition-all duration-700">security_update_good</span>
              <h4 className="text-[11px] font-black uppercase tracking-widest mb-4">Tactical Directive</h4>
              <p className="text-[15px] leading-relaxed font-bold italic opacity-95">
                 Inter-hub tactical vectors require active E-Way Bill registry for grid synchronization and terminal clearance. Verify registry status post-dispatch.
              </p>
           </div>
        </div>

      </div>
    </div>
  );
}
