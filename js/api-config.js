// js/api-config.js
const API_CONFIG = {
    // NASA VIIRS Data
    NASA_VIIRS: {
        tileUrl: 'https://map1.vis.earthdata.nasa.gov/wmts-webmerc/VIIRS_CityLights_2012/default/GoogleMapsCompatible_Level8/{z}/{y}/{x}.jpg',
        apiBase: 'https://api.nasa.gov'
    },
    
    // Light Pollution Map
    LIGHT_POLLUTION_MAP: {
        baseUrl: 'https://www.lightpollutionmap.info',
        endpoints: {
            worldAtlas: 'https://www.lightpollutionmap.info/data/wa2015.json',
            viirs: 'https://www.lightpollutionmap.info/data/viirs2015.json'
        }
    },
    
    // Dark Sky Parks (REAL DATA ENABLED)
    DARK_SKY_PARKS: {
        jsonUrl: './data/dark-sky-parks.json',
        mockData: false // <--- Enabled real data
    },
    
    // Ground Measurements (REAL DATA ENABLED)
    GROUND_MEASUREMENTS: {
        jsonUrl: './data/ground-measurements.json',
        mockData: false // <--- Enabled real data
    },

    // GeoServer Configuration
    GEOSERVER: {
        port: 8080,
        path: '/geoserver/nocturna/wms'
    }
};

const CORS_PROXY = ''; // Removed public proxy for security - use backend proxy instead

async function safeFetch(url, options = {}) {
    try {
        // First try direct fetch
        let response = await fetch(url, options);
        if (!response.ok || response.type === 'opaque') {
            // If direct fetch fails and we have a proxy URL, try with proxy
            if (CORS_PROXY) {
                const proxyUrl = `${CORS_PROXY}${url}`;
                response = await fetch(proxyUrl, options);
            }
        }
        return response;
    } catch (error) {
        console.error(`Fetch failed for ${url}:`, error);
        throw error;
    }
}

if (typeof window !== 'undefined') {
    window.API_CONFIG = API_CONFIG;
    window.safeFetch = safeFetch;
}