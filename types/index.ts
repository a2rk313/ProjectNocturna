// Shared TypeScript types for Project Nocturna

export interface DarkSkySite {
  id: number;
  name: string;
  location: {
    type: 'Point';
    coordinates: [number, number]; // [lon, lat]
  };
  distance_km: number;
  bortle_class: number;
  radiance_nw?: number; // nanoWatts/cm²/sr
}

export interface LightMeasurement {
  id: number;
  location: {
    type: 'Point';
    coordinates: [number, number];
  };
  radiance_nw: number;
  timestamp: string;
  source: 'VIIRS' | 'DMSP' | 'Manual';
}

export interface MapBounds {
  south: number;
  west: number;
  north: number;
  east: number;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: Date;
}
