"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters')
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema)
  });

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        window.location.href = window.location.origin + '/dashboard';
      }
    };
    checkSession();
  }, []);

  const [showPassword, setShowPassword] = useState(false);

  const onSubmit = async (data: LoginForm) => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });
      if (error) throw error;
      toast.success('System Access Authorized');
      window.location.replace('/dashboard');
    } catch (err: any) {
      console.error('Auth failure:', err);
      // Handle professional error codes
      if (err.code === 'invalid_credentials' || err.message?.includes('Invalid login credentials')) {
        toast.error('Identity Mismatch: Invalid credentials provided');
      } else if (err.status === 400 || err.message?.includes('400')) {
        toast.error('Protocol Error: Check input format');
      } else {
        toast.error('Terminal Error: ' + (err.message || 'Authentication Sequence Failed'));
      }
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface p-6 font-['Inter'] antialiased tracking-tight text-[#191c1e] animate-in fade-in duration-1000">
      <div className="w-full max-w-[480px]">
        
        {/* Terminal Branding */}
        <div className="flex flex-col items-center mb-12">
           <div className="w-20 h-20 bg-surface-container-lowest rounded-[2.5rem] border border-white/50 shadow-2xl flex items-center justify-center mb-6 hover:scale-105 transition-transform duration-700">
              <div className="w-10 h-10 bg-on-surface text-inverse-on-surface rounded-2xl flex items-center justify-center">
                 <span className="material-symbols-outlined text-[24px]">bolt</span>
              </div>
           </div>
           <h1 className="text-4xl font-black text-on-surface tracking-tighter uppercase italic">Control Tower</h1>
           <p className="text-[10px] font-black text-on-surface-variant uppercase tracking-[0.4em] mt-1">Integrated Supply Chain Gateway</p>
        </div>

        {/* Access Protocol Card */}
        <div className="bg-surface-container-lowest border border-white/50 rounded-[3rem] p-12 curated-shadow relative overflow-hidden group">
           <span className="material-symbols-outlined absolute -right-12 -top-12 text-[200px] opacity-[0.02] rotate-12 group-hover:rotate-6 transition-transform duration-1000">security</span>

           <div className="mb-10 text-center">
              <h2 className="text-2xl font-black text-on-surface tracking-tighter uppercase mb-2">Gatekeeper Auth</h2>
              <p className="text-[12px] font-bold text-on-surface-variant uppercase tracking-widest italic leading-tight">Initialize secure terminal</p>
           </div>

           <form onSubmit={handleSubmit(onSubmit)} className="space-y-10">
              <div className="space-y-6">
                <div>
                  <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest mb-3 ml-1 block">Vector: Email Registry</label>
                  <div className="relative group/input">
                    <span className="material-symbols-outlined absolute left-6 top-1/2 -translate-y-1/2 text-on-surface-variant group-focus-within/input:text-[#493ee5] transition-colors text-[18px]">mail</span>
                    <input 
                      {...register('email')}
                      type="email" 
                      placeholder="node.operator@logiflow.io"
                      className="w-full bg-surface-container-low border-none rounded-2xl py-4.5 pl-14 pr-6 text-[14px] text-on-surface font-bold transition-all shadow-inner outline-none placeholder-on-surface-variant/20 focus:ring-4 focus:ring-[#493ee5]/5"
                    />
                  </div>
                  {errors.email && <p className="text-[10px] font-black text-error mt-2 uppercase tracking-wider ml-1">{errors.email.message}</p>}
                </div>

                <div>
                  <div className="flex justify-between items-center mb-3 ml-1">
                    <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest">Key: Decryption Code</label>
                    <button type="button" className="text-[10px] font-black text-primary uppercase tracking-widest hover:underline decoration-2">Reset</button>
                  </div>
                  <div className="relative group/input">
                    <span className="material-symbols-outlined absolute left-6 top-1/2 -translate-y-1/2 text-on-surface-variant group-focus-within/input:text-[#493ee5] transition-colors text-[18px]">lock</span>
                    <input 
                      {...register('password')}
                      type={showPassword ? 'text' : 'password'} 
                      placeholder="••••••••••••"
                      className="w-full bg-surface-container-low border-none rounded-2xl py-4.5 pl-14 pr-14 text-[14px] text-on-surface font-bold transition-all shadow-inner outline-none placeholder-on-surface-variant/20 focus:ring-4 focus:ring-[#493ee5]/5"
                    />
                    <button 
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-6 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-[#493ee5] transition-colors"
                    >
                      <span className="material-symbols-outlined text-[20px]">
                        {showPassword ? 'visibility_off' : 'visibility'}
                      </span>
                    </button>
                  </div>
                  {errors.password && <p className="text-[10px] font-black text-error mt-2 uppercase tracking-wider ml-1">{errors.password.message}</p>}
                </div>
              </div>

              <button 
                type="submit" 
                disabled={loading}
                className="w-full py-5.5 bg-on-surface text-inverse-on-surface rounded-2xl text-[11px] font-black uppercase tracking-[0.3em] transition-all shadow-2xl hover:bg-black active:scale-[0.98] flex items-center justify-center gap-4 disabled:opacity-70 group/btn"
              >
                {loading ? <div className="status-pulse bg-primary w-4 h-4" /> : (
                  <>Authorize Entry <span className="material-symbols-outlined text-[14px] group-hover/btn:translate-x-1 transition-transform">east</span></>
                )}
              </button>
           </form>

           <div className="mt-12 flex flex-col items-center gap-4">
              <p className="text-[11px] font-bold text-on-surface-variant uppercase tracking-widest italic">
                Null interface? <Link href="/signup" className="text-primary hover:underline font-black decoration-2">Generate Operational Node</Link>
              </p>
              
              <div className="flex items-center gap-3 pt-6 border-t border-surface-container w-full justify-center">
                 <span className="material-symbols-outlined text-emerald-500 text-[16px]">verified_user</span>
                 <span className="text-[9px] font-black text-on-surface-variant/40 uppercase tracking-[0.2em]">Encrypted SSL Payload Secure</span>
              </div>
           </div>
        </div>

        {/* Tactical Footer */}
        <p className="text-center text-[10px] font-black text-on-surface-variant/20 uppercase tracking-[0.5em] mt-12 italic">
          © 2026 LOGIFLOW SYSTEMS • GRID-STABLE
        </p>
      </div>
    </div>
  );
}
