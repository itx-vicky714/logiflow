import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';

/** Consistent high-risk threshold used in both API and dashboard */
const HIGH_RISK_THRESHOLD = 70;

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

function detectIntent(message: string): 'total_shipments' | 'active_shipments' | 'high_risk' | 'route_query' | 'risk_analysis' | 'delayed_shipments' | 'shipment_id_query' | 'website_capability_query' | 'alerts_summary' | 'revenue_query' | null {
  const m = message.toLowerCase();
  
  if (m.includes('total') || (m.includes('how many') && !m.includes('delay') && !m.includes('risk')) || (m.includes('kitna') && m.includes('total'))) return 'total_shipments';
  if (m.includes('active') || m.includes('in transit') || m.includes('moving')) return 'active_shipments';
  if (m.includes('delay') || m.includes('delayed') || m.includes('late')) return 'delayed_shipments';
  if (m.includes('high risk') || m.includes('risk pe') || (m.includes('khatra')) || m.includes('at risk')) return 'high_risk';
  if (m.includes('alert') || m.includes('notification') || m.includes('warning')) return 'alerts_summary';
  if (m.includes('revenue') || m.includes('earning') || m.includes('money') || m.includes('income')) return 'revenue_query';
  if (m.includes('status') || m.includes('route') || /from .+ to .+/.test(m) || /(se|tak)\s/.test(m)) return 'route_query';
  if (m.includes('analysis') || m.includes('assessment') || m.includes('risk-scan') || m.includes('scan')) return 'risk_analysis';
  if (/shipment\s+#?[a-z0-9-]+/.test(m) || m.includes('id ') || m.includes('log-')) return 'shipment_id_query';
  if (m.includes('what can you do') || m.includes('website capability') || m.includes('features') || m.includes('help')) return 'website_capability_query';
  
  return null;
}

interface ShipmentRecord {
  shipment_code: string;
  origin: string;
  destination: string;
  status: string;
  risk_score: number;
  mode: string;
  cargo_type: string;
  eta: string;
  declared_value?: number;
}

function smartFallbackText(message: string, shipments: ShipmentRecord[]): string {
  const msg = message.toLowerCase();
  const intent = detectIntent(message);
  
  // High-level stats (consistent with HIGH_RISK_THRESHOLD)
  const total = shipments.length;
  const highRisk = shipments.filter((s) => s.risk_score >= HIGH_RISK_THRESHOLD).length;
  const inTransit = shipments.filter((s) => s.status === 'in_transit').length;
  const onTime = shipments.filter((s) => s.status === 'on_time').length;
  const delayed = shipments.filter((s) => s.status === 'delayed').length;
  const delivered = shipments.filter((s) => s.status === 'delivered').length;
  const totalRevenue = shipments
    .filter((s) => s.status === 'delivered' || s.status === 'on_time')
    .reduce((sum, s) => sum + (s.declared_value ? s.declared_value * 0.025 : (1000 * 8)), 0);

  const isHinglish = /(ky|hai|kya|kaise|kaha|bata|ye|wo|mera|ka|ki|ke|kon|kab)/i.test(msg);
  const isHindi = /[\u0900-\u097F]/.test(msg);

  if (intent === 'total_shipments') {
    if (isHindi) return `आपके सिस्टम में अभी कुल **${total}** शिपमेंट रिकॉर्ड किए गए हैं — ${inTransit} ट्रांजिट में, ${delayed} देरी से।`;
    if (isHinglish) return `Aapke system mein total **${total}** shipments hain. ${inTransit} abhi in transit hain, ${delayed} delayed hain.`;
    return `Your manifest contains **${total}** registered shipments — ${inTransit} in transit, ${onTime} on time, ${delayed} delayed, ${delivered} delivered.`;
  }
  
  if (intent === 'active_shipments') {
    return `Currently **${inTransit}** shipments are actively in transit. Additionally, **${onTime}** are confirmed on-time.`;
  }

  if (intent === 'delayed_shipments') {
    if (delayed === 0) return 'Great news — no shipments are currently delayed. All routes are running on schedule.';
    const delayedCodes = shipments.filter((s) => s.status === 'delayed').slice(0, 5).map((s) => s.shipment_code).join(', ');
    if (isHindi) return `अभी **${delayed}** शिपमेंट देरी से चल रही हैं।`;
    return `**${delayed}** shipment${delayed > 1 ? 's are' : ' is'} currently delayed.${delayed <= 5 ? ' IDs: ' + delayedCodes : ''} Navigate to the Shipments page for full details.`;
  }

  if (intent === 'high_risk') {
    if (highRisk === 0) return `No shipments currently exceed the risk threshold of ${HIGH_RISK_THRESHOLD}/100. All routes are operating within acceptable parameters.`;
    const riskyCodes = shipments.filter((s) => s.risk_score >= HIGH_RISK_THRESHOLD).slice(0, 5).map((s) => `${s.shipment_code}(${s.risk_score})`).join(', ');
    if (isHindi) return `वर्तमान में **${highRisk}** शिपमेंट हाई-रिस्क ज़ोन में हैं (स्कोर ≥ ${HIGH_RISK_THRESHOLD}/100)।`;
    if (isHinglish) return `${highRisk} shipments high risk pe hain (score ≥ ${HIGH_RISK_THRESHOLD}). IDs: ${riskyCodes}`;
    return `**${highRisk}** shipment${highRisk > 1 ? 's' : ''} with risk score ≥ ${HIGH_RISK_THRESHOLD}/100 detected.${highRisk <= 5 ? '\n\nHigh-risk IDs: ' + riskyCodes : ' Check the dashboard for the full list.'}`;
  }

  if (intent === 'alerts_summary') {
    const criticalCount = shipments.filter((s) => s.risk_score >= HIGH_RISK_THRESHOLD).length;
    const delayCount = shipments.filter((s) => s.status === 'delayed').length;
    return `**Smart Alerts Summary:**\n- 🔴 Delayed shipments requiring action: **${delayCount}**\n- ⚠️ High-risk shipments (score ≥ ${HIGH_RISK_THRESHOLD}): **${criticalCount}**\n\nUse the **Simulate** button on the dashboard to generate detailed real-time alerts, or click any alert's action link to resolve it.`;
  }

  if (intent === 'revenue_query') {
    const rev = totalRevenue >= 100000 ? `₹${(totalRevenue/100000).toFixed(1)}L` : totalRevenue >= 1000 ? `₹${(totalRevenue/1000).toFixed(1)}K` : `₹${Math.round(totalRevenue)}`;
    return `Estimated revenue from **${onTime + delivered}** completed shipments is approximately **${rev}** (based on 2.5% of declared value or standard freight rates).`;
  }

  if (intent === 'route_query' || intent === 'shipment_id_query') {
    // Try to match by shipment code directly
    const codeMatch = msg.match(/log-[\w-]+/i);
    if (codeMatch) {
      const s = shipments.find((sh) => sh.shipment_code.toLowerCase() === codeMatch[0].toLowerCase());
      if (s) return `**${s.shipment_code}:** ${s.origin} → ${s.destination} | Status: **${s.status.replace('_', ' ')}** | Mode: ${s.mode} | Risk: **${s.risk_score}/100** | ETA: ${new Date(s.eta).toLocaleDateString('en-IN')}`;
    }
    // Try to match by route
    const cities = ['patna','mumbai','delhi','surat','pune','bangalore','kolkata','jaipur','hyderabad','chennai','lucknow','ahmedabad','kochi','nagpur','guwahati','visakhapatnam'];
    const foundCities = cities.filter((c) => msg.includes(c));
    if (foundCities.length >= 2) {
      const [c1, c2] = foundCities;
      const match = shipments.find((s) =>
        (s.origin.toLowerCase().includes(c1) && s.destination.toLowerCase().includes(c2)) ||
        (s.origin.toLowerCase().includes(c2) && s.destination.toLowerCase().includes(c1))
      );
      if (match) return `**${match.shipment_code}** (${match.origin} → ${match.destination})\nStatus: **${match.status.replace('_', ' ')}** | Risk: **${match.risk_score}/100** | Mode: ${match.mode}`;
      return `No active shipment found on the ${foundCities[0]} ↔ ${foundCities[1]} route.`;
    }
    return 'Please provide the shipment code (e.g. LOG-...) or a route (e.g. Mumbai to Delhi) for a specific lookup.';
  }
  
  if (intent === 'website_capability_query') {
    return `**LogiBot** can help you with:\n- 📦 Total, delayed, in-transit, and high-risk shipment counts\n- 🗺️ Route-specific status and risk lookups\n- ⚠️ Smart alert summaries\n- 💰 Revenue estimates\n- 🌧️ Weather risk advisories for any route\n\nJust ask in English, Hindi, or Hinglish!`;
  }

  // Generic helpful fallback — never show "No shipment found" for general questions
  return `Your fleet: **${total}** total | **${inTransit}** in transit | **${delayed}** delayed | **${highRisk}** high-risk.\n\nAsk me about a specific route, shipment ID, delays, risk levels, or alerts!`;
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
    let shipments: ShipmentRecord[] = [];
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
    const inTransit = shipments.filter((s) => s.status === 'in_transit').length;
    const onTimeLlm = shipments.filter((s) => s.status === 'on_time').length;
    const delayed = shipments.filter((s) => s.status === 'delayed').length;
    const highRisk = shipments.filter((s) => s.risk_score >= HIGH_RISK_THRESHOLD).length;
    const delivered = shipments.filter((s) => s.status === 'delivered').length;
    const road = shipments.filter((s) => s.mode === 'road').length;
    const rail = shipments.filter((s) => s.mode === 'rail').length;
    const air = shipments.filter((s) => s.mode === 'air').length;
    
    const avgRisk = total > 0 ? Math.round(shipments.reduce((a: number, s) => a + s.risk_score, 0) / total) : 0;
    const totalRev = shipments.reduce((a: number, s) => a + (s.declared_value || 0) * 0.05, 0); // Est revenue

    const summary = `
[GROUNDING CONTEXT]
- TOTAL SHIPMENTS: ${total}
- IN TRANSIT: ${inTransit}
- ON TIME: ${onTimeLlm}
- DELAYED (Action Required): ${delayed}
- HIGH RISK (score >= ${HIGH_RISK_THRESHOLD}): ${highRisk}
- DELIVERED: ${delivered}
- AVG NETWORK RISK: ${avgRisk}/100
- EST. REVENUE: ₹${totalRev.toLocaleString('en-IN')}
- MODES: Road(${road}), Rail(${rail}), Air(${air})
[END SUMMARY]
    `.trim();

    // Inject top 60 shipments for specific route queries (increased for better recall)
    const detailLines = shipments.slice(0, 60).map((s) =>
      `• ${s.shipment_code}: ${s.origin}→${s.destination} | Mode: ${s.mode} | Status: ${s.status} | Risk: ${s.risk_score} | Cargo: ${s.cargo_type} | ETA: ${s.eta}`
    ).join('\n');

    const fullSystem = `${SYSTEM_PROMPT}\n\n${summary}\n\n[DETAILED MANIFEST (TOP 60)]\n${detailLines}\n[END]`;

    const contents: { role: string; parts: { text: string }[] }[] = [
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
