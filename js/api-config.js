// js/api-config.js
const API_CONFIG = {
    // NASA VIIRS Data (CORS-friendly endpoints)
    NASA_VIIRS: {
        tileUrl: 'https://map1.vis.earthdata.nasa.gov/wmts-webmerc/VIIRS_CityLights_2012/default/GoogleMapsCompatible_Level8/{z}/{y}/{x}.jpg',
        apiBase: 'https://api.nasa.gov',
        endpoints: {
            // Use NASA's public API
            fires: '/planetary/earth/imagery',
            naturalEvents: '/EPIC/api/natural'
        },
        apiKey: 'DEMO_KEY' // For demo purposes
    },
    
    // Light Pollution Map (CORS-proxy solution)
    LIGHT_POLLUTION_MAP: {
        baseUrl: 'https://www.lightpollutionmap.info',
        // Use JSON endpoint instead of direct raster
        endpoints: {
            worldAtlas: 'https://www.lightpollutionmap.info/data/wa2015.json',
            viirs: 'https://www.lightpollutionmap.info/data/viirs2015.json'
        }
    },
    
    // OpenSky Network - requires JSONP or server proxy
    OPENSKY_NETWORK: {
        baseUrl: 'https://opensky-network.org/api',
        endpoints: {
            statesAll: '/states/all',
            flights: '/flights/all'
        }
    },
    
    // Weather Data (CORS-friendly)
    OPENMETEO: {
        baseUrl: 'https://api.open-meteo.com/v1',
        endpoints: {
            forecast: '/forecast?latitude={lat}&longitude={lng}&hourly=temperature_2m,cloud_cover&timezone=auto'
        }
    },
    
    // Dark Sky Parks (Use local JSON instead of CSV)
    DARK_SKY_PARKS: {
        jsonUrl: './data/dark-sky-parks.json',
        // Fallback to mock data if file not found
        mockData: true
    },
    
    // Ground Measurements (Use local JSON)
    GROUND_MEASUREMENTS: {
        jsonUrl: './data/ground-measurements.json',
        mockData: true
    }
};

// CORS Proxy function
const CORS_PROXY = 'https://cors-anywhere.herokuapp.com/'; // Or use your own proxy
const LOCAL_PROXY = 'http://localhost:3000/proxy?url='; // For development

// Safe fetch with CORS handling
async function safeFetch(url, options = {}) {
    try {
        // Try direct fetch first
        let response = await fetch(url, options);
        
        // If CORS error, try with proxy
        if (!response.ok || response.type === 'opaque') {
            console.warn(`Direct fetch failed for ${url}, trying CORS proxy...`);
            const proxyUrl = `${CORS_PROXY}${url}`;
            response = await fetch(proxyUrl, options);
        }
        
        return response;
    } catch (error) {
        console.error(`Fetch failed for ${url}:`, error);
        throw error;
    }
}

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.API_CONFIG = API_CONFIG;
    window.safeFetch = safeFetch;
}