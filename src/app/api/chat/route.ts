import { NextResponse } from 'next/server';
import { LOGIFLOW_SYSTEM_PROMPT } from '@/lib/prompts';
export const dynamic = 'force-dynamic';

/** Consistent high-risk threshold used in both API and dashboard */
const HIGH_RISK_THRESHOLD = 70;

// System prompt imported from @/lib/prompts
const SYSTEM_PROMPT = LOGIFLOW_SYSTEM_PROMPT;

function detectIntent(message: string): 
  | 'total_shipments' | 'active_shipments' | 'high_risk' | 'route_query' | 'risk_analysis' 
  | 'delayed_shipments' | 'shipment_id_query' | 'product_help' | 'alerts_summary' 
  | 'revenue_query' | 'reports_analytics' | 'map_usage' | 'dashboard_usage' | 'alerts_management' | null {
  const m = message.toLowerCase();
  
  // High Priority: Website Usage / Help
  const helpTerms = ['what can you do', 'website', 'features', 'help', 'use kru', 'kaise use', 'ka kaam ki', 'use hota hai', 'kaise hota hai', 'how to use', 'guide'];
  if (helpTerms.some(term => m.includes(term))) return 'product_help';

  // Analytics & Reports
  if (m.includes('analytics') || m.includes('report') || m.includes('forecast') || m.includes('trend')) return 'reports_analytics';
  
  // Map Usage
  if (m.includes('map') || m.includes('route visualization') || m.includes('live tracking') || m.includes('location')) return 'map_usage';
  
  // Dashboard Usage
  if (m.includes('dashboard') || (m.includes('kya') && m.includes('dashboard'))) return 'dashboard_usage';
  
  // Alerts & Resolutions
  if (m.includes('resolve') || m.includes('solve alert') || m.includes('alert kaise') || (m.includes('alert') && m.includes('manage'))) return 'alerts_management';

  // Total / Stats
  if (m.includes('total') || (m.includes('how many') && !m.includes('delay') && !m.includes('risk')) || (m.includes('kitna') && m.includes('total'))) return 'total_shipments';
  if (m.includes('active') || m.includes('in transit') || m.includes('moving')) return 'active_shipments';
  
  // Delays & Alerts
  if (m.includes('delay') || m.includes('delayed') || m.includes('late') || m.includes('deleti')) return 'delayed_shipments';
  if (m.includes('high risk') || m.includes('risk pe') || (m.includes('khatra')) || m.includes('at risk')) return 'high_risk';
  if (m.includes('alert') || m.includes('notification') || m.includes('warning') || m.includes('dikhao')) return 'alerts_summary';
  
  // Finance
  if (m.includes('revenue') || m.includes('earning') || m.includes('money') || m.includes('income')) return 'revenue_query';
  
  // Routes & IDs
  if (/shipment\s+#?[a-z0-9-]+/.test(m) || m.includes('id ') || m.includes('log-') || m.includes('sim-')) return 'shipment_id_query';
  if (m.includes('status') || m.includes('route') || m.includes(' eta') || /\b(.+)\b\s+\b(to|se)\b\s+\b(.+)\b/.test(m) || /(se|tak)\s/.test(m)) return 'route_query';
  
  // Analysis
  if (m.includes('analysis') || m.includes('assessment') || m.includes('risk-scan') || m.includes('scan')) return 'risk_analysis';
  
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
    return `**AI Alerts Summary:**\n- 🔴 Delayed shipments requiring action: **${delayCount}**\n- ⚠️ High-risk shipments (score ≥ ${HIGH_RISK_THRESHOLD}): **${criticalCount}**\n\nFor real-time alert logs and grid telemetry, please visit the Dashboard or Reports page.`;
  }

  if (intent === 'revenue_query') {
    const rev = totalRevenue >= 100000 ? `₹${(totalRevenue/100000).toFixed(1)}L` : totalRevenue >= 1000 ? `₹${(totalRevenue/1000).toFixed(1)}K` : `₹${Math.round(totalRevenue)}`;
    return `Estimated revenue from **${onTime + delivered}** completed shipments is approximately **${rev}** (based on 2.5% of declared value or standard freight rates).`;
  }

  if (intent === 'route_query' || intent === 'shipment_id_query') {
    // Try to match by shipment code directly
    const codeMatch = msg.match(/(log|sim)-[\w-]+/i);
    if (codeMatch) {
      const s = shipments.find((sh) => sh.shipment_code.toLowerCase() === codeMatch[0].toLowerCase());
      if (s) return `**${s.shipment_code}:** ${s.origin} → ${s.destination} | Status: **${s.status.replace('_', ' ')}** | Mode: ${s.mode} | Risk: **${s.risk_score}/100** | ETA: ${new Date(s.eta).toLocaleDateString('en-IN')}`;
      return `Shipment ID **${codeMatch[0].toUpperCase()}** ka koi data nahi mila. Please check the ID and try again.`;
    }

    // Try to extract cities from "A to B" or "A se B"
    const routeMatch = msg.match(/(?:from\s+)?([a-z\s]+)\s+(?:to|se)\s+([a-z\s]+)/i);
    let city1 = '';
    let city2 = '';

    if (routeMatch) {
      city1 = routeMatch[1].trim().split(' ').pop() || ''; // Get last word of first group
      city2 = routeMatch[2].trim().split(' ')[0] || '';   // Get first word of second group
    } else {
      // Fallback: look for any two known cities
      const allCities = ['patna','mumbai','delhi','surat','pune','bangalore','kolkata','jaipur','hyderabad','chennai','lucknow','ahmedabad','kochi','nagpur','guwahati','visakhapatnam'];
      const foundCities = allCities.filter((c) => msg.includes(c));
      if (foundCities.length >= 2) {
        city1 = foundCities[0];
        city2 = foundCities[1];
      }
    }

    if (city1 && city2) {
      const match = shipments.find((s) =>
        (s.origin.toLowerCase().includes(city1) && s.destination.toLowerCase().includes(city2)) ||
        (s.origin.toLowerCase().includes(city2) && s.destination.toLowerCase().includes(city1))
      );
      if (match) return `**${match.shipment_code}** (${match.origin} → ${match.destination})\nStatus: **${match.status.replace('_', ' ')}** | Risk: **${match.risk_score}/100** | Mode: ${match.mode} | ETA: ${new Date(match.eta).toLocaleDateString('en-IN')}`;
      
      const c1Cap = city1.charAt(0).toUpperCase() + city1.slice(1);
      const c2Cap = city2.charAt(0).toUpperCase() + city2.slice(1);
      return `${c1Cap} to ${c2Cap} route ka koi active shipment nahi mila.`;
    }

    return `I can help you analyze specific routes or shipment IDs. Please provide a route (e.g., "Mumbai to Delhi") or a Shipment ID.`;
  }
  
  if (intent === 'product_help') {
    return `**LogiFlow Platform Guide:**\n\n- **Dashboard**: Dashboard se aap total shipments, delayed shipments, aur overall network health check kar sakte hain.\n- **Shipments**: Is section mein aap individual shipment details aur unke status dekh sakte hain.\n- **Map**: Live route visualization aur movement tracking ke liye Map section use karein.\n- **Alerts**: System Alerts aapko risk aur delays ki turant notification dete hain.\n- **Analytics**: Revenue forecast aur transit trends samajhne ke liye Reports/Analytics use karein.\n- **Chatbot**: Mujhse aap shipment tracking, alerts, aur route-specific sawaal pooch sakte hain.`;
  }

  if (intent === 'reports_analytics') {
    return `**Reports & Analytics**: Is section mein aap logistics performance trends aur revenue analysis dekh sakte hain. Analytics page par jaakar aap daily aur monthly efficiency reports generate aur download kar sakte hain.`;
  }

  if (intent === 'map_usage') {
    return `**Map Tracking**: LogiFlow Map section aapko live geospatial tracking provide karta hai. Aap map par kisi bhi shipment node par click karke uski exact location aur transit mode check kar sakte hain.`;
  }

  if (intent === 'dashboard_usage') {
    return `**Dashboard Usage**: Dashboard aapka primary control center hai. Yahan aap real-time KPIs (Total Orders, In Transit, Delayed) dekh sakte hain aur simulation tool ke zariye system health test kar sakte hain.`;
  }

  if (intent === 'alerts_management') {
    const alertCount = shipments.filter(s => s.status === 'delayed' || s.risk_score > 70).length;
    return `**Alerts Management**: Abhi system mein **${alertCount}** active alerts hain. Aap TopBar ke Bell Icon par jaakar ya Dashboard alerts panel se inhe 'Resolve' kar sakte hain. Resolve karne par alert system se hat jayega.`;
  }

  // Final Professional Fallback — NO generic fleet summary unless no intent matches and it's a general greeting
  const greetings = ['hi', 'hello', 'hey', 'namaste', 'gm', 'gn'];
  if (greetings.includes(msg)) {
    return `Hello! I am **LogiBot**, your AI logistics assistant. I can help you track shipments, analyze routes, and monitor fleet risks. How can I assist you today?`;
  }

  return `I'm not sure I understood that specific request. I can help you with:\n- Shipment tracking (ID or Route)\n- Delay reports\n- Risk assessments\n- Platform navigation help\n\nWhat can I look up for you?`;
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
    const totalRev = shipments.reduce((a: number, s) => a + (s.declared_value || 0) * 0.025, 0); // Est revenue

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
      { role: 'model', parts: [{ text: 'LogiFlow Dashboard AI systems active. Grounding context loaded. I have real-time access to the manifest of ' + total + ' shipments. Ready for route-specific queries like Patna to Surat or high-risk assessments.' }] },
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
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
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

