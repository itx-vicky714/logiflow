"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';

const signupSchema = z.object({
  fullName: z.string().min(2, 'Name is required'),
  company: z.string().min(2, 'Company is required'),
  role: z.enum(['supplier', 'manufacturer', 'distributor']),
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters')
});

type SignupForm = z.infer<typeof signupSchema>;

export default function SignupPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<SignupForm>({
    resolver: zodResolver(signupSchema)
  });

  const onSubmit = async (data: SignupForm) => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            full_name: data.fullName,
            company: data.company,
            role: data.role
          }
        }
      });

      if (error) throw error;
      
      toast.success('Node Provisioned. You can now authorize entry.');
      router.push('/login');
    } catch (err: any) {
      toast.error('Node Provisioning Sequence Failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface p-6 font-['Inter'] antialiased tracking-tight text-[#191c1e] animate-in fade-in duration-1000">
      <div className="w-full max-w-[540px]">
        
        {/* Terminal Branding */}
        <div className="flex flex-col items-center mb-10">
           <div className="w-20 h-20 bg-surface-container-lowest rounded-[2.5rem] border border-white/50 shadow-2xl flex items-center justify-center mb-6 hover:scale-105 transition-transform duration-700">
              <div className="w-10 h-10 bg-on-surface text-inverse-on-surface rounded-2xl flex items-center justify-center">
                 <span className="material-symbols-outlined text-[24px]">add_task</span>
              </div>
           </div>
           <h1 className="text-4xl font-black text-on-surface tracking-tighter uppercase italic">Initialize Node</h1>
           <p className="text-[10px] font-black text-on-surface-variant uppercase tracking-[0.4em] mt-1">LogiFlow Strategy Module Deployment</p>
        </div>

        {/* Deployment Protocol Card */}
        <div className="bg-surface-container-lowest border border-white/50 rounded-[3rem] p-12 curated-shadow relative overflow-hidden group">
           <span className="material-symbols-outlined absolute -right-12 -top-12 text-[200px] opacity-[0.02] rotate-12 group-hover:rotate-[24deg] transition-transform duration-1000">settings_suggest</span>

           <div className="mb-10 text-center">
              <h2 className="text-2xl font-black text-on-surface tracking-tighter uppercase mb-2">Operational Onboarding</h2>
              <p className="text-[12px] font-bold text-on-surface-variant uppercase tracking-widest italic leading-tight">Deploy your node to the LogiFlow strategic grid</p>
           </div>

           <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest mb-3 ml-1 block">Legal Identity</label>
                  <div className="relative group/input">
                    <span className="material-symbols-outlined absolute left-6 top-1/2 -translate-y-1/2 text-on-surface-variant group-focus-within/input:text-[#493ee5] transition-colors text-[18px]">person</span>
                    <input 
                      {...register('fullName')}
                      type="text" 
                      placeholder="Operator Name"
                      className="w-full bg-surface-container-low border-none rounded-2xl py-4.5 pl-14 pr-6 text-[13px] text-on-surface font-bold transition-all shadow-inner outline-none placeholder-on-surface-variant/20 focus:ring-4 focus:ring-[#493ee5]/5"
                    />
                  </div>
                  {errors.fullName && <p className="text-[10px] font-black text-error mt-2 uppercase tracking-wider ml-1">{errors.fullName.message}</p>}
                </div>

                <div>
                  <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest mb-3 ml-1 block">Entity Identity</label>
                  <div className="relative group/input">
                    <span className="material-symbols-outlined absolute left-6 top-1/2 -translate-y-1/2 text-on-surface-variant group-focus-within/input:text-[#493ee5] transition-colors text-[18px]">corporate_fare</span>
                    <input 
                      {...register('company')}
                      type="text" 
                      placeholder="Corp Entity"
                      className="w-full bg-surface-container-low border-none rounded-2xl py-4.5 pl-14 pr-6 text-[13px] text-on-surface font-bold transition-all shadow-inner outline-none placeholder-on-surface-variant/20 focus:ring-4 focus:ring-[#493ee5]/5"
                    />
                  </div>
                  {errors.company && <p className="text-[10px] font-black text-error mt-2 uppercase tracking-wider ml-1">{errors.company.message}</p>}
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest mb-3 ml-1 block">Operational Vector Grid Role</label>
                <div className="relative group/input">
                  <span className="material-symbols-outlined absolute left-6 top-1/2 -translate-y-1/2 text-on-surface-variant group-focus-within/input:text-[#493ee5] transition-colors text-[18px] pointer-events-none">engineering</span>
                  <select 
                    {...register('role')}
                    className="w-full bg-surface-container-low border-none rounded-2xl py-4.5 pl-14 pr-10 text-[13px] text-on-surface font-bold transition-all shadow-inner outline-none appearance-none focus:ring-4 focus:ring-[#493ee5]/5"
                  >
                    <option value="supplier">Supplier Channel Hub</option>
                    <option value="manufacturer">Manufacturing Strategic Unit</option>
                    <option value="distributor">Regional Distribution Network</option>
                  </select>
                  <span className="material-symbols-outlined absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-on-surface-variant text-[18px]">expand_more</span>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest mb-3 ml-1 block">Access Vector: Email Registry</label>
                <div className="relative group/input">
                  <span className="material-symbols-outlined absolute left-6 top-1/2 -translate-y-1/2 text-on-surface-variant group-focus-within/input:text-[#493ee5] transition-colors text-[18px]">mail</span>
                  <input 
                    {...register('email')}
                    type="email" 
                    placeholder="operator@protocol.io"
                    className="w-full bg-surface-container-low border-none rounded-2xl py-4.5 pl-14 pr-6 text-[13px] text-on-surface font-bold transition-all shadow-inner outline-none placeholder-on-surface-variant/20 focus:ring-4 focus:ring-[#493ee5]/5"
                  />
                </div>
                {errors.email && <p className="text-[10px] font-black text-error mt-2 uppercase tracking-wider ml-1">{errors.email.message}</p>}
              </div>

              <div>
                <label className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest mb-3 ml-1 block">Vector Key: Decryption Code</label>
                <div className="relative group/input">
                  <span className="material-symbols-outlined absolute left-6 top-1/2 -translate-y-1/2 text-on-surface-variant group-focus-within/input:text-[#493ee5] transition-colors text-[18px]">lock</span>
                  <input 
                    {...register('password')}
                    type="password" 
                    placeholder="••••••••••••"
                    className="w-full bg-surface-container-low border-none rounded-2xl py-4.5 pl-14 pr-6 text-[13px] text-on-surface font-bold transition-all shadow-inner outline-none placeholder-on-surface-variant/20 focus:ring-4 focus:ring-[#493ee5]/5"
                  />
                </div>
                {errors.password && <p className="text-[10px] font-black text-error mt-2 uppercase tracking-wider ml-1">{errors.password.message}</p>}
              </div>

              <button 
                type="submit" 
                disabled={loading}
                className="w-full py-5.5 bg-on-surface text-inverse-on-surface rounded-2xl text-[11px] font-black uppercase tracking-[0.3em] transition-all shadow-2xl hover:bg-black active:scale-[0.98] flex items-center justify-center gap-4 disabled:opacity-70 mt-4 group/btn"
              >
                {loading ? <div className="status-pulse bg-primary w-4 h-4" /> : (
                  <>Deploy Shipment <span className="material-symbols-outlined text-[16px] group-hover/btn:translate-x-1 transition-transform">east</span></>
                )}
              </button>
           </form>

           <div className="mt-12 flex flex-col items-center gap-4 text-center">
              <p className="text-[11px] font-bold text-on-surface-variant uppercase tracking-widest italic">
                Node already instantiated? <Link href="/login" className="text-primary hover:underline font-black decoration-2">Authorize Entry</Link>
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

