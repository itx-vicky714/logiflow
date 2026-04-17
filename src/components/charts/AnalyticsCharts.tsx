"use client";

import React from 'react';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ComposedChart
} from 'recharts';

interface Props {
  type: 'volume' | 'modePerf' | 'cost' | 'weather';
  data: Record<string, unknown>[];
  tooltipStyle: React.CSSProperties;
}

export default function AnalyticsCharts({ type, data, tooltipStyle }: Props) {
  // NOTE: This component must be rendered inside a parent div with explicit pixel width AND height.
  // e.g.: <div style={{ width: '100%', height: 240, minHeight: 240 }}><AnalyticsCharts .../></div>
  // ResponsiveContainer with width="100%" height="100%" requires a pixel-sized ancestor.
  return (
    <div style={{width: '100%', height: 300}}>
      <ResponsiveContainer width="100%" height={300}>
        {type === 'volume' ? (
          <ComposedChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id="gradShip" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#2563eb" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradRev" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#16a34a" stopOpacity={0.12} />
                <stop offset="95%" stopColor="#16a34a" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis dataKey="date" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} interval="preserveStartEnd" />
            <YAxis yAxisId="left" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
            <YAxis yAxisId="right" orientation="right" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false}
              tickFormatter={(v: number) => `₹${(v / 100000).toFixed(0)}L`} />
            <Tooltip contentStyle={tooltipStyle} formatter={(val: unknown, name: unknown) =>
              name === 'Revenue' ? [`₹${Number(val).toLocaleString('en-IN')}`, 'Revenue'] : [String(val), String(name)]} />
            <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
            <Area yAxisId="left" type="monotone" dataKey="shipments" name="Shipments" stroke="#2563eb" strokeWidth={2} fill="url(#gradShip)" dot={false} />
            <Line yAxisId="left" type="monotone" dataKey="forecast" name="Forecast" stroke="#8b5cf6" strokeWidth={1.5} strokeDasharray="5 4" dot={false} />
            <Area yAxisId="right" type="monotone" dataKey="revenue" name="Revenue" stroke="#16a34a" strokeWidth={2} fill="url(#gradRev)" dot={false} />
          </ComposedChart>
        ) : type === 'modePerf' ? (
          <BarChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
            <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
            <Tooltip contentStyle={tooltipStyle} cursor={{ fill: '#f8fafc' }} />
            <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
            <Bar dataKey="on_time" name="On Time" fill="#16a34a" radius={[3, 3, 0, 0]} />
            <Bar dataKey="delayed" name="Delayed"  fill="#dc2626" radius={[3, 3, 0, 0]} />
            <Bar dataKey="atRisk"  name="At Risk"  fill="#f97316" radius={[3, 3, 0, 0]} />
          </BarChart>
        ) : type === 'cost' ? (
          <BarChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
            <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false}
              tickFormatter={(v: number) => v >= 100000 ? `₹${(v / 100000).toFixed(0)}L` : `₹${(v / 1000).toFixed(0)}K`} />
            <Tooltip contentStyle={tooltipStyle} formatter={(v: unknown) => [`₹${Number(v).toLocaleString('en-IN')}`, '']} cursor={{ fill: '#f8fafc' }} />
            <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
            <Bar dataKey="revenue" name="Revenue" fill="#2563eb" radius={[3, 3, 0, 0]} />
            <Bar dataKey="cost"    name="Cost"    fill="#94a3b8" radius={[3, 3, 0, 0]} />
            <Bar dataKey="profit"  name="Profit"  fill="#16a34a" radius={[3, 3, 0, 0]} />
          </BarChart>
        ) : (
          /* Weather risk chart */
          <AreaChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="gradRain" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.05} />
              </linearGradient>
              <linearGradient id="gradFog" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#94a3b8" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#94a3b8" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis dataKey="date" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} interval="preserveStartEnd" />
            <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} unit="%" />
            <Tooltip contentStyle={tooltipStyle} formatter={(v: unknown, name: unknown) => [`${String(v)}%`, String(name)]} />
            <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
            <Area type="monotone" dataKey="rain"  name="Rain Risk"  stroke="#3b82f6" strokeWidth={2} fill="url(#gradRain)" />
            <Area type="monotone" dataKey="fog"   name="Fog Risk"   stroke="#94a3b8" strokeWidth={2} fill="url(#gradFog)" />
            <Area type="monotone" dataKey="storm" name="Storm Risk" stroke="#ef4444" strokeWidth={2} fill="none" strokeDasharray="4 3" />
          </AreaChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}
