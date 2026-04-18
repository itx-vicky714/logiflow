"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isOptimistic: boolean;
}

const AuthContext = createContext<AuthContextType>({ user: null, loading: true, isOptimistic: true });

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOptimistic, setIsOptimistic] = useState(true);

  useEffect(() => {
    // 1. Immediate retrieval from sessionStorage (Optimistic UI)
    try {
      const cached = sessionStorage.getItem('logiflow_session_user');
      if (cached) {
        setUser(JSON.parse(cached));
        setIsOptimistic(true);
        setLoading(false); // Enable buttons immediately
      }
    } catch (e) {
      console.error('Session cache corruption', e);
    }

    // 2. Validate session in background
    const validateSession = async () => {
      const { data: { user: validatedUser } } = await supabase.auth.getUser();
      if (validatedUser) {
        setUser(validatedUser);
        sessionStorage.setItem('logiflow_session_user', JSON.stringify(validatedUser));
        // Sync to cookie for server-side Edge verification (bypassing 964ms latency)
        document.cookie = `logiflow-session=${validatedUser.id}; path=/; max-age=3600; SameSite=Lax`;
      } else {
        setUser(null);
        sessionStorage.removeItem('logiflow_session_user');
        document.cookie = 'logiflow-session=; path=/; max-age=0; SameSite=Lax';
      }
      setIsOptimistic(false);
      setLoading(false);
    };

    validateSession();

    // 3. Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const newUser = session?.user || null;
      setUser(newUser);
      if (newUser) {
        sessionStorage.setItem('logiflow_session_user', JSON.stringify(newUser));
        document.cookie = `logiflow-session=${newUser.id}; path=/; max-age=3600; SameSite=Lax`;
      } else {
        sessionStorage.removeItem('logiflow_session_user');
        document.cookie = 'logiflow-session=; path=/; max-age=0; SameSite=Lax';
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, isOptimistic }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
