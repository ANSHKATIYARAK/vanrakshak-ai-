/**
 * VANRAKSHAK-X DESIGN SYSTEM
 * Style: Military-Industrial Minimalism / Institutional Surveillance
 */

export const THEME = {
  colors: {
    background: {
      primary: '#05070A',
      secondary: '#0A0E12',
      tertiary: '#11161C',
      surface: 'rgba(10, 14, 18, 0.85)',
    },
    semantic: {
      ecological: '#00C853', // Green: Stability
      infrastructure: '#4FC3F7', // Blue: Data / Mesh
      anomaly: '#FFB300', // Amber: Suspicious
      threat: '#FF3D00', // Red: Critical
      dormant: '#455A64', // Gray: Stable/Dormant
    },
    text: {
      high: '#F5F5F5',
      medium: '#90A4AE',
      low: '#455A64',
    },
    border: {
      subtle: 'rgba(255, 255, 255, 0.05)',
      strong: 'rgba(255, 255, 255, 0.15)',
    }
  },
  typography: {
    fontFamily: {
      main: 'Inter, sans-serif',
      mono: 'JetBrains Mono, monospace',
    },
    size: {
      h1: '1.5rem',
      h2: '1rem',
      body: '0.875rem',
      caption: '0.625rem',
      micro: '0.5rem',
    }
  },
  effects: {
    glow: {
      ecological: '0 0 15px rgba(0, 200, 83, 0.2)',
      infrastructure: '0 0 15px rgba(79, 195, 247, 0.2)',
      anomaly: '0 0 15px rgba(255, 179, 0, 0.2)',
      threat: '0 0 20px rgba(255, 61, 0, 0.3)',
    },
    blur: '12px',
  }
};

export const UI_STATES = {
  STABLE: { 
    color: THEME.colors.semantic.ecological, 
    label: 'STABLE', 
    intensity: 0.1 
  },
  ANALYSIS: { 
    color: THEME.colors.semantic.anomaly, 
    label: 'ANALYSIS', 
    intensity: 0.4 
  },
  ESCALATED: { 
    color: '#FF7043', 
    label: 'ESCALATED', 
    intensity: 0.7 
  },
  CRITICAL: { 
    color: THEME.colors.semantic.threat, 
    label: 'CRITICAL', 
    intensity: 1.0 
  },
};
