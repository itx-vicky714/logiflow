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
  // Precision Editorial Chart Palette
  const colors = {
    primary: '#493ee5',
    secondary: '#635bff',
    tertiary: '#ced2d6',
    error: '#ba1a1a',
    success: '#321ed2', // Editorial Indigo
    neutral: '#e0e3e5'
  };

  return (
    <div style={{width: '100%', height: 300}}>
      <ResponsiveContainer width="100%" height={300}>
        {type === 'volume' ? (
          <ComposedChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id="gradShip" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor={colors.primary} stopOpacity={0.15} />
                <stop offset="95%" stopColor={colors.primary} stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradRev" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor={colors.success} stopOpacity={0.12} />
                <stop offset="95%" stopColor={colors.success} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis dataKey="date" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} interval="preserveStartEnd" />
            <YAxis yAxisId="left" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
            <YAxis yAxisId="right" orientation="right" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false}
              tickFormatter={(v: number) => `₹${(v / 100000).toFixed(0)}L`} />
            <Tooltip contentStyle={tooltipStyle} formatter={(val: unknown, name: unknown) =>
              name === 'Revenue' ? [`₹${Number(val).toLocaleString('en-IN')}`, 'Revenue'] : [String(val), String(name)]} />
            <Legend wrapperStyle={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', paddingTop: 8 }} />
            <Area yAxisId="left" type="monotone" dataKey="shipments" name="Shipments" stroke={colors.primary} strokeWidth={2} fill="url(#gradShip)" dot={false} />
            <Line yAxisId="left" type="monotone" dataKey="forecast" name="Forecast" stroke={colors.secondary} strokeWidth={1.5} strokeDasharray="5 4" dot={false} />
            <Area yAxisId="right" type="monotone" dataKey="revenue" name="Revenue" stroke={colors.success} strokeWidth={2} fill="url(#gradRev)" dot={false} />
          </ComposedChart>
        ) : type === 'modePerf' ? (
          <BarChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
            <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
            <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'transparent' }} />
            <Legend wrapperStyle={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', paddingTop: 8 }} />
            <Bar dataKey="on_time" name="On Time" fill={colors.success} radius={[4, 4, 0, 0]} barSize={24} />
            <Bar dataKey="delayed" name="Delayed"  fill={colors.error} radius={[4, 4, 0, 0]} barSize={24} />
            <Bar dataKey="atRisk"  name="At Risk"  fill="#f59e0b" radius={[4, 4, 0, 0]} barSize={24} />
          </BarChart>
        ) : type === 'cost' ? (
          <BarChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
            <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false}
              tickFormatter={(v: number) => v >= 100000 ? `₹${(v / 100000).toFixed(0)}L` : `₹${(v / 1000).toFixed(0)}K`} />
            <Tooltip contentStyle={tooltipStyle} formatter={(v: unknown) => [`₹${Number(v).toLocaleString('en-IN')}`, '']} cursor={{ fill: 'transparent' }} />
            <Legend wrapperStyle={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', paddingTop: 8 }} />
            <Bar dataKey="revenue" name="Revenue" fill={colors.primary} radius={[4, 4, 0, 0]} barSize={20} />
            <Bar dataKey="cost"    name="Cost"    fill={colors.neutral} radius={[4, 4, 0, 0]} barSize={20} />
            <Bar dataKey="profit"  name="Profit"  fill={colors.success} radius={[4, 4, 0, 0]} barSize={20} />
          </BarChart>
        ) : (
          <AreaChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="gradRain" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor={colors.primary} stopOpacity={0.3} />
                <stop offset="95%" stopColor={colors.primary} stopOpacity={0.05} />
              </linearGradient>
              <linearGradient id="gradFog" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor={colors.neutral} stopOpacity={0.3} />
                <stop offset="95%" stopColor={colors.neutral} stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis dataKey="date" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} interval="preserveStartEnd" />
            <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} unit="%" />
            <Tooltip contentStyle={tooltipStyle} formatter={(v: unknown, name: unknown) => [`${String(v)}%`, String(name)]} />
            <Legend wrapperStyle={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', paddingTop: 8 }} />
            <Area type="monotone" dataKey="rain"  name="Rain Risk"  stroke={colors.primary} strokeWidth={2} fill="url(#gradRain)" />
            <Area type="monotone" dataKey="fog"   name="Fog Risk"   stroke={colors.neutral} strokeWidth={2} fill="url(#gradFog)" />
            <Area type="monotone" dataKey="storm" name="Storm Risk" stroke={colors.error} strokeWidth={2} fill="none" strokeDasharray="4 3" />
          </AreaChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}
