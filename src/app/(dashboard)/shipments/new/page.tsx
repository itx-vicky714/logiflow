"use client";

import React, { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { generateShipmentCode, calcRiskScore, CITY_COORDS, getRouteOptions, modeIcon, formatCurrency, riskColor, riskLabel } from '@/lib/utils';
import type { ShipmentMode } from '@/types';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft, ChevronRight, Check, Loader2, MapPin, Package, Calendar,
  FileText, AlertTriangle, Route, Zap, ArrowRight, Clock, DollarSign,
  Navigation, Shield, Truck, TrainFront, Plane, Anchor, Smartphone, Shirt,
  Thermometer, Settings, ShoppingBag, Leaf, FlaskConical, Hammer, Palette,
  Monitor, Cloud, ShieldAlert, Activity, Maximize2
} from 'lucide-react';

const STEPS = [
  { label: 'Route & Mode', icon: Route, desc: 'Origin, destination, transport' },
  { label: 'Cargo Details', icon: Package, desc: 'Type, weight, supplier' },
  { label: 'Schedule', icon: Calendar, desc: 'Dates, contacts, priority' },
  { label: 'Confirm & Launch', icon: Check, desc: 'Review and submit' },
] as const;

const INDIAN_CITIES = Object.keys(CITY_COORDS).sort();

const MODE_OPTIONS = [
  { mode: 'road' as ShipmentMode, icon: Truck, label: 'Road Freight',  desc: 'Primary network', color: 'from-orange-500/10 to-orange-50 border-orange-200', text: 'text-orange-600' },
  { mode: 'rail' as ShipmentMode, icon: TrainFront, label: 'Rail Cargo',  desc: 'High efficiency', color: 'from-blue-500/10 to-blue-50 border-blue-200', text: 'text-blue-600' },
  { mode: 'air' as ShipmentMode, icon: Plane, label: 'Air Express',   desc: 'Priority transit', color: 'from-violet-500/10 to-violet-50 border-violet-200', text: 'text-violet-600' },
  { mode: 'sea' as ShipmentMode, icon: Anchor, label: 'Sea Volume',   desc: 'Bulk economy',     color: 'from-emerald-500/10 to-emerald-50 border-emerald-200', text: 'text-emerald-600' },
] as const;

const CARGO_CATEGORIES = [
  { id: 'electronics',     icon: Smartphone, label: 'Electronics' },
  { id: 'textiles',        icon: Shirt, label: 'Textiles' },
  { id: 'pharmaceuticals', icon: Thermometer, label: 'Pharma' },
  { id: 'auto_parts',      icon: Settings, label: 'Auto Parts' },
  { id: 'fmcg',            icon: ShoppingBag, label: 'FMCG' },
  { id: 'agriculture',     icon: Leaf, label: 'Agriculture' },
  { id: 'chemicals',       icon: FlaskConical, label: 'Chemicals' },
  { id: 'machinery',       icon: Hammer, label: 'Machinery' },
  { id: 'handicrafts',     icon: Palette, label: 'Handicrafts' },
  { id: 'it_equipment',    icon: Monitor, label: 'IT Equipment' },
  { id: 'other',           icon: Package, label: 'Other' },
];

const PRIORITY_OPTIONS = [
  { value: 'normal', label: 'Normal', icon: Activity, cls: 'border-emerald-200 bg-emerald-50 text-emerald-700' },
  { value: 'high',   label: 'High',   icon: Zap, cls: 'border-amber-200 bg-amber-50 text-amber-700' },
  { value: 'urgent', label: 'Urgent', icon: ShieldAlert, cls: 'border-red-200 bg-red-50 text-red-700' },
];

const inputCls = "w-full bg-white border-[1.5px] border-slate-200 rounded-xl py-3 px-4 text-[14px] font-medium text-slate-800 focus:outline-none focus:border-[#3b5bdb] focus:ring-2 focus:ring-indigo-100 transition-all placeholder-slate-400 hover:border-slate-300";
const labelCls = "block text-[11px] font-black text-slate-500 uppercase tracking-[0.12em] mb-2";

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return <label className={labelCls}>{children}{required && <span className="text-rose-500 ml-0.5">*</span>}</label>;
}

export default function NewShipmentPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1); // 1 = forward, -1 = backward
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

  const setField = (k: string, v: any) => setForm(prev => ({ ...prev, [k]: v }));

  const routeOptions = form.origin && form.destination ? getRouteOptions(form.origin, form.destination, form.mode) : [];
  const primaryRoute = routeOptions.find(r => r.mode === form.mode);
  const riskScore = form.origin && form.destination
    ? calcRiskScore(form.mode, 'pending', parseFloat(form.weight_kg) || 1000)
    : null;
  const revenue = form.declared_value && parseFloat(form.declared_value) > 0
    ? parseFloat(form.declared_value) * 0.025
    : (parseFloat(form.weight_kg) || 1000) * ({ road: 8, rail: 5, air: 45, sea: 12 } as Record<ShipmentMode, number>)[form.mode];

  const validate = (): string | null => {
    if (step === 0) {
      if (!form.origin) return 'Please select an origin city';
      if (!form.destination) return 'Please select a destination city';
      if (form.origin === form.destination) return 'Origin and destination must be different';
    }
    if (step === 1) {
      if (!form.cargo_type) return 'Please select a cargo category';
      if (!form.weight_kg || parseFloat(form.weight_kg) <= 0) return 'Please enter a valid weight';
      if (!form.supplier_name) return 'Please enter supplier name';
    }
    if (step === 2) {
      if (!form.eta) return 'Please enter the expected delivery date';
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
      if (!user) throw new Error('Not authenticated');

      const special_handling = { fragile: form.fragile, cold_chain: form.cold_chain, hazardous: form.hazardous, oversized: form.oversized };
      const departure = form.departure && form.departure_time
        ? new Date(`${form.departure}T${form.departure_time}`).toISOString()
        : new Date().toISOString();

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
        eway_bill_expiry: form.eway_bill_expiry ? new Date(form.eway_bill_expiry).toISOString() : null,
        reference_number: form.reference_number,
        driver_contact: form.driver_contact, whatsapp_alerts: form.whatsapp_alerts,
        priority: form.priority, special_handling, notes: form.notes,
        risk_score: calcRiskScore(form.mode, 'pending', parseFloat(form.weight_kg) || 1000),
      });

      if (error) throw error;
      toast.success('🚀 Shipment launched successfully!');
      router.push('/shipments');
    } catch (err: any) {
      toast.error(err.message || 'Failed to create shipment');
    } finally {
      setSubmitting(false);
    }
  };

  const slideVariants = {
    enter: (dir: number) => ({ x: dir * 24, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir: number) => ({ x: dir * -24, opacity: 0 }),
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">

      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => router.back()} className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-white border border-transparent hover:border-slate-200 transition-all">
          <ChevronLeft size={20} />
        </button>
        <div>
          <h1 className="text-h1">New Shipment</h1>
          <p className="text-sm font-semibold text-slate-500 mt-0.5">Create and dispatch a new logistics order</p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="relative">
        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-[#3b5bdb] to-[#0ea5e9]"
            animate={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
          />
        </div>
      </div>

      {/* Step Pills */}
      <div className="flex items-start gap-2 overflow-x-auto pb-1">
        {STEPS.map((s, i) => {
          const Icon = s.icon;
          const done = i < step;
          const active = i === step;
          return (
            <div key={s.label} className="flex items-center gap-2 shrink-0">
              <div className={`flex items-center gap-2.5 px-4 py-2.5 rounded-2xl border transition-all ${
                active
                  ? 'bg-gradient-to-r from-[#3b5bdb] to-[#0ea5e9] text-white border-transparent shadow-md shadow-indigo-200'
                  : done
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-white text-slate-400 border-slate-200'
              }`}>
                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black flex-shrink-0 ${
                  active ? 'bg-white/25' : done ? 'bg-emerald-200' : 'bg-slate-100'
                }`}>
                  {done ? <Check size={11} /> : <span>{i + 1}</span>}
                </div>
                <span className={`text-[12px] font-black whitespace-nowrap ${active ? 'text-white' : done ? 'text-emerald-700' : 'text-slate-400'}`}>
                  {s.label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`w-6 h-px transition-colors ${i < step ? 'bg-emerald-300' : 'bg-slate-200'}`} />
              )}
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Main Form Panel ── */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={step}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="p-6 space-y-6"
            >

              {/* ── STEP 0: Route & Mode ── */}
              {step === 0 && (
                <>
                  <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
                    <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center">
                      <Route size={18} className="text-[#3b5bdb]" />
                    </div>
                    <div>
                      <h2 className="font-black text-slate-800 text-[16px]">Route & Transport Mode</h2>
                      <p className="text-[12px] text-slate-500 font-semibold">Select your origin, destination, and how cargo will travel</p>
                    </div>
                  </div>

                  <div>
                    <FieldLabel required>Transport Mode</FieldLabel>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      {MODE_OPTIONS.map(m => (
                        <button
                          key={m.mode} type="button"
                          onClick={() => setField('mode', m.mode)}
                          className={`p-3.5 rounded-xl border-2 text-center transition-all hover:scale-[1.02] ${
                            form.mode === m.mode
                              ? 'border-[#3b5bdb] bg-indigo-50 shadow-md shadow-indigo-100'
                              : 'border-slate-200 bg-white hover:border-slate-300'
                          }`}
                        >
                          <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center mb-3">
                            <m.icon size={20} className={form.mode === m.mode ? 'text-[#3b5bdb]' : 'text-slate-400'} />
                          </div>
                          <div className={`text-[12px] font-black ${form.mode === m.mode ? 'text-[#3b5bdb]' : 'text-slate-700'}`}>{m.label}</div>
                          <div className="text-[10px] text-slate-400 mt-0.5 leading-tight font-semibold">{m.desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <FieldLabel required>Origin City</FieldLabel>
                      <select value={form.origin} onChange={e => setField('origin', e.target.value)} className={inputCls}>
                        <option value="">Select origin...</option>
                        {INDIAN_CITIES.map(c => <option key={c}>{c}</option>)}
                      </select>
                    </div>
                    <div>
                      <FieldLabel required>Destination City</FieldLabel>
                      <select value={form.destination} onChange={e => setField('destination', e.target.value)} className={inputCls}>
                        <option value="">Select destination...</option>
                        {INDIAN_CITIES.map(c => <option key={c}>{c}</option>)}
                      </select>
                    </div>
                  </div>

                  {routeOptions.length > 0 && (
                    <div>
                      <FieldLabel>Route Cost Comparison</FieldLabel>
                      <div className="space-y-2">
                        {routeOptions.map(r => (
                          <button
                            key={r.mode} type="button"
                            onClick={() => setField('mode', r.mode)}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-left transition-all ${
                              form.mode === r.mode
                                ? 'border-[#3b5bdb] bg-indigo-50 shadow-md shadow-indigo-100'
                                : 'border-slate-200 bg-white hover:border-slate-300'
                            }`}
                          >
                            <span className="text-xl shrink-0">{modeIcon(r.mode)}</span>
                            <div className="flex-1 grid grid-cols-4 gap-2 text-xs">
                              <div>
                                <div className="text-[10px] text-slate-400 font-black uppercase tracking-wider">Mode</div>
                                <div className="font-black text-slate-800 capitalize">{r.mode}</div>
                              </div>
                              <div>
                                <div className="text-[10px] text-slate-400 font-black uppercase tracking-wider">Distance</div>
                                <div className="font-black text-slate-800">{r.km} km</div>
                              </div>
                              <div>
                                <div className="text-[10px] text-slate-400 font-black uppercase tracking-wider">ETA</div>
                                <div className="font-black text-slate-800">{r.hours}h</div>
                              </div>
                              <div>
                                <div className="text-[10px] text-slate-400 font-black uppercase tracking-wider">Cost</div>
                                <div className="font-black text-emerald-600">{formatCurrency(r.total)}</div>
                              </div>
                            </div>
                            {form.mode === r.mode && <Check size={16} className="text-[#3b5bdb] shrink-0" />}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <FieldLabel>Vehicle / Reg. Number</FieldLabel>
                      <input value={form.vehicle_number} onChange={e => setField('vehicle_number', e.target.value)} className={inputCls} placeholder="MH-04-AB-1234" />
                    </div>
                    <div>
                      <FieldLabel>Transporter / Fleet</FieldLabel>
                      <input value={form.transporter_name} onChange={e => setField('transporter_name', e.target.value)} className={inputCls} placeholder="Ashok Leyland Fleet" />
                    </div>
                  </div>
                </>
              )}

              {/* ── STEP 1: Cargo ── */}
              {step === 1 && (
                <>
                  <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
                    <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center">
                      <Package size={18} className="text-[#3b5bdb]" />
                    </div>
                    <div>
                      <h2 className="font-black text-slate-800 text-[16px]">Cargo Details</h2>
                      <p className="text-[12px] text-slate-500 font-semibold">Specify what you're shipping</p>
                    </div>
                  </div>

                  <div>
                    <FieldLabel required>Cargo Category</FieldLabel>
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                      {CARGO_CATEGORIES.map(c => (
                        <button
                          key={c.id} type="button"
                          onClick={() => setField('cargo_type', c.id === 'other' ? '' : c.label)}
                          className={`p-3 rounded-xl border-2 text-center transition-all hover:scale-[1.02] ${
                            form.cargo_type === c.label 
                              ? 'border-[#3b5bdb] bg-indigo-50 shadow-sm'
                              : 'border-slate-200 bg-white hover:border-slate-300'
                          }`}
                        >
                          <div className="flex justify-center mb-1">
                            <c.icon size={20} className={form.cargo_type === c.label ? 'text-[#3b5bdb]' : 'text-slate-400'} />
                          </div>
                          <div className={`text-[11px] font-black leading-tight ${form.cargo_type === c.label ? 'text-[#3b5bdb]' : 'text-slate-700'}`}>{c.label}</div>
                        </button>
                      ))}
                    </div>
                    {!CARGO_CATEGORIES.slice(0,-1).map(x=>x.label).includes(form.cargo_type) && (
                      <input value={form.cargo_type} onChange={e => setField('cargo_type', e.target.value)} className={`${inputCls} mt-2`} placeholder="Enter custom cargo type..." />
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <FieldLabel required>Total Weight (kg)</FieldLabel>
                      <input type="number" value={form.weight_kg} onChange={e => setField('weight_kg', e.target.value)} className={inputCls} placeholder="5000" />
                    </div>
                    <div>
                      <FieldLabel>Declared Value (₹)</FieldLabel>
                      <input type="number" value={form.declared_value} onChange={e => setField('declared_value', e.target.value)} className={inputCls} placeholder="500000" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <FieldLabel required>Supplier / Consignee Name</FieldLabel>
                      <input value={form.supplier_name} onChange={e => setField('supplier_name', e.target.value)} className={inputCls} placeholder="Tata Electronics" />
                    </div>
                    <div>
                      <FieldLabel>Supplier Email</FieldLabel>
                      <input type="email" value={form.supplier_email} onChange={e => setField('supplier_email', e.target.value)} className={inputCls} placeholder="logistics@supplier.com" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <FieldLabel>E-way Bill Number</FieldLabel>
                      <input value={form.eway_bill} onChange={e => setField('eway_bill', e.target.value)} className={inputCls} placeholder="EWB-2024-XXXXX" />
                    </div>
                    <div>
                      <FieldLabel>E-way Bill Expiry</FieldLabel>
                      <input type="date" value={form.eway_bill_expiry} onChange={e => setField('eway_bill_expiry', e.target.value)} className={inputCls} />
                    </div>
                  </div>

                  <div>
                    <FieldLabel>Special Handling Requirements</FieldLabel>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {[
                        { key: 'fragile', label: 'Fragile', icon: Leaf, warnCls: 'border-amber-300 bg-amber-50 text-amber-700' },
                        { key: 'cold_chain', label: 'Cold Chain', icon: Cloud, warnCls: 'border-sky-300 bg-sky-50 text-sky-700' },
                        { key: 'hazardous', label: 'Hazardous', icon: AlertTriangle, warnCls: 'border-red-300 bg-red-50 text-red-700' },
                        { key: 'oversized', label: 'Oversized', icon: Maximize2, warnCls: 'border-purple-300 bg-purple-50 text-purple-700' },
                      ].map(opt => {
                        const Icon = (opt as any).icon || Package;
                        return (
                          <button
                            key={opt.key} type="button"
                            onClick={() => setField(opt.key, !(form as any)[opt.key])}
                            className={`px-3 py-3 rounded-xl border-2 text-[11px] font-black transition-all text-center flex flex-col items-center gap-2 ${
                              (form as any)[opt.key] ? opt.warnCls : 'border-slate-200 text-slate-500 hover:border-slate-300 bg-white'
                            }`}
                          >
                            <Icon size={16} />
                            <span className="uppercase tracking-widest">{opt.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}

              {/* ── STEP 2: Schedule ── */}
              {step === 2 && (
                <>
                  <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
                    <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center">
                      <Calendar size={18} className="text-[#3b5bdb]" />
                    </div>
                    <div>
                      <h2 className="font-black text-slate-800 text-[16px]">Schedule & Contacts</h2>
                      <p className="text-[12px] text-slate-500 font-semibold">Set dates, priority, and team contacts</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <FieldLabel>Reference / PO Number</FieldLabel>
                      <input value={form.reference_number} onChange={e => setField('reference_number', e.target.value)} className={inputCls} placeholder="PO-2024-XXXXX" />
                    </div>
                    <div>
                      <FieldLabel>Shipment Priority</FieldLabel>
                      <div className="flex gap-2">
                        {PRIORITY_OPTIONS.map(p => (
                          <button key={p.value} type="button" onClick={() => setField('priority', p.value)}
                            className={`flex-1 py-2.5 rounded-xl border-2 text-[12px] font-black transition-all text-center ${
                              form.priority === p.value ? `${p.cls} ring-2 ring-offset-1 ring-[#3b5bdb]/30 scale-[1.03]` : 'border-slate-200 text-slate-500 bg-white hover:border-slate-300'
                            }`}
                          >
                           <div className="flex items-center justify-center gap-2">
                             <p.icon size={14} /> <span>{p.label}</span>
                           </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <FieldLabel>Departure Date</FieldLabel>
                      <input type="date" value={form.departure} onChange={e => setField('departure', e.target.value)} className={inputCls} />
                    </div>
                    <div>
                      <FieldLabel>Departure Time</FieldLabel>
                      <input type="time" value={form.departure_time} onChange={e => setField('departure_time', e.target.value)} className={inputCls} />
                    </div>
                  </div>

                  <div>
                    <FieldLabel required>Expected Delivery (ETA)</FieldLabel>
                    <input type="datetime-local" value={form.eta} onChange={e => setField('eta', e.target.value)} className={inputCls} />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <FieldLabel>Driver Contact</FieldLabel>
                      <input type="tel" value={form.driver_contact} onChange={e => setField('driver_contact', e.target.value)} className={inputCls} placeholder="+91 98765 43210" />
                    </div>
                    <div>
                      <FieldLabel>WhatsApp Alerts</FieldLabel>
                      <input type="tel" value={form.whatsapp_alerts} onChange={e => setField('whatsapp_alerts', e.target.value)} className={inputCls} placeholder="+91 98765 43210" />
                    </div>
                  </div>

                  <div>
                    <FieldLabel>Internal Notes</FieldLabel>
                    <textarea
                      value={form.notes} onChange={e => setField('notes', e.target.value)} rows={3}
                      className={`${inputCls} resize-none`}
                      placeholder="Special instructions, handling notes..."
                    />
                  </div>
                </>
              )}

              {/* ── STEP 3: Review ── */}
              {step === 3 && (
                <>
                  <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
                    <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center">
                      <Check size={18} className="text-emerald-600" />
                    </div>
                    <div>
                      <h2 className="font-black text-slate-800 text-[16px]">Confirm & Launch</h2>
                      <p className="text-[12px] text-slate-500 font-semibold">Review every detail before dispatching</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {[
                      { section: 'Route', icon: Route, rows: [
                        { l: 'Origin → Destination', v: `${form.origin} → ${form.destination}` },
                        { l: 'Transport Mode',        v: `${modeIcon(form.mode)} ${form.mode.toUpperCase()}` },
                        { l: 'Vehicle / Reg.',        v: form.vehicle_number || '—' },
                        { l: 'Transporter',           v: form.transporter_name || '—' },
                      ]},
                      { section: 'Cargo', icon: Package, rows: [
                        { l: 'Category',        v: form.cargo_type },
                        { l: 'Weight',          v: `${form.weight_kg} kg` },
                        { l: 'Declared Value',  v: form.declared_value ? `₹${parseFloat(form.declared_value).toLocaleString('en-IN')}` : '—' },
                        { l: 'Supplier',        v: form.supplier_name },
                        { l: 'E-way Bill',      v: form.eway_bill || '—' },
                      ]},
                      { section: 'Schedule', icon: Calendar, rows: [
                        { l: 'ETA',      v: form.eta ? new Date(form.eta).toLocaleString('en-IN') : '—' },
                        { l: 'Priority', v: form.priority.toUpperCase() },
                        { l: 'Driver',   v: form.driver_contact || '—' },
                      ]},
                    ].map(({ section, icon: Icon, rows }) => (
                      <div key={section} className="bg-slate-50 rounded-xl border border-slate-200 overflow-hidden">
                        <div className="flex items-center gap-2 px-4 py-2.5 bg-white border-b border-slate-100">
                          <Icon size={14} className="text-[#3b5bdb]" />
                          <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest">{section}</span>
                        </div>
                        {rows.map(row => (
                          <div key={row.l} className="flex justify-between px-4 py-2.5 text-[13px] border-b border-slate-100/80 last:border-0">
                            <span className="font-semibold text-slate-500">{row.l}</span>
                            <span className="font-black text-slate-800 ml-4 text-right max-w-[60%] truncate">{row.v}</span>
                          </div>
                        ))}
                      </div>
                    ))}

                    {/* Special Handling tags */}
                    {[form.fragile, form.cold_chain, form.hazardous, form.oversized].some(Boolean) && (
                      <div className="flex flex-wrap gap-2 p-3.5 bg-amber-50 border border-amber-200 rounded-xl">
                        <span className="text-[11px] font-black text-amber-700 uppercase tracking-wider mr-1">Special Handling:</span>
                        {form.fragile    && <span className="flex items-center gap-1.5 text-[11px] font-black text-amber-700 bg-amber-100 border border-amber-200 px-2.5 py-1 rounded-full"><Leaf size={12}/> Fragile</span>}
                        {form.cold_chain && <span className="flex items-center gap-1.5 text-[11px] font-black text-sky-700 bg-sky-100 border border-sky-200 px-2.5 py-1 rounded-full"><Cloud size={12}/> Cold Chain</span>}
                        {form.hazardous  && <span className="flex items-center gap-1.5 text-[11px] font-black text-red-700 bg-red-100 border border-red-200 px-2.5 py-1 rounded-full"><ShieldAlert size={12}/> Hazardous</span>}
                        {form.oversized  && <span className="flex items-center gap-1.5 text-[11px] font-black text-purple-700 bg-purple-100 border border-purple-200 px-2.5 py-1 rounded-full"><Maximize2 size={12}/> Oversized</span>}
                      </div>
                    )}
                  </div>
                </>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Navigation */}
          <div className="flex gap-3 px-6 pb-6 pt-3 border-t border-slate-100">
            {step > 0 && (
              <button onClick={prev} className="flex items-center gap-2 px-5 py-3 border-[1.5px] border-slate-200 text-slate-700 rounded-xl text-[13px] font-black hover:bg-slate-50 transition-all">
                <ChevronLeft size={15} /> Back
              </button>
            )}
            {step < STEPS.length - 1 ? (
              <button onClick={next} className="flex-1 btn btn-primary py-3 text-[14px]">
                Continue <ChevronRight size={15} />
              </button>
            ) : (
              <button onClick={handleSubmit} disabled={submitting} className="flex-1 btn btn-primary py-3 text-[14px] disabled:opacity-60">
                {submitting
                  ? <><Loader2 size={15} className="animate-spin" /> Launching...</>
                  : <><Zap size={15} /> Launch Shipment</>
                }
              </button>
            )}
          </div>
        </div>

        {/* ── Live Summary Panel ── */}
        <div className="space-y-4">
          {/* Shipment Preview Card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Zap size={13} className="text-[#3b5bdb]" /> Live Preview
            </h3>

            <div className="space-y-3 text-[13px]">
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-semibold">Mode</span>
                <span className="font-black text-slate-800">{modeIcon(form.mode)} {form.mode.toUpperCase()}</span>
              </div>

              {form.origin && form.destination && (
                <div className="bg-indigo-50 rounded-xl p-3 border border-indigo-100">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                    <span className="font-black text-slate-700 text-[12px]">{form.origin}</span>
                  </div>
                  <div className="ml-1 my-1 h-5 border-l-2 border-dashed border-indigo-200" />
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                    <span className="font-black text-slate-700 text-[12px]">{form.destination}</span>
                  </div>
                </div>
              )}

              {primaryRoute && (
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 text-center">
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Distance</div>
                    <div className="font-black text-slate-800">{primaryRoute.km} km</div>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 text-center">
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">ETA</div>
                    <div className="font-black text-slate-800">{primaryRoute.hours}h</div>
                  </div>
                  <div className="bg-emerald-50 rounded-xl p-3 border border-emerald-100 text-center col-span-2">
                    <div className="text-[10px] font-black text-emerald-600 uppercase tracking-wider mb-1">Est. Freight Cost</div>
                    <div className="font-black text-emerald-700 text-[15px]">{formatCurrency(primaryRoute.total)}</div>
                  </div>
                </div>
              )}

              {form.weight_kg && (
                <div className="flex justify-between">
                  <span className="text-slate-500 font-semibold">Weight</span>
                  <span className="font-black text-slate-800">{parseFloat(form.weight_kg).toLocaleString()} kg</span>
                </div>
              )}

              {revenue > 0 && (
                <div className="flex justify-between">
                  <span className="text-slate-500 font-semibold">Est. Revenue</span>
                  <span className="font-black text-blue-700">{formatCurrency(revenue)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Risk Score */}
          {riskScore !== null && (
            <div className={`rounded-2xl border p-5 ${
              riskScore < 30 ? 'bg-emerald-50 border-emerald-200' : riskScore < 70 ? 'bg-amber-50 border-amber-200' : 'bg-rose-50 border-rose-200'
            }`}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Shield size={15} className={riskColor(riskScore)} />
                  <span className={`text-[11px] font-black uppercase tracking-widest ${riskColor(riskScore)}`}>Route Risk</span>
                </div>
                <div className={`text-2xl font-black ${riskColor(riskScore)}`}>
                  {riskScore}<span className="text-sm font-semibold opacity-60">/100</span>
                </div>
              </div>
              <div className="h-2 bg-white/50 rounded-full overflow-hidden mb-2">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${riskScore}%` }}
                  transition={{ duration: 0.6, ease: 'easeOut' }}
                  className={`h-full rounded-full ${riskScore < 30 ? 'bg-emerald-500' : riskScore < 70 ? 'bg-amber-500' : 'bg-rose-500'}`}
                />
              </div>
              <p className={`text-[12px] font-bold ${riskColor(riskScore)}`}>
                {riskScore < 30 ? '✅ Low risk — safe to proceed' : riskScore < 70 ? '⚠️ Moderate — verify documentation' : '🔴 High risk — consider alternate route'}
              </p>
            </div>
          )}

          {/* Tips */}
          <div className="bg-gradient-to-br from-indigo-50 to-cyan-50 border border-indigo-100 rounded-2xl p-5">
            <h4 className="text-[11px] font-black text-[#3b5bdb] uppercase tracking-widest mb-3">💡 Pro Tips</h4>
            <ul className="space-y-2 text-[12px] text-slate-600 font-semibold">
              <li className="flex gap-2"><span className="text-indigo-400 shrink-0">→</span>E-way bill required for inter-state freight (GST compliance)</li>
              <li className="flex gap-2"><span className="text-indigo-400 shrink-0">→</span>Declare accurate value for faster insurance claims</li>
              <li className="flex gap-2"><span className="text-indigo-400 shrink-0">→</span>WhatsApp alerts keep your team updated in real time</li>
              <li className="flex gap-2"><span className="text-indigo-400 shrink-0">→</span>Urgent priority triggers daily risk analysis</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
