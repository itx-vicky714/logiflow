"use client";

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function LogiBot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: 'Namaste! 🙏 I am **LogiBot**, your orbital intelligence node.\n\nI process real-time telemetry across the India corridor. Ask me for risk profiles, manifest audits, or weather impact reports.'
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
            parts: [{ text: m.content }]
          }))
        })
      });

      const data = await res.json();
      if (data.error) throw new Error(data.text);

      setMessages(prev => [...prev, { role: 'assistant', content: data.text }]);
    } catch (err: any) {
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
        className="fixed bottom-8 right-8 w-16 h-16 bg-on-surface text-inverse-on-surface rounded-full shadow-2xl z-50 flex items-center justify-center border border-white/10 group overflow-hidden"
      >
        <span className="material-symbols-outlined text-[28px] group-hover:rotate-12 transition-transform duration-500">
           {isOpen ? 'close' : 'bolt'}
        </span>
        {!isOpen && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-primary rounded-full border-2 border-surface status-pulse" />
        )}
      </motion.button>

      {/* Chat Interface */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95, filter: 'blur(10px)' }}
            animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: 20, scale: 0.95, filter: 'blur(10px)' }}
            className="fixed bottom-28 right-8 w-[400px] h-[600px] bg-surface-container-lowest border border-white/50 rounded-[2.5rem] curated-shadow z-50 flex flex-col overflow-hidden"
            style={{ contentVisibility: 'auto', containIntrinsicSize: '400px 600px' }}
          >
            {/* Header */}
            <div className="p-8 border-b border-surface-container bg-surface-container-low/30">
               <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-on-surface text-inverse-on-surface flex items-center justify-center shadow-lg">
                     <span className="material-symbols-outlined text-[24px]">psychology</span>
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-on-surface uppercase tracking-tighter italic">LogiBot</h3>
                    <div className="flex items-center gap-2 mt-1">
                       <span className="status-pulse bg-primary" />
                       <span className="text-[9px] font-black text-on-surface-variant uppercase tracking-[0.2em]">Neural Node Active</span>
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
                      ? 'bg-on-surface text-inverse-on-surface rounded-tr-none' 
                      : 'bg-surface-container-low text-on-surface border border-white/50 rounded-tl-none italic'
                  }`}>
                    {m.content.split('\n').map((line, idx) => (
                      <p key={idx} className={idx > 0 ? 'mt-3' : ''}>
                         {line.split('**').map((part, pIdx) => (
                           pIdx % 2 === 1 ? <span key={pIdx} className="text-primary">{part}</span> : part
                         ))}
                      </p>
                    ))}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                   <div className="bg-surface-container-low p-5 rounded-3xl rounded-tl-none border border-white/50 text-on-surface-variant italic text-[11px] font-black flex items-center gap-3">
                      <span className="status-pulse bg-primary w-2 h-2" /> Processing Request...
                   </div>
                </div>
              )}
            </div>

            {/* Input Layer */}
            <div className="p-6 border-t border-surface-container bg-surface-container-low/20">
               <div className="relative group">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                    placeholder="Enter strategic command..."
                    className="w-full bg-surface-container-lowest border-none rounded-2xl py-4 pl-6 pr-14 text-[13px] font-bold text-on-surface focus:ring-2 focus:ring-[#493ee5]/10 shadow-inner outline-none transition-all placeholder-on-surface-variant/30"
                  />
                  <button 
                    onClick={handleSend}
                    disabled={!input.trim() || loading}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-on-surface text-inverse-on-surface rounded-xl flex items-center justify-center shadow-lg active:scale-90 transition-all disabled:opacity-30"
                  >
                    <span className="material-symbols-outlined text-[18px]">send</span>
                  </button>
               </div>
               <p className="text-[8px] text-on-surface-variant/40 text-center mt-4 font-black uppercase tracking-[0.2em]">End-to-end encrypted neural link</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
