"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import type { Shipment, Driver } from '@/types';
import { statusConfig, modeIcon, modeLabel, riskColor, riskBg, riskLabel, estimateRevenue, formatCurrency } from '@/lib/utils';
import { getRouteWeatherRisk, getWeatherRiskColor, getWeatherRiskBadge } from '@/lib/weather';
import { X, Loader2, MapPin, Shield, Truck, GitBranch, Mail, MessageSquare, CheckCircle, AlertTriangle, Send, ChevronRight, Clock, CloudLightning, Package, IndianRupee, Zap, User, Sparkles, Activity, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';
import { format, addHours, subHours } from 'date-fns';

interface Props {
  shipment: Shipment;
  onClose: () => void;
  onUpdate: () => void;
}

type Tab = 'overview' | 'risk' | 'vehicle' | 'routes' | 'timeline' | 'weather' | 'fleet';

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
  const [rerouting, setRerouting] = useState<string | null>(null);
  const [emailModal, setEmailModal] = useState(false);
  const [emailSending, setEmailSending] = useState(false);
  const [emailPreview, setEmailPreview] = useState({ to: '', subject: '', body: '' });

  // Dispatch states
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [activeDispatch, setActiveDispatch] = useState<DispatchRoute | null>(null);
  const [assigning, setAssigning] = useState(false);
  const [selectedDriverId, setSelectedDriverId] = useState('');

  const sc = statusConfig(shipment.status);
  const revenue = estimateRevenue(shipment);
  const weatherRisk = getRouteWeatherRisk(shipment.origin, shipment.destination);

  const createdAt = new Date(shipment.created_at);
  const etaDate = new Date(shipment.eta);
  const now = new Date();
  
  const progress = (() => {
    if (now >= etaDate || shipment.status === 'delivered') return 100;
    const total = etaDate.getTime() - createdAt.getTime();
    if (total <= 0) return 100;
    return Math.max(5, Math.min(95, Math.round(((now.getTime() - createdAt.getTime()) / total) * 100)));
  })();

  const etaHours = Math.max(0, Math.round((etaDate.getTime() - now.getTime()) / 3600000));
  const approxKm = { road: 900, rail: 1100, air: 1200, sea: 1800 }[shipment.mode] || 900;

  // Timeline generation - Grounded in active dispatch data if available
  const timeline = activeDispatch?.stops?.map((stop, idx: number) => {
    const currentIndex = activeDispatch.current_stop_index ?? 0;
    const isPast = idx < currentIndex;
    const isCurrent = idx === currentIndex;
    return {
      st: stop.label,
      time: isPast ? subHours(now, (currentIndex - idx) * 4) : addHours(now, (idx - currentIndex) * 6),
      status: isPast ? 'completed' : isCurrent ? 'current' : 'pending'
    };
  }) || (() => {
    let durationMs = etaDate.getTime() - createdAt.getTime();
    if (durationMs <= 0) durationMs = 24 * 3600 * 1000;
    return [
      { st: 'Order Placed', time: createdAt, status: 'completed' },
      { st: 'Dispatched from Hub', time: new Date(createdAt.getTime() + durationMs * 0.1), status: progress > 0 ? 'completed' : 'pending' },
      { st: 'Checkpoint 1', time: new Date(createdAt.getTime() + durationMs * 0.3), status: progress > 30 ? 'completed' : progress > 10 ? 'current' : 'pending' },
      { st: 'Checkpoint 2', time: new Date(createdAt.getTime() + durationMs * 0.6), status: progress > 60 ? 'completed' : progress > 30 ? 'current' : 'pending' },
      { st: 'Out for Delivery', time: new Date(createdAt.getTime() + durationMs * 0.9), status: progress > 90 ? (shipment.status === 'delivered' ? 'completed' : 'current') : 'pending' },
      { st: 'Delivered', time: new Date(createdAt.getTime() + durationMs), status: shipment.status === 'delivered' ? 'completed' : progress >= 99 ? 'current' : 'pending' }
    ];
  })();

  // Fetch AI risk when tab opens
  useEffect(() => {
    if (tab === 'risk' && !aiRisk && !aiLoading) {
      setAiLoading(true);
      const prompt = `Provide a concise 3-sentence risk assessment for this Indian logistics shipment:
        - Shipment: ${shipment.shipment_code}
        - Route: ${shipment.origin} → ${shipment.destination}
        - Mode: ${shipment.mode} freight
        - Status: ${shipment.status}
        - Cargo: ${shipment.cargo_type}, ${shipment.weight_kg}kg
        - Risk Score: ${shipment.risk_score}/100
        - Priority: ${shipment.priority || 'normal'}
        - Weather Hazard: ${weatherRisk.primaryHazard}
        ${shipment.declared_value ? `- Value: ₹${shipment.declared_value.toLocaleString()}` : ''}
        
        Focus on: main risk factors, immediate action items, and mitigation recommendation. Be direct and actionable. DO NOT return portfolio-level stats. THIS MUST BE SPECIFIC TO SHIPMENT ${shipment.shipment_code} ONLY.`;

      fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: prompt, history: [], shipments: [shipment] })
      })
        .then(r => r.json())
        .then(d => {
          if (d.fallback) throw new Error("Fallback triggered");
          setAiRisk(d.text || 'Risk assessment could not be generated.');
        })
        .catch(() => {
          if (shipment.risk_score > 70) {
            setAiRisk(`CRITICAL [${shipment.shipment_code}]: Extreme operational variance detected on the ${shipment.origin}→${shipment.destination} route. Weather hazard (${weatherRisk.primaryHazard || 'None'}) cross-referenced with load indicates high failure probability. Immediate reroute recommended.`);
          } else if (shipment.risk_score > 40) {
            setAiRisk(`MODERATE [${shipment.shipment_code}]: Minor schedule drift observed for this ${shipment.mode} freight. Route stability is fluctuating but remains within acceptable SLAs. Monitor terminal congestion.`);
          } else {
            setAiRisk(`NOMINAL [${shipment.shipment_code}]: Telemetry for ${shipment.origin} to ${shipment.destination} is optimal. All parameters aligned with perfect delivery window. No action required.`);
          }
        })
        .finally(() => setAiLoading(false));
    }
  }, [tab, aiRisk, aiLoading, shipment, weatherRisk]);

  const handleReroute = async (newMode: string) => {
    setRerouting(newMode);
    try {
      const { error } = await supabase.from('shipments')
        .update({ mode: newMode as string, status: 'in_transit' })
        .eq('id', shipment.id);
      if (error) throw error;
      setShipment(prev => ({ ...prev, mode: newMode as Shipment['mode'], status: 'in_transit' }));
      toast.success(`Rerouted via ${newMode} successfully`);
      onUpdate();
    } catch {
      toast.error('Reroute failed');
    } finally {
      setRerouting(null);
    }
  };

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
      if (!selectedDriverId) return;
      setAssigning(true);
      try {
          const { data, error } = await supabase.from('dispatch_routes').insert({
              shipment_id: shipment.id,
              driver_id: selectedDriverId,
              status: 'active',
              stops: [
                  { lat: 19.07, lng: 72.87, label: 'Origin Hub' },
                  { lat: 21.17, lng: 72.83, label: 'En-route Checkpoint' },
                  { lat: 23.02, lng: 72.57, label: 'Destination Terminal' }
              ]
          }).select('*, drivers(*)').single();

          if (error) throw error;
          
          await supabase.from('drivers').update({ status: 'on_trip' }).eq('id', selectedDriverId);
          
          // Sync with shipments table for redundancy and UI display
          const { data: driverInfo } = await supabase.from('drivers').select('*').eq('id', selectedDriverId).single();
          if (driverInfo) {
              const newStatus = shipment.status === 'pending' ? 'dispatched' : shipment.status;
              await supabase.from('shipments').update({
                  transporter_name: 'LogiFlow Fleet',
                  driver_contact: driverInfo.phone || 'N/A',
                  status: newStatus
              }).eq('id', shipment.id);
              
              setShipment(prev => ({ 
                  ...prev, 
                  transporter_name: 'LogiFlow Fleet',
                  driver_contact: driverInfo.phone || 'N/A',
                  status: newStatus
              }));
          }

          setActiveDispatch(data);
          toast.success('Fleet unit assigned to shipment');
      } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : 'Assignment failed';
          toast.error(msg);
      } finally {
          setAssigning(false);
      }
  };

  const openEmailModal = () => {
    const eta = format(etaDate, 'dd MMM yyyy, hh:mm a');
    const to = shipment.supplier_email || 'supplier@example.com';
    const subject = `LogiFlow Update: Shipment ${shipment.shipment_code} — ${shipment.origin} → ${shipment.destination}`;
    const body = `Dear ${shipment.supplier_name || 'Supplier'},

This is an automated update from LogiFlow regarding your shipment.

Shipment Details:
• Code: ${shipment.shipment_code}
• Route: ${shipment.origin} → ${shipment.destination}
• Mode: ${modeLabel(shipment.mode)} Freight
• Cargo: ${shipment.cargo_type} (${shipment.weight_kg} kg)
• Current Status: ${sc.label}
• Expected Delivery: ${eta}
• Risk Level: ${riskLabel(shipment.risk_score)} (${shipment.risk_score}/100)
${weatherRisk.overallRisk > 40 ? `• Weather Alert: ${weatherRisk.primaryHazard}` : ''}
${shipment.vehicle_number ? `• Vehicle/Tracking: ${shipment.vehicle_number}` : ''}
${shipment.status === 'delayed' ? '\n⚠️ Note: This shipment is currently experiencing delays. Our team is working to resolve this promptly.\n' : ''}
If you have any questions, please contact your LogiFlow account manager or reply to this email.

Best regards,
LogiFlow Operations Team`;

    setEmailPreview({ to, subject, body });
    setEmailModal(true);
  };

  const sendEmail = async () => {
    setEmailSending(true);
    try {
      const mailtoUrl = `mailto:${encodeURIComponent(emailPreview.to)}?subject=${encodeURIComponent(emailPreview.subject)}&body=${encodeURIComponent(emailPreview.body)}`;
      window.location.href = mailtoUrl;
      toast.success('Email client opened with pre-filled message');
      setEmailModal(false);
    } catch {
      toast.error('Could not open email client');
    } finally {
      setEmailSending(false);
    }
  };

  const vehicleInfo = {
    road: { type: 'Heavy Goods Vehicle', icon: '🚛', number: shipment.vehicle_number || 'MH-04-XX-0000', driver: 'Ramesh Kumar', contact: shipment.driver_contact || '+91 98765 43210', checkpoint: `Midway — approx ${Math.round(approxKm * (progress/100))} km from ${shipment.origin}`, fuel: '75 Liters', fatigue: 'Low (4 hours driven)' },
    rail: { type: 'Freight Train',       icon: '🚂', number: shipment.vehicle_number || 'IR-00000-F',    driver: 'Station: En Route', contact: 'IR Helpline: 139', checkpoint: 'Junction halt — scheduled', fuel: 'N/A', fatigue: 'N/A' },
    air:  { type: 'Cargo Aircraft',      icon: '✈️', number: shipment.vehicle_number || 'IX-0000',       driver: `Capt. ${shipment.supplier_name?.split(' ')[0] || 'A'} Sharma`, contact: shipment.driver_contact || 'ATC Ops', checkpoint: 'In-flight — cruising altitude', fuel: 'Optimal', fatigue: 'Regulated' },
    sea:  { type: 'Container Vessel',    icon: '🚢', number: shipment.vehicle_number || 'INL-VESSEL-00', driver: 'Master Mariner',   contact: 'Port Control', checkpoint: 'Coastal waters — on course', fuel: 'Heavy Fuel Oil', fatigue: 'Operational' },
  }[shipment.mode];

  const altRoutes = (() => {
    const o = shipment.origin.toLowerCase();
    const d = shipment.destination.toLowerCase();
    const isCoastal = ['mumbai', 'chennai', 'surat', 'kolkata'].some(c => o.includes(c)) && ['mumbai', 'chennai', 'surat', 'kolkata'].some(c => d.includes(c));
    const isRail = ['mumbai', 'delhi', 'pune', 'bangalore', 'jaipur', 'patna'].some(c => o.includes(c)) && ['mumbai', 'delhi', 'pune', 'bangalore', 'jaipur', 'patna'].some(c => d.includes(c));
    const isHighValue = (shipment.declared_value || 0) > 500000 || shipment.priority === 'High';
    
    const w = shipment.weight_kg || 100;
    const all = [
      { mode: 'air' as const, label: 'Air Freight', etaHrs: Math.max(2, Math.round(etaHours * 0.3)), cost: Math.round(w * 150 + 20000), risk: Math.max(5, shipment.risk_score - 30), diff: 'Fastest ETA, Premium Cost', feasible: isHighValue },
      { mode: 'rail' as const, label: 'Rail Cargo', etaHrs: Math.max(12, Math.round(etaHours * 1.5)), cost: Math.round(w * 10 + 5000), risk: Math.max(8, shipment.risk_score - 20), diff: 'Highly reliable, Low Cost', feasible: isRail },
      { mode: 'road' as const, label: 'Road Freight', etaHrs: Math.max(4, Math.round(etaHours * 1.0)), cost: Math.round(w * 25 + 8000), risk: Math.max(15, shipment.risk_score - 10), diff: 'Standard Delivery', feasible: true },
      { mode: 'sea' as const, label: 'Sea Shipping', etaHrs: Math.max(48, Math.round(etaHours * 3.0)), cost: Math.round(w * 3 + 2000), risk: Math.max(20, shipment.risk_score + 5), diff: 'Economical, Slowest', feasible: isCoastal },
    ];
    return all.filter(r => r.mode !== shipment.mode && r.feasible)
      .map(r => ({ ...r, costStr: `₹${r.cost.toLocaleString('en-IN')}`, score: (100 - r.risk) + (1000 / r.etaHrs) - (r.cost / 10000) }))
      .sort((a,b) => b.score - a.score)
      .slice(0, 3);
  })();

  const tabs = [
    { id: 'overview' as Tab, label: 'Overview',      icon: MapPin },
    { id: 'fleet'    as Tab, label: 'Fleet & Dispatch', icon: Truck },
    { id: 'timeline' as Tab, label: 'Timeline',      icon: Clock },
    { id: 'risk'     as Tab, label: 'Risk Analysis', icon: Shield },
    { id: 'weather'  as Tab, label: 'Weather',       icon: CloudLightning },
    { id: 'vehicle'  as Tab, label: 'Vehicle',       icon: Truck },
    { id: 'routes'   as Tab, label: 'Alt Routes',    icon: GitBranch },
  ];

  return (
    <>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
        <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          
          {/* Header */}
          <div className="px-6 py-4 border-b border-slate-100 bg-white shadow-sm shrink-0">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0 pr-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-[1.1rem] font-bold text-slate-900 tracking-tight">{shipment.shipment_code}</span>
                  <span className={`status-badge ${sc.bg} ${sc.text}`}>{sc.label}</span>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-semibold">
                    {modeIcon(shipment.mode)} {modeLabel(shipment.mode)}
                  </span>
                  {shipment.priority && shipment.priority !== 'normal' && (
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${shipment.priority === 'urgent' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                      {shipment.priority}
                    </span>
                  )}
                  {weatherRisk.overallRisk > 60 && (
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${getWeatherRiskColor('high')}`}>
                      ⚠️ WEATHER ALERT
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-2.5 text-sm text-slate-500">
                  <span className="font-bold text-slate-800">{shipment.origin}</span>
                  <ChevronRight size={15} className="text-slate-300" />
                  <span className="font-bold text-slate-800">{shipment.destination}</span>
                  <span className="text-slate-300 px-1">·</span>
                  <span className="font-medium">{shipment.supplier_name}</span>
                </div>
              </div>
              <button onClick={onClose} className="p-2 rounded-xl text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors shrink-0">
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex overflow-x-auto border-b border-slate-100 px-6 bg-white shrink-0 scrollbar-hide">
            {tabs.map(t => {
              const Icon = t.icon;
              return (
                <button key={t.id} onClick={() => setTab(t.id)}
                  className={`flex items-center gap-1.5 px-3 py-3 text-[13px] font-semibold border-b-[3px] transition-all whitespace-nowrap -mb-px ${
                    tab === t.id ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-200'
                  }`}
                >
                  <Icon size={14} className={tab === t.id ? 'text-primary' : 'text-slate-500'} /> {t.label}
                </button>
              );
            })}
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto bg-slate-50/30">
            
            {/* OVERVIEW TAB */}
            {tab === 'overview' && (
              <div className="p-6 space-y-5">
                {/* Progress */}
                <div className="bg-white rounded-xl p-5 border border-slate-100 shadow-sm">
                  <div className="flex justify-between font-bold text-slate-800 mb-3">
                    <div className="flex items-center gap-1.5"><MapPin size={14} className="text-emerald-500" /> {shipment.origin}</div>
                    <span className="text-slate-500 text-sm font-medium">{progress}%</span>
                    <div className="flex items-center gap-1.5">{shipment.destination} <MapPin size={14} className="text-rose-500" /></div>
                  </div>
                  <div className="relative h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="absolute inset-y-0 left-0 bg-primary/20 w-full" />
                    <div className="h-full bg-primary rounded-full transition-all relative z-10" style={{ width: `${progress}%` }} />
                  </div>
                  <div className="flex justify-between text-xs text-slate-500 mt-2 font-medium">
                    <span>Dep: {format(createdAt, 'dd MMM yyyy')}</span>
                    <span className={etaDate < now && shipment.status !== 'delivered' ? 'text-rose-600 font-bold flex items-center gap-1' : ''}>
                      {etaDate < now && shipment.status !== 'delivered' && <AlertTriangle size={12}/>}
                      ETA: {format(etaDate, 'dd MMM yyyy, hh:mm a')}
                    </span>
                  </div>
                </div>

                {/* Metrics Row */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-4">
                  {[
                    { l: 'Remaining',v: etaHours > 0 ? `${etaHours}h` : 'Arrived' },
                    { l: 'Weight',   v: `${(shipment.weight_kg || 0).toLocaleString()}kg` },
                    { l: 'Distance', v: `~${approxKm}km` },
                    { l: 'Risk',     v: `${shipment.risk_score}/100`, color: riskColor(shipment.risk_score) },
                  ].map(m => (
                    <div key={m.l} className="bg-white border border-slate-100 shadow-sm rounded-xl p-4 text-center">
                      <div className={`text-xl font-bold tracking-tight ${m.color || 'text-slate-800'}`}>{m.v}</div>
                      <div className="text-xs text-slate-500 mt-1 font-medium">{m.l}</div>
                    </div>
                  ))}
                </div>

                {/* Cargo Details */}
                <div className="bg-white border border-slate-100 rounded-xl overflow-hidden shadow-sm">
                  <div className="bg-slate-50 px-5 py-3 border-b border-slate-100 text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                    <Package size={14} /> Cargo & Documentation
                  </div>
                  <div className="divide-y divide-slate-50">
                    {[
                      { label: 'Cargo Type',     value: shipment.cargo_type },
                      { label: 'Declared Value', value: shipment.declared_value ? formatCurrency(shipment.declared_value) : 'Not declared', highlight: true },
                      { label: 'Est. Revenue',   value: formatCurrency(revenue) },
                      { label: 'Supplier/Vendor',value: shipment.supplier_name },
                      { label: 'Ref / PO No.',   value: shipment.reference_number || 'N/A' },
                      { label: 'E-Way Bill',     value: shipment.eway_bill ? <span className="font-mono bg-slate-100 px-2 py-0.5 rounded text-[11px]">{shipment.eway_bill}</span> : 'Not specified' },
                    ].map(row => (
                      <div key={row.label} className="flex justify-between items-center px-5 py-3 text-[13px]">
                        <span className="text-slate-500 font-medium">{row.label}</span>
                        <span className={`font-semibold text-right ml-4 ${row.highlight ? 'text-emerald-700' : 'text-slate-800'}`}>{row.value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Special Handling */}
                {shipment.special_handling && Object.values(shipment.special_handling).some(Boolean) && (
                  <div className="bg-amber-50/50 border border-amber-100 rounded-xl p-4">
                    <div className="text-xs font-bold text-amber-800 uppercase tracking-wider mb-2 flex items-center gap-2">
                      <AlertTriangle size={14} /> Special Handling Requirements
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(shipment.special_handling).filter(([, v]) => v).map(([k]) => (
                        <span key={k} className="px-2.5 py-1.5 bg-amber-100 text-amber-800 rounded-lg text-xs font-bold uppercase tracking-wide">
                          {k.replace(/_/g, ' ')}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                
                {shipment.notes && (
                  <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-blue-900 leading-relaxed shadow-sm">
                    <div className="font-bold text-xs uppercase tracking-wider text-blue-700 mb-1.5 flex items-center gap-1.5">
                      <MessageSquare size={13} /> Operator Notes
                    </div>
                    {shipment.notes}
                  </div>
                )}
              </div>
            )}

            {/* TIMELINE TAB */}
            {tab === 'timeline' && (
              <div className="p-6">
                <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-6">
                  <h3 className="font-bold text-slate-800 mb-6 text-sm uppercase tracking-wide flex items-center gap-2">
                    <GitBranch size={16} className="text-primary" /> Route Timeline
                  </h3>
                  <div className="space-y-6 md:space-y-8 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 before:to-transparent">
                    {timeline.map((item: { st: string; time: Date; status: string }, index: number) => {
                      const isComplete = item.status === 'completed';
                      const isCurrent = item.status === 'current';
                      const isDelayed = item.status === 'delayed';
                      return (
                        <div key={index} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                          <div className={`flex items-center justify-center w-10 h-10 rounded-full border-4 shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-sm z-10 
                            ${isComplete ? 'bg-primary border-blue-100 text-white' : isCurrent ? 'bg-amber-400 border-amber-100 text-white animate-pulse' : isDelayed ? 'bg-rose-500 border-rose-100 text-white' : 'bg-slate-100 border-white text-slate-300'}
                          `}>
                            {isComplete ? <CheckCircle size={18} /> : isDelayed ? <AlertTriangle size={18} /> : <div className="w-2.5 h-2.5 rounded-full bg-current" />}
                          </div>
                          
                          <div className={`w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border shadow-sm transition-all
                            ${isCurrent ? 'bg-amber-50 border-amber-200' : isDelayed ? 'bg-rose-50 border-rose-200' : 'bg-white border-slate-100 hover:border-slate-200'}
                          `}>
                            <div className="flex items-center justify-between mb-1">
                              <h4 className={`font-bold text-sm ${isCurrent ? 'text-amber-900' : isDelayed ? 'text-rose-900' : 'text-slate-800'}`}>{item.st}</h4>
                            </div>
                            <div className="text-xs font-medium text-slate-500 flex items-center gap-1.5">
                              <Clock size={12} />
                              {format(item.time, 'dd MMM, hh:mm a')}
                              {isDelayed && <span className="text-rose-600 ml-1 font-bold">OVERDUE</span>}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* WEATHER TAB */}
            {tab === 'weather' && (
              <div className="p-6 space-y-5">
                <div className={`rounded-2xl p-5 border shadow-sm ${getWeatherRiskColor(weatherRisk.overallRisk > 60 ? 'high' : weatherRisk.overallRisk > 30 ? 'medium' : 'low')}`}>
                  <div className="flex items-start gap-4">
                    <div className="w-14 h-14 rounded-full bg-white/50 flex items-center justify-center text-3xl shrink-0 shadow-sm">
                      {weatherRisk.overallRisk > 60 ? '⛈️' : weatherRisk.overallRisk > 30 ? '🌧️' : '☀️'}
                    </div>
                    <div>
                      <h3 className="font-bold text-lg leading-tight mb-1">Route Weather Intelligence</h3>
                      <p className="text-sm opacity-90 font-medium mb-3">Primary Risk: {weatherRisk.primaryHazard}</p>
                      
                      <div className="grid grid-cols-2 gap-3 max-w-md">
                        <div className="bg-white/60 rounded-lg p-2.5">
                          <div className="text-[10px] uppercase font-bold tracking-wide opacity-80">Risk Score</div>
                          <div className="font-black text-xl">{weatherRisk.overallRisk}/100</div>
                        </div>
                        <div className="bg-white/60 rounded-lg p-2.5">
                          <div className="text-[10px] uppercase font-bold tracking-wide opacity-80">Est. Delay impact</div>
                          <div className="font-black text-xl">{weatherRisk.delayEstimateHours} Hours</div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-5 bg-white/70 rounded-xl p-4 text-sm font-medium border border-white/50 shadow-sm flex items-start gap-3">
                    <Shield size={18} className="shrink-0 mt-0.5 opacity-80" />
                    <div>
                      <div className="font-bold uppercase tracking-wider text-[11px] mb-1 opacity-80">AI Recommendation</div>
                      {weatherRisk.recommendation}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {weatherRisk.conditions.map((loc, idx) => (
                    <div key={idx} className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm relative overflow-hidden">
                      <div className="absolute top-0 right-0 bg-slate-50 text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-bl-xl text-slate-500 border-l border-b border-slate-100">
                        {idx === 0 ? 'Origin' : 'Destination'}
                      </div>
                      <h4 className="font-bold text-slate-800 text-base mb-3"><MapPin size={14} className="inline mr-1 text-primary"/>{loc.location}</h4>
                      <p className="text-sm font-medium text-slate-700 capitalize flex items-center gap-2 mb-2">
                        Condition: <span className="bg-slate-100 px-2.5 py-1 rounded-md text-xs font-bold">{loc.condition.replace('_', ' ')}</span>
                      </p>
                      <p className="text-xs text-slate-500 leading-relaxed max-w-[90%]">{loc.impact}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* RISK TAB */}
            {tab === 'risk' && (
              <div className="p-6 space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Gauge */}
                  <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-6 flex flex-col items-center justify-center">
                    <div className={`w-36 h-36 rounded-full border-[12px] flex items-center justify-center transition-all shadow-inner ${
                      shipment.risk_score < 30 ? 'border-emerald-400' : shipment.risk_score < 70 ? 'border-amber-400' : 'border-rose-500'
                    }`}>
                      <div className="text-center">
                        <div className={`text-4xl font-black tracking-tighter ${riskColor(shipment.risk_score)}`}>{shipment.risk_score}</div>
                        <div className="text-[11px] font-bold uppercase tracking-widest text-slate-500 mt-1">Score</div>
                      </div>
                    </div>
                    <div className={`mt-4 font-black uppercase tracking-widest text-[13px] px-4 py-1.5 rounded-full ${shipment.risk_score < 30 ? 'bg-emerald-50 text-emerald-700' : shipment.risk_score < 70 ? 'bg-amber-50 text-amber-700' : 'bg-rose-50 text-rose-700'}`}>
                      {riskLabel(shipment.risk_score)} RISK
                    </div>
                  </div>

                  {/* AI Assessment */}
                  <div className="bg-gradient-to-br from-indigo-50 to-blue-50/50 border border-indigo-100 rounded-2xl shadow-sm overflow-hidden flex flex-col">
                    <div className="px-5 py-3 border-b border-indigo-100/50 flex items-center gap-2 bg-white/40 backdrop-blur-sm">
                      <Sparkles size={15} className="text-indigo-600" />
                      <span className="text-xs font-bold text-indigo-900 uppercase tracking-wider">Gemini AI Risk Analysis</span>
                    </div>
                    <div className="p-5 flex-1 flex flex-col justify-center">
                      {aiLoading ? (
                        <div className="flex flex-col items-center justify-center h-full text-indigo-400 gap-3">
                          <Loader2 size={24} className="animate-spin" />
                          <span className="text-xs font-bold uppercase tracking-widest">Analyzing Risk...</span>
                        </div>
                      ) : aiRisk ? (
                        <p className="text-sm text-indigo-900/90 leading-relaxed font-medium">{aiRisk}</p>
                      ) : (
                        <div className="text-center text-sm text-slate-500">
                          Risk assessment unavailable. <br/>
                          <button onClick={() => setTab('overview')} className="text-primary font-semibold mt-2 hover:underline">Try Again</button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Risk Factors */}
                <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-4 space-y-2.5">
                  <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest ml-1 mb-3">Identified Risk Factors</h4>
                  {[
                    { factor: 'Transport Mode', level: shipment.mode === 'sea' ? 'high' : shipment.mode === 'road' ? 'medium' : 'low',
                      detail: shipment.mode === 'sea' ? 'Sea routes have higher weather & port delay exposure' : shipment.mode === 'road' ? 'Road freight subject to traffic, accidents, theft' : 'Controlled environment, lower surface risk' },
                    { factor: 'Weather Impact', level: weatherRisk.overallRisk > 60 ? 'critical' : weatherRisk.overallRisk > 30 ? 'medium' : 'low',
                      detail: `Current route hazard: ${weatherRisk.primaryHazard}. Estimated delay: ${weatherRisk.delayEstimateHours}h.` },
                    { factor: 'Cargo Value/Risk', level: (shipment.declared_value || 0) > 1000000 || ['Chemicals'].includes(shipment.cargo_type) ? 'high' : 'low',
                      detail: (shipment.declared_value || 0) > 1000000 ? 'High value cargo requires enhanced security tracking' : 'Standard cargo classification' },
                  ].map(f => {
                    const styles = { critical: 'bg-rose-50 border-rose-100 text-rose-800', high: 'bg-orange-50 border-orange-100 text-orange-800', medium: 'bg-amber-50 border-amber-100 text-amber-800', low: 'bg-emerald-50 border-emerald-100 text-emerald-800' };
                    const dots = { critical: 'bg-rose-500', high: 'bg-orange-500', medium: 'bg-amber-500', low: 'bg-emerald-500' };
                    return (
                      <div key={f.factor} className={`flex gap-3.5 p-3.5 rounded-xl border transition-colors ${styles[f.level as keyof typeof styles]}`}>
                        <div className="pt-1"><div className={`w-2.5 h-2.5 rounded-full shadow-sm ${dots[f.level as keyof typeof dots]}`} /></div>
                        <div className="flex-1">
                          <div className="font-bold text-sm tracking-tight mb-0.5">{f.factor}</div>
                          <div className="text-[13px] opacity-80 leading-snug font-medium">{f.detail}</div>
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-widest opacity-60 pt-0.5">{f.level}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* VEHICLE TAB */}
            {tab === 'vehicle' && vehicleInfo && (
              <div className="p-6">
                <div className="bg-white border border-slate-100 shadow-sm rounded-2xl overflow-hidden">
                  <div className="bg-gradient-to-r from-slate-800 to-slate-900 border-b border-slate-800 p-8 text-center text-white relative flex flex-col items-center justify-center">
                    <div className="text-6xl mb-4 drop-shadow-md">{vehicleInfo.icon}</div>
                    <div className="font-black text-2xl tracking-tight mb-1">{vehicleInfo.type}</div>
                    <div className="font-mono text-base text-slate-300 font-medium px-3 py-1 bg-white/10 rounded-lg backdrop-blur-sm tracking-wider uppercase inline-block mx-auto">{vehicleInfo.number}</div>
                  </div>
                  
                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-0 divide-x divide-y divide-slate-100">
                    {[
                      { label: 'Carrier / Transporter', value: shipment.transporter_name || 'LogiFlow Direct' },
                      { label: 'Captain / Driver',      value: activeDispatch?.drivers?.full_name || vehicleInfo.driver },
                      { label: 'Contact',               value: activeDispatch?.drivers?.phone || vehicleInfo.contact },
                      { label: 'License / Unit ID',     value: activeDispatch?.drivers?.license_number || vehicleInfo.number },
                      { label: 'Dispatch Status',       value: activeDispatch?.status || 'Assigned' },
                      { label: 'Current Node',          value: activeDispatch?.stops?.[activeDispatch.current_stop_index || 0]?.label || vehicleInfo.checkpoint },
                    ].map(item => (
                      <div key={item.label} className="p-5 hover:bg-slate-50 transition-colors">
                        <div className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">{item.label}</div>
                        <div className="font-semibold text-slate-800 text-[13px]">{item.value}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ROUTES TAB */}
            {tab === 'routes' && (
              <div className="p-6">
                <div className="mb-5 bg-blue-50 border border-blue-100 rounded-xl p-4 flex gap-3 text-blue-900">
                  <GitBranch size={20} className="shrink-0 mt-0.5 text-blue-600" />
                  <div>
                    <h4 className="font-bold text-sm mb-1">Smart Route Optimization</h4>
                    <p className="text-xs font-medium opacity-80 leading-relaxed">Compare alternative transport modes for this route. Costs and risk factors are dynamically calculated based on distance, cargo weight, and live weather data. Click &quot;Approve Route&quot; to immediately update the logistics plan.</p>
                  </div>
                </div>

                <div className="space-y-4">
                  {altRoutes.map(route => (
                    <div key={route.mode} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:border-primary/40 hover:shadow-md transition-all group relative overflow-hidden">
                      <div className="absolute top-0 right-0 bg-slate-50 text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-bl-xl text-slate-500 border-l border-b border-slate-100">
                        {route.diff}
                      </div>

                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-xl shrink-0 group-hover:bg-blue-50 group-hover:text-primary transition-colors">
                              {modeIcon(route.mode)}
                            </div>
                            <div>
                              <div className="font-bold text-slate-900 text-base">{route.label}</div>
                              <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">{route.mode} freight</div>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-3 gap-4">
                            <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 flex items-center gap-1"><Clock size={10}/> ETA</div>
                              <div className="font-black text-slate-800 text-sm">{route.etaHrs} Hours</div>
                            </div>
                            <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 flex items-center gap-1"><IndianRupee size={10}/> Cost</div>
                              <div className="font-black text-emerald-700 text-sm">{route.costStr}</div>
                            </div>
                            <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 flex items-center gap-1"><Shield size={10}/> Risk</div>
                              <div className={`font-black text-sm ${riskColor(route.risk)}`}>{route.risk}/100</div>
                            </div>
                          </div>
                        </div>
                        
                        <div className="sm:ml-4 sm:pl-4 sm:border-l border-slate-100 flex flex-col justify-center shrink-0">
                          <button
                            onClick={() => handleReroute(route.mode)}
                            disabled={rerouting !== null}
                            className="w-full sm:w-auto px-5 py-3 bg-slate-900 text-white text-sm font-bold tracking-wide rounded-xl hover:bg-primary transition-colors disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm"
                          >
                            {rerouting === route.mode ? <Loader2 size={16} className="animate-spin" /> : <GitBranch size={16} />}
                            Approve Route
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* FLEET TAB */}
            {tab === 'fleet' && (
              <div className="p-6 space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                {activeDispatch ? (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                     <div className="lg:col-span-2 space-y-6">
                        <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white relative overflow-hidden group">
                              <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity"><Truck size={100} /></div>
                              <div className="relative z-10">
                                  <div className="flex items-center gap-3 mb-8">
                                      <div className="px-3 py-1 bg-white/10 rounded-full text-[9px] font-black uppercase tracking-widest text-emerald-400 border border-white/5">
                                          Active Dispatch Unit
                                      </div>
                                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                  </div>
                                  <div className="flex items-center gap-6">
                                      <div className="w-16 h-16 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center text-3xl font-black italic">
                                          {activeDispatch.drivers?.full_name?.[0]}
                                      </div>
                                      <div>
                                          <h4 className="text-2xl font-black italic tracking-tight">{activeDispatch.drivers?.full_name}</h4>
                                          <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mt-1">{activeDispatch.drivers?.license_number} • {activeDispatch.drivers?.phone}</p>
                                      </div>
                                  </div>
                              </div>
                        </div>

                        <div className="bg-white border border-slate-100 rounded-[2.5rem] p-8">
                          <h4 className="text-xs font-black text-slate-900 uppercase tracking-[0.2em] mb-8 flex items-center gap-3">
                              <div className="w-1.5 h-4 bg-primary rounded-full" />
                              Interactive Transit Stages
                          </h4>
                          <div className="space-y-3">
                              {(activeDispatch.stops as { label: string; lat?: number; lng?: number }[] | undefined)?.map((stop, idx: number) => (
                                  <div key={idx} className="flex items-center gap-6 p-4 rounded-3xl border border-transparent hover:border-slate-50 hover:bg-slate-50/50 transition-all group">
                                      <div className="flex flex-col items-center gap-1 shrink-0">
                                          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-xs font-black border transition-all ${
                                              idx <= (activeDispatch.current_stop_index || 0) ? 'bg-primary text-white border-primary shadow-lg shadow-blue-900/10' : 'bg-slate-50 text-slate-400 border-slate-100'
                                          }`}>
                                              {idx === (activeDispatch.current_stop_index || 0) ? <Zap size={14} className="animate-pulse" /> : idx + 1}
                                          </div>
                                      </div>
                                      <div>
                                          <p className="text-sm font-black text-slate-800 tracking-tight">{stop.label}</p>
                                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                                              {idx === (activeDispatch.current_stop_index || 0) ? 'Current Transit Node' : idx < (activeDispatch.current_stop_index || 0) ? 'Logistics Check Completed' : 'Pending Operations'}
                                          </p>
                                      </div>
                                  </div>
                              ))}
                          </div>
                        </div>
                     </div>

                     <div className="space-y-6">
                        <div className="bg-slate-50 border border-slate-100 rounded-[2rem] p-6">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Personnel Health Check</p>
                            <div className="space-y-4">
                                <div className="flex justify-between items-center py-3 border-b border-slate-200/50">
                                    <span className="text-[11px] font-black text-slate-500 uppercase tracking-tight">Fatigue Status</span>
                                    <span className="text-xs font-black text-emerald-600 uppercase tracking-widest">Low Risk</span>
                                </div>
                                <div className="flex justify-between items-center py-3 border-b border-slate-200/50">
                                    <span className="text-[11px] font-black text-slate-500 uppercase tracking-tight">Vessel ID</span>
                                    <span className="text-xs font-black text-slate-800 uppercase tracking-widest">{shipment.vehicle_number || 'TBA'}</span>
                                </div>
                                <div className="flex justify-between items-center py-3">
                                    <span className="text-[11px] font-black text-slate-500 uppercase tracking-tight">Unit Rating</span>
                                    <div className="flex items-center gap-1">
                                        <span className="text-xs font-black text-slate-800">{activeDispatch.drivers?.rating || '4.8'}</span>
                                        <div className="w-1.5 h-1.5 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.5)]" />
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div className="bg-primary/5 border border-primary/10 rounded-[2rem] p-6">
                            <h5 className="text-[10px] font-black text-primary uppercase tracking-widest mb-3">Unit Communication</h5>
                            <button className="w-full py-4 bg-primary text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-2xl shadow-xl shadow-blue-900/10 hover:bg-blue-700 active:scale-[0.98] transition-all flex items-center justify-center gap-2">
                                <MessageSquare size={14} /> Send Alert to Unit
                            </button>
                        </div>
                     </div>
                  </div>
                ) : (
                  <div className="max-w-xl mx-auto py-12 text-center space-y-8">
                     <div className="w-24 h-24 bg-indigo-50 rounded-[2rem] mx-auto flex items-center justify-center text-[#3b5bdb] transition-transform hover:scale-105 duration-500 shadow-xl shadow-blue-900/5">
                        <Truck size={48} />
                     </div>
                     <div>
                        <h3 className="text-3xl font-black text-slate-800 tracking-tight">Fleet Unit Unassigned</h3>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em] mt-2">
                           {shipment.status === 'delivered' ? `Shipment ${shipment.shipment_code} has been delivered.` : `Activate logistics resource for ${shipment.shipment_code}`}
                        </p>
                     </div>
                     
                     {shipment.status !== 'delivered' ? (
                       <div className="space-y-4">
                          <div className="relative group">
                              <div className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors">
                                  <User size={18} />
                              </div>
                              <select 
                                value={selectedDriverId}
                                onChange={(e) => setSelectedDriverId(e.target.value)}
                                className="w-full pl-16 pr-8 py-5 bg-white border-2 border-slate-100 rounded-3xl text-sm font-black text-slate-800 focus:outline-none focus:border-primary focus:ring-8 focus:ring-primary/5 transition-all appearance-none cursor-pointer"
                              >
                                <option value="">Select Priority Driver</option>
                                {drivers.map(d => (
                                    <option key={d.id} value={d.id}>{d.full_name} • {d.license_number}</option>
                                ))}
                              </select>
                              <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-slate-300"><ChevronRight size={18} className="rotate-90" /></div>
                          </div>

                          <button 
                            onClick={handleAssignDriver}
                            disabled={!selectedDriverId || assigning}
                            className="w-full py-5 bg-primary text-white text-[11px] font-black uppercase tracking-[0.3em] rounded-3xl shadow-2xl shadow-blue-900/20 hover:bg-blue-700 active:scale-[0.98] transition-all disabled:opacity-50"
                          >
                            {assigning ? <Loader2 className="animate-spin mx-auto" size={18} /> : 'Initiate Dispatch Protocol'}
                          </button>
                       </div>
                     ) : (
                       <div className="text-green-600 font-bold py-5 bg-green-50 border border-green-200 rounded-3xl text-[13px] uppercase tracking-widest mt-2">
                         Delivered Validation Complete
                       </div>
                     )}

                     {drivers.length === 0 && shipment.status !== 'delivered' && (
                        <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl text-[10px] font-black text-amber-700 uppercase tracking-widest flex items-center justify-center gap-2">
                           <AlertTriangle size={14} /> Global Driver Pool Empty
                        </div>
                     )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-white shrink-0">
            <button
              onClick={openEmailModal}
              className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-slate-700 hover:text-primary hover:bg-blue-50 rounded-xl transition-colors border border-slate-200 bg-white shadow-sm"
            >
              <Mail size={16} />
              Email Supplier Update
            </button>
            <button onClick={onClose} className="px-5 py-2 text-sm font-bold text-slate-600 border border-slate-200 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors">
              Close Detail
            </button>
          </div>
        </div>
      </div>

      {/* Email Supplier Modal */}
      {emailModal && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setEmailModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <h3 className="font-bold text-slate-900 flex items-center gap-2.5 text-[15px]">
                <div className="w-8 h-8 rounded-full bg-blue-100 text-primary flex items-center justify-center"><Mail size={15}/></div>
                Supplier Update Email
              </h3>
              <button onClick={() => setEmailModal(false)} className="p-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors">
                <X size={18} />
              </button>
            </div>
            <div className="p-6 space-y-4 bg-white">
              <div className="flex items-center gap-3">
                <div className="w-16 text-xs font-bold text-slate-500 uppercase tracking-widest text-right">To</div>
                <input value={emailPreview.to} onChange={e => setEmailPreview(p => ({...p, to: e.target.value}))}
                  className="flex-1 text-[13px] font-medium border border-slate-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary shadow-sm bg-slate-50" />
              </div>
              <div className="flex items-center gap-3">
                <div className="w-16 text-xs font-bold text-slate-500 uppercase tracking-widest text-right">Subj</div>
                <input value={emailPreview.subject} onChange={e => setEmailPreview(p => ({...p, subject: e.target.value}))}
                  className="flex-1 text-[13px] font-medium border border-slate-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary shadow-sm bg-slate-50" />
              </div>
              <div className="flex items-start gap-3 pt-2">
                <div className="w-16 text-xs font-bold text-slate-500 uppercase tracking-widest text-right pt-3">Body</div>
                <textarea value={emailPreview.body} onChange={e => setEmailPreview(p => ({...p, body: e.target.value}))}
                  rows={10}
                  className="flex-1 text-[13px] leading-relaxed border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary shadow-sm bg-slate-50 font-mono resize-none" />
              </div>
            </div>
            <div className="flex justify-between items-center px-6 py-4 border-t border-slate-100 bg-slate-50">
              <div className="text-xs text-slate-500 font-medium flex items-center gap-1.5"><AlertTriangle size={12}/> Opens in default mail client</div>
              <div className="flex gap-3">
                <button onClick={() => setEmailModal(false)} className="px-5 py-2.5 text-[13px] font-bold text-slate-600 hover:text-slate-900 transition-colors">
                  Cancel
                </button>
                <button onClick={sendEmail} disabled={emailSending}
                  className="flex items-center gap-2 px-6 py-2.5 text-[13px] font-bold bg-primary text-white rounded-xl shadow-md hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-60"
                >
                  {emailSending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
                  Send Email Update
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function SparklesIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>
      <path d="M5 3v4"/><path d="M19 17v4"/><path d="M3 5h4"/><path d="M17 19h4"/>
    </svg>
  );
}
