'use client';

import React from 'react';
import { THEME, UI_STATES } from '@/lib/design-system';
import { Activity, Shield, Zap, Globe } from 'lucide-react';

interface IntegrityScoreProps {
  score: number;
  state: keyof typeof UI_STATES;
}

export function IntegrityScore({ score, state }: IntegrityScoreProps) {
  const currentState = UI_STATES[state] || UI_STATES.STABLE;

  return (
    <div className="flex flex-col items-center justify-center p-8 bg-[#0A0E12]/40 border border-white/5 rounded-xl backdrop-blur-xl">
      <div className="text-[10px] font-black uppercase tracking-[0.5em] text-white/30 mb-4">
        Forest Integrity Index
      </div>
      <div 
        className="text-7xl font-light tracking-tighter transition-colors duration-1000"
        style={{ color: currentState.color, textShadow: THEME.effects.glow[state.toLowerCase() as keyof typeof THEME.effects.glow] }}
      >
        {score.toFixed(1)}<span className="text-2xl ml-1 opacity-50">%</span>
      </div>
      <div className="mt-4 flex items-center gap-3">
        <div className="px-3 py-1 border rounded-sm text-[10px] font-bold tracking-widest uppercase" style={{ borderColor: `${currentState.color}40`, color: currentState.color }}>
          {currentState.label}
        </div>
        <div className="w-24 h-1 bg-white/5 rounded-full overflow-hidden">
          <div 
            className="h-full transition-all duration-1000" 
            style={{ width: `${score}%`, backgroundColor: currentState.color }} 
          />
        </div>
      </div>
    </div>
  );
}

interface MetricPanelProps {
  metrics: {
    biodiversity: number;
    node_vitality: number;
    eco_stability: number;
    security_state: number;
  };
  mesh: {
    active: number;
    latency: number;
    routing_efficiency: number;
  };
}

export function MetricPanels({ metrics, mesh }: MetricPanelProps) {
  return (
    <div className="grid grid-cols-2 gap-4">
      {/* Primary Metrics */}
      <div className="p-4 bg-[#0A0E12]/60 border border-white/5 rounded-lg flex flex-col justify-between">
         <div className="flex items-center gap-2 mb-2 text-white/30">
            <Globe size={14} />
            <span className="text-[9px] font-bold uppercase tracking-widest">Bio-Vitality</span>
         </div>
         <div className="text-2xl font-light text-white">{metrics.biodiversity}%</div>
         <div className="w-full h-0.5 bg-white/5 mt-2">
            <div className="h-full bg-green-500/50" style={{ width: `${metrics.biodiversity}%` }} />
         </div>
      </div>

      <div className="p-4 bg-[#0A0E12]/60 border border-white/5 rounded-lg flex flex-col justify-between">
         <div className="flex items-center gap-2 mb-2 text-white/30">
            <Shield size={14} />
            <span className="text-[9px] font-bold uppercase tracking-widest">Security State</span>
         </div>
         <div className="text-2xl font-light text-white">{metrics.security_state}%</div>
         <div className="w-full h-0.5 bg-white/5 mt-2">
            <div className="h-full bg-red-500/50" style={{ width: `${metrics.security_state}%` }} />
         </div>
      </div>

      {/* Infrastructure Metrics */}
      <div className="col-span-2 p-4 bg-[#0A0E12]/60 border border-white/5 rounded-lg">
         <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2 text-white/30">
                <Zap size={14} />
                <span className="text-[9px] font-bold uppercase tracking-widest">Mesh Infrastructure</span>
            </div>
            <span className="text-[9px] font-mono text-green-500/80">ACTIVE: {mesh.active} NODES</span>
         </div>
         <div className="grid grid-cols-2 gap-8">
            <div>
                <div className="text-[9px] text-white/20 uppercase mb-1">Latency</div>
                <div className="text-lg font-mono text-white/80">{mesh.latency}<span className="text-xs opacity-30 ml-1">ms</span></div>
            </div>
            <div>
                <div className="text-[9px] text-white/20 uppercase mb-1">Efficiency</div>
                <div className="text-lg font-mono text-white/80">{(mesh.routing_efficiency * 100).toFixed(1)}%</div>
            </div>
         </div>
      </div>
    </div>
  );
}
