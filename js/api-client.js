// js/api-client.js - Real Data API Client
class APIClient {
    constructor() {
        this.baseUrl = window.AppConfig ? window.AppConfig.apiBaseUrl : '/api';
        this.cache = new Map();
        this.cacheDuration = 5 * 60 * 1000; // 5 minutes
        this.requestQueue = new Map(); // Track ongoing requests to avoid duplicates
    }

    async fetchVIIRSData(year = 2023, month = null, bbox = null) {
        const cacheKey = `viirs-${year}-${month}-${bbox}`;
        
        // Check for ongoing request first
        if (this.requestQueue.has(cacheKey)) {
            return this.requestQueue.get(cacheKey);
        }
        
        // Check cache first
        const cached = this.getCached(cacheKey);
        if (cached) return cached;
        
        // Create promise to track this request
        const requestPromise = this.makeVIIRSRequest(year, month, bbox, cacheKey);
        this.requestQueue.set(cacheKey, requestPromise);
        
        try {
            const result = await requestPromise;
            this.requestQueue.delete(cacheKey);
            return result;
        } catch (error) {
            this.requestQueue.delete(cacheKey);
            throw error;
        }
    }
    
    async makeVIIRSRequest(year, month, bbox, cacheKey) {
        try {
            let url = `${this.baseUrl}/viirs/${year}`;
            if (month) url += `/${month}`;
            if (bbox) url += `?bbox=${bbox}`;

            const response = await fetch(url, {
                headers: {
                    'Cache-Control': 'no-cache'
                }
            });
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            this.setCached(cacheKey, data);
            return data;
        } catch (error) {
            console.error('VIIRS fetch error:', error);
            // Try to return cached data if available even when request fails
            const cached = this.getCached(cacheKey);
            if (cached) {
                console.warn('Returning cached VIIRS data due to error');
                return cached;
            }
            throw error;
        }
    }

    async fetchWorldAtlasData(lat, lng) {
        const cacheKey = `worldatlas-${lat}-${lng}`;
        
        if (this.requestQueue.has(cacheKey)) {
            return this.requestQueue.get(cacheKey);
        }
        
        const cached = this.getCached(cacheKey);
        if (cached) return cached;
        
        const requestPromise = this.makeWorldAtlasRequest(lat, lng, cacheKey);
        this.requestQueue.set(cacheKey, requestPromise);
        
        try {
            const result = await requestPromise;
            this.requestQueue.delete(cacheKey);
            return result;
        } catch (error) {
            this.requestQueue.delete(cacheKey);
            throw error;
        }
    }
    
    async makeWorldAtlasRequest(lat, lng, cacheKey) {
        try {
            const response = await fetch(`${this.baseUrl}/world-atlas?lat=${lat}&lng=${lng}`, {
                headers: {
                    'Cache-Control': 'no-cache'
                }
            });
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            this.setCached(cacheKey, data);
            return data;
        } catch (error) {
            console.error('World Atlas fetch error:', error);
            const cached = this.getCached(cacheKey);
            if (cached) {
                console.warn('Returning cached World Atlas data due to error');
                return cached;
            }
            throw error;
        }
    }

    async fetchSQMNetworkData() {
        const cacheKey = 'sqm-network';
        
        if (this.requestQueue.has(cacheKey)) {
            return this.requestQueue.get(cacheKey);
        }
        
        const cached = this.getCached(cacheKey);
        if (cached) return cached;
        
        const requestPromise = this.makeSQMRequest(cacheKey);
        this.requestQueue.set(cacheKey, requestPromise);
        
        try {
            const result = await requestPromise;
            this.requestQueue.delete(cacheKey);
            return result;
        } catch (error) {
            this.requestQueue.delete(cacheKey);
            throw error;
        }
    }
    
    async makeSQMRequest(cacheKey) {
        try {
            const response = await fetch(`${this.baseUrl}/sqm-network`, {
                headers: {
                    'Cache-Control': 'no-cache'
                }
            });
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            this.setCached(cacheKey, data, 2 * 60 * 1000); // 2 minutes for real-time data
            return data;
        } catch (error) {
            console.error('SQM Network fetch error:', error);
            const cached = this.getCached(cacheKey);
            if (cached) {
                console.warn('Returning cached SQM data due to error');
                return cached;
            }
            throw error;
        }
    }

    async fetchStatistics(geometry, year = 2023) {
        const cacheKey = `stats-${JSON.stringify(geometry)}-${year}`;
        
        if (this.requestQueue.has(cacheKey)) {
            return this.requestQueue.get(cacheKey);
        }
        
        try {
            const response = await fetch(`${this.baseUrl}/statistics/region`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Cache-Control': 'no-cache'
                },
                body: JSON.stringify({ geometry, year })
            });
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            this.setCached(cacheKey, data, 30 * 60 * 1000); // 30 minutes for stats
            return data;
        } catch (error) {
            console.error('Statistics fetch error:', error);
            throw error;
        }
    }

    async fetchDarkSkyParks(lat = null, lng = null, radius = 100) {
        let url = `${this.baseUrl}/dark-sky-parks`;
        if (lat && lng) {
            url += `?lat=${lat}&lng=${lng}&radius=${radius}`;
        }

        try {
            const response = await fetch(url, {
                headers: {
                    'Cache-Control': 'no-cache'
                }
            });
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
            }
            return await response.json();
        } catch (error) {
            console.error('Dark Sky Parks fetch error:', error);
            throw error;
        }
    }

    async submitMeasurement(data) {
        try {
            const response = await fetch(`${this.baseUrl}/measurements`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Cache-Control': 'no-cache'
                },
                body: JSON.stringify(data)
            });
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
            }
            return await response.json();
        } catch (error) {
            console.error('Measurement submission error:', error);
            throw error;
        }
    }

    // Cache management
    getCached(key) {
        const item = this.cache.get(key);
        if (!item) return null;
        
        if (Date.now() - item.timestamp > item.duration) {
            this.cache.delete(key);
            return null;
        }
        
        return item.data;
    }

    setCached(key, data, duration = this.cacheDuration) {
        this.cache.set(key, {
            data,
            timestamp: Date.now(),
            duration
        });
    }

    clearCache() {
        this.cache.clear();
        console.log('API cache cleared');
    }
    
    // Method to get cache statistics
    getCacheStats() {
        return {
            size: this.cache.size,
            keys: Array.from(this.cache.keys())
        };
    }
}

// Initialize global API client
window.APIClient = new APIClient();