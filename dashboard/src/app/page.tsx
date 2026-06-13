'use client';

import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Activity, 
  Shield, 
  Zap, 
  Battery as BatteryIcon, 
  Radio, 
  Mic, 
  Cpu, 
  MapPin, 
  Terminal, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  FileJson
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  Tooltip, 
  AreaChart, 
  Area 
} from 'recharts';
import WorldMap from '@/components/map/WorldMap';
import { audioEngine } from '@/lib/audio-engine';

export default function CommandCenter() {
  const [data, setData] = useState<any>(null);
  const [isAudioInit, setIsAudioInit] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const ws = useRef<WebSocket | null>(null);
  const [lastWsTime, setLastWsTime] = useState<string>('Never');
  const [lastWsMsg, setLastWsMsg] = useState<string>('None');
  const [wsConnected, setWsConnected] = useState<boolean>(false);
  const [packetAge, setPacketAge] = useState<string>('Never');
  const [isDebugExpanded, setIsDebugExpanded] = useState<boolean>(true);

  useEffect(() => {
    // Connect to Backend Intelligence Engine
    ws.current = new WebSocket('ws://localhost:8000/ws');

    ws.current.onopen = () => {
      setWsConnected(true);
      console.log('[TRACE][FRONTEND] WebSocket connection established.');
    };
    ws.current.onclose = () => {
      setWsConnected(false);
      console.log('[TRACE][FRONTEND] WebSocket connection closed.');
    };
    ws.current.onerror = (err) => {
      setWsConnected(false);
      console.log('[TRACE][FRONTEND] WebSocket error:', err);
    };

    ws.current.onmessage = (event) => {
      const message = JSON.parse(event.data);
      
      // Console trace log for every packet received
      console.log(`[TRACE][FRONTEND] Recv: time=${new Date().toLocaleTimeString()}, type=${message.type || 'unknown'}`, message);
      
      setLastWsTime(new Date().toLocaleTimeString());
      setLastWsMsg(JSON.stringify(message));

      if (message.type === 'simulation_state') {
        setData(message.data);
        
        // Update Audio Engine if enabled
        if (isAudioInit) {
          audioEngine.update(message.data.integrity_score, message.data.threat_score);
        }
      }
    };

    return () => {
      if (ws.current) ws.current.close();
    };
  }, [isAudioInit]);

  // Telemetry freshness timer (updates age every 100ms)
  useEffect(() => {
    const interval = setInterval(() => {
      if (data?.latest_telemetry?.timestamp) {
        const packetTime = new Date(data.latest_telemetry.timestamp).getTime();
        const ageSec = (Date.now() - packetTime) / 1000;
        if (ageSec < 0) {
          setPacketAge('0.0 sec ago');
        } else if (ageSec < 60) {
          setPacketAge(`${ageSec.toFixed(1)} sec ago`);
        } else {
          setPacketAge(`${Math.floor(ageSec / 60)}m ${Math.floor(ageSec % 60)}s ago`);
        }
      } else {
        setPacketAge('Never');
      }
    }, 100);

    return () => clearInterval(interval);
  }, [data?.latest_telemetry]);

  // Accumulate telemetry history on the client side for live charts
  useEffect(() => {
    if (data?.latest_telemetry) {
      setHistory(prev => {
        const newPoint = {
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          tilt: data.latest_telemetry.tilt,
          audioRms: data.latest_telemetry.audioRms,
          vibration: data.latest_telemetry.vibration,
          battery: data.latest_telemetry.battery,
          rssi: data.latest_telemetry.rssi,
          packets: data.latest_telemetry.packets
        };
        const updated = [...prev, newPoint];
        if (updated.length > 20) {
          updated.shift(); // keep last 20 seconds of telemetry
        }
        return updated;
      });
    }
  }, [data?.latest_telemetry]);

  const handleInitAudio = async () => {
    await audioEngine.init();
    setIsAudioInit(true);
  };

  if (!data) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#05070A] text-white font-mono">
        <div className="flex flex-col items-center gap-6">
          <div className="w-16 h-16 border-4 border-red-500/20 border-t-red-500 rounded-full animate-spin" />
          <span className="text-sm tracking-[0.4em] uppercase text-white/60">Establishing Hardware Neural Link...</span>
        </div>
      </div>
    );
  }

  // Get selected node metrics from node list (defaults to VR-X-001)
  const nodeInfo = data.mesh?.nodes?.[0] || {
    id: "VR-X-001",
    status: "offline",
    battery: 0,
    battery_voltage: 0.0,
    last_seen: "Never",
    mpu_status: "OFFLINE",
    mic_status: "OFFLINE",
    lora_status: "OFFLINE",
    esp_status: "OFFLINE"
  };

  const getOfflineReason = () => {
    if (!wsConnected) return "No WebSocket Updates";
    if (!data.diagnostics) return "No Diagnostics Data";
    
    const clientNow = Date.now() / 1000;
    const bridgeHeartbeatAge = clientNow - data.diagnostics.last_bridge_heartbeat;
    const serialReadAge = clientNow - data.diagnostics.last_serial_read;
    const mqttReceivedAge = clientNow - data.diagnostics.last_mqtt_received;
    const dbInsertAge = clientNow - data.diagnostics.last_db_insert;

    if (dbInsertAge > 5.0) {
      if (mqttReceivedAge <= 5.0) {
        return "No Database Updates";
      } else {
        if (bridgeHeartbeatAge > 5.0) {
          return "No MQTT Data";
        } else {
          if (serialReadAge > 5.0) {
            return "No Serial Data";
          } else {
            return "No MQTT Data";
          }
        }
      }
    }
    return "No Data Received";
  };

  const isLive = nodeInfo.status !== 'offline';
  const offlineReason = getOfflineReason();
  const statusLabel = !isLive ? `OFFLINE (${offlineReason})` : (nodeInfo.status === 'degraded' ? 'DEGRADED' : 'LIVE');
  const statusColor = !isLive ? 'text-red-500 border-red-500/40 bg-red-500/10' : (nodeInfo.status === 'degraded' ? 'text-amber-500 border-amber-500/40 bg-amber-500/10' : 'text-emerald-500 border-emerald-500/40 bg-emerald-500/10');
  const pulseColor = !isLive ? 'bg-red-500' : (nodeInfo.status === 'degraded' ? 'bg-amber-500' : 'bg-emerald-500');

  // Latest telemetry data shorthand
  const tel = data.latest_telemetry || {
    tilt: 0.0,
    accel_x: 0.0,
    accel_y: 0.0,
    accel_z: 9.81,
    vibration: 0.0,
    audioRms: 0.0,
    audioPeak: 0.0,
    battery: 0.0,
    rssi: -120,
    packets: 0,
    uptime: 0,
    who_am_i: "0x00",
    lora_ver: "0x00",
    raw_samples: [0, 0, 0, 0, 0]
  };

  return (
    <main className="relative w-full h-screen overflow-hidden bg-[#05070A] text-white select-none flex flex-col font-mono">
      {/* scanline overlay */}
      <div className="scanline" />

      {/* TOP NAVIGATION */}
      <header className="flex justify-between items-center px-8 py-5 bg-[#0A0E12] border-b border-white/10 z-40 shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-red-500/10 border-2 border-red-500/40 flex items-center justify-center rounded">
            <span className="text-sm font-black text-red-500">VX</span>
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-black uppercase tracking-[0.15em] text-white">
              VanRakshak-X <span className="text-white/30">::</span> <span className="text-red-500">Operational Command</span>
            </h1>
            <p className="text-sm font-bold text-white/40 uppercase tracking-[0.25em] mt-0.5">
              Distributed Forest Defense Infrastructure v1.0 MVP
            </p>
          </div>
        </div>

        {/* Dynamic header info */}
        <div className="flex items-center gap-4 z-50">
          {!isAudioInit && (
            <button 
              onClick={handleInitAudio}
              className="bg-blue-500/10 border-2 border-blue-500/40 text-blue-400 text-sm font-bold px-4 py-2 rounded hover:bg-blue-500/20 transition-colors pointer-events-auto"
            >
              AUDIO BEACON
            </button>
          )}

          {/* Node connectivity status */}
          <div className={`flex items-center gap-2 border-2 px-4 py-2 rounded text-sm font-bold tracking-widest uppercase ${statusColor}`}>
            <div className={`w-2 h-2 rounded-full animate-pulse ${pulseColor}`} />
            <span>Node Status: {statusLabel}</span>
          </div>

          <div className="px-5 py-2 bg-[#11161C] border border-white/10 rounded text-right min-w-[120px]">
            <div className="text-xs text-white/40 uppercase font-black tracking-widest">Active nodes</div>
            <div className="text-base font-bold text-white font-mono">{data.mesh?.active || 0} / 1</div>
          </div>

          <div className="px-5 py-2 bg-[#11161C] border border-white/10 rounded text-right min-w-[160px]">
            <div className="text-xs text-white/40 uppercase font-black tracking-widest">Last packet age</div>
            <div className="text-base font-bold text-white font-mono">
              {packetAge}
            </div>
          </div>
        </div>
      </header>

      {/* COMMAND DASHBOARD GRID */}
      <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-4 gap-6 min-h-0 bg-[#070A0F]">
        
        {/* COLUMN 1: SYSTEM OVERVIEW & HARDWARE STATUS */}
        <div className="lg:col-span-1 flex flex-col gap-6 overflow-y-auto pr-1">
          
          {/* SECTION 1: SYSTEM OVERVIEW */}
          <section className="bg-[#0A0E12] border-2 border-white/10 rounded-lg p-5 flex flex-col gap-5 shadow-2xl">
            <h2 className="text-2xl font-black uppercase tracking-widest text-cyan-400 border-b border-white/10 pb-3">
              System Overview
            </h2>
            
            <div className="flex flex-col gap-4">
              {/* Card: Active Nodes */}
              <div className="p-4 bg-[#11161C] border border-white/10 rounded flex justify-between items-center">
                <span className="text-sm uppercase tracking-wider text-white/50 font-bold">Active Nodes</span>
                <span className="text-5xl font-black text-white">{data.mesh?.active || 0}</span>
              </div>

              {/* Card: Threat Level */}
              <div className="p-4 bg-[#11161C] border border-white/10 rounded flex justify-between items-center">
                <span className="text-sm uppercase tracking-wider text-white/50 font-bold">Threat Level</span>
                <span className={`text-4xl font-black uppercase ${
                  data.state === 'CRITICAL' ? 'text-red-500' :
                  data.state === 'HIGH' ? 'text-orange-500' :
                  data.state === 'MEDIUM' ? 'text-yellow-500' : 'text-emerald-500'
                }`}>{data.state}</span>
              </div>

              {/* Card: Forest Integrity */}
              <div className="p-4 bg-[#11161C] border border-white/10 rounded flex flex-col gap-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm uppercase tracking-wider text-white/50 font-bold">Forest Integrity</span>
                  <span className="text-5xl font-black font-mono text-emerald-400">{data.integrity_score}%</span>
                </div>
                <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden mt-1">
                  <div 
                    className="h-full bg-emerald-500 transition-all duration-500" 
                    style={{ 
                      width: `${data.integrity_score}%`,
                      backgroundColor: data.integrity_score < 50 ? '#ff3d00' : (data.integrity_score < 80 ? '#ffb300' : '#00c853')
                    }} 
                  />
                </div>
              </div>

              {/* Card: Battery Voltage */}
              <div className="p-4 bg-[#11161C] border border-white/10 rounded flex flex-col gap-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm uppercase tracking-wider text-white/50 font-bold">Battery health</span>
                  <span className="text-4xl font-black font-mono text-white">
                    {nodeInfo.battery_voltage ? `${nodeInfo.battery_voltage.toFixed(2)}V` : '0.00V'}
                  </span>
                </div>
                <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden mt-1">
                  <div 
                    className="h-full bg-blue-400 transition-all duration-500" 
                    style={{ width: `${nodeInfo.battery || 0}%` }} 
                  />
                </div>
              </div>
            </div>
          </section>

          {/* SECTION 3: NODE STATUS CARD */}
          <section className="bg-[#0A0E12] border-2 border-white/10 rounded-lg p-5 flex flex-col gap-4 shadow-2xl">
            <h2 className="text-2xl font-black uppercase tracking-widest text-cyan-400 border-b border-white/10 pb-3">
              Node Status
            </h2>

            <div className="border border-white/10 rounded bg-[#11161C]/50 p-5 space-y-4">
              <div className="flex justify-between items-center border-b border-white/5 pb-3">
                <span className="text-xl font-black text-white">{nodeInfo.id}</span>
                <span className={`text-sm font-black px-2.5 py-1 rounded border-2 uppercase ${
                  !isLive ? 'border-red-500/40 text-red-500 bg-red-500/10' : 
                  (nodeInfo.status === 'degraded' ? 'border-amber-500/40 text-amber-500 bg-amber-500/10' : 'border-emerald-500/40 text-emerald-500 bg-emerald-500/10')
                }`}>
                  {isLive ? (nodeInfo.status === 'degraded' ? 'DEGRADED' : 'ONLINE') : 'OFFLINE'}
                </span>
              </div>

              <div className="space-y-3 text-base">
                <div className="flex justify-between border-b border-white/5 pb-2">
                  <span className="text-white/50">Battery:</span>
                  <span className="text-white font-bold">{nodeInfo.battery_voltage ? `${nodeInfo.battery_voltage.toFixed(2)}V` : '0.00V'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/50">Last Seen:</span>
                  <span className="text-white font-bold">{nodeInfo.last_seen}</span>
                </div>
              </div>
            </div>
          </section>

          {/* SENSOR HEALTH MATRIX (Large Pills) */}
          <section className="bg-[#0A0E12] border-2 border-white/10 rounded-lg p-5 flex flex-col gap-4 shadow-2xl">
            <h2 className="text-2xl font-black uppercase tracking-widest text-cyan-400 border-b border-white/10 pb-3">
              Sensor Status Matrix
            </h2>
            
            <div className="flex flex-col gap-3 font-mono">
              <div className="p-3 bg-[#11161C] border border-white/10 rounded flex justify-between items-center text-base">
                <span className="text-white/60 font-bold">MPU6050</span>
                <span className={`text-sm font-black px-3 py-1.5 rounded-full ${
                  nodeInfo.mpu_status === 'ONLINE' ? 'bg-emerald-500/10 border-2 border-emerald-500/40 text-emerald-400' : 'bg-red-500/10 border-2 border-red-500/40 text-red-500'
                }`}>
                  {nodeInfo.mpu_status}
                </span>
              </div>
              <div className="p-3 bg-[#11161C] border border-white/10 rounded flex justify-between items-center text-base">
                <span className="text-white/60 font-bold">INMP441</span>
                <span className={`text-sm font-black px-3 py-1.5 rounded-full ${
                  nodeInfo.mic_status === 'ONLINE' ? 'bg-emerald-500/10 border-2 border-emerald-500/40 text-emerald-400' : 'bg-red-500/10 border-2 border-red-500/40 text-red-500'
                }`}>
                  {nodeInfo.mic_status}
                </span>
              </div>
              <div className="p-3 bg-[#11161C] border border-white/10 rounded flex justify-between items-center text-base">
                <span className="text-white/60 font-bold">LoRa</span>
                <span className={`text-sm font-black px-3 py-1.5 rounded-full ${
                  nodeInfo.lora_status === 'ONLINE' ? 'bg-emerald-500/10 border-2 border-emerald-500/40 text-emerald-400' : 'bg-red-500/10 border-2 border-red-500/40 text-red-500'
                }`}>
                  {nodeInfo.lora_status}
                </span>
              </div>
              <div className="p-3 bg-[#11161C] border border-white/10 rounded flex justify-between items-center text-base">
                <span className="text-white/60 font-bold">ESP32</span>
                <span className={`text-sm font-black px-3 py-1.5 rounded-full ${
                  isLive ? 'bg-emerald-500/10 border-2 border-emerald-500/40 text-emerald-400' : 'bg-red-500/10 border-2 border-red-500/40 text-red-500'
                }`}>
                  {isLive ? 'ONLINE' : 'OFFLINE'}
                </span>
              </div>
            </div>
          </section>

          {/* SECTION: TELEMETRY DEBUG PANEL */}
          <section className="bg-[#0A0E12] border-2 border-white/10 rounded-lg p-5 flex flex-col gap-4 shadow-2xl">
            <button 
              onClick={() => setIsDebugExpanded(!isDebugExpanded)}
              className="flex justify-between items-center w-full text-2xl font-black uppercase tracking-widest text-cyan-400 border-b border-white/10 pb-3"
            >
              <span>Telemetry Debug</span>
              <span className="text-sm text-cyan-500">{isDebugExpanded ? '[-]' : '[+]'}</span>
            </button>

            {isDebugExpanded && (
              <div className="space-y-3 font-mono text-base leading-relaxed">
                <div className="flex justify-between border-b border-white/5 pb-2">
                  <span className="text-white/50">Last Packet:</span>
                  <span className="text-white font-bold">
                    {data.latest_telemetry ? new Date(data.latest_telemetry.timestamp).toLocaleTimeString() : 'Never'}
                  </span>
                </div>
                <div className="flex justify-between border-b border-white/5 pb-2">
                  <span className="text-white/50">Last WS Msg:</span>
                  <span className="text-white font-bold truncate max-w-[150px]">{lastWsTime}</span>
                </div>
                <div className="flex justify-between border-b border-white/5 pb-2">
                  <span className="text-white/50">Last MQTT Msg:</span>
                  <span className="text-white font-bold">
                    {data.diagnostics?.last_mqtt_received ? new Date(data.diagnostics.last_mqtt_received * 1000).toLocaleTimeString() : 'Never'}
                  </span>
                </div>
                <div className="flex justify-between border-b border-white/5 pb-2">
                  <span className="text-white/50">Last DB Record ID:</span>
                  <span className="text-white font-bold">
                    {data.latest_telemetry?.db_id || data.diagnostics?.last_db_record_id || '0'}
                  </span>
                </div>
                <div className="flex justify-between pb-2">
                  <span className="text-white/50">Telemetry Latency:</span>
                  <span className="text-emerald-400 font-bold">
                    {data.latest_telemetry ? `${Math.max(0, Date.now() - new Date(data.latest_telemetry.timestamp).getTime())} ms` : '0 ms'}
                  </span>
                </div>
              </div>
            )}
          </section>

        </div>

        {/* COLUMN 2 & 3: LIVE SENSOR TELEMETRY CHARTS & NODE MAP */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          
          {/* SECTION 2: LIVE SENSOR TELEMETRY CHARTS */}
          <section className="bg-[#0A0E12] border-2 border-white/10 rounded-lg p-5 flex-1 flex flex-col min-h-0 shadow-2xl">
            <h2 className="text-2xl font-black uppercase tracking-widest text-cyan-400 border-b border-white/10 pb-3 mb-5 shrink-0">
              Live Sensor Telemetry
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-1 overflow-y-auto">
              
              {/* Chart 1: Tilt Angle */}
              <div className="bg-[#11161C]/50 border border-white/10 p-4 rounded-lg flex flex-col h-[230px]">
                <div className="flex justify-between items-start mb-1">
                  <span className="text-sm font-bold uppercase tracking-wider text-white/60">Tilt Angle</span>
                  <span className="text-5xl font-black text-red-500 font-mono">{tel.tilt !== undefined ? `${tel.tilt}°` : '0°'}</span>
                </div>
                <div className="h-[150px] mt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={history} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                      <XAxis dataKey="time" hide />
                      <YAxis tick={{ fill: '#ffffff', fontSize: 12 }} domain={[-15, 15]} />
                      <Tooltip contentStyle={{ backgroundColor: '#0A0E12', border: '1px solid rgba(255,255,255,0.2)', fontSize: 11 }} />
                      <Line type="monotone" dataKey="tilt" stroke="#ff3d00" strokeWidth={2.5} dot={false} isAnimationActive={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Chart 2: Sound Level */}
              <div className="bg-[#11161C]/50 border border-white/10 p-4 rounded-lg flex flex-col h-[230px]">
                <div className="flex justify-between items-start mb-1">
                  <span className="text-sm font-bold uppercase tracking-wider text-white/60">Sound Level</span>
                  <span className="text-5xl font-black text-cyan-400 font-mono">{tel.audioRms !== undefined ? tel.audioRms : '0'}</span>
                </div>
                <div className="h-[150px] mt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={history} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                      <XAxis dataKey="time" hide />
                      <YAxis tick={{ fill: '#ffffff', fontSize: 12 }} domain={[0, 1000]} />
                      <Tooltip contentStyle={{ backgroundColor: '#0A0E12', border: '1px solid rgba(255,255,255,0.2)', fontSize: 11 }} />
                      <defs>
                        <linearGradient id="audioGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#4fc3f7" stopOpacity={0.35}/>
                          <stop offset="95%" stopColor="#4fc3f7" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <Area type="monotone" dataKey="audioRms" stroke="#4fc3f7" strokeWidth={2.5} fillOpacity={1} fill="url(#audioGrad)" dot={false} isAnimationActive={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Chart 3: Signal Strength */}
              <div className="bg-[#11161C]/50 border border-white/10 p-4 rounded-lg flex flex-col h-[230px]">
                <div className="flex justify-between items-start mb-1">
                  <span className="text-sm font-bold uppercase tracking-wider text-white/60">Signal Strength</span>
                  <span className="text-5xl font-black text-emerald-400 font-mono">{tel.rssi !== undefined ? `${tel.rssi} dBm` : '-120 dBm'}</span>
                </div>
                <div className="h-[150px] mt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={history} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                      <XAxis dataKey="time" hide />
                      <YAxis tick={{ fill: '#ffffff', fontSize: 12 }} domain={[-140, -40]} />
                      <Tooltip contentStyle={{ backgroundColor: '#0A0E12', border: '1px solid rgba(255,255,255,0.2)', fontSize: 11 }} />
                      <Line type="monotone" dataKey="rssi" stroke="#00c853" strokeWidth={2.5} dot={false} isAnimationActive={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Chart 4: Battery Voltage */}
              <div className="bg-[#11161C]/50 border border-white/10 p-4 rounded-lg flex flex-col h-[230px]">
                <div className="flex justify-between items-start mb-1">
                  <span className="text-sm font-bold uppercase tracking-wider text-white/60">Battery</span>
                  <span className="text-5xl font-black text-yellow-400 font-mono">{tel.battery !== undefined ? `${tel.battery.toFixed(2)}V` : '0.00V'}</span>
                </div>
                <div className="h-[150px] mt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={history} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                      <XAxis dataKey="time" hide />
                      <YAxis tick={{ fill: '#ffffff', fontSize: 12 }} domain={[3.0, 4.5]} />
                      <Tooltip contentStyle={{ backgroundColor: '#0A0E12', border: '1px solid rgba(255,255,255,0.2)', fontSize: 11 }} />
                      <Line type="monotone" dataKey="battery" stroke="#ffb300" strokeWidth={2.5} dot={false} isAnimationActive={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

            </div>
          </section>

          {/* NODE LOCATION PANEL (Small Map) */}
          <section className="bg-[#0A0E12] border-2 border-white/10 rounded-lg p-5 h-[320px] flex flex-col shadow-2xl">
            <div className="flex justify-between items-center border-b border-white/10 pb-3 mb-4 shrink-0">
              <span className="text-2xl font-black uppercase tracking-widest text-cyan-400">Node Location Panel</span>
              <span className="text-base font-mono text-emerald-400 bg-emerald-950/20 border border-emerald-500/20 px-2 py-0.5 rounded">
                Lat: 24.123456 | Lng: 78.234567
              </span>
            </div>
            <div className="flex-1 relative rounded overflow-hidden min-h-0">
              <WorldMap 
                threatScore={data.threat_score} 
                integrityScore={data.integrity_score}
                localization={null}
                meshData={data.mesh}
              />
            </div>
          </section>

        </div>

        {/* COLUMN 4: ALERTS, SENSOR DIAGNOSTICS & TELEMETRY STREAM */}
        <div className="lg:col-span-1 flex flex-col gap-6 overflow-y-auto pl-1">
          
          {/* SECTION 4: THREAT DETECTION PANEL */}
          <section className="bg-[#0A0E12] border-2 border-white/10 rounded-lg p-5 flex flex-col h-[300px] shadow-2xl">
            <div className="flex justify-between items-center border-b border-white/10 pb-3 mb-4 shrink-0">
              <span className="text-2xl font-black uppercase tracking-widest text-cyan-400">Event Timeline</span>
              <span className="text-sm text-red-400 font-bold bg-red-950/20 border border-red-500/20 px-2 py-0.5 rounded animate-pulse">LIVE FEED</span>
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 font-mono text-base scrollbar-hide select-text">
              {data.telemetry?.map((log: string, i: number) => {
                const isAlert = log.includes('ALERT:');
                const isResolved = log.includes('RESOLVED:');
                let textColor = 'text-white/60';
                let borderStyles = 'border-white/5';
                
                if (isAlert) {
                  textColor = 'text-red-400 font-bold';
                  borderStyles = 'border-red-500/20 bg-red-500/5 px-2 py-1 rounded';
                } else if (isResolved) {
                  textColor = 'text-emerald-400';
                  borderStyles = 'border-emerald-500/20 bg-emerald-500/5 px-2 py-1 rounded';
                }

                return (
                  <div key={i} className={`pb-2 border-b last:border-0 ${borderStyles} ${textColor} leading-relaxed`}>
                    {log}
                  </div>
                );
              })}
              {(!data.telemetry || data.telemetry.length === 0) && (
                <div className="text-white/20 text-center py-12">No events logged</div>
              )}
            </div>
          </section>

          {/* SECTION 5: SENSOR DIAGNOSTICS */}
          <section className="bg-[#0A0E12] border-2 border-white/10 rounded-lg p-5 flex flex-col gap-5 overflow-y-auto shadow-2xl">
            <h2 className="text-2xl font-black uppercase tracking-widest text-cyan-400 border-b border-white/10 pb-3">
              Sensor Diagnostics
            </h2>

            <div className="space-y-4 font-mono text-base">
              {/* MPU6050 */}
              <div className="border border-white/10 rounded bg-[#11161C] p-4">
                <div className="text-sm text-red-400 font-black uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Cpu size={14} /> MPU6050 Motion Sensor
                </div>
                <div className="grid grid-cols-2 gap-y-2.5 gap-x-4 text-base">
                  <span className="text-white/40">Sensor ID</span>
                  <span className="text-white font-bold">{tel.who_am_i || '0x00'}</span>
                  <span className="text-white/40">Tilt</span>
                  <span className="text-white font-bold">{tel.tilt !== undefined ? `${tel.tilt}°` : '0°'}</span>
                  <span className="text-white/40">Motion X</span>
                  <span className="text-white font-bold">{tel.accel_x !== undefined ? `${tel.accel_x} m/s²` : '0.0'}</span>
                  <span className="text-white/40">Motion Y</span>
                  <span className="text-white font-bold">{tel.accel_y !== undefined ? `${tel.accel_y} m/s²` : '0.0'}</span>
                  <span className="text-white/40">Motion Z</span>
                  <span className="text-white font-bold">{tel.accel_z !== undefined ? `${tel.accel_z} m/s²` : '0.0'}</span>
                </div>
              </div>

              {/* INMP441 */}
              <div className="border border-white/10 rounded bg-[#11161C] p-4">
                <div className="text-sm text-cyan-400 font-black uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Mic size={14} /> INMP441 Sound Level
                </div>
                <div className="grid grid-cols-2 gap-y-2.5 gap-x-4 text-base">
                  <span className="text-white/40">Sound Level</span>
                  <span className="text-white font-bold">{tel.audioRms !== undefined ? tel.audioRms : '0.0'}</span>
                  <span className="text-white/40">Peak Amp</span>
                  <span className="text-white font-bold">{tel.audioPeak !== undefined ? tel.audioPeak : '0'}</span>
                  <span className="text-white/40 col-span-2">First 5 Samples:</span>
                  <span className="text-white/50 col-span-2 text-sm truncate bg-[#05070A] p-2 rounded block border border-white/5 mt-1">
                    {tel.raw_samples ? JSON.stringify(tel.raw_samples) : '[0,0,0,0,0]'}
                  </span>
                </div>
              </div>

              {/* LoRa */}
              <div className="border border-white/10 rounded bg-[#11161C] p-4">
                <div className="text-sm text-emerald-400 font-black uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Radio size={14} /> SX1278 SPI Transceiver
                </div>
                <div className="grid grid-cols-2 gap-y-2.5 gap-x-4 text-base">
                  <span className="text-white/40">Signal Strength</span>
                  <span className="text-white font-bold">{tel.rssi !== undefined ? `${tel.rssi} dBm` : '-120'}</span>
                  <span className="text-white/40">Packets</span>
                  <span className="text-white font-bold">{tel.packets || '0'}</span>
                  <span className="text-white/40">SPI Version</span>
                  <span className="text-white font-bold">{tel.lora_ver || '0x00'}</span>
                </div>
              </div>
            </div>
          </section>

          {/* SECTION 6: TELEMETRY STREAM */}
          <section className="bg-[#0A0E12] border-2 border-white/10 rounded-lg p-5 flex flex-col h-[280px] min-h-0 overflow-hidden shadow-2xl">
            <div className="text-2xl font-black uppercase tracking-widest text-cyan-400 border-b border-white/10 pb-3 mb-3 shrink-0 flex items-center gap-2">
              <FileJson size={14} /> Live Sensor Data
            </div>
            
            <div className="flex-1 bg-[#05070A] border border-white/10 p-4 rounded font-mono text-sm leading-relaxed text-emerald-400 overflow-auto select-text scrollbar-hide">
              <pre className="whitespace-pre-wrap break-all">
                {data.latest_telemetry ? JSON.stringify(data.latest_telemetry, null, 2) : '// Waiting for live sensor packet...'}
              </pre>
            </div>
          </section>

        </div>

      </div>
    </main>
  );
}
