import { supabase } from './supabase';
import type { Shipment, ShipmentMode, ShipmentStatus } from '@/types';

export function generateShipmentCode(): string {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `LOG-${date}-${random}`;
}

export function calcRiskScore(mode: ShipmentMode, status: ShipmentStatus, weightKg: number): number {
  let base = 20;
  if (mode === 'sea') base += 20;
  if (mode === 'road') base += 15;
  if (status === 'delayed') base += 30;
  if (weightKg > 20000) base += 15;
  // Deterministic risk based on objective parameters, no random variance.
  return Math.min(100, base + (weightKg % 15));
}

/** Estimate freight revenue from a shipment (₹) */
export function estimateRevenue(s: Shipment): number {
  if (s.declared_value && s.declared_value > 0) return s.declared_value * 0.025; // 2.5% of declared value
  // Fallback: mode-based per-kg rate
  const ratePerKg: Record<ShipmentMode, number> = { road: 8, rail: 5, air: 45, sea: 12 };
  return (s.weight_kg || 1000) * (ratePerKg[s.mode] || 8);
}

export function modeColor(mode: ShipmentMode): string {
  switch (mode) {
    case 'road': return '#f97316';
    case 'rail': return '#3b82f6';
    case 'air':  return '#8b5cf6';
    case 'sea':  return '#14b8a6';
    default:     return '#6b7280';
  }
}

export function statusConfig(status: ShipmentStatus) {
  switch (status) {
    case 'on_time':    return { label: 'On Time',    bg: 'bg-green-100',  text: 'text-green-700',  dot: 'bg-green-500'  };
    case 'in_transit': return { label: 'In Transit', bg: 'bg-blue-100',   text: 'text-blue-700',   dot: 'bg-blue-500'   };
    case 'delayed':    return { label: 'Delayed',    bg: 'bg-red-100',    text: 'text-red-700',    dot: 'bg-red-500'    };
    case 'delivered':  return { label: 'Delivered',  bg: 'bg-emerald-100',text: 'text-emerald-700',dot: 'bg-emerald-500'};
    case 'pending':    return { label: 'Pending',    bg: 'bg-amber-100',  text: 'text-amber-700',  dot: 'bg-amber-400'  };
    default:           return { label: status,       bg: 'bg-gray-100',   text: 'text-gray-700',   dot: 'bg-gray-400'   };
  }
}

export function modeLabel(mode: ShipmentMode): string {
  return mode.charAt(0).toUpperCase() + mode.slice(1);
}

export function modeIcon(mode: ShipmentMode): string {
  switch (mode) {
    case 'road': return '🚛';
    case 'rail': return '🚂';
    case 'air':  return '✈️';
    case 'sea':  return '🚢';
    default:     return '📦';
  }
}

export function riskColor(score: number): string {
  if (score < 30) return 'text-green-600';
  if (score < 70) return 'text-amber-600';
  return 'text-red-600';
}

export function riskBg(score: number): string {
  if (score < 30) return 'bg-green-500';
  if (score < 70) return 'bg-amber-500';
  return 'bg-red-500';
}

export function riskLabel(score: number): string {
  if (score < 30) return 'Low Risk';
  if (score < 70) return 'Medium Risk';
  return 'High Risk';
}

export function formatCurrency(n: number): string {
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(1)}Cr`;
  if (n >= 100000)   return `₹${(n / 100000).toFixed(1)}L`;
  if (n >= 1000)     return `₹${(n / 1000).toFixed(1)}K`;
  return `₹${Math.round(n)}`;
}

// City coordinates for Indian cities
export const CITY_COORDS: Record<string, [number, number]> = {
  'Mumbai':        [19.0760, 72.8777],
  'Delhi':         [28.6139, 77.2090],
  'Bangalore':     [12.9716, 77.5946],
  'Chennai':       [13.0827, 80.2707],
  'Kolkata':       [22.5726, 88.3639],
  'Hyderabad':     [17.3850, 78.4867],
  'Pune':          [18.5204, 73.8567],
  'Ahmedabad':     [23.0225, 72.5714],
  'Jaipur':        [26.9124, 75.7873],
  'Surat':         [21.1702, 72.8311],
  'Lucknow':       [26.8467, 80.9462],
  'Nagpur':        [21.1458, 79.0882],
  'Kochi':         [ 9.9312, 76.2673],
  'Chandigarh':    [30.7333, 76.7794],
  'Bhopal':        [23.2599, 77.4126],
  'Indore':        [22.7196, 75.8577],
  'Patna':         [25.5941, 85.1376],
  'Guwahati':      [26.1445, 91.7362],
  'Visakhapatnam': [17.6868, 83.2185],
};

// Route distance estimates (km) between major cities
function approxDistance(origin: string, dest: string): number {
  const dist: Record<string, number> = {
    'Mumbai-Delhi': 1422, 'Delhi-Mumbai': 1422,
    'Chennai-Kolkata': 1669, 'Kolkata-Chennai': 1669,
    'Bangalore-Mumbai': 984, 'Mumbai-Bangalore': 984,
    'Kolkata-Delhi': 1531, 'Delhi-Kolkata': 1531,
    'Pune-Ahmedabad': 660, 'Ahmedabad-Pune': 660,
    'Mumbai-Chennai': 1338, 'Chennai-Mumbai': 1338,
    'Hyderabad-Bangalore': 575, 'Bangalore-Hyderabad': 575,
    'Jaipur-Surat': 785, 'Surat-Jaipur': 785,
    'Lucknow-Mumbai': 1600, 'Mumbai-Lucknow': 1600,
  };
  return dist[`${origin}-${dest}`] || dist[`${dest}-${origin}`] || 900;
}

export function getRouteOptions(origin: string, dest: string, primaryMode: ShipmentMode) {
  const km = approxDistance(origin, dest);
  const speeds: Record<ShipmentMode, number> = { road: 60, rail: 80, air: 700, sea: 25 };
  const ratePerKm: Record<ShipmentMode, number> = { road: 80, rail: 20, air: 350, sea: 15 };

  const modes: ShipmentMode[] = ['road', 'rail', 'air', 'sea'];
  return modes.map(m => {
    const hours = Math.round(km / speeds[m]);
    const toll = m === 'road' ? Math.round(km * 2.5) : 0;
    const fuel = m === 'road' ? Math.round(km * 45) : m === 'rail' ? Math.round(km * 8) : 0;
    const total = Math.round(km * ratePerKm[m]);
    const risk = m === 'sea' ? 65 : m === 'road' ? 50 : m === 'rail' ? 35 : 25;
    return { mode: m, km, hours, toll, fuel, total, risk, isPrimary: m === primaryMode };
  });
}

// Sample shipment seed data
export const SAMPLE_SHIPMENTS = [
  { origin: 'Mumbai',    destination: 'Delhi',       mode: 'road' as ShipmentMode, cargo_type: 'Electronics',     weight_kg: 2500,  declared_value: 850000,  supplier_name: 'Tata Electronics',   supplier_email: 'logistics@tata.com',    status: 'in_transit' as ShipmentStatus, eta_hours: 18, vehicle_number: 'MH-04-AB-1234', transporter_name: 'Ashok Leyland Fleet', priority: 'high' },
  { origin: 'Chennai',   destination: 'Kolkata',    mode: 'rail' as ShipmentMode, cargo_type: 'Textiles',        weight_kg: 15000, declared_value: 1200000, supplier_name: 'Arvind Mills',        supplier_email: 'supply@arvind.com',     status: 'on_time'    as ShipmentStatus, eta_hours: 36, vehicle_number: 'IR-12458-G',    transporter_name: 'Indian Railways',     priority: 'normal' },
  { origin: 'Bangalore', destination: 'Mumbai',     mode: 'air'  as ShipmentMode, cargo_type: 'Pharmaceuticals', weight_kg: 800,   declared_value: 2400000, supplier_name: 'Sun Pharma',          supplier_email: 'ops@sunpharma.com',     status: 'on_time'    as ShipmentStatus, eta_hours: 3,  vehicle_number: 'IX-7890',       transporter_name: 'IndiGo Cargo',        priority: 'urgent' },
  { origin: 'Kolkata',   destination: 'Delhi',      mode: 'rail' as ShipmentMode, cargo_type: 'Auto Parts',      weight_kg: 45000, declared_value: 3200000, supplier_name: 'Maruti Suzuki',       supplier_email: 'vendor@maruti.com',     status: 'delayed'    as ShipmentStatus, eta_hours: 48, vehicle_number: 'IR-78912-F',    transporter_name: 'Indian Railways',     priority: 'high' },
  { origin: 'Pune',      destination: 'Ahmedabad',  mode: 'road' as ShipmentMode, cargo_type: 'FMCG',            weight_kg: 5000,  declared_value: 380000,  supplier_name: 'HUL Logistics',       supplier_email: 'logistics@hul.com',     status: 'in_transit' as ShipmentStatus, eta_hours: 8,  vehicle_number: 'MH-12-ZZ-4567', transporter_name: 'Blue Dart Freight',   priority: 'normal' },
  { origin: 'Delhi',     destination: 'Kolkata',    mode: 'rail' as ShipmentMode, cargo_type: 'Machinery',       weight_kg: 32000, declared_value: 5600000, supplier_name: 'L&T Infrastructure',  supplier_email: 'supply@landt.com',      status: 'on_time'    as ShipmentStatus, eta_hours: 28, vehicle_number: 'IR-56234-D',    transporter_name: 'Indian Railways',     priority: 'normal' },
  { origin: 'Mumbai',    destination: 'Chennai',    mode: 'sea'  as ShipmentMode, cargo_type: 'Chemicals',       weight_kg: 28000, declared_value: 1800000, supplier_name: 'Reliance Industries', supplier_email: 'export@reliance.com',   status: 'in_transit' as ShipmentStatus, eta_hours: 72, vehicle_number: 'INL-VESSEL-03', transporter_name: 'Shipping Corp India', priority: 'normal' },
  { origin: 'Hyderabad', destination: 'Bangalore',  mode: 'road' as ShipmentMode, cargo_type: 'IT Equipment',    weight_kg: 1200,  declared_value: 4200000, supplier_name: 'Infosys Supply',      supplier_email: 'procurement@infosys.com',status: 'delivered'  as ShipmentStatus, eta_hours: -2, vehicle_number: 'TS-09-EF-7890', transporter_name: 'FedEx India',        priority: 'urgent' },
  { origin: 'Jaipur',    destination: 'Surat',      mode: 'road' as ShipmentMode, cargo_type: 'Handicrafts',     weight_kg: 3000,  declared_value: 620000,  supplier_name: 'Rajasthan Exports',   supplier_email: 'trade@rajexports.com',  status: 'pending'    as ShipmentStatus, eta_hours: 12, vehicle_number: 'RJ-14-CD-3421', transporter_name: 'Safexpress',         priority: 'normal' },
  { origin: 'Lucknow',   destination: 'Mumbai',     mode: 'rail' as ShipmentMode, cargo_type: 'Agriculture',     weight_kg: 50000, declared_value: 900000,  supplier_name: 'UP Agri Exports',     supplier_email: 'agri@upexports.com',    status: 'delayed'    as ShipmentStatus, eta_hours: 54, vehicle_number: 'IR-23451-B',    transporter_name: 'Indian Railways',     priority: 'high' },
];

export async function seedShipments(userId: string): Promise<void> {
  const { data: existing } = await supabase
    .from('shipments')
    .select('id')
    .eq('user_id', userId)
    .limit(1);

  if (existing && existing.length > 0) return;

  const now = new Date();
  const toInsert = SAMPLE_SHIPMENTS.map((s, i) => {
    const eta = new Date(now.getTime() + s.eta_hours * 3600000);
    const risk = calcRiskScore(s.mode, s.status, s.weight_kg);
    return {
      user_id: userId,
      shipment_code: `LOG-${now.toISOString().slice(0,10).replace(/-/g,'')}${String(i+1).padStart(4,'0')}`,
      origin: s.origin, destination: s.destination, mode: s.mode,
      status: s.status, eta: eta.toISOString(),
      cargo_type: s.cargo_type, weight_kg: s.weight_kg,
      declared_value: s.declared_value, supplier_name: s.supplier_name,
      supplier_email: s.supplier_email, vehicle_number: s.vehicle_number,
      transporter_name: s.transporter_name, priority: s.priority,
      risk_score: risk,
    };
  });

  await supabase.from('shipments').insert(toInsert);

  // Generate smart alerts based on status
  const { data: inserted } = await supabase
    .from('shipments').select('id, status, origin, destination, risk_score, mode')
    .eq('user_id', userId);

  if (inserted) {
    const alertsToInsert = inserted.flatMap(s => {
      const alerts = [];
      if (s.status === 'delayed') {
        alerts.push({ shipment_id: s.id, user_id: userId, type: 'delay', severity: 'high',
          message: `⚠️ ${s.origin}→${s.destination} shipment is delayed. Estimated impact: 12-24 hours.` });
      }
      if (s.risk_score > 70) {
        alerts.push({ shipment_id: s.id, user_id: userId, type: 'risk', severity: 'critical',
          message: `🔴 High risk score (${s.risk_score}/100) detected on ${s.origin}→${s.destination} (${s.mode}). Immediate review required.` });
      }
      if (s.mode === 'sea') {
        alerts.push({ shipment_id: s.id, user_id: userId, type: 'weather', severity: 'medium',
          message: `🌊 Sea route ${s.origin}→${s.destination}: Cyclone watch active in Bay of Bengal. Monitor ETA closely.` });
      }
      return alerts;
    });

    if (alertsToInsert.length > 0) {
      await supabase.from('alerts').insert(alertsToInsert);
    }
  }
}

/** Generate alerts dynamically from live shipment data */
export function generateDynamicAlerts(shipments: Shipment[]): Array<{
  id: string; type: string; severity: string; message: string; created_at: string; shipment_id: string;
}> {
  const alerts: Array<{ id: string; type: string; severity: string; message: string; created_at: string; shipment_id: string }> = [];
  const now = new Date();

  shipments.forEach(s => {
    const eta = new Date(s.eta);
    const hoursToEta = (eta.getTime() - now.getTime()) / 3600000;

    if (s.status === 'delayed') {
      alerts.push({ id: `a-${s.id}-delay`, type: 'delay', severity: 'high',
        message: `⚠️ ${s.shipment_code}: ${s.origin}→${s.destination} delayed. Risk: ${s.risk_score}/100`,
        created_at: now.toISOString(), shipment_id: s.id });
    }
    if (s.risk_score > 75) {
      alerts.push({ id: `a-${s.id}-risk`, type: 'risk', severity: 'critical',
        message: `🔴 Critical risk on ${s.shipment_code} (${s.mode} freight). Score: ${s.risk_score}/100`,
        created_at: now.toISOString(), shipment_id: s.id });
    }
    if (hoursToEta > 0 && hoursToEta < 6 && s.status === 'in_transit') {
      alerts.push({ id: `a-${s.id}-eta`, type: 'eta', severity: 'medium',
        message: `⏰ ${s.shipment_code} arriving in ${Math.round(hoursToEta)}h: ${s.destination}. Prepare receiving.`,
        created_at: now.toISOString(), shipment_id: s.id });
    }
    if (s.mode === 'sea' && s.status === 'in_transit') {
      alerts.push({ id: `a-${s.id}-weather`, type: 'weather', severity: 'medium',
        message: `🌊 Sea shipment ${s.shipment_code} monitoring active. Indian Ocean conditions nominal.`,
        created_at: now.toISOString(), shipment_id: s.id });
    }
  });

  return alerts.slice(0, 5);
}
