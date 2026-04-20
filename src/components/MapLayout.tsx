"use client";

import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap, ZoomControl } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Shipment } from '@/types';
import { modeColor, statusConfig, CITY_COORDS } from '@/lib/utils';
import { getCityWeather } from '@/lib/weather';

// Fix Leaflet default icon issue
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;

// LogiFlow Editorial Vehicle Icons
const createVehicleIcon = (isHighlighted: boolean, status: string, riskScore: number) => {
  const isRed = status === 'delayed';
  const isYellow = riskScore > 60 && !isRed;
  const color = isRed ? '#ba1a1a' : isYellow ? '#f59e0b' : '#493ee5';

  const html = `
    <div class="relative flex items-center justify-center transition-all duration-300" style="width: ${isHighlighted ? '24px' : '12px'}; height: ${isHighlighted ? '24px' : '12px'};">
      ${isHighlighted ? `<div class="absolute inset-0 rounded-full animate-ping opacity-20" style="background-color: ${color};"></div>` : ''}
      <div class="absolute inset-0 rounded-full border-2 border-white shadow-md z-10" style="background-color: ${color};"></div>
    </div>
  `;
  return L.divIcon({ html, className: 'bg-transparent border-0', iconSize: [0, 0], iconAnchor: [0, 0], popupAnchor: [0, -10] });
};

// LogiFlow Weather Badge
function createWeatherBadge(cw: ReturnType<typeof getCityWeather>) {
  const isHighRisk = cw.riskLevel === 'high' || cw.riskLevel === 'severe';
  const bgStyle = isHighRisk ? 'background-color: #ba1a1a; color: white;' : 'background-color: white; color: #191c1e;';

  const html = `
    <div class="flex items-center gap-1.5 px-3 py-1 rounded-full border border-white/50 text-[10px] font-black tracking-tight whitespace-nowrap -translate-x-1/2 -translate-y-1/2 transition-transform duration-300 hover:scale-110 shadow-sm" 
         style="${bgStyle} backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);">
      <span>${cw.icon}</span>
      <span class="tabular-nums">${cw.tempC}°</span>
    </div>
  `;
  return L.divIcon({ html, className: 'bg-transparent border-0', iconSize: [0, 0], iconAnchor: [0, 0] });
}

function FitBounds({ shipments }: { shipments: Shipment[] }) {
  const map = useMap();
  useEffect(() => {
    const bounds: [number, number][] = [];
    shipments.forEach(s => {
      const o = CITY_COORDS[s.origin];
      const d = CITY_COORDS[s.destination];
      if (o) bounds.push(o);
      if (d) bounds.push(d);
    });
    if (bounds.length > 0) {
      map.fitBounds(bounds as L.LatLngBoundsExpression, { padding: [100, 100], maxZoom: 6, animate: true });
    }
  }, [shipments, map]);
  return null;
}

export default function MapLayout({ 
  shipments, 
  highlighted, 
  onMarkerClick,
  onMapReady 
}: { 
  shipments: Shipment[], 
  highlighted: string | null, 
  onMarkerClick?: (id: string) => void,
  onMapReady?: (map: any) => void
}) {
  const plottedCities = Array.from(new Set(shipments.flatMap(s => [s.origin, s.destination])));
  const activeCitiesWeather = plottedCities.map(city => getCityWeather(city));

  return (
    <div className="h-full w-full bg-slate-50 relative font-['Inter']">
      <MapContainer
        center={[20.5937, 78.9629]}
        zoom={5}
        scrollWheelZoom
        zoomControl={false}
        style={{ height: '100%', width: '100%', background: '#f8fafc' }}
        ref={onMapReady}
      >
        <TileLayer
          attribution='&copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        />
        <ZoomControl position="bottomright" />
        <FitBounds shipments={shipments} />

        {/* Weather Markers */}
        {activeCitiesWeather.map(cw => {
          const coords = CITY_COORDS[cw.city];
          if (!coords) return null;
          return (
            <Marker key={`weather-${cw.city}`} position={coords} icon={createWeatherBadge(cw)}>
              <Popup className="LogiFlow-popup">
                <div className="p-2 w-40">
                  <p className="text-[10px] font-black uppercase tracking-widest text-indigo-600 mb-1">{cw.city} Hub</p>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-black text-slate-800">{cw.condition.replace('_', ' ')}</span>
                    <span className="text-sm font-black text-slate-800">{cw.tempC}°C</span>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* Shipment Polylines & Markers */}
        {shipments.map(s => {
          const oCoords = CITY_COORDS[s.origin];
          const dCoords = CITY_COORDS[s.destination];
          if (!oCoords || !dCoords) return null;

          const isHighlighted = s.id === highlighted;
          const statusCol = s.status === 'delayed' ? '#ef4444' : s.risk_score > 60 ? '#f59e0b' : '#10b981';

          // Calculate "Live Position" for in-transit shipments
          let liveCoords: [number, number] | null = null;
          if (s.status === 'in_transit') {
            const seed = s.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
            const progress = 0.2 + (seed % 60) / 100;
            liveCoords = [
              oCoords[0] + (dCoords[0] - oCoords[0]) * progress,
              oCoords[1] + (dCoords[1] - oCoords[1]) * progress
            ];
          }

          return (
            <React.Fragment key={s.id}>
              <Polyline
                positions={[oCoords, dCoords]}
                color={statusCol}
                weight={isHighlighted ? 4 : 2}
                opacity={isHighlighted ? 0.9 : 0.4}
                dashArray={s.mode === 'air' ? '10 10' : s.mode === 'sea' ? '5 15' : undefined}
              />
              
              <Marker 
                position={oCoords} 
                icon={createVehicleIcon(isHighlighted, s.status, s.risk_score)}
                eventHandlers={{ click: () => onMarkerClick?.(s.id) }}
              />

              {liveCoords && (
                <Marker 
                  position={liveCoords} 
                  icon={L.divIcon({ 
                    html: `
                      <div class="relative flex items-center justify-center" style="width: 32px; height: 32px;">
                        <div class="absolute inset-0 rounded-full bg-[#10b981]/10 animate-ping"></div>
                        <div class="absolute inset-2 rounded-full bg-white shadow-lg flex items-center justify-center border border-slate-100">
                          <div class="w-2.5 h-2.5 rounded-full bg-[#10b981]"></div>
                        </div>
                      </div>
                    `,
                    className: 'bg-transparent border-0',
                    iconSize: [0, 0],
                    iconAnchor: [0, 0]
                  })}
                  eventHandlers={{ click: () => onMarkerClick?.(s.id) }}
                />
              )}

              <Marker 
                position={dCoords} 
                icon={createVehicleIcon(isHighlighted, s.status, s.risk_score)}
                eventHandlers={{ click: () => onMarkerClick?.(s.id) }}
              />
            </React.Fragment>
          );
        })}
      </MapContainer>
      
      {/* Legend */}
      <div className="absolute bottom-10 left-6 z-[1000] bg-white/90 backdrop-blur-md border border-slate-200 p-4 rounded-xl shadow-xl min-w-[140px]">
        <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Shipment Status</h4>
        <div className="space-y-2">
          {[
            { label: 'On Time', color: '#10b981' },
            { label: 'At Risk', color: '#f59e0b' },
            { label: 'Delayed', color: '#ef4444' }
          ].map(item => (
            <div key={item.label} className="flex items-center gap-2.5">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }}></div>
              <span className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

