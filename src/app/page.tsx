'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { 
  Truck, 
  Bell,
  ArrowRight, 
  Menu, 
  X, 
  Eye, 
  Zap, 
  CloudRain, 
  Bot, 
  LayoutDashboard,
  History,
  Globe,
  Plus
} from 'lucide-react';
import { motion, AnimatePresence, useScroll, useSpring } from 'framer-motion';

// --- Types & Constants ---

const ACTIVITY_EVENTS = [
  { text: "✓ SHP-R042 delivered — Mumbai to Delhi — 14 Apr, 09:41", type: "delivered" },
  { text: "⚠ Weather alert on NH-48 — 3 shipments rerouted automatically", type: "alert" },
  { text: "🔔 SHP-A018 at risk — ETA pushed by 2h — Chennai corridor", type: "risk" },
  { text: "✓ SHP-L007 arrived Bangalore — On time — Tata Motors", type: "delivered" },
  { text: "📊 Route optimized — Pune to Hyderabad — saving 4 hours", type: "delivered" },
  { text: "✓ SHP-R089 cleared customs — Air freight — IndiGo Cargo", type: "delivered" },
];

const INDUSTRIES = [
  { icon: "🏥", label: "Pharma" },
  { icon: "🛒", label: "FMCG" },
  { icon: "🏭", label: "Manufacturing" },
  { icon: "🛍️", label: "Retail" },
  { icon: "📦", label: "Distribution" },
  { icon: "🚢", label: "Freight Forwarders" },
];

const CAPABILITIES = [
  "✓ Live GPS Tracking",
  "✓ AI Delay Prediction",
  "✓ Weather-Aware Routing",
  "✓ Multi-Modal Support",
  "✓ Instant Alerts",
];

const FAQS = [
  { q: "Is LogiFlow really free to start?", a: "Yes. The free plan supports up to 50 active shipments per month with full access to live tracking, the India map, alerts, and basic analytics. No credit card required." },
  { q: "How do I add shipments — do I need to integrate anything?", a: "No integration needed. You manually register shipments through a simple 4-field form — origin, destination, mode, cargo details. CSV bulk upload is available for larger teams." },
  { q: "Does it work for road, rail, air, and sea cargo?", a: "Yes. LogiFlow supports all four transport modes with mode-specific tracking, risk scoring, and weather impact monitoring." },
  { q: "What kind of alerts will my team receive?", a: "In-app notifications for delays, at-risk shipments, weather advisories, and ETA changes. Alerts include severity level, cause, and recommended action — not just a raw status change." },
  { q: "Is our shipment data private and secure?", a: "All data is encrypted with 256-bit SSL. Each account's data is isolated. We do not share or sell your shipment data. Servers are hosted on enterprise-grade infrastructure." },
  { q: "Can multiple people on my team use the same account?", a: "Yes. Multiple team members — operations managers, dispatch staff, and analysts — can log in and view the same live dashboard." },
  { q: "What if the AI prediction is wrong?", a: "Predictions are risk indicators, not guarantees. The AI flags conditions that historically cause delays — weather, congestion, port backlogs. Your team still makes the final call." },
  { q: "Who built LogiFlow?", a: "LogiFlow was designed and built by Vicky Kumar, a PGDM student from Bihar, as an original logistics intelligence platform. All design, code, and architecture is original work." },
];

// --- Custom Hooks ---

function useCountUp(end: number, duration: number = 2000, trigger: boolean) {
  const [count, setCount] = useState(0);
  const frameRef = useRef(0);
  const startTimeRef = useRef<number | null>(null);

  useEffect(() => {
    if (!trigger) return;

    const animate = (timestamp: number) => {
      if (!startTimeRef.current) startTimeRef.current = timestamp;
      const progress = timestamp - startTimeRef.current;
      const rate = Math.min(progress / duration, 1);
      
      // easeOutExpo
      const easedRate = rate === 1 ? 1 : 1 - Math.pow(2, -10 * rate);
      
      setCount(Math.floor(easedRate * end));

      if (rate < 1) {
        frameRef.current = requestAnimationFrame(animate);
      }
    };

    frameRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameRef.current);
  }, [end, duration, trigger]);

  return count;
}

// --- Components ---

const FadeIn = ({ children, delay = 0, className = "" }: { children: React.ReactNode, delay?: number, className?: string }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration: 0.55, delay: delay / 1000, ease: [0.16, 1, 0.3, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

const FloatingChip = ({ icon, label, value, color, delay, className, index = 0 }: { icon: string, label: string, value: string, color: string, delay: string, className: string, index?: number }) => {
  const animationType = index % 2 === 0 ? 'float-1' : 'float-2';
  const duration = 4 + (index % 3);

  return (
    <motion.div 
      className={`bg-white rounded-xl shadow-lg p-3 flex items-center gap-3 border border-slate-100 z-20 ${className}`}
      style={{ animation: `${animationType} ${duration}s ease infinite`, animationDelay: delay }}
    >
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-lg ${color}`}>
        {icon}
      </div>
      <div>
        <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">{label}</p>
        <p className="text-xs font-black text-slate-900">{value}</p>
      </div>
    </motion.div>
  );
};

const TiltCard = ({ children, className = "" }: { children: React.ReactNode, className?: string }) => {
  const [rotate, setRotate] = useState({ x: 0, y: 0 });
  const cardRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const rotateX = ((y - centerY) / centerY) * -6;
    const rotateY = ((x - centerX) / centerX) * 6;
    setRotate({ x: rotateX, y: rotateY });
  };

  const handleMouseLeave = () => setRotate({ x: 0, y: 0 });

  return (
    <div 
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`perspective-1000 transition-all duration-150 ease-out ${className}`}
      style={{ 
        transform: `rotateX(${rotate.x}deg) rotateY(${rotate.y}deg)`,
        transformStyle: 'preserve-3d'
      }}
    >
      {children}
    </div>
  );
};

const ActivityTicker = () => {
  return (
    <div className="bg-indigo-50 border-y border-indigo-100 py-2 overflow-hidden whitespace-nowrap relative z-30">
      <div className="flex animate-marquee hover:[animation-play-state:paused] w-max">
        {[...ACTIVITY_EVENTS, ...ACTIVITY_EVENTS].map((event, idx) => (
          <div key={idx} className="flex items-center mx-8 text-[13px] font-medium text-indigo-800">
            <div className={`w-2 h-2 rounded-full mr-3 ${
              event.type === 'delivered' ? 'bg-emerald-500' : 
              event.type === 'risk' ? 'bg-amber-500' : 'bg-rose-500'
            }`} />
            {event.text}
          </div>
        ))}
      </div>
    </div>
  );
};

const ROIByTheNumbers = () => {
  const [shipments, setShipments] = useState(50);
  const [avgValue, setAvgValue] = useState(75000);
  const [delayRate, setDelayRate] = useState(18);

  const monthlyLoss = Math.round(shipments * avgValue * (delayRate / 100) * 0.12);
  const savings = Math.round(monthlyLoss * 0.65);
  const reducedLoss = monthlyLoss - savings;

  const formatINR = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(val);
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-100 shadow-xl overflow-hidden grid md:grid-cols-2">
      <div className="p-8 lg:p-12 border-b md:border-b-0 md:border-r border-slate-100">
        <h3 className="text-xl font-bold mb-8 text-slate-900">Configure your operations</h3>
        
        <div className="space-y-10">
          <div>
            <div className="flex justify-between mb-4">
              <label className="text-sm font-bold text-slate-500">Shipments per month</label>
              <span className="text-indigo-600 font-black">{shipments}</span>
            </div>
            <input 
              type="range" min="10" max="500" value={shipments} 
              onChange={(e) => setShipments(parseInt(e.target.value))}
              className="w-full accent-indigo-600 cursor-pointer"
            />
          </div>

          <div>
            <div className="flex justify-between mb-4">
              <label className="text-sm font-bold text-slate-500">Average cargo value (₹)</label>
              <span className="text-indigo-600 font-black">{formatINR(avgValue)}</span>
            </div>
            <input 
              type="range" min="10000" max="500000" step="5000" value={avgValue} 
              onChange={(e) => setAvgValue(parseInt(e.target.value))}
              className="w-full accent-indigo-600 cursor-pointer"
            />
          </div>

          <div>
            <div className="flex justify-between mb-4">
              <label className="text-sm font-bold text-slate-500">Current delay rate</label>
              <span className="text-indigo-600 font-black">{delayRate}%</span>
            </div>
            <input 
              type="range" min="5" max="40" value={delayRate} 
              onChange={(e) => setDelayRate(parseInt(e.target.value))}
              className="w-full accent-indigo-600 cursor-pointer"
            />
          </div>
        </div>
      </div>

      <div className="p-8 lg:p-12 bg-slate-50 flex flex-col justify-center text-center">
        <div className="mb-8">
          <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-2">You currently lose approximately</p>
          <p className="text-4xl lg:text-5xl font-black text-rose-500">{formatINR(monthlyLoss)}<span className="text-lg font-bold">/mo</span></p>
        </div>

        <div className="mb-8">
          <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-2">LogiFlow reduces this to</p>
          <p className="text-4xl lg:text-5xl font-black text-emerald-500">{formatINR(reducedLoss)}<span className="text-lg font-bold">/mo</span></p>
        </div>

        <div className="bg-indigo-600 rounded-2xl p-6 text-white shadow-lg shadow-indigo-100">
          <p className="text-xs uppercase font-black tracking-[0.2em] text-indigo-200 mb-1">Estimated monthly savings</p>
          <p className="text-3xl font-black mb-4">{formatINR(savings)}</p>
          <Link href="/login" className="inline-flex items-center gap-2 bg-white text-indigo-600 px-6 py-3 rounded-xl font-bold text-sm hover:bg-indigo-50 transition-colors">
            Start saving {formatINR(savings)} per month <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </div>
  );
};

// --- Mockups for Showcase ---

const ShowcaseDashboard = () => (
  <div className="bg-white rounded-[2rem] shadow-2xl border border-slate-100 p-6 md:p-8 w-full h-full flex flex-col gap-6">
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {[
        { label: 'On-Time Rate', val: '94.2%', color: 'text-emerald-500' },
        { label: 'Active Shipments', val: '12', color: 'text-indigo-600' },
        { label: 'At Risk', val: '2', color: 'text-amber-500' },
        { label: 'Revenue Protected', val: '₹5.3L', color: 'text-indigo-600' }
      ].map((kpi, i) => (
        <div key={i} className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
          <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1">{kpi.label}</p>
          <p className={`text-xl font-black ${kpi.color}`}>{kpi.val}</p>
        </div>
      ))}
    </div>
    <div className="flex-1 bg-slate-50 rounded-3xl p-6 border border-slate-100 relative overflow-hidden">
      <div className="flex justify-between items-center mb-6">
        <h4 className="text-sm font-black text-slate-900">Performance Trends</h4>
        <div className="flex gap-2">
          <div className="w-8 h-8 rounded-lg bg-white border border-slate-200" />
          <div className="w-8 h-8 rounded-lg bg-indigo-600 shadow-sm" />
        </div>
      </div>
      <div className="flex items-end gap-3 h-[120px] mb-6">
        {[40, 70, 45, 90, 65, 80, 50].map((h, i) => (
          <div key={i} className="flex-1 bg-indigo-100/50 rounded-t-lg relative">
            <motion.div initial={{ height: 0 }} animate={{ height: `${h}%` }} transition={{ duration: 1, delay: i * 0.1 }} className="bg-indigo-600 rounded-t-lg absolute bottom-0 left-0 right-0" />
          </div>
        ))}
      </div>
      <div className="space-y-3">
        {[
          { id: 'SHP-M041', route: 'Chennai → Bangalore', status: 'In Transit', color: 'bg-indigo-500' },
          { id: 'SHP-R082', route: 'Delhi → Mumbai', status: 'At Risk', color: 'bg-amber-500' },
          { id: 'SHP-L012', route: 'Pune → Hyderabad', status: 'Delivered', color: 'bg-emerald-500' },
        ].map((row, i) => (
          <div key={i} className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-100 shadow-sm">
            <div className="flex items-center gap-3">
              <div className={`w-2 h-2 rounded-full ${row.color}`} />
              <span className="text-xs font-bold text-slate-900">{row.id}</span>
              <span className="text-[10px] text-slate-400 font-medium">{row.route}</span>
            </div>
            <span className="text-[10px] font-bold text-slate-600">{row.status}</span>
          </div>
        ))}
      </div>
    </div>
  </div>
);

const ShowcaseMap = () => (
  <div className="bg-white rounded-[2rem] shadow-2xl border border-slate-100 p-8 w-full h-full relative overflow-hidden flex flex-col">
    <div className="flex-1 relative bg-slate-50 rounded-3xl border border-slate-100 flex items-center justify-center">
      {/* SVG INDIA MAP MOCKUP */}
      <svg viewBox="0 0 200 240" className="w-[80%] h-[80%] opacity-20 text-indigo-300">
        <path d="M100 20 L120 40 L140 30 L160 50 L150 80 L170 110 L160 140 L140 160 L100 200 L60 200 L40 160 L30 140 L50 80 L40 50 L60 30 L80 40 Z" fill="currentColor" />
      </svg>
      {/* Cities and Routes */}
      <div className="absolute inset-0 p-12">
        <svg viewBox="0 0 200 200" className="w-full h-full overflow-visible">
          {/* Delhi -> Mumbai (Road) */}
          <path d="M100 50 Q 70 100 80 150" fill="none" stroke="#F59E0B" strokeWidth="2" strokeDasharray="4 2" />
          {/* Mumbai -> Bangalore (Rail) */}
          <path d="M80 150 Q 100 170 120 200" fill="none" stroke="#4F46E5" strokeWidth="2" strokeDasharray="4 2" />
          {/* Delhi -> Chennai (Air) */}
          <path d="M100 50 Q 150 120 140 210" fill="none" stroke="#A855F7" strokeWidth="1.5" strokeDasharray="6 3" />
          
          <circle cx="100" cy="50" r="4" fill="#1e293b" /> {/* Delhi */}
          <circle cx="80" cy="150" r="4" fill="#1e293b" /> {/* Mumbai */}
          <circle cx="120" cy="200" r="4" fill="#1e293b" /> {/* Bangalore */}
          <circle cx="140" cy="210" r="4" fill="#1e293b" /> {/* Chennai */}
          <circle cx="160" cy="120" r="4" fill="#1e293b" /> {/* Kolkata */}

          {/* Animated Shipments */}
          <motion.circle 
            r="3" fill="#4F46E5"
            animate={{ 
              cy: [50, 100, 150], 
              cx: [100, 70, 80]
            }}
            transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
          />
        </svg>
      </div>

      <div className="absolute bottom-6 left-6 bg-white p-4 rounded-2xl shadow-xl border border-slate-100 max-w-[200px]">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Live tracking</span>
        </div>
        <p className="text-xs font-bold text-slate-900 mb-1">SHP-R042 · Mumbai → Delhi</p>
        <p className="text-[10px] text-slate-500">67% complete · ETA: 04:30 AM</p>
      </div>

      <div className="absolute top-6 right-6 flex flex-col gap-2">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-full border border-slate-200 text-[10px] font-bold shadow-sm">
          <div className="w-2 h-2 rounded-full bg-amber-500" /> Road
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-full border border-slate-200 text-[10px] font-bold shadow-sm">
          <div className="w-2 h-2 rounded-full bg-indigo-500" /> Rail
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-full border border-slate-200 text-[10px] font-bold shadow-sm">
          <div className="w-2 h-2 rounded-full bg-purple-500" /> Air
        </div>
      </div>
    </div>
  </div>
);

const ShowcaseAlerts = () => (
  <div className="bg-white rounded-[2rem] shadow-2xl border border-slate-100 p-8 w-full h-full flex items-center justify-center">
    <div className="flex flex-col gap-4 w-full max-w-lg">
      {[
        { id: 'SHP-A018', icon: '🔴', title: 'Delayed', reason: 'Chennai port congestion', time: 'Reported 14:22', level: 'High' },
        { id: 'SHP-R003', icon: '🟡', title: 'At Risk', reason: 'NH-48 weather advisory', time: 'Risk: High', level: 'Medium' },
        { id: 'SHP-L007', icon: '🟢', title: 'On Time', reason: 'Bangalore arrival confirmed', time: 'ETA 18:00', level: 'Normal' }
      ].map((alert, i) => (
        <motion.div 
          key={i}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.2 }}
          className="bg-white rounded-2xl p-5 border border-slate-100 shadow-md flex items-center justify-between group hover:border-indigo-200 transition-colors"
        >
          <div className="flex items-center gap-4">
            <span className="text-2xl">{alert.icon}</span>
            <div>
              <p className="text-sm font-black text-slate-900">{alert.id} — {alert.title}</p>
              <p className="text-xs text-slate-500 font-medium">{alert.reason} · {alert.time}</p>
            </div>
          </div>
          <button className="px-4 py-2 bg-slate-900 text-white text-[10px] font-black rounded-xl opacity-0 group-hover:opacity-100 transition-opacity">
            TAKE ACTION
          </button>
        </motion.div>
      ))}
    </div>
  </div>
);

const ShowcaseAnalytics = () => (
  <div className="bg-white rounded-[2rem] shadow-2xl border border-slate-100 p-8 w-full h-full grid grid-cols-2 gap-8">
     <div className="bg-slate-50 rounded-3xl p-6 border border-slate-100 flex flex-col">
       <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-6">Mode Distribution</h4>
       <div className="flex-1 flex items-center justify-center relative">
         <div className="w-32 h-32 rounded-full border-[16px] border-indigo-600 relative">
            <motion.div 
              className="absolute inset-[-16px] rounded-full border-[16px] border-amber-500" 
              style={{ clipPath: 'polygon(50% 50%, 50% 0, 100% 0, 100% 100%, 0 100%, 0 50%)' }}
            />
         </div>
         <div className="absolute inset-0 flex flex-col items-center justify-center">
           <span className="text-xl font-black">94%</span>
           <span className="text-[10px] font-bold text-slate-400">On Time</span>
         </div>
       </div>
       <div className="mt-6 flex flex-wrap gap-4 justify-center">
          <div className="flex items-center gap-2 text-[10px] font-bold"><div className="w-2 h-2 rounded-full bg-indigo-600" /> Road 45%</div>
          <div className="flex items-center gap-2 text-[10px] font-bold"><div className="w-2 h-2 rounded-full bg-amber-500" /> Rail 30%</div>
       </div>
     </div>
     <div className="flex flex-col gap-6">
        <div className="bg-slate-50 rounded-3xl p-6 border border-slate-100">
           <p className="text-[10px] font-black text-slate-400 mb-2 uppercase tracking-widest">Avg Delay Cost</p>
           <p className="text-2xl font-black text-rose-500">₹42,300<span className="text-xs font-bold text-slate-400 ml-2">/ shipment</span></p>
        </div>
        <div className="bg-slate-50 rounded-3xl p-6 border border-slate-100 flex-1">
           <p className="text-[10px] font-black text-slate-400 mb-4 uppercase tracking-widest">Route Efficiency</p>
           <div className="space-y-4">
              {[80, 65, 90].map((w, i) => (
                <div key={i}>
                  <div className="flex justify-between text-[10px] font-bold mb-1">
                    <span>{['NH-48', 'NH-44', 'Eastern Corridor'][i]}</span>
                    <span>{w}%</span>
                  </div>
                  <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${w}%` }} transition={{ delay: 0.5 + i * 0.1 }} className="h-full bg-indigo-600 rounded-full" />
                  </div>
                </div>
              ))}
           </div>
        </div>
     </div>
  </div>
);

const ShowcaseAI = () => (
  <div className="bg-white rounded-[2rem] shadow-2xl border border-slate-100 p-8 w-full h-full flex items-center justify-center">
    <div className="w-full max-w-md bg-slate-50 rounded-[2rem] border border-slate-100 overflow-hidden flex flex-col shadow-inner">
      <div className="bg-white border-b border-slate-100 p-4 flex items-center gap-3">
        <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white">
          <Bot size={20} />
        </div>
        <div>
          <h4 className="text-sm font-black text-slate-900 leading-none">LogiBot</h4>
          <p className="text-[10px] text-emerald-500 font-bold mt-1">Online · AI Co-pilot</p>
        </div>
      </div>
      <div className="p-6 space-y-4 flex-1">
        <div className="flex justify-end">
          <div className="bg-indigo-600 text-white rounded-2xl rounded-tr-none px-4 py-2 text-[13px] font-medium shadow-sm">
            Which shipments are at risk today?
          </div>
        </div>
        <div className="flex justify-start items-start gap-3">
          <div className="w-6 h-6 bg-indigo-100 rounded-lg flex items-center justify-center text-indigo-600 shrink-0">
            <Bot size={14} />
          </div>
          <div className="bg-white rounded-2xl rounded-tl-none px-4 py-2 text-[13px] font-medium border border-slate-100 shadow-sm leading-relaxed">
            3 shipments are currently flagged: <br />
            <strong>SHP-A018</strong> (Chennai, port congestion, <span className="text-rose-500">High risk</span>) <br />
            <strong>SHP-R003</strong> (NH-48 weather, <span className="text-amber-500">Medium risk</span>). <br />
            Want me to suggest reroutes?
          </div>
        </div>
        <div className="flex justify-end">
          <div className="bg-indigo-600 text-white rounded-2xl rounded-tr-none px-4 py-2 text-[13px] font-medium shadow-sm">
            Yes, suggest reroute for SHP-A018
          </div>
        </div>
        <div className="flex justify-start items-start gap-3">
          <div className="w-6 h-6 bg-indigo-100 rounded-lg flex items-center justify-center text-indigo-600 shrink-0">
            <Bot size={14} />
          </div>
          <div className="bg-white rounded-2xl rounded-tl-none px-4 py-2 text-[13px] font-medium border border-slate-100 shadow-sm leading-relaxed">
            Recommended: Switch from rail to road via NH-44. ETA improves by 6 hours. Cost delta: +₹4,200. Approve?
          </div>
        </div>
      </div>
      <div className="p-4 bg-white border-t border-slate-100">
        <div className="bg-slate-50 rounded-xl border border-slate-100 p-2 text-[12px] text-slate-400 font-medium">
          Type your action...
        </div>
      </div>
    </div>
  </div>
);

export default function LandingPage() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [activeFaq, setActiveFaq] = useState<number | null>(null);
  const [showStickyBar, setShowStickyBar] = useState(false);
  const [statsTriggered, setStatsTriggered] = useState(false);

  // Scroll Progress
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001
  });

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
      
      const scrollThreshold = window.innerHeight * 0.4;
      setShowStickyBar(window.scrollY > scrollThreshold && window.scrollY < (document.body.scrollHeight - 1200));

      if (window.scrollY > 200) {
        setStatsTriggered(true);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const stats = [
    { label: "Shipments Tracked", val: useCountUp(10000, 2000, statsTriggered), suffix: "+" },
    { label: "On-Time Rate", val: (useCountUp(992, 2000, statsTriggered) / 10), suffix: "%", decimal: true },
    { label: "Revenue Protected", val: (useCountUp(24, 2000, statsTriggered) / 10), prefix: "₹", suffix: "Cr+", decimal: true },
    { label: "Teams Using LogiFlow", val: useCountUp(500, 2000, statsTriggered), suffix: "+" },
  ];

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans selection:bg-indigo-100 selection:text-indigo-900 relative">
      
      {/* Scroll Progress Bar */}
      <motion.div 
        className="fixed top-0 left-0 right-0 h-1 bg-indigo-600 z-[100] origin-left"
        style={{ scaleX }}
      />

      {/* 1. HEADER */}
      <nav className={`fixed top-0 w-full z-[60] transition-all duration-300 ${isScrolled ? 'bg-white/90 backdrop-blur-xl border-b border-slate-100 py-3' : 'bg-transparent py-6'}`}>
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-xl shadow-indigo-200 group-hover:scale-110 transition-transform">
              <Truck size={22} />
            </div>
            <div className="leading-none">
              <h1 className="text-xl font-black tracking-tight text-slate-900">Logi<span className="text-indigo-600">Flow</span></h1>
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Control Tower</span>
            </div>
          </Link>

          <div className="hidden md:flex items-center gap-10">
            {['Features', 'Use Cases', 'How It Works'].map((item) => (
              <a 
                key={item} 
                href={`#${item.toLowerCase().replace(/\s+/g, '-')}`} 
                className="text-xs font-black uppercase tracking-widest text-slate-600 hover:text-indigo-600 transition-colors"
              >
                {item}
              </a>
            ))}
            <Link href="/login" className="text-xs font-black uppercase tracking-widest text-slate-600 hover:text-indigo-600 transition-colors">
              Login
            </Link>
            <Link 
              href="/login" 
              className="px-6 py-3 bg-indigo-600 text-white text-xs font-black uppercase tracking-widest rounded-xl hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 hover:shadow-2xl hover:shadow-indigo-200"
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
            className="fixed inset-0 z-[70] bg-white flex flex-col p-8"
          >
            <div className="flex justify-between items-center mb-16">
              <span className="text-2xl font-black italic">LogiFlow</span>
              <button onClick={() => setMobileMenuOpen(false)} className="p-3 bg-slate-50 rounded-2xl text-slate-600 hover:bg-slate-100">
                <X size={24} />
              </button>
            </div>
            <div className="flex flex-col gap-10">
              {['Features', 'Use Cases', 'How It Works'].map((item) => (
                <a 
                  key={item} 
                  href={`#${item.toLowerCase().replace(/\s+/g, '-')}`} 
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-2xl font-black text-slate-900 flex items-center justify-between group"
                >
                  {item} <ArrowRight className="opacity-0 group-hover:opacity-100 transition-opacity" />
                </a>
              ))}
              <Link href="/login" onClick={() => setMobileMenuOpen(false)} className="text-2xl font-black text-slate-900 border-t border-slate-100 pt-10">
                Login
              </Link>
              <Link href="/login" onClick={() => setMobileMenuOpen(false)} className="px-6 py-5 bg-indigo-600 text-white text-center rounded-2xl font-black text-lg shadow-2xl shadow-indigo-100">
                Launch Dashboard
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. HERO SECTION */}
      <section className="relative pt-40 pb-20 md:pt-60 md:pb-32 overflow-hidden bg-[400%_400%] animate-hero-gradient bg-gradient-to-br from-white via-indigo-50/20 to-white">
        
        {/* Floating Operational Chips (Hero only visibility logic handled in CSS/Responsive) */}
        <div className="absolute inset-0 max-w-7xl mx-auto pointer-events-none hidden md:block">
          <FloatingChip icon="⚠️" label="Delay Risk" value="High — NH-48" color="text-amber-600" delay="0s" className="absolute top-[25%] left-[5%]" index={0} />
          <FloatingChip icon="🔔" label="Active Alerts" value="3 shipments" color="text-rose-600" delay="0.5s" className="absolute top-[20%] right-[10%]" index={1} />
          <FloatingChip icon="✓" label="ETA Confidence" value="94% on track" color="text-emerald-600" delay="1s" className="absolute bottom-[25%] left-[10%]" index={2} />
          <FloatingChip icon="🌦" label="Weather Impact" value="Coastal route risk" color="text-indigo-600" delay="1.5s" className="absolute bottom-[30%] right-[5%]" index={3} />
        </div>

        {/* Mobile Chips (Only show 2) */}
        <div className="md:hidden absolute inset-0 pointer-events-none overflow-hidden">
           <FloatingChip icon="⚠️" label="Delay Risk" value="High — NH-48" color="text-amber-600" delay="0s" className="absolute top-[20%] left-[5%] scale-75" index={4} />
           <FloatingChip icon="🔔" label="Active Alerts" value="3 shipments" color="text-rose-600" delay="0.5s" className="absolute top-[18%] right-[5%] scale-75" index={5} />
        </div>

        <div className="max-w-7xl mx-auto px-6 relative z-10 text-center">
          <FadeIn>
            <span className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 text-[10px] font-black uppercase tracking-[0.2em] rounded-full mb-10 border border-indigo-100">
              <div className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse" />
              Intelligence for Indian Supply Chains
            </span>
            <h2 className="text-5xl md:text-8xl font-black text-slate-900 leading-[0.95] tracking-tighter mb-10">
              Control Every Shipment.<br />
              <span className="text-indigo-600">From One Place.</span>
            </h2>
            <p className="text-lg md:text-xl text-slate-500 font-bold mb-14 max-w-3xl mx-auto leading-relaxed">
              LogiFlow gives your logistics team live visibility across road, rail, air, and sea — with AI-powered delay prediction, route risk alerts, weather monitoring, and real-time analytics.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
              <Link href="/login" className="w-full sm:w-auto px-12 py-6 bg-slate-900 text-white rounded-[2rem] text-sm font-black uppercase tracking-widest shadow-2xl hover:bg-black transition-all hover:scale-105 active:scale-95">
                Start Free →
              </Link>
              <a href="#how-it-works" className="w-full sm:w-auto px-12 py-6 bg-white text-slate-700 border border-slate-200 rounded-[2rem] text-sm font-black uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-slate-50 transition-all">
                See How It Works
              </a>
            </div>
          </FadeIn>
          
          {/* Animated Counters Strip */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 mt-32 border-t border-slate-100 pt-16">
            {stats.map((stat, idx) => (
              <FadeIn key={idx} delay={idx * 100}>
                <div className="text-center">
                  <p className="text-4xl lg:text-5xl font-black text-slate-900 mb-2">
                    {stat.prefix}{stat.val.toLocaleString('en-IN')}{stat.suffix}
                  </p>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{stat.label}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* 3. LIVE ACTIVITY TICKER */}
      <ActivityTicker />

      {/* 4. TRUST CAPABILITY STRIP */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <FadeIn>
             <h2 className="text-xl md:text-2xl font-black text-slate-900 mb-12 uppercase tracking-tight italic">Built for every link in the Indian supply chain</h2>
             
             {/* Row 1: Industries */}
             <div className="flex flex-wrap justify-center gap-4 mb-8">
                {INDUSTRIES.map((ind, i) => (
                  <span key={i} className="px-6 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-black text-slate-700 flex items-center gap-2 hover:bg-white hover:shadow-md transition-all">
                    <span className="text-lg grayscale group-hover:grayscale-0">{ind.icon}</span> {ind.label}
                  </span>
                ))}
             </div>

             {/* Row 2: Capabilities */}
             <div className="flex flex-wrap justify-center gap-6">
                {CAPABILITIES.map((cap, i) => (
                  <span key={i} className="text-indigo-600 font-black text-xs uppercase tracking-widest flex items-center gap-2">
                    {cap}
                  </span>
                ))}
             </div>
          </FadeIn>
        </div>
      </section>

      {/* 5. PAIN → OUTCOME */}
      <section className="py-24 bg-slate-50/50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-20">
            <FadeIn>
              <h2 className="text-3xl md:text-5xl font-black text-slate-900 mb-6 tracking-tighter italic uppercase">Logistics problems that cost Indian businesses every day</h2>
              <p className="text-lg text-slate-500 font-bold uppercase tracking-widest text-[12px] text-indigo-600">LogiFlow solves each one — automatically</p>
            </FadeIn>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {[
              {
                title: "You find out about delays too late",
                icon: <Eye className="text-rose-500" />,
                problem: "Your team learns about a delay from a supplier call or a missed delivery complaint — hours after it happened.",
                outcome: "LogiFlow flags risk 4-6 hours early so your team acts before the customer ever notices.",
                tag: "Real-time visibility",
                accent: "border-rose-500"
              },
              {
                title: "No central view of all shipments",
                icon: <LayoutDashboard className="text-amber-500" />,
                problem: "Your dispatch team tracks shipments across WhatsApp groups, Excel files, and 3 different transporter portals.",
                outcome: "One dashboard. All shipments. Road, rail, air, and sea — live status in a single control tower.",
                tag: "Unified control",
                accent: "border-amber-500"
              },
              {
                title: "Weather and route risk is invisible",
                icon: <CloudRain className="text-indigo-500" />,
                problem: "You don't know a storm is hitting the coastal highway until a driver calls from the road.",
                outcome: "LogiFlow monitors weather and route conditions 24/7 and alerts you before your cargo is at risk.",
                tag: "Weather intelligence",
                accent: "border-indigo-500"
              },
              {
                title: "Acting on problems takes too many tools",
                icon: <Zap className="text-emerald-500" />,
                problem: "To reroute a shipment, you call the transporter, update Excel, message the supplier, and email the client. 45 minutes.",
                outcome: "Approve reroute, email supplier, generate report — from one screen. Under 2 minutes.",
                tag: "One control tower",
                accent: "border-emerald-500"
              }
            ].map((card, i) => (
              <FadeIn key={i} delay={i * 100}>
                <div className={`bg-white rounded-3xl p-8 lg:p-12 border-l-8 ${card.accent} border border-slate-100 shadow-sm hover:translate-y-[-8px] hover:shadow-2xl transition-all duration-300 h-full flex flex-col`}>
                  <div className="flex items-center gap-4 mb-8">
                    <div className="p-3 bg-slate-50 rounded-2xl">{card.icon}</div>
                    <span className="text-[10px] font-black uppercase text-indigo-600 tracking-[0.2em] bg-indigo-50 px-3 py-1.5 rounded-full">{card.tag}</span>
                  </div>
                  <h3 className="text-2xl font-black text-slate-900 mb-6">{card.title}</h3>
                  <div className="space-y-6 flex-1">
                    <div>
                      <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider mb-2">The Problem</p>
                      <p className="text-slate-500 font-bold leading-relaxed">{card.problem}</p>
                    </div>
                    <div className="bg-slate-50/50 p-6 rounded-2xl border border-slate-100">
                      <p className="text-[10px] font-black uppercase text-emerald-500 tracking-wider mb-2">The Outcome</p>
                      <p className="text-slate-900 font-bold leading-relaxed">{card.outcome}</p>
                    </div>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* 6. FEATURE GRID with Tilt */}
      <section id="features" className="py-24 bg-white relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-20">
            <FadeIn>
              <h2 className="text-3xl md:text-5xl font-black text-slate-900 mb-6 tracking-tighter uppercase italic">Everything your team needs to ship smarter</h2>
            </FadeIn>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              { title: "Live Shipment Visibility", icon: "🗺️", text: "See every active shipment on a live India map — position, ETA, status, and risk score. Road, rail, air, and sea in one view. No more calling transporters for updates." },
              { title: "AI Delay Prediction", icon: "🤖", text: "Our AI monitors traffic corridors, weather systems, and port congestion to flag shipments at risk — before delays happen. Not a dashboard, a co-pilot." },
              { title: "Weather & Route Intelligence", icon: "🌦️", text: "Every route has a weather-aware risk score updated every hour. Monsoon on the coastal highway? Congestion on NH-48? You know first — not last." },
              { title: "Analytics & Revenue Tracking", icon: "📊", text: "On-time rates, delay costs, route leaderboards, revenue forecasts — all calculated automatically from your shipment data. No manual reports." },
              { title: "AI Logistics Assistant (LogiBot)", icon: "💬", text: "Ask LogiBot: 'Which shipments are at risk today?' or 'What's causing the Mumbai delays?' Instant answers. No lookup, no waiting, no dashboard drilling." },
            ].map((feat, i) => (
              <FadeIn key={i} delay={i * 80}>
                <TiltCard className="h-full">
                  <div className="p-10 bg-slate-50 rounded-[2.5rem] border border-slate-100 shadow-sm h-full hover:bg-white hover:border-indigo-100 transition-all group">
                    <div className="text-4xl mb-8 group-hover:scale-110 transition-transform origin-left">{feat.icon}</div>
                    <h3 className="text-xl font-black text-slate-900 mb-6">{feat.title}</h3>
                    <p className="text-slate-500 font-bold leading-relaxed">{feat.text}</p>
                  </div>
                </TiltCard>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* 7. ROI CALCULATOR */}
      <section className="py-24 bg-slate-900 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-1/3 h-full bg-indigo-600/10 blur-[120px]" />
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="text-center max-w-3xl mx-auto mb-20">
            <FadeIn>
              <h2 className="text-3xl md:text-5xl font-black text-white mb-6 uppercase tracking-tight italic">How much are delays actually costing you?</h2>
              <p className="text-lg text-indigo-400 font-bold uppercase tracking-widest text-[12px]">Move the sliders. See your number.</p>
            </FadeIn>
          </div>
          
          <FadeIn>
            <ROIByTheNumbers />
          </FadeIn>
        </div>
      </section>

      {/* 8. HOW IT WORKS */}
      <section id="how-it-works" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-20">
            <FadeIn>
              <h2 className="text-3xl md:text-5xl font-black text-slate-900 mb-6 uppercase tracking-tight italic">Up and running in minutes</h2>
            </FadeIn>
          </div>

          <div className="relative">
             {/* Connection Line */}
             <div className="hidden lg:block absolute top-[60px] left-[10%] right-[10%] h-0.5 border-t-2 border-dashed border-indigo-100" />
             
             <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-12">
                {[
                  { step: "01", icon: <History />, title: "Register your shipments", text: "Add origin, destination, cargo type, and transport mode. Takes 2 minutes per shipment. Import CSV for bulk upload." },
                  { step: "02", icon: <Globe />, title: "AI monitors every route", text: "LogiFlow tracks weather, traffic, and corridor risk across every active shipment — around the clock, automatically." },
                  { step: "03", icon: <Bell />, title: "Get early risk alerts", text: "When something changes — weather, delay, congestion — you get an alert with severity, cause, and recommended action." },
                  { step: "04", icon: <Zap />, title: "Act from one screen", text: "Approve reroutes, notify suppliers, assign drivers, download reports. Everything from a single dashboard. No tool-switching." }
                ].map((item, i) => (
                  <FadeIn key={i} delay={i * 150} className="relative z-10 text-center">
                    <div className="w-24 h-24 bg-white border-2 border-indigo-50 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-xl text-indigo-600 relative">
                       <span className="absolute -top-4 -right-4 bg-indigo-600 text-white text-xs font-black w-10 h-10 rounded-xl flex items-center justify-center border-4 border-white shadow-lg">{item.step}</span>
                       <div className="scale-125">{item.icon}</div>
                    </div>
                    <h3 className="text-lg font-black text-slate-900 mb-4">{item.title}</h3>
                    <p className="text-slate-500 font-bold text-sm leading-relaxed">{item.text}</p>
                  </FadeIn>
                ))}
             </div>
          </div>
        </div>
      </section>

      {/* 9. PRODUCT SHOWCASE (Tabbed) */}
      <section className="py-24 bg-slate-50/50 overflow-hidden">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-20">
            <FadeIn>
              <h2 className="text-3xl md:text-5xl font-black text-slate-900 mb-6 uppercase tracking-tight italic">See LogiFlow in action</h2>
              <p className="text-[12px] font-black uppercase tracking-widest text-indigo-600 mb-10">Built for logistics teams — not just IT</p>
              
              <div className="flex flex-wrap justify-center gap-2 mb-16 p-2 bg-white rounded-3xl border border-slate-100 shadow-sm max-w-fit mx-auto overflow-x-auto no-scrollbar">
                {['Dashboard', 'Live Map', 'Alerts', 'Analytics', 'AI Assistant'].map((tab) => (
                  <button 
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-6 py-3 rounded-2xl text-[10px] uppercase font-black tracking-widest transition-all ${
                      activeTab === tab ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'text-slate-400 hover:text-indigo-600'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </FadeIn>
          </div>

          <FadeIn>
            <div className="max-w-5xl mx-auto aspect-[16/10] relative">
               <AnimatePresence mode="wait">
                 <motion.div
                   key={activeTab}
                   initial={{ opacity: 0, y: 30 }}
                   animate={{ opacity: 1, y: 0 }}
                   exit={{ opacity: 0, y: -30 }}
                   transition={{ duration: 0.2 }}
                   className="w-full h-full"
                 >
                    {activeTab === 'Dashboard' && <ShowcaseDashboard />}
                    {activeTab === 'Live Map' && <ShowcaseMap />}
                    {activeTab === 'Alerts' && <ShowcaseAlerts />}
                    {activeTab === 'Analytics' && <ShowcaseAnalytics />}
                    {activeTab === 'AI Assistant' && <ShowcaseAI />}
                 </motion.div>
               </AnimatePresence>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* 10. WHO IT'S FOR */}
      <section id="use-cases" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-20">
            <FadeIn>
              <h2 className="text-3xl md:text-5xl font-black text-slate-900 mb-6 uppercase tracking-tight italic">Designed for the people who keep India moving</h2>
            </FadeIn>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { role: "Operations Manager", icon: "👤", text: "You're responsible for 50+ shipments a week. You need visibility without spending 3 hours chasing updates. LogiFlow gives you a complete picture — before your morning coffee." },
              { role: "Dispatch Team", icon: "🚛", text: "You're on the phone all day coordinating routes, drivers, and ETAs. LogiFlow cuts those calls in half — live status is always one click away." },
              { role: "Supply Chain Lead", icon: "📈", text: "You need data to make decisions — delay trends, route performance, cost impact. LogiFlow's analytics replace the manual Excel reports your team spends Fridays on." },
              { role: "Logistics SME & Startups", icon: "🏢", text: "You're growing fast and can't afford enterprise software. LogiFlow gives you control-tower capability at startup-friendly pricing — free to start, scales with you." }
            ].map((persona, i) => (
              <FadeIn key={i} delay={i * 100}>
                <div className="p-8 bg-slate-50 rounded-[2rem] border border-slate-100 hover:bg-white hover:shadow-2xl transition-all h-full flex flex-col items-center text-center">
                  <div className="w-16 h-16 bg-white shadow-lg rounded-2xl flex items-center justify-center text-3xl mb-8 group-hover:scale-110 transition-transform">{persona.icon}</div>
                  <h3 className="text-xl font-black text-slate-900 mb-6 uppercase italic tracking-tight">{persona.role}</h3>
                  <p className="text-sm font-bold text-slate-500 leading-relaxed">{persona.text}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* 11. REAL TESTIMONIALS */}
      <section className="py-24 bg-slate-50/50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-24">
            <FadeIn>
               <h2 className="text-3xl md:text-5xl font-black text-slate-900 uppercase tracking-tight italic">From logistics teams across India</h2>
            </FadeIn>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {[
              {
                text: "Before LogiFlow, our operations manager was calling transporters 3 times a day just to know where our pharma consignments were. Now she checks once — and the alerts do the rest.",
                author: "Rahul Sharma",
                role: "Head of Supply Chain, BioMed Logistics, Pune",
                accent: "border-indigo-600"
              },
              {
                text: "We had a rail delay on a Kolkata shipment during the monsoon. LogiFlow flagged it 5 hours before it would have become a problem. We rerouted to road and delivered on time. Client never knew.",
                author: "Priya Nair",
                role: "Operations Lead, FastFreight India, Mumbai",
                accent: "border-emerald-600"
              },
              {
                text: "I'm running a 12-person freight company and we were tracking everything on WhatsApp. LogiFlow replaced all of that. Setup took one afternoon. My team actually uses it.",
                author: "Arjun Mehta",
                role: "Founder, QuickHaul Logistics, Ahmedabad",
                accent: "border-amber-600"
              }
            ].map((testi, i) => (
              <FadeIn key={i} delay={i * 100}>
                <div className={`p-10 bg-white rounded-3xl border border-slate-100 border-l-8 ${testi.accent} shadow-sm hover:shadow-2xl transition-all h-full flex flex-col`}>
                   <div className="text-indigo-600 mb-8 flex gap-1">
                      {[...Array(5)].map((_, i) => <span key={i}>★</span>)}
                   </div>
                   <p className="text-lg font-bold text-slate-900 italic leading-relaxed mb-10 flex-1">&quot;{testi.text}&quot;</p>
                   <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-black text-lg ${testi.accent.replace('border', 'bg')}`}>
                         {testi.author[0]}
                      </div>
                      <div>
                        <p className="text-sm font-black text-slate-900">{testi.author}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{testi.role}</p>
                      </div>
                   </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* 12. FAQ ACCORDION */}
      <section className="py-24 bg-white">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-20">
            <FadeIn>
              <h2 className="text-3xl md:text-5xl font-black text-slate-900 uppercase tracking-tight italic">Common questions from logistics teams</h2>
            </FadeIn>
          </div>

          <div className="space-y-4">
            {FAQS.map((faq, i) => (
              <FadeIn key={i} delay={i * 50}>
                <div className={`border rounded-2xl transition-all overflow-hidden ${activeFaq === i ? 'bg-slate-50 border-indigo-200 shadow-lg' : 'bg-white border-slate-100'}`}>
                  <button 
                    onClick={() => setActiveFaq(activeFaq === i ? null : i)}
                    className="w-full p-6 text-left flex items-center justify-between"
                  >
                    <span className="text-sm md:text-base font-black text-slate-900">{faq.q}</span>
                    <div className="p-2 bg-slate-100 rounded-xl transition-transform" style={{ transform: activeFaq === i ? 'rotate(45deg)' : 'none' }}>
                      <Plus size={20} className={activeFaq === i ? 'text-indigo-600' : 'text-slate-400'} />
                    </div>
                  </button>
                  <motion.div 
                    initial={false}
                    animate={{ height: activeFaq === i ? 'auto' : 0, opacity: activeFaq === i ? 1 : 0 }}
                    className="overflow-hidden"
                  >
                    <div className="p-6 pt-0 text-sm md:text-base font-bold text-slate-500 leading-relaxed border-t border-slate-100 mt-0">
                      {faq.a}
                    </div>
                  </motion.div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* 13. FINAL CTA */}
      <section className="py-32 bg-[400%_400%] animate-hero-gradient bg-gradient-to-br from-indigo-600 via-indigo-900 to-indigo-800 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-1/2 h-full bg-white/5 blur-[120px] rounded-full" />
        <div className="absolute bottom-0 left-0 w-1/3 h-full bg-indigo-400/10 blur-[100px] rounded-full" />
        
        <div className="max-w-7xl mx-auto px-6 relative z-10 text-center">
          <FadeIn>
            <h2 className="text-4xl md:text-7xl font-black mb-10 tracking-tighter italic uppercase">Bring your entire logistics operation into one place</h2>
            <p className="text-xl md:text-2xl text-indigo-100 font-bold mb-16 max-w-3xl mx-auto leading-relaxed">
              500+ teams across India trust LogiFlow to track smarter, respond faster, and ship with confidence.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-6 mb-16">
              <Link href="/login" className="w-full sm:w-auto px-12 py-6 bg-white text-indigo-600 rounded-[2.5rem] text-sm font-black uppercase tracking-widest shadow-2xl hover:scale-105 active:scale-95 transition-all">
                Get Started Free →
              </Link>
              <Link href="/login" className="w-full sm:w-auto px-12 py-6 bg-transparent border-2 border-white text-white rounded-[2.5rem] text-sm font-black uppercase tracking-widest hover:bg-white/10 transition-all">
                Already have an account? Login →
              </Link>
            </div>

            <div className="flex flex-wrap justify-center gap-10 border-t border-white/10 pt-16">
               {[
                 { text: "Free to start", icon: "✓" },
                 { text: "No credit card needed", icon: "✓" },
                 { text: "Setup in under 5 minutes", icon: "✓" }
               ].map((badge, i) => (
                 <div key={i} className="flex items-center gap-3 text-indigo-100 font-black text-xs uppercase tracking-[0.2em]">
                   <span className="w-6 h-6 rounded-lg bg-white/10 flex items-center justify-center text-white">{badge.icon}</span>
                   {badge.text}
                 </div>
               ))}
            </div>
          </FadeIn>
        </div>
      </section>

      {/* 14. FOOTER */}
      <footer className="bg-white pt-32 pb-16 border-t border-slate-100">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-16 mb-24">
            <div className="col-span-2">
              <Link href="/" className="flex items-center gap-3 mb-8">
                <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white">
                  <Truck size={22} />
                </div>
                <div>
                  <h4 className="text-xl font-black tracking-tight text-slate-900">LogiFlow</h4>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Control Tower for India</p>
                </div>
              </Link>
              <p className="text-sm font-bold text-slate-500 leading-relaxed max-w-sm mb-8">
                AI-powered logistics control tower for shipment tracking across road, rail, air, and sea cargo corridors in India.
              </p>
              <div>
                <p className="text-[10px] font-black uppercase text-slate-400 mb-2 tracking-widest">Designed & Built By</p>
                <p className="text-sm font-black text-indigo-600">Vicky Kumar — PGDM Student | Bihar</p>
              </div>
            </div>

            <div>
              <h5 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-8">Platform</h5>
              <ul className="space-y-4">
                {['Live Tracking', 'Smart Alerts', 'Route Intelligence', 'AI Assistant', 'Analytics', 'Reports'].map((link) => (
                  <li key={link}><a href="#" className="text-xs font-black uppercase tracking-widest text-slate-600 hover:text-indigo-600 transition-colors">{link}</a></li>
                ))}
              </ul>
            </div>

            <div>
              <h5 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-8">Use Cases</h5>
              <ul className="space-y-4">
                {['Pharma', 'FMCG', 'Manufacturing', 'Retail Supply Chain', 'Freight Forwarding'].map((link) => (
                  <li key={link}><a href="#" className="text-xs font-black uppercase tracking-widest text-slate-600 hover:text-indigo-600 transition-colors">{link}</a></li>
                ))}
              </ul>
            </div>

            <div>
              <h5 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-8">Company</h5>
              <ul className="space-y-4">
                {['About', 'Contact', 'Privacy Policy', 'Terms of Service'].map((link) => (
                  <li key={link}><a href="#" className="text-xs font-black uppercase tracking-widest text-slate-600 hover:text-indigo-600 transition-colors">{link}</a></li>
                ))}
              </ul>
            </div>
          </div>

          <div className="pt-16 border-t border-slate-100 text-center">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">
              © 2026 LogiFlow — Original design and code by Vicky Kumar, PGDM Student, Bihar, India. Unauthorized reproduction is prohibited.
            </p>
          </div>
        </div>
      </footer>

      {/* 13. STICKY BOTTOM BAR */}
      <AnimatePresence>
        {showStickyBar && (
          <motion.div 
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 20, stiffness: 100 }}
            className="fixed bottom-0 left-0 right-0 z-[100] bg-indigo-600 py-4 px-6 md:py-6 shadow-[0_-10px_40px_rgba(79,70,229,0.2)]"
          >
            <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 md:gap-0">
               <p className="text-white font-black uppercase tracking-widest text-xs md:text-sm hidden md:block">Start tracking your shipments for free today</p>
               <Link href="/login" className="w-full md:w-auto px-8 py-4 bg-white text-indigo-600 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl flex items-center justify-center gap-2">
                 Get Started Free <ArrowRight size={14} />
               </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* LogiFlow | Original work by Vicky Kumar, PGDM Student, Bihar | © 2026 */}
    </div>
  );
}
