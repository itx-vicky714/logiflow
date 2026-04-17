"use client";

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  MessageSquare, X, Send, Loader2, Sparkles, RotateCcw,
  Trash2, ChevronDown, Mic, Volume2, VolumeX, Zap
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface ShipmentRecord {
  shipment_code: string;
  origin: string;
  destination: string;
  status: string;
  risk_score: number;
  mode: string;
  [key: string]: unknown;
}

interface SpeechRecognitionEvent {
  resultIndex: number;
  results: { [index: number]: { [index: number]: { transcript: string } }; length: number };
}

interface SpeechRecognitionInstance {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((e: SpeechRecognitionEvent) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  start: () => void;
  stop: () => void;
}
import { motion, AnimatePresence } from 'framer-motion';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const QUICK_PROMPTS = [
  '🚨 High-risk shipments',
  '⏱️ Delays today?',
  '🗺️ Mumbai → Delhi route',
  '📄 E-way bill help',
  '🌧️ Baarish wali routes',
  '💼 LogiFlow features',
];

let msgCounter = 1;
function uid() { return String(msgCounter++); }

function formatContent(text: string) {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`(.*?)`/g, '<code>$1</code>')
    .replace(/\n/g, '<br/>');
}

export default function LogiBot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([{
    id: '0', role: 'assistant', timestamp: new Date(),
    content: 'Namaste! 🙏 I\'m **LogiBot**, your AI logistics co-pilot.\n\nI speak English, Hindi & Hinglish. Ask me anything about your shipments, routes, risk, or GST compliance.'
  }]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [retryPayload, setRetryPayload] = useState<string | null>(null);
  const [shipments, setShipments] = useState<ShipmentRecord[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);

  // Load shipments
  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      // Fetch all shipments to allow grounding for "total shipments" etc.
      // Limit to 200 for performance, usually enough for a dashboard context
      const { data } = await supabase.from('shipments').select('*').eq('user_id', user.id).limit(200);
      if (data) setShipments(data);
    };
    load();
  }, []);

  // Speech Recognition setup
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const w = window as typeof window & { SpeechRecognition?: new () => SpeechRecognitionInstance; webkitSpeechRecognition?: new () => SpeechRecognitionInstance };
    const SpeechRecognition = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!SpeechRecognition) return;
    const rec = new SpeechRecognition();
    rec.continuous = false;
    rec.interimResults = true;
    rec.lang = 'hi-IN';
    rec.onresult = (e: SpeechRecognitionEvent) => {
      let t = '';
      for (let i = e.resultIndex; i < e.results.length; i++) t += e.results[i][0].transcript;
      setInput(t);
    };
    rec.onend = () => setIsListening(false);
    rec.onerror = () => setIsListening(false);
    recognitionRef.current = rec;
  }, []);

  // Auto-focus on open
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 200);
  }, [open]);

  // Scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const speakText = (text: string) => {
    if (!voiceEnabled || !('speechSynthesis' in window)) return;
    const clean = text.replace(/[🔥☁️🌧️⚠️⏱️🚨📄💼💰🙏\*\#`]/g, '');
    const utterance = new SpeechSynthesisUtterance(clean);
    const voices = window.speechSynthesis.getVoices();
    // Try to find an Indian/Hindi voice
    const prefVoice = voices.find(v => v.lang.includes('hi') || v.lang.includes('IN')) || voices[0];
    if (prefVoice) utterance.voice = prefVoice;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  };

  const toggleListen = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else if (recognitionRef.current) {
      setInput('');
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  const send = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    if (isListening) { recognitionRef.current?.stop(); setIsListening(false); }

    const userMsg: Message = { id: uid(), role: 'user', content: trimmed, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);
    setRetryPayload(null);

    // Fetch fresh manifest data for factual grounding before every request
    let freshShipments = shipments;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase.from('shipments').select('*').eq('user_id', user.id).limit(200);
        if (data) {
          setShipments(data);
          freshShipments = data;
        }
      }
    } catch (e) { console.error("Grounding sync failed", e); }

    const history = messages.filter(m => m.id !== '0').map(m => ({ role: m.role, content: m.content }));

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: trimmed, history, shipments: freshShipments })
      });
      if (!res.ok) throw new Error(`${res.status}`);
      const data = await res.json();
      const responseText = data.text || 'Unable to generate a response. Please try again.';
      setMessages(prev => [...prev, { id: uid(), role: 'assistant', content: responseText, timestamp: new Date() }]);
      speakText(responseText);
    } catch {
      const fallback = 'Connection issue. Please check your internet and retry.';
      setMessages(prev => [...prev, { id: uid(), role: 'assistant', content: fallback, timestamp: new Date() }]);
      setRetryPayload(trimmed);
    } finally {
      setLoading(false);
    }
  }, [messages, loading, shipments, isListening, voiceEnabled]);

  const handleRetry = () => {
    if (retryPayload) {
      setMessages(prev => prev.slice(0, -1));
      send(retryPayload);
      setRetryPayload(null);
    }
  };

  const clearChat = () => {
    setMessages([{ id: uid(), role: 'assistant', timestamp: new Date(), content: 'Chat cleared. How can I help?' }]);
    setRetryPayload(null);
  };

  return (
    <>
      {/* FAB */}
      <motion.button
        onClick={() => setOpen(o => !o)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="fixed bottom-6 right-6 z-[9000] w-14 h-14 rounded-2xl bg-gradient-to-br from-[#3b5bdb] to-[#0ea5e9] text-white shadow-2xl shadow-blue-500/40 flex items-center justify-center transition-shadow"
        aria-label="LogiBot AI Assistant"
      >
        <AnimatePresence mode="wait">
          {open
            ? <motion.div key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.15 }}><ChevronDown size={22} /></motion.div>
            : <motion.div key="open" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.15 }}><MessageSquare size={22} /></motion.div>
          }
        </AnimatePresence>
        {!open && (
          <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-emerald-400 rounded-full border-2 border-white shadow-sm animate-pulse" />
        )}
      </motion.button>

      {/* Chat Window */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.95 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="fixed bottom-24 right-4 sm:right-6 z-[9000] flex flex-col rounded-2xl overflow-hidden shadow-2xl"
            style={{
              width: 'min(420px, 92vw)',
              maxHeight: 'min(700px, 85vh)',
              boxShadow: '0 25px 60px rgba(15,23,42,0.18), 0 0 0 1px rgba(148,163,184,0.1)',
              background: 'white'
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-[#2d4fc4] via-[#3b5bdb] to-[#0ea5e9] shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/15 backdrop-blur-sm rounded-xl flex items-center justify-center border border-white/20">
                  <Sparkles size={18} className="text-white" />
                </div>
                <div>
                  <div className="font-black text-[15px] text-white tracking-wide">LogiBot AI</div>
                  <div className="flex items-center gap-1.5 text-[11px] text-white/80 font-bold mt-0.5">
                    <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.9)]" />
                    {shipments.length > 0 ? `${shipments.length} shipments synced` : 'Online · Ready'}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setVoiceEnabled(v => { if (v) window.speechSynthesis?.cancel(); return !v; })}
                  className={`p-2 rounded-lg transition-all ${voiceEnabled ? 'bg-white/20 text-white' : 'text-white/60 hover:text-white hover:bg-white/10'}`}
                  title={voiceEnabled ? 'Mute' : 'Enable voice'}
                >
                  {voiceEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
                </button>
                <button onClick={clearChat} className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-all" title="Clear chat">
                  <Trash2 size={16} />
                </button>
                <button onClick={() => setOpen(false)} className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-all">
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0 bg-slate-50/30">
              {messages.map(m => (
                <div key={m.id} className={`flex gap-3 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {m.role === 'assistant' && (
                    <div className="w-8 h-8 rounded-xl bg-[#3b5bdb] flex items-center justify-center shrink-0 mt-1 shadow-sm border border-[#3b5bdb]/10">
                      <Sparkles size={14} className="text-white" />
                    </div>
                  )}
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    className={`max-w-[85%] px-4 py-3 rounded-2xl text-[14px] leading-relaxed shadow-sm ${
                      m.role === 'user'
                        ? 'bg-slate-900 text-white rounded-br-none font-bold'
                        : 'bg-white text-slate-800 border border-slate-200/60 rounded-bl-none font-medium'
                    }`}
                  >
                    {m.role === 'assistant'
                      ? <div className="custom-markdown space-y-2" dangerouslySetInnerHTML={{ __html: formatContent(m.content) }} />
                      : <div className="whitespace-pre-wrap">{m.content}</div>
                    }
                    <div className={`text-[9px] mt-1.5 font-black uppercase tracking-widest opacity-60 ${
                      m.role === 'user' ? 'text-blue-100 text-right' : 'text-slate-400'
                    }`}>
                      {m.timestamp.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </motion.div>
                </div>
              ))}

              {/* Listening indicator */}
              {isListening && (
                <div className="flex gap-2.5 justify-end">
                  <div className="px-5 py-3.5 bg-indigo-50 border border-indigo-200 rounded-2xl flex items-center gap-3 shadow-sm">
                    <div className="flex items-end gap-1 h-5">
                      {[1, 2, 3, 4, 5].map(i => (
                        <motion.div
                          key={i}
                          className="w-1 bg-[#3b5bdb] rounded-full"
                          animate={{ height: ['4px', '20px', '4px'] }}
                          transition={{ duration: 0.6, delay: i * 0.1, repeat: Infinity }}
                        />
                      ))}
                    </div>
                    <span className="text-[13px] font-black text-[#3b5bdb] uppercase tracking-wider">Listening...</span>
                  </div>
                </div>
              )}

              {/* Typing indicator */}
              {loading && (
                <div className="flex gap-3 justify-start">
                  <div className="w-8 h-8 rounded-xl bg-[#3b5bdb] flex items-center justify-center shrink-0 mt-1">
                    <Sparkles size={14} className="text-white" />
                  </div>
                  <div className="bg-white border border-slate-200/60 rounded-2xl px-5 py-3.5 shadow-sm">
                    <div className="flex items-center gap-1.5">
                      {[0, 1, 2].map(i => (
                        <motion.div
                          key={i}
                          className="w-2 h-2 bg-indigo-400 rounded-full"
                          animate={{ scale: [1, 1.4, 1], opacity: [0.5, 1, 0.5] }}
                          transition={{ duration: 0.8, delay: i * 0.2, repeat: Infinity }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Retry */}
              {retryPayload && !loading && (
                <div className="flex justify-center">
                  <button
                    onClick={handleRetry}
                    className="flex items-center gap-2 text-[11px] font-black px-5 py-2.5 bg-white hover:bg-slate-50 text-slate-600 rounded-xl border border-slate-200 transition-all shadow-sm active:scale-95 uppercase tracking-widest"
                  >
                    <RotateCcw size={13} /> Tap to Retry
                  </button>
                </div>
              )}

              <div ref={bottomRef} className="h-4" />
            </div>

            {/* Quick Prompts — ONLY first message */}
            {messages.length === 1 && !loading && (
              <div className="px-5 py-4 flex flex-wrap gap-2 border-t border-slate-100 bg-white shadow-inner">
                {QUICK_PROMPTS.map(p => (
                  <button
                    key={p}
                    onClick={() => send(p)}
                    disabled={loading}
                    className="text-[11px] font-black px-4 py-2.5 rounded-xl bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 hover:text-[#3b5bdb] text-slate-600 transition-all active:scale-95 disabled:opacity-50 uppercase tracking-tighter"
                  >
                    {p}
                  </button>
                ))}
              </div>
            )}

            {/* Input Overlay for Listening Mode */}
            <AnimatePresence>
              {isListening && (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
                  className="absolute inset-x-0 bottom-0 p-4 bg-white/95 backdrop-blur-md z-[10] border-t border-indigo-100 flex flex-col items-center gap-3"
                >
                  <div className="text-sm font-black text-slate-800 animate-pulse">{input || 'Say something...'}</div>
                  <button onClick={toggleListen} className="w-12 h-12 bg-rose-500 text-white rounded-full flex items-center justify-center shadow-lg shadow-rose-200 hover:scale-105 active:scale-95 transition-all">
                    <X size={20} />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Input Container */}
            <div className="p-4 border-t border-slate-100 bg-white grid grid-cols-[1fr,auto] gap-3 items-end">
              <div className="flex items-center bg-slate-50 border border-slate-200 rounded-2xl focus-within:border-[#3b5bdb] focus-within:ring-4 focus-within:ring-indigo-50 focus-within:bg-white transition-all overflow-hidden group">
                <input
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input); } }}
                  placeholder="Type your query..."
                  disabled={loading || isListening}
                  className="w-full bg-transparent text-[14px] font-semibold text-slate-800 px-4 py-4 focus:outline-none placeholder-slate-400 disabled:opacity-50"
                  autoComplete="off"
                />
                <button
                  onClick={toggleListen}
                  disabled={loading || isListening}
                  className="p-3 mr-1 text-slate-400 hover:text-[#3b5bdb] hover:bg-indigo-50 rounded-xl transition-all disabled:opacity-30 group-focus-within:text-[#3b5bdb]"
                  title="Voice input"
                >
                  <Mic size={18} />
                </button>
              </div>
              <button
                onClick={() => send(input)}
                disabled={!input.trim() || loading || isListening}
                className="h-[52px] w-[52px] flex items-center justify-center bg-gradient-to-br from-[#3b5bdb] to-[#1e3a8a] text-white rounded-2xl shadow-xl shadow-blue-500/20 hover:shadow-blue-500/40 hover:scale-105 transition-all disabled:opacity-40 disabled:scale-100 active:scale-95"
              >
                {loading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
