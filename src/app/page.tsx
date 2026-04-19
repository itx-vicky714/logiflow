'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Truck, 
  Map as MapIcon, 
  Bell, 
  BarChart3, 
  ArrowRight, 
  Menu, 
  X, 
  Clock, 
  ShieldCheck, 
  Target, 
  Eye, 
  Zap, 
  TowerControl, 
  CloudRain, 
  Bot, 
  LayoutDashboard,
  CheckCircle2,
  Building2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// --- Components ---

const FadeIn = ({ children, delay = 0, direction = 'up' }: { children: React.ReactNode, delay?: number, direction?: 'up' | 'down' | 'left' | 'right' | 'none' }) => {
  const directions = {
    up: { y: 20, x: 0 },
    down: { y: -20, x: 0 },
    left: { x: 20, y: 0 },
    right: { x: -20, y: 0 },
    none: { x: 0, y: 0 }
  };

  return (
    <motion.div
      initial={{ opacity: 0, ...directions[direction] }}
      whileInView={{ opacity: 1, x: 0, y: 0 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration: 0.6, delay, ease: [0.21, 0.47, 0.32, 0.98] }}
    >
      {children}
    </motion.div>
  );
};

// --- Mockups ---

const DashboardCardMockup = () => (
  <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4 w-full max-w-[240px] animate-pulse">
    <div className="flex justify-between items-center mb-4">
      <div className="h-4 w-20 bg-slate-100 rounded" />
      <div className="h-6 w-12 bg-indigo-50 rounded-full" />
    </div>
    <div className="grid grid-cols-2 gap-4">
      <div>
        <div className="h-3 w-12 bg-slate-50 mb-1" />
        <div className="h-6 w-16 bg-slate-100 rounded" />
      </div>
      <div>
        <div className="h-3 w-12 bg-slate-50 mb-1" />
        <div className="h-6 w-16 bg-slate-100 rounded" />
      </div>
    </div>
  </div>
);

const AlertMockup = () => (
  <div className="bg-white rounded-xl shadow-lg border-l-4 border-amber-500 p-4 w-full max-w-[280px] flex gap-3 items-start">
    <div className="p-2 bg-amber-50 rounded-lg text-amber-600 shrink-0">
      <Bell size={18} />
    </div>
    <div>
      <div className="text-xs font-bold text-slate-900">Delay detected</div>
      <div className="text-[10px] text-slate-500 mt-0.5">Mumbai → Delhi (NH-48)</div>
      <div className="mt-2 text-[10px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full inline-block">Heavy Traffic</div>
    </div>
  </div>
);

const AIChatMockup = () => (
  <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-4 w-full max-w-[260px] space-y-3">
    <div className="flex gap-2 justify-end">
      <div className="bg-slate-100 text-slate-700 text-[10px] p-2 rounded-2xl rounded-tr-none max-w-[80%]">
        What&apos;s the risk score for Mumbai route?
      </div>
    </div>
    <div className="flex gap-2">
      <div className="w-6 h-6 bg-indigo-600 rounded-full flex items-center justify-center text-white shrink-0">
        <Bot size={14} />
      </div>
      <div className="bg-indigo-50 text-indigo-900 text-[10px] p-2 rounded-2xl rounded-tl-none max-w-[90%] font-medium">
        Risk score: 72 — suggest reroute via NH-48 to avoid weather delay.
      </div>
    </div>
  </div>
);

const IndiaMapMockup = () => (
  <div className="relative w-full aspect-square bg-slate-50 rounded-2xl overflow-hidden border border-slate-100">
    <svg viewBox="0 0 200 200" className="w-full h-full opacity-20">
      <path d="M100 20 L120 40 L140 30 L160 50 L150 80 L170 110 L160 140 L140 160 L100 180 L60 160 L40 140 L30 110 L50 80 L40 50 L60 30 L80 40 Z" fill="currentColor" className="text-indigo-600" />
    </svg>
    <div className="absolute inset-0 p-4">
      {/* Route lines */}
      <svg viewBox="0 0 200 200" className="w-full h-full">
        <path d="M70 120 Q 90 90 120 60" fill="none" stroke="#4F46E5" strokeWidth="2" strokeDasharray="4 2" />
        <circle cx="70" cy="120" r="4" fill="#4F46E5" />
        <circle cx="120" cy="60" r="4" fill="#10B981" />
        
        <path d="M80 140 Q 110 130 140 100" fill="none" stroke="#F59E0B" strokeWidth="2" strokeDasharray="4 2" />
        <circle cx="80" cy="140" r="4" fill="#F59E0B" />
        <circle cx="140" cy="100" r="4" fill="#10B981" />
      </svg>
    </div>
  </div>
);

export default function LandingPage() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('Dashboard');

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans selection:bg-indigo-100 selection:text-indigo-900">
      {/* 1. HEADER */}
      <nav className={`fixed top-0 w-full z-50 transition-all duration-300 ${isScrolled ? 'bg-white/80 backdrop-blur-md border-b border-slate-100 py-3' : 'bg-transparent py-5'}`}>
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-9 h-9 bg-indigo-600 rounded-lg flex items-center justify-center text-white shadow-lg shadow-indigo-200 group-hover:scale-105 transition-transform">
              <Truck size={20} />
            </div>
            <span className="text-xl font-bold tracking-tight text-slate-900">Logi<span className="text-indigo-600">Flow</span></span>
          </Link>

          <div className="hidden md:flex items-center gap-8">
            {['Features', 'Use Cases', 'How It Works'].map((item) => (
              <a 
                key={item} 
                href={`#${item.toLowerCase().replace(/\s+/g, '-')}`} 
                className="text-sm font-medium text-slate-600 hover:text-indigo-600 transition-colors"
              >
                {item}
              </a>
            ))}
            <Link href="/login" className="text-sm font-medium text-slate-600 hover:text-indigo-600 transition-colors">
              Login
            </Link>
            <Link 
              href="/login" 
              className="px-5 py-2.5 bg-indigo-600 text-white text-sm font-bold rounded-full hover:bg-indigo-700 transition-all shadow-md shadow-indigo-100 hover:shadow-lg hover:shadow-indigo-200"
            >
              Launch Dashboard
            </Link>
          </div>

          <button className="md:hidden p-2 text-slate-600" onClick={() => setMobileMenuOpen(true)}>
            <Menu size={24} />
          </button>
        </div>
      </nav>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, x: '100%' }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: '100%' }}
            className="fixed inset-0 z-[60] bg-white flex flex-col p-6"
          >
            <div className="flex justify-between items-center mb-10">
              <span className="text-xl font-bold">LogiFlow</span>
              <button onClick={() => setMobileMenuOpen(false)} className="p-2 text-slate-600">
                <X size={24} />
              </button>
            </div>
            <div className="flex flex-col gap-6 text-lg font-medium">
              {['Features', 'Use Cases', 'How It Works'].map((item) => (
                <a 
                  key={item} 
                  href={`#${item.toLowerCase().replace(/\s+/g, '-')}`} 
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-slate-900 border-b border-slate-100 pb-2"
                >
                  {item}
                </a>
              ))}
              <Link href="/login" onClick={() => setMobileMenuOpen(false)} className="text-slate-900 border-b border-slate-100 pb-2">
                Login
              </Link>
              <Link href="/login" onClick={() => setMobileMenuOpen(false)} className="px-6 py-4 bg-indigo-600 text-white text-center rounded-xl font-bold">
                Launch Dashboard
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. HERO SECTION */}
      <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full pointer-events-none">
          <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-indigo-50/50 rounded-full blur-[120px]" />
          <div className="absolute bottom-[20%] right-[-10%] w-[40%] h-[40%] bg-emerald-50/30 rounded-full blur-[100px]" />
        </div>

        <div className="max-w-7xl mx-auto px-6 relative z-10 flex flex-col lg:flex-row items-center gap-16">
          <div className="flex-1 text-center lg:text-left">
            <FadeIn direction="up">
              <span className="inline-block px-4 py-1.5 bg-indigo-50 text-indigo-700 text-xs font-bold rounded-full mb-6 tracking-wide">
                NEXT-GEN LOGISTICS CONTROL TOWER
              </span>
              <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold text-slate-900 leading-[1.1] tracking-tight mb-8">
                Control Every Shipment. <br className="hidden md:block" /> 
                <span className="text-indigo-600">From One Place.</span>
              </h1>
              <p className="text-lg md:text-xl text-slate-600 mb-10 leading-relaxed max-w-2xl mx-auto lg:mx-0">
                LogiFlow gives your logistics team live visibility across road, rail, air, and sea — with AI-powered delay prediction, route risk alerts, weather monitoring, and real-time analytics.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
                <Link href="/login" className="w-full sm:w-auto px-8 py-4 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-100">
                  Start Free <ArrowRight size={18} />
                </Link>
                <a href="#how-it-works" className="w-full sm:w-auto px-8 py-4 bg-white text-slate-700 font-bold rounded-xl border border-slate-200 hover:bg-slate-50 transition-all flex items-center justify-center gap-2">
                  See How It Works
                </a>
              </div>
            </FadeIn>
          </div>

          <div className="flex-1 relative w-full max-w-xl">
            <FadeIn direction="none" delay={0.2}>
              <div className="relative aspect-square">
                {/* Background "Map" visual */}
                <div className="absolute inset-0 scale-110">
                  <IndiaMapMockup />
                </div>
                
                {/* Floating UI Elements */}
                <motion.div 
                  className="absolute top-[10%] -left-[5%] md:scale-100 scale-75"
                  animate={{ y: [0, -10, 0] }}
                  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                >
                  <DashboardCardMockup />
                </motion.div>

                <motion.div 
                  className="absolute bottom-[20%] -right-[5%] md:scale-100 scale-75 shadow-2xl"
                  animate={{ y: [0, 10, 0] }}
                  transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
                >
                  <AlertMockup />
                </motion.div>

                <motion.div 
                  className="absolute -bottom-[5%] left-[15%] md:scale-100 scale-75 shadow-2xl"
                  animate={{ y: [0, -5, 0] }}
                  transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                >
                  <AIChatMockup />
                </motion.div>
              </div>
            </FadeIn>
          </div>
        </div>

        {/* Trust Strip */}
        <div className="max-w-7xl mx-auto px-6 mt-32">
          <FadeIn direction="up">
            <div className="py-10 border-y border-slate-100 flex flex-col items-center gap-8">
              <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">
                Built for teams that move goods across India
              </p>
              <div className="flex flex-wrap justify-center gap-3 md:gap-6">
                {['🏥 Pharma', '🛒 FMCG', '🏭 Manufacturing', '🛍️ Retail', '📦 Distribution'].map((pill) => (
                  <span key={pill} className="px-5 py-2.5 bg-slate-50 border border-slate-100 rounded-full text-sm font-bold text-slate-700 hover:bg-white hover:shadow-sm transition-all cursor-default">
                    {pill}
                  </span>
                ))}
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-12 mt-4">
                {[
                  { icon: CheckCircle2, text: 'Live GPS Tracking' },
                  { icon: CheckCircle2, text: 'Smart Delay Alerts' },
                  { icon: CheckCircle2, text: 'Route Intelligence' },
                  { icon: CheckCircle2, text: 'AI Decision Support' }
                ].map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-indigo-600 font-bold text-sm">
                    <item.icon size={18} />
                    <span className="text-slate-700">{item.text}</span>
                  </div>
                ))}
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* 4. PROBLEM / VALUE SECTION */}
      <section className="py-24 bg-slate-50/50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <FadeIn direction="up">
              <h2 className="text-3xl md:text-5xl font-extrabold text-slate-900 mb-6 tracking-tight">
                Logistics problems that cost you every day
              </h2>
              <p className="text-lg text-slate-600">
                Outdated systems and fragmented data lead to inefficiencies. LogiFlow was built to bridge that gap.
              </p>
            </FadeIn>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                title: "No more blind shipments",
                icon: <Eye className="text-indigo-600" size={32} />,
                text: "You shouldn't find out about a delay after it happens. LogiFlow gives you live status on every shipment, always."
              },
              {
                title: "Detect delays before they happen",
                icon: <Zap className="text-amber-600" size={32} />,
                text: "Our AI monitors weather, traffic, and route conditions to flag risks 4-6 hours before they become problems."
              },
              {
                title: "Manage all risk from one place",
                icon: <Target className="text-indigo-600" size={32} />,
                text: "Stop juggling WhatsApp messages and Excel sheets. Every shipment, every risk, every action — in one screen."
              },
              {
                title: "Act faster with one control tower",
                icon: <TowerControl className="text-indigo-600" size={32} />,
                text: "Approve reroutes, email suppliers, assign drivers, and generate reports — without switching tools."
              }
            ].map((card, idx) => (
              <FadeIn key={idx} delay={idx * 0.1}>
                <div className="bg-white p-8 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all h-full flex flex-col items-start text-left">
                  <div className="mb-6">{card.icon}</div>
                  <h3 className="text-xl font-bold text-slate-900 mb-4">{card.title}</h3>
                  <p className="text-slate-600 leading-relaxed text-sm">
                    {card.text}
                  </p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* 5. FEATURE GRID */}
      <section id="features" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <FadeIn direction="up">
              <h2 className="text-3xl md:text-5xl font-extrabold text-slate-900 mb-6 tracking-tight">
                Everything your team needs to ship smarter
              </h2>
            </FadeIn>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                title: "Live Shipment Visibility",
                icon: <MapIcon />,
                text: "Track every shipment in real time on a live India map. Road, rail, air, and sea — all in one view."
              },
              {
                title: "Smart Delay Alerts",
                icon: <Bell />,
                text: "Get instant notifications when a shipment is at risk. Email and in-app alerts so nothing slips through."
              },
              {
                title: "Weather & Route Intelligence",
                icon: <CloudRain />,
                text: "Weather-aware risk scoring for every active route. Know which corridors to avoid before you book."
              },
              {
                title: "Analytics & Reports",
                icon: <BarChart3 />,
                text: "On-time rates, revenue forecasts, disruption trends, and route leaderboards — all calculated automatically."
              },
              {
                title: "AI Logistics Assistant",
                icon: <Bot />,
                text: "Ask LogiBot anything. Delayed shipments, risk summaries, route suggestions — instant answers, no manual lookup."
              }
            ].map((feat, idx) => (
              <FadeIn key={idx} delay={idx * 0.1}>
                <div className="p-8 rounded-2xl border border-slate-100 bg-white hover:border-indigo-100 hover:shadow-lg hover:shadow-indigo-50/50 transition-all">
                  <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center mb-6">
                    {feat.icon}
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-3">{feat.title}</h3>
                  <p className="text-slate-600 text-sm leading-relaxed">{feat.text}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* 6. HOW IT WORKS */}
      <section id="how-it-works" className="py-24 bg-slate-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-20">
            <FadeIn direction="up">
              <h2 className="text-3xl md:text-5xl font-extrabold text-slate-900 mb-6 tracking-tight">
                Up and running in minutes
              </h2>
            </FadeIn>
          </div>

          <div className="relative">
            {/* Connecting line (Desktop) */}
            <div className="hidden lg:block absolute top-[2.5rem] left-[10%] right-[10%] h-0.5 border-t-2 border-dashed border-indigo-200" />
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 text-center">
              {[
                { step: 1, title: "Connect Your Shipments", text: "Add shipments via our form or bulk upload. Assign transport mode, origin, destination." },
                { step: 2, title: "Monitor Every Movement", text: "Live map updates show position, progress, ETA, and current risk score." },
                { step: 3, title: "Detect Risk Early", text: "AI flags weather delays, congestion, and high-risk routes automatically." },
                { step: 4, title: "Take Action Instantly", text: "Approve reroutes, notify suppliers, download reports — all from one screen." }
              ].map((item, idx) => (
                <FadeIn key={idx} delay={idx * 0.1}>
                  <div className="relative z-10">
                    <div className="w-20 h-20 bg-indigo-600 text-white text-2xl font-black rounded-full flex items-center justify-center mx-auto mb-8 shadow-xl shadow-indigo-100 border-8 border-white">
                      {item.step}
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 mb-4">{item.title}</h3>
                    <p className="text-slate-600 text-sm leading-relaxed">{item.text}</p>
                  </div>
                </FadeIn>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 7. PRODUCT SHOWCASE */}
      <section className="py-24 bg-white overflow-hidden">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <FadeIn direction="up">
              <h2 className="text-3xl md:text-5xl font-extrabold text-slate-900 mb-6 tracking-tight">
                See LogiFlow in action
              </h2>
              <div className="flex flex-wrap justify-center gap-2 mt-8">
                {['Dashboard', 'Live Map', 'Alerts', 'Analytics', 'AI Assistant'].map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-6 py-2 rounded-full text-sm font-bold transition-all ${activeTab === tab ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </FadeIn>
          </div>

          <FadeIn direction="none">
            <div className="bg-slate-50 rounded-[2rem] p-4 md:p-8 border border-slate-100 shadow-2xl max-w-5xl mx-auto aspect-[16/10] flex items-center justify-center relative">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.4 }}
                  className="w-full h-full flex items-center justify-center"
                >
                  {activeTab === 'Dashboard' && (
                    <div className="w-full h-full flex flex-col gap-6 p-6">
                      <div className="grid grid-cols-4 gap-4 shrink-0">
                        {[1, 2, 3, 4].map(i => <div key={i} className="h-24 bg-white rounded-xl border border-slate-100 shadow-sm animate-pulse" />)}
                      </div>
                      <div className="flex-1 bg-white rounded-2xl border border-slate-100 shadow-sm p-8">
                         <div className="flex items-end gap-3 h-full">
                           {[40, 70, 45, 90, 65, 80, 50, 60, 30, 85].map((h, i) => (
                             <div key={i} className="flex-1 bg-indigo-50/50 rounded-t-lg relative group">
                                <motion.div initial={{ height: 0 }} animate={{ height: `${h}%` }} className="bg-indigo-600/80 rounded-t-lg absolute bottom-0 left-0 right-0" />
                             </div>
                           ))}
                         </div>
                      </div>
                    </div>
                  )}
                  {activeTab === 'Live Map' && (
                    <div className="w-full h-full p-4 relative">
                       <IndiaMapMockup />
                       <div className="absolute top-10 right-10 flex flex-col gap-2">
                          <div className="bg-white p-3 rounded-lg shadow-xl border border-slate-100 flex items-center gap-3">
                             <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse" />
                             <span className="text-xs font-bold">Delhi Express Line</span>
                          </div>
                          <div className="bg-white p-3 rounded-lg shadow-xl border border-slate-100 flex items-center gap-3">
                             <div className="w-3 h-3 bg-amber-500 rounded-full" />
                             <span className="text-xs font-bold">Mumbai Corridor</span>
                          </div>
                       </div>
                    </div>
                  )}
                  {activeTab === 'Alerts' && (
                    <div className="w-full h-full flex flex-col gap-4 p-10 max-w-xl">
                       <AlertMockup />
                       <div className="bg-white rounded-xl shadow-lg border-l-4 border-emerald-500 p-4 w-full flex gap-3 items-start translate-x-12">
                         <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600 shrink-0">
                           <CheckCircle2 size={18} />
                         </div>
                         <div>
                           <div className="text-xs font-bold text-slate-900">Arrived at hub</div>
                           <div className="text-[10px] text-slate-500 mt-0.5">Ahmedabad Logistics Hub</div>
                         </div>
                       </div>
                       <div className="bg-white rounded-xl shadow-lg border-l-4 border-indigo-500 p-4 w-full flex gap-3 items-start">
                         <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600 shrink-0">
                           <Truck size={18} />
                         </div>
                         <div>
                           <div className="text-xs font-bold text-slate-900">Shipment Out for Delivery</div>
                           <div className="text-[10px] text-slate-500 mt-0.5">Kolkata Regional Center</div>
                         </div>
                       </div>
                    </div>
                  )}
                  {activeTab === 'Analytics' && (
                    <div className="w-full h-full grid grid-cols-2 gap-8 p-12">
                       <div className="bg-white rounded-2xl shadow-sm border border-slate-100 flex items-center justify-center relative">
                          <div className="w-32 h-32 rounded-full border-[12px] border-slate-50 relative">
                             <svg className="w-full h-full -rotate-90">
                                <circle cx="64" cy="64" r="58" fill="transparent" stroke="#4F46E5" strokeWidth="12" strokeDasharray="364" strokeDashoffset="90" />
                             </svg>
                             <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className="text-2xl font-black">94%</span>
                                <span className="text-[10px] text-slate-400 font-bold">On Time</span>
                             </div>
                          </div>
                       </div>
                       <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 flex flex-col justify-between">
                          <div className="h-4 w-32 bg-slate-50 rounded mb-4" />
                          <div className="flex-1 flex items-center gap-1">
                             {[30, 50, 40, 60, 80, 70, 90].map((v, i) => (
                               <div key={i} className="flex-1 bg-indigo-600/10 rounded-full relative" style={{ height: '80%' }}>
                                  <motion.div 
                                    initial={{ height: 0 }} 
                                    animate={{ height: `${v}%` }} 
                                    className="bg-indigo-600 rounded-full absolute bottom-0 left-0 right-0" 
                                  />
                               </div>
                             ))}
                          </div>
                       </div>
                    </div>
                  )}
                  {activeTab === 'AI Assistant' && (
                    <div className="w-full max-w-md h-full py-12 flex flex-col">
                       <AIChatMockup />
                       <div className="mt-8 translate-x-12">
                          <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-4 space-y-3">
                             <div className="flex gap-2 justify-end">
                               <div className="bg-slate-100 text-slate-700 text-[10px] p-2 rounded-2xl rounded-tr-none">
                                 Generate delay report for yesterday.
                               </div>
                             </div>
                             <div className="flex gap-2">
                               <div className="w-6 h-6 bg-indigo-600 rounded-full flex items-center justify-center text-white shrink-0">
                                 <Bot size={14} />
                               </div>
                               <div className="bg-indigo-50 text-indigo-900 text-[10px] p-2 rounded-2xl rounded-tl-none font-medium">
                                 Report generated. 4 shipments were delayed due to heavy rain in Bangalore. <span className="text-indigo-600 underline cursor-pointer">Download CSV</span>
                               </div>
                             </div>
                          </div>
                       </div>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* 8. WHO IT'S FOR */}
      <section id="use-cases" className="py-24 bg-slate-50/50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <FadeIn direction="up">
              <h2 className="text-3xl md:text-5xl font-extrabold text-slate-900 mb-6 tracking-tight">
                Designed for the people who keep goods moving
              </h2>
            </FadeIn>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                title: "Operations Managers",
                icon: <LayoutDashboard size={24} className="text-indigo-600" />,
                text: "Get complete visibility without chasing your team for updates."
              },
              {
                title: "Dispatch Teams",
                icon: <Truck size={24} className="text-indigo-600" />,
                text: "Know exactly where every truck, train, and flight is — right now."
              },
              {
                title: "Supply Chain Leads",
                icon: <BarChart3 size={24} className="text-indigo-600" />,
                text: "Make data-driven decisions with live analytics and AI forecasts."
              },
              {
                title: "Logistics SMEs & Startups",
                icon: <Building2 size={24} className="text-indigo-600" />,
                text: "Enterprise-grade control tower at a fraction of the cost."
              }
            ].map((persona, idx) => (
              <FadeIn key={idx} delay={idx * 0.1}>
                <div className="bg-white p-8 rounded-2xl border border-slate-100 shadow-sm flex flex-col h-full hover:scale-[1.02] transition-transform">
                  <div className="w-12 h-12 bg-indigo-50 border border-indigo-100 rounded-xl flex items-center justify-center mb-6">
                    {persona.icon}
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 mb-3">{persona.title}</h3>
                  <p className="text-slate-600 text-sm leading-relaxed">{persona.text}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* 9. FINAL CTA SECTION */}
      <section className="py-24 px-6">
        <FadeIn direction="up">
          <div className="max-w-7xl mx-auto bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-[3rem] p-10 md:p-20 text-center text-white relative overflow-hidden shadow-2xl shadow-indigo-200">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-400/10 rounded-full translate-y-1/2 -translate-x-1/2 blur-3xl" />
            
            <h2 className="text-3xl md:text-6xl font-extrabold mb-8 tracking-tight">
              Bring your entire logistics operation into one place
            </h2>
            <p className="text-lg md:text-xl text-indigo-100 mb-12 max-w-3xl mx-auto">
              Join teams across India already using LogiFlow to track smarter, respond faster, and ship with confidence.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
              <Link href="/login" className="px-10 py-5 bg-white text-indigo-600 font-bold rounded-xl hover:bg-indigo-50 transition-all shadow-xl shadow-indigo-900/20 text-lg">
                Get Started Free →
              </Link>
              <Link href="/login" className="text-white font-bold hover:text-indigo-200 transition-colors flex items-center gap-2">
                Already have an account? Login →
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 mt-16 pt-16 border-t border-white/10">
               {[
                 { text: 'Free to start', icon: <CheckCircle2 size={18} /> },
                 { text: 'No credit card needed', icon: <ShieldCheck size={18} /> },
                 { text: 'Setup in 5 minutes', icon: <Clock size={18} /> }
               ].map((item, idx) => (
                 <div key={idx} className="flex items-center justify-center gap-2 text-indigo-100 font-medium">
                    {item.icon}
                    <span>{item.text}</span>
                 </div>
               ))}
            </div>
          </div>
        </FadeIn>
      </section>

      {/* 10. FOOTER */}
      <footer className="bg-white border-t border-slate-100 pt-20 pb-10">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-12 gap-10 md:gap-16 mb-20">
            <div className="col-span-2 md:col-span-4">
              <Link href="/" className="flex items-center gap-2 mb-6">
                <div className="w-8 h-8 bg-indigo-600 rounded flex items-center justify-center text-white">
                  <Truck size={18} />
                </div>
                <span className="text-xl font-bold tracking-tight">LogiFlow</span>
              </Link>
              <p className="text-slate-500 text-sm leading-relaxed max-w-xs">
                AI-powered logistics control tower for shipment visibility, delay prediction, and operational decision-making.
              </p>
            </div>
            
            <div className="col-span-1 md:col-span-2">
              <h4 className="font-bold text-slate-900 mb-6">Features</h4>
              <ul className="space-y-4 text-sm text-slate-500">
                <li><a href="#" className="hover:text-indigo-600 transition-colors">Tracking</a></li>
                <li><a href="#" className="hover:text-indigo-600 transition-colors">Alerts</a></li>
                <li><a href="#" className="hover:text-indigo-600 transition-colors">Analytics</a></li>
                <li><a href="#" className="hover:text-indigo-600 transition-colors">AI Assistant</a></li>
                <li><a href="#" className="hover:text-indigo-600 transition-colors">Reports</a></li>
                <li><a href="#" className="hover:text-indigo-600 transition-colors">Live Map</a></li>
              </ul>
            </div>

            <div className="col-span-1 md:col-span-2">
              <h4 className="font-bold text-slate-900 mb-6">Use Cases</h4>
              <ul className="space-y-4 text-sm text-slate-500">
                <li><a href="#" className="hover:text-indigo-600 transition-colors">Pharma</a></li>
                <li><a href="#" className="hover:text-indigo-600 transition-colors">FMCG</a></li>
                <li><a href="#" className="hover:text-indigo-600 transition-colors">Manufacturing</a></li>
                <li><a href="#" className="hover:text-indigo-600 transition-colors">Retail</a></li>
                <li><a href="#" className="hover:text-indigo-600 transition-colors">Distribution</a></li>
              </ul>
            </div>

            <div className="col-span-2 md:col-span-2">
              <h4 className="font-bold text-slate-900 mb-6">Legal</h4>
              <ul className="space-y-4 text-sm text-slate-500">
                <li><a href="#" className="hover:text-indigo-600 transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-indigo-600 transition-colors">Terms of Service</a></li>
                <li><a href="#" className="hover:text-indigo-600 transition-colors">Contact Us</a></li>
              </ul>
            </div>
          </div>

          <div className="pt-10 border-t border-slate-100 text-center text-xs text-slate-400 font-medium">
            <p className="mb-2">© 2026 LogiFlow. All rights reserved.</p>
            <p className="mb-2">Designed & Built by <span className="text-slate-900 font-bold">Vicky Kumar</span> — PGDM Student | Bihar</p>
            <p>All content, design, and code is original work. Unauthorized reproduction is prohibited.</p>
          </div>
        </div>
      </footer>
      
      {/* LogiFlow | Original work by Vicky Kumar, PGDM Student, Bihar | © 2026 */}
    </div>
  );
}
