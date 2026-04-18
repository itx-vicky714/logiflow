"use client";

import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Shipment } from '@/types';
import { modeColor, statusConfig, CITY_COORDS } from '@/lib/utils';
import { KEY_CITIES, getCityWeather, getWeatherRiskColor } from '@/lib/weather';

// Fix Leaflet default icon issue
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;

// Premium custom map pin icons
// Premium custom map pin icons
// Premium custom vehicle icons
const createVehicleIcon = (mode: string, isHighlighted: boolean, status: string, riskScore: number) => {
  const isRed = status === 'delayed';
  const isYellow = riskScore > 60 && !isRed;
  const isGreen = !isRed && !isYellow;

  const color = isRed ? '#ef4444' : isYellow ? '#f59e0b' : '#10b981';
  const ringColor = isRed ? 'rgba(239,68,68,0.3)' : isYellow ? 'rgba(245,158,11,0.3)' : 'rgba(16,185,129,0.3)';

  const html = `
    <div class="relative flex items-center justify-center transition-all duration-300" style="width: ${isHighlighted ? '24px' : '16px'}; height: ${isHighlighted ? '24px' : '16px'};">
      ${isHighlighted ? `<div class="absolute inset-0 rounded-full animate-ping" style="background-color: ${ringColor};"></div>` : ''}
      <div class="absolute inset-0 rounded-full border-[2.5px] border-white shadow-md z-10" style="background-color: ${color};"></div>
    </div>
  `;
  return L.divIcon({ html, className: 'custom-vehicle-icon bg-transparent border-0', iconSize: [0, 0], iconAnchor: [0, 0], popupAnchor: [0, -10] });
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
      map.fitBounds(bounds as L.LatLngBoundsExpression, { padding: [100, 100], maxZoom: 6, animate: true, duration: 1.5 });
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
      <div className="absolute inset-0 pointer-events-none z-50 overflow-hidden opacity-[0.1]">
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
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
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
              {/* Actual Polyline */}
              <Polyline
                positions={[originCoords, destCoords]}
                color={s.status === 'delayed' ? '#ef4444' : s.risk_score > 60 ? '#f59e0b' : '#10b981'}
                weight={isHighlighted ? 4 : 2}
                opacity={isHighlighted ? 0.9 : isFocusMode ? 0.05 : 0.6}
                className={isHighlighted ? 'drop-shadow-[0_0_8px_rgba(59,130,246,0.3)]' : ''}
                dashArray={s.mode === 'air' ? '10 10' : s.mode === 'sea' ? '5 10' : undefined}
              />
              <Marker 
                position={originCoords} 
                icon={createVehicleIcon(s.mode, isHighlighted, s.status, s.risk_score)} 
                zIndexOffset={isHighlighted ? 1000 : 0}
                opacity={isHighlighted ? 1 : isFocusMode ? 0.2 : 1}
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
                icon={createVehicleIcon(s.mode, isHighlighted, s.status, s.risk_score)} 
                zIndexOffset={isHighlighted ? 1000 : 0}
                opacity={isHighlighted ? 1 : isFocusMode ? 0.2 : 1}
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

        <div className="leaflet-bottom leaflet-right" style={{ zIndex: 1000, margin: '20px' }}>
          <div className="leaflet-control bg-white rounded-xl p-4 shadow-lg border border-slate-200 transition-opacity duration-300">
            <h4 className="text-[10px] font-black text-slate-800 uppercase tracking-widest mb-3">Map Legend</h4>
            <div className="grid grid-cols-2 gap-x-6 gap-y-3">
              {[
                { label: 'Normal', color: '#10b981' },
                { label: 'At Risk', color: '#f59e0b' },
                { label: 'Delayed', color: '#ef4444' }
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full border-2 border-white shadow-sm" style={{ backgroundColor: item.color }}></div>
                  <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">{item.label}</span>
                </div>
              ))}
              
              <div className="flex items-center gap-2">
                <div className="w-4 h-0.5 bg-slate-400"></div>
                <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">Route</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full border-2 border-white bg-slate-300 relative flex items-center justify-center shadow-sm">
                   <div className="absolute w-5 h-5 border border-slate-300 rounded-full"></div>
                </div>
                <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">Selected</span>
              </div>
            </div>
          </div>
        </div>
      </MapContainer>
    </div>
  );
}
