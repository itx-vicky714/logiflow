"use client";

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { AlertCircle, Zap } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const SUGGESTIONS = [
  'Generate high-risk manifest summary',
  'What is the weather impact on Road NH-48?',
  'Calculate revenue forecast for next 30 days',
  'Audit delayed rail shipments'
];

export default function AIChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: 'Namaste! I am **LogiBot**, your supply chain neural node. How can I optimize your logistics protocol today?'
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = useCallback(async (text?: string) => {
    const userMsg = text || input.trim();
    if (!userMsg || loading) return;

    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          message: userMsg,
          history: messages.map(m => ({
            role: m.role === 'user' ? 'user' : 'model',
            content: m.content
          })),
        })
      });

      const data = await res.json();
      if (data.error) throw new Error(data.text);

      setMessages(prev => [...prev, { role: 'assistant', content: data.text }]);
    } catch (err: any) {
      toast.error('Connection error');
      setMessages(prev => [...prev, { role: 'assistant', content: "⚠️ System error: Neural uplink failed. Please re-synchronize." }]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, messages]);

  return (
    <div className="flex flex-col h-[calc(100vh-10rem)] max-w-5xl mx-auto font-['Inter'] antialiased tracking-tight">
      
      {/* Header Segment */}
      <div className="mb-8 flex items-center justify-between shrink-0">
         <div className="flex items-center gap-5">
            <div className="w-14 h-14 rounded-2xl bg-on-surface text-inverse-on-surface flex items-center justify-center shadow-2xl">
               <span className="material-symbols-outlined text-[28px]">psychology</span>
            </div>
            <div>
               <h1 className="text-3xl font-black text-on-surface tracking-tighter uppercase italic">Neural Command Center</h1>
               <div className="flex items-center gap-2 mt-1">
                  <span className="status-pulse bg-primary" />
                  <p className="text-[10px] font-black text-on-surface-variant uppercase tracking-[0.3em]">LogiBot Intelligence Node v3.4</p>
               </div>
            </div>
         </div>
      </div>

      <div className="flex-1 bg-surface-container-lowest border border-white/50 rounded-[3rem] curated-shadow flex flex-col overflow-hidden relative">
        <div className="flex-1 overflow-y-auto p-12 space-y-8 scrollbar-hide" ref={scrollRef}>
          {messages.map((m, idx) => (
            <div key={idx} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[75%] p-6 rounded-3xl text-[14px] font-bold leading-relaxed shadow-sm ${
                m.role === 'user' 
                  ? 'bg-on-surface text-inverse-on-surface rounded-tr-none' 
                  : 'bg-surface-container-low text-on-surface border border-white/50 rounded-tl-none italic'
              }`}>
                {m.content.split('\n').map((line, lIdx) => (
                  <p key={lIdx} className={lIdx > 0 ? 'mt-4' : ''}>
                     {line.split('**').map((part, pIdx) => (
                       pIdx % 2 === 1 ? <span key={pIdx} className="text-primary font-black">{part}</span> : part
                     ))}
                  </p>
                ))}
              </div>
            </div>
          ))}
          
          {loading && (
            <div className="flex justify-start px-12 mt-4">
              <div className="bg-surface-container-low p-6 rounded-3xl rounded-tl-none border border-white/50 text-on-surface-variant italic text-[12px] font-black flex items-center gap-4">
                 <span className="status-pulse bg-primary w-2 h-2" /> 
                 <span className="animate-pulse">Synthesizing supply chain logic...</span>
              </div>
            </div>
          )}
        </div>

        {/* Input & Directive Control */}
        <div className="p-8 border-t border-surface-container bg-surface-container-low/50 relative z-20 shrink-0">
          
          <div className="flex flex-wrap gap-2 mb-6 max-h-32 overflow-y-auto custom-scrollbar">
            {SUGGESTIONS.map(s => (
               <button 
                key={s} onClick={() => handleSend(s)}
                className="px-4 py-2 bg-surface-container-lowest border border-white/50 rounded-xl text-[9px] font-black uppercase tracking-widest text-primary hover:bg-on-surface hover:text-white transition-all shadow-sm active:scale-95 whitespace-nowrap"
               >
                 {s}
               </button>
            ))}
          </div>

          <div className="relative group">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Enter strategic command vector..."
              className="w-full bg-surface-container-lowest border-none rounded-2xl py-6 pl-8 pr-20 text-[14px] font-bold text-on-surface focus:ring-4 focus:ring-[#493ee5]/5 shadow-inner outline-none transition-all placeholder-on-surface-variant/30"
            />
            <button 
              onClick={() => handleSend()}
              disabled={!input.trim() || loading}
              className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-on-surface text-inverse-on-surface rounded-xl flex items-center justify-center shadow-2xl active:scale-90 transition-all disabled:opacity-30 disabled:pointer-events-none group-hover:scale-110"
            >
              <span className="material-symbols-outlined text-[20px]">send</span>
            </button>
          </div>
          <p className="text-[9px] text-on-surface-variant/40 text-center mt-6 font-black uppercase tracking-[0.4em] italic">Neural protocol sequence secured by enterprise-grade encryption</p>
        </div>
      </div>
    </div>
  );
}

