"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Send, Bot, User, Copy, Check, Loader2, Sparkles } from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

const SUGGESTED_PROMPTS = [
  "Why is my shipment delayed?",
  "Best route Delhi to Chennai?",
  "Optimize my supply chain costs",
  "Predict monsoon disruptions"
];

export default function AiChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('logibot_chat_history');
    if (saved) {
      setMessages(JSON.parse(saved));
    } else {
      setMessages([{
        id: '1',
        role: 'assistant',
        content: 'Namaste! I am LogiBot, your AI supply chain expert. How can I help you optimize your logistics today?'
      }]);
    }
  }, []);

  // Save to localStorage on change
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem('logibot_chat_history', JSON.stringify(messages));
    }
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (text: string) => {
    if (!text.trim() || loading) return;

    const userMessage: Message = { id: Date.now().toString(), role: 'user', content: text };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages })
      });

      if (!response.ok) throw new Error('API Error');

      const data = await response.json();
      
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.text || data.error
      }]);
    } catch (error) {
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "Sorry, I'm having trouble connecting to the LogiFlow AI network right now."
      }]);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      <div className="mb-4 shrink-0">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Bot className="text-primary" size={32} />
          LogiBot AI
        </h1>
        <p className="text-muted-foreground mt-1">Your intelligent logistics and supply chain assistant.</p>
      </div>

      <div className="flex-1 glass-panel flex flex-col overflow-hidden relative">
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {messages.map((message) => (
            <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`flex gap-3 max-w-[85%] ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                  message.role === 'user' 
                    ? 'bg-blue-600 shadow-[0_0_10px_#2563eb]' 
                    : 'bg-primary shadow-[0_0_10px_#8b5cf6]'
                }`}>
                  {message.role === 'user' ? <User size={16} className="text-white"/> : <Bot size={16} className="text-white" />}
                </div>
                
                <div className={`group relative p-4 rounded-2xl ${
                  message.role === 'user' 
                    ? 'bg-secondary border border-border rounded-tr-none text-white text-sm' 
                    : 'bg-white/5 border border-primary/20 rounded-tl-none text-slate-200 text-sm'
                }`}>
                  <div className="whitespace-pre-wrap leading-relaxed">{message.content}</div>
                  
                  {message.role === 'assistant' && (
                    <button 
                      onClick={() => copyToClipboard(message.id, message.content)}
                      className="absolute -right-10 top-2 p-1.5 rounded-md hover:bg-white/10 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      {copiedId === message.id ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
          
          {loading && (
            <div className="flex justify-start">
              <div className="flex gap-3 max-w-[80%]">
                <div className="w-8 h-8 rounded-full bg-primary shadow-[0_0_10px_#8b5cf6] flex items-center justify-center shrink-0">
                  <Bot size={16} className="text-white" />
                </div>
                <div className="bg-white/5 border border-primary/20 p-4 rounded-2xl rounded-tl-none flex items-center gap-2">
                  <Loader2 size={16} className="text-primary animate-spin" />
                  <span className="text-xs text-muted-foreground">LogiBot is thinking...</span>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="p-4 border-t border-border bg-secondary/30 backdrop-blur-sm">
          <div className="flex flex-wrap gap-2 mb-3">
            {SUGGESTED_PROMPTS.map((prompt, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(prompt)}
                disabled={loading}
                className="text-xs px-3 py-1.5 rounded-full border border-primary/30 bg-primary/5 text-primary hover:bg-primary/20 transition-colors flex items-center gap-1 disabled:opacity-50"
              >
                <Sparkles size={12} />
                {prompt}
              </button>
            ))}
          </div>
          
          <form 
            onSubmit={(e) => { e.preventDefault(); handleSend(input); }}
            className="flex gap-2 relative pointer-events-auto z-[400]"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask me anything about your supply chain..."
              disabled={loading}
              className="flex-1 bg-secondary/80 border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground"
            />
            <button 
              type="submit"
              disabled={!input.trim() || loading}
              className="px-4 py-3 bg-primary hover:bg-primary/90 disabled:opacity-50 text-white rounded-xl transition-all shadow-[0_0_15px_rgba(139,92,246,0.3)] disabled:shadow-none flex items-center justify-center"
            >
              <Send size={18} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
