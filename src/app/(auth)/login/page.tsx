"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import { Mail, Lock, Eye, EyeOff, ArrowRight, Truck, ShieldCheck, Loader2, Info } from 'lucide-react';
import { motion } from 'framer-motion';

const DEMO_EMAIL = "demo@logiflow.ai";
const DEMO_PASSWORD = "demo123456";

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters')
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

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

  const onSubmit = async (data: LoginForm) => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });
      if (error) throw error;
      toast.success('Login successful');
      window.location.replace('/dashboard');
    } catch (err: any) {
      console.error('Auth failure:', err);
      if (err.code === 'invalid_credentials' || err.message?.includes('Invalid login credentials')) {
        toast.error('Invalid email or password');
      } else {
        toast.error(err.message || 'Failed to sign in. Please try again.');
      }
      setLoading(false);
    }
  };

  const handleDemoLogin = () => {
    const data = { email: DEMO_EMAIL, password: DEMO_PASSWORD };
    // Set form values for visual feedback
    const emailInput = document.querySelector('input[name="email"]') as HTMLInputElement;
    const passwordInput = document.querySelector('input[name="password"]') as HTMLInputElement;
    if (emailInput) emailInput.value = DEMO_EMAIL;
    if (passwordInput) passwordInput.value = DEMO_PASSWORD;
    onSubmit(data);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6 font-sans selection:bg-indigo-100 selection:text-indigo-900">
      <div className="w-full max-w-[440px] animate-in fade-in slide-in-from-bottom-4 duration-700">
        
        {/* Branding */}
        <div className="flex flex-col items-center mb-10">
           <div className="w-20 h-20 bg-white rounded-[2.5rem] shadow-xl shadow-slate-200/50 flex items-center justify-center mb-6 border border-slate-100">
              <div className="w-12 h-12 bg-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-100">
                 <Truck size={24} />
              </div>
           </div>
           <h1 className="text-3xl font-black text-slate-800 tracking-tighter uppercase italic">LogiFlow</h1>
           <p className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.3em] mt-1">Enterprise Logistics Hub</p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-[3rem] p-10 md:p-12 shadow-2xl shadow-slate-200/50 border border-slate-100 relative overflow-hidden group">
           <div className="absolute -right-8 -top-8 w-32 h-32 bg-indigo-50 rounded-full blur-3xl opacity-50 group-hover:opacity-80 transition-opacity" />

           <div className="mb-6">
              <h2 className="text-2xl font-black text-slate-800 tracking-tighter uppercase italic">Welcome Back</h2>
              <p className="text-[12px] font-bold text-slate-600 uppercase tracking-widest mt-1">Sign in to manage your shipments</p>
           </div>

           {/* Demo Credentials Card */}
           <div className="mb-8 p-4 bg-indigo-50 border border-indigo-100 rounded-2xl">
             <div className="flex items-start gap-3">
               <Info className="text-indigo-600 mt-0.5 shrink-0" size={16} />
               <div className="flex-1">
                 <h3 className="text-[11px] font-black uppercase tracking-widest text-indigo-900 mb-1">Demo Access</h3>
                 <p className="text-[10px] text-indigo-700/80 mb-4 leading-relaxed font-medium">For hackathon judges, use this one-click demo account to explore the platform safely. (Ensure this user is created in Supabase Auth)</p>
                 <button 
                   type="button"
                   onClick={handleDemoLogin}
                   className="text-[10px] font-black uppercase tracking-widest bg-indigo-600 text-white px-5 py-2.5 rounded-xl hover:bg-indigo-700 transition-all shadow-sm active:scale-95 flex items-center gap-2 w-full justify-center"
                 >
                   Use Demo Account <ArrowRight size={14} />
                 </button>
               </div>
             </div>
           </div>

           <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
              <div className="space-y-6">
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2.5 ml-1 block">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-600 transition-colors" size={18} />
                    <input 
                      {...register('email')}
                      type="email" 
                      placeholder="name@company.com"
                      className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4.5 pl-14 pr-6 text-[14px] text-slate-800 font-bold transition-all outline-none focus:ring-4 focus:ring-indigo-600/5 focus:border-indigo-600 placeholder:text-slate-300"
                    />
                  </div>
                  {errors.email && <p className="text-[10px] font-black text-rose-500 mt-2 uppercase tracking-wider ml-1">{errors.email.message}</p>}
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2.5 ml-1">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Password</label>
                    <Link href="#" className="text-[10px] font-black text-indigo-600 uppercase tracking-widest hover:underline">Forgot?</Link>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                    <input 
                      {...register('password')}
                      type={showPassword ? 'text' : 'password'} 
                      placeholder="••••••••"
                      className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4.5 pl-14 pr-14 text-[14px] text-slate-800 font-bold transition-all outline-none focus:ring-4 focus:ring-indigo-600/5 focus:border-indigo-600 placeholder:text-slate-300"
                    />
                    <button 
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-300 hover:text-indigo-600 transition-colors"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  {errors.password && <p className="text-[10px] font-black text-rose-500 mt-2 uppercase tracking-wider ml-1">{errors.password.message}</p>}
                </div>
              </div>

              <button 
                type="submit" 
                disabled={loading}
                className="w-full py-5 bg-slate-900 text-white rounded-2xl text-[11px] font-black uppercase tracking-[0.3em] transition-all shadow-xl hover:bg-black active:scale-[0.98] flex items-center justify-center gap-3 disabled:opacity-70"
              >
                {loading ? <Loader2 size={18} className="animate-spin" /> : (
                  <>Sign In <ArrowRight size={16} /></>
                )}
              </button>
           </form>

           <div className="mt-12 flex flex-col items-center gap-6">
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">
                Don&apos;t have an account? <Link href="/signup" className="text-indigo-600 hover:underline font-black decoration-2">Create Account</Link>
              </p>
              
              <div className="flex items-center gap-3 pt-8 border-t border-slate-50 w-full justify-center">
                 <ShieldCheck size={16} className="text-emerald-500" />
                 <span className="text-[9px] font-black text-slate-300 uppercase tracking-[0.2em]">Secure Enterprise Grade Encryption</span>
              </div>
           </div>
        </div>

        {/* Footer */}
        <p className="text-center text-[10px] font-black text-slate-300 uppercase tracking-[0.5em] mt-12">
          © 2026 LOGIFLOW SYSTEMS
        </p>
      </div>
    </div>
  );
}
