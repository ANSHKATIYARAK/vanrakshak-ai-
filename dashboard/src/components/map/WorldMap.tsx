'use client';

import React, { useMemo } from 'react';

interface WorldMapProps {
  threatScore: number;
  integrityScore: number;
  localization: any;
  meshData: any;
}

// Color palette for the map
const COLORS = {
  active: '#00c853',
  alert: '#ff3d00',
  offline: '#546e7a',
  grid: 'rgba(255,255,255,0.06)',
  scan: 'rgba(0,200,83,0.15)',
  text: 'rgba(255,255,255,0.5)',
};

export default function WorldMap({ threatScore, integrityScore, localization, meshData }: WorldMapProps) {
  const nodes = meshData?.nodes || [];

  // Normalize node coordinates to a 0-1 range relative to the bounding box
  const bounds = useMemo(() => {
    if (!nodes.length) return { minLat: 24.12, maxLat: 24.13, minLng: 78.23, maxLng: 78.25 };
    const lats = nodes.map((n: any) => n.lat);
    const lngs = nodes.map((n: any) => n.lng);
    const pad = 0.002;
    return {
      minLat: Math.min(...lats) - pad,
      maxLat: Math.max(...lats) + pad,
      minLng: Math.min(...lngs) - pad,
      maxLng: Math.max(...lngs) + pad,
    };
  }, [nodes]);

  const toSvgCoords = (lat: number, lng: number, w: number, h: number) => {
    const x = ((lng - bounds.minLng) / (bounds.maxLng - bounds.minLng)) * w;
    // SVG Y is inverted (lat increases upward, SVG y increases downward)
    const y = (1 - (lat - bounds.minLat) / (bounds.maxLat - bounds.minLat)) * h;
    return { x, y };
  };

  const W = 400;
  const H = 240;

  // Grid lines
  const gridLines = [];
  for (let i = 0; i <= 8; i++) {
    gridLines.push(<line key={`v${i}`} x1={i * W / 8} y1={0} x2={i * W / 8} y2={H} stroke={COLORS.grid} strokeWidth={1} />);
    gridLines.push(<line key={`h${i}`} x1={0} y1={i * H / 8} x2={W} y2={i * H / 8} stroke={COLORS.grid} strokeWidth={1} />);
  }

  // Corner coordinates label
  const centerLat = ((bounds.minLat + bounds.maxLat) / 2).toFixed(4);
  const centerLng = ((bounds.minLng + bounds.maxLng) / 2).toFixed(4);

  return (
    <div className="relative w-full h-full min-h-[220px] bg-[#05070A] rounded border border-white/5 overflow-hidden flex flex-col">
      {/* Map Header */}
      <div className="absolute top-2 left-3 z-10 flex gap-3 items-center">
        <span className="text-xs font-mono text-emerald-400/70 bg-emerald-950/40 border border-emerald-500/20 px-2 py-0.5 rounded">
          {centerLat}°N {centerLng}°E
        </span>
        <span className="text-xs font-mono text-white/40">
          Zoom: 14.5x · Pitch: 60°
        </span>
      </div>

      {/* Integrity status badge */}
      <div className="absolute top-2 right-3 z-10">
        <span className={`text-xs font-bold px-2 py-0.5 rounded border-2 uppercase ${
          integrityScore >= 80 ? 'border-emerald-500/40 text-emerald-400 bg-emerald-950/30' :
          integrityScore >= 50 ? 'border-amber-500/40 text-amber-400 bg-amber-950/30' :
          'border-red-500/40 text-red-400 bg-red-950/30'
        }`}>
          Integrity: {integrityScore}%
        </span>
      </div>

      {/* SVG tactical map */}
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-full"
        style={{ fontFamily: 'monospace' }}
      >
        {/* Background */}
        <rect width={W} height={H} fill="#05070A" />

        {/* Terrain-like subtle gradient */}
        <defs>
          <radialGradient id="terrain" cx="50%" cy="60%" r="60%">
            <stop offset="0%" stopColor="#0a1a0a" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#05070A" stopOpacity="1" />
          </radialGradient>
          <radialGradient id="scan-pulse" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#00c853" stopOpacity="0.08" />
            <stop offset="100%" stopColor="#00c853" stopOpacity="0" />
          </radialGradient>
          {nodes.map((node: any) => {
            const { x, y } = toSvgCoords(node.lat, node.lng, W, H);
            const color = node.status === 'alert' ? COLORS.alert : node.status === 'offline' ? COLORS.offline : COLORS.active;
            return (
              <radialGradient key={`grad-${node.id}`} id={`node-glow-${node.id}`} cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor={color} stopOpacity="0.3" />
                <stop offset="100%" stopColor={color} stopOpacity="0" />
              </radialGradient>
            );
          })}
        </defs>

        <rect width={W} height={H} fill="url(#terrain)" />

        {/* Grid overlay */}
        {gridLines}

        {/* Scan sweep radius from each node */}
        {nodes.map((node: any) => {
          const { x, y } = toSvgCoords(node.lat, node.lng, W, H);
          return (
            <circle
              key={`scan-${node.id}`}
              cx={x} cy={y} r={60}
              fill={`url(#node-glow-${node.id})`}
            />
          );
        })}

        {/* Threat heatmap overlay when score is high */}
        {threatScore > 0.4 && nodes.map((node: any) => {
          if (node.status !== 'alert') return null;
          const { x, y } = toSvgCoords(node.lat, node.lng, W, H);
          return (
            <circle
              key={`heat-${node.id}`}
              cx={x} cy={y} r={80}
              fill="none"
              stroke={COLORS.alert}
              strokeWidth={1}
              strokeOpacity={0.2 * threatScore}
              strokeDasharray="4 6"
            />
          );
        })}

        {/* Mesh connection lines */}
        {(() => {
          const lines = [];
          for (let i = 0; i < nodes.length; i++) {
            for (let j = i + 1; j < nodes.length; j++) {
              const a = toSvgCoords(nodes[i].lat, nodes[i].lng, W, H);
              const b = toSvgCoords(nodes[j].lat, nodes[j].lng, W, H);
              const isAlert = nodes[i].status === 'alert' || nodes[j].status === 'alert';
              lines.push(
                <line
                  key={`line-${i}-${j}`}
                  x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                  stroke={isAlert ? COLORS.alert : COLORS.active}
                  strokeWidth={isAlert ? 1.5 : 0.8}
                  strokeOpacity={isAlert ? 0.6 : 0.25}
                  strokeDasharray={isAlert ? '0' : '4 4'}
                />
              );
            }
          }
          return lines;
        })()}

        {/* Node markers */}
        {nodes.map((node: any) => {
          const { x, y } = toSvgCoords(node.lat, node.lng, W, H);
          const color = node.status === 'alert' ? COLORS.alert : node.status === 'offline' ? COLORS.offline : COLORS.active;

          return (
            <g key={`node-${node.id}`}>
              {/* Outer pulse ring (alert only) */}
              {node.status === 'alert' && (
                <circle cx={x} cy={y} r={14} fill="none" stroke={color} strokeWidth={1} strokeOpacity={0.4} />
              )}
              {/* Node dot */}
              <circle cx={x} cy={y} r={6} fill={color} fillOpacity={0.9} stroke="white" strokeWidth={1} strokeOpacity={0.5} />
              {/* Center dot */}
              <circle cx={x} cy={y} r={2} fill="white" fillOpacity={0.8} />
              {/* Label */}
              <text x={x + 10} y={y + 4} fill={color} fontSize={10} fontFamily="monospace" fontWeight="bold">
                {node.id}
              </text>
              {/* Battery indicator */}
              <text x={x + 10} y={y + 16} fill="rgba(255,255,255,0.4)" fontSize={9} fontFamily="monospace">
                BAT {node.battery || 0}%
              </text>
            </g>
          );
        })}

        {/* TDOA localization ring */}
        {localization && (() => {
          const { x, y } = toSvgCoords(localization.lat, localization.lng, W, H);
          return (
            <>
              <circle cx={x} cy={y} r={20} fill="none" stroke={COLORS.alert} strokeWidth={1.5} strokeOpacity={0.7} strokeDasharray="4 3" />
              <circle cx={x} cy={y} r={4} fill={COLORS.alert} fillOpacity={0.8} />
            </>
          );
        })()}

        {/* Compass indicator */}
        <g transform={`translate(${W - 28}, 30)`}>
          <circle r={14} fill="rgba(10,14,18,0.8)" stroke="rgba(255,255,255,0.1)" strokeWidth={1} />
          <text x={0} y={-4} textAnchor="middle" fill="rgba(255,255,255,0.6)" fontSize={8} fontFamily="monospace">N</text>
          <line x1={0} y1={-10} x2={0} y2={-4} stroke="rgba(255,255,255,0.6)" strokeWidth={1} />
        </g>

        {/* Status bar at bottom */}
        <rect x={0} y={H - 20} width={W} height={20} fill="rgba(10,14,18,0.8)" />
        <text x={8} y={H - 7} fill="rgba(255,255,255,0.3)" fontSize={9} fontFamily="monospace">
          {`TACTICAL OVERLAY · ${nodes.length} NODE${nodes.length !== 1 ? 'S' : ''} TRACKED · SENSOR GRID ACTIVE`}
        </text>
      </svg>
    </div>
  );
}
