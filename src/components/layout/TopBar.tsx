'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSidebar } from '@/context/SidebarContext';
import { useAuth } from '@/context/AuthContext';
import { useSearch } from '@/context/SearchContext';
import { supabase } from '@/lib/supabase';
import { seedShipments } from '@/lib/utils';
import { toast } from 'sonner';
import type { Notification, Shipment } from '@/types';

const SIMULATE_SEQUENCE = [
  { origin: 'Mumbai', destination: 'Delhi', mode: 'road', status: 'on_time', priority: 'normal', risk_score: 15, cargo_type: 'Electronics', supplier_name: 'Tata Motors', weight_kg: 1200, declared_value: 150000 },
  { origin: 'Chennai', destination: 'Bangalore', mode: 'rail', status: 'in_transit', priority: 'normal', risk_score: 35, cargo_type: 'Textiles', supplier_name: 'Reliance Industries', weight_kg: 3000, declared_value: 200000 },
  { origin: 'Kolkata', destination: 'Hyderabad', mode: 'air', status: 'in_transit', priority: 'high', risk_score: 72, cargo_type: 'Pharmaceuticals', supplier_name: 'Sun Pharma Logistics', weight_kg: 500, declared_value: 500000 },
  { origin: 'Ahmedabad', destination: 'Pune', mode: 'road', status: 'delayed', priority: 'high', risk_score: 85, cargo_type: 'Automotive Parts', supplier_name: 'Mahindra Supply Co', weight_kg: 4500, declared_value: 350000 },
  { origin: 'Delhi', destination: 'Kolkata', mode: 'rail', status: 'on_time', priority: 'normal', risk_score: 20, cargo_type: 'FMCG Goods', supplier_name: 'Flipkart Commerce', weight_kg: 2000, declared_value: 120000 },
  { origin: 'Mumbai', destination: 'Chennai', mode: 'sea', status: 'in_transit', priority: 'normal', risk_score: 45, cargo_type: 'Industrial Equipment', supplier_name: 'Larsen & Toubro', weight_kg: 8000, declared_value: 800000 },
  { origin: 'Bangalore', destination: 'Hyderabad', mode: 'road', status: 'on_time', priority: 'normal', risk_score: 10, cargo_type: 'IT Hardware', supplier_name: 'Infosys Logistics', weight_kg: 800, declared_value: 250000 },
  { origin: 'Patna', destination: 'Mumbai', mode: 'rail', status: 'in_transit', priority: 'high', risk_score: 68, cargo_type: 'Agricultural Goods', supplier_name: 'ITC Agribusiness', weight_kg: 6000, declared_value: 90000 },
];

export function TopBar() {
  const { user, signOut } = useAuth();
  const { toggleMobile } = useSidebar();
  const { query, setQuery } = useSearch();
  const router = useRouter();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    if (!user) return;
    supabase.from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_read', false)
      .order('created_at', { ascending: false })
      .limit(5)
      .then(({ data }) => setNotifications(data || []));
  }, [user]);

  const profileName = (user as { user_metadata?: { full_name?: string } })?.user_metadata?.full_name || user?.email?.split('@')[0]?.replace(/[._]/g, ' ') || 'User';
  const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(profileName)}&background=493ee5&color=fff&bold=true`;

  const [simulating, setSimulating] = useState(false);

  const handleAllClear = () => {
    setQuery('');
    toast.success('Search cleared');
  };

  const handleReset = () => {
    setQuery('');
    toast.success('Manifest Grid Refreshed');
    window.location.reload();
  };

  const handleSimulate = async () => {
    if (simulating) return;
    setSimulating(true);
    const toastId = toast.loading('Synchronizing neural data...');

    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) throw new Error('Auth required');

      const currentIndex = parseInt(localStorage.getItem('simulate_index') || '0');
      const shipmentData = SIMULATE_SEQUENCE[currentIndex % SIMULATE_SEQUENCE.length];
      
      const eta = new Date();
      eta.setHours(eta.getHours() + Math.floor(Math.random() * 48) + 6);

      const { error } = await supabase
        .from('shipments')
        .insert({
          ...shipmentData,
          user_id: currentUser.id,
          eta: eta.toISOString(),
          is_simulated: true,
          shipment_code: `LOG-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
        });

      if (error) throw error;
      
      localStorage.setItem('simulate_index', String(currentIndex + 1));
      toast.success(`Active Node: ${shipmentData.origin} → ${shipmentData.destination}`, { id: toastId });
      
      // Full refresh to update all dashboard elements
      window.location.reload();
    } catch (err) {
      console.error(err);
      toast.error('Simulation Failed', { id: toastId });
    } finally {
      setSimulating(false);
    }
  };

  return (
    <header className="fixed top-0 right-0 left-0 lg:left-64 h-16 z-40 bg-white/80 backdrop-blur-xl border-b border-slate-200 transition-all duration-300">
      <div className="flex items-center justify-between px-4 lg:px-12 w-full h-full">
        
        {/* Mobile Toggle & Brand */}
        <div className="flex lg:hidden items-center gap-3">
          <button onClick={toggleMobile} className="w-10 h-10 flex items-center justify-center hover:bg-primary/5 rounded-lg active:scale-90 transition-all">
            <span className="material-symbols-outlined text-[#493ee5]">menu</span>
          </button>
          <span className="text-sm font-black tracking-tighter uppercase italic text-[#493ee5]">LogiFlow</span>
        </div>

        {/* Search & Dashboard Actions */}
        <div className="flex items-center gap-4 lg:gap-8 flex-1 min-w-0 mr-4 lg:mr-8 ml-2 lg:ml-0">
          <span className="text-lg font-black text-slate-800 tracking-tight shrink-0 hidden lg:block">LogiFlow Dashboard</span>
          
          <div className="relative flex-1 max-w-md h-9 focus-within:ring-2 focus-within:ring-[#493ee5]/20 rounded-lg min-w-0 sm:min-w-[200px]">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">search</span>
            <input 
              className="w-full h-full bg-slate-100/50 border-none rounded-lg pl-10 pr-4 py-2 text-sm focus:ring-0 outline-none" 
              placeholder="Search shipments..." 
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          
          <div className="flex items-center gap-2 shrink-0 hidden md:flex">
            <button type="button" onClick={handleAllClear} className="px-3 h-8 bg-[#493ee5] text-white rounded-lg text-[10px] font-bold uppercase tracking-wider hover:opacity-90 transition-opacity whitespace-nowrap">All Clear</button>
            <button type="button" onClick={handleReset} className="px-3 h-8 border border-slate-200 text-slate-600 rounded-lg text-[10px] font-bold uppercase tracking-wider hover:bg-slate-50 transition-colors whitespace-nowrap">Reset</button>
            <button type="button" onClick={handleSimulate} disabled={simulating} className="px-3 h-8 border border-slate-200 text-slate-600 rounded-lg text-[10px] font-bold uppercase tracking-wider hover:bg-slate-50 transition-colors whitespace-nowrap disabled:opacity-50">
              {simulating ? 'Processing...' : 'Simulate'}
            </button>
          </div>
        </div>

        {/* Utilities & Profile Dropdown */}
        <div className="flex items-center gap-3 lg:gap-6 shrink-0 relative">
          <div className="flex items-center gap-1 lg:gap-2">
            {/* Notifications */}
            <div className="relative">
              <button 
                onClick={() => setShowNotifications(!showNotifications)}
                className="w-9 h-9 flex items-center justify-center hover:bg-slate-100 rounded-lg transition-colors text-slate-600"
              >
                <span className="material-symbols-outlined text-[20px]">notifications</span>
                {notifications.length > 0 && <span className="absolute top-2 right-2 w-2 h-2 bg-[#493ee5] rounded-full border-2 border-white"></span>}
              </button>
              
              {showNotifications && (
                <div className="absolute top-12 right-0 w-80 bg-white rounded-2xl shadow-2xl border border-slate-100 p-4 animate-in fade-in slide-in-from-top-2 duration-300">
                  <h4 className="text-xs font-black uppercase tracking-widest text-slate-900 mb-4 px-2">AI Alerts</h4>
                  <div className="space-y-3">
                    {notifications.length > 0 ? notifications.map((n, i) => (
                      <div key={i} className="p-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer">
                        <p className="text-[11px] font-bold text-slate-800 leading-tight mb-1">{n.title}</p>
                        <p className="text-[10px] text-slate-500 leading-relaxed line-clamp-2">{n.message}</p>
                      </div>
                    )) : (
                      <div className="py-8 text-center bg-slate-50 rounded-xl">
                        <span className="material-symbols-outlined text-3xl text-slate-200">notifications_off</span>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">No new alerts</p>
                      </div>
                    )}
                  </div>
                  <button className="w-full mt-4 py-2 text-[10px] font-black text-[#493ee5] uppercase tracking-widest hover:bg-[#493ee5]/5 rounded-lg transition-colors">View All Hubs</button>
                </div>
              )}
            </div>

            {/* Help */}
            <button 
              onClick={() => setShowHelp(!showHelp)}
              className="w-9 h-9 flex items-center justify-center hover:bg-slate-100 rounded-lg transition-colors text-slate-600"
            >
              <span className="material-symbols-outlined text-[20px]">help_outline</span>
            </button>

            {/* Grid */}
            <button className="w-9 h-9 flex items-center justify-center hover:bg-slate-100 rounded-lg transition-colors text-slate-600">
              <span className="material-symbols-outlined text-[20px]">grid_view</span>
            </button>
          </div>
          
          <div className="h-6 w-[1px] bg-slate-200 hidden sm:block"></div>
          
          {/* User Profile */}
          <div className="relative">
            <button 
              onClick={() => setShowProfile(!showProfile)}
              className="flex items-center gap-3 pl-2 py-1 hover:bg-slate-100 rounded-xl transition-all"
            >
              <div className="text-right hidden sm:block">
                <p className="text-xs font-black text-slate-800 tracking-tight truncate w-24">{profileName}</p>
                <p className="text-[9px] text-[#493ee5] font-black uppercase tracking-widest">Logistics Manager</p>
              </div>
              <img 
                alt="Profile" 
                className="w-9 h-9 rounded-full border-2 border-[#493ee5]/10 object-cover" 
                src={avatarUrl}
              />
            </button>

            {showProfile && (
              <div className="absolute top-14 right-0 w-64 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="p-6 bg-slate-50 border-b border-slate-100">
                  <p className="text-xs font-black text-slate-800 truncate mb-1">{profileName}</p>
                  <p className="text-[10px] text-slate-500 truncate">{user?.email}</p>
                </div>
                <div className="p-2">
                  <button onClick={() => router.push('/settings')} className="w-full flex items-center gap-3 px-4 py-3 text-[11px] font-bold text-slate-600 hover:bg-slate-50 rounded-xl transition-colors">
                    <span className="material-symbols-outlined text-lg">person</span>
                    View Profile
                  </button>
                  <button onClick={() => router.push('/settings')} className="w-full flex items-center gap-3 px-4 py-3 text-[11px] font-bold text-slate-600 hover:bg-slate-50 rounded-xl transition-colors">
                    <span className="material-symbols-outlined text-lg">settings</span>
                    Settings
                  </button>
                  <div className="h-px bg-slate-100 my-2 mx-2"></div>
                  <button onClick={signOut} className="w-full flex items-center gap-3 px-4 py-3 text-[11px] font-black text-error hover:bg-error/5 rounded-xl transition-colors">
                    <span className="material-symbols-outlined text-lg">logout</span>
                    Logout
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {showHelp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 backdrop-blur-sm bg-black/20" onClick={() => setShowHelp(false)}>
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-10 animate-in zoom-in-95 duration-300" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-black text-slate-900 tracking-tighter uppercase italic">Help & Support</h2>
              <button onClick={() => setShowHelp(false)} className="w-10 h-10 flex items-center justify-center hover:bg-slate-100 rounded-xl transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="space-y-6">
              {[
                { t: 'LogiFlow Dashboard', d: 'View real-time shipment KPIs and performance trends.' },
                { t: 'Live Map', d: 'Track your entire fleet on a high-fidelity interactive map.' },
                { t: 'Add Shipment', d: 'Register new shipments via the AI-assisted stepper.' },
                { t: 'Intelligent Analytics', d: 'Access weather-risk drift reports and revenue forecasting.' }
              ].map((item, i) => (
                <div key={i} className="flex gap-5 group">
                  <div className="w-10 h-10 shrink-0 bg-[#493ee5]/5 text-[#493ee5] flex items-center justify-center rounded-xl group-hover:bg-[#493ee5] group-hover:text-white transition-all">
                    <span className="material-symbols-outlined text-lg">{i === 3 ? 'monitoring' : i === 2 ? 'add_box' : i === 1 ? 'map' : 'dashboard'}</span>
                  </div>
                  <div>
                    <h4 className="text-[13px] font-black text-slate-900 uppercase tracking-tight mb-1">{item.t}</h4>
                    <p className="text-[11px] text-slate-500 leading-relaxed font-medium">{item.d}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-12 p-6 bg-slate-50 rounded-2xl flex items-center justify-between">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Support linkage active</p>
              <a href="mailto:support@logiflow.app" className="text-[11px] font-black text-[#493ee5] uppercase tracking-widest border-b-2 border-primary/20 hover:border-primary transition-all pb-1">support@logiflow.app</a>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

