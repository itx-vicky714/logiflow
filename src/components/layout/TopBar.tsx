"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Bell, Search, RefreshCw, LogOut, User, Settings, 
  HelpCircle, ChevronDown, CheckCircle2, AlertTriangle, 
  CloudRain, Zap, Box, Menu, Moon, Sun, Monitor, Clock, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter, usePathname } from 'next/navigation';
import { format, formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

import { useSidebar } from '@/context/SidebarContext';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'delay' | 'risk' | 'weather' | 'delivery' | 'system';
  is_read: boolean;
  created_at: string;
}

const PAGE_TITLES: Record<string, string> = {
  '/dashboard':    'Dashboard',
  '/shipments':    'Shipments',
  '/shipments/new':'New Shipment',
  '/map':          'Control Center',
  '/analytics':    'Intelligence Hub',
  '/reports':      'Strategic Reports',
  '/settings':     'System Settings',
};

export function TopBar({ toggleSidebar }: { toggleSidebar?: () => void }) {
  const { toggle: ctxToggle } = useSidebar();
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [time, setTime] = useState(new Date());
  
  const notifRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Derive page title
  const pageTitle = Object.entries(PAGE_TITLES).find(([k]) => pathname.startsWith(k))?.[1] ?? 'LogiFlow';

  const loadData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setUser(user);

    // Fetch notifications from the DB
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (data) {
      setNotifications(data);
      setUnreadCount(data.filter(n => !n.is_read).length);
    }
  }, []);

  useEffect(() => {
    const run = async () => {
      await loadData();
    };
    run();
    const t = setInterval(() => setTime(new Date()), 1000);

    // Real-time subscription for notifications
    const channel = supabase.channel('realtime_notifications')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, () => {
        loadData();
      })
      .subscribe();

    const clickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setShowNotifications(false);
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) setShowUserMenu(false);
    };
    document.addEventListener('mousedown', clickOutside);

    return () => {
      clearInterval(t);
      supabase.removeChannel(channel);
      document.removeEventListener('mousedown', clickOutside);
    };
  }, [loadData]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const handleGlobalRefresh = () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    // Dispatch global event
    window.dispatchEvent(new CustomEvent('shipments-updated'));
    setTimeout(() => {
      loadData();
      setIsRefreshing(false);
      toast.success('System synchronization complete');
    }, 1200);
  };

  const markAllRead = async () => {
    if (!user) return;
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', user.id)
      .eq('is_read', false);
    
    if (!error) {
      loadData();
      toast.success('All marked as read');
    }
  };

  const markRead = async (id: string, type?: string, shipment_code?: string) => {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id);
    
    if (!error) loadData();

    // Smart Routing
    if (type === 'delay' || type === 'risk') {
      router.push('/map');
    } else if (type === 'delivery') {
      router.push('/shipments');
    } else if (type === 'weather') {
      router.push('/map');
    }
    setShowNotifications(false);
  };

  const notifyIcon = (type: string) => {
    switch (type) {
      case 'delay': return <AlertTriangle size={14} className="text-rose-500" />;
      case 'weather': return <CloudRain size={14} className="text-blue-500" />;
      case 'risk': return <Zap size={14} className="text-amber-500" />;
      case 'delivery': return <CheckCircle2 size={14} className="text-emerald-500" />;
      default: return <Box size={14} className="text-slate-400" />;
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const query = (document.getElementById('global-search') as HTMLInputElement)?.value;
    if (query?.trim()) {
      router.push(`/shipments?search=${encodeURIComponent(query)}`);
    }
  };

  return (
    <header className="h-[72px] bg-white/70 backdrop-blur-md border-b border-slate-200/60 flex items-center justify-between px-6 sticky top-0 z-[100] transition-all">
      {/* Left: Branding/Title */}
      <div className="flex items-center gap-4">
        <button onClick={toggleSidebar || ctxToggle} className="p-2 lg:hidden text-slate-500 hover:bg-slate-100 rounded-xl transition-all">
          <Menu size={20} />
        </button>
        <div className="flex flex-col leading-none">
          <h2 className="text-[17px] font-black text-slate-800 tracking-tight">{pageTitle}</h2>
          <div className="flex items-center gap-2 mt-1">
             <span className="text-[10px] uppercase font-black tracking-widest text-primary shrink-0">LogiFlow Command Tower</span>
             <span className="h-2 w-px bg-slate-200" />
             <span className="text-[10px] font-bold text-slate-400 tabular-nums uppercase tracking-tighter">
               Terminal 01 • Active • {time.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
             </span>
          </div>
        </div>
      </div>

      {/* Center: Search */}
      <form 
        onSubmit={handleSearch}
        className="hidden xl:flex items-center bg-slate-50 border border-slate-200/60 rounded-2xl px-3.5 py-2.5 w-[420px] focus-within:w-[500px] focus-within:bg-white focus-within:ring-4 focus-within:ring-indigo-50/50 focus-within:border-[#3b5bdb]/30 transition-all group"
      >
        <Search size={18} className="text-slate-400 group-focus-within:text-[#3b5bdb] transition-colors" />
        <input 
          id="global-search"
          type="text" 
          placeholder="Command space: search shipments, routes, nodes..." 
          className="bg-transparent border-none focus:ring-0 text-[13px] font-bold w-full px-3 placeholder-slate-400 text-slate-700"
        />
        <kbd className="inline-flex h-6 select-none items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 font-mono text-[10px] font-black text-slate-400 uppercase shadow-sm">⌘K</kbd>
      </form>

      {/* Right: Actions */}
      <div className="flex items-center gap-3">
        {/* Sync Button */}
        <button 
          onClick={handleGlobalRefresh}
          disabled={isRefreshing}
          className={`hidden sm:flex items-center gap-2.5 px-4 py-2.5 rounded-2xl transition-all border font-black text-[11px] uppercase tracking-widest ${isRefreshing ? 'bg-indigo-50 border-indigo-100 text-[#3b5bdb]' : 'bg-white border-slate-200 text-slate-500 hover:text-[#3b5bdb] hover:border-indigo-200 hover:bg-indigo-50/20'}`}
        >
          <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
          <span>{isRefreshing ? 'Syncing...' : 'Live Sync'}</span>
        </button>

        {/* Notifications */}
        <div ref={notifRef} className="relative">
          <button 
            onClick={() => setShowNotifications(!showNotifications)}
            className={`p-2.5 rounded-2xl transition-all border group relative ${showNotifications ? 'bg-indigo-50 border-indigo-200 text-[#3b5bdb]' : 'bg-white border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}
          >
            <Bell size={19} className={unreadCount > 0 ? 'animate-pulse' : ''} />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 text-white text-[10px] font-black rounded-full flex items-center justify-center ring-4 ring-white shadow-lg">
                {unreadCount}
              </span>
            )}
          </button>

          <AnimatePresence>
            {showNotifications && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.96, y: 12 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: 12 }}
                className="absolute right-0 mt-3 w-80 sm:w-[400px] bg-white rounded-2xl border border-slate-200/80 shadow-[0_25px_60px_rgba(15,23,42,0.18)] z-[120] overflow-hidden"
              >
                <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/40">
                  <div className="flex items-center gap-2">
                    <span className="font-black text-[13px] text-slate-800 uppercase tracking-tight">Active Alerts</span>
                    {unreadCount > 0 && <span className="bg-[#3b5bdb] text-white px-2 py-0.5 rounded-full text-[9px] font-black">{unreadCount} New</span>}
                  </div>
                  {unreadCount > 0 && (
                    <button onClick={markAllRead} className="text-[10px] font-black text-[#3b5bdb] uppercase tracking-widest hover:underline transition-all">Clear All</button>
                  )}
                </div>
                <div className="max-h-[440px] overflow-y-auto">
                  {notifications.length > 0 ? (
                    notifications.map(n => (
                      <div 
                        key={n.id} 
                        onClick={() => markRead(n.id, n.type)}
                        className={`p-4 border-b border-slate-50 hover:bg-slate-50/80 transition-all cursor-pointer relative group ${!n.is_read ? 'bg-indigo-50/20' : ''}`}
                      >
                        <div className="flex gap-4">
                          <div className={`w-10 h-10 rounded-xl shrink-0 flex items-center justify-center shadow-sm border transition-transform group-hover:scale-105 ${!n.is_read ? 'bg-white border-indigo-100' : 'bg-slate-50 border-slate-200'}`}>
                            {notifyIcon(n.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <h4 className={`text-[13px] font-black truncate ${!n.is_read ? 'text-indigo-900' : 'text-slate-700'}`}>{n.title}</h4>
                              <span className="text-[9px] font-black text-slate-400 whitespace-nowrap uppercase">
                                {formatDistanceToNow(new Date(n.created_at), { addSuffix: false })}
                              </span>
                            </div>
                            <p className="text-[12px] font-bold text-slate-500 line-clamp-2 mt-1 leading-relaxed">{n.message}</p>
                          </div>
                          {!n.is_read && (
                            <div className="w-1.5 h-1.5 bg-[#3b5bdb] rounded-full mt-2 shrink-0 animate-pulse" />
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="py-20 text-center px-10">
                      <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-slate-100 shadow-inner">
                        <CheckCircle2 size={28} className="text-slate-200" />
                      </div>
                      <h4 className="text-sm font-black text-slate-800 mb-1">Mission Control Clear</h4>
                      <p className="text-xs font-bold text-slate-400 leading-relaxed uppercase tracking-tighter">No active threats or logistics delays detected in manifest.</p>
                    </div>
                  )}
                </div>
                <div className="p-3 bg-slate-50/50 border-t border-slate-100 text-center group cursor-pointer hover:bg-indigo-50/50 transition-all">
                  <button className="text-[11px] font-black text-slate-400 group-hover:text-[#3b5bdb] uppercase tracking-widest transition-colors">Strategic Alert History &rarr;</button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* User Profile */}
        <div ref={userMenuRef} className="relative">
          <button 
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-3 p-1 rounded-2xl hover:bg-slate-50 transition-all group lg:pr-3"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#3b5bdb] to-[#0ea5e9] flex items-center justify-center text-white shadow-lg shadow-indigo-100 group-hover:shadow-indigo-200 transition-all">
              <User size={20} />
            </div>
            <div className="hidden lg:block text-left">
              <div className="text-[13px] font-black text-slate-800 leading-none">Ops Master</div>
              <div className="text-[10px] font-bold text-[#3b5bdb] mt-1.5 flex items-center gap-1.5 uppercase tracking-wide">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" /> Online
              </div>
            </div>
            <ChevronDown size={14} className={`hidden lg:block text-slate-400 transition-transform duration-300 ${showUserMenu ? 'rotate-180' : ''}`} />
          </button>

          <AnimatePresence>
            {showUserMenu && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.96, y: 12 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: 12 }}
                className="absolute right-0 mt-3 w-64 bg-white rounded-2xl border border-slate-200/80 shadow-[0_25px_60px_rgba(15,23,42,0.18)] z-[120] overflow-hidden"
              >
                <div className="p-5 border-b border-slate-50 bg-slate-50/30">
                  <div className="text-[11px] font-black text-slate-400 uppercase tracking-[0.1em] mb-1">Authenticated As</div>
                  <div className="text-xs font-black text-slate-800 truncate">{user?.email}</div>
                </div>
                <div className="p-2 space-y-1">
                  {[
                    { icon: User, label: 'Profile Settings', path: '/settings' },
                    { icon: Settings, label: 'Control Center', path: '/map' },
                    { icon: Monitor, label: 'System Health', path: '/settings' },
                    { icon: HelpCircle, label: 'Intelligence Support', path: '/analytics' },
                  ].map(item => (
                    <button 
                      key={item.label} 
                      onClick={() => { router.push(item.path); setShowUserMenu(false); }}
                      className="w-full flex items-center gap-3 px-3.5 py-2.5 text-[12px] font-bold text-slate-600 hover:bg-slate-50 hover:text-slate-900 rounded-xl transition-all"
                    >
                      <item.icon size={16} className="text-slate-400" />
                      {item.label}
                    </button>
                  ))}
                  <div className="h-px bg-slate-100 my-2 mx-3" />
                  <button onClick={handleSignOut} className="w-full flex items-center gap-3 px-3.5 py-2.5 text-[12px] font-black text-rose-500 hover:bg-rose-50 rounded-xl transition-all">
                    <LogOut size={16} />
                    Secure Terminate Session
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
}
