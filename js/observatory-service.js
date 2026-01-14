// NEW: js/observatory-service.js
class ObservatoryService {
  constructor() {
    this.observatories = this.loadObservatories(); // Load from database/API
  }
  
  loadObservatories() {
    // Real database of observatories with coordinates
    return [
      // Major Research Observatories
      {
        id: 'keck',
        name: 'W. M. Keck Observatory',
        lat: 19.8283,
        lng: -155.4783,
        country: 'USA',
        altitude: 4145,
        established: 1993,
        telescopes: ['Keck I', 'Keck II'],
        type: 'Research',
        primary_use: 'Optical and infrared astronomy',
        sqm: 21.8,
        bortle: 1,
        website: 'https://www.keckobservatory.org/',
        is_dark_sky: true
      },
      {
        id: 'gemini_north',
        name: 'Gemini North Observatory',
        lat: 19.8283,
        lng: -155.4783,
        country: 'USA',
        altitude: 4207,
        established: 1999,
        telescopes: ['Gemini North 8.1m'],
        type: 'Research',
        primary_use: 'Optical and infrared astronomy',
        sqm: 21.8,
        bortle: 1,
        website: 'https://www.gemini.edu/',
        is_dark_sky: true
      },
      {
        id: 'paranal',
        name: 'Paranal Observatory',
        lat: -24.6270,
        lng: -70.4046,
        country: 'Chile',
        altitude: 2635,
        established: 1998,
        telescopes: ['Very Large Telescope (VLT)'],
        type: 'Research',
        primary_use: 'Optical and infrared astronomy',
        sqm: 22.0,
        bortle: 1,
        website: 'https://www.eso.org/public/teles-instr/paranal/',
        is_dark_sky: true
      },
      {
        id: 'la_silla',
        name: 'La Silla Observatory',
        lat: -29.2833,
        lng: -70.7000,
        country: 'Chile',
        altitude: 2400,
        established: 1969,
        telescopes: ['New Technology Telescope', 'Swedish-ESO Submillimetre Telescope'],
        type: 'Research',
        primary_use: 'Optical astronomy',
        sqm: 21.9,
        bortle: 1,
        website: 'https://www.eso.org/public/teles-instr/lasilla/',
        is_dark_sky: true
      },
      {
        id: 'mauna_kea',
        name: 'Mauna Kea Observatories',
        lat: 19.8206,
        lng: -155.4680,
        country: 'USA',
        altitude: 4206,
        established: 1964,
        telescopes: ['CFHT', 'Gemini North', 'Keck', 'Subaru', 'James Clerk Maxwell Telescope'],
        type: 'Research',
        primary_use: 'Multi-wavelength astronomy',
        sqm: 21.8,
        bortle: 1,
        website: 'https://www.ifa.hawaii.edu/mko/home/',
        is_dark_sky: true
      },
      {
        id: 'palomar',
        name: 'Palomar Observatory',
        lat: 33.3563,
        lng: -116.8650,
        country: 'USA',
        altitude: 1706,
        established: 1934,
        telescopes: ['Hale Telescope (200-inch)', 'Samuel Oschin Telescope'],
        type: 'Research',
        primary_use: 'Optical astronomy',
        sqm: 19.5,
        bortle: 4,
        website: 'https://www.palomar.caltech.edu/',
        is_dark_sky: false
      },
      {
        id: 'lowell',
        name: 'Lowell Observatory',
        lat: 35.0961,
        lng: -111.6512,
        country: 'USA',
        altitude: 2198,
        established: 1894,
        telescopes: ['Lone Star Telescope', 'Nelson P. Madura Telescope'],
        type: 'Research',
        primary_use: 'Planetary science, stellar astrophysics',
        sqm: 21.2,
        bortle: 2,
        website: 'https://lowell.edu/',
        is_dark_sky: true
      },
      {
        id: 'griffith',
        name: 'Griffith Observatory',
        lat: 34.1185,
        lng: -118.3004,
        country: 'USA',
        altitude: 308,
        established: 1935,
        telescopes: ['Zeiss telescope'],
        type: 'Public Education',
        primary_use: 'Public education, solar astronomy',
        sqm: 14.2,
        bortle: 9,
        website: 'https://griffithobservatory.org/',
        is_dark_sky: false
      },
      {
        id: 'greenwich',
        name: 'Royal Observatory Greenwich',
        lat: 51.4769,
        lng: -0.0005,
        country: 'UK',
        altitude: 24,
        established: 1675,
        telescopes: ['Great Equatorial Telescope'],
        type: 'Historic',
        primary_use: 'Historic significance, education',
        sqm: 15.8,
        bortle: 8,
        website: 'https://www.rmg.co.uk/royal-observatory',
        is_dark_sky: false
      },
      {
        id: 'sutherland',
        name: 'Sutherland Observatory',
        lat: -32.3853,
        lng: 20.8019,
        country: 'South Africa',
        altitude: 1798,
        established: 1972,
        telescopes: ['Southern African Large Telescope (SALT)'],
        type: 'Research',
        primary_use: 'Optical astronomy',
        sqm: 21.5,
        bortle: 1,
        website: 'https://www.saao.ac.za/sutherland/',
        is_dark_sky: true
      }
    ];
  }
  
  async findNearbyObservatories(lat, lng, radius = 100) {
    // Real database of observatories with coordinates
    const nearby = this.observatories.filter(obs => {
      const distance = this.calculateDistance(lat, lng, obs.lat, obs.lng);
      return distance <= radius;
    });
    
    // Sort by distance
    nearby.sort((a, b) => 
      this.calculateDistance(lat, lng, a.lat, a.lng) -
      this.calculateDistance(lat, lng, b.lat, b.lng)
    );
    
    // Add distance property to each observatory
    return nearby.map(obs => ({
      ...obs,
      distance: this.calculateDistance(lat, lng, obs.lat, obs.lng)
    }));
  }
  
  calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 6371; // Earth radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }
  
  async getAllObservatories() {
    return this.observatories.map(obs => ({
      ...obs,
      distance: 0 // Not relevant when not searching by location
    }));
  }
  
  async getObservatoryById(id) {
    return this.observatories.find(obs => obs.id === id);
  }
  
  async searchObservatories(query) {
    const lowerQuery = query.toLowerCase();
    return this.observatories.filter(obs => 
      obs.name.toLowerCase().includes(lowerQuery) ||
      obs.country.toLowerCase().includes(lowerQuery) ||
      obs.primary_use.toLowerCase().includes(lowerQuery)
    ).map(obs => ({
      ...obs,
      distance: 0 // Not relevant for search
    }));
  }
  
  async getDarkSkyObservatories() {
    return this.observatories.filter(obs => obs.is_dark_sky).map(obs => ({
      ...obs,
      distance: 0
    }));
  }
}

// Make ObservatoryService available globally if not already defined
if (typeof window !== 'undefined' && !window.ObservatoryService) {
  window.ObservatoryService = ObservatoryService;
}

module.exports = ObservatoryService;