"use client";

import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Shipment } from '@/types';
import { modeColor, statusConfig, CITY_COORDS } from '@/lib/utils';
import { KEY_CITIES, getCityWeather, getWeatherRiskColor } from '@/lib/weather';

// Fix Leaflet default icon issue
delete (L.Icon.Default.prototype as any)._getIconUrl;

// Premium custom map pin icons
// Premium custom map pin icons
// Premium custom vehicle icons
const createVehicleIcon = (mode: 'road' | 'rail' | 'air' | 'sea', isHighlighted: boolean) => {
  const modeMap = {
    road: { icon: '🚛', color: '#f97316' },
    rail: { icon: '🚂', color: '#3b82f6' },
    air:  { icon: '✈️', color: '#8b5cf6' },
    sea:  { icon: '🚢', color: '#14b8a6' }
  };
  const { icon, color } = modeMap[mode] || modeMap.road;
  
  const html = `
    <div class="relative w-8 h-8 -translate-x-1/2 -translate-y-1/2 transition-all duration-500 scale-${isHighlighted ? '125' : '100'}">
      ${isHighlighted ? `<div class="absolute inset-0 rounded-full opacity-30 animate-ping" style="background-color: ${color};"></div>` : ''}
      <div class="absolute inset-0 rounded-xl bg-slate-900/80 backdrop-blur-md border border-white/20 shadow-2xl flex items-center justify-center text-[16px]">
        ${icon}
      </div>
      <div class="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full border border-white" style="background-color: ${color};"></div>
    </div>
  `;
  return L.divIcon({ html, className: 'custom-vehicle-icon', iconSize: [0, 0], iconAnchor: [0, 0], popupAnchor: [0, -15] });
};

// Custom Weather Badge Icon Generator - Frosted glass look
function createWeatherBadge(cityWeather: ReturnType<typeof getCityWeather>) {
  const isHighRisk = cityWeather.riskLevel === 'high' || cityWeather.riskLevel === 'severe';
  const isMediumRisk = cityWeather.riskLevel === 'medium';
  
  const bgStyle = isHighRisk ? 'background-color: rgba(244, 63, 94, 0.9); color: white; border-color: rgba(251, 113, 133, 1);' : 
                   isMediumRisk ? 'background-color: rgba(251, 191, 36, 0.9); color: #451a03; border-color: rgba(252, 211, 77, 1);' : 
                   'background-color: rgba(255, 255, 255, 0.85); color: #1e293b; border-color: rgba(226, 232, 240, 0.6);';

  const shadow = isHighRisk ? '0 8px 20px rgba(244, 63, 94, 0.5)' : '0 10px 15px -3px rgba(0, 0, 0, 0.1)';

  const html = `
    <div class="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl border text-[11px] font-black tracking-tight whitespace-nowrap -translate-x-1/2 -translate-y-1/2 cursor-pointer hover:scale-110 transition-transform duration-300" 
         style="${bgStyle} box-shadow: ${shadow}; backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);">
      <span class="text-[14px]">${cityWeather.icon}</span>
      <span class="tabular-nums">${cityWeather.tempC}°C</span>
    </div>
  `;

  return L.divIcon({ html, className: 'custom-weather-badge', iconSize: [0, 0], iconAnchor: [0, 0], popupAnchor: [0, -15] });
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
      map.fitBounds(bounds as any, { padding: [100, 100], maxZoom: 6, animate: true, duration: 1.5 });
    }
  }, [shipments, map]);
  return null;
}

interface Props {
  shipments: Shipment[];
  highlighted: string | null;
}

export default function MapLayout({ shipments, highlighted }: Props) {
  const isFocusMode = !!highlighted;
  const plottedCities = new Set<string>();
  shipments.forEach(s => {
    if (CITY_COORDS[s.origin]) plottedCities.add(s.origin);
    if (CITY_COORDS[s.destination]) plottedCities.add(s.destination);
  });

  const activeCitiesWeather = Array.from(plottedCities).map(city => getCityWeather(city));

  return (
    <div className="h-[100%] w-full bg-[#f8fafc] z-0 relative">
      {/* Premium SVG Grid Overlay */}
      <div className="absolute inset-0 pointer-events-none z-50 overflow-hidden opacity-[0.03]">
        <svg width="100%" height="100%">
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="1"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>

      <MapContainer
        center={[22.5937, 78.9629]}
        zoom={4.5}
        scrollWheelZoom
        zoomControl={false}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />
        <FitBounds shipments={shipments} />

        {/* Plot Weather Badges */}
        {activeCitiesWeather.map(cw => {
          const coords = CITY_COORDS[cw.city];
          if (!coords) return null;
          // Dim weather if focusing on a specific shipment that doesn't involve this city
          const cityIsRelevant = !isFocusMode || shipments.some(s => s.id === highlighted && (s.origin === cw.city || s.destination === cw.city));
          
          return (
            <Marker 
              key={`weather-${cw.city}`} 
              position={coords} 
              icon={createWeatherBadge(cw)}
              opacity={cityIsRelevant ? 1 : 0.3}
            >
              <Popup className="premium-popup">
                <div className="p-2 font-sans w-48">
                  <div className="flex items-center gap-3 border-b border-slate-100 pb-3 mb-3">
                    <div className="text-4xl filter drop-shadow-sm">{cw.icon}</div>
                    <div>
                      <div className="font-black text-slate-800 text-sm leading-tight tracking-wide">{cw.city}</div>
                      <div className="text-xs text-slate-500 font-bold capitalize">{cw.condition.replace('_', ' ')}</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-x-2 gap-y-3 text-xs mb-1">
                    <div className="bg-slate-50 rounded-lg p-2 text-center">
                      <div className="text-slate-400 font-black mb-1 uppercase tracking-widest text-[9px]">Temp</div>
                      <div className="font-black text-slate-700">{cw.tempC}°C</div>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-2 text-center">
                      <div className="text-slate-400 font-black mb-1 uppercase tracking-widest text-[9px]">Wind</div>
                      <div className="font-black text-slate-700">{cw.windKmph} km/h</div>
                    </div>
                  </div>
                  {cw.warning && (
                    <div className="mt-3 text-[10px] font-black bg-rose-50 text-rose-700 border border-rose-200 p-2 rounded-lg uppercase tracking-wide leading-relaxed shadow-inner">
                      ⚠️ {cw.warning}
                    </div>
                  )}
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* Plot Shipments */}
        {shipments.map(s => {
          const originCoords = CITY_COORDS[s.origin];
          const destCoords = CITY_COORDS[s.destination];
          if (!originCoords || !destCoords) return null;

          const color = modeColor(s.mode);
          const isHighlighted = s.id === highlighted;
          const sc = statusConfig(s.status);

          return (
            <React.Fragment key={s.id}>
              {/* Glow Polyline for Highlighted */}
              {isHighlighted && (
                <Polyline
                  positions={[originCoords, destCoords]}
                  color={color} weight={12} opacity={0.2} className="animate-pulse"
                />
              )}
              {/* Actual Polyline with enhanced glow */}
              <Polyline
                positions={[originCoords, destCoords]}
                color={color}
                weight={isHighlighted ? 4 : 3}
                opacity={isHighlighted ? 0.9 : isFocusMode ? 0.05 : 0.3}
                className={isHighlighted ? 'drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]' : ''}
                dashArray={s.mode === 'air' ? '10 10' : s.mode === 'sea' ? '5 10' : undefined}
              />
              <Marker 
                position={originCoords} 
                icon={createVehicleIcon(s.mode, isHighlighted)} 
                zIndexOffset={isHighlighted ? 1000 : 0}
                opacity={isHighlighted ? 1 : isFocusMode ? 0.1 : 0.8}
              >
                <Popup className="premium-popup">
                  <div className="text-xs font-sans p-1">
                    <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 flex justify-between items-center border-b border-slate-700 pb-2">
                       Active Dispatch Origin
                    </div>
                    <div className="font-black text-slate-100 text-[14px] leading-tight">{s.origin}</div>
                  </div>
                </Popup>
              </Marker>
              <Marker 
                position={destCoords} 
                icon={createVehicleIcon(s.mode, isHighlighted)} 
                zIndexOffset={isHighlighted ? 1000 : 0}
                opacity={isHighlighted ? 1 : isFocusMode ? 0.1 : 0.8}
              >
                <Popup className="premium-popup">
                  <div className="text-xs font-sans p-1">
                    <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 flex justify-between items-center border-b border-slate-700 pb-2">
                      Arrival Node
                    </div>
                    <div className="font-black text-slate-100 text-[14px] leading-tight">{s.destination}</div>
                  </div>
                </Popup>
              </Marker>
            </React.Fragment>
          );
        })}

        {/* Map UI Legend Overlay — Now bottom-right with dark theme */}
        <div className="leaflet-bottom leaflet-right" style={{ zIndex: 1000, margin: '24px' }}>
          <div className="leaflet-control bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-3xl p-5 shadow-[0_20px_50px_rgba(0,0,0,0.3)] transition-opacity duration-300" style={{ opacity: isFocusMode ? 0.4 : 1 }}>
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-[#3b5bdb] animate-pulse"/> MODAL INFRASTRUCTURE
            </div>
            {[['road', '#f97316', 'Road Freight', 'solid'], ['rail', '#3b82f6', 'Rail Cargo', 'solid'], ['air', '#8b5cf6', 'Air Freight', 'dashed'], ['sea', '#14b8a6', 'Ocean Transit', 'dotted']].map(([,color, label, type]) => (
              <div key={label} className="flex items-center gap-4 mb-3 last:mb-0">
                <div className="w-8 h-1 rounded-full relative overflow-hidden shrink-0" style={{ backgroundColor: type === 'solid' ? color as string : 'transparent' }}>
                  {type === 'dashed' && <div className="absolute inset-0 border-b-[2px]" style={{ borderColor: color as string, borderStyle: 'dashed' }} />}
                  {type === 'dotted' && <div className="absolute inset-0 border-b-[3px]" style={{ borderColor: color as string, borderStyle: 'dotted' }} />}
                </div>
                <span className="text-[11px] font-black text-slate-300 tracking-wider uppercase">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </MapContainer>
    </div>
  );
}
