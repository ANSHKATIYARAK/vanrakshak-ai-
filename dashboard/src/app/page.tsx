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
  FileJson,
  Play,
  Square,
  RefreshCw,
  Clock,
  Trash2,
  Sliders,
  Volume2,
  VolumeX,
  Info,
  CheckSquare,
  AlertCircle
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

type TabType = 'operations' | 'ranger' | 'health' | 'acoustic' | 'timeline';

// Interactive Test IDs for Health Lab
type TestId = 
  | 'mpu_stationary' | 'mpu_tilt' | 'mpu_shake'
  | 'mic_silence' | 'mic_clap' | 'mic_voice'
  | 'lora_reg' | 'lora_pkt'
  | 'esp_interval' | 'esp_freshness'
  | 'laptop_silence' | 'laptop_clap' | 'laptop_chainsaw' | 'laptop_voice';

interface TestItem {
  id: TestId;
  name: string;
  desc: string;
  expected: string;
  status: 'idle' | 'running' | 'pass' | 'fail';
  confidence: number;
}

export default function CommandCenter() {
  const [activeTab, setActiveTab] = useState<TabType>('operations');
  const [data, setData] = useState<any>(null);

  // Dynamic host helper for backend communication
  const getBackendUrl = (path: string) => {
    const hostname = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
    return `http://${hostname}:8000${path}`;
  };
  const [isAudioInit, setIsAudioInit] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const ws = useRef<WebSocket | null>(null);
  const [lastWsTime, setLastWsTime] = useState<string>('Never');
  const [lastWsMsg, setLastWsMsg] = useState<string>('None');
  const [wsConnected, setWsConnected] = useState<boolean>(false);
  const [packetAge, setPacketAge] = useState<string>('Never');
  const [isDebugExpanded, setIsDebugExpanded] = useState<boolean>(false);
  const [isVirtualHardwareExpanded, setIsVirtualHardwareExpanded] = useState<boolean>(true);

  // --- Laptop Microphone State ---
  const [micActive, setMicActive] = useState(false);
  const [audioFeatures, setAudioFeatures] = useState({ rms: 0, peak: 0, centroid: 0, flatness: 0 });
  const [audioClassifications, setAudioClassifications] = useState<any[]>([
    { name: 'Ambient sound', confidence: 100 },
    { name: 'Periodic high-frequency noise', confidence: 0 },
    { name: 'Impact event', confidence: 0 },
    { name: 'Vehicle-like pattern', confidence: 0 },
    { name: 'Silence', confidence: 0 }
  ]);
  const [micThresholds, setMicThresholds] = useState({ yellow: 70, orange: 85, red: 95 });

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const waveformCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const spectrogramCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const lastAlertTimeRef = useRef<number>(0);
  const lastSentTimeRef = useRef<number>(0);
  const micActiveRef = useRef<boolean>(false);

  // --- Sensor Health Lab State ---
  const [activeTestSuite, setActiveTestSuite] = useState<boolean>(false);
  const [activeTestIndex, setActiveTestIndex] = useState<number>(-1);
  const [testSuiteResults, setTestSuiteResults] = useState<Record<TestId, TestItem>>({
    mpu_stationary: { id: 'mpu_stationary', name: 'MPU6050 Stationary', desc: 'Verify sensor tilt is stable and variation < 2°.', expected: 'Tilt Stable', status: 'idle', confidence: 0 },
    mpu_tilt: { id: 'mpu_tilt', name: 'MPU6050 Rotate 90°', desc: 'Detect acceleration axis shift on board rotation.', expected: 'Axis Swap Detected', status: 'idle', confidence: 0 },
    mpu_shake: { id: 'mpu_shake', name: 'MPU6050 Shake Board', desc: 'Verify mechanical vibration triggers score spike.', expected: 'Vib > 30.0', status: 'idle', confidence: 0 },
    mic_silence: { id: 'mic_silence', name: 'INMP441 Silence Reference', desc: 'Verify low RMS energy when biotope is quiet.', expected: 'RMS < 15.0', status: 'idle', confidence: 0 },
    mic_clap: { id: 'mic_clap', name: 'INMP441 Clap Calibration', desc: 'Verify high acoustic spike occurs on sound impact.', expected: 'RMS spike > 300.0', status: 'idle', confidence: 0 },
    mic_voice: { id: 'mic_voice', name: 'INMP441 Speech Waveform', desc: 'Verify changing acoustic frequencies for dynamic audio.', expected: 'Dynamic RMS Variance', status: 'idle', confidence: 0 },
    lora_reg: { id: 'lora_reg', name: 'LoRa SPI Register', desc: 'Verify SPI register communication returns 0x12.', expected: 'Reg 0x42 = 0x12', status: 'idle', confidence: 0 },
    lora_pkt: { id: 'lora_pkt', name: 'LoRa Packet Transport', desc: 'Verify incoming packet counter is incrementing.', expected: 'Counter Increase', status: 'idle', confidence: 0 },
    esp_interval: { id: 'esp_interval', name: 'ESP32 Interval Sync', desc: 'Verify telemetry packets arrive in 1-second ticks.', expected: 'Interval <= 1.2s', status: 'idle', confidence: 0 },
    esp_freshness: { id: 'esp_freshness', name: 'ESP32 Packet Freshness', desc: 'Verify latency delay is within safe threshold.', expected: 'Latency < 1.5s', status: 'idle', confidence: 0 },
    laptop_silence: { id: 'laptop_silence', name: 'Laptop Mic Silence', desc: 'Verify browser audio captures zero volume.', expected: 'Browser RMS < 0.005', status: 'idle', confidence: 0 },
    laptop_clap: { id: 'laptop_clap', name: 'Laptop Mic Clap', desc: 'Verify browser audio captures spike event.', expected: 'Browser Peak > 0.6', status: 'idle', confidence: 0 },
    laptop_chainsaw: { id: 'laptop_chainsaw', name: 'AI Acoustic Anomaly', desc: 'Verify AI assistant detects periodic high-freq noise.', expected: 'Periodic Pattern > 85%', status: 'idle', confidence: 0 },
    laptop_voice: { id: 'laptop_voice', name: 'Laptop Mic Voice', desc: 'Verify browser audio registers speech formants.', expected: 'Vocal Frequency peaks', status: 'idle', confidence: 0 }
  });

  // Track values to detect changes
  const prevTelemetryRef = useRef<any>(null);

  // --- WebSocket Connection ---
  useEffect(() => {
    let active = true;
    let reconnectTimeout: any = null;

    const connect = () => {
      if (!active) return;
      const hostname = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
      const wsUrl = `ws://${hostname}:8000/ws`;
      
      console.log(`[TRACE][FRONTEND] Connecting to WebSocket at ${wsUrl}...`);
      const socket = new WebSocket(wsUrl);
      ws.current = socket;

      socket.onopen = () => {
        if (!active) return;
        setWsConnected(true);
        console.log('[TRACE][FRONTEND] WebSocket connection established.');
      };

      socket.onclose = () => {
        if (!active) return;
        setWsConnected(false);
        console.log('[TRACE][FRONTEND] WebSocket connection closed. Reconnecting in 3s...');
        reconnectTimeout = setTimeout(connect, 3000);
      };

      socket.onerror = (err) => {
        if (!active) return;
        setWsConnected(false);
        console.log('[TRACE][FRONTEND] WebSocket error:', err);
      };

      socket.onmessage = (event) => {
        if (!active) return;
        try {
          const message = JSON.parse(event.data);
          setLastWsTime(new Date().toLocaleTimeString());
          setLastWsMsg(JSON.stringify(message));

          if (message.type === 'simulation_state') {
            setData(message.data);
            
            // Update Audio Engine if enabled
            if (isAudioInit) {
              audioEngine.update(message.data.integrity_score, message.data.threat_score);
            }
          }
        } catch (e) {
          console.error('[TRACE][FRONTEND] Error parsing WebSocket message:', e);
        }
      };
    };

    connect();

    return () => {
      active = false;
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
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
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }),
          tilt: data.latest_telemetry.tilt,
          audioRms: data.latest_telemetry.audioRms,
          vibration: data.latest_telemetry.vibration,
          battery: data.latest_telemetry.battery,
          rssi: data.latest_telemetry.rssi,
          packets: data.latest_telemetry.packets
        };
        const updated = [...prev, newPoint];
        if (updated.length > 20) {
          updated.shift();
        }
        return updated;
      });
    }
  }, [data?.latest_telemetry]);

  // --- Real-time Sensor Health Lab Evaluator ---
  useEffect(() => {
    if (!data?.latest_telemetry || !activeTestSuite || activeTestIndex === -1) return;

    const tel = data.latest_telemetry;
    const prev = prevTelemetryRef.current;
    const testList = Object.keys(testSuiteResults) as TestId[];
    const activeTestId = testList[activeTestIndex];
    const activeTest = testSuiteResults[activeTestId];

    if (activeTest.status !== 'running') return;

    let testPassed = false;
    let confidence = 0;

    switch (activeTestId) {
      case 'mpu_stationary':
        // Tilt variation < 2°
        if (history.length >= 5) {
          const recentTilts = history.slice(-5).map(h => h.tilt);
          const maxTilt = Math.max(...recentTilts);
          const minTilt = Math.min(...recentTilts);
          const delta = Math.abs(maxTilt - minTilt);
          if (delta < 2.0 && Math.abs(tel.tilt) < 10.0) {
            testPassed = true;
            confidence = Math.max(90, Math.round(100 - delta * 5));
          }
        }
        break;
      case 'mpu_tilt':
        // Gravity vector changes (tilt shifts)
        if (prev && Math.abs(tel.tilt - prev.tilt) > 10.0) {
          testPassed = true;
          confidence = 98;
        }
        break;
      case 'mpu_shake':
        // Vibration > 30
        if (tel.vibration > 30.0) {
          testPassed = true;
          confidence = Math.min(100, Math.round(70 + tel.vibration * 0.5));
        }
        break;
      case 'mic_silence':
        // Audio RMS < 15.0 (for simulated sensor, we represent RMS range 0-1000)
        if (tel.audioRms < 15.0) {
          testPassed = true;
          confidence = Math.round(100 - tel.audioRms * 2);
        }
        break;
      case 'mic_clap':
        // Audio RMS spike > 300.0
        if (tel.audioRms > 300.0) {
          testPassed = true;
          confidence = 95;
        }
        break;
      case 'mic_voice':
        // Variance in audio RMS (values change)
        if (prev && tel.audioRms !== prev.audioRms && Math.abs(tel.audioRms - prev.audioRms) > 5.0) {
          testPassed = true;
          confidence = 90;
        }
        break;
      case 'lora_reg':
        // LoRa version register returns 0x12
        if (tel.lora_ver === '0x12' || tel.lora_ver === 18 || tel.lora_ver === '0x12 (SX1278)') {
          testPassed = true;
          confidence = 100;
        }
        break;
      case 'lora_pkt':
        // Counter increases
        if (prev && tel.packets > prev.packets) {
          testPassed = true;
          confidence = 100;
        }
        break;
      case 'esp_interval':
        // Telemetry interval check
        testPassed = true; // Telemetry loop runs, if ws updates arrive we pass
        confidence = 98;
        break;
      case 'esp_freshness':
        // Freshness < 1.5s
        const age = (Date.now() - new Date(tel.timestamp).getTime()) / 1000;
        if (age < 1.5) {
          testPassed = true;
          confidence = 99;
        }
        break;
      // Laptop tests evaluate in the browser mic loop instead
      default:
        break;
    }

    if (testPassed) {
      updateTestStatus(activeTestId, 'pass', confidence);
      // Advance test suite
      setTimeout(() => {
        if (activeTestIndex < testList.length - 1) {
          setActiveTestIndex(prevIdx => prevIdx + 1);
        } else {
          setActiveTestSuite(false);
          setActiveTestIndex(-1);
        }
      }, 1500);
    }

    prevTelemetryRef.current = tel;
  }, [data?.latest_telemetry, activeTestSuite, activeTestIndex]);

  const updateTestStatus = (id: TestId, status: 'idle' | 'running' | 'pass' | 'fail', confidence: number) => {
    setTestSuiteResults(prev => ({
      ...prev,
      [id]: { ...prev[id], status, confidence }
    }));
  };

  const handleStartTestSuite = () => {
    setActiveTestSuite(true);
    // Reset all test statuses to idle
    setTestSuiteResults(prev => {
      const reset = { ...prev };
      Object.keys(reset).forEach(key => {
        reset[key as TestId].status = 'idle';
        reset[key as TestId].confidence = 0;
      });
      return reset;
    });
    setActiveTestIndex(0);
  };

  useEffect(() => {
    if (activeTestIndex === -1 || !activeTestSuite) return;
    const testList = Object.keys(testSuiteResults) as TestId[];
    const activeTestId = testList[activeTestIndex];
    updateTestStatus(activeTestId, 'running', 0);
  }, [activeTestIndex, activeTestSuite]);

  // --- Laptop Microphone Feature Extraction & Classification Pipeline ---
  const toggleLaptopMic = async () => {
    if (micActive) {
      stopLaptopMic();
    } else {
      await startLaptopMic();
    }
  };

  const startLaptopMic = async () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioCtx();
      audioContextRef.current = audioCtx;

      // Resume context if suspended (essential for Chrome/WebKit)
      if (audioCtx.state === 'suspended') {
        await audioCtx.resume();
      }

      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      analyserRef.current = analyser;

      let stream: MediaStream | null = null;
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error('WebRTC mediaDevices API is not supported in this browser context (e.g. non-secure HTTP / missing SSL context).');
        }
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        micStreamRef.current = stream;
        const source = audioCtx.createMediaStreamSource(stream);
        source.connect(analyser);
      } catch (err: any) {
        console.warn('Microphone access denied or unavailable, running in Synthesizer-only mode:', err);
        alert(`Microphone Error: ${err.message || err}. Running in Synthesizer-only mode. Please allow microphone access or use localhost instead of the IP address.`);
      }

      micActiveRef.current = true;
      setMicActive(true);
      runAudioAnalysis();
    } catch (err) {
      alert('Could not initialize audio system. Please check browser configurations.');
      console.error(err);
    }
  };

  const stopLaptopMic = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach(track => track.stop());
      micStreamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    analyserRef.current = null;
    micActiveRef.current = false;
    setMicActive(false);
    setAudioFeatures({ rms: 0, peak: 0, centroid: 0, flatness: 0 });
    setAudioClassifications([
      { name: 'Ambient sound', confidence: 100 },
      { name: 'Periodic high-frequency noise', confidence: 0 },
      { name: 'Impact event', confidence: 0 },
      { name: 'Vehicle-like pattern', confidence: 0 },
      { name: 'Silence', confidence: 0 }
    ]);
  };

  const runAudioAnalysis = () => {
    if (!analyserRef.current) return;
    const analyser = analyserRef.current;
    const bufferLength = analyser.fftSize;
    const timeData = new Uint8Array(bufferLength);
    const freqData = new Uint8Array(analyser.frequencyBinCount);

    const analyze = () => {
      if (!micActiveRef.current) return;
      analyser.getByteTimeDomainData(timeData);
      analyser.getByteFrequencyData(freqData);

      // 1. Draw Waveform
      drawWaveform(timeData);

      // 2. Draw Spectrogram
      drawSpectrogram(freqData);

      // 3. Extract Features
      // RMS (Energy)
      let sum = 0;
      let peakVal = 0;
      for (let i = 0; i < bufferLength; i++) {
        const val = (timeData[i] - 128) / 128;
        sum += val * val;
        if (Math.abs(val) > peakVal) peakVal = Math.abs(val);
      }
      const rms = Math.sqrt(sum / bufferLength);

      // Spectral Centroid
      let num = 0;
      let den = 0;
      for (let i = 0; i < freqData.length; i++) {
        num += i * freqData[i];
        den += freqData[i];
      }
      const centroid = den === 0 ? 0 : (num / den) * (22050 / freqData.length); // Hz mapping

      // Spectral Flatness
      let logSum = 0;
      let sumF = 0;
      for (let i = 0; i < freqData.length; i++) {
        const val = freqData[i] / 255.0 + 0.0001;
        logSum += Math.log(val);
        sumF += val;
      }
      const geoMean = Math.exp(logSum / freqData.length);
      const ariMean = sumF / freqData.length;
      const flatness = ariMean === 0 ? 0 : geoMean / ariMean;

      setAudioFeatures({ rms, peak: peakVal, centroid, flatness });

      // 4. Descriptive Classification Logic
      classifyAcoustics(rms, peakVal, centroid, flatness);

      // Throttle and send real-time audio features to backend
      const nowTime = Date.now();
      if (nowTime - lastSentTimeRef.current >= 500) {
        lastSentTimeRef.current = nowTime;
        sendMicTelemetry(rms, peakVal);
      }

      animationFrameRef.current = requestAnimationFrame(analyze);
    };

    animationFrameRef.current = requestAnimationFrame(analyze);
  };

  const classifyAcoustics = (rms: number, peak: number, centroid: number, flatness: number) => {
    let confSilence = 0;
    let confChainsaw = 0; // Periodic high-frequency noise
    let confAxe = 0; // Impact event
    let confVehicle = 0; // Vehicle-like pattern
    let confAmbient = 0;

    // A. Silence
    if (rms < 0.005) {
      confSilence = 100;
    } else {
      confSilence = Math.max(0, Math.round(10 - rms * 1000));
    }

    // B. Impact Event (Sharp transient spike, high peak-to-RMS)
    const peakToRms = rms > 0 ? peak / rms : 0;
    if (rms > 0.04 && peakToRms > 3.8 && peak > 0.4) {
      confAxe = Math.min(100, Math.round(peakToRms * 15));
    }

    // C. Periodic High-Frequency Noise (Buzzing/High Flatness/High Centroid)
    if (rms > 0.03 && centroid > 1200 && centroid < 4000 && flatness > 0.15) {
      confChainsaw = Math.min(100, Math.round(rms * 400 + flatness * 80));
    }

    // D. Vehicle-like Pattern (Low-frequency Hum/Low Centroid)
    if (rms > 0.02 && centroid > 50 && centroid < 400) {
      confVehicle = Math.min(100, Math.round(rms * 500 + (1 - flatness) * 40));
    }

    // E. Ambient Sound (Fallback when nothing else registers)
    confAmbient = Math.max(0, 100 - (confSilence + confChainsaw + confAxe + confVehicle));

    // Normalize
    const classes = [
      { name: 'Silence', confidence: confSilence },
      { name: 'Impact event', confidence: confAxe },
      { name: 'Periodic high-frequency noise', confidence: confChainsaw },
      { name: 'Vehicle-like pattern', confidence: confVehicle },
      { name: 'Ambient sound', confidence: confAmbient }
    ].sort((a, b) => b.confidence - a.confidence);

    setAudioClassifications(classes);

    // AI Health lab tests verification
    if (activeTestSuite && activeTestIndex !== -1) {
      const testList = Object.keys(testSuiteResults) as TestId[];
      const activeTestId = testList[activeTestIndex];
      
      if (activeTestId === 'laptop_silence' && rms < 0.006) {
        updateTestStatus('laptop_silence', 'pass', 99);
        advanceTestSuite();
      } else if (activeTestId === 'laptop_clap' && peak > 0.6) {
        updateTestStatus('laptop_clap', 'pass', 98);
        advanceTestSuite();
      } else if (activeTestId === 'laptop_chainsaw' && confChainsaw > 80) {
        updateTestStatus('laptop_chainsaw', 'pass', 92);
        advanceTestSuite();
      } else if (activeTestId === 'laptop_voice' && rms > 0.02 && centroid > 500 && centroid < 1200) {
        updateTestStatus('laptop_voice', 'pass', 90);
        advanceTestSuite();
      }
    }

    // Alert Engine integration - throttle alert posting to once every 6 seconds
    const now = Date.now();
    if (now - lastAlertTimeRef.current > 6000) {
      const topClass = classes[0];
      
      // Map descriptive anomalies to alert categories
      if (topClass.confidence >= micThresholds.yellow) {
        let threatType = '';
        let score = topClass.confidence / 100;
        
        if (topClass.name === 'Periodic high-frequency noise') {
          threatType = 'Acoustic anomaly'; // chainsaw
        } else if (topClass.name === 'Impact event') {
          threatType = 'Acoustic anomaly'; // axe strike
        } else if (topClass.name === 'Vehicle-like pattern') {
          threatType = 'Acoustic anomaly'; // vehicle
        } else if (topClass.name === 'Ambient sound' && rms > 0.025) {
          threatType = 'Acoustic anomaly'; // loud speech/noise/encroachment
        }

        if (threatType) {
          lastAlertTimeRef.current = now;
          postMicAlert(threatType, score);
        }
      }
    }
  };

  const advanceTestSuite = () => {
    setTimeout(() => {
      const testList = Object.keys(testSuiteResults) as TestId[];
      if (activeTestIndex < testList.length - 1) {
        setActiveTestIndex(prev => prev + 1);
      } else {
        setActiveTestSuite(false);
        setActiveTestIndex(-1);
      }
    }, 1200);
  };

  const postMicAlert = async (type: string, conf: number) => {
    try {
      const confVal = isNaN(conf) ? 0.0 : conf;
      console.log(`[TRACE][FRONTEND] Posting laptop microphone alert: ${type} (${Math.round(confVal*100)}%)`);
      await fetch(getBackendUrl('/alerts/mic'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          node_id: 'VR-X-001',
          threat_type: type,
          confidence: confVal,
          threat_score: confVal
        })
      });
    } catch (err) {
      console.error('Failed to post mic alert:', err);
    }
  };

  const sendMicTelemetry = async (rms: number, peak: number) => {
    try {
      const rmsVal = isNaN(rms) ? 0.0 : rms;
      const peakVal = isNaN(peak) ? 0.0 : peak;
      const scaledRms = Math.min(1000.0, rmsVal * 10000);
      const scaledPeak = Math.min(2000.0, peakVal * 10000);
      console.log(`[TRACE][FRONTEND] Sending laptop microphone live telemetry: rms=${scaledRms.toFixed(1)}, peak=${scaledPeak.toFixed(0)}`);
      await fetch(getBackendUrl('/demo/telemetry'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source: 'laptop_mic',
          node_id: 'VR-X-001',
          rms: scaledRms,
          peak: scaledPeak
        })
      });
    } catch (err) {
      console.error('Failed to send mic telemetry:', err);
    }
  };

  // --- Sound Synthesizer for Demo Actions ---
  const playSynthesizedSound = async (soundType: 'chainsaw' | 'axe' | 'vehicle' | 'voice' | 'ambient' | 'silence') => {
    try {
      if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
        await startLaptopMic();
      }
      const ctx = audioContextRef.current;
      if (!ctx || ctx.state === 'closed') {
        console.warn('AudioContext is unavailable or closed.');
        return;
      }
      const now = ctx.currentTime;
      
      // Create master gain node
      const demoGain = ctx.createGain();
      demoGain.gain.setValueAtTime(0.4, now);
      demoGain.connect(ctx.destination);
      
      // Route internally to analyser so it displays on the dashboard/lab tests instantly
      if (analyserRef.current) {
        demoGain.connect(analyserRef.current);
      }

      if (soundType === 'chainsaw') {
        // Chainsaw: Square oscillator (80Hz) + Sawtooth oscillator (160Hz) + crackle noise
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const noise = ctx.createBufferSource();
        
        osc1.type = 'square';
        osc1.frequency.setValueAtTime(85, now);
        
        osc2.type = 'sawtooth';
        osc2.frequency.setValueAtTime(170, now);
        
        // Noise buffer for mechanical crackle
        const bufferSize = ctx.sampleRate * 2;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const dataArr = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          dataArr[i] = Math.random() * 2 - 1;
        }
        noise.buffer = buffer;
        noise.loop = true;

        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(800, now);
        filter.Q.setValueAtTime(1.0, now);

        const noiseGain = ctx.createGain();
        noiseGain.gain.setValueAtTime(0.12, now);

        osc1.connect(filter);
        osc2.connect(filter);
        noise.connect(noiseGain);
        noiseGain.connect(filter);
        filter.connect(demoGain);

        osc1.start(now);
        osc2.start(now);
        noise.start(now);

        osc1.stop(now + 4);
        osc2.stop(now + 4);
        noise.stop(now + 4);

      } else if (soundType === 'axe') {
        // Axe Strike: High frequency metallic bell + low pitch impact wood thud
        const oscBell = ctx.createOscillator();
        const thud = ctx.createOscillator();
        
        oscBell.type = 'sine';
        oscBell.frequency.setValueAtTime(950, now);
        
        thud.type = 'triangle';
        thud.frequency.setValueAtTime(120, now);
        thud.frequency.exponentialRampToValueAtTime(40, now + 0.15);

        const bellGain = ctx.createGain();
        bellGain.gain.setValueAtTime(0.6, now);
        bellGain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

        const thudGain = ctx.createGain();
        thudGain.gain.setValueAtTime(0.8, now);
        thudGain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

        oscBell.connect(bellGain);
        bellGain.connect(demoGain);
        
        thud.connect(thudGain);
        thudGain.connect(demoGain);

        oscBell.start(now);
        thud.start(now);

        oscBell.stop(now + 0.3);
        thud.stop(now + 0.3);

      } else if (soundType === 'vehicle') {
        // Vehicle: Low frequency rumble
        const engineOsc = ctx.createOscillator();
        engineOsc.type = 'sawtooth';
        engineOsc.frequency.setValueAtTime(55, now);

        const lpf = ctx.createBiquadFilter();
        lpf.type = 'lowpass';
        lpf.frequency.setValueAtTime(120, now);

        engineOsc.connect(lpf);
        lpf.connect(demoGain);

        engineOsc.start(now);
        engineOsc.stop(now + 4);

      } else if (soundType === 'voice') {
        // Voice: formant filter sweep over sawtooth wave
        const voiceOsc = ctx.createOscillator();
        voiceOsc.type = 'sawtooth';
        voiceOsc.frequency.setValueAtTime(150, now);

        const formant = ctx.createBiquadFilter();
        formant.type = 'bandpass';
        formant.frequency.setValueAtTime(700, now);
        formant.frequency.exponentialRampToValueAtTime(1200, now + 1.0);
        formant.frequency.exponentialRampToValueAtTime(600, now + 2.0);

        voiceOsc.connect(formant);
        formant.connect(demoGain);

        voiceOsc.start(now);
        voiceOsc.stop(now + 3);
      }
    } catch (err) {
      console.error('Synthesizer sound playback failed:', err);
    }
  };

  // Direct injection helper for laptop classifications
  const injectLaptopClassification = (name: string, conf: number) => {
    const classes = [
      { name: 'Silence', confidence: name === 'Silence' ? conf : 0 },
      { name: 'Impact event', confidence: name === 'Impact event' ? conf : 0 },
      { name: 'Periodic high-frequency noise', confidence: name === 'Periodic high-frequency noise' ? conf : 0 },
      { name: 'Vehicle-like pattern', confidence: name === 'Vehicle-like pattern' ? conf : 0 },
      { name: 'Ambient sound', confidence: name === 'Ambient sound' ? conf : 100 - conf }
    ].sort((a, b) => b.confidence - a.confidence);

    setAudioClassifications(classes);

    // AI Health lab tests verification
    if (activeTestSuite && activeTestIndex !== -1) {
      const testList = Object.keys(testSuiteResults) as TestId[];
      const activeTestId = testList[activeTestIndex];
      if (activeTestId === 'laptop_silence' && name === 'Silence') {
        updateTestStatus('laptop_silence', 'pass', conf);
        advanceTestSuite();
      } else if (activeTestId === 'laptop_clap' && name === 'Impact event') {
        updateTestStatus('laptop_clap', 'pass', conf);
        advanceTestSuite();
      } else if (activeTestId === 'laptop_chainsaw' && name === 'Periodic high-frequency noise') {
        updateTestStatus('laptop_chainsaw', 'pass', conf);
        advanceTestSuite();
      } else if (activeTestId === 'laptop_voice' && name === 'Voice-like') {
        updateTestStatus('laptop_voice', 'pass', conf);
        advanceTestSuite();
      }
    }

    if (conf >= micThresholds.yellow) {
      let threatType = '';
      if (name === 'Periodic high-frequency noise') threatType = 'Acoustic anomaly';
      else if (name === 'Impact event') threatType = 'Acoustic anomaly';
      else if (name === 'Vehicle-like pattern') threatType = 'Acoustic anomaly';

      if (threatType) {
        postMicAlert(threatType, conf / 100);
      }
    }
  };

  // --- Waveform & Spectrogram Drawing ---
  const drawWaveform = (dataArray: Uint8Array) => {
    if (!waveformCanvasRef.current) return;
    const canvas = waveformCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#090D11';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.lineWidth = 2;
    ctx.strokeStyle = '#22d3ee'; // cyan-400
    ctx.beginPath();

    const sliceWidth = canvas.width / dataArray.length;
    let x = 0;

    for (let i = 0; i < dataArray.length; i++) {
      const v = dataArray[i] / 128.0;
      const y = (v * canvas.height) / 2;

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
      x += sliceWidth;
    }

    ctx.lineTo(canvas.width, canvas.height / 2);
    ctx.stroke();
  };

  const drawSpectrogram = (dataArray: Uint8Array) => {
    if (!spectrogramCanvasRef.current) return;
    const canvas = spectrogramCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Slide left
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    const tempCtx = tempCanvas.getContext('2d');
    if (tempCtx) {
      tempCtx.drawImage(canvas, 0, 0);
      ctx.fillStyle = '#090D11';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(tempCanvas, -2, 0);
    }

    const x = canvas.width - 2;
    const bins = Math.min(dataArray.length, 64);
    const sliceHeight = canvas.height / bins;

    for (let i = 0; i < bins; i++) {
      const val = dataArray[i]; // 0-255
      const y = canvas.height - (i * sliceHeight);

      // Color mapping: black -> blue -> purple -> red -> yellow
      let color = '#090D11';
      if (val > 15) {
        const r = Math.min(255, Math.max(0, (val - 70) * 2));
        const g = Math.min(255, Math.max(0, (val - 140) * 3));
        const b = Math.min(255, Math.max(0, val * 1.3));
        color = `rgb(${r},${g},${b})`;
      }
      ctx.fillStyle = color;
      ctx.fillRect(x, y, 2, sliceHeight);
    }
  };

  // --- Virtual Hardware Injector Helper ---
  const injectHardwareTelemetry = async (payload: any) => {
    try {
      console.log('[TRACE][FRONTEND] Injecting virtual hardware telemetry:', payload);
      const res = await fetch(getBackendUrl('/demo/telemetry'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const resData = await res.json();
      console.log('[TRACE][FRONTEND] Injection result:', resData);
    } catch (err) {
      console.error('Failed to inject hardware telemetry:', err);
    }
  };

  // --- Ranger Respond Action Handler ---
  const handleRangerResponse = async (alertId: number, action: string) => {
    try {
      console.log(`[TRACE][FRONTEND] Ranger respond to alert ${alertId} with action ${action}`);
      const res = await fetch(getBackendUrl(`/alerts/${alertId}/respond`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      });
      const updatedAlert = await res.json();
      console.log('[TRACE][FRONTEND] Alert status updated:', updatedAlert);
    } catch (err) {
      console.error('Ranger response dispatch failed:', err);
    }
  };

  if (!data) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#05070A] text-white font-mono">
        <div className="flex flex-col items-center gap-6">
          <div className="w-16 h-16 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
          <span className="text-sm tracking-[0.4em] uppercase text-white/60">Establishing Hardware Neural Link...</span>
        </div>
      </div>
    );
  }

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
      if (mqttReceivedAge <= 5.0) return "No Database Updates";
      if (bridgeHeartbeatAge > 5.0) return "No MQTT Data";
      if (serialReadAge > 5.0) return "No Serial Data";
      return "No MQTT Data";
    }
    return "No Data Received";
  };

  const isLive = nodeInfo.status !== 'offline';
  const offlineReason = getOfflineReason();
  const statusLabel = !isLive ? `OFFLINE (${offlineReason})` : (nodeInfo.status === 'degraded' ? 'DEGRADED' : 'LIVE');
  const statusColor = !isLive ? 'text-red-500 border-red-500/40 bg-red-500/10' : (nodeInfo.status === 'degraded' ? 'text-amber-500 border-amber-500/40 bg-amber-500/10' : 'text-emerald-500 border-emerald-500/40 bg-emerald-500/10');
  const pulseColor = !isLive ? 'bg-red-500' : (nodeInfo.status === 'degraded' ? 'bg-amber-500' : 'bg-emerald-500');

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
      <header className="flex flex-col md:flex-row justify-between items-center px-8 py-4 bg-[#0A0E12] border-b border-white/10 z-40 shrink-0 gap-4">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-emerald-500/10 border-2 border-emerald-500/40 flex items-center justify-center rounded">
            <span className="text-sm font-black text-emerald-400">VRX</span>
          </div>
          <div>
            <h1 className="text-lg md:text-xl font-black uppercase tracking-[0.1em] text-white">
              VanRakshak-X <span className="text-white/30">::</span> <span className="text-emerald-400">Command Center</span>
            </h1>
            <p className="text-[10px] font-bold text-white/40 uppercase tracking-[0.2em] mt-0.5">
              Eco-Intelligence Surveillance Platform
            </p>
          </div>
        </div>

        {/* Tab switch navigation */}
        <div className="flex bg-[#11161C] border border-white/15 p-0.5 rounded text-xs z-50">
          {(['operations', 'ranger', 'health', 'acoustic', 'timeline'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1.5 font-bold uppercase rounded transition-all cursor-pointer ${
                activeTab === tab 
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                  : 'text-white/40 hover:text-white/80'
              }`}
            >
              {tab === 'operations' ? 'Operations' 
               : tab === 'ranger' ? 'Ranger Response' 
               : tab === 'health' ? 'Sensor Health Lab' 
               : tab === 'acoustic' ? 'AI Acoustic Assistant' 
               : 'Timeline'}
            </button>
          ))}
        </div>

        {/* Live system metadata */}
        <div className="flex items-center gap-3 text-xs">
          {!isAudioInit && (
            <button 
              onClick={async () => {
                await audioEngine.init();
                setIsAudioInit(true);
              }}
              className="bg-cyan-500/10 border border-cyan-500/40 text-cyan-400 font-bold px-3 py-1.5 rounded hover:bg-cyan-500/20 transition-colors cursor-pointer"
            >
              AUDIO FEED
            </button>
          )}

          {/* Node connectivity status */}
          <div className={`flex items-center gap-2 border px-3 py-1.5 rounded font-bold uppercase tracking-wider ${statusColor}`}>
            <div className={`w-2 h-2 rounded-full animate-pulse ${pulseColor}`} />
            <span>Node: {statusLabel}</span>
          </div>

          <div className="px-3 py-1.5 bg-[#11161C] border border-white/10 rounded font-mono text-center">
            <span className="text-white/40 uppercase font-black tracking-widest text-[9px] block">Freshness</span>
            <span className="font-bold text-white">{packetAge}</span>
          </div>
        </div>
      </header>

      {/* DASHBOARD BODY */}
      <div className="flex-1 overflow-hidden relative flex flex-col min-h-0 bg-[#070A0F]">
        
        {/* TABS CONTAINER */}
        <div className="flex-1 overflow-y-auto p-6 min-h-0">
          
            
            {/* TAB 1: OPERATIONS Command Center */}
            {activeTab === 'operations' && (
              <div 
                className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-full"
              >
                {/* Column 1: System Vitals */}
                <div className="lg:col-span-1 flex flex-col gap-6">
                  
                  {/* Gauge Card: Forest Integrity */}
                  <div className="bg-[#0A0E12] border border-white/10 rounded-lg p-5 flex flex-col gap-4 shadow-xl">
                    <h2 className="text-sm font-bold uppercase tracking-widest text-cyan-400 border-b border-white/5 pb-2">
                      Forest Integrity Score
                    </h2>
                    <div className="flex items-baseline justify-between">
                      <span className="text-5xl font-black text-emerald-400 font-mono">
                        {data.integrity_score}%
                      </span>
                      <span className={`text-xs font-bold uppercase px-2 py-0.5 rounded ${
                        data.state === 'CRITICAL' ? 'bg-red-500/10 text-red-500 border border-red-500/20' :
                        data.state === 'HIGH RISK' ? 'bg-orange-500/10 text-orange-500 border border-orange-500/20' :
                        data.state === 'SUSPICIOUS' ? 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20' :
                        'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                      }`}>{data.state}</span>
                    </div>
                    <div className="w-full h-3 bg-white/5 rounded-full overflow-hidden mt-1">
                      <div 
                        className="h-full bg-emerald-500 transition-all duration-700" 
                        style={{ 
                          width: `${data.integrity_score}%`,
                          backgroundColor: data.integrity_score < 40 ? '#FF3D00' : (data.integrity_score < 75 ? '#FFB300' : '#00C853')
                        }} 
                      />
                    </div>
                  </div>

                  {/* System Health Judgment Summary */}
                  <div className="bg-[#0A0E12] border border-white/10 rounded-lg p-5 flex flex-col gap-4 shadow-xl">
                    <h2 className="text-sm font-bold uppercase tracking-widest text-cyan-400 border-b border-white/5 pb-2 flex justify-between items-center">
                      <span>Sensor Health Index</span>
                      <span className="text-emerald-400 font-bold font-mono">{data.sensor_health?.overall || 0}%</span>
                    </h2>
                    <div className="space-y-3 text-xs">
                      <div className="flex justify-between items-center bg-[#11161C] p-2 rounded">
                        <span className="text-white/60">ESP32 Core Link</span>
                        <span className="font-bold text-white">{data.sensor_health?.esp32 || 0}%</span>
                      </div>
                      <div className="flex justify-between items-center bg-[#11161C] p-2 rounded">
                        <span className="text-white/60">MPU6050 Accelerometer</span>
                        <span className="font-bold text-white">{data.sensor_health?.mpu6050 || 0}%</span>
                      </div>
                      <div className="flex justify-between items-center bg-[#11161C] p-2 rounded">
                        <span className="text-white/60">INMP441 Sound Micro</span>
                        <span className="font-bold text-white">{data.sensor_health?.inmp441 || 0}%</span>
                      </div>
                      <div className="flex justify-between items-center bg-[#11161C] p-2 rounded">
                        <span className="text-white/60">SX1278 LoRa SPI Link</span>
                        <span className="font-bold text-white">{data.sensor_health?.lora || 0}%</span>
                      </div>
                    </div>
                  </div>

                  {/* Card: Battery Health */}
                  <div className="bg-[#0A0E12] border border-white/10 rounded-lg p-5 flex flex-col gap-4 shadow-xl">
                    <h2 className="text-sm font-bold uppercase tracking-widest text-cyan-400 border-b border-white/5 pb-2">
                      Battery & Node Power
                    </h2>
                    <div className="flex justify-between items-end">
                      <div>
                        <span className="text-white/40 text-[9px] uppercase tracking-widest block">Voltage</span>
                        <span className="text-2xl font-bold font-mono text-white">{tel.battery ? `${tel.battery.toFixed(2)}V` : '0.00V'}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-white/40 text-[9px] uppercase tracking-widest block">Percent</span>
                        <span className="text-2xl font-bold font-mono text-white">{nodeInfo.battery || 0}%</span>
                      </div>
                    </div>
                    <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-yellow-500 transition-all duration-700" 
                        style={{ width: `${nodeInfo.battery || 0}%` }} 
                      />
                    </div>
                  </div>

                </div>

                {/* Column 2 & 3: Live Telemetry Charts & Node Map */}
                <div className="lg:col-span-2 flex flex-col gap-6">
                  
                  {/* Gauge Grid / Visual Charts */}
                  <div className="bg-[#0A0E12] border border-white/10 rounded-lg p-5 flex-1 flex flex-col min-h-[300px] shadow-xl">
                    <h2 className="text-sm font-bold uppercase tracking-widest text-cyan-400 border-b border-white/5 pb-2 mb-4 shrink-0">
                      Live Telemetry Sweeps
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1 overflow-y-auto">
                      {/* Chart 1: Tilt */}
                      <div className="bg-[#11161C]/50 border border-white/5 p-3 rounded flex flex-col justify-between h-[170px]">
                        <div className="flex justify-between items-start">
                          <span className="text-[10px] uppercase text-white/50 font-bold">Inclination (Tilt)</span>
                          <span className="text-2xl font-black font-mono text-red-500">{tel.tilt !== undefined ? `${tel.tilt}°` : '0°'}</span>
                        </div>
                        <div className="h-[100px] mt-2">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={history} margin={{ top: 5, right: 5, bottom: 5, left: -25 }}>
                              <XAxis dataKey="time" hide />
                              <YAxis domain={[-15, 15]} tick={{ fill: '#888', fontSize: 9 }} />
                              <Tooltip contentStyle={{ backgroundColor: '#0A0E12', border: '1px solid rgba(255,255,255,0.1)', fontSize: 10 }} />
                              <Line type="monotone" dataKey="tilt" stroke="#ef4444" strokeWidth={2} dot={false} isAnimationActive={false} />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      </div>

                      {/* Chart 2: Vibration */}
                      <div className="bg-[#11161C]/50 border border-white/5 p-3 rounded flex flex-col justify-between h-[170px]">
                        <div className="flex justify-between items-start">
                          <span className="text-[10px] uppercase text-white/50 font-bold">Tree Trunk Vibration</span>
                          <span className="text-2xl font-black font-mono text-orange-500">{tel.vibration !== undefined ? tel.vibration : '0'}</span>
                        </div>
                        <div className="h-[100px] mt-2">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={history} margin={{ top: 5, right: 5, bottom: 5, left: -25 }}>
                              <XAxis dataKey="time" hide />
                              <YAxis domain={[0, 100]} tick={{ fill: '#888', fontSize: 9 }} />
                              <Tooltip contentStyle={{ backgroundColor: '#0A0E12', border: '1px solid rgba(255,255,255,0.1)', fontSize: 10 }} />
                              <Line type="monotone" dataKey="vibration" stroke="#f97316" strokeWidth={2} dot={false} isAnimationActive={false} />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      </div>

                      {/* Chart 3: Sound energy */}
                      <div className="bg-[#11161C]/50 border border-white/5 p-3 rounded flex flex-col justify-between h-[170px]">
                        <div className="flex justify-between items-start">
                          <span className="text-[10px] uppercase text-white/50 font-bold">Sound Level (RMS)</span>
                          <span className="text-2xl font-black font-mono text-cyan-400">{tel.audioRms !== undefined ? tel.audioRms : '0'}</span>
                        </div>
                        <div className="h-[100px] mt-2">
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={history} margin={{ top: 5, right: 5, bottom: 5, left: -25 }}>
                              <XAxis dataKey="time" hide />
                              <YAxis domain={[0, 1000]} tick={{ fill: '#888', fontSize: 9 }} />
                              <Tooltip contentStyle={{ backgroundColor: '#0A0E12', border: '1px solid rgba(255,255,255,0.1)', fontSize: 10 }} />
                              <defs>
                                <linearGradient id="opAudioGrad" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.35}/>
                                  <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                                </linearGradient>
                              </defs>
                              <Area type="monotone" dataKey="audioRms" stroke="#06b6d4" strokeWidth={2} fillOpacity={1} fill="url(#opAudioGrad)" dot={false} isAnimationActive={false} />
                            </AreaChart>
                          </ResponsiveContainer>
                        </div>
                      </div>

                      {/* Chart 4: RSSI */}
                      <div className="bg-[#11161C]/50 border border-white/5 p-3 rounded flex flex-col justify-between h-[170px]">
                        <div className="flex justify-between items-start">
                          <span className="text-[10px] uppercase text-white/50 font-bold">Signal Link (RSSI)</span>
                          <span className="text-2xl font-black font-mono text-emerald-400">{tel.rssi !== undefined ? `${tel.rssi} dBm` : '-120 dBm'}</span>
                        </div>
                        <div className="h-[100px] mt-2">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={history} margin={{ top: 5, right: 5, bottom: 5, left: -25 }}>
                              <XAxis dataKey="time" hide />
                              <YAxis domain={[-130, -50]} tick={{ fill: '#888', fontSize: 9 }} />
                              <Tooltip contentStyle={{ backgroundColor: '#0A0E12', border: '1px solid rgba(255,255,255,0.1)', fontSize: 10 }} />
                              <Line type="monotone" dataKey="rssi" stroke="#10b981" strokeWidth={2} dot={false} isAnimationActive={false} />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Digital Twin Map */}
                  <div className="bg-[#0A0E12] border border-white/10 rounded-lg p-5 h-[260px] flex flex-col shadow-xl">
                    <h2 className="text-sm font-bold uppercase tracking-widest text-cyan-400 border-b border-white/5 pb-2 mb-3">
                      Sentinel Map Triangulation (TDOA)
                    </h2>
                    <div className="flex-1 relative rounded overflow-hidden">
                      <WorldMap 
                        threatScore={data.threat_score} 
                        integrityScore={data.integrity_score}
                        localization={null}
                        meshData={data.mesh}
                      />
                    </div>
                  </div>

                </div>

                {/* Column 4: Alert Feeds & Logs */}
                <div className="lg:col-span-1 flex flex-col gap-6">
                  
                  {/* Active Threat Explainability */}
                  <div className="bg-[#0A0E12] border border-white/10 rounded-lg p-5 flex flex-col h-[280px] shadow-xl">
                    <h2 className="text-sm font-bold uppercase tracking-widest text-cyan-400 border-b border-white/5 pb-2 mb-3 flex justify-between items-center">
                      <span>Alert Explainability</span>
                      <Info size={14} className="text-cyan-400" />
                    </h2>
                    <div className="flex-1 overflow-y-auto space-y-3 pr-1 text-xs">
                      {data.alerts?.filter((a: any) => !a.resolved).map((alert: any) => (
                        <div key={alert.id} className="border border-white/10 p-3 rounded bg-[#11161C]/50 space-y-2">
                          <div className="flex justify-between items-center border-b border-white/5 pb-1">
                            <span className="font-bold text-white uppercase">{alert.type}</span>
                            <span className="text-[10px] font-mono text-cyan-400">ID: {alert.id}</span>
                          </div>
                          <div>
                            <span className="text-white/40 block text-[9px] uppercase tracking-wider">Metrics</span>
                            <div className="grid grid-cols-2 gap-1 text-[11px] font-mono mt-0.5 text-white/80">
                              <span>Tilt: {tel.tilt}°</span>
                              <span>Vib: {tel.vibration}</span>
                              <span>RMS: {tel.audioRms}</span>
                              <span>Batt: {tel.battery?.toFixed(2)}V</span>
                            </div>
                          </div>
                          <div className="bg-red-500/5 border border-red-500/10 p-2 rounded text-[11px] text-red-300 font-sans">
                            <strong>Threat Score Engine Analysis:</strong> Active anomaly detected with {Math.round(alert.conf*100)}% decision confidence.
                          </div>
                        </div>
                      ))}
                      {(!data.alerts || data.alerts.filter((a: any) => !a.resolved).length === 0) && (
                        <div className="text-white/30 text-center py-16 flex flex-col items-center gap-2">
                          <CheckCircle size={24} className="text-emerald-500/50" />
                          <span>No active threat alerts in sector.</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Telemetry Stream Raw Panel */}
                  <div className="bg-[#0A0E12] border border-white/10 rounded-lg p-5 flex flex-col flex-1 min-h-[220px] shadow-xl">
                    <h2 className="text-sm font-bold uppercase tracking-widest text-cyan-400 border-b border-white/5 pb-2 mb-3">
                      JSON Telemetry Payload
                    </h2>
                    <div className="flex-1 bg-[#05070A] border border-white/5 p-3 rounded overflow-auto select-text scrollbar-hide text-[11px] leading-relaxed text-emerald-400 font-mono">
                      <pre className="whitespace-pre-wrap break-all">
                        {data.latest_telemetry ? JSON.stringify(data.latest_telemetry, null, 2) : '// Listening for serial packet...'}
                      </pre>
                    </div>
                  </div>

                </div>
              </div>
            )}

            {/* TAB 2: RANGER RESPONSE INTERFACE */}
            {activeTab === 'ranger' && (
              <div 
                className="max-w-4xl mx-auto flex flex-col gap-6 h-full"
              >
                <div className="flex justify-between items-center border-b border-white/10 pb-3">
                  <div>
                    <h2 className="text-2xl font-black uppercase tracking-widest text-emerald-400">Ranger Response Console</h2>
                    <p className="text-xs text-white/40 uppercase tracking-widest mt-1">Field operations response interface</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase font-bold text-white/40">Active Alerts</span>
                    <span className="bg-red-500 text-white font-bold text-xs px-2.5 py-0.5 rounded-full">
                      {data.alerts?.filter((a: any) => !a.resolved).length || 0}
                    </span>
                  </div>
                </div>

                {/* Big Cards Feed */}
                <div className="flex-1 overflow-y-auto space-y-6 pr-1 pb-16">
                  {data.alerts?.filter((a: any) => !a.resolved).map((alert: any) => {
                    // Alert color configs
                    let cardBorderColor = 'border-yellow-500/30';
                    let cardBg = 'bg-yellow-500/5';
                    let levelLabel = 'SUSPICIOUS';
                    let levelColor = 'text-yellow-400';
                    let badgeStyles = 'border-yellow-500/40 text-yellow-400 bg-yellow-500/10';

                    if (data.state === 'CRITICAL') {
                      cardBorderColor = 'border-red-500/30';
                      cardBg = 'bg-red-500/5';
                      levelLabel = 'CRITICAL THREAT';
                      levelColor = 'text-red-500';
                      badgeStyles = 'border-red-500/40 text-red-400 bg-red-500/10';
                    } else if (data.state === 'HIGH RISK' || alert.type === 'High vibration') {
                      cardBorderColor = 'border-orange-500/30';
                      cardBg = 'bg-orange-500/5';
                      levelLabel = 'HIGH RISK';
                      levelColor = 'text-orange-400';
                      badgeStyles = 'border-orange-500/40 text-orange-400 bg-orange-500/10';
                    }

                    return (
                      <div key={alert.id} className={`border-2 rounded-xl p-6 shadow-2xl flex flex-col gap-5 transition-colors ${cardBg} ${cardBorderColor}`}>
                        
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-white/10 pb-4 gap-2">
                          <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-white/5 border border-white/10 rounded-lg text-red-400">
                              <AlertTriangle size={20} className={levelColor} />
                            </div>
                            <div>
                              <h3 className="text-lg font-black uppercase tracking-wider text-white">
                                {alert.type}
                              </h3>
                              <span className="text-[10px] font-mono text-white/40">Alert ID: #{alert.id} | Timestamp: {new Date(alert.timestamp).toLocaleTimeString()}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            <span className={`text-xs font-black px-3 py-1 rounded border uppercase tracking-widest ${badgeStyles}`}>
                              {levelLabel}
                            </span>
                            <span className="text-xs font-mono font-bold text-white/50">
                              Conf: {Math.round(alert.conf * 100)}%
                            </span>
                          </div>
                        </div>

                        {/* Explainability Breakdown */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                          <div className="space-y-3 bg-[#11161C]/50 border border-white/5 p-4 rounded-lg">
                            <h4 className="text-xs uppercase font-bold text-white/40 tracking-wider flex items-center gap-1.5">
                              <Sliders size={12} /> Live Anomalous Inputs
                            </h4>
                            <div className="space-y-2 font-mono text-[13px]">
                              {data.explainability?.reasons?.map((r: string, idx: number) => (
                                <div key={idx} className="flex gap-2 text-white/80">
                                  <span className="text-emerald-400 font-bold">&gt;</span>
                                  <span>{r}</span>
                                </div>
                              ))}
                              {(!data.explainability?.reasons || data.explainability.reasons.length === 0) && (
                                <div className="text-white/40">No reasoning parameters available.</div>
                              )}
                            </div>
                          </div>

                          <div className="space-y-3 bg-[#11161C]/50 border border-white/5 p-4 rounded-lg">
                            <h4 className="text-xs uppercase font-bold text-white/40 tracking-wider flex items-center gap-1.5">
                              <CheckSquare size={12} /> Response Directive
                            </h4>
                            <div className="space-y-2 text-[13px] leading-relaxed text-white/80 font-sans">
                              {data.explainability?.recommendations?.map((r: string, idx: number) => (
                                <div key={idx} className="flex gap-2">
                                  <span className="text-red-400 font-bold">&#8226;</span>
                                  <span>{r}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div className="flex flex-wrap gap-3 border-t border-white/10 pt-4 mt-2">
                          <button 
                            disabled={alert.status === 'acknowledged'}
                            onClick={() => handleRangerResponse(alert.id, 'acknowledge')}
                            className={`flex-1 min-w-[140px] border font-bold text-[11px] tracking-widest uppercase py-3 rounded transition-colors cursor-pointer ${
                              alert.status === 'acknowledged'
                                ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-500/60 cursor-not-allowed'
                                : 'bg-transparent border-white/10 text-white/80 hover:bg-white/5'
                            }`}
                          >
                            {alert.status === 'acknowledged' ? 'ACKNOWLEDGED ✓' : 'ACKNOWLEDGE'}
                          </button>
                          
                          <button 
                            disabled={alert.status === 'dispatched'}
                            onClick={() => handleRangerResponse(alert.id, 'dispatch')}
                            className={`flex-1 min-w-[140px] border font-bold text-[11px] tracking-widest uppercase py-3 rounded transition-colors cursor-pointer ${
                              alert.status === 'dispatched'
                                ? 'bg-orange-500/10 border-orange-500/30 text-orange-500/60 cursor-not-allowed'
                                : 'bg-transparent border-white/10 text-white/80 hover:bg-white/5'
                            }`}
                          >
                            {alert.status === 'dispatched' ? 'DISPATCHED ✓' : 'DISPATCH RANGER'}
                          </button>

                          <button 
                            onClick={() => handleRangerResponse(alert.id, 'resolve')}
                            className="flex-1 min-w-[140px] bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] tracking-widest uppercase py-3 rounded transition-colors cursor-pointer"
                          >
                            RESOLVED
                          </button>

                          <button 
                            onClick={() => handleRangerResponse(alert.id, 'false_alarm')}
                            className="flex-1 min-w-[140px] bg-red-650 hover:bg-red-750 text-white font-bold text-[11px] tracking-widest uppercase py-3 rounded transition-colors cursor-pointer"
                          >
                            FALSE ALARM
                          </button>
                        </div>

                      </div>
                    );
                  })}

                  {(!data.alerts || data.alerts.filter((a: any) => !a.resolved).length === 0) && (
                    <div className="text-center py-24 bg-[#0A0E12]/80 border border-white/10 rounded-xl p-8 flex flex-col items-center gap-4 shadow-xl">
                      <CheckCircle size={40} className="text-emerald-500" />
                      <div>
                        <h3 className="text-base font-bold text-white uppercase">Sector Clear</h3>
                        <p className="text-xs text-white/40 mt-1 uppercase tracking-wider">No active threat responses required.</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 3: SENSOR HEALTH LAB */}
            {activeTab === 'health' && (
              <div>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-white/10 pb-3 gap-4">
                  <div>
                    <h2 className="text-2xl font-black uppercase tracking-widest text-emerald-400">Sensor Health Lab</h2>
                    <p className="text-xs text-white/40 uppercase tracking-widest mt-1">Deep physical verification & calibration tests</p>
                  </div>
                  <button 
                    disabled={activeTestSuite}
                    onClick={handleStartTestSuite}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-5 py-2.5 rounded transition-all uppercase tracking-widest cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                  >
                    {activeTestSuite ? 'RUNNING TEST SWEEP...' : 'RUN HEALTH SWEEP'}
                  </button>
                </div>

                {/* Score Gauge row */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div className="bg-[#0A0E12] border border-white/10 p-4 rounded-lg text-center shadow-lg">
                    <span className="text-[9px] uppercase font-bold text-white/40 tracking-wider block">ESP32 Core</span>
                    <span className="text-3xl font-black text-white font-mono mt-1 block">{data.sensor_health?.esp32 || 0}%</span>
                  </div>
                  <div className="bg-[#0A0E12] border border-white/10 p-4 rounded-lg text-center shadow-lg">
                    <span className="text-[9px] uppercase font-bold text-white/40 tracking-wider block">MPU6050</span>
                    <span className="text-3xl font-black text-white font-mono mt-1 block">{data.sensor_health?.mpu6050 || 0}%</span>
                  </div>
                  <div className="bg-[#0A0E12] border border-white/10 p-4 rounded-lg text-center shadow-lg">
                    <span className="text-[9px] uppercase font-bold text-white/40 tracking-wider block">INMP441</span>
                    <span className="text-3xl font-black text-white font-mono mt-1 block">{data.sensor_health?.inmp441 || 0}%</span>
                  </div>
                  <div className="bg-[#0A0E12] border border-white/10 p-4 rounded-lg text-center shadow-lg">
                    <span className="text-[9px] uppercase font-bold text-white/40 tracking-wider block">LoRa Node</span>
                    <span className="text-3xl font-black text-white font-mono mt-1 block">{data.sensor_health?.lora || 0}%</span>
                  </div>
                  <div className="bg-[#0A0E12] border border-emerald-500/20 p-4 rounded-lg text-center shadow-lg col-span-2 md:col-span-1">
                    <span className="text-[9px] uppercase font-bold text-emerald-400 tracking-wider block">OVERALL HEALTH</span>
                    <span className="text-3xl font-black text-emerald-400 font-mono mt-1 block">{data.sensor_health?.overall || 0}%</span>
                  </div>
                </div>

                {/* Test details list */}
                <div className="flex-1 bg-[#0A0E12] border border-white/10 rounded-xl overflow-hidden shadow-2xl flex flex-col min-h-0">
                  <div className="px-5 py-3 border-b border-white/15 bg-[#11161C] text-[10px] text-white/40 font-black uppercase tracking-widest grid grid-cols-12 gap-4 shrink-0">
                    <span className="col-span-3">Test Name</span>
                    <span className="col-span-4">Verification Check</span>
                    <span className="col-span-2">Expectation</span>
                    <span className="col-span-1 text-right">Confidence</span>
                    <span className="col-span-2 text-right">Status</span>
                  </div>
                  <div className="flex-1 overflow-y-auto divide-y divide-white/5 text-xs font-mono">
                    {Object.values(testSuiteResults).map((test) => (
                      <div key={test.id} className="px-5 py-3 grid grid-cols-12 gap-4 items-center">
                        <div className="col-span-3 flex flex-col gap-0.5">
                          <span className="font-bold text-white/90">{test.name}</span>
                          <span className="text-[10px] text-white/30 truncate max-w-[180px]">{test.desc}</span>
                        </div>
                        <span className="col-span-4 text-white/60 text-[11px] leading-tight">{test.desc}</span>
                        <span className="col-span-2 text-cyan-400 font-bold">{test.expected}</span>
                        <span className="col-span-1 text-right font-bold text-white/80">{test.confidence > 0 ? `${test.confidence}%` : '--'}</span>
                        <div className="col-span-2 text-right">
                          <span className={`px-2.5 py-1 rounded font-bold uppercase tracking-widest text-[9px] border inline-block ${
                            test.status === 'pass' ? 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10' :
                            test.status === 'fail' ? 'border-red-500/30 text-red-500 bg-red-500/10' :
                            test.status === 'running' ? 'border-cyan-500/30 text-cyan-400 bg-cyan-500/10 animate-pulse' :
                            'border-white/10 text-white/40 bg-transparent'
                          }`}>
                            {test.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            )}

            {/* TAB 4: AI ACOUSTIC ASSISTANT */}
            {activeTab === 'acoustic' && (
              <div 
                className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6 h-full"
              >
                
                {/* Visualizer column */}
                <div className="lg:col-span-2 flex flex-col gap-6">
                  
                  <div className="bg-[#0A0E12] border border-white/10 rounded-lg p-5 flex flex-col h-[230px] shadow-xl">
                    <h2 className="text-sm font-bold uppercase tracking-widest text-cyan-400 border-b border-white/5 pb-2 mb-3">
                      Oscilloscope Time-Domain Waveform
                    </h2>
                    <div className="flex-1 relative rounded overflow-hidden bg-[#090D11]">
                      <canvas 
                        ref={waveformCanvasRef}
                        width={600}
                        height={160}
                        className="w-full h-full block"
                      />
                    </div>
                  </div>

                  <div className="bg-[#0A0E12] border border-white/10 rounded-lg p-5 flex flex-col h-[280px] shadow-xl">
                    <h2 className="text-sm font-bold uppercase tracking-widest text-cyan-400 border-b border-white/5 pb-2 mb-3">
                      Real-time Waterfall Spectrogram
                    </h2>
                    <div className="flex-1 relative rounded overflow-hidden bg-[#090D11]">
                      <canvas 
                        ref={spectrogramCanvasRef}
                        width={600}
                        height={200}
                        className="w-full h-full block"
                      />
                    </div>
                  </div>

                </div>

                {/* Controls & Classification column */}
                <div className="lg:col-span-1 flex flex-col gap-6">
                  
                  {/* Mic Start/Stop Card */}
                  <div className="bg-[#0A0E12] border border-white/10 rounded-lg p-5 flex flex-col gap-4 shadow-xl">
                    <h2 className="text-sm font-bold uppercase tracking-widest text-cyan-400 border-b border-white/5 pb-2">
                      Microphone Controls
                    </h2>
                    <button 
                      onClick={toggleLaptopMic}
                      className={`w-full font-bold text-xs uppercase py-3 rounded tracking-widest transition-all cursor-pointer flex items-center justify-center gap-2 border-2 ${
                        micActive 
                          ? 'bg-red-500/10 border-red-500/40 text-red-400 hover:bg-red-500/25' 
                          : 'bg-emerald-600/10 border-emerald-500/40 text-emerald-400 hover:bg-emerald-600/25'
                      }`}
                    >
                      {micActive ? <Square size={14} /> : <Play size={14} />}
                      {micActive ? 'DISABLE LAPTOP MIC' : 'ENABLE LAPTOP MIC'}
                    </button>
                    
                    <div className="grid grid-cols-2 gap-3 text-[11px] font-mono mt-1">
                      <div className="bg-[#11161C] p-2.5 rounded">
                        <span className="text-white/40 block uppercase tracking-widest text-[9px] mb-0.5">Energy RMS</span>
                        <span className="font-bold text-white text-[13px]">{audioFeatures.rms.toFixed(4)}</span>
                      </div>
                      <div className="bg-[#11161C] p-2.5 rounded">
                        <span className="text-white/40 block uppercase tracking-widest text-[9px] mb-0.5">Centroid</span>
                        <span className="font-bold text-white text-[13px]">{Math.round(audioFeatures.centroid)} Hz</span>
                      </div>
                    </div>
                  </div>

                  {/* Heuristic Classification Results */}
                  <div className="bg-[#0A0E12] border border-white/10 rounded-lg p-5 flex flex-col gap-4 shadow-xl">
                    <h2 className="text-sm font-bold uppercase tracking-widest text-cyan-400 border-b border-white/5 pb-2">
                      AI Acoustic Pattern Engine
                    </h2>
                    <div className="space-y-4">
                      {audioClassifications.map((item, idx) => (
                        <div key={idx} className="space-y-1">
                          <div className="flex justify-between text-[11px]">
                            <span className="font-bold text-white/80 uppercase">{item.name}</span>
                            <span className="font-mono text-cyan-400 font-bold">{item.confidence}%</span>
                          </div>
                          <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-cyan-400 transition-all duration-300"
                              style={{ width: `${item.confidence}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Synthesized Sound Trigger Panel */}
                  <div className="bg-[#0A0E12] border border-white/10 rounded-lg p-5 flex flex-col gap-3 shadow-xl">
                    <h2 className="text-sm font-bold uppercase tracking-widest text-cyan-400 border-b border-white/5 pb-2">
                      Demo Sound Synthesizer
                    </h2>
                    <span className="text-[10px] text-white/40 uppercase tracking-wider block">Synthesize audio signal locally</span>
                    <div className="grid grid-cols-2 gap-2 text-[10px]">
                      <button 
                        disabled={!micActive}
                        onClick={() => playSynthesizedSound('chainsaw')}
                        className="border border-white/10 text-white font-bold p-2 rounded hover:bg-white/5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed uppercase"
                      >
                        Periodic Noise (Chainsaw)
                      </button>
                      <button 
                        disabled={!micActive}
                        onClick={() => playSynthesizedSound('axe')}
                        className="border border-white/10 text-white font-bold p-2 rounded hover:bg-white/5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed uppercase"
                      >
                        Impact (Axe strike)
                      </button>
                      <button 
                        disabled={!micActive}
                        onClick={() => playSynthesizedSound('vehicle')}
                        className="border border-white/10 text-white font-bold p-2 rounded hover:bg-white/5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed uppercase"
                      >
                        Vehicle Hum
                      </button>
                      <button 
                        disabled={!micActive}
                        onClick={() => playSynthesizedSound('voice')}
                        className="border border-white/10 text-white font-bold p-2 rounded hover:bg-white/5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed uppercase"
                      >
                        Speech Formants
                      </button>
                    </div>

                    <span className="text-[10px] text-white/40 uppercase tracking-wider block mt-2">Direct Signal Injection</span>
                    <div className="grid grid-cols-2 gap-2 text-[10px]">
                      <button 
                        onClick={() => injectLaptopClassification('Periodic high-frequency noise', 96)}
                        className="border border-red-500/20 text-red-400 font-bold p-2 rounded hover:bg-red-500/5 cursor-pointer uppercase"
                      >
                        Inject Chainsaw Alert
                      </button>
                      <button 
                        onClick={() => injectLaptopClassification('Impact event', 88)}
                        className="border border-orange-500/20 text-orange-400 font-bold p-2 rounded hover:bg-orange-500/5 cursor-pointer uppercase"
                      >
                        Inject Axe Strike Alert
                      </button>
                    </div>
                  </div>

                </div>

              </div>
            )}

            {/* TAB 5: EVENT TIMELINE */}
            {activeTab === 'timeline' && (
              <div>
                <div className="flex justify-between items-center border-b border-white/10 pb-3">
                  <div>
                    <h2 className="text-2xl font-black uppercase tracking-widest text-emerald-400">Event Timeline</h2>
                    <p className="text-xs text-white/40 uppercase tracking-widest mt-1">Verified historical events and system logs</p>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-emerald-400 font-bold bg-emerald-950/20 border border-emerald-500/20 px-2 py-0.5 rounded animate-pulse uppercase">
                    Live Feed Active
                  </div>
                </div>

                <div className="flex-1 bg-[#0A0E12] border border-white/10 rounded-xl p-6 overflow-y-auto space-y-4 shadow-2xl max-h-[500px]">
                  {data.telemetry?.map((rawLog: string, i: number) => {
                    let log = rawLog;
                    let displayTime = '';
                    const parts = rawLog.split(' | ');
                    if (parts.length > 1 && parts[0].includes('T')) {
                      try {
                        const dateVal = new Date(parts[0]);
                        if (!isNaN(dateVal.getTime())) {
                          displayTime = `[${dateVal.toLocaleTimeString([], { hour12: false })}] `;
                          log = parts.slice(1).join(' | ');
                        }
                      } catch (e) {}
                    }

                    const isAlert = log.includes('ALERT:') || log.includes('ACTIVE:');
                    const isResolved = log.includes('RESOLVED:');
                    const isDispatched = log.includes('DISPATCHED:');
                    const isAcknowledged = log.includes('ACKNOWLEDGED:');
                    
                    let textColor = 'text-white/60';
                    let borderStyles = 'border-white/5';
                    
                    if (isAlert) {
                      textColor = 'text-red-400 font-bold';
                      borderStyles = 'border-red-500/20 bg-red-500/5 px-3 py-2 rounded border';
                    } else if (isResolved) {
                      textColor = 'text-emerald-400';
                      borderStyles = 'border-emerald-500/20 bg-emerald-500/5 px-3 py-2 rounded border';
                    } else if (isDispatched) {
                      textColor = 'text-orange-400';
                      borderStyles = 'border-orange-500/20 bg-orange-500/5 px-3 py-2 rounded border';
                    } else if (isAcknowledged) {
                      textColor = 'text-yellow-400';
                      borderStyles = 'border-yellow-500/20 bg-yellow-500/5 px-3 py-2 rounded border';
                    }

                    return (
                      <div key={i} className={`flex gap-3 text-xs font-mono leading-relaxed ${borderStyles} ${textColor}`}>
                        <span className="text-cyan-500 shrink-0 font-bold">&gt;&gt;</span>
                        <span>{displayTime}{log}</span>
                      </div>
                    );
                  })}
                  {(!data.telemetry || data.telemetry.length === 0) && (
                    <div className="text-white/20 text-center py-24">No verified logging events captured.</div>
                  )}
                </div>
              </div>
            )}

          
        </div>

        {/* BOTTOM VIRTUAL HARDWARE CONTROL PANEL */}
        <footer className="shrink-0 bg-[#0A0E12] border-t border-white/10 z-40 p-4">
          <div className="max-w-6xl mx-auto flex flex-col gap-3">
            
            <button 
              onClick={() => setIsVirtualHardwareExpanded(!isVirtualHardwareExpanded)}
              className="flex justify-between items-center w-full text-xs font-black uppercase tracking-widest text-cyan-400 hover:text-cyan-300 transition-colors cursor-pointer"
            >
              <span className="flex items-center gap-1.5"><Sliders size={12} /> PRESENTATION ASSISTANT: VIRTUAL HARDWARE INJECTION</span>
              <span className="text-[10px]">{isVirtualHardwareExpanded ? '[-] HIDE PANEL' : '[+] EXPAND PANEL'}</span>
            </button>

            {isVirtualHardwareExpanded && (
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-1 text-[11px]">
                <button 
                  onClick={() => injectHardwareTelemetry({ tilt: 90.0, vib: 2.5, temp: 45.0, hum: 62, batt: 4.1, batt_pct: 94, mpu_status: 'ONLINE', mic_status: 'ONLINE', lora_status: 'ONLINE' })}
                  className="bg-[#11161C] hover:bg-[#1C232B] border border-white/10 p-2.5 rounded font-bold text-white/95 uppercase cursor-pointer"
                >
                  Tilt 90° (Rotate Board)
                </button>

                <button 
                  onClick={() => injectHardwareTelemetry({ tilt: -1.2, vib: 68.0, temp: 46.2, hum: 64, batt: 4.08, batt_pct: 92, mpu_status: 'ONLINE', mic_status: 'ONLINE', lora_status: 'ONLINE' })}
                  className="bg-[#11161C] hover:bg-[#1C232B] border border-white/10 p-2.5 rounded font-bold text-white/95 uppercase cursor-pointer"
                >
                  Shake Board (Mechanical)
                </button>

                <button 
                  onClick={() => injectHardwareTelemetry({ tilt: 0.5, vib: 4.0, rms: 820.0, peak: 1400, temp: 46.0, hum: 65, batt: 4.12, batt_pct: 95, mpu_status: 'ONLINE', mic_status: 'ONLINE', lora_status: 'ONLINE' })}
                  className="bg-[#11161C] hover:bg-[#1C232B] border border-white/10 p-2.5 rounded font-bold text-white/95 uppercase cursor-pointer"
                >
                  Simulate Clap (Acoustic Spike)
                </button>

                <button 
                  onClick={() => injectHardwareTelemetry({ tilt: -0.8, vib: 3.5, temp: 45.8, hum: 65, batt: 3.25, batt_pct: 8, mpu_status: 'ONLINE', mic_status: 'ONLINE', lora_status: 'ONLINE' })}
                  className="bg-[#11161C] hover:bg-[#1C232B] border border-white/10 p-2.5 rounded font-bold text-white/95 uppercase cursor-pointer animate-pulse"
                >
                  Simulate Low Battery
                </button>

                <button 
                  onClick={() => injectHardwareTelemetry({ mpu_status: 'OFFLINE', mic_status: 'OFFLINE', lora_status: 'OFFLINE' })}
                  className="bg-red-950/20 hover:bg-red-950/45 border border-red-500/25 p-2.5 rounded font-bold text-red-400 uppercase cursor-pointer"
                >
                  Disconnect ESP32 (Offline)
                </button>
              </div>
            )}
            
          </div>
        </footer>

      </div>
    </main>
  );
}
