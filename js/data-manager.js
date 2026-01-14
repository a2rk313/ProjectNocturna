/**
 * DataManager - Handles data fetching and processing.
 * Browser-safe version with enhanced error handling and fallbacks.
 */
class DataManager {
    constructor() {
        // Use environment-aware configuration
        this.apiBaseUrl = window.AppConfig ? window.AppConfig.getApiUrl('') : '/api';
        this.apiConfig = window.APIConfig;
    }

    /**
     * Fetches the list of station measurements from the backend.
     * @returns {Promise<Array>} List of station objects
     */
    async fetchStations() {
        console.log("🌍 Fetching stations from API...");
        try {
            // Use the enhanced API config with fallbacks
            if (this.apiConfig) {
                return await this.apiConfig.fetchWithFallback('stations');
            }
            
            // Fallback to direct fetch if API config is not available
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
            // Use the enhanced API config with fallbacks
            if (this.apiConfig) {
                return await this.apiConfig.fetchWithFallback('measurement', {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });
            }
            
            // Fallback to direct fetch if API config is not available
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
                    source: dbData.source || "Supabase Database"
                },
                location: {
                    lat: lat,
                    lng: lng,
                    elevation: dbData.elevation || "N/A",
                    nearest_observation_km: parseFloat(dbData.distance_km || 0).toFixed(2)
                },
                metadata: {
                    date_observed: dbData.date_observed,
                    comment: dbData.comment,
                    is_research_grade: dbData.is_research_grade || false
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
     * Fetches VIIRS data for a specific area
     */
    async fetchVIIRSData(year = null, month = null, bbox = null) {
        try {
            if (this.apiConfig) {
                const params = {};
                if (year) params.year = year;
                if (month) params.month = month;
                if (bbox) params.bbox = bbox;
                
                return await this.apiConfig.fetchWithFallback('viirs', {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });
            }
            
            // Fallback to direct fetch
            let url = window.AppConfig ? 
                window.AppConfig.getApiUrl('viirs') :
                '/api/viirs';
                
            const params = new URLSearchParams();
            if (year) params.append('year', year);
            if (month) params.append('month', month);
            if (bbox) params.append('bbox', bbox);
            
            if (params.toString()) {
                url += '?' + params.toString();
            }
            
            const response = await fetch(url);
            if (!response.ok) throw new Error('VIIRS API Error');
            return await response.json();
        } catch (error) {
            console.error('❌ Error fetching VIIRS data:', error);
            return null;
        }
    }

    /**
     * Fetches World Atlas data for a specific location
     */
    async fetchWorldAtlasData(lat, lng) {
        try {
            if (this.apiConfig) {
                return await this.apiConfig.fetchWithFallback('worldAtlas', {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });
            }
            
            // Fallback to direct fetch
            const url = window.AppConfig ? 
                window.AppConfig.getApiUrl(`world-atlas?lat=${lat}&lng=${lng}`) :
                `/api/world-atlas?lat=${lat}&lng=${lng}`;
                
            const response = await fetch(url);
            if (!response.ok) throw new Error('World Atlas API Error');
            return await response.json();
        } catch (error) {
            console.error('❌ Error fetching World Atlas data:', error);
            return null;
        }
    }

    /**
     * Fetches SQM network data
     */
    async fetchSQMNetworkData() {
        try {
            if (this.apiConfig) {
                return await this.apiConfig.fetchWithFallback('sqmNetwork', {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });
            }
            
            // Fallback to direct fetch
            const url = window.AppConfig ? 
                window.AppConfig.getApiUrl('sqm-network') :
                '/api/sqm-network';
                
            const response = await fetch(url);
            if (!response.ok) throw new Error('SQM Network API Error');
            return await response.json();
        } catch (error) {
            console.error('❌ Error fetching SQM Network data:', error);
            return null;
        }
    }

    /**
     * Fetches dark sky parks data
     */
    async fetchDarkSkyParks(lat = null, lng = null, radius = 100) {
        try {
            if (this.apiConfig) {
                return await this.apiConfig.fetchWithFallback('darkSkyParks', {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });
            }
            
            // Fallback to direct fetch
            let url = window.AppConfig ? 
                window.AppConfig.getApiUrl('dark-sky-parks') :
                '/api/dark-sky-parks';
                
            if (lat && lng) {
                const params = new URLSearchParams();
                params.append('lat', lat);
                params.append('lng', lng);
                params.append('radius', radius);
                url += '?' + params.toString();
            }
            
            const response = await fetch(url);
            if (!response.ok) throw new Error('Dark Sky Parks API Error');
            return await response.json();
        } catch (error) {
            console.error('❌ Error fetching Dark Sky Parks data:', error);
            return null;
        }
    }

    /**
     * Performs statistical analysis on a region
     */
    async performStatisticalAnalysis(geometry, year = null) {
        try {
            if (this.apiConfig) {
                return await this.apiConfig.fetchWithFallback('statistics', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ geometry, year })
                });
            }
            
            // Fallback to direct fetch
            const url = window.AppConfig ? 
                window.AppConfig.getApiUrl('statistics/region') :
                '/api/statistics/region';
                
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ geometry, year })
            });
            
            if (!response.ok) throw new Error('Statistics API Error');
            return await response.json();
        } catch (error) {
            console.error('❌ Error performing statistical analysis:', error);
            return null;
        }
    }

    /**
     * Performs ecological impact assessment
     */
    async performEcologicalAssessment(geometry) {
        try {
            if (this.apiConfig) {
                return await this.apiConfig.fetchWithFallback('ecology', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ geometry })
                });
            }
            
            // Fallback to direct fetch
            const url = window.AppConfig ? 
                window.AppConfig.getApiUrl('ecology/impact') :
                '/api/ecology/impact';
                
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ geometry })
            });
            
            if (!response.ok) throw new Error('Ecology API Error');
            return await response.json();
        } catch (error) {
            console.error('❌ Error performing ecological assessment:', error);
            return null;
        }
    }

    /**
     * Performs energy waste calculation
     */
    async calculateEnergyWaste(geometry, lightingType = 'mixed', costPerKwh = 0.15) {
        try {
            if (this.apiConfig) {
                return await this.apiConfig.fetchWithFallback('energy', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ 
                        geometry, 
                        lighting_type: lightingType, 
                        cost_per_kwh: costPerKwh 
                    })
                });
            }
            
            // Fallback to direct fetch
            const url = window.AppConfig ? 
                window.AppConfig.getApiUrl('energy/waste') :
                '/api/energy/waste';
                
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ 
                    geometry, 
                    lighting_type: lightingType, 
                    cost_per_kwh: costPerKwh 
                })
            });
            
            if (!response.ok) throw new Error('Energy API Error');
            return await response.json();
        } catch (error) {
            console.error('❌ Error calculating energy waste:', error);
            return null;
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