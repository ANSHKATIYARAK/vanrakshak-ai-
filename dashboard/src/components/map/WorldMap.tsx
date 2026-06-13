'use client';

import React, { useMemo } from 'react';
import Map, { Source, Layer } from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';
import { THEME } from '@/lib/design-system';

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';

interface WorldMapProps {
  threatScore: number;
  integrityScore: number;
  localization: any;
  meshData: any;
}

export default function WorldMap({ threatScore, integrityScore, localization, meshData }: WorldMapProps) {
  const initialViewState = {
    latitude: 24.123,
    longitude: 78.234,
    zoom: 14.5,
    pitch: 60,
    bearing: -20
  };

  // Custom Layer: Surveillance Tint (Greenish-Dark Overlay)
  const surveillanceOverlay: any = {
    id: 'surveillance-tint',
    type: 'background',
    paint: {
      'background-color': '#05070A',
      'background-opacity': 0.4
    }
  };

  // Custom Layer: Threat Heatmap
  const threatHeatmap: any = {
    id: 'threat-diffusion',
    type: 'heatmap',
    source: 'threat-source',
    paint: {
      'heatmap-weight': ['get', 'intensity'],
      'heatmap-intensity': threatScore * 2,
      'heatmap-color': [
        'interpolate',
        ['linear'],
        ['heatmap-density'],
        0, 'rgba(0, 200, 83, 0)',
        0.5, THEME.colors.semantic.anomaly,
        1, THEME.colors.semantic.threat
      ],
      'heatmap-radius': 50,
      'heatmap-opacity': 0.6
    }
  };

  const nodesGeoJSON = useMemo(() => {
    const nodes = meshData?.nodes || [];
    return {
      type: 'FeatureCollection',
      features: nodes.map((node: any) => ({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [node.lng, node.lat]
        },
        properties: {
          id: node.id,
          status: node.status,
          battery: node.battery
        }
      }))
    };
  }, [meshData?.nodes]);

  const meshGeoJSON = useMemo(() => {
    const nodes = meshData?.nodes || [];
    const features: any[] = [];
    
    // Connect each node to neighbors within ~280m threshold (0.0028 degrees approx)
    const threshold = 0.0028;
    for (let i = 0; i < nodes.length; i++) {
      const nodeA = nodes[i];
      for (let j = i + 1; j < nodes.length; j++) {
        const nodeB = nodes[j];
        const dist = Math.sqrt(
          Math.pow(nodeA.lat - nodeB.lat, 2) + Math.pow(nodeA.lng - nodeB.lng, 2)
        );
        if (dist < threshold) {
          features.push({
            type: 'Feature',
            geometry: {
              type: 'LineString',
              coordinates: [
                [nodeA.lng, nodeA.lat],
                [nodeB.lng, nodeB.lat]
              ]
            },
            properties: {
              status: nodeA.status === 'alert' || nodeB.status === 'alert' ? 'alert' : 'active'
            }
          });
        }
      }
    }
    
    return {
      type: 'FeatureCollection',
      features
    };
  }, [meshData?.nodes]);

  return (
    <div className="absolute inset-0 w-full h-full bg-[#05070A]">
      <Map
        initialViewState={initialViewState}
        mapStyle="mapbox://styles/mapbox/satellite-v9"
        mapboxAccessToken={MAPBOX_TOKEN}
        terrain={{ source: 'mapbox-dem', exaggeration: 1.5 }}
        maxPitch={85}
        antialias={true}
      >
        <Source
          id="mapbox-dem"
          type="raster-dem"
          url="mapbox://mapbox.mapbox-terrain-dem-v1"
          tileSize={512}
          maxzoom={14}
        />
        


        {/* Intelligence Overlays */}
        <Layer {...surveillanceOverlay} />

        {/* Localization TDOA Ring */}
        {localization && (
          <Source id="tdoa-source" type="geojson" data={{
            type: 'Feature',
            geometry: {
              type: 'Point',
              coordinates: [localization.lng, localization.lat]
            },
            properties: {}
          } as any}>
            <Layer
              id="tdoa-ring"
              type="circle"
              paint={{
                'circle-radius': localization.radius,
                'circle-color': 'transparent',
                'circle-stroke-width': 2,
                'circle-stroke-color': THEME.colors.semantic.threat,
                'circle-stroke-opacity': [
                  'interpolate',
                  ['linear'],
                  ['zoom'],
                  10, 0.2,
                  15, 0.8
                ]
              }}
            />
            <Layer
              id="tdoa-center"
              type="circle"
              paint={{
                'circle-radius': 4,
                'circle-color': THEME.colors.semantic.threat,
                'circle-blur': 1
              }}
            />
          </Source>
        )}

        {/* Mesh Network Connections (Lines) */}
        <Source id="mesh-lines-source" type="geojson" data={meshGeoJSON as any}>
           <Layer
             id="mesh-lines"
             type="line"
             paint={{
               'line-color': [
                 'match',
                 ['get', 'status'],
                 'alert', THEME.colors.semantic.threat,
                 THEME.colors.semantic.infrastructure
               ],
               'line-width': [
                 'match',
                 ['get', 'status'],
                 'alert', 2.0,
                 1.0
               ],
               'line-opacity': [
                 'match',
                 ['get', 'status'],
                 'alert', 0.6,
                 0.25
               ]
             }}
           />
        </Source>

        {/* Mesh Nodes (Points) */}
        <Source id="mesh-nodes-source" type="geojson" data={nodesGeoJSON as any}>
           {/* Outer pulse layer for alert nodes */}
           <Layer
             id="mesh-nodes-pulse"
             type="circle"
             filter={['==', ['get', 'status'], 'alert']}
             paint={{
               'circle-radius': 12,
               'circle-color': THEME.colors.semantic.threat,
               'circle-opacity': 0.4,
               'circle-blur': 0.8
             }}
           />
           {/* Core node circle */}
           <Layer
             id="mesh-nodes-core"
             type="circle"
             paint={{
               'circle-radius': [
                 'match',
                 ['get', 'status'],
                 'alert', 6,
                 4
               ],
               'circle-color': [
                 'match',
                 ['get', 'status'],
                 'alert', THEME.colors.semantic.threat,
                 THEME.colors.semantic.ecological
               ],
               'circle-stroke-width': 1,
               'circle-stroke-color': '#ffffff',
               'circle-stroke-opacity': 0.5
             }}
           />
        </Source>

      </Map>

      {/* Post-Processing CSS Filters for the 'Institutional' feel */}
      <style jsx global>{`
        .mapboxgl-canvas {
          filter: saturate(0.4) brightness(0.8) contrast(1.1) hue-rotate(10deg);
        }
      `}</style>
    </div>
  );
}
