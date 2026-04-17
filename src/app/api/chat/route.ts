import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';

const SYSTEM_PROMPT = `You are LogiBot, the EXCLUSIVE Logistics Intelligence AI for the LogiFlow Platform.
Your sole purpose is to provide REAL-TIME, DATA-BACKED answers using the [GROUNDING CONTEXT] and [DETAILED MANIFEST] provided below.

INTENT-BASED EXECUTION:
1. TOTAL_SHIPMENTS: Return exact number from context.
2. HIGH_RISK: Filter manifest for risk_score > 70 and return count + codes.
3. ROUTE_QUERY: Match origin/destination and return status/risk/ETA.
4. RISK_ANALYSIS: Provide shipment-specific reasoning based on cargo, mode, weather, and score.

CRITICAL RULES:
- NEVER GIVE GENERIC ANSWERS. Statements like "I cannot access real-time data" are FORBIDDEN.
- DO NOT HALLUCINATE. If no match exists, say "No shipment found for this query."
- PRECISE NUMBERS: Use exact decimals and integers from the payload.
- MULTILINGUAL: Support English, Hindi, and Hinglish natively.
- TONE: Professional Control Tower Officer.`;

function detectIntent(message: string): 'total_shipments' | 'active_shipments' | 'high_risk' | 'route_query' | 'risk_analysis' | 'delayed_shipments' | 'shipment_id_query' | 'website_capability_query' | null {
  const m = message.toLowerCase();
  
  if (m.includes('total') || (m.includes('how many') && !m.includes('delay') && !m.includes('risk')) || (m.includes('kitna') && m.includes('total'))) return 'total_shipments';
  if (m.includes('active')) return 'active_shipments';
  if (m.includes('delay') || m.includes('delayed')) return 'delayed_shipments';
  if (m.includes('high risk') || m.includes('risk pe') || (m.includes('khatra') && m.includes('pe'))) return 'high_risk';
  if (m.includes('status') || m.includes('route') || /from .+ to .+/.test(m) || /(se|tak)\s/.test(m)) return 'route_query';
  if (m.includes('analysis') || m.includes('assessment') || m.includes('risk-scan')) return 'risk_analysis';
  if (/shipment\s+#?[a-z0-9-]+/.test(m) || m.includes('id ')) return 'shipment_id_query';
  if (m.includes('what can you do') || m.includes('website capability') || m.includes('features')) return 'website_capability_query';
  
  return null;
}

function smartFallbackText(message: string, shipments: any[]): string {
  const msg = message.toLowerCase();
  const intent = detectIntent(message);
  
  // High-level stats
  const total = shipments.length;
  const highRisk = shipments.filter((s:any) => s.risk_score > 70).length;
  const inTransit = shipments.filter((s:any) => s.status === 'in_transit' || s.status === 'on_time').length;

  const isHinglish = /(ky|hai|kya|kaise|kaha|bata|ye|wo|mera|ka|ki|ke|kon|kab)/i.test(msg);
  const isHindi = /[\u0900-\u097F]/.test(msg);

  if (intent === 'total_shipments') {
    if (isHindi) return `आपके सिस्टम में अभी कुल ${total} शिपमेंट रिकॉर्ड किए गए हैं।`;
    if (isHinglish) return `Aapke total ${total} shipments synced hain right now.`;
    return `Your active manifest contains ${total} registered shipments.`;
  }
  
  if (intent === 'active_shipments') {
    return `There are currently ${inTransit} active shipments in transit or on time.`;
  }

  if (intent === 'delayed_shipments') {
    return `You have ${shipments.filter((s:any)=>s.status==='delayed').length} delayed shipments.`;
  }

  if (intent === 'high_risk') {
    if (isHindi) return `वर्तमान में ${highRisk} शिपमेंट हाई-रिस्क जोन में हैं।`;
    if (isHinglish) return `Current manifest mein ${highRisk} shipments high risk pe hain.`;
    return `Analysis shows ${highRisk} shipments are currently categorized as high-risk.`;
  }

  if (intent === 'route_query' || intent === 'shipment_id_query') {
    const routeMatch = msg.match(/(patna|mumbai|delhi|surat|pune|bangalore|kolkata|jaipur|hyderabad|chennai).*(surat|patna|mumbai|delhi|pune|bangalore|kolkata|jaipur|hyderabad|chennai)/);
    if (routeMatch) {
      const origin = routeMatch[1];
      const dest = routeMatch[2];
      const match = shipments.find((s:any) => 
        (s.origin.toLowerCase().includes(origin) && s.destination.toLowerCase().includes(dest)) ||
        (s.origin.toLowerCase().includes(dest) && s.destination.toLowerCase().includes(origin))
      );
      if (match) {
        return `Confirmed: ${match.shipment_code} (${match.origin} → ${match.destination}) status is ${match.status.replace('_', ' ')}. Risk score is ${match.risk_score}/100.`;
      }
    }
    return "No shipment found for this query.";
  }
  
  if (intent === 'website_capability_query') {
    return "I am LogiBot. I can analyze shipments, track active routes, predict risk using AI, and help orchestrate dispatches.";
  }

  return "No shipment found for this query.";
}

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function POST(req: Request) {
  let userMessage = '';
  try {
    const body = await req.json();
    const { message, history = [] } = body;
    userMessage = message || '';

    if (!message?.trim()) return NextResponse.json({ error: 'Message required' }, { status: 400 });

    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
        },
      }
    );

    const { data: { user } } = await supabase.auth.getUser();
    let shipments: any[] = [];
    if (user) {
      const { data } = await supabase.from('shipments').select('*').eq('user_id', user.id);
      if (data) shipments = data;
    } else {
      // Fallback to passed shipments if not logged in (e.g. testing)
      shipments = body.shipments || [];
    }

    const apiKey = process.env.GEMINI_API_KEY;
    
    // Deterministic override before calling LLM
    const intent = detectIntent(userMessage);
    if (intent && intent !== 'risk_analysis') {
      return NextResponse.json({ text: smartFallbackText(userMessage, shipments), deterministic: true });
    }

    if (!apiKey || apiKey === '' || apiKey.startsWith('your_')) {
      return NextResponse.json({ text: smartFallbackText(message, shipments), fallback: true });
    }

    // Comprehensive Summary Generation
    const total = shipments.length;
    const inTransit = shipments.filter((s:any) => s.status === 'in_transit' || s.status === 'on_time').length;
    const delayed = shipments.filter((s:any) => s.status === 'delayed').length;
    const highRisk = shipments.filter((s:any) => s.risk_score > 70).length;
    const delivered = shipments.filter((s:any) => s.status === 'delivered').length;
    const road = shipments.filter((s:any) => s.mode === 'road').length;
    const rail = shipments.filter((s:any) => s.mode === 'rail').length;
    const air = shipments.filter((s:any) => s.mode === 'air').length;
    
    const avgRisk = total > 0 ? Math.round(shipments.reduce((a:number, s:any) => a + s.risk_score, 0) / total) : 0;
    const totalRev = shipments.reduce((a:number, s:any) => a + (s.declared_value || 0) * 0.05, 0); // Est revenue

    const summary = `
[GROUNDING CONTEXT]
- TOTAL SHIPMENTS: ${total}
- IN TRANSIT/ON TIME: ${inTransit}
- DELAYED (Action Required): ${delayed}
- HIGH RISK (>70): ${highRisk}
- DELIVERED: ${delivered}
- AVG NETWORK RISK: ${avgRisk}/100
- EST. REVENUE: ₹${totalRev.toLocaleString('en-IN')}
- MODES: Road(${road}), Rail(${rail}), Air(${air})
[END SUMMARY]
    `.trim();

    // Inject top 60 shipments for specific route queries (increased for better recall)
    const detailLines = (shipments as any[]).slice(0, 60).map((s: any) =>
      `• ${s.shipment_code}: ${s.origin}→${s.destination} | Mode: ${s.mode} | Status: ${s.status} | Risk: ${s.risk_score} | Cargo: ${s.cargo_type} | ETA: ${s.eta}`
    ).join('\n');

    const fullSystem = `${SYSTEM_PROMPT}\n\n${summary}\n\n[DETAILED MANIFEST (TOP 60)]\n${detailLines}\n[END]`;

    const contents: any[] = [
      { role: 'user', parts: [{ text: fullSystem }] },
      { role: 'model', parts: [{ text: 'Control Tower AI systems active. Grounding context loaded. I have real-time access to the manifest of ' + total + ' shipments. Ready for route-specific queries like Patna to Surat or high-risk assessments.' }] },
    ];

    const recentHistory = Array.isArray(history) ? history.slice(-6) : [];
    for (const msg of recentHistory) {
      if (msg?.role && typeof msg?.content === 'string' && msg.content.trim()) {
        contents.push({ role: msg.role === 'assistant' ? 'model' : 'user', parts: [{ text: msg.content }] });
      }
    }
    contents.push({ role: 'user', parts: [{ text: message }] });

    const geminiBody = {
      contents,
      generationConfig: { 
        temperature: 0.1, // Near-zero for deterministic factual recall
        maxOutputTokens: 1200, 
        topP: 0.1,
        topK: 1
      },
    };

    const tryModel = async (model: string) => {
      return fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(15000),
        body: JSON.stringify(geminiBody)
      });
    };

    let response = await tryModel('gemini-1.5-flash');
    if (!response.ok && response.status === 429) {
      return NextResponse.json({ text: '⏳ Bot is recalibrating. Try again in 10s.', fallback: true });
    }
    if (!response.ok) {
      try {
        response = await tryModel('gemini-1.5-pro');
      } catch {
        return NextResponse.json({ text: smartFallbackText(message, shipments), fallback: true });
      }
    }

    if (!response.ok) return NextResponse.json({ text: smartFallbackText(message, shipments), fallback: true });

    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

    return NextResponse.json({ text: text || smartFallbackText(message, shipments) });

  } catch (err) {
    console.error('[LogiBot] Chat Error:', err);
    return NextResponse.json({ text: smartFallbackText(userMessage, []), fallback: true });
  }
}
