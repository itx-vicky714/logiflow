"use client";

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Zap, Send, MessageSquare, Brain, Dot 
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function LogiBot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: 'Hello! 👋 I am **LogiBot**, your AI logistics assistant.\n\nI provide real-time tracking across all transport modes. Ask me for risk scores, shipment details, or weather updates.'
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

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setLoading(true);

    try {
      let freshShipments = [];
      let freshAlerts = [];
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: s } = await supabase.from('shipments').select('*').eq('user_id', user.id);
          const { data: a } = await supabase.from('notifications').select('*').eq('user_id', user.id).eq('is_read', false);
          if (s) freshShipments = s;
          if (a) freshAlerts = a;
        }
      } catch (e) {
        console.error('Error fetching fresh context', e);
      }

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
          shipments: freshShipments,
          alerts: freshAlerts
        })
      });

      const data = await res.json();
      if (data.error) throw new Error(data.text);

      setMessages(prev => [...prev, { role: 'assistant', content: data.text }]);
    } catch (err: unknown) {
      toast.error('Neural Link Interrupted');
      setMessages(prev => [...prev, { role: 'assistant', content: "⚠️ System error: Neural uplink failed. Please retry transmission." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating Trigger */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-8 right-8 w-16 h-16 bg-[#493ee5] text-white rounded-full shadow-2xl z-50 flex items-center justify-center border border-white/10 group overflow-hidden"
      >
        {isOpen ? <X size={28} className="group-hover:rotate-90 transition-transform duration-500" /> : <Zap size={28} className="fill-white group-hover:rotate-12 transition-transform duration-500" />}
        {!isOpen && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-primary rounded-full border-2 border-surface" />
        )}
      </motion.button>

      {/* Chat Interface */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95, filter: 'blur(10px)' }}
            animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: 20, scale: 0.95, filter: 'blur(10px)' }}
            className="fixed bottom-0 right-0 sm:bottom-28 sm:right-8 w-full sm:w-[400px] h-full sm:h-[600px] bg-white border border-slate-100 sm:rounded-[2.5rem] shadow-2xl z-50 flex flex-col overflow-hidden"
            style={{ maxWidth: '400px' }}
          >
            {/* Header */}
            <div className="p-8 border-b border-slate-50 bg-slate-50/50">
               <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-[#493ee5] text-white flex items-center justify-center shadow-lg">
                     <Brain size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter italic leading-none">LogiBot</h3>
                    <div className="flex items-center gap-1 mt-1">
                       <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                       <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">Neural Node Active</span>
                    </div>
                  </div>
               </div>
            </div>

            {/* Messages Area */}
            <div 
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-8 space-y-6 scrollbar-hide"
            >
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] p-5 rounded-3xl text-[13px] font-bold leading-relaxed shadow-sm ${
                    m.role === 'user' 
                      ? 'bg-[#493ee5] text-white rounded-tr-none' 
                      : 'bg-slate-50 text-slate-800 border border-slate-100 rounded-tl-none italic font-medium'
                  }`}>
                    {m.content.split('\n').map((line, idx) => (
                      <p key={idx} className={idx > 0 ? 'mt-3' : ''}>
                         {line.split('**').map((part, pIdx) => (
                           pIdx % 2 === 1 ? <span key={pIdx} className="text-indigo-600 font-black">{part}</span> : part
                         ))}
                      </p>
                    ))}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                   <div className="bg-slate-50 p-5 rounded-3xl rounded-tl-none border border-slate-100 text-slate-500 italic text-[11px] font-bold flex items-center gap-3">
                      <div className="w-2 h-2 bg-indigo-600 rounded-full animate-pulse" /> Processing Request...
                   </div>
                </div>
              )}
            </div>

            {/* Input Layer */}
            <div className="p-6 border-t border-slate-50 bg-slate-50/20">
               <div className="relative group">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                    placeholder="Enter strategic command..."
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 pl-6 pr-14 text-[13px] font-bold text-slate-900 focus:bg-white focus:ring-4 focus:ring-indigo-50/50 outline-none transition-all placeholder-slate-400"
                  />
                  <button 
                    onClick={handleSend}
                    disabled={!input.trim() || loading}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-[#493ee5] text-white rounded-xl flex items-center justify-center shadow-lg active:scale-90 transition-all disabled:opacity-30"
                  >
                    <Send size={18} />
                  </button>
               </div>
               <p className="text-[8px] text-slate-400 text-center mt-4 font-black uppercase tracking-[0.2em]">End-to-end encrypted neural link</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

