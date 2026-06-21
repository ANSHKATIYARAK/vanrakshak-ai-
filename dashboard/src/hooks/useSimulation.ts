import { useEffect, useState, useRef } from 'react';

export interface SimulationData {
  timestamp: number;
  state: 'NORMAL' | 'WATCH' | 'SUSPICIOUS' | 'CRITICAL';
  threat_score: number;
  forest_integrity: number;
  metrics: {
    biodiversity: number;
    node_vitality: number;
    eco_stability: number;
    security_state: number;
  };
  telemetry_feed: string[];
  mesh: {
    active_nodes: number;
    avg_latency_ms: number;
    packet_loss_pct: number;
  };
  bsi_wave: number;
  threat_location: {
    lat: number;
    lng: number;
    radius: number;
  } | null;
}

export function useSimulation() {
  const [data, setData] = useState<SimulationData | null>(null);
  const [status, setStatus] = useState<'connecting' | 'online' | 'offline'>('connecting');
  const ws = useRef<WebSocket | null>(null);

  useEffect(() => {
    const connect = () => {
      const hostname = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
      ws.current = new WebSocket(`ws://${hostname}:8000/ws`);

      ws.current.onopen = () => setStatus('online');
      ws.current.onclose = () => {
        setStatus('offline');
        setTimeout(connect, 3000); // Reconnect logic
      };

      ws.current.onmessage = (event) => {
        const message = JSON.parse(event.data);
        if (message.type === 'simulation_state') {
          setData(message.data);
        }
      };
    };

    connect();
    return () => ws.current?.close();
  }, []);

  return { data, status };
}
