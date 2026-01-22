/**
 * DataManager - Handles data fetching and processing.
 * Refactored to separate data logic from UI/Map rendering.
 */
class DataManager {
    constructor() {
        // FIX: Use relative path. The browser resolves this automatically.
        // This works for localhost, Docker, and production domains.
        this.apiBaseUrl = '/api'; 
    }

    /**
     * Fetches the list of station measurements from the backend.
     * @returns {Promise<Array>} List of station objects
     */
    async fetchStations() {
        console.log("🌍 Fetching stations from API...");
        try {
            const response = await fetch(`${this.apiBaseUrl}/stations`);
            if (!response.ok) throw new Error('Network response was not ok');
            return await response.json();
        } catch (error) {
            console.error("❌ Error fetching stations:", error);
            return [];
        }
    }

    /**
     * Constructs the GeoServer WMS URL dynamically based on the current host.
     * Uses configuration from API_CONFIG or defaults to port 8080.
     */
    getGeoServerURL() {
        const protocol = window.location.protocol;
        const hostname = window.location.hostname;
        const conf = (window.API_CONFIG && window.API_CONFIG.GEOSERVER) ? window.API_CONFIG.GEOSERVER : { port: 8080, path: '/geoserver/nocturna/wms' };

        // If behind a reverse proxy (like Nginx), this might need adjustment to just '/geoserver/...'
        // For this Docker setup, direct port access is used:
        return `${protocol}//${hostname}:${conf.port}${conf.path}`;
    }

    /**
     * Fetches detailed measurement data for a specific point.
     * @param {number} lat 
     * @param {number} lng 
     */
    async getDataAtPoint(lat, lng) {
        try {
            const response = await fetch(`${this.apiBaseUrl}/measurement?lat=${lat}&lng=${lng}`);
            if (!response.ok) throw new Error('DB Error');
            
            const dbData = await response.json();
            
            // Try to fetch precise elevation, fallback to DB value
            let elevation = dbData.elevation + " m";
            try {
                const elevResp = await fetch(`https://api.open-meteo.com/v1/elevation?latitude=${lat}&longitude=${lng}`);
                const elevJson = await elevResp.json();
                if (elevJson.elevation && elevJson.elevation.length > 0) {
                    elevation = elevJson.elevation[0] + " m";
                }
            } catch(e) {
                // Ignore external API failure
            }

            return {
                light_pollution: {
                    sqm: dbData.sqm,
                    bortle: this.sqmToBortle(dbData.sqm),
                    limiting_mag: dbData.mag,
                    source: "PostGIS Database (Realtime)"
                },
                location: {
                    lat: lat,
                    lng: lng,
                    elevation: elevation,
                    nearest_observation_km: parseFloat(dbData.distance_km).toFixed(2)
                },
                metadata: {
                    date_observed: dbData.date_observed,
                    constellation: dbData.constellation,
                    comment: dbData.comment
                }
            };
        } catch (error) {
            console.error(error);
            return { 
                error: "Database unavailable.",
                location: { lat, lng, elevation: "N/A" }
            };
        }
    }

    /**
     * Utility: Converts SQM brightness to Bortle scale.
     */
    sqmToBortle(sqm) {
        if (!sqm) return "Unknown";
        if (sqm >= 21.99) return "1 (Excellent)";
        if (sqm >= 21.89) return "2 (Typical)";
        if (sqm >= 21.69) return "3 (Rural)";
        if (sqm >= 20.49) return "4 (Rural/Suburban)";
        if (sqm >= 19.50) return "5 (Suburban)";
        if (sqm >= 18.94) return "6 (Bright Suburban)";
        if (sqm >= 18.38) return "7 (Suburban/Urban)";
        if (sqm >= 17.80) return "8 (City)";
        return "9 (Inner City)";
    }

    // Helper to get external tile layers (Configuration only)
    getVIIRSTileUrl() {
        // Updated to use more recent VIIRS Black Marble data instead of 2012
        return 'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/VIIRS_Black_Marble/default/2020-01-01/GoogleMapsCompatible_Level8/{z}/{y}/{x}.jpg';
    }
    
    /**
     * Fetches VIIRS nighttime lights data for a specific point.
     * @param {number} lat 
     * @param {number} lng 
     * @param {number} radius in km (default: 50)
     */
    async fetchVIIRSData(lat, lng, radius = 50) {
        try {
            const response = await fetch(`${this.apiBaseUrl}/viirs-data?lat=${lat}&lng=${lng}&radius=${radius}`);
            if (!response.ok) throw new Error('VIIRS data fetch failed');
            return await response.json();
        } catch (error) {
            console.error("❌ Error fetching VIIRS data:", error);
            return [];
        }
    }
    
    /**
     * Fetches aggregated VIIRS statistics for a polygon area.
     * @param {Object} geometry - GeoJSON geometry object
     */
    async fetchVIIRSStats(geometry) {
        try {
            const response = await fetch(`${this.apiBaseUrl}/viirs-stats`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ geometry })
            });
            if (!response.ok) throw new Error('VIIRS stats fetch failed');
            return await response.json();
        } catch (error) {
            console.error("❌ Error fetching VIIRS stats:", error);
            return {};
        }
    }
}

// Make available globally
window.DataManager = DataManager;