'use client';

import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Points, PointMaterial, Wireframe, Float, Text } from '@react-three/drei';
import * as THREE from 'three';
import { THEME } from '@/lib/design-system';

function TerrainWireframe({ threatScore }: { threatScore: number }) {
  const meshRef = useRef<THREE.Mesh>(null);

  // Generate a simple hilly terrain geometry
  const geometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(20, 20, 40, 40);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const z = Math.sin(x * 0.5) * Math.cos(y * 0.5) * 1.5 + Math.random() * 0.1;
      pos.setZ(i, z);
    }
    geo.computeVertexNormals();
    return geo;
  }, []);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.z += 0.001;
      // Slight "breathing" effect based on threat
      const scale = 1 + Math.sin(state.clock.elapsedTime * 0.5) * (0.02 * threatScore);
      meshRef.current.scale.set(scale, scale, scale);
    }
  });

  return (
    <mesh ref={meshRef} geometry={geometry} rotation={[-Math.PI / 2.5, 0, 0]}>
      <meshBasicMaterial 
        color={threatScore > 0.7 ? THEME.colors.semantic.threat : THEME.colors.semantic.ecological} 
        wireframe 
        transparent 
        opacity={0.15} 
      />
    </mesh>
  );
}

function NodePulses({ count = 20 }) {
  const points = useMemo(() => {
    const p = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      p[i * 3] = (Math.random() - 0.5) * 15;
      p[i * 3 + 1] = (Math.random() - 0.5) * 15;
      p[i * 3 + 2] = Math.random() * 2;
    }
    return p;
  }, [count]);

  return (
    <Points positions={points}>
      <PointMaterial
        transparent
        color={THEME.colors.semantic.infrastructure}
        size={0.15}
        sizeAttenuation={true}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </Points>
  );
}

export default function DigitalTwin({ threatScore }: { threatScore: number }) {
  return (
    <div className="w-full h-full bg-[#05070A]/50 backdrop-blur-sm rounded-lg overflow-hidden border border-white/5">
      <Canvas camera={{ position: [0, 10, 20], fov: 35 }}>
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={1} color={THEME.colors.semantic.infrastructure} />
        
        <Float speed={2} rotationIntensity={0.5} floatIntensity={0.5}>
          <TerrainWireframe threatScore={threatScore} />
          <NodePulses />
        </Float>

        {/* HUD Elements in 3D Space */}
        <Text
          position={[-8, 6, 0]}
          fontSize={0.4}
          color={THEME.colors.text.medium}
          font="/fonts/JetBrainsMono-Bold.ttf"
        >
          BIO-SPATIAL TWIN: PR-04
        </Text>
      </Canvas>
      
      {/* Overlay Scanning Effect */}
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-transparent via-white/5 to-transparent h-1/2 animate-scan" />
      
      <div className="absolute top-4 right-4 text-[10px] font-mono text-white/30 uppercase tracking-[0.2em]">
        Status: {threatScore > 0.7 ? 'UNSTABLE' : 'NOMINAL'}
      </div>
    </div>
  );
}
