/**
 * DataManager - Handles data fetching and processing.
 * Browser-safe version.
 */
class DataManager {
    constructor() {
        // Use environment-aware configuration
        this.apiBaseUrl = window.AppConfig ? window.AppConfig.getApiUrl('') : '/api';
    }

    /**
     * Fetches the list of station measurements from the backend.
     * @returns {Promise<Array>} List of station objects
     */
    async fetchStations() {
        console.log("🌍 Fetching stations from API...");
        try {
            const url = window.AppConfig ? 
                window.AppConfig.getApiUrl('stations') : 
                '/api/stations';
            
            const response = await fetch(url);
            if (!response.ok) throw new Error('Network response was not ok');
            return await response.json();
        } catch (error) {
            console.error("❌ Error fetching stations:", error);
            return [];
        }
    }

    /**
     * Fetches detailed measurement data for a specific point.
     * @param {number} lat 
     * @param {number} lng 
     */
    async getDataAtPoint(lat, lng) {
        try {
            const url = window.AppConfig ? 
                window.AppConfig.getApiUrl(`measurement?lat=${lat}&lng=${lng}`) :
                `/api/measurement?lat=${lat}&lng=${lng}`;
            
            const response = await fetch(url);
            if (!response.ok) throw new Error('DB Error');
            
            const dbData = await response.json();
            
            return {
                light_pollution: {
                    sqm: dbData.sqm,
                    bortle: this.sqmToBortle(dbData.sqm),
                    limiting_mag: dbData.mag,
                    source: "Supabase Database"
                },
                location: {
                    lat: lat,
                    lng: lng,
                    elevation: "N/A",
                    nearest_observation_km: parseFloat(dbData.distance_km || 0).toFixed(2)
                },
                metadata: {
                    date_observed: dbData.date_observed,
                    comment: dbData.comment
                }
            };
        } catch (error) {
            console.error(error);
            return { 
                error: "API unavailable.",
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

    // Helper to get external tile layers
    getVIIRSTileUrl() {
        return 'https://map1.vis.earthdata.nasa.gov/wmts-webmerc/VIIRS_CityLights_2012/default/GoogleMapsCompatible_Level8/{z}/{y}/{x}.jpg';
    }
}

// Make available globally
window.DataManager = DataManager;