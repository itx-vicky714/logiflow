"use client";

import React, { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { seedShipments, statusConfig, modeIcon, riskLabel, riskColor, formatCurrency, estimateRevenue } from '@/lib/utils';
import type { Shipment } from '@/types';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, Mail, Sparkles, FileText, BarChart3, Cloud, Activity, TrendingUp, AlertTriangle, Loader2, RefreshCw, Filter, Search, Calendar, Globe, Zap, Network } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface ReportCard { id: string; title: string; description: string; frequency: string; icon: any; color: string; }
const REPORT_TYPES: ReportCard[] = [
  { id: 'daily',       title: 'Daily Operations Summary',    description: 'All active shipments, delays, deliveries and performance for today.',            frequency: 'On Demand', icon: FileText,      color: 'text-blue-600 bg-blue-50 border-blue-100' },
  { id: 'disruption',  title: 'Disruption Analysis',         description: 'Root cause analysis of delays, risk escalations and supply chain disruptions.',   frequency: 'On Demand', icon: AlertTriangle,  color: 'text-red-600 bg-red-50 border-red-100' },
  { id: 'cost',        title: 'Cost Impact Report',          description: 'Freight cost breakdown by mode, route, cargo, and estimated revenue.',             frequency: 'Weekly',    icon: BarChart3,      color: 'text-green-600 bg-green-50 border-green-100' },
  { id: 'weather',     title: 'Weather 72h Forecast',        description: 'Predicted weather risk on active Indian freight routes for the next 72 hours.',    frequency: '3× Daily',  icon: Cloud,          color: 'text-cyan-600 bg-cyan-50 border-cyan-100' },
  { id: 'mode',        title: 'Mode Performance',            description: 'Road vs Rail vs Air vs Sea comparison: on-time %, cost efficiency, risk score.',   frequency: 'Monthly',   icon: TrendingUp,     color: 'text-purple-600 bg-purple-50 border-purple-100' },
  { id: 'ai_risk',     title: 'AI Predictive Risk Report',   description: 'Gemini-powered risk assessment with top at-risk routes and actionable insights.',  frequency: 'AI',        icon: Sparkles,       color: 'text-amber-600 bg-amber-50 border-amber-100' },
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
  const delivered = shipments.filter(s => s.status === 'delivered').length;
  const delayed = shipments.filter(s => s.status === 'delayed').length;
  const inTransit = shipments.filter(s => s.status === 'in_transit').length;
  const onTime = shipments.filter(s => s.status === 'on_time').length;
  const atRisk = shipments.filter(s => s.risk_score > 70).length;
  const avgRisk = total > 0 ? Math.round(shipments.reduce((a, b) => a + b.risk_score, 0) / total) : 0;
  const totalRev = shipments.reduce((a, s) => a + estimateRevenue(s), 0);

  const base = { id: type, generatedAt: now, aiText, tableRows: shipments };

  switch (type) {
    case 'daily':
      return { ...base, title: 'Daily Operations Summary', metrics: [
        { label: 'Total Shipments', value: String(total) },
        { label: 'In Transit',      value: String(inTransit) },
        { label: 'On Time',         value: String(onTime) },
        { label: 'Delayed',         value: String(delayed) },
        { label: 'Delivered',       value: String(delivered) },
        { label: 'Est. Revenue',    value: formatCurrency(totalRev) },
      ]};
    case 'disruption':
      return { ...base, title: 'Disruption Analysis', tableRows: shipments.filter(s => s.status === 'delayed' || s.risk_score > 70),
        metrics: [
          { label: 'Disrupted Shipments', value: String(delayed) },
          { label: 'At Risk (>70)',        value: String(atRisk) },
          { label: 'Avg Risk Score',       value: String(avgRisk) },
          { label: 'Revenue at Risk',      value: formatCurrency(shipments.filter(s => s.risk_score > 70).reduce((a, s) => a + estimateRevenue(s), 0)) },
        ]};
    case 'cost':
      return { ...base, title: 'Cost Impact Report', metrics: [
        { label: 'Road Freight (est.)', value: formatCurrency(shipments.filter(s=>s.mode==='road').reduce((a,s)=>a+estimateRevenue(s),0)) },
        { label: 'Rail Freight (est.)', value: formatCurrency(shipments.filter(s=>s.mode==='rail').reduce((a,s)=>a+estimateRevenue(s),0)) },
        { label: 'Air Freight (est.)',  value: formatCurrency(shipments.filter(s=>s.mode==='air').reduce((a,s)=>a+estimateRevenue(s),0)) },
        { label: 'Sea Freight (est.)',  value: formatCurrency(shipments.filter(s=>s.mode==='sea').reduce((a,s)=>a+estimateRevenue(s),0)) },
        { label: 'Total Revenue',       value: formatCurrency(totalRev) },
        { label: 'Avg Per Shipment',    value: total > 0 ? formatCurrency(totalRev / total) : '₹0' },
      ]};
    case 'weather':
      return { ...base, title: 'Weather 72h Forecast', tableRows: shipments.filter(s => s.status !== 'delivered'),
        metrics: [
          { label: 'Active Routes',     value: String(total - delivered) },
          { label: 'Sea Routes (watch)',value: String(shipments.filter(s=>s.mode==='sea').length) },
          { label: 'High Risk Routes',  value: String(atRisk) },
          { label: 'Forecast Period',   value: '72 hours' },
        ],
        extraSections: [
          { title: '🌊 Bay of Bengal', content: 'Cyclone watch active. Sea shipments via Chennai-Kolkata route: monitor ETA. Wind speed: 45-60 kmph. Vessel delays expected: 6-12 hours.' },
          { title: '🌧️ Western Ghats', content: 'Heavy rainfall forecast for Pune-Mumbai NH-48 corridor. Road freight advisory: allow 2-3 hour buffer. Check NHAI ATMS for live updates.' },
          { title: '🌫️ Northern Plains', content: 'Dense fog expected in Delhi-Agra-Lucknow corridor until 0800 hrs. Rail services may see 30-45 min delays. Air services: check airport NOTAM.' },
        ]};
    case 'mode':
      return { ...base, title: 'Mode Performance Report', metrics: [
        { label: 'Road On-Time %',  value: `${Math.round((shipments.filter(s=>s.mode==='road'&&(s.status==='on_time'||s.status==='delivered')).length/Math.max(1,shipments.filter(s=>s.mode==='road').length))*100)}%` },
        { label: 'Rail On-Time %',  value: `${Math.round((shipments.filter(s=>s.mode==='rail'&&(s.status==='on_time'||s.status==='delivered')).length/Math.max(1,shipments.filter(s=>s.mode==='rail').length))*100)}%` },
        { label: 'Air On-Time %',   value: `${Math.round((shipments.filter(s=>s.mode==='air'&&(s.status==='on_time'||s.status==='delivered')).length/Math.max(1,shipments.filter(s=>s.mode==='air').length))*100)}%` },
        { label: 'Sea On-Time %',   value: `${Math.round((shipments.filter(s=>s.mode==='sea'&&(s.status==='on_time'||s.status==='delivered')).length/Math.max(1,shipments.filter(s=>s.mode==='sea').length))*100)}%` },
        { label: 'Avg Risk Score',  value: String(avgRisk) },
        { label: 'Most Used Mode',  value: (['road','rail','air','sea'] as const).reduce((a,b) => shipments.filter(s=>s.mode===b).length > shipments.filter(s=>s.mode===a).length ? b : a, 'road').toUpperCase() },
      ]};
    case 'ai_risk':
      return { ...base, title: 'AI Predictive Risk Report', metrics: [
        { label: 'Critical Risk', value: String(shipments.filter(s=>s.risk_score>80).length) },
        { label: 'High Risk',     value: String(shipments.filter(s=>s.risk_score>70&&s.risk_score<=80).length) },
        { label: 'Medium Risk',   value: String(shipments.filter(s=>s.risk_score>30&&s.risk_score<=70).length) },
        { label: 'Low Risk',      value: String(shipments.filter(s=>s.risk_score<=30).length) },
        { label: 'Avg Risk',      value: String(avgRisk) },
        { label: 'Revenue at Risk',value: formatCurrency(shipments.filter(s=>s.risk_score>70).reduce((a,s)=>a+estimateRevenue(s),0)) },
      ], tableRows: [...shipments].sort((a,b) => b.risk_score - a.risk_score)};
    default:
      return { ...base, title: type, metrics: [] };
  }
}

export default function ReportsPage() {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [report, setReport] = useState<GeneratedReport | null>(null);
  const [generating, setGenerating] = useState<string | null>(null);

  const fetchShipments = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await seedShipments(user.id);
    const { data } = await supabase.from('shipments').select('*').eq('user_id', user.id);
    if (data) setShipments(data);
  }, []);

  useEffect(() => { fetchShipments(); }, [fetchShipments]);

  const generateReport = async (card: ReportCard) => {
    setGenerating(card.id);
    try {
      let aiText: string | undefined;

      if (card.id === 'ai_risk' || card.id === 'disruption') {
        const summary = shipments.map(s =>
          `${s.shipment_code}: ${s.origin}→${s.destination} via ${s.mode}, ${s.status}, risk:${s.risk_score}, cargo:${s.cargo_type}, ${s.weight_kg}kg`
        ).join('\n');

        const prompt = card.id === 'ai_risk'
          ? `You are a logistics risk analyst for Indian freight. Analyze these ${shipments.length} shipments and provide:\n1. Top 3 at-risk shipments and why\n2. Systemic risk patterns you observe\n3. 3 specific mitigation recommendations\n4. Expected revenue impact if top risks materialize\n\nShipments:\n${summary}\n\nBe concise, structured, and use Indian logistics context.`
          : `Analyze these Indian logistics disruptions and provide a root cause analysis:\n1. Identify the main disruption causes\n2. Impact on supply chain timeline\n3. Recommended corrective actions\n\nShipments:\n${summary}`;

        const res = await fetch('/api/chat', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: prompt, history: [] })
        });
        const d = await res.json();
        aiText = d.error ? `⚠️ AI analysis unavailable: ${d.text}` : d.text;
      }

      const r = buildReport(card.id, shipments, aiText);
      setReport(r);
      toast.success(`${card.title} generated`);
    } catch {
      toast.error('Failed to generate report');
    } finally {
      setGenerating(null);
    }
  };

  const downloadPDF = async () => {
    if (!report) return;
    try {
      const { default: jsPDF } = await import('jspdf');
      const { default: autoTable } = await import('jspdf-autotable');
      const doc = new jsPDF();
      const pageW = doc.internal.pageSize.width;

      // Header
      doc.setFillColor(15, 23, 42); // slate-900
      doc.rect(0, 0, pageW, 40, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(22);
      doc.setFont('helvetica', 'bold');
      doc.text('LOGIFLOW', 14, 18);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text('EXECUTIVE INTELLIGENCE SUMMARY', 14, 26);
      doc.text(`DATE: ${format(report.generatedAt, 'dd MMM yyyy, HH:mm')}`, pageW - 14, 26, { align: 'right' });

      doc.setTextColor(0, 0, 0);
      doc.setFontSize(14);
      doc.text(report.title.toUpperCase(), 14, 52);

      // Metrics
      const metricRows = report.metrics.reduce((rows: string[][], m, i) => {
        if (i % 2 === 0) rows.push([m.label, m.value]);
        else rows[rows.length - 1].push(m.label, m.value);
        return rows;
      }, []);
      autoTable(doc, {
        startY: 58, head: [], body: metricRows.map(r => r),
        styles: { fontSize: 10, cellPadding: 5 }, columnStyles: { 0: { fontStyle: 'bold', fillColor: [248, 250, 252] }, 2: { fontStyle: 'bold', fillColor: [248, 250, 252] } },
      });

      // AI Text
      if (report.aiText) {
        const y = (doc as any).lastAutoTable.finalY + 15;
        doc.setFontSize(12); doc.setFont('helvetica', 'bold');
        doc.text('AI ASSESSMENT & MITIGATION', 14, y);
        doc.setFontSize(9); doc.setFont('helvetica', 'normal');
        const lines = doc.splitTextToSize(report.aiText.replace(/[*#]/g, ''), pageW - 28);
        doc.text(lines, 14, y + 8);
      }

      // Table
      autoTable(doc, {
        startY: (doc as any).lastAutoTable?.finalY + (report.aiText ? 60 : 15) || 120,
        head: [['CODE', 'ROUTE', 'MODE', 'STATUS', 'RISK', 'CARGO']],
        body: report.tableRows.slice(0, 40).map(s => [
          s.shipment_code, `${s.origin}→${s.destination}`, s.mode.toUpperCase(), s.status.toUpperCase(), `${s.risk_score}/100`, s.cargo_type
        ]),
        styles: { fontSize: 8, cellPadding: 3 },
        headStyles: { fillColor: [15, 23, 42] },
      });

      doc.save(`logiflow-intelligence-${report.id}.pdf`);
      toast.success('Download complete');
    } catch (err: any) {
      toast.error('PDF export failed');
    }
  };

  return (
    <div className="space-y-10 pb-20 max-w-7xl mx-auto">
      {/* Strategic Header */}
      <div className="bg-slate-900 rounded-[32px] p-8 text-white relative overflow-hidden shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-6 border border-slate-800">
        <div className="absolute top-0 right-0 w-1/3 h-full bg-gradient-to-l from-indigo-500/10 to-transparent pointer-events-none" />
        <div className="relative z-10">
          <div className="flex items-center gap-4 mb-5">
            <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20">
              <Network size={26} className="text-indigo-400" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight leading-none uppercase">Strategic Reports</h1>
              <p className="text-[10px] font-black text-indigo-400/60 mt-2 uppercase tracking-[0.2em]">LogiFlow Velocity Dashboard</p>
            </div>
          </div>
          <p className="max-w-xl text-indigo-100/70 text-[14px] font-semibold leading-relaxed">
            Generate orbital-level operational manifests, risk assessments, and cost impact analyzes powered by Gemini Intelligence and real-time network telemetry.
          </p>
        </div>
        
        <div className="flex items-center gap-8 md:border-l md:border-white/10 md:pl-8">
           <div className="text-center">
              <div className="text-3xl font-black">{shipments.length}</div>
              <div className="text-[10px] font-black text-indigo-400/50 uppercase tracking-widest mt-1.5">Nodes Scanned</div>
           </div>
           <div className="text-center">
              <div className="text-3xl font-black text-emerald-400">SYNC</div>
              <div className="text-[10px] font-black text-indigo-400/50 uppercase tracking-widest mt-1.5">Direct Link</div>
           </div>
        </div>
      </div>

      {/* Modern Card Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {REPORT_TYPES.map(card => {
          const Icon = card.icon;
          const isSelected = report?.id === card.id;
          return (
            <div 
              key={card.id} 
              onClick={() => !generating && generateReport(card)}
              className={`group relative bg-white border rounded-[2rem] p-7 cursor-pointer transition-all duration-500 overflow-hidden ${
                isSelected ? 'ring-2 ring-primary border-transparent' : 'hover:border-slate-300 hover:shadow-xl hover:shadow-blue-900/5'
              }`}
            >
              <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-transparent to-slate-50 rounded-full translate-x-1/2 -translate-y-1/2 transition-transform duration-1000 group-hover:scale-150`} />
              
              <div className="relative z-10">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 transition-all duration-500 group-hover:scale-110 shadow-sm border ${card.color}`}>
                  <Icon size={24} />
                </div>
                
                <div className="space-y-2 mb-6">
                  <h3 className="font-black text-slate-800 text-lg leading-tight group-hover:text-primary transition-colors">{card.title}</h3>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-slate-100 text-[9px] font-black text-slate-500 uppercase tracking-widest rounded-full">{card.frequency}</span>
                    {card.id === 'ai_risk' && <span className="flex items-center gap-1 text-[9px] font-black text-amber-600 uppercase tracking-widest"><Sparkles size={10}/> Priority</span>}
                  </div>
                </div>

                <p className="text-xs font-semibold text-slate-400 leading-relaxed mb-6 group-hover:text-slate-500 transition-colors">{card.description}</p>
                
                <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                  <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest group-hover:text-primary group-hover:translate-x-1 transition-all">Generate &rarr;</span>
                  {generating === card.id && <Loader2 size={16} className="animate-spin text-primary" />}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Enterprise Report Viewer */}
      <AnimatePresence>
        {report && (
            <motion.div 
                initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
                className="bg-white border border-slate-100 rounded-[2.5rem] shadow-2xl shadow-slate-900/5 overflow-hidden"
            >
                {/* Viewer Header */}
                <div className="p-10 border-b border-slate-50 bg-gradient-to-r from-slate-900 to-slate-800 text-white relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-10 opacity-10"><FileText size={160}/></div>
                    <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
                        <div>
                            <div className="flex items-center gap-3 mb-4">
                                <span className="px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-[10px] font-black tracking-[0.2em] uppercase">Executive Intelligence</span>
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            </div>
                            <h2 className="text-3xl font-black tracking-tight leading-none mb-3">{report.title}</h2>
                            <p className="text-slate-400 font-bold text-sm tracking-wide">
                                Generated {format(report.generatedAt, 'EEEE, dd MMMM yyyy • HH:mm')}
                            </p>
                        </div>
                        <div className="flex gap-4">
                            <button onClick={downloadPDF} className="group flex items-center gap-3 px-8 py-4 bg-white text-slate-900 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-slate-50 transition-all active:scale-95 shadow-xl">
                                <Download size={14} className="group-hover:translate-y-0.5 transition-transform" /> Export PDF
                            </button>
                        </div>
                    </div>
                </div>

                {/* KPI Strip */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 border-b border-slate-100">
                    {report.metrics.map(m => (
                        <div key={m.label} className="p-8 border-r border-slate-100 last:border-0 hover:bg-slate-50 transition-colors group">
                            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 group-hover:text-primary">{m.label}</div>
                            <div className="text-2xl font-black text-slate-800 tracking-tight">{m.value}</div>
                        </div>
                    ))}
                </div>

                {/* Section: AI Analysis */}
                {report.aiText && (
                    <div className="p-10 border-b border-slate-100 bg-slate-50/50">
                        <div className="flex items-center gap-3 mb-8">
                            <div className="w-10 h-10 rounded-2xl bg-primary text-white flex items-center justify-center shadow-lg shadow-blue-900/10">
                                <Sparkles size={20} />
                            </div>
                            <div>
                                <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest">Neural Assessment</h4>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mt-1">Gemini Pro Reasoning Engine</p>
                            </div>
                        </div>
                        <div className="prose prose-slate max-w-none">
                            <div className="bg-white border border-slate-200 rounded-3xl p-8 text-slate-600 font-medium leading-relaxed whitespace-pre-wrap shadow-sm text-sm">
                                {report.aiText}
                            </div>
                        </div>
                    </div>
                )}

                {/* Section: Weather Advisories */}
                {report.extraSections && report.extraSections.length > 0 && (
                    <div className="p-10 border-b border-slate-100">
                        <div className="flex items-center gap-3 mb-8">
                            <div className="w-10 h-10 rounded-2xl bg-cyan-600 text-white flex items-center justify-center shadow-lg">
                                <Cloud size={20} />
                            </div>
                            <div>
                                <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest">Atmospheric Impact</h4>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mt-1">Synoptic Route Analysis</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {report.extraSections.map(s => (
                                <div key={s.title} className="p-6 bg-cyan-50/50 border border-cyan-100 rounded-2xl">
                                    <div className="font-black text-cyan-800 text-xs mb-3 flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-cyan-500" />
                                        {s.title}
                                    </div>
                                    <p className="text-xs font-semibold text-cyan-700 leading-relaxed italic line-clamp-4">"{s.content}"</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Shipment Audit Trail */}
                <div className="p-10">
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-slate-100 flex items-center justify-center border border-slate-200">
                                <Activity size={20} className="text-slate-400" />
                            </div>
                            <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest">Detailed Audit Trail</h4>
                        </div>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 px-3 py-1.5 rounded-full border border-slate-100">
                            Viewing top 30 records
                        </span>
                    </div>

                    <div className="overflow-x-auto rounded-3xl border border-slate-100">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-slate-50/80 border-b border-slate-100">
                                    {['Mode', 'Code', 'Origin', 'Destination', 'Status', 'Risk Score'].map(h => (
                                        <th key={h} className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.14em]">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {report.tableRows.slice(0, 30).map(s => {
                                    const sc = statusConfig(s.status);
                                    return (
                                        <tr key={s.id} className="hover:bg-slate-50/30 transition-colors">
                                            <td className="px-6 py-4">{modeIcon(s.mode)}</td>
                                            <td className="px-6 py-4"><span className="text-xs font-black text-slate-800 font-mono">{s.shipment_code}</span></td>
                                            <td className="px-6 py-4 text-xs font-bold text-slate-600">{s.origin}</td>
                                            <td className="px-6 py-4 text-xs font-bold text-slate-600">{s.destination}</td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${sc.bg} ${sc.text}`}>
                                                    {sc.label}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-full h-1.5 bg-slate-100 rounded-full max-w-[60px] overflow-hidden">
                                                        <div className={`h-full rounded-full ${riskColor(s.risk_score).replace('text-', 'bg-')}`} style={{ width: `${s.risk_score}%` }} />
                                                    </div>
                                                    <span className={`text-[10px] font-black ${riskColor(s.risk_score)}`}>{s.risk_score}</span>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
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
