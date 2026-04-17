import React from 'react';
import Link from 'next/link';
import { ChevronRight, Shield, Globe, Zap, BarChart3, Clock, Package, MapPin, ArrowRight, PlayCircle } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-indigo-100 selection:text-indigo-900">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-[100] px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-8 py-4 bg-white/70 backdrop-blur-xl border border-white/40 rounded-[2rem] shadow-xl shadow-slate-200/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-[1rem] flex items-center justify-center text-white shadow-lg shadow-indigo-200">
              <Globe size={20} />
            </div>
            <span className="text-xl font-black tracking-tight text-slate-900">Logi<span className="text-indigo-600">Flow</span></span>
          </div>
          
          <div className="hidden md:flex items-center gap-10">
            {['Platform', 'Intelligence', 'Fleet', 'Enterprise'].map(item => (
              <a key={item} href={`#${item.toLowerCase()}`} className="text-[13px] font-bold text-slate-500 hover:text-indigo-600 transition-colors uppercase tracking-widest">{item}</a>
            ))}
          </div>

          <div className="flex items-center gap-4">
            <Link href="/login" className="px-6 py-2.5 text-[13px] font-bold text-slate-600 hover:text-slate-900 transition-colors uppercase tracking-widest">
              Login
            </Link>
            <Link href="/dashboard" className="px-8 py-3 bg-slate-900 text-white text-[13px] font-black rounded-2xl hover:bg-slate-800 transition-all shadow-xl shadow-slate-200 uppercase tracking-widest active:scale-95">
              Launch Deck
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-48 pb-32 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[120%] aspect-square bg-gradient-to-b from-indigo-50/50 via-white to-transparent rounded-full -translate-y-1/2 blur-3xl opacity-60" />
        
        <div className="max-w-7xl mx-auto px-8 relative z-10">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-50 border border-indigo-100/50 mb-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
              <span className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em]">Next-Gen Logistics OS v3.0</span>
            </div>
            
            <h1 className="text-7xl md:text-8xl font-black text-slate-900 tracking-[-0.04em] leading-[0.95] mb-8 animate-in fade-in slide-in-from-bottom-6 duration-700 delay-100">
              Flow with <br />
              <span className="text-indigo-600 italic">Neural</span> Precision.
            </h1>
            
            <p className="text-xl text-slate-500 font-medium leading-relaxed mb-12 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-200">
              LogiFlow is the enterprise control tower for modern supply chains. 
              Real-time telemetry, AI-driven risk mitigation, and autonomous 
              fleet orchestration—all in one cinematic interface.
            </p>

            <div className="flex flex-wrap items-center gap-6 animate-in fade-in slide-in-from-bottom-10 duration-1000 delay-300">
              <Link href="/login" className="px-10 py-5 bg-indigo-600 text-white text-[14px] font-black rounded-[2rem] hover:bg-indigo-700 transition-all shadow-2xl shadow-indigo-100 flex items-center gap-3 uppercase tracking-widest active:scale-95">
                Start Deployment <ArrowRight size={18} />
              </Link>
              <button className="px-8 py-5 bg-white text-slate-900 border-2 border-slate-100 text-[14px] font-black rounded-[2rem] hover:bg-slate-50 transition-all flex items-center gap-3 uppercase tracking-widest active:scale-95">
                <PlayCircle size={20} className="text-indigo-600" /> Watch Demo
              </button>
            </div>
          </div>
        </div>

        {/* Dashboard Preview */}
        <div className="mt-32 relative px-8 animate-in fade-in zoom-in-95 duration-1000 delay-500">
          <div className="max-w-7xl mx-auto rounded-[3rem] overflow-hidden border-8 border-white shadow-[0_50px_100px_rgba(0,0,0,0.1)] aspect-[16/9] bg-slate-900 relative">
            <div className="absolute inset-0 bg-gradient-to-tr from-indigo-900/20 to-transparent p-12">
               {/* Decorative UI elements */}
               <div className="flex gap-4">
                 <div className="w-12 h-1.5 rounded-full bg-indigo-500/30" />
                 <div className="w-8 h-1.5 rounded-full bg-white/20" />
                 <div className="w-20 h-1.5 rounded-full bg-white/10" />
               </div>
               <div className="mt-24 space-y-6">
                 <div className="w-1/2 h-12 rounded-2xl bg-white/5 border border-white/10 blur-[1px]" />
                 <div className="w-1/3 h-8 rounded-xl bg-indigo-400/10 border border-indigo-400/20" />
               </div>
               <div className="absolute bottom-12 right-12 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl" />
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
               <div className="text-center group cursor-pointer">
                  <div className="w-24 h-24 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center group-hover:scale-110 transition-transform duration-500">
                    <PlayCircle size={40} className="text-white" />
                  </div>
                  <p className="text-white/40 text-[10px] font-black uppercase tracking-[0.3em] mt-6 group-hover:text-white transition-colors">Enter Preview Sandbox</p>
               </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="platform" className="py-32 bg-white">
        <div className="max-w-7xl mx-auto px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-24">
             <div className="max-w-2xl">
                <h2 className="text-[11px] font-black text-indigo-600 uppercase tracking-[0.3em] mb-4">Core Infrastructure</h2>
                <h3 className="text-5xl font-black text-slate-900 tracking-tight">Built for scale. <br />Engineered for reliability.</h3>
             </div>
             <p className="max-w-sm text-slate-500 font-medium leading-relaxed">
               LogiFlow combines legacy logistics data with next-gen neural models to create a truly predictive supply chain.
             </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { 
                icon: Shield, 
                title: 'Predictive Safety', 
                desc: 'Gemini-powered risk analysis detects anomalies before they impact your delivery window.',
                color: 'indigo'
              },
              { 
                icon: Zap, 
                title: 'Real-time Telemetry', 
                desc: 'Live orbital GPS tracking with millisecond latency across every node in your manifest.',
                color: 'blue'
              },
              { 
                icon: BarChart3, 
                title: 'Executive Insights', 
                desc: 'Multi-dimensional analytics mapping cost efficiency, delivery performance, and fleet health.',
                color: 'cyan'
              }
            ].map((f, i) => (
              <div key={i} className="p-12 rounded-[2.5rem] bg-slate-50 border border-slate-100 hover:border-indigo-200 transition-all hover:shadow-2xl hover:shadow-slate-100 group">
                <div className={`w-16 h-16 rounded-2xl bg-white border border-slate-100 flex items-center justify-center mb-10 shadow-sm group-hover:scale-110 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-500`}>
                  <f.icon size={24} />
                </div>
                <h4 className="text-2xl font-black text-slate-900 mb-6 tracking-tight">{f.title}</h4>
                <p className="text-slate-500 font-medium leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust Quote */}
      <section className="py-48 bg-slate-900 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-indigo-600/10 to-transparent" />
        <div className="max-w-7xl mx-auto px-8 relative z-10">
          <div className="max-w-3xl">
             <Globe size={48} className="text-indigo-400 mb-12 opacity-50" />
             <blockquote className="text-4xl md:text-5xl font-black italic tracking-tight leading-[1.1] mb-12">
               "LogiFlow transformed our logistics from a cost center into a strategic competitive advantage. We now see the world through a single, intelligent pane of glass."
             </blockquote>
             <div className="flex items-center gap-6">
                <div className="w-16 h-16 rounded-full bg-white/10" />
                <div>
                  <p className="font-black text-xl tracking-tight">Vikram Singh</p>
                  <p className="text-slate-500 font-bold uppercase tracking-widest text-[11px]">V.P. Global Logistics, Enterprise Group</p>
                </div>
             </div>
          </div>
        </div>
      </section>

      {/* CTA Footer */}
      <footer className="py-24 bg-white border-t border-slate-100">
        <div className="max-w-7xl mx-auto px-8 text-center">
          <h3 className="text-6xl md:text-7xl font-black text-slate-900 tracking-tight mb-12">
            Ready to <span className="text-indigo-600">Sync</span>?
          </h3>
          <div className="flex flex-col md:flex-row items-center justify-center gap-6 mb-24">
            <Link href="/login" className="w-full md:w-auto px-12 py-5 bg-slate-900 text-white text-[14px] font-black rounded-[2.5rem] hover:bg-black transition-all shadow-2xl shadow-slate-200 uppercase tracking-widest">
              Get Started Now
            </Link>
            <button className="w-full md:w-auto px-12 py-5 bg-white text-slate-900 border-2 border-slate-100 text-[14px] font-black rounded-[2.5rem] hover:bg-slate-50 transition-all uppercase tracking-widest">
              Talk to Sales
            </button>
          </div>
          
          <div className="flex flex-col md:flex-row items-center justify-between pt-12 border-t border-slate-50 gap-8">
            <div className="flex items-center gap-2 font-black text-slate-900">
              <Globe size={20} className="text-indigo-600" /> LogiFlow
            </div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.2em]">&copy; 2026 LOGIFLOW SYSTEMS INC. ALL RIGHTS RESERVED.</p>
            <div className="flex gap-8 text-[11px] font-bold text-slate-400 uppercase tracking-widest">
               <a href="#" className="hover:text-slate-900">Privacy</a>
               <a href="#" className="hover:text-slate-900">Compliance</a>
               <a href="#" className="hover:text-slate-900">Telemetry Status</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
