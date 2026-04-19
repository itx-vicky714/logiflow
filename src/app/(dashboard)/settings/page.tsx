"use client";

import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import type { Profile } from '@/types';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

const profileSchema = z.object({
  full_name: z.string().min(2, 'Name must be at least 2 characters'),
  company: z.string().min(1, 'Company name is required'),
  role: z.string().optional(),
  phone: z.string().optional(),
  whatsapp: z.string().optional(),
  email_alerts: z.boolean().optional(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

const fieldCls = "w-full bg-surface-container-low border-none rounded-xl py-4 px-6 text-[13px] text-on-surface font-bold focus:ring-2 focus:ring-[#493ee5]/10 outline-none transition-all placeholder-on-surface-variant/30 font-['Inter']";
const labelCls = "block text-[10px] font-black text-on-surface-variant uppercase tracking-[0.2em] mb-3 ml-1";

function ApiStatusChip({ ok, label }: { ok: boolean | null; label: string }) {
  return (
    <div className="flex items-center justify-between py-6 border-b border-surface-container last:border-0 hover:bg-surface-container-low/30 px-6 -mx-6 rounded-2xl transition-all">
      <div className="flex items-center gap-4">
         <span className={`material-symbols-outlined text-[20px] ${ok ? 'text-[#493ee5]' : 'text-on-surface-variant'}`}>
           {label.includes('AI') ? 'psychology' : label.includes('Postgres') ? 'database' : 'hub'}
         </span>
         <span className="text-[13px] font-bold text-on-surface tracking-tight">{label}</span>
      </div>
      {ok === null ? (
        <div className="status-pulse bg-surface-container w-4 h-4" />
      ) : (
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest ${ok ? 'bg-primary-fixed text-[#493ee5]' : 'bg-error-container text-error'}`}>
          <div className={`w-1.5 h-1.5 rounded-full ${ok ? 'bg-[#493ee5]' : 'bg-error'} status-pulse`} />
          {ok ? 'Active Link' : 'Sync Error'}
        </div>
      )}
    </div>
  );
}

export default function SettingsPage() {
  const [user, setUser] = useState<{ id: string; email?: string; user_metadata?: Record<string, string> } | null>(null);
  const [profile, setProfile] = useState<Partial<Profile>>({});
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'intelligence'>('profile');
  const [supabaseOk, setSupabaseOk] = useState<boolean | null>(null);
  const [geminiOk, setGeminiOk] = useState<boolean | null>(null);

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: { email_alerts: true }
  });

  const emailAlerts = watch('email_alerts');

  useEffect(() => {
    const load = async () => {
      const { data: { user: u } } = await supabase.auth.getUser();
      if (!u) return;
      setUser(u);
      const { data: p } = await supabase.from('profiles').select('*').eq('id', u.id).single();
      if (p) {
        setProfile(p);
        setValue('full_name', p.full_name || u.user_metadata?.full_name || '');
        setValue('company', p.company || u.user_metadata?.company || '');
        setValue('role', p.role || '');
        setValue('phone', p.phone || '');
        setValue('whatsapp', p.whatsapp || '');
        setValue('email_alerts', p.email_alerts ?? true);
      }
      supabase.from('shipments').select('id').limit(1).then(({ error }) => setSupabaseOk(!error));
      fetch('/api/chat', { 
        method: 'POST', 
        body: JSON.stringify({ message: 'status', history: [] }), 
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        } 
      })
        .then(r => r.json()).then(d => setGeminiOk(!d.error)).catch(() => setGeminiOk(false));
    };
    load();
  }, [setValue]);

  const onSubmit = async (data: ProfileFormData) => {
    if (!user) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('profiles').upsert({ id: user.id, ...data, updated_at: new Date().toISOString() });
      if (error) throw error;
      await supabase.auth.updateUser({ data: { full_name: data.full_name, company: data.company } });
      toast.success('System Configuration Updated');
    } catch (err: any) {
      toast.error('Update Protocol Failed');
    } finally {
      setSaving(false);
    }
  };

  const initials = profile.full_name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || user?.email?.[0]?.toUpperCase() || 'U';

  return (
    <div className="max-w-5xl space-y-12 pb-20 font-['Inter'] antialiased tracking-tight text-[#191c1e] animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* Strategic Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
        <div>
          <h1 className="text-4xl font-black text-on-surface tracking-tighter uppercase">System Control</h1>
          <div className="flex items-center gap-2 mt-2">
            <span className="status-pulse bg-primary" />
            <p className="text-[10px] font-black text-on-surface-variant uppercase tracking-[0.3em]">Profile Settings</p>
          </div>
        </div>
        
        <div className="flex bg-surface-container p-1 rounded-2xl border border-white/50">
          {[
            { id: 'profile', label: 'Identity', icon: 'person' },
            { id: 'intelligence', label: 'Backbone', icon: 'hub' },
            { id: 'security', label: 'Firewall', icon: 'shield' },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as any)}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                activeTab === t.id ? 'bg-surface-container-lowest shadow-sm text-[#493ee5]' : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'profile' && (
          <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }} className="space-y-10">
            
            {/* Identity Command Card */}
            <div className="bg-surface-container-lowest p-12 rounded-[3rem] border border-white/50 curated-shadow relative overflow-hidden group">
               <span className="material-symbols-outlined absolute -right-12 -top-12 text-[240px] opacity-[0.03] rotate-12 transition-transform duration-1000 group-hover:scale-110">verified_user</span>
               <div className="relative flex flex-col md:flex-row items-center gap-12">
                  <div className="relative group/avatar">
                    <div className="w-40 h-40 rounded-[2.5rem] bg-on-surface text-inverse-on-surface flex items-center justify-center text-5xl font-black shadow-2xl ring-8 ring-surface-container-low tracking-tighter">
                      {initials}
                    </div>
                    <button className="absolute -bottom-3 -right-3 w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-xl hover:scale-110 transition-all text-[#493ee5]">
                      <span className="material-symbols-outlined text-[20px]">photo_camera</span>
                    </button>
                  </div>
                  <div className="flex-1 text-center md:text-left space-y-4">
                    <span className="px-4 py-1.5 bg-primary-fixed text-[#493ee5] rounded-full text-[9px] font-black uppercase tracking-widest border border-[#493ee5]/10 mb-2 inline-block">Enterprise Administrator</span>
                    <h2 className="text-5xl font-black text-on-surface mb-2 tracking-tighter leading-none italic uppercase">{profile.full_name || 'User Profile'}</h2>
                    <p className="text-[14px] font-bold text-on-surface-variant uppercase tracking-widest flex items-center justify-center md:justify-start gap-3">
                       <span className="material-symbols-outlined text-[16px] text-[#493ee5]">corporate_fare</span>
                       {profile.company || 'Logistics Manager'}
                    </p>
                    <div className="flex flex-wrap justify-center md:justify-start gap-6 pt-4">
                       {[
                         { icon: 'mail', val: user?.email },
                         { icon: 'call', val: profile.phone || '+No Protocol' }
                       ].map((item, i) => (
                         <div key={i} className="flex items-center gap-3 text-[12px] font-bold text-on-surface italic bg-surface-container-low/50 px-5 py-2.5 rounded-xl border border-white/50">
                           <span className="material-symbols-outlined text-[16px] text-[#493ee5]">{item.icon}</span>
                           {item.val}
                         </div>
                       ))}
                    </div>
                  </div>
               </div>
            </div>

            {/* Specification Form */}
            <div className="bg-surface-container-lowest p-12 rounded-[3rem] border border-white/50 curated-shadow">
               <div className="flex items-center gap-4 mb-10">
                  <div className="w-12 h-12 rounded-2xl bg-surface-container-low flex items-center justify-center text-primary shadow-sm">
                    <span className="material-symbols-outlined text-[24px]">tune</span>
                  </div>
                  <h3 className="text-2xl font-black text-on-surface tracking-tighter uppercase italic">Identity Specification</h3>
               </div>
               
               <form onSubmit={handleSubmit(onSubmit)} className="space-y-10">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                    <div>
                      <label className={labelCls}>Full Name</label>
                      <input {...register('full_name')} className={fieldCls} placeholder="Supervisor Full Name" />
                    </div>
                    <div>
                      <label className={labelCls}>Job Title</label>
                      <input {...register('role')} className={fieldCls} placeholder="Operational Role" />
                    </div>
                    <div className="md:col-span-2">
                       <label className={labelCls}>Company Name</label>
                       <input {...register('company')} className={fieldCls} placeholder="LogiFlow Network Hub" />
                    </div>
                    <div>
                      <label className={labelCls}>Phone Number</label>
                      <input {...register('phone')} className={fieldCls} placeholder="+91 Protocol Number" />
                    </div>
                    <div>
                      <label className={labelCls}>WhatsApp Number</label>
                      <input {...register('whatsapp')} className={fieldCls} placeholder="+91 Redundant Line" />
                    </div>
                  </div>

                  <div className="p-8 bg-primary-fixed/30 border border-[#493ee5]/10 rounded-3xl flex items-center justify-between group hover:bg-primary-fixed/50 transition-colors">
                    <div className="flex items-center gap-6">
                       <span className={`material-symbols-outlined text-[32px] ${emailAlerts ? 'text-[#493ee5]' : 'text-on-surface-variant'}`}>{emailAlerts ? 'notifications_active' : 'notifications_off'}</span>
                       <div>
                         <h4 className="text-[14px] font-black text-on-surface uppercase tracking-tight italic">Email Alerts</h4>
                         <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mt-1">Receive automated alert emails</p>
                       </div>
                    </div>
                    <button 
                      type="button" onClick={() => setValue('email_alerts', !emailAlerts)}
                      className={`w-16 h-8 rounded-full relative transition-all duration-500 shadow-inner ${emailAlerts ? 'bg-[#493ee5]' : 'bg-surface-container'}`}
                    >
                      <div className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full shadow-lg transition-transform duration-500 ${emailAlerts ? 'translate-x-8' : 'translate-x-0'}`} />
                    </button>
                  </div>

                  <div className="flex justify-end pt-6">
                    <button type="submit" disabled={saving} className="bg-on-surface text-inverse-on-surface py-5 px-12 rounded-2xl text-[11px] font-black uppercase tracking-[0.3em] shadow-2xl hover:opacity-95 active:scale-95 transition-all">
                      {saving ? 'Synchronizing Cluster...' : 'Save Changes'}
                    </button>
                  </div>
               </form>
            </div>

          </motion.div>
        )}

        {activeTab === 'intelligence' && (
          <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }} className="space-y-10">
            <div className="bg-surface-container-lowest p-12 rounded-[3rem] border border-white/50 curated-shadow">
               <div className="flex items-center gap-4 mb-10">
                  <div className="w-12 h-12 rounded-2xl bg-surface-container-low flex items-center justify-center text-primary shadow-sm">
                    <span className="material-symbols-outlined text-[24px]">dns</span>
                  </div>
                  <h3 className="text-2xl font-black text-on-surface tracking-tighter uppercase italic">System Infrastructure</h3>
               </div>
               
               <div className="space-y-2">
                  <ApiStatusChip ok={supabaseOk} label="Supabase Postgres Mainframe" />
                  <ApiStatusChip ok={geminiOk} label="Gemini AI Reasoning Node" />
                  <ApiStatusChip ok={true} label="Strategic Telemetry Gateway" />
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-12">
                  <div className="p-10 bg-primary-fixed/30 border border-[#493ee5]/10 rounded-[2.5rem] relative overflow-hidden group">
                     <span className="material-symbols-outlined absolute -right-6 -bottom-6 text-[100px] opacity-[0.05] group-hover:rotate-12 transition-transform">speed</span>
                     <div className="relative z-10">
                        <p className="text-[10px] font-black text-[#493ee5] uppercase tracking-widest mb-4">Sync Latency Index</p>
                        <p className="text-5xl font-black text-on-surface tracking-tighter italic">18ms <span className="text-sm font-bold opacity-30">P99</span></p>
                        <p className="text-[10px] font-black text-[#493ee5]/60 uppercase tracking-widest mt-4">Optimal system throughput stable</p>
                     </div>
                  </div>
                  <div className="p-10 bg-surface-container-low border border-white rounded-[2.5rem] relative overflow-hidden group">
                     <span className="material-symbols-outlined absolute -right-6 -bottom-6 text-[100px] opacity-[0.05] group-hover:-rotate-12 transition-transform">bolt</span>
                     <div className="relative z-10">
                        <p className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest mb-4">Neural Node Specification</p>
                        <p className="text-5xl font-black text-on-surface tracking-tighter italic">v3.1 Flash</p>
                        <p className="text-[10px] font-black text-on-surface-variant/50 uppercase tracking-widest mt-4">Execution layer synchronized</p>
                     </div>
                  </div>
               </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'security' && (
          <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }} className="space-y-10">
            <div className="bg-surface-container-lowest p-12 rounded-[3rem] border border-white/50 curated-shadow">
               <div className="flex items-center gap-4 mb-10">
                  <div className="w-12 h-12 rounded-2xl bg-surface-container-low flex items-center justify-center text-primary shadow-sm">
                    <span className="material-symbols-outlined text-[24px]">encrypted</span>
                  </div>
                  <h3 className="text-2xl font-black text-on-surface tracking-tighter uppercase italic">Security Protocol Layer</h3>
               </div>
               
               <div className="space-y-6">
                  <div className="flex items-center justify-between p-8 bg-surface-container-low/30 rounded-3xl border border-white/50 hover:bg-surface-container-low/50 transition-all">
                    <div className="flex items-center gap-6">
                       <span className="material-symbols-outlined text-primary">account_circle</span>
                       <div>
                         <p className="text-[14px] font-black text-on-surface uppercase italic">Authenticated Terminal ID</p>
                         <p className="text-[11px] font-bold text-on-surface-variant mt-1 tracking-tight">{user?.email}</p>
                       </div>
                    </div>
                    <span className="px-3 py-1 bg-primary-fixed text-[#493ee5] text-[9px] font-black uppercase tracking-widest rounded-lg">Shipment</span>
                  </div>
                  
                  <div className="flex items-center justify-between p-8 bg-surface-container-low/30 rounded-3xl border border-white/50 hover:bg-surface-container-low/50 transition-all">
                    <div className="flex items-center gap-6">
                       <span className="material-symbols-outlined text-primary">key</span>
                       <div>
                         <p className="text-[14px] font-black text-on-surface uppercase italic">MFA Integration Matrix</p>
                         <p className="text-[11px] font-bold text-on-surface-variant mt-1 tracking-tight">Multi-factor node authentication active</p>
                       </div>
                    </div>
                    <button className="text-[10px] font-black text-[#493ee5] uppercase tracking-widest hover:underline decoration-2">Configure Protocol</button>
                  </div>
               </div>

               <div className="mt-16 pt-10 border-t border-surface-container">
                  <button 
                    onClick={async () => { await supabase.auth.signOut(); window.location.href='/login'; }}
                    className="flex items-center gap-4 px-10 py-5 bg-error-container text-error rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] border border-error/10 hover:bg-error hover:text-white transition-all shadow-sm active:scale-95"
                  >
                    <span className="material-symbols-outlined text-[18px]">logout</span> 
                    Terminate Production Session
                  </button>
               </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

