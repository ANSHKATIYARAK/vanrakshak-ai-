'use client';

import React from 'react';
import { THEME } from '@/lib/design-system';

interface TelemetryFeedProps {
  logs: string[];
}

export default function TelemetryFeed({ logs }: TelemetryFeedProps) {
  return (
    <div className="flex flex-col h-full bg-[#0A0E12]/80 backdrop-blur-md border-l border-white/5 p-4 overflow-hidden">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
        <h2 className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/50">
          Intelligence Feed
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto space-y-2 scrollbar-hide">
        {logs.map((log, i) => {
          const isCritical = log.includes('CRITICAL') || log.includes('ALERT');
          const isAnalysis = log.includes('ANALYSIS');
          
          let textColor = 'text-white/60';
          if (isCritical) textColor = 'text-red-500';
          else if (isAnalysis) textColor = 'text-amber-500';

          return (
            <div 
              key={i} 
              className={`font-mono text-[11px] leading-relaxed border-b border-white/5 pb-2 last:border-0 transition-opacity duration-500 ${i === 0 ? 'opacity-100' : 'opacity-40'}`}
            >
              <span className={textColor}>{log}</span>
            </div>
          );
        })}
      </div>

      <div className="mt-4 pt-4 border-t border-white/5 flex justify-between items-center">
        <span className="text-[9px] font-mono text-white/20 uppercase">Sync: Active</span>
        <span className="text-[9px] font-mono text-white/20 uppercase">Mode: Institutional</span>
      </div>
    </div>
  );
}
