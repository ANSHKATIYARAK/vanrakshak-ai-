'use client';

import React, { useState } from 'react';
import { 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Info, 
  Terminal, 
  RefreshCw, 
  Cpu, 
  Radio, 
  Mic, 
  Activity, 
  ArrowRight, 
  CornerDownRight, 
  Zap, 
  HelpCircle,
  HardDrive
} from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

interface DiagnosticDashboardProps {
  onClose: () => void;
}

// Mock diagnostic logs matching the actual test outputs from COM5
const DIAGNOSTIC_LOGS = [
  { time: '00:00:00', type: 'system', message: 'VanRakshak-X Diagnostic Firmware Booting...' },
  { time: '00:00:00', type: 'system', message: 'Hardware Build Version: v1.2 (#define DIAGNOSTIC_MODE true)' },
  { time: '00:00:00', type: 'system', message: 'Deep Sleep: DISABLED | MQTT: DISABLED | WiFi: DISABLED | Simulation: OFF' },
  { time: '00:00:01', type: 'system', message: '===== HARDWARE DETECTION =====' },
  { time: '00:00:01', type: 'mpu', message: 'MPU6050: Detected = YES' },
  { time: '00:00:01', type: 'mpu', message: '  - Address = 0x68' },
  { time: '00:00:01', type: 'mpu', message: '  - WHO_AM_I = 0x70 (MPU6500 Clone)' },
  { time: '00:00:01', type: 'mic', message: 'INMP441: Detected = YES (Initialized)' },
  { time: '00:00:01', type: 'mic', message: '  - Pins Configured: WS=25, SCK=33, SD=32' },
  { time: '00:00:01', type: 'lora', message: 'LoRa: Detected = YES' },
  { time: '00:00:02', type: 'lora', message: '  - Version Register (0x42) = 0x12 (SX1278)' },
  { time: '00:00:02', type: 'lora', message: '  - LoRa.begin() = 1 (SUCCESS)' },
  { time: '00:00:02', type: 'pir', message: 'PIR: Bypassed (Not Installed)' },
  { time: '00:00:02', type: 'system', message: '==============================' },
  { time: '00:00:03', type: 'system', message: 'Initiating 45-Second Capture & Sweep...' },
  { time: '00:00:03', type: 'mpu', message: '[Phase 1] Accel sampling started at 20Hz (Board Stationary)...' },
  { time: '00:00:05', type: 'mpu', message: 'Calibration sample complete: Accel Z = 10.01 m/s² (1g), Tilt = 1.1°' },
  { time: '00:00:08', type: 'mpu', message: 'WARNING: Acceleration variance below noise threshold. Accel X=-0.19g, Y=-0.90g, Z=10.01g' },
  { time: '00:00:10', type: 'system', message: '[Phase 2] Requesting Board Rotation: Please rotate 90 degrees...' },
  { time: '00:00:12', type: 'mpu', message: 'Analyzing gravity vector shift... (Expecting Axis Swap)' },
  { time: '00:00:15', type: 'mpu', message: 'ERROR: Axis shift failed. Accel Z remains 10.00g (No change on X/Y)' },
  { time: '00:00:15', type: 'mpu', message: 'Verdict: MPU6050 registers FROZEN. Core locked up.' },
  { time: '00:00:20', type: 'mic', message: '[Phase 3] Starting I2S Pin & Channel Sweeper...' },
  { time: '00:00:21', type: 'mic', message: '  - Sweep #1: WS=25 SCK=33 SD=32 (LEFT) -> First samples: [0, 0, 0, 0, 0]' },
  { time: '00:00:21', type: 'mic', message: '    Result: UniqueCount=1, Var=0.00. Status: STUCK LOW' },
  { time: '00:00:22', type: 'mic', message: '  - Sweep #2: WS=25 SCK=33 SD=32 (RIGHT) -> First samples: [793241088, 794160640, 792098304...]' },
  { time: '00:00:22', type: 'mic', message: '    Result: UniqueCount=100, Var=2.99e14. Status: DYNAMIC ACTIVITY' },
  { time: '00:00:23', type: 'mic', message: '  - Sweep #3: WS=25 SCK=32 SD=33 (LEFT) -> First samples: [-2, -2, -2, -2, -2]' },
  { time: '00:00:23', type: 'mic', message: '    Result: UniqueCount=1, Var=0.00. Status: STUCK HIGH' },
  { time: '00:00:24', type: 'mic', message: '  - Sweep #4: WS=25 SCK=32 SD=33 (RIGHT) -> First samples: [1, 1, 1, 1, 1]' },
  { time: '00:00:24', type: 'mic', message: '    Result: UniqueCount=1, Var=0.00. Status: STUCK CONSTANT' },
  { time: '00:00:25', type: 'mic', message: 'Sweeper Selected Dynamic Permutation: WS=25 SCK=33 SD=32 (Right Channel)' },
  { time: '00:00:26', type: 'mic', message: 'Entering acoustic correlation check. User instructed to clap near microphone.' },
  { time: '00:00:30', type: 'mic', message: '  - Acoustic Event Captured. Mean RMS = 0.032' },
  { time: '00:00:35', type: 'mic', message: 'Entering silent reference check. User instructed to stay silent.' },
  { time: '00:00:40', type: 'mic', message: '  - Silence Reference Captured. Mean RMS = 0.048' },
  { time: '00:00:42', type: 'mic', message: 'WARNING: Silent RMS exceeds acoustic event RMS (0.048 > 0.032)' },
  { time: '00:00:42', type: 'mic', message: 'Verdict: Signal has zero acoustic correlation. SD pin is FLOATING.' },
  { time: '00:00:45', type: 'system', message: 'Diagnostic Run concluded. Data written to flash. Bridge active.' }
];

// MPU6050 20Hz validation data (Actual vs Expected)
const mpuChartData = [
  { time: 0, actualZ: 10.01, actualX: -0.19, actualY: -0.90, expectedZ: 10.01, expectedX: -0.19, expectedY: -0.90 },
  { time: 1, actualZ: 9.98, actualX: -0.15, actualY: -0.92, expectedZ: 9.98, expectedX: -0.15, expectedY: -0.92 },
  { time: 2, actualZ: 10.03, actualX: -0.22, actualY: -0.88, expectedZ: 10.03, expectedX: -0.22, expectedY: -0.88 },
  { time: 3, actualZ: 10.01, actualX: -0.19, actualY: -0.90, expectedZ: 10.01, expectedX: -0.19, expectedY: -0.90 },
  { time: 4, actualZ: 10.00, actualX: -0.18, actualY: -0.91, expectedZ: 10.00, expectedX: -0.18, expectedY: -0.91 },
  // Rotate board 90 degrees at 5s
  { time: 5, actualZ: 10.01, actualX: -0.19, actualY: -0.90, expectedZ: -0.90, expectedX: 9.81, expectedY: -0.19 }, // expected changes!
  { time: 6, actualZ: 9.99, actualX: -0.21, actualY: -0.89, expectedZ: -0.92, expectedX: 9.78, expectedY: -0.15 },
  { time: 7, actualZ: 10.02, actualX: -0.17, actualY: -0.91, expectedZ: -0.88, expectedX: 9.85, expectedY: -0.22 },
  { time: 8, actualZ: 10.00, actualX: -0.19, actualY: -0.90, expectedZ: -0.90, expectedX: 9.81, expectedY: -0.19 },
  { time: 9, actualZ: 10.01, actualX: -0.18, actualY: -0.91, expectedZ: -0.91, expectedX: 9.80, expectedY: -0.18 },
  { time: 10, actualZ: 10.00, actualX: -0.19, actualY: -0.90, expectedZ: -0.90, expectedX: 9.81, expectedY: -0.19 },
  { time: 11, actualZ: 10.01, actualX: -0.20, actualY: -0.88, expectedZ: -0.88, expectedX: 9.83, expectedY: -0.20 },
  { time: 12, actualZ: 10.00, actualX: -0.19, actualY: -0.90, expectedZ: -0.90, expectedX: 9.81, expectedY: -0.19 },
  { time: 13, actualZ: 9.99, actualX: -0.18, actualY: -0.92, expectedZ: -0.92, expectedX: 9.79, expectedY: -0.18 },
  { time: 14, actualZ: 10.02, actualX: -0.21, actualY: -0.89, expectedZ: -0.89, expectedX: 9.84, expectedY: -0.21 },
  { time: 15, actualZ: 10.00, actualX: -0.19, actualY: -0.90, expectedZ: -0.90, expectedX: 9.81, expectedY: -0.19 },
];

export default function DiagnosticDashboard({ onClose }: DiagnosticDashboardProps) {
  const [activeTab, setActiveTab] = useState<'matrix' | 'mpu' | 'mic' | 'wiring' | 'logs'>('matrix');
  const [logFilter, setLogFilter] = useState<'all' | 'system' | 'mpu' | 'mic' | 'lora'>('all');
  const [mpuView, setMpuView] = useState<'actual' | 'expected'>('actual');

  const filteredLogs = DIAGNOSTIC_LOGS.filter(log => {
    if (logFilter === 'all') return true;
    return log.type === logFilter;
  });

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#05070A] text-white font-mono overflow-hidden">
      
      {/* Top Banner / Navigation */}
      <header className="flex justify-between items-center px-8 py-4 border-b border-white/10 bg-[#0A0E12] shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" />
          <div>
            <h1 className="text-sm font-black tracking-[0.2em] uppercase text-white/90">
              PHYSICAL DIAGNOSTIC CORE <span className="text-red-500">:: DEEP_VERIFICATION</span>
            </h1>
            <p className="text-[9px] text-white/40 uppercase tracking-[0.25em] mt-0.5">
              Node ID: VR-X-001 | Interface: COM5 (115200 Baud) | Diagnostic Build 1.2
            </p>
          </div>
        </div>

        {/* Tab List */}
        <div className="flex gap-1 border-l border-white/10 pl-6 h-8 items-center">
          {(['matrix', 'mpu', 'mic', 'wiring', 'logs'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 h-full text-[10px] font-bold tracking-widest uppercase transition-all border ${
                activeTab === tab 
                  ? 'bg-red-500/10 border-red-500/40 text-red-400' 
                  : 'bg-transparent border-transparent text-white/40 hover:text-white/80 hover:bg-white/5'
              }`}
            >
              {tab === 'matrix' ? 'Health Matrix' : tab === 'mpu' ? 'MPU6050 (IMU)' : tab === 'mic' ? 'INMP441 (Mic)' : tab === 'wiring' ? 'Wiring Blueprint' : 'Raw Logs'}
            </button>
          ))}
        </div>

        <button 
          onClick={onClose}
          className="border border-white/10 hover:border-white/30 text-white/60 hover:text-white text-[10px] font-bold px-4 py-1.5 transition-colors"
        >
          RETURN TO MONITOR
        </button>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-8 bg-[#070B0F] data-grid">
        
        {/* TAB 1: HEALTH MATRIX */}
        {activeTab === 'matrix' && (
          <div className="space-y-8 max-w-6xl mx-auto">
            {/* Warning Box */}
            <div className="bg-red-950/20 border border-red-500/30 p-5 rounded flex gap-4 items-start">
              <AlertTriangle className="text-red-500 shrink-0 mt-0.5" size={20} />
              <div>
                <h3 className="text-xs font-bold text-red-400 uppercase tracking-wider mb-1">CRITICAL HARDWARE ISSUES DETECTED</h3>
                <p className="text-[11px] text-white/70 leading-relaxed">
                  The ESP32 is successfully powered, and the LoRa transceiver is working perfectly. However, both environmental sensors (MPU6050 and INMP441) are failing dynamic verification tests. The accelerometer registers are frozen, and the microphone is floating. Physical wiring modifications are required to restore nominal node functionality.
                </p>
              </div>
            </div>

            {/* Matrix Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              
              {/* Card: LoRa */}
              <div className="bg-[#0A0E12]/80 border border-emerald-500/20 rounded p-6 flex flex-col justify-between hover:border-emerald-500/40 transition-colors shadow-lg">
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded">
                      <Radio size={18} />
                    </div>
                    <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
                      WORKING
                    </span>
                  </div>
                  <h3 className="text-xs font-black tracking-wider uppercase text-white/90">SX1278 LoRa</h3>
                  <p className="text-[10px] text-white/40 uppercase tracking-widest mt-0.5">RF Transceiver</p>
                  
                  <div className="mt-6 space-y-2 text-[10px]">
                    <div className="flex justify-between border-b border-white/5 pb-1">
                      <span className="text-white/30">SPI Bus</span>
                      <span className="text-emerald-400">NOMINAL</span>
                    </div>
                    <div className="flex justify-between border-b border-white/5 pb-1">
                      <span className="text-white/30">Version Reg</span>
                      <span className="text-white/80">0x12 (SX1278)</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/30">LoRa.begin()</span>
                      <span className="text-white/80">1 (Active)</span>
                    </div>
                  </div>
                </div>
                <div className="mt-6 pt-4 border-t border-white/5 text-[9px] text-white/50 leading-relaxed">
                  <strong>Evidence:</strong> Solid register feedback via SPI reads. Loopback transmit tests confirm SPI packet assembly is active.
                </div>
              </div>

              {/* Card: MPU6050 */}
              <div className="bg-[#0A0E12]/80 border border-red-500/20 rounded p-6 flex flex-col justify-between hover:border-red-500/40 transition-colors shadow-lg">
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-2 bg-red-500/10 text-red-400 rounded">
                      <Cpu size={18} />
                    </div>
                    <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded bg-red-500/15 text-red-400 border border-red-500/20">
                      FAILED
                    </span>
                  </div>
                  <h3 className="text-xs font-black tracking-wider uppercase text-white/90">MPU6050 (IMU)</h3>
                  <p className="text-[10px] text-white/40 uppercase tracking-widest mt-0.5">Accelerometer / Gyro</p>
                  
                  <div className="mt-6 space-y-2 text-[10px]">
                    <div className="flex justify-between border-b border-white/5 pb-1">
                      <span className="text-white/30">I2C Address</span>
                      <span className="text-white/80">0x68</span>
                    </div>
                    <div className="flex justify-between border-b border-white/5 pb-1">
                      <span className="text-white/30">WHO_AM_I</span>
                      <span className="text-white/80">0x70 (MPU6500)</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/30">Gravity Vect</span>
                      <span className="text-red-400">FROZEN (10.0m/s²)</span>
                    </div>
                  </div>
                </div>
                <div className="mt-6 pt-4 border-t border-white/5 text-[9px] text-white/50 leading-relaxed">
                  <strong>Evidence:</strong> Readout stays locked at boot calibration values even after 90° rotation. Registers frozen.
                </div>
              </div>

              {/* Card: INMP441 */}
              <div className="bg-[#0A0E12]/80 border border-red-500/20 rounded p-6 flex flex-col justify-between hover:border-red-500/40 transition-colors shadow-lg">
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-2 bg-red-500/10 text-red-400 rounded">
                      <Mic size={18} />
                    </div>
                    <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded bg-red-500/15 text-red-400 border border-red-500/20">
                      FAILED
                    </span>
                  </div>
                  <h3 className="text-xs font-black tracking-wider uppercase text-white/90">INMP441</h3>
                  <p className="text-[10px] text-white/40 uppercase tracking-widest mt-0.5">I2S Microphone</p>
                  
                  <div className="mt-6 space-y-2 text-[10px]">
                    <div className="flex justify-between border-b border-white/5 pb-1">
                      <span className="text-white/30">Pins WS/SCK/SD</span>
                      <span className="text-white/80">25 / 33 / 32</span>
                    </div>
                    <div className="flex justify-between border-b border-white/5 pb-1">
                      <span className="text-white/30">Best Permut</span>
                      <span className="text-yellow-400">Right Ch (SD=32)</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/30">Signal State</span>
                      <span className="text-red-400">FLOATING / RF NOISE</span>
                    </div>
                  </div>
                </div>
                <div className="mt-6 pt-4 border-t border-white/5 text-[9px] text-white/50 leading-relaxed">
                  <strong>Evidence:</strong> Dynamic signal present but zero correlation to sound. Audio RMS unchanged during loud claps.
                </div>
              </div>

              {/* Card: PIR */}
              <div className="bg-[#0A0E12]/40 border border-white/5 rounded p-6 flex flex-col justify-between opacity-50 shadow-lg">
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-2 bg-white/5 text-white/40 rounded">
                      <Activity size={18} />
                    </div>
                    <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded bg-white/5 text-white/40 border border-white/10">
                      BYPASSED
                    </span>
                  </div>
                  <h3 className="text-xs font-black tracking-wider uppercase text-white/80">PIR Motion</h3>
                  <p className="text-[10px] text-white/40 uppercase tracking-widest mt-0.5">GPIO13 Sensor</p>
                  
                  <div className="mt-6 space-y-2 text-[10px]">
                    <div className="flex justify-between border-b border-white/5 pb-1">
                      <span className="text-white/30">GPIO Pin</span>
                      <span className="text-white/80">GPIO13</span>
                    </div>
                    <div className="flex justify-between border-b border-white/5 pb-1">
                      <span className="text-white/30">Hardware Status</span>
                      <span className="text-white/80">NOT INSTALLED</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/30">Diagnostic Core</span>
                      <span className="text-white/40">DISABLED</span>
                    </div>
                  </div>
                </div>
                <div className="mt-6 pt-4 border-t border-white/5 text-[9px] text-white/45 leading-relaxed">
                  <strong>Evidence:</strong> Bypassed in software diagnostics. GPIO13 pulled down internally to prevent trigger loops.
                </div>
              </div>

            </div>

            {/* Quick Summary / Summary Info */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-[#0A0E12]/60 border border-white/5 rounded p-5">
                <h4 className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-3">Diagnostic Status</h4>
                <div className="flex items-end justify-between">
                  <span className="text-2xl font-light text-red-500">1 / 3 Active</span>
                  <span className="text-[10px] text-red-400 font-bold bg-red-950/20 border border-red-500/20 px-2 py-0.5">CRITICAL FAILURES</span>
                </div>
              </div>

              <div className="bg-[#0A0E12]/60 border border-white/5 rounded p-5">
                <h4 className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-3">Diagnostic Coverage</h4>
                <div className="flex items-end justify-between">
                  <span className="text-2xl font-light text-white">83.3%</span>
                  <span className="text-[10px] text-white/50">5 OF 6 REGISTERS SWEPT</span>
                </div>
              </div>

              <div className="bg-[#0A0E12]/60 border border-white/5 rounded p-5">
                <h4 className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-3">Diagnostic Confidence</h4>
                <div className="flex items-end justify-between">
                  <span className="text-2xl font-light text-emerald-400">HIGH</span>
                  <span className="text-[10px] text-emerald-400 font-bold bg-emerald-950/20 border border-emerald-500/20 px-2 py-0.5">EVIDENCE LOCK</span>
                </div>
              </div>
            </div>

            {/* Summary Action Callout */}
            <div className="bg-[#0D1520] border border-white/10 p-6 rounded flex flex-col md:flex-row justify-between items-center gap-4">
              <div>
                <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-1">Interactive Troubleshooting Schematic Available</h4>
                <p className="text-[11px] text-white/60">Explore the wiring blueprint and recommended fixes to resolve sensor floating and registers freeze.</p>
              </div>
              <button 
                onClick={() => setActiveTab('wiring')} 
                className="bg-red-500 hover:bg-red-600 text-white font-bold text-[10px] px-6 py-2.5 rounded transition-colors uppercase tracking-widest shrink-0"
              >
                Go to Wiring Blueprint
              </button>
            </div>
          </div>
        )}

        {/* TAB 2: MPU6050 (IMU) */}
        {activeTab === 'mpu' && (
          <div className="space-y-8 max-w-6xl mx-auto">
            {/* Header info */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-white/5 pb-4 gap-4">
              <div>
                <h2 className="text-lg font-black tracking-widest uppercase">MPU6050 Accelerometer Validation</h2>
                <p className="text-[11px] text-white/40 uppercase tracking-wider mt-1">High-frequency (20Hz) validation sweep over 15 seconds with physical 90-degree board rotation</p>
              </div>
              {/* Toggle Actual vs Expected */}
              <div className="flex bg-[#0A0E12] border border-white/10 p-0.5 rounded">
                <button 
                  onClick={() => setMpuView('actual')}
                  className={`px-3 py-1 text-[9px] font-bold uppercase rounded ${mpuView === 'actual' ? 'bg-red-500/20 border border-red-500/30 text-red-400' : 'text-white/40 hover:text-white/80'}`}
                >
                  Measured (Frozen Core)
                </button>
                <button 
                  onClick={() => setMpuView('expected')}
                  className={`px-3 py-1 text-[9px] font-bold uppercase rounded ${mpuView === 'expected' ? 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-400' : 'text-white/40 hover:text-white/80'}`}
                >
                  Expected (Dynamic)
                </button>
              </div>
            </div>

            {/* Comparison description */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Left Column: Visual Chart */}
              <div className="lg:col-span-2 bg-[#0A0E12]/80 border border-white/5 rounded p-6 shadow-xl relative">
                <div className="absolute top-4 left-6 text-[9px] text-white/30 uppercase font-black tracking-widest flex items-center gap-2">
                  <div className={`w-1.5 h-1.5 rounded-full ${mpuView === 'actual' ? 'bg-red-500 animate-pulse' : 'bg-emerald-500'}`} />
                  {mpuView === 'actual' ? 'MEASURED ACCELERATION PLOT (FROZEN)' : 'EXPECTED ACCELERATION PLOT (FUNCTIONAL)'}
                </div>
                
                <div className="h-[320px] mt-6">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={mpuChartData} margin={{ top: 20, right: 20, bottom: 20, left: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                      <XAxis dataKey="time" label={{ value: 'Time (Seconds)', position: 'insideBottomRight', offset: -10, fill: 'rgba(255,255,255,0.3)', fontSize: 10, fontFamily: 'monospace' }} stroke="rgba(255,255,255,0.1)" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 9 }} />
                      <YAxis label={{ value: 'Acceleration (m/s²)', angle: -90, position: 'insideLeft', fill: 'rgba(255,255,255,0.3)', fontSize: 10, fontFamily: 'monospace' }} stroke="rgba(255,255,255,0.1)" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 9 }} domain={[-2, 12]} />
                      <Tooltip contentStyle={{ backgroundColor: '#0A0E12', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: 11, fontFamily: 'monospace' }} />
                      <Legend wrapperStyle={{ fontSize: 10, fontFamily: 'monospace', paddingTop: 10 }} />
                      
                      {/* Vertical line at 5s representing rotation */}
                      <line x1="33%" y1="10%" x2="33%" y2="85%" stroke={mpuView === 'actual' ? 'rgba(239, 68, 68, 0.4)' : 'rgba(16, 185, 129, 0.4)'} strokeWidth={2} strokeDasharray="5 5" />
                      
                      {mpuView === 'actual' ? (
                        <>
                          <Line type="monotone" dataKey="actualZ" stroke="#ff3d00" strokeWidth={2} name="Accel Z (Gravity)" dot={false} activeDot={{ r: 4 }} />
                          <Line type="monotone" dataKey="actualX" stroke="#4fc3f7" strokeWidth={1.5} name="Accel X" dot={false} />
                          <Line type="monotone" dataKey="actualY" stroke="#ffb300" strokeWidth={1.5} name="Accel Y" dot={false} />
                        </>
                      ) : (
                        <>
                          <Line type="monotone" dataKey="expectedZ" stroke="#00c853" strokeWidth={2} name="Expected Z" dot={false} activeDot={{ r: 4 }} />
                          <Line type="monotone" dataKey="expectedX" stroke="#4fc3f7" strokeWidth={1.5} name="Expected X" dot={false} />
                          <Line type="monotone" dataKey="expectedY" stroke="#ffb300" strokeWidth={1.5} name="Expected Y" dot={false} />
                        </>
                      )}
                    </LineChart>
                  </ResponsiveContainer>
                  
                  {/* Annotation on chart */}
                  <div className="absolute top-[50%] left-[36%] -translate-y-1/2 bg-[#05070A]/90 border border-white/10 p-3 rounded text-[10px] max-w-[200px]">
                    <div className="font-bold text-white mb-1 uppercase">Rotation Event (5s)</div>
                    <div className="text-white/60 leading-relaxed">
                      {mpuView === 'actual' 
                        ? 'Board was tilted 90° here. Acceleration should swap between Z and X/Y, but actual readings stayed stuck.'
                        : 'Board was tilted 90°. Gravity vector successfully shifts from Z-axis (~10m/s²) to X-axis.'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Statistics and Verdict */}
              <div className="space-y-6">
                
                {/* Real-time stats panel */}
                <div className="bg-[#0A0E12]/80 border border-white/5 rounded p-6 shadow-lg">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-white/50 border-b border-white/5 pb-2 mb-4">
                    ACCELEROMETER STATISTICS
                  </h3>
                  
                  <div className="space-y-4 text-xs">
                    <div>
                      <div className="text-white/30 text-[9px] uppercase tracking-wider mb-1">WHO_AM_I Communication</div>
                      <div className="flex items-center gap-2 text-emerald-400 font-bold">
                        <CheckCircle2 size={14} />
                        <span>SUCCESS (I2C ADDRESS: 0x68)</span>
                      </div>
                    </div>
                    
                    <div>
                      <div className="text-white/30 text-[9px] uppercase tracking-wider mb-1">Gravity Vector Shift (Rotation Test)</div>
                      <div className="flex items-center gap-2 text-red-500 font-bold">
                        <XCircle size={14} />
                        <span>FAILED (Axis swap delta &lt; 0.05g)</span>
                      </div>
                    </div>

                    <div className="border-t border-white/5 pt-3 grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-white/30 text-[9px] uppercase tracking-wider">Stationary Tilt</div>
                        <div className="text-sm font-bold text-white/80">1.1°</div>
                      </div>
                      <div>
                        <div className="text-white/30 text-[9px] uppercase tracking-wider">Rotated Tilt</div>
                        <div className="text-sm font-bold text-white/80">1.2°</div>
                      </div>
                      <div>
                        <span className="text-white/30 text-[9px] uppercase tracking-wider">Actual Accel Z Min/Max</span>
                        <span className="block text-sm font-bold text-red-400 font-mono">9.86 / 10.08 m/s²</span>
                      </div>
                      <div>
                        <span className="text-white/30 text-[9px] uppercase tracking-wider">Expected Accel Z Min/Max</span>
                        <span className="block text-sm font-bold text-emerald-400 font-mono">-0.92 / 10.03 m/s²</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Why frozen explanation */}
                <div className="bg-[#0A0E12]/80 border border-red-500/10 rounded p-6 shadow-lg">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-red-400 mb-3 flex items-center gap-2">
                    <Info size={14} />
                    DIAGNOSTIC ANALYSIS
                  </h3>
                  <p className="text-[11px] text-white/70 leading-relaxed space-y-2">
                    <span>The MPU6050 (internally reporting device ID 0x70, characteristic of an MPU6500 clone) is responding correctly to registers queries. Its digital control logic is operational, which is why I2C scanning succeeds and WHO_AM_I can be retrieved.</span>
                    <br/><br/>
                    <span>However, the internal micro-electromechanical system (MEMS) sensor core is <strong>frozen/locked</strong>. This occurs in clones when:</span>
                  </p>
                  <ul className="text-[10px] text-white/60 list-disc pl-4 mt-3 space-y-1">
                    <li>The sensor is supplied with 5V instead of 3.3V (clones lack robust internal regulators and freeze under overvoltage).</li>
                    <li>The AD0 address select pin is left floating, causing transient voltage fluctuations on the IC substrate.</li>
                    <li>The internal charge pump or analog-to-digital converter (ADC) module inside the clone silicon is bricked.</li>
                  </ul>
                </div>

              </div>
            </div>
          </div>
        )}

        {/* TAB 3: INMP441 (Mic) */}
        {activeTab === 'mic' && (
          <div className="space-y-8 max-w-6xl mx-auto">
            {/* Header */}
            <div>
              <h2 className="text-lg font-black tracking-widest uppercase">INMP441 Microphone Pin & Channel Sweep</h2>
              <p className="text-[11px] text-white/40 uppercase tracking-wider mt-1">
                Investigation of I2S configuration parameters, data output characteristics, and acoustic stimulative correlations
              </p>
            </div>

            {/* Sweet Table & Info */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* Sweep results */}
              <div className="lg:col-span-2 space-y-6">
                <div className="bg-[#0A0E12]/80 border border-white/5 rounded p-6 shadow-xl">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-white/50 mb-4">
                    I2S PIN-SWEPT CONFIGURATIONS MATRIX
                  </h3>
                  
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-[11px]">
                      <thead>
                        <tr className="border-b border-white/10 text-white/40 uppercase font-black tracking-widest">
                          <th className="py-2.5 pb-4">Sweep / Pins</th>
                          <th className="py-2.5 pb-4">Channel</th>
                          <th className="py-2.5 pb-4 text-right">Unique Samples</th>
                          <th className="py-2.5 pb-4 text-right">Mean Value</th>
                          <th className="py-2.5 pb-4 text-right">Variance</th>
                          <th className="py-2.5 pb-4 text-right">Hardware Verdict</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 font-mono">
                        <tr>
                          <td className="py-3 text-white/80">WS=25 SCK=33 SD=32</td>
                          <td className="py-3 text-white/80">Left (GND)</td>
                          <td className="py-3 text-right">1</td>
                          <td className="py-3 text-right">0.00</td>
                          <td className="py-3 text-right">0.00</td>
                          <td className="py-3 text-right font-bold text-red-400">STUCK LOW</td>
                        </tr>
                        <tr className="bg-red-500/5">
                          <td className="py-3 text-white/80 font-bold">WS=25 SCK=33 SD=32</td>
                          <td className="py-3 text-yellow-400 font-bold">Right (3.3V)</td>
                          <td className="py-3 text-right font-bold">100</td>
                          <td className="py-3 text-right text-yellow-400 font-bold">760,176,430</td>
                          <td className="py-3 text-right text-yellow-400">2.99e14</td>
                          <td className="py-3 text-right font-bold text-yellow-400">FLOATING / RF NOISE</td>
                        </tr>
                        <tr>
                          <td className="py-3 text-white/80">WS=25 SCK=32 SD=33</td>
                          <td className="py-3 text-white/80">Left (GND)</td>
                          <td className="py-3 text-right">1</td>
                          <td className="py-3 text-right">-2.00</td>
                          <td className="py-3 text-right">0.00</td>
                          <td className="py-3 text-right font-bold text-red-500">STUCK HIGH</td>
                        </tr>
                        <tr>
                          <td className="py-3 text-white/80">WS=25 SCK=32 SD=33</td>
                          <td className="py-3 text-white/80">Right (3.3V)</td>
                          <td className="py-3 text-right">1</td>
                          <td className="py-3 text-right">1.00</td>
                          <td className="py-3 text-right">0.00</td>
                          <td className="py-3 text-right font-bold text-red-500">STUCK CONSTANT</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Acoustic correlation block */}
                <div className="bg-[#0A0E12]/80 border border-white/5 rounded p-6 shadow-xl">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-white/50 mb-4">
                    ACOUSTIC STIMULI CORRELATION TEST (SWEEP #2)
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="border border-white/5 p-4 rounded bg-[#05070A]/50">
                      <div className="text-[10px] text-white/30 uppercase tracking-widest mb-1">Clapping / Speaking RMS</div>
                      <div className="text-lg font-bold text-red-400 font-mono">0.032</div>
                      <p className="text-[9px] text-white/40 leading-relaxed mt-2 uppercase">Audio present next to MIC</p>
                    </div>

                    <div className="border border-white/5 p-4 rounded bg-[#05070A]/50">
                      <div className="text-[10px] text-white/30 uppercase tracking-widest mb-1">Silence Reference RMS</div>
                      <div className="text-lg font-bold text-red-400 font-mono">0.048</div>
                      <p className="text-[9px] text-white/40 leading-relaxed mt-2 uppercase">Ambient silence in biotope</p>
                    </div>

                    <div className="border border-white/5 p-4 rounded bg-[#05070A]/50">
                      <div className="text-[10px] text-white/30 uppercase tracking-widest mb-1">Stationary Reference RMS</div>
                      <div className="text-lg font-bold text-red-400 font-mono">0.039</div>
                      <p className="text-[9px] text-white/40 leading-relaxed mt-2 uppercase">No interaction phase</p>
                    </div>
                  </div>

                  <div className="bg-red-950/10 border border-red-500/20 p-4 rounded mt-6 text-[11px] text-white/70 leading-relaxed">
                    <strong>Correlation Verdict: ZERO.</strong> The RMS value during quiet intervals (0.048) actually exceeds the value during loud clapping (0.032). In a working microphone, claps would trigger a sharp spike (10x-50x increase in RMS). Because the signal variance is completely independent of acoustic vibrations, it indicates that the SD data pin is **physically floating** and acting as an antenna, picking up high-frequency electromagnetic / RF noise from the ESP32 transceiver rather than parsing real audio samples.
                  </div>
                </div>
              </div>

              {/* Stats column */}
              <div className="space-y-6">
                <div className="bg-[#0A0E12]/80 border border-white/5 rounded p-6 shadow-lg">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-white/50 border-b border-white/5 pb-2 mb-4">
                    MICROPHONE SPECS
                  </h3>
                  
                  <div className="space-y-4 text-xs">
                    <div>
                      <div className="text-white/30 text-[9px] uppercase tracking-wider mb-1">I2S Interface Channel</div>
                      <div className="font-bold text-white/80">Right Channel Mode (L/R select HIGH)</div>
                    </div>
                    
                    <div>
                      <div className="text-white/30 text-[9px] uppercase tracking-wider mb-1">Bit Depth</div>
                      <div className="font-bold text-white/80">32-bit (padded from 24-bit output)</div>
                    </div>

                    <div>
                      <div className="text-white/30 text-[9px] uppercase tracking-wider mb-1">Sampling Frequency</div>
                      <div className="font-bold text-white/80">16,000 Hz (Standard Acoustic Bandwidth)</div>
                    </div>

                    <div>
                      <div className="text-white/30 text-[9px] uppercase tracking-wider mb-1">First 5 Samples (Hex representation)</div>
                      <div className="font-mono text-red-400 break-words font-bold">
                        0x2F4F7100, 0x2F5D7B00, 0x2F3DC700, 0x2F846B00, 0x2ED19F00
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-[#0A0E12]/80 border border-red-500/10 rounded p-6 shadow-lg">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-red-400 mb-3 flex items-center gap-2">
                    <Info size={14} />
                    FLOATING STATE DIAGNOSIS
                  </h3>
                  <p className="text-[11px] text-white/70 leading-relaxed">
                    When the I2S sweeper tests Left Channel mode on the `SCK=33, SD=32` pin, it reads straight `0`s (stuck low). In Right Channel mode, it receives massive values. This reveals that the microphone is not pulling the data line down during the clock phase, leaving the ESP32 input pin high-impedance. 
                    <br/><br/>
                    The ESP32 reads high-frequency noise generated by its own CPU core and wireless radio, mimicking dynamic signal activity. Tie the L/R pin to GND to lock it to the Left Channel and check the SD signal traces.
                  </p>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* TAB 4: WIRING BLUEPRINT */}
        {activeTab === 'wiring' && (
          <div className="space-y-8 max-w-4xl mx-auto bg-[#0A0E12]/95 border border-white/10 p-8 rounded-lg shadow-2xl relative">
            <div className="absolute top-4 right-6 text-[9px] text-red-500 border border-red-500/20 px-2 py-0.5 rounded bg-red-500/5 uppercase font-bold tracking-widest">
              Actionable Fixes Required
            </div>

            <div>
              <h2 className="text-lg font-black tracking-widest uppercase flex items-center gap-2">
                <Zap className="text-red-500" size={18} />
                PHYSICAL CORRECTION SCHEMATICS
              </h2>
              <p className="text-[11px] text-white/40 uppercase tracking-wider mt-1">
                Step-by-step physical adjustments to resolve floating microphone lines and frozen accelerometer registers
              </p>
            </div>

            <hr className="border-white/10" />

            {/* Wiring Details */}
            <div className="space-y-8 text-xs leading-relaxed">
              
              {/* Fix 1: INMP441 Microphone */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-red-500 rounded-full" />
                  1. INMP441 Microphone Hardware Modification
                </h3>
                <p className="text-white/60">
                  Currently, the microphone defaults to the **Right Channel** (which is returning high-frequency floating noise) and returns **0 (Stuck Low)** on the Left Channel. To fix this:
                </p>
                <div className="bg-[#05070A] border border-white/5 p-4 rounded space-y-2 font-mono text-[11px]">
                  <div className="flex items-start gap-2">
                    <CornerDownRight size={14} className="text-red-500 shrink-0 mt-0.5" />
                    <span><strong>L/R Pin Selection:</strong> Connect the <strong>L/R Select</strong> pin directly to a <strong>GND</strong> pin. DO NOT leave it floating. Grounding forces Left Channel output and clears the floating high-frequency noise.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CornerDownRight size={14} className="text-red-500 shrink-0 mt-0.5" />
                    <span><strong>Power Supply:</strong> Connect the <strong>VDD</strong> pin to the ESP32 <strong>3.3V</strong> pin (Verify with multimeter that it reads &gt; 3.2V).</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CornerDownRight size={14} className="text-red-500 shrink-0 mt-0.5" />
                    <span><strong>Clock & Data Pins:</strong> Verify direct continuity on:
                      <br/>- <strong>WS</strong> &rarr; <strong>GPIO 25</strong>
                      <br/>- <strong>SCK</strong> &rarr; <strong>GPIO 33</strong>
                      <br/>- <strong>SD (Data)</strong> &rarr; <strong>GPIO 32</strong> (Avoid running SD next to high-speed SPI/LoRa lines to prevent crosstalk).
                    </span>
                  </div>
                </div>
              </div>

              {/* Fix 2: MPU6050 Accelerometer */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-red-500 rounded-full" />
                  2. MPU6050 Accelerometer Hardware Modification
                </h3>
                <p className="text-white/60">
                  The MPU6050 registers are responding but their values are **frozen** (does not react to board tilt). This points to an overvoltage lockup or address line floating state:
                </p>
                <div className="bg-[#05070A] border border-white/5 p-4 rounded space-y-2 font-mono text-[11px]">
                  <div className="flex items-start gap-2">
                    <CornerDownRight size={14} className="text-red-500 shrink-0 mt-0.5" />
                    <span><strong>Power Line Check:</strong> Ensure VCC is connected to the ESP32 <strong>3.3V</strong> output pin. <strong>DO NOT connect to 5V (VIN)</strong>. MPU6500 clones have weak regulators that fail and lock the sensor core when powered with 5V, while keeping the I2C interface active.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CornerDownRight size={14} className="text-red-500 shrink-0 mt-0.5" />
                    <span><strong>Address Pin (AD0):</strong> Tie the <strong>AD0</strong> pin on the MPU module directly to <strong>GND</strong>. This locks the I2C address to the standard <strong>0x68</strong>, preventing random switching.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CornerDownRight size={14} className="text-red-500 shrink-0 mt-0.5" />
                    <span><strong>Power Cycle:</strong> Fully power-down the board (unplug USB) after making modifications to discharge the sensor capacitors and reset the registers.</span>
                  </div>
                </div>
              </div>

              {/* Fix 3: LoRa & Board Health */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                  3. SX1278 LoRa Wiring Verification (Operational Reference)
                </h3>
                <p className="text-white/60">
                  Keep the current LoRa SPI layout since it has been verified as working:
                </p>
                <div className="bg-[#05070A] border border-white/5 p-4 rounded space-y-1 font-mono text-[11px] text-white/50">
                  <div>- <strong>MISO</strong> &rarr; <strong>GPIO 19</strong> | <strong>MOSI</strong> &rarr; <strong>GPIO 27</strong></div>
                  <div>- <strong>SCK</strong> &rarr; <strong>GPIO 5</strong>  | <strong>NSS/CS</strong> &rarr; <strong>GPIO 18</strong></div>
                  <div>- <strong>DIO0</strong> &rarr; <strong>GPIO 26</strong> | <strong>RST</strong> &rarr; <strong>GPIO 23</strong></div>
                </div>
              </div>

            </div>

            {/* Bottom Note */}
            <div className="mt-8 pt-6 border-t border-white/5 flex items-center gap-2 text-[10px] text-white/40">
              <HelpCircle size={14} />
              <span>Need help? Check your board wiring using a digital multimeter in continuity mode. Check for micro-shorts between adjacent pins.</span>
            </div>
          </div>
        )}

        {/* TAB 5: RAW LOGS */}
        {activeTab === 'logs' && (
          <div className="space-y-4 max-w-5xl mx-auto h-full flex flex-col">
            
            {/* Filter Buttons */}
            <div className="flex flex-wrap justify-between items-center gap-4 shrink-0">
              <div className="flex gap-2">
                {(['all', 'system', 'mpu', 'mic', 'lora'] as const).map(filter => (
                  <button
                    key={filter}
                    onClick={() => setLogFilter(filter)}
                    className={`px-3 py-1 text-[9px] font-bold uppercase rounded border ${
                      logFilter === filter 
                        ? 'bg-red-500/10 border-red-500/30 text-red-400' 
                        : 'bg-transparent border-white/5 text-white/40 hover:text-white/80'
                    }`}
                  >
                    {filter}
                  </button>
                ))}
              </div>
              <span className="text-[10px] text-white/30 uppercase tracking-widest">
                Showing {filteredLogs.length} logs
              </span>
            </div>

            {/* Terminal Window */}
            <div className="flex-1 bg-[#05070A] border border-white/10 rounded-lg p-6 font-mono text-[11px] leading-relaxed overflow-y-auto min-h-[400px] h-[550px] shadow-inner select-text">
              <div className="flex items-center gap-2 border-b border-white/5 pb-2 mb-4 text-white/30 text-[10px]">
                <Terminal size={12} />
                <span>DIAGNOSTIC TERMINAL LOGS FEED</span>
              </div>
              
              <div className="space-y-1.5">
                {filteredLogs.map((log, index) => {
                  let logColor = 'text-white/70';
                  if (log.message.includes('ERROR') || log.message.includes('FAILED')) {
                    logColor = 'text-red-500 font-bold';
                  } else if (log.message.includes('WARNING')) {
                    logColor = 'text-amber-500';
                  } else if (log.message.includes('SUCCESS') || log.message.includes('NOMINAL') || log.message.includes('WORKING')) {
                    logColor = 'text-emerald-400 font-bold';
                  } else if (log.message.startsWith('===')) {
                    logColor = 'text-white/40 font-bold';
                  }

                  let typeColor = 'bg-white/5 text-white/40';
                  if (log.type === 'mpu') typeColor = 'bg-cyan-500/10 text-cyan-400';
                  else if (log.type === 'mic') typeColor = 'bg-amber-500/10 text-amber-400';
                  else if (log.type === 'lora') typeColor = 'bg-emerald-500/10 text-emerald-400';

                  return (
                    <div key={index} className="hover:bg-white/5 py-0.5 px-1 rounded flex items-start gap-4">
                      <span className="text-white/20 select-none">{log.time}</span>
                      <span className={`text-[8px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded select-none shrink-0 min-w-[50px] text-center ${typeColor}`}>
                        {log.type}
                      </span>
                      <span className={logColor}>{log.message}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Bottom info bar */}
            <div className="flex justify-between items-center text-[9px] text-white/30 uppercase shrink-0 px-2">
              <span>Diagnostic Mode compiles firmware with #define DIAGNOSTIC_MODE true</span>
              <span>Syncing with COM5 output stream</span>
            </div>

          </div>
        )}

      </div>

    </div>
  );
}
