export type ShipmentMode = 'road' | 'rail' | 'air' | 'sea';
export type ShipmentStatus = 'pending' | 'dispatched' | 'in_transit' | 'on_time' | 'delayed' | 'delivered';
export type AlertSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface Shipment {
  id: string;
  user_id: string;
  shipment_code: string;
  origin: string;
  destination: string;
  mode: ShipmentMode;
  status: ShipmentStatus;
  eta: string;
  cargo_type: string;
  weight_kg: number;
  declared_value?: number;
  supplier_name: string;
  supplier_email?: string;
  vehicle_number?: string;
  transporter_name?: string;
  eway_bill?: string;
  eway_bill_expiry?: string;
  reference_number?: string;
  driver_contact?: string;
  whatsapp_alerts?: string;
  priority?: string;
  special_handling?: Record<string, boolean>;
  notes?: string;
  risk_score: number;
  created_at: string;
}

export interface Alert {
  id: string;
  shipment_id: string;
  user_id?: string;
  type: string;
  message: string;
  severity: AlertSeverity;
  created_at: string;
}

export interface Report {
  id: string;
  user_id: string;
  report_type: string;
  content: Record<string, any>;
  created_at: string;
}

export interface KPIData {
  total: number;
  inTransit: number;
  onTime: number;
  delayed: number;
  atRisk: number;
  avgRisk: number;
  revenue: number;
}

export interface Profile {
  id: string;
  full_name: string;
  company: string;
  role: string;
  phone: string;
  whatsapp: string;
  avatar_url: string;
  email_alerts: boolean;
}

export interface Driver {
  id: string;
  user_id: string;
  full_name: string;
  phone: string;
  license_number: string;
  status: 'available' | 'on_trip' | 'off_duty';
  current_location?: string;
  rating?: number;
  avatar_url?: string;
  created_at: string;
}

export interface DispatchRoute {
  id: string;
  shipment_id: string;
  driver_id: string;
  status: 'pending' | 'active' | 'completed' | 'diverted';
  stops: { lat: number; lng: number; label: string; arrival_time?: string }[];
  current_stop_index: number;
  notes?: string;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  shipment_id?: string;
  type: 'delay' | 'risk' | 'delivery' | 'system';
  title: string;
  message: string;
  read: boolean;
  created_at: string;
}
