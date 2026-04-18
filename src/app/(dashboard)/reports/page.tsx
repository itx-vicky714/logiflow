"use client";

import React, { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { seedShipments, statusConfig, modeIcon, riskColor, formatCurrency, estimateRevenue } from '@/lib/utils';
import type { Shipment } from '@/types';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface ReportCard { id: string; title: string; description: string; frequency: string; icon: string; col: string; }
const REPORT_TYPES: ReportCard[] = [
  { id: 'daily', title: 'Operational Summary', description: 'Snapshot of active manifests, latencies, and fulfillment metrics for current cycle.', frequency: 'Cycle End', icon: 'description', col: 'text-[#493ee5] bg-primary-fixed border-[#493ee5]/10' },
  { id: 'disruption', title: 'Disruption Matrix', description: 'Root cause analysis of grid anomalies, risk escalations and node failures.', frequency: 'Real-time', icon: 'warning', col: 'text-error bg-error-container border-error/10' },
  { id: 'cost', title: 'Yield Impact Analysis', description: 'Terminal cost breakdown by vector, cargo category, and projected revenue.', frequency: 'Weekly', icon: 'payments', col: 'text-on-surface bg-surface-container-low border-white/50' },
  { id: 'weather', title: 'Amnospheric Forecast', description: 'Predicted weather risk on active Indian corridors for the 72h window.', frequency: '3× Cycle', icon: 'cloud', col: 'text-cyan-600 bg-cyan-50 border-cyan-100' },
  { id: 'mode', title: 'Vector Performance', description: 'Cross-mode evaluation: Road vs Rail vs Air vs Sea efficiency benchmarks.', frequency: 'Monthly', icon: 'hub', col: 'text-indigo-600 bg-indigo-50 border-indigo-100' },
  { id: 'ai_risk', title: 'Predictive Risk Audit', description: 'Gemini-powered risk modeling with top at-risk nodes and mitigation logic.', frequency: 'AI Drive', icon: 'bolt', col: 'text-amber-600 bg-amber-50 border-amber-100' },
];

interface GeneratedReport {
  id: string; title: string; generatedAt: Date;
  metrics: { label: string; value: string }[];
  tableRows: Shipment[];
  aiText?: string;
  extraSections?: { title: string; content: string }[];
}

function buildReport(type: string, shipments: Shipment[], aiText?: string): GeneratedReport {
  const now = new Date();
  const total = shipments.length;
  const inTransit = shipments.filter(s => s.status === 'in_transit').length;
  const delayed = shipments.filter(s => s.status === 'delayed').length;
  const onTime = shipments.filter(s => s.status === 'on_time' || s.status === 'delivered').length;
  const atRisk = shipments.filter(s => s.risk_score > 70).length;
  const totalRev = shipments.reduce((a, s) => a + estimateRevenue(s), 0);

  const base = { id: type, generatedAt: now, aiText, tableRows: shipments };

  switch (type) {
    case 'daily':
      return { ...base, title: 'Operational Summary', metrics: [
        { label: 'Total Nodes', value: String(total) },
        { label: 'In Transit', value: String(inTransit) },
        { label: 'Network Flow', value: `${Math.round((onTime / Math.max(1, total)) * 100)}%` },
        { label: 'Terminal Risk', value: String(atRisk) },
        { label: 'Est. Revenue', value: formatCurrency(totalRev) },
      ]};
    case 'disruption':
      const dis = shipments.filter(s => s.status === 'delayed' || s.risk_score > 70);
      return { ...base, title: 'Disruption Matrix', tableRows: dis, metrics: [
        { label: 'Disrupted Units', value: String(delayed) },
        { label: 'Critical Risk', value: String(atRisk) },
        { label: 'Revenue at Risk', value: formatCurrency(dis.reduce((a, s) => a + estimateRevenue(s), 0)) },
      ]};
    case 'cost':
      return { ...base, title: 'Yield Impact Analysis', metrics: [
        { label: 'Total Yield', value: formatCurrency(totalRev) },
        { label: 'Avg Per Node', value: total > 0 ? formatCurrency(totalRev / total) : '₹0' },
        { label: 'Road Logistics', value: formatCurrency(shipments.filter(s=>s.mode==='road').reduce((a,s)=>a+estimateRevenue(s),0)) },
        { label: 'Sea Logistics', value: formatCurrency(shipments.filter(s=>s.mode==='sea').reduce((a,s)=>a+estimateRevenue(s),0)) },
      ]};
    case 'weather':
      return { ...base, title: 'Atmospheric Forecast', metrics: [
        { label: 'Active Routes', value: String(total - shipments.filter(s=>s.status==='delivered').length) },
        { label: 'Weather Buffer', value: '2-4 Hours' },
        { label: 'Forecast Node', value: '72h Window' },
      ], extraSections: [
        { title: 'Bay of Bengal Cycle', content: 'Cyclone warning active. Maritime nodes via Chennai-Vizag corridor: monitor ETA. Peak winds: 65 kmph. Expect 12h terminal delays.' },
        { title: 'Monsoon Saturation', content: 'Heavy precipitation forecast for NH-48 (Western Ghats). Road logistics: maintain low tactical speeds.' }
      ]};
    case 'mode':
      return { ...base, title: 'Vector Performance Audit', metrics: [
        { label: 'Road Efficiency', value: '78%' },
        { label: 'Rail Efficiency', value: '92%' },
        { label: 'Air Speed Factor', value: '4.2x' },
        { label: 'Sea Volume Index', value: 'Extreme' },
      ]};
    case 'ai_risk':
      return { ...base, title: 'Predictive Risk Audit', metrics: [
        { label: 'Risk Anomaly', value: String(atRisk) },
        { label: 'Safety Index', value: '92.4%' },
        { label: 'Revenue Guard', value: formatCurrency(totalRev * 0.95) },
      ], tableRows: [...shipments].sort((a,b) => b.risk_score - a.risk_score)};
    default:
      return { ...base, title: type, metrics: [] };
  }
}

export default function ReportsPage() {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [report, setReport] = useState<GeneratedReport | null>(null);
  const [generating, setGenerating] = useState<string | null>(null);

  useEffect(() => {
    const fetch = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await seedShipments(user.id);
      const { data } = await supabase.from('shipments').select('*').eq('user_id', user.id);
      if (data) setShipments(data);
    };
    fetch();
  }, []);

  const generateReport = async (card: ReportCard) => {
    setGenerating(card.id);
    try {
      let aiText: string | undefined;
      if (card.id === 'ai_risk' || card.id === 'disruption') {
        const summary = shipments.slice(0, 10).map(s => `${s.shipment_code}: ${s.mode}, ${s.status}, risk:${s.risk_score}`).join('\n');
        const res = await fetch('/api/chat', {
          method: 'POST', 
          headers: { 
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({ message: `Analyze these Indian freight nodes for ${card.title}:\n${summary}`, history: [] })
        });
        const d = await res.json();
        aiText = d.text;
      }
      setReport(buildReport(card.id, shipments, aiText));
      toast.success('Manifest Intelligence Compiled');
    } catch {
      toast.error('Audit Protocol Failure');
    } finally {
      setGenerating(null);
    }
  };

  const downloadPDF = async () => {
    if (!report) return;
    toast.info('Initiating PDF Protocol...');
    setGenerating('pdf');
    try {
      const { jsPDF } = await import('jspdf');
      const autoTable = (await import('jspdf-autotable')).default;
      
      const doc = new jsPDF();
      doc.setFontSize(22); doc.text('LogiFlow Intelligence', 14, 20);
      doc.setFontSize(12); doc.text(report.title.toUpperCase(), 14, 30);
      doc.text(`Generated: ${format(report.generatedAt, 'dd MMM yyyy, HH:mm')}`, 14, 38);
      
      autoTable(doc, {
        startY: 50, head: [['Identifier', 'Route', 'Mode', 'Risk']],
        body: report.tableRows.slice(0, 20).map(s => [s.shipment_code, `${s.origin}→${s.destination}`, s.mode, `${s.risk_score}%`]),
      });
      
      doc.save(`LogiFlow_Audit_${report.id}.pdf`);
      toast.success('PDF Protocol Downloaded');
    } catch (err) {
      console.error(err);
      toast.error('PDF Export Error');
    } finally {
      setGenerating(null);
    }
  };

  return (
    <div className="space-y-12 max-w-[1400px] mx-auto font-['Inter'] antialiased tracking-tight text-[#191c1e] animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
      
      {/* Strategic Vision Header */}
      <div className="bg-on-surface rounded-3xl p-10 text-inverse-on-surface relative overflow-hidden shadow-2xl border border-white/10 flex flex-col lg:flex-row lg:items-center justify-between gap-10">
        <div className="relative z-10 space-y-4 max-w-2xl">
          <div className="flex items-center gap-3">
             <span className="material-symbols-outlined text-primary text-[32px]">analytics</span>
             <span className="text-[10px] font-black tracking-[0.4em] uppercase opacity-60">Control Tower Intelligence</span>
          </div>
          <h1 className="text-4xl font-black uppercase tracking-tighter">Strategic Audit Manifests</h1>
          <p className="text-[15px] font-bold opacity-60 leading-relaxed italic">
            Synthesize orbital-level operational datasets into tactical intelligence. Powered by Gemini predictive modeling and real-time corridor telemetry.
          </p>
        </div>
        
        <div className="flex gap-10 items-center lg:border-l lg:border-white/10 lg:pl-10">
           <div>
              <div className="text-4xl font-black font-mono tracking-tighter">{shipments.length}</div>
              <div className="text-[10px] font-black uppercase tracking-widest opacity-40 mt-1">Nodes Analyzed</div>
           </div>
           <div>
              <div className="text-4xl font-black text-primary italic">SYNC</div>
              <div className="text-[10px] font-black uppercase tracking-widest opacity-40 mt-1">Grid Status</div>
           </div>
        </div>
        <span className="material-symbols-outlined absolute -right-10 -bottom-10 text-[200px] opacity-[0.03] rotate-12">monitoring</span>
      </div>

      {/* Grid: Audit Vectors */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {REPORT_TYPES.map(card => (
          <div 
            key={card.id} onClick={() => !generating && generateReport(card)}
            className={`cursor-pointer group relative bg-surface-container-lowest border border-white/50 rounded-3xl p-8 curated-shadow transition-all duration-300 hover:-translate-y-1 ${report?.id === card.id ? 'ring-2 ring-primary ring-offset-4 ring-offset-surface' : ''}`}
          >
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 transition-all shadow-sm ${card.col}`}>
               <span className="material-symbols-outlined text-[24px]">{card.icon}</span>
            </div>
            <h3 className="text-[17px] font-black text-on-surface uppercase tracking-tight mb-2 group-hover:text-[#493ee5] transition-colors">{card.title}</h3>
            <div className="flex items-center gap-2 mb-4">
               <span className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest px-2.5 py-1 bg-surface-container-low rounded-lg">{card.frequency}</span>
               {card.id === 'ai_risk' && <span className="text-[10px] font-black text-amber-600 uppercase tracking-widest animate-pulse flex items-center gap-1"><span className="material-symbols-outlined text-[12px]">bolt</span> Neural</span>}
            </div>
            <p className="text-[12px] font-bold text-on-surface-variant/60 leading-relaxed italic mb-8 group-hover:text-on-surface-variant transition-colors">{card.description}</p>
            <div className="flex items-center justify-between border-t border-surface-container/30 pt-4">
               <span className="text-[11px] font-black uppercase tracking-[0.2em] text-on-surface-variant/30 group-hover:text-primary transition-all">Audit System &darr;</span>
               {generating === card.id && <span className="status-pulse bg-primary w-4 h-4" />}
            </div>
          </div>
        ))}
      </div>

      {/* Audit Viewer: Controlled Environment */}
      <AnimatePresence>
        {report && (
            <motion.div 
                initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}
                className="bg-surface-container-lowest border border-white/50 rounded-[3rem] curated-shadow overflow-hidden"
            >
                {/* Header: Audit Directive */}
                <div className="p-12 border-b border-surface-container bg-surface-container-low/50 relative overflow-hidden">
                    <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-10">
                        <div className="space-y-4">
                            <div className="flex items-center gap-3">
                                <span className="w-1.5 h-1.5 rounded-full bg-primary status-pulse" />
                                <span className="text-[10px] font-black text-on-surface-variant uppercase tracking-[0.3em]">Executive Audit Registry</span>
                            </div>
                            <h2 className="text-4xl font-black text-on-surface tracking-tighter uppercase italic">{report.title}</h2>
                            <p className="text-[12px] font-bold text-on-surface-variant uppercase tracking-[0.1em]">Protocol Generated: {format(report.generatedAt, 'EEEE, dd MMM yyyy • HH:mm')}</p>
                        </div>
                        <button onClick={downloadPDF} className="bg-on-surface text-inverse-on-surface px-10 py-5 rounded-2xl text-[11px] font-black uppercase tracking-widest flex items-center gap-4 shadow-2xl hover:opacity-95 transition-all active:scale-95">
                           Export Offline Protocol <span className="material-symbols-outlined text-[16px]">download</span>
                        </button>
                    </div>
                </div>

                {/* Audit Telemetry Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 border-b border-surface-container">
                    {report.metrics.map(m => (
                        <div key={m.label} className="p-10 border-r border-surface-container last:border-0 hover:bg-surface-container-low/30 transition-colors">
                            <div className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest mb-4">{m.label}</div>
                            <div className="text-3xl font-black text-[#493ee5] tracking-tighter">{m.value}</div>
                        </div>
                    ))}
                </div>

                {/* Neural Evaluation Layer */}
                {report.aiText && (
                    <div className="p-12 border-b border-surface-container bg-primary-fixed/30">
                        <div className="flex items-center gap-4 mb-8">
                           <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-primary curated-shadow">
                              <span className="material-symbols-outlined text-[24px]">psychology</span>
                           </div>
                           <div>
                              <h4 className="text-[13px] font-black text-on-surface uppercase tracking-widest mb-1 italic">Neural Objective Evaluation</h4>
                              <p className="text-[9px] font-black text-on-surface-variant uppercase tracking-[0.2em] leading-none">Gemini Protocol v3.11 High-Fidelity Logic</p>
                           </div>
                        </div>
                        <div className="bg-surface-container-lowest border border-white p-10 rounded-3xl text-[14px] font-bold italic leading-relaxed text-on-surface-variant shadow-sm whitespace-pre-wrap">
                           {report.aiText}
                        </div>
                    </div>
                )}

                {/* Tactical Vector Audit Table */}
                <div className="p-12">
                    <div className="flex items-center justify-between mb-8">
                       <h4 className="text-[13px] font-black text-on-surface uppercase tracking-widest italic">Protocol Audit Trail</h4>
                       <span className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest opacity-40">Sample Size: {Math.min(report.tableRows.length, 20)} Units</span>
                    </div>

                    <div className="overflow-x-auto rounded-2xl border border-surface-container/50">
                        <table className="w-full text-left">
                            <thead className="bg-surface-container-low/50">
                                <tr>
                                    {['Mode', 'Terminal Code', 'Strategic Corridor', 'Risk Index'].map(h => (
                                        <th key={h} className="px-8 py-5 text-[10px] font-black text-on-surface-variant uppercase tracking-widest">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-surface-container">
                                {report.tableRows.slice(0, 20).map(s => (
                                    <tr key={s.id} className="hover:bg-surface-container-low/20 transition-all">
                                        <td className="px-8 py-6">{modeIcon(s.mode)}</td>
                                        <td className="px-8 py-6 font-black text-[13px] text-on-surface font-mono italic">#{s.shipment_code.split('-').pop()}</td>
                                        <td className="px-8 py-6 text-[13px] font-bold text-on-surface uppercase tracking-tight">{s.origin} ⇾ {s.destination}</td>
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-3">
                                                <div className="w-24 h-1.5 bg-surface-container rounded-full overflow-hidden">
                                                   <div className={`h-full ${riskColor(s.risk_score).replace('text-', 'bg-')} transition-all`} style={{ width: `${s.risk_score}%` }} />
                                                </div>
                                                <span className={`text-[12px] font-black ${riskColor(s.risk_score)}`}>{s.risk_score}%</span>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
