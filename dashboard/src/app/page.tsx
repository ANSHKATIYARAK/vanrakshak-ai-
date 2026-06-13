'use client';

import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import WorldMap from '@/components/map/WorldMap';
import DigitalTwin from '@/components/three/DigitalTwin';
import TelemetryFeed from '@/components/ui/TelemetryFeed';
import { IntegrityScore, MetricPanels } from '@/components/ui/IntelligencePanels';
import { audioEngine } from '@/lib/audio-engine';
import { THEME, UI_STATES } from '@/lib/design-system';

export default function CommandCenter() {
  const [data, setData] = useState<any>(null);
  const [isAudioInit, setIsAudioInit] = useState(false);
  const ws = useRef<WebSocket | null>(null);

  useEffect(() => {
    // Connect to Backend Intelligence Engine
    ws.current = new WebSocket('ws://localhost:8000/ws');

    ws.current.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (message.type === 'simulation_state') {
        setData(message.data);
        
        // Update Audio Engine
        if (isAudioInit) {
          audioEngine.update(message.data.integrity_score, message.data.threat_score);
        }
      }
    };

    return () => {
      if (ws.current) ws.current.close();
    };
  }, [isAudioInit]);

  const handleInitAudio = async () => {
    await audioEngine.init();
    setIsAudioInit(true);
  };

  if (!data) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#05070A] text-white font-mono">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-2 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
          <span className="text-[10px] tracking-[0.4em] uppercase opacity-50">Initializing Neural Link...</span>
        </div>
      </div>
    );
  }

  return (
    <main className="relative w-full h-screen overflow-hidden bg-[#05070A] text-white select-none">
      {/* LAYER 1: WORLD LAYER (MAP OS) */}
      <WorldMap 
        threatScore={data.threat_score} 
        integrityScore={data.integrity_score}
        localization={data.localization}
        meshData={data.mesh}
      />

      {/* LAYER 5: COMMAND LAYER (OVERLAYS) */}
      <div className="absolute inset-0 pointer-events-none">
        
        {/* Institutional Header */}
        <header className="flex justify-between items-start p-8 w-full pointer-events-auto">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-white/5 border border-white/10 flex items-center justify-center rounded-sm">
                <span className="text-xs font-black text-white/80">VX</span>
              </div>
              <h1 className="text-xl font-black uppercase tracking-[0.3em] text-white/90">
                VanRakshak<span className="text-blue-400"> X</span>
              </h1>
            </div>
            <p className="text-[9px] font-bold text-white/30 uppercase tracking-[0.4em] ml-11">
              Distributed Environmental Defense Infrastructure
            </p>
          </div>

          <div className="flex gap-4">
             {!isAudioInit && (
               <button 
                onClick={handleInitAudio}
                className="bg-blue-500/10 border border-blue-500/30 text-blue-400 text-[10px] font-bold px-4 py-2 rounded-sm hover:bg-blue-500/20 transition-colors"
               >
                 ENABLE AUDIO IMMERSION
               </button>
             )}
             <div className="px-6 py-2 bg-[#0A0E12]/80 border border-white/5 backdrop-blur-md rounded-sm">
                <div className="text-[9px] text-white/30 uppercase font-black tracking-widest mb-1">Sector Connectivity</div>
                <div className="flex items-center gap-2">
                   <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                   <span className="text-xs font-mono text-white/80">PR-04_LIVE_LINK</span>
                </div>
             </div>
          </div>
        </header>

        {/* Central HUD elements */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-12 w-[800px]">
           {/* Scanline / Radar Sweep Visual could go here */}
        </div>

        {/* Left Intelligence Cluster */}
        <div className="absolute left-8 bottom-8 w-[340px] pointer-events-auto flex flex-col gap-6">
           <IntegrityScore score={data.integrity_score} state={data.state} />
           <div className="h-[240px]">
             <DigitalTwin threatScore={data.threat_score} />
           </div>
        </div>

        {/* Right Intelligence Cluster */}
        <div className="absolute right-8 bottom-8 w-[400px] h-[calc(100vh-160px)] pointer-events-auto flex flex-col gap-6">
           <div className="flex-1">
             <TelemetryFeed logs={data.telemetry} />
           </div>
           <MetricPanels metrics={data.metrics} mesh={data.mesh} />
           
           {/* BSI Visualization (Mini) */}
           <div className="h-24 bg-[#0A0E12]/80 border border-white/5 p-4 rounded-lg flex items-end gap-1 overflow-hidden">
              {[...Array(30)].map((_, i) => (
                <div 
                  key={i} 
                  className="flex-1 bg-blue-500/30 rounded-t-[1px]"
                  style={{ 
                    height: `${20 + Math.random() * (data.bsi_index * 80)}%`,
                    opacity: data.threat_score > 0.7 ? 0.3 : 1
                  }}
                />
              ))}
              <div className="absolute top-2 left-4 text-[8px] font-bold text-white/20 uppercase tracking-widest">
                Bioacoustic Entropy (BSI)
              </div>
           </div>
        </div>

      </div>

      {/* Global CSS for the institutional look */}
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&family=JetBrains+Mono:wght@400;700&display=swap');

        body {
          font-family: 'Inter', sans-serif;
        }

        .font-mono {
          font-family: 'JetBrains Mono', monospace;
        }

        @keyframes scan {
          from { top: -50%; }
          to { top: 150%; }
        }

        .animate-scan {
          animation: scan 8s linear infinite;
        }

        ::-webkit-scrollbar {
          display: none;
        }

        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </main>
  );
}
