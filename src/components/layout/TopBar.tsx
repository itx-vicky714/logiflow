'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useSidebar } from '@/context/SidebarContext';
import { useAuth } from '@/context/AuthContext';
import { useSearch } from '@/context/SearchContext';
import { supabase } from '@/lib/supabase';
import { seedShipments } from '@/lib/utils';
import { toast } from 'sonner';
import { Notification, Shipment } from '@/types';
import { 
  TrendingUp, Activity, CheckCircle2, AlertTriangle, ShieldAlert, Zap, Search, 
  Bell, HelpCircle, User, LogOut, ChevronRight, Menu, RefreshCcw, Box
} from 'lucide-react';

const generateSimulatedData = (index: number) => {
  const routes = [
    { o: 'Delhi', d: 'Mumbai', m: 'road' },
    { o: 'Patna', d: 'Surat', m: 'rail' },
    { o: 'Kolkata', d: 'Chennai', m: 'sea' },
    { o: 'Jaipur', d: 'Lucknow', m: 'road' },
    { o: 'Bengaluru', d: 'Hyderabad', m: 'air' },
    { o: 'Pune', d: 'Ahmedabad', m: 'road' },
    { o: 'Mumbai', d: 'Chennai', m: 'sea' }
  ];
  const step = index % 5;
  const route = routes[index % routes.length];
  
  let status = 'in_transit';
  let risk_score = 10 + (index % 20);
  let priority = 'normal';

  if (step === 0) {
    status = 'in_transit';
  } else if (step === 1) {
    status = 'on_time';
  } else if (step === 2) {
    status = 'delayed';
    risk_score = 45;
  } else if (step === 3) {
    status = 'in_transit';
    risk_score = 75 + (index % 20);
    priority = 'high';
  } else if (step === 4) {
    status = 'delayed';
    risk_score = 85 + (index % 10);
    priority = 'high';
  }

  return {
    origin: route.o,
    destination: route.d,
    mode: route.m,
    status,
    priority,
    risk_score,
    cargo_type: 'Industrial Goods',
    supplier_name: `Supplier ${String.fromCharCode(65 + (index % 26))} Logistics`,
    weight_kg: 1000 + (index * 150),
    declared_value: 50000 + (index * 5000),
  };
};

export function TopBar() {
  const { user, signOut } = useAuth();
  const { toggleMobile } = useSidebar();
  const { query, setQuery } = useSearch();
  const router = useRouter();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const profileRef = useRef<HTMLDivElement>(null);
  const notificationRef = useRef<HTMLDivElement>(null);
  const [dismissedDemoAlerts, setDismissedDemoAlerts] = useState<string[]>([]);

  useEffect(() => {
    const handleAlertsCleared = () => {
      setNotifications([]);
    };
    window.addEventListener('alerts-cleared', handleAlertsCleared);
    return () => window.removeEventListener('alerts-cleared', handleAlertsCleared);
  }, []);

  const displayAlerts = notifications;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setShowProfile(false);
      }
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    
    const handleAlertResolved = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail) {
        setNotifications(prev => prev.filter(n => n.id !== customEvent.detail));
      }
    };
    window.addEventListener('alert-resolved', handleAlertResolved);
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('alert-resolved', handleAlertResolved);
    };
  }, []);

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

  const handleAllClear = async () => {
    const toastId = toast.loading('Resolving active alerts...');
    try {
      if (user) {
        await supabase
          .from('notifications')
          .update({ is_read: true })
          .eq('user_id', user.id)
          .eq('is_read', false);
      }
      setNotifications([]);
      window.dispatchEvent(new Event('alerts-cleared'));
      toast.success('All alerts resolved', { id: toastId });
    } catch (err) {
      setNotifications([]);
      window.dispatchEvent(new Event('alerts-cleared'));
      toast.success('All alerts resolved', { id: toastId });
    }
  };

  const handleReset = async () => {
    setQuery('');
    localStorage.removeItem('simulate_index');
    if (user) {
      await supabase.from('shipments').delete().eq('user_id', user.id);
      await supabase.from('notifications').delete().eq('user_id', user.id);
    }
    toast.success('Dashboard filters, view state, and all shipments reset');
    // We reload to ensure all components reset to their default initial state
    setTimeout(() => window.location.reload(), 500);
  };

  const handleSimulate = async () => {
    if (simulating) return;
    
    const confirmed = window.confirm("This will add a sample tracking node to your dashboard for demonstration purposes. Proceed?");
    if (!confirmed) return;

    setSimulating(true);
    const toastId = toast.loading('Injecting sandbox node...');

    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) throw new Error('Authentication required');

      const currentIndex = parseInt(localStorage.getItem('simulate_index') || '0');
      const shipmentData = generateSimulatedData(currentIndex);
      
      const eta = new Date();
      eta.setHours(eta.getHours() + Math.floor(Math.random() * 48) + 6);

      const { data: newShipment, error } = await supabase
        .from('shipments')
        .insert({
          ...shipmentData,
          user_id: currentUser.id,
          eta: eta.toISOString(),
          is_simulated: true,
          shipment_code: `SIM-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
        })
        .select()
        .single();

      if (error) {
        console.error('[DEV ERROR] Shipment Insert Failed:', error);
        throw error;
      }
      
      const alertReasons = [];
      if (shipmentData.status === 'delayed') alertReasons.push('Transit delay detected');
      if (shipmentData.risk_score > 70) alertReasons.push('High risk threshold exceeded');
      if (currentIndex % 5 === 4) alertReasons.push('Mandatory system maintenance check');
      
      for (const reason of alertReasons) {
        let type = 'risk';
        if (reason.includes('delay')) type = 'delay';
        else if (reason.includes('maintenance')) type = 'system';
        
        const { error: alertError } = await supabase.from('notifications').insert({
          user_id: currentUser.id,
          shipment_id: newShipment.id,
          type,
          title: 'System Alert',
          message: `${reason} for shipment #${newShipment.shipment_code.split('-').pop()}.`,
          is_read: false
        });
        
        if (alertError) {
          console.error('[DEV ERROR] Notification Insert Failed:', alertError);
          toast.error(`Alert Insert Failed: ${alertError.message}`);
        } else {
          toast.info(`Alert: ${reason}`);
        }
      }

      localStorage.setItem('simulate_index', String(currentIndex + 1));
      toast.success(`Sandbox Node Active: ${shipmentData.origin} → ${shipmentData.destination}`, { id: toastId });
      
      setTimeout(() => window.location.reload(), 1000);
    } catch (err) {
      console.error(err);
      toast.error('Simulation Failed', { id: toastId });
    } finally {
      setSimulating(false);
    }
  };

  return (
    <header className="sticky top-0 z-40 flex h-20 w-full items-center justify-between border-b border-slate-200/60 bg-white/80 backdrop-blur-md px-8 shadow-sm transition-all duration-300">
      <div className="flex items-center gap-4">
        
        {/* Mobile Toggle & Brand */}
        <div className="flex lg:hidden items-center gap-3">
          <button onClick={toggleMobile} className="w-10 h-10 flex items-center justify-center hover:bg-primary/5 rounded-lg active:scale-90 transition-all">
            <Menu className="text-[#493ee5]" size={24} />
          </button>
          <span className="text-sm font-black tracking-tighter uppercase italic text-[#493ee5]">LogiFlow</span>
        </div>

        {/* Search & Dashboard Actions */}
        <div className="flex items-center gap-4 lg:gap-8 flex-1 min-w-0">
          <span className="text-lg font-black text-slate-800 tracking-tight shrink-0 hidden lg:block">LogiFlow Dashboard</span>
          
          <div className="relative group">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
            <input 
              type="text" 
              placeholder="Search network nodes..." 
              className="h-11 w-60 md:w-80 rounded-2xl bg-slate-100/50 border border-transparent px-12 text-[13px] font-medium outline-none transition-all focus:bg-white focus:border-indigo-100 focus:ring-4 focus:ring-indigo-50/50"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          <div className="hidden lg:flex items-center gap-3">
            <button 
              onClick={handleAllClear}
              className="h-10 px-4 flex items-center justify-center rounded-xl bg-slate-100 text-slate-500 hover:bg-indigo-50 hover:text-indigo-600 transition-all font-bold text-[10px] uppercase tracking-widest active:scale-95 border border-transparent hover:border-indigo-100"
              title="Clear all alerts"
            >
              All Clear
            </button>
            <button 
              onClick={handleReset}
              className="h-10 px-4 flex items-center justify-center rounded-xl bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-900 transition-all font-bold text-[10px] uppercase tracking-widest active:scale-95 border border-transparent hover:border-slate-200"
              title="Reset view state"
            >
              Reset
            </button>
            <button 
              onClick={handleSimulate}
              disabled={simulating}
              className="h-10 px-6 flex items-center gap-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 transition-all font-bold text-[10px] uppercase tracking-widest active:scale-95 shadow-md shadow-indigo-100 disabled:opacity-50 border border-white/10"
            >
              {simulating ? <RefreshCcw size={14} className="animate-spin" /> : <Zap size={14} className="fill-white" />}
              <span>Simulate</span>
            </button>
          </div>
        </div>

        {/* Utilities & Profile Dropdown */}
        <div className="flex items-center gap-3 lg:gap-6 shrink-0 relative">
          <div className="flex items-center gap-1 lg:gap-2">
            {/* Notifications */}
            <div className="relative" ref={notificationRef}>
              <button 
                onClick={() => { setShowNotifications(!showNotifications); setShowProfile(false); }}
                className="relative flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100/50 text-slate-600 hover:bg-slate-200/50 hover:text-indigo-600 transition-all active:scale-95 shadow-sm"
              >
                <Bell size={20} className="transform group-hover:rotate-12 transition-transform" />
                {displayAlerts.length > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-black text-white ring-2 ring-white">
                    {displayAlerts.length}
                  </span>
                )}
              </button>
              
              {showNotifications && (
                <div className="absolute top-16 right-0 w-80 bg-white rounded-2xl shadow-2xl border border-slate-200 p-4 animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="flex items-center justify-between mb-4 px-2">
                    <h4 className="text-xs font-black uppercase tracking-widest text-slate-900">System Alerts</h4>
                    {displayAlerts.length > 0 && (
                      <button onClick={handleAllClear} className="text-[9px] font-black uppercase tracking-widest text-indigo-600 hover:underline">Clear All</button>
                    )}
                  </div>
                  <div className="space-y-3 max-h-[400px] overflow-y-auto no-scrollbar">
                    {displayAlerts.length > 0 ? displayAlerts.map((n, i) => (
                      <div key={i} className="p-3 bg-slate-50/80 rounded-xl hover:bg-slate-100 transition-colors border border-slate-100 group">
                        <div className="flex justify-between items-start mb-1">
                          <p className="text-[11px] font-bold text-slate-800 leading-tight">{n.title}</p>
                          <button 
                            onClick={async (e) => {
                              e.stopPropagation();
                              const { error } = await supabase.from('notifications').update({ is_read: true }).eq('id', n.id);
                              if (!error) {
                                setNotifications(prev => prev.filter(item => item.id !== n.id));
                                window.dispatchEvent(new CustomEvent('alert-resolved', { detail: n.id }));
                              }
                            }}
                            className="text-[9px] font-bold uppercase text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            Resolve
                          </button>
                        </div>
                        <p className="text-[10px] text-slate-500 leading-relaxed line-clamp-2">{n.message}</p>
                      </div>
                    )) : (
                      <div className="py-8 text-center bg-slate-50 rounded-xl">
                        <Bell size={32} className="mx-auto text-slate-200 mb-2" />
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-2">No new alerts</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Help */}
            <button 
              onClick={() => setShowHelp(!showHelp)}
              className="w-11 h-11 flex items-center justify-center rounded-2xl bg-slate-100/50 text-slate-600 hover:bg-slate-200/50 hover:text-indigo-600 transition-all active:scale-95 shadow-sm"
            >
              <HelpCircle size={20} />
            </button>
          </div>
          
          <div className="h-6 w-[1px] bg-slate-200 hidden sm:block"></div>
          
          {/* User Profile */}
          <div className="relative" ref={profileRef}>
            <button 
              onClick={() => { setShowProfile(!showProfile); setShowNotifications(false); }}
              className="flex items-center gap-3 rounded-2xl bg-slate-100/50 p-1.5 pl-3 border border-transparent hover:border-slate-200/50 transition-all active:scale-95 shadow-sm"
            >
              <div className="text-right hidden md:block">
                <p className="text-[11px] font-black uppercase tracking-widest text-slate-900">{(user as any)?.user_metadata?.full_name || 'Admin'}</p>
                <p className="text-[9px] font-bold uppercase text-indigo-600 tracking-tighter">Enterprise Mode</p>
              </div>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-[13px] font-black text-white shadow-lg shadow-indigo-100">
                {(user as any)?.user_metadata?.full_name?.[0] || 'A'}
              </div>
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
                  <button onClick={async () => {
                     localStorage.removeItem('demo_session');
                     localStorage.removeItem('simulate_index');
                     await signOut();
                     router.replace('/login');
                     setTimeout(() => window.location.reload(), 200);
                  }} className="w-full flex items-center gap-3 px-4 py-3 text-[11px] font-black text-error hover:bg-error/5 rounded-xl transition-colors">
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
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Support team available</p>
              <a href="mailto:support@logiflow.app" className="text-[11px] font-black text-[#493ee5] uppercase tracking-widest border-b-2 border-primary/20 hover:border-primary transition-all pb-1">support@logiflow.app</a>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

