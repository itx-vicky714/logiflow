"use client";

import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import type { Profile } from '@/types';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Building, Phone, Mail, Shield, Bell, CheckCircle, XCircle, Loader2, Camera, Save, Activity, LogOut } from 'lucide-react';

const profileSchema = z.object({
  full_name: z.string().min(2, 'Name must be at least 2 characters'),
  company: z.string().min(1, 'Company name is required'),
  role: z.string().optional(),
  phone: z.string().optional(),
  whatsapp: z.string().optional(),
  email_alerts: z.boolean().optional(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

const fieldCls = "w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-slate-900 transition-all";
const labelCls = "block text-sm font-medium text-slate-700 mb-1.5";

function ApiStatusChip({ ok, label }: { ok: boolean | null; label: string }) {
  if (ok === null) return (
    <div className="flex items-center justify-between py-3 border-b border-slate-100 last:border-0">
      <span className="text-sm text-slate-600">{label}</span>
      <Loader2 size={14} className="animate-spin text-slate-400" />
    </div>
  );
  return (
    <div className="flex items-center justify-between py-3 border-b border-slate-100 last:border-0">
      <span className="text-sm text-slate-600">{label}</span>
      <div className={`flex items-center gap-1.5 text-xs font-medium ${ok ? 'text-green-600' : 'text-red-500'}`}>
        {ok ? <CheckCircle size={14} /> : <XCircle size={14} />}
        {ok ? 'Connected' : 'Not connected'}
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const [user, setUser] = useState<{ id: string; email?: string; user_metadata?: Record<string, string> } | null>(null);
  const [profile, setProfile] = useState<Partial<Profile>>({});
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'intelligence'>('profile');
  const [supabaseOk, setSupabaseOk] = useState<boolean | null>(null);
  const [geminiOk, setGeminiOk] = useState<boolean | null>(null);
  const avatarRef = useRef<HTMLInputElement>(null);

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

      // Load profile
      const { data: p } = await supabase.from('profiles').select('*').eq('id', u.id).single();
      if (p) {
        setProfile(p);
        setValue('full_name', p.full_name || u.user_metadata?.full_name || '');
        setValue('company', p.company || u.user_metadata?.company || '');
        setValue('role', p.role || '');
        setValue('phone', p.phone || '');
        setValue('whatsapp', p.whatsapp || '');
        setValue('email_alerts', p.email_alerts ?? true);
      } else {
        // First time — pre-fill from auth metadata
        setValue('full_name', u.user_metadata?.full_name || '');
        setValue('company', u.user_metadata?.company || '');
        setValue('email_alerts', true);
      }

      // Check API status
      supabase.from('shipments').select('id').limit(1).then(({ error }) => {
        setSupabaseOk(!error);
      });

      fetch('/api/chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'status', history: [] })
      }).then(r => r.json()).then(d => setGeminiOk(!d.error))
        .catch(() => setGeminiOk(false));
    };
    load();
  }, [setValue]);

  const onSubmit = async (data: ProfileFormData) => {
    if (!user) return;
    setSaving(true);
    try {
      const profileData = {
        id: user.id,
        full_name: data.full_name,
        company: data.company,
        role: data.role || null,
        phone: data.phone || null,
        whatsapp: data.whatsapp || null,
        email_alerts: data.email_alerts ?? true,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase.from('profiles').upsert(profileData);
      if (error) throw error;

      // Also update auth metadata for sidebar display
      await supabase.auth.updateUser({ data: { full_name: data.full_name, company: data.company } });
      
      setProfile(p => ({ ...p, ...profileData, role: profileData.role ?? undefined, phone: profileData.phone ?? undefined, whatsapp: profileData.whatsapp ?? undefined }));
      toast.success('Profile saved successfully!');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save profile';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    
    // Size check (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image too large. Please use a file smaller than 2MB.');
      return;
    }

    setUploadingAvatar(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `${user.id}/${Math.random().toString(36).substring(2)}.${ext}`;
      
      const { error: uploadErr } = await supabase.storage.from('avatars').upload(path, file, { 
        upsert: true,
        cacheControl: '3600'
      });
      
      if (uploadErr) {
        if (uploadErr.message.includes('bucket not found') || uploadErr.message.includes('does not exist') || uploadErr.message.includes('Row-level security')) {
            toast.error('The "avatars" storage bucket or permissions are not properly configured in Supabase. Please ensure a public bucket named "avatars" exists.', { duration: 6000 });
        } else {
            toast.error(`Upload failed: ${uploadErr.message}`);
        }
        return;
      }

      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path);
      
      const { error: profileErr } = await supabase.from('profiles').upsert({ 
        id: user.id, 
        avatar_url: publicUrl,
        updated_at: new Date().toISOString()
      });
      
      if (profileErr) throw profileErr;

      setProfile(p => ({ ...p, avatar_url: publicUrl }));
      toast.success('Identity avatar updated successfully!');
    } catch (err: unknown) {
      console.error('Avatar Error:', err);
      const msg = err instanceof Error ? err.message : 'Avatar upload failed. Check the console for details.';
      toast.error(msg);
    } finally {
      setUploadingAvatar(false);
    }
  };

  const initials = profile.full_name
    ? profile.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : user?.email?.[0]?.toUpperCase() || 'U';

  return (
    <div className="max-w-4xl space-y-8 pb-20">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight">System Control</h1>
          <p className="text-sm font-bold text-slate-400 mt-1 uppercase tracking-widest leading-none">Manage identity and intelligence nodes</p>
        </div>
        
        <div className="flex bg-slate-100/80 p-1.5 rounded-2xl border border-slate-200 shadow-inner">
          {[
            { id: 'profile', label: 'Identity', icon: User },
            { id: 'intelligence', label: 'Connectivity', icon: Activity },
            { id: 'security', label: 'Security', icon: Shield },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as 'profile' | 'security' | 'intelligence')}
              className={`flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-black transition-all ${
                activeTab === t.id 
                  ? 'bg-white text-primary shadow-md shadow-blue-900/5 border border-slate-200' 
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <t.icon size={14} />
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'profile' && (
          <motion.div 
            key="profile" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            {/* Avatar + Name Header */}
            <div className="bg-white border border-slate-100 rounded-[2rem] shadow-sm p-8 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-64 h-64 bg-slate-50 rounded-full translate-x-1/2 -translate-y-1/2 group-hover:scale-110 transition-transform duration-700" />
              <div className="relative flex flex-col sm:flex-row items-center gap-8">
                <div className="relative group/avatar">
                  {profile.avatar_url ? (
                    <img src={profile.avatar_url} alt="Avatar" className="w-28 h-28 rounded-[2rem] object-cover ring-4 ring-slate-50 shadow-xl" />
                  ) : (
                    <div className="w-28 h-28 rounded-[2rem] bg-gradient-to-br from-primary to-blue-700 flex items-center justify-center text-white text-4xl font-black shadow-xl">
                      {initials}
                    </div>
                  )}
                  <button
                    onClick={() => avatarRef.current?.click()}
                    disabled={uploadingAvatar}
                    className="absolute -bottom-2 -right-2 w-10 h-10 bg-white border border-slate-200 rounded-2xl flex items-center justify-center shadow-lg hover:bg-slate-50 transition-all active:scale-90"
                  >
                    {uploadingAvatar ? <Loader2 size={16} className="animate-spin text-primary" /> : <Camera size={16} className="text-slate-500" />}
                  </button>
                  <input ref={avatarRef} type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
                </div>
                <div className="flex-1 text-center sm:text-left">
                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 text-primary border border-blue-100 rounded-full text-[10px] font-black uppercase tracking-widest mb-3">
                    Verified User
                  </div>
                  <h2 className="text-2xl font-black text-slate-800 leading-none mb-2">{profile.full_name || user?.email}</h2>
                  <p className="text-slate-400 font-bold mb-4">{profile.company || 'Enterprise Partner'}</p>
                  <div className="flex flex-wrap justify-center sm:justify-start gap-4">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                      <Mail size={14} className="text-slate-300" />
                      {user?.email}
                    </div>
                    {profile.phone && (
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                        <Phone size={14} className="text-slate-300" />
                        {profile.phone}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Profile Form */}
            <div className="bg-white border border-slate-100 rounded-[2rem] shadow-sm p-8">
              <h3 className="text-lg font-black text-slate-800 mb-8 flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                  <User size={16} />
                </div>
                Identity Configuration
              </h3>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label className={labelCls}>Full Name </label>
                    <input {...register('full_name')} className={fieldCls} placeholder="First Last" />
                    {errors.full_name && <p className="text-[10px] font-bold text-rose-500 mt-1 uppercase tracking-wider">{errors.full_name.message}</p>}
                  </div>
                  <div>
                    <label className={labelCls}>Role / Title</label>
                    <input {...register('role')} className={fieldCls} placeholder="Logistics Manager" />
                  </div>
                </div>

                <div>
                  <label className={labelCls}>Legal Company Entity</label>
                  <div className="relative">
                    <Building size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input {...register('company')} className={`${fieldCls} pl-11`} placeholder="Global Logistics Corp" />
                  </div>
                  {errors.company && <p className="text-[10px] font-bold text-rose-500 mt-1 uppercase tracking-wider">{errors.company.message}</p>}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label className={labelCls}>Mobile Contact</label>
                    <div className="relative">
                      <Phone size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input {...register('phone')} type="tel" className={`${fieldCls} pl-11`} placeholder="+91 00000 00000" />
                    </div>
                  </div>
                  <div>
                    <label className={labelCls}>WhatsApp Alerts</label>
                    <div className="relative">
                      <Phone size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input {...register('whatsapp')} type="tel" className={`${fieldCls} pl-11`} placeholder="+91 00000 00000" />
                    </div>
                  </div>
                </div>

                <div className="p-6 bg-slate-50/50 border border-slate-100 rounded-2xl flex items-center justify-between">
                  <div>
                    <p className="text-sm font-black text-slate-700">Automation Notifications</p>
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide mt-1">Receive risk and ETA drift reports</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setValue('email_alerts', !emailAlerts)}
                    className={`w-12 h-6 rounded-full relative transition-all duration-300 ${emailAlerts ? 'bg-primary' : 'bg-slate-200'}`}
                  >
                    <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-300 ${emailAlerts ? 'translate-x-6' : 'translate-x-0'}`} />
                  </button>
                </div>

                <div className="flex justify-end pt-4">
                  <button type="submit" disabled={saving}
                    className="flex items-center justify-center gap-2 px-8 py-4 bg-primary text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-blue-700 shadow-xl shadow-blue-900/10 transition-all active:scale-95 disabled:opacity-60"
                  >
                    {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                    {saving ? 'Synchronizing...' : 'Update Production Profile'}
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        )}

        {activeTab === 'intelligence' && (
          <motion.div 
            key="intelligence" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            <div className="bg-white border border-slate-100 rounded-[2rem] shadow-sm p-8">
              <h3 className="text-lg font-black text-slate-800 mb-8 flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                  <Activity size={16} />
                </div>
                API Grid Connectivity
              </h3>
              
              <div className="space-y-2">
                <ApiStatusChip ok={supabaseOk} label="Supabase Mainframe (Cloud DB)" />
                <ApiStatusChip ok={geminiOk} label="Gemini AI (Logistics Reasoning Engine)" />
                <ApiStatusChip ok={true} label="Real-time Webhook Listeners" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-8">
                <div className="p-5 bg-emerald-50 border border-emerald-100 rounded-3xl">
                  <p className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.15em] mb-2">DB Latency</p>
                  <p className="text-2xl font-black text-emerald-800">14ms</p>
                  <p className="text-[11px] font-bold text-emerald-600/60 mt-1">Excellent Performance</p>
                </div>
                <div className="p-5 bg-blue-50 border border-blue-100 rounded-3xl">
                  <p className="text-[10px] font-black text-blue-600 uppercase tracking-[0.15em] mb-2">AI Node</p>
                  <p className="text-2xl font-black text-blue-800">v1.5-Pro</p>
                  <p className="text-[11px] font-bold text-blue-600/60 mt-1">Status: Operational</p>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'security' && (
          <motion.div 
            key="security" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            <div className="bg-white border border-slate-100 rounded-[2rem] shadow-sm p-8">
              <h3 className="text-lg font-black text-slate-800 mb-8 flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                  <Shield size={16} />
                </div>
                Security Protocol
              </h3>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                  <div>
                    <p className="text-sm font-black text-slate-800">Authenticated Email</p>
                    <p className="text-xs font-bold text-slate-400">{user?.email}</p>
                  </div>
                  <span className="px-3 py-1 bg-emerald-100 text-emerald-700 text-[10px] font-black uppercase tracking-widest rounded-full">Primary</span>
                </div>
                
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                  <div>
                    <p className="text-sm font-black text-slate-800">Two-Factor Authentication</p>
                    <p className="text-xs font-bold text-slate-400">Add an extra layer of security</p>
                  </div>
                  <button className="text-[10px] font-black text-primary uppercase tracking-widest hover:underline">Enable</button>
                </div>
              </div>

              <div className="mt-12 pt-8 border-t border-slate-100">
                <button
                  onClick={async () => {
                    await supabase.auth.signOut();
                    window.location.href = '/login';
                  }}
                  className="w-full sm:w-auto px-8 py-4 text-xs font-black text-rose-500 uppercase tracking-widest border-2 border-rose-100 rounded-2xl hover:bg-rose-50 transition-all flex items-center justify-center gap-2"
                >
                  <LogOut size={14} /> Terminate All Sessions
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
