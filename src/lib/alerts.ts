import { Shipment } from '@/types';
import { getRouteWeatherRisk } from './weather';

export interface AlertData {
  id: string;
  type: 'delay' | 'risk' | 'weather' | 'eta' | 'document';
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  message: string;
  cause: string;
  action: string;
  actionLabel: string;
  shipmentId: string;
  timestamp: Date;
  resolved: boolean;
}

export function buildAlerts(shipments: Shipment[]): AlertData[] {
  const now = new Date();
  const alerts: AlertData[] = [];

  shipments.forEach(s => {
    const eta = new Date(s.eta);
    const hoursToEta = (eta.getTime() - now.getTime()) / 3600000;
    const weatherRisk = getRouteWeatherRisk(s.origin, s.destination);

    if (s.status === 'delayed') {
      alerts.push({
        id: `delay-${s.id}`, type: 'delay', severity: 'high',
        title: `Shipment Delayed`,
        message: `⚠️ ${s.shipment_code} delayed: ${s.origin} → ${s.destination}`,
        cause: `Behind schedule. Risk score: ${s.risk_score}/100.`,
        action: 'reroute', actionLabel: 'Suggest Reroute',
        shipmentId: s.id, timestamp: new Date(s.created_at), resolved: false
      });
    }
    if (s.risk_score > 80 && s.status !== 'delivered') {
      alerts.push({
        id: `risk-${s.id}`, type: 'risk', severity: 'critical',
        title: `High Risk Detected`,
        message: `🔴 Critical risk: ${s.shipment_code} (${s.risk_score}/100)`,
        cause: `High risk: ${s.mode} mode, ${s.cargo_type}.`,
        action: 'review', actionLabel: 'Mark Reviewed',
        shipmentId: s.id, timestamp: new Date(s.created_at), resolved: false
      });
    }
    if (weatherRisk.overallRisk > 60 && s.status === 'in_transit') {
      alerts.push({
        id: `weather-${s.id}`, type: 'weather', severity: 'medium',
        title: `Weather Disruption`,
        message: `🌧️ Weather alert: ${s.origin} → ${s.destination}`,
        cause: `${weatherRisk.primaryHazard}. Delay: ~${weatherRisk.delayEstimateHours}h.`,
        action: 'reschedule', actionLabel: 'Acknowledge',
        shipmentId: s.id, timestamp: new Date(), resolved: false
      });
    }
    if (hoursToEta > 0 && hoursToEta < 24 && s.status === 'in_transit') {
      alerts.push({
        id: `eta-${s.id}`, type: 'eta', severity: 'low',
        title: `Approaching Destination`,
        message: `⏰ ${s.shipment_code} arriving soon.`,
        cause: `ETA in ${Math.round(hoursToEta)} hours.`,
        action: 'notify', actionLabel: 'Notify Team',
        shipmentId: s.id, timestamp: new Date(), resolved: false
      });
    }
  });

  return alerts.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()).slice(0, 10);
}
