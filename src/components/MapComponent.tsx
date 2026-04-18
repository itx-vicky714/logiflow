"use client";

import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix typical Leaflet icon issue in Next.js
const iconRetinaUrl = 'https://unpkg.com/leaflet@1.9.4/dist/images/Marker-icon-2x.png';
const iconUrl = 'https://unpkg.com/leaflet@1.9.4/dist/images/Marker-icon.png';
const shadowUrl = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png';

const greenIcon = new L.Icon({
  iconUrl,
  iconRetinaUrl,
  shadowUrl,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  className: 'hue-rotate-[250deg] saturate-200' // Make it emerald-ish
});

const redIcon = new L.Icon({
  iconUrl,
  iconRetinaUrl,
  shadowUrl,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  className: 'hue-rotate-[150deg] saturate-200' // Make it red-ish
});

const blueIcon = new L.Icon({
  iconUrl,
  iconRetinaUrl,
  shadowUrl,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34]
});

// City coordinates mapping
const cityCoords: Record<string, [number, number]> = {
  "Delhi": [28.6139, 77.2090],
  "Mumbai": [19.0760, 72.8777],
  "Chennai": [13.0827, 80.2707],
  "Bangalore": [12.9716, 77.5946],
  "Kolkata": [22.5726, 88.3639],
  "Hyderabad": [17.3850, 78.4867],
  "Pune": [18.5204, 73.8567],
  "Ahmedabad": [23.0225, 72.5714],
  "Jaipur": [26.9124, 75.7873],
  "Lucknow": [26.8467, 80.9462],
  "Surat": [21.1702, 72.8311],
  "Nagpur": [21.1458, 79.0882],
  "Kochi": [9.9312, 76.2673]
};

interface ShipmentMarker {
  id: string;
  origin: string;
  dest: string;
  status: string;
  eta: string;
}

// We receive ALL_SHIPMENTS directly from the props to render
export default function MapComponent({ shipments }: { shipments: ShipmentMarker[] }) {
  useEffect(() => {
    // any manual DOM setup if needed (leaflet requires this sometimes)
  }, []);

  return (
    <div className="h-full w-full rounded-xl overflow-hidden shadow-[0_0_20px_rgba(139,92,246,0.15)] border border-border">
      <MapContainer 
        center={[20.5937, 78.9629]} // Center of India
        zoom={5} 
        scrollWheelZoom={true} 
        style={{ height: '100%', width: '100%', background: '#0F172A' }}
      >
        {/* Light mode styled map tiles (CartoDB Light) */}
        <TileLayer
          attribution='&copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        />
        
        {shipments.map((shipment) => {
          const loc = shipment.status === 'delivered' ? shipment.dest : shipment.origin;
          const coords = cityCoords[loc];
          if(!coords) return null;

          const activeIcon = 
            shipment.status === 'on_time' || shipment.status === 'delivered' ? greenIcon :
            shipment.status === 'delayed' ? redIcon : blueIcon;

          return (
            <Marker key={shipment.id} position={coords} icon={activeIcon}>
              <Popup className="glass-popup">
                <div className="font-sans text-slate-800 p-1">
                  <h3 className="font-bold text-sm border-b pb-1 mb-1">{shipment.id}</h3>
                  <p className="text-xs mb-1"><strong>Route:</strong> {shipment.origin} → {shipment.dest}</p>
                  <p className="text-xs mb-1"><strong>Status:</strong> {shipment.status}</p>
                  <p className="text-xs"><strong>ETA:</strong> {shipment.eta}</p>
                  <a href={`/shipments/${shipment.id}`} className="block mt-2 text-xs text-blue-600 font-semibold hover:underline border-t pt-1">
                    View Details
                  </a>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
      <style jsx global>{`
        .leaflet-container {
         font-family: inherit;
        }
        .leaflet-popup-content-wrapper {
          background-color: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(8px);
          border-radius: 8px;
        }
        .leaflet-popup-tip {
          background-color: rgba(255, 255, 255, 0.95);
        }
      `}</style>
    </div>
  );
}
