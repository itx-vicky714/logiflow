import React from 'react';
import Link from 'next/link';
import { ChevronRight, Globe, Zap, BarChart3, ArrowRight, PlayCircle, CheckCircle, Package, Shield, Activity, Truck, Search, Map, Bell, Smartphone } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-indigo-100 selection:text-indigo-900 overflow-x-hidden">
      
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-[100] px-6 py-6 transition-all">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-8 py-4 bg-white/80 backdrop-blur-lg border border-slate-200 rounded-[2rem] shadow-lg shadow-slate-200/40 animate-in slide-in-from-top duration-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-200">
              <Truck size={20} />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tighter text-slate-900 leading-none">LogiFlow</h1>
              <p className="text-[9px] uppercase tracking-[0.2em] text-indigo-600 font-black mt-1">Enterprise Logistics</p>
            </div>
          </div>
          
          <div className="hidden lg:flex items-center gap-10">
            {['Solutions', 'Features', 'Network', 'Pricing'].map(item => (
              <a key={item} href={`#${item.toLowerCase()}`} className="text-[11px] font-bold text-slate-500 hover:text-indigo-600 transition-all uppercase tracking-widest">{item}</a>
            ))}
          </div>

          <div className="flex items-center gap-4">
            <Link href="/login" className="px-8 py-3 bg-slate-900 text-white text-[12px] font-black rounded-2xl hover:bg-black transition-all uppercase tracking-widest shadow-xl">
              Log In
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-60 pb-32">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[120%] aspect-square bg-gradient-to-b from-indigo-100/50 via-transparent to-transparent rounded-full -translate-y-1/2 blur-[100px] opacity-60" />
        
        <div className="max-w-7xl mx-auto px-6 md:px-12 relative z-10 text-center">
          <div className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-indigo-50 border border-indigo-100 mb-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse" />
            <span className="text-[10px] font-black text-indigo-900 uppercase tracking-[0.3em]">Next Generation Logistics Platform</span>
          </div>
          
          <h1 className="text-5xl md:text-8xl font-black text-slate-900 mb-10 tracking-tighter leading-[0.9] animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-100">
            Shipping made <br />
            <span className="text-indigo-600 italic">Intelligent.</span>
          </h1>
          
          <p className="text-lg md:text-xl text-slate-500 font-bold leading-relaxed max-w-2xl mx-auto mb-14 animate-in fade-in slide-in-from-bottom-12 duration-1000 delay-200">
            Manage your entire supply chain with real-time tracking, AI-powered risk analysis, and automated vehicle dispatching. Built for modern B2B enterprises.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-6 animate-in fade-in slide-in-from-bottom-16 duration-1000 delay-300">
            <Link href="/login" className="px-12 py-6 bg-slate-900 text-white rounded-[2rem] text-[13px] font-black uppercase tracking-[0.2em] shadow-2xl shadow-indigo-200 hover:bg-black transition-all hover:scale-105 active:scale-95">
              Get Started for Free
            </Link>
            <button className="px-12 py-6 bg-white text-slate-700 border border-slate-200 rounded-[2rem] text-[13px] font-black uppercase tracking-[0.2em] flex items-center gap-3 hover:bg-slate-50 transition-all">
              <PlayCircle size={20} className="text-indigo-600" /> Watch Demo
            </button>
          </div>
        </div>

        {/* Mockup Preview */}
        <div className="mt-32 px-6 md:px-12 animate-in fade-in zoom-in-95 duration-1000 delay-500">
          <div className="max-w-6xl mx-auto rounded-[3rem] overflow-hidden border-[8px] md:border-[16px] border-white shadow-2xl aspect-[16/10] bg-slate-100 relative group">
             <div className="absolute inset-0 bg-gradient-to-tr from-indigo-600/10 to-transparent p-8 md:p-16">
                <div className="flex gap-4 mb-12">
                  <div className="w-20 h-3 rounded-full bg-indigo-600/20" />
                  <div className="w-12 h-3 rounded-full bg-slate-200" />
                  <div className="w-28 h-3 rounded-full bg-slate-100" />
                </div>
                <div className="grid grid-cols-2 gap-8 md:gap-12">
                   <div className="space-y-8">
                     <div className="h-32 rounded-3xl bg-white border border-slate-200 shadow-sm" />
                     <div className="h-48 rounded-3xl bg-white border border-slate-200 shadow-sm" />
                   </div>
                   <div className="space-y-8">
                     <div className="h-48 rounded-3xl bg-slate-900 shadow-xl" />
                     <div className="h-32 rounded-3xl bg-white border border-slate-200 shadow-sm" />
                   </div>
                </div>
             </div>
             <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-24 h-24 md:w-32 md:h-32 rounded-full bg-white/40 backdrop-blur-md flex items-center justify-center shadow-2xl cursor-pointer hover:scale-110 transition-transform duration-500 border border-white/50">
                   <ArrowRight size={40} className="text-indigo-600" />
                </div>
             </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-48 bg-white">
        <div className="max-w-7xl mx-auto px-6 md:px-12">
          <div className="text-center mb-24">
             <p className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.3em] mb-4">Enterprise Grade</p>
             <h2 className="text-4xl md:text-6xl font-black text-slate-800 tracking-tighter uppercase italic">Built for Scale</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 md:gap-12">
            {[
              { 
                icon: Shield, 
                title: 'Smart Risk Analysis', 
                desc: 'Our AI identifies potential delays and weather hazards before they affect your shipments.'
              },
              { 
                icon: Map, 
                title: 'Live Map Tracking', 
                desc: 'See exactly where your cargo is with real-time GPS synchronization and status updates.'
              },
              { 
                icon: BarChart3, 
                title: 'Detailed Analytics', 
                desc: 'Get deep insights into your logistics performance, on-time rates, and cost efficiency.'
              },
              { 
                icon: Zap, 
                title: 'Rapid Dispatch', 
                desc: 'Assign drivers and vehicles in seconds with our automated fleet management system.'
              },
              { 
                icon: Bell, 
                title: 'Instant Alerts', 
                desc: 'Receive critical updates via WhatsApp and SMS the moment a shipment reaches a hub.'
              },
              { 
                icon: Smartphone, 
                title: 'Mobile Companion', 
                desc: 'Manage your operations on the go with our fully responsive mobile dashboard.'
              }
            ].map((f, i) => (
              <div key={i} className="group p-10 md:p-12 rounded-[2.5rem] bg-slate-50 hover:bg-white border border-transparent hover:border-slate-100 transition-all duration-500 hover:shadow-xl">
                <div className="w-16 h-16 rounded-2xl bg-white border border-slate-200 flex items-center justify-center mb-10 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-500 shadow-sm">
                  <f.icon size={24} />
                </div>
                <h3 className="text-2xl font-black mb-6 tracking-tight text-slate-800 uppercase italic">{f.title}</h3>
                <p className="text-slate-500 font-bold leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Social Proof Section */}
      <section className="py-48 bg-slate-900 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-1/3 h-full bg-gradient-to-l from-indigo-600/10 to-transparent" />
        <div className="max-w-7xl mx-auto px-6 md:px-12 relative z-10">
          <div className="max-w-4xl">
             <div className="w-20 h-20 bg-indigo-600 rounded-3xl flex items-center justify-center mb-16 shadow-2xl">
                <Globe size={40} className="text-white" />
             </div>
             <blockquote className="text-4xl md:text-6xl font-black italic tracking-tighter leading-[1] mb-16">
               &ldquo;LogiFlow gave us a single, intelligent view of our entire world. It&apos;s no longer about where things are, but where they will be tomorrow.&rdquo;
             </blockquote>
             <div className="flex items-center gap-6">
                <div className="w-20 h-20 rounded-full bg-white/10 border border-white/20" />
                <div>
                  <p className="font-black text-2xl tracking-tighter">Vikram Mehta</p>
                  <p className="text-indigo-400 font-bold uppercase tracking-[0.2em] text-[11px] mt-1">VP of Global Logistics</p>
                </div>
             </div>
          </div>
        </div>
      </section>

      {/* CTA Footer */}
      <footer className="py-32 bg-white">
        <div className="max-w-7xl mx-auto px-6 md:px-12 text-center">
          <h2 className="text-5xl md:text-7xl font-black text-slate-800 mb-16 tracking-tighter uppercase italic">
            Ready to <span className="text-indigo-600">Grow</span>?
          </h2>
          <div className="flex flex-col md:flex-row items-center justify-center gap-8 mb-32">
            <Link href="/login" className="px-16 py-6 bg-indigo-600 text-white rounded-[2rem] text-[15px] font-black uppercase tracking-[0.2em] shadow-2xl shadow-indigo-200 hover:bg-indigo-700 transition-all hover:scale-105 active:scale-95">
              Get Started Now
            </Link>
            <button className="px-16 py-6 bg-white text-slate-700 border border-slate-200 rounded-[2rem] text-[15px] font-black uppercase tracking-[0.2em] flex items-center gap-3 hover:bg-slate-50 transition-all">
              Contact Sales
            </button>
          </div>
          
          <div className="flex flex-col lg:flex-row items-center justify-between pt-16 border-t border-slate-100 gap-12">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white">
                <Truck size={20} />
              </div>
              <span className="font-black text-xl tracking-tighter text-slate-800">LogiFlow</span>
            </div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.3em]">&copy; 2026 LOGIFLOW SYSTEMS INC. ALL RIGHTS RESERVED.</p>
            <div className="flex gap-10 text-[11px] font-bold text-slate-400 uppercase tracking-widest">
               <a href="#" className="hover:text-indigo-600 transition-colors">Privacy Policy</a>
               <a href="#" className="hover:text-indigo-600 transition-colors">Term of Service</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
