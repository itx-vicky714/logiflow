import React from 'react';
import Link from 'next/link';
import { ChevronRight, Globe, Zap, BarChart3, ArrowRight, PlayCircle, CheckCircle, Package, Shield, Activity, Truck } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-surface text-on-surface font-sans selection:bg-primary-fixed selection:text-on-primary-fixed overflow-x-hidden">
      
      {/* ── Navigation ── */}
      <nav className="fixed top-0 w-full z-[100] px-8 py-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-10 py-5 glass-panel border border-white rounded-[2.5rem] shadow-xl shadow-slate-200/50 animate-in slide-in-from-top duration-700">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-on-primary shadow-sm">
              <BarChart3 size={20} />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tighter text-on-surface leading-none">Precision</h1>
              <p className="text-[9px] uppercase tracking-[0.2em] text-on-surface-variant font-bold mt-1">Editorial Logistics</p>
            </div>
          </div>
          
          <div className="hidden lg:flex items-center gap-12">
            {['Platform', 'Intelligence', 'Fleet', 'Enterprise'].map(item => (
              <a key={item} href={`#${item.toLowerCase()}`} className="text-[11px] font-bold text-on-surface-variant hover:text-primary transition-all uppercase tracking-[0.2em]">{item}</a>
            ))}
          </div>

          <div className="flex items-center gap-4">
            <Link href="/login" className="px-8 py-3 bg-on-surface text-surface text-[12px] font-bold rounded-2xl hover:opacity-90 transition-all uppercase tracking-widest">
              Launch Deck
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero Section ── */}
      <section className="relative pt-64 pb-32">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[140%] aspect-square bg-gradient-to-b from-primary-fixed/30 via-transparent to-transparent rounded-full -translate-y-1/2 blur-[120px] opacity-50" />
        
        <div className="max-w-7xl mx-auto px-12 relative z-10 text-center">
          <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-white border border-slate-100 mb-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <span className="status-pulse bg-primary" />
            <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-[0.3em]">Operational Protocol v4.0.2</span>
          </div>
          
          <h1 className="text-display-lg mb-10 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-100">
            Flow with <br />
            <span className="text-primary italic">Neural</span> Precision.
          </h1>
          
          <p className="text-xl text-on-surface-variant font-medium leading-relaxed max-w-2xl mx-auto mb-14 animate-in fade-in slide-in-from-bottom-12 duration-1000 delay-200">
            LogiFlow is the standardized control tower for global supply chains. 
            We enable enterprise teams to maintain 100% manifest visibility through 
            deterministic intelligence and real-time fleet orchestration.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-6 animate-in fade-in slide-in-from-bottom-16 duration-1000 delay-300">
            <Link href="/login" className="btn-precision-primary">
              Start Deployment
            </Link>
            <button className="btn-precision-secondary flex items-center gap-3">
              <PlayCircle size={20} /> Watch Protocol
            </button>
          </div>
        </div>

        {/* Dashboard Preview */}
        <div className="mt-32 px-12 animate-in fade-in zoom-in-95 duration-1000 delay-500">
          <div className="max-w-6xl mx-auto rounded-[3.5rem] overflow-hidden border-[12px] border-white shadow-2xl aspect-[16/10] bg-surface-container-low relative">
            <div className="absolute inset-0 bg-gradient-to-tr from-primary/5 to-transparent p-16">
               <div className="flex gap-4">
                 <div className="w-16 h-2 rounded-full bg-primary/20" />
                 <div className="w-10 h-2 rounded-full bg-slate-200" />
                 <div className="w-24 h-2 rounded-full bg-slate-100" />
               </div>
               <div className="mt-32 space-y-8">
                 <div className="w-1/2 h-16 rounded-[2rem] bg-white border border-slate-100 curated-shadow" />
                 <div className="w-1/3 h-10 rounded-2xl bg-primary/10 border border-primary/20" />
               </div>
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
               <div className="w-28 h-28 rounded-full bg-white glass-panel flex items-center justify-center shadow-xl cursor-pointer hover:scale-110 transition-transform duration-500">
                  <ArrowRight size={32} className="text-primary" />
               </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Features Grid ── */}
      <section id="platform" className="py-48 bg-white">
        <div className="max-w-7xl mx-auto px-12">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
            {[
              { 
                icon: Shield, 
                title: 'Predictive Safety', 
                desc: 'Neural risk analysis detects anomalies before they impact your delivery window.'
              },
              { 
                icon: Zap, 
                title: 'Real-time Telemetry', 
                desc: 'Live orbital GPS tracking with millisecond latency across every node in your manifest.'
              },
              { 
                icon: BarChart3, 
                title: 'Executive Insights', 
                desc: 'Multi-dimensional analytics mapping cost efficiency and corridor health.'
              }
            ].map((f, i) => (
              <div key={i} className="group p-12 rounded-[3.5rem] bg-surface-container-low hover:bg-white border border-transparent hover:border-surface-container shadow-sm hover:floating-shadow transition-all duration-500">
                <div className="w-16 h-16 rounded-2xl bg-white border border-slate-100 flex items-center justify-center mb-10 group-hover:bg-primary group-hover:text-white transition-all duration-500 shadow-sm">
                  <f.icon size={24} />
                </div>
                <h3 className="text-2xl font-black mb-6 tracking-tight">{f.title}</h3>
                <p className="text-on-surface-variant font-medium leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Intelligence Section ── */}
      <section id="intelligence" className="py-48 bg-surface">
        <div className="max-w-7xl mx-auto px-12">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-24">
             <div className="flex-1">
                <p className="text-label-md text-primary mb-6">Deterministic Intelligence</p>
                <h2 className="text-headline-lg mb-10">AI-driven Risk Mitigation.</h2>
                <p className="text-lg text-on-surface-variant font-medium leading-relaxed mb-10">
                  Stop reacting to delays and start predicting them. Our neural models analyze atmospheric patterns, route congestion, and historical drift to calculate risk scores for every point in your manifest.
                </p>
                <div className="space-y-4">
                  {['Automated rerouting protocols', 'Predictive ETA adjustments', 'Anomaly detection clustering'].map((item, i) => (
                    <div key={i} className="flex items-center gap-4 font-bold text-on-surface">
                      <div className="w-6 h-6 rounded-full bg-primary-fixed text-primary flex items-center justify-center"><CheckCircle size={14}/></div>
                      {item}
                    </div>
                  ))}
                </div>
             </div>
             <div className="flex-1 w-full">
                <div className="bg-white rounded-[3.5rem] p-12 curated-shadow border border-slate-50 relative overflow-hidden">
                   <div className="absolute top-0 right-0 w-80 h-80 bg-primary/5 rounded-full blur-[80px]" />
                   <div className="relative space-y-6">
                      {[1, 2, 3].map(i => (
                         <div key={i} className="bg-surface-container-low rounded-2xl p-6 border border-white flex justify-between items-center">
                            <div className="w-1/2 h-4 bg-slate-200 rounded-full" />
                            <div className="w-16 h-8 bg-primary/10 rounded-xl" />
                         </div>
                      ))}
                   </div>
                </div>
             </div>
          </div>
        </div>
      </section>

      {/* ── Fleet Section ── */}
      <section id="fleet" className="py-48 bg-white">
        <div className="max-w-7xl mx-auto px-12">
          <div className="flex flex-col lg:flex-row-reverse items-center justify-between gap-24">
             <div className="flex-1">
                <p className="text-label-md text-primary mb-6">Operations Center</p>
                <h2 className="text-headline-lg mb-10">Autonomous Dispatch.</h2>
                <p className="text-lg text-on-surface-variant font-medium leading-relaxed mb-10">
                  Manage fleet units, dispatch corridors, and real-time operational constraints across thousands of concurrent shipments. Our automated allocation logic minimizes idle time and maximizes fuel efficiency.
                </p>
                <div className="grid grid-cols-2 gap-8">
                  <div className="p-8 bg-surface-container-low rounded-[2rem] border border-white shadow-sm">
                    <div className="text-4xl font-black mb-2">99.9%</div>
                    <div className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">Protocol Uptime</div>
                  </div>
                  <div className="p-8 bg-surface-container-low rounded-[2rem] border border-white shadow-sm">
                    <div className="text-4xl font-black mb-2">3.2x</div>
                    <div className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">Efficiency Multiplier</div>
                  </div>
                </div>
             </div>
             <div className="flex-1 w-full grid grid-cols-2 gap-6">
                {[1, 2, 3, 4].map(i => (
                   <div key={i} className={`h-48 rounded-[3rem] ${i%2===0 ? 'bg-primary-fixed/30 border-primary-fixed' : 'bg-surface-container-low border-slate-100'} border p-8`} />
                ))}
             </div>
          </div>
        </div>
      </section>

      {/* ── Enterprise Quote ── */}
      <section id="enterprise" className="py-64 bg-on-surface text-surface relative overflow-hidden">
        <div className="absolute bottom-0 right-0 w-1/2 h-full bg-gradient-to-l from-primary/10 to-transparent" />
        <div className="max-w-7xl mx-auto px-12 relative z-10">
          <div className="max-w-4xl">
             <Globe size={64} className="text-primary-fixed opacity-40 mb-16" />
             <blockquote className="text-5xl font-black italic tracking-tight leading-[1.1] mb-16">
               &ldquo;LogiFlow transformed our logistics from a cost center into a strategic competitive advantage. We now see the world through a single, intelligent pane of glass.&rdquo;
             </blockquote>
             <div className="flex items-center gap-8">
                <div className="w-20 h-20 rounded-full bg-surface-container-highest/20 border border-white/10" />
                <div>
                  <p className="font-black text-2xl tracking-tighter">Vikram Singh</p>
                  <p className="text-slate-500 font-bold uppercase tracking-[0.2em] text-[11px] mt-1">V.P. Global Logistics, Enterprise Group</p>
                </div>
             </div>
          </div>
        </div>
      </section>

      {/* ── CTA Footer ── */}
      <footer className="py-32 bg-surface">
        <div className="max-w-7xl mx-auto px-12 text-center">
          <h2 className="text-headline-lg mb-16">
            Ready to <span className="text-primary">Sync</span>?
          </h2>
          <div className="flex flex-col md:flex-row items-center justify-center gap-8 mb-32">
            <Link href="/login" className="btn-precision-primary px-16 py-6 text-base">
              Establish Protocol
            </Link>
            <button className="btn-precision-secondary px-16 py-6 text-base border border-slate-200">
              Inquire Sales
            </button>
          </div>
          
          <div className="flex flex-col lg:flex-row items-center justify-between pt-16 border-t border-slate-200 gap-12">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-on-primary">
                <BarChart3 size={16} />
              </div>
              <span className="font-black text-lg tracking-tighter">Precision</span>
            </div>
            <p className="text-[11px] font-bold text-on-surface-variant uppercase tracking-[0.3em]">&copy; 2026 LOGIFLOW SYSTEMS INC. ALL RIGHTS RESERVED.</p>
            <div className="flex gap-10 text-[11px] font-bold text-on-surface-variant uppercase tracking-widest">
               <a href="#" className="hover:text-primary">Privacy</a>
               <a href="#" className="hover:text-primary">Compliance</a>
               <a href="#" className="hover:text-primary">Terminal Status</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
