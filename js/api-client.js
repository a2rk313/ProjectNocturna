// js/api-client.js - Real Data API Client
class APIClient {
    constructor() {
        this.baseUrl = window.AppConfig ? window.AppConfig.apiBaseUrl : '/api';
        this.cache = new Map();
        this.cacheDuration = 5 * 60 * 1000; // 5 minutes
    }

    async fetchVIIRSData(year = 2023, month = null, bbox = null) {
        const cacheKey = `viirs-${year}-${month}-${bbox}`;
        const cached = this.getCached(cacheKey);
        if (cached) return cached;

        try {
            let url = `${this.baseUrl}/viirs/${year}`;
            if (month) url += `/${month}`;
            if (bbox) url += `?bbox=${bbox}`;

            const response = await fetch(url);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            
            const data = await response.json();
            this.setCached(cacheKey, data);
            return data;
        } catch (error) {
            console.error('VIIRS fetch error:', error);
            throw error;
        }
    }

    async fetchWorldAtlasData(lat, lng) {
        const cacheKey = `worldatlas-${lat}-${lng}`;
        const cached = this.getCached(cacheKey);
        if (cached) return cached;

        try {
            const response = await fetch(`${this.baseUrl}/world-atlas?lat=${lat}&lng=${lng}`);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            
            const data = await response.json();
            this.setCached(cacheKey, data);
            return data;
        } catch (error) {
            console.error('World Atlas fetch error:', error);
            throw error;
        }
    }

    async fetchSQMNetworkData() {
        const cacheKey = 'sqm-network';
        const cached = this.getCached(cacheKey);
        if (cached) return cached;

        try {
            const response = await fetch(`${this.baseUrl}/sqm-network`);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            
            const data = await response.json();
            this.setCached(cacheKey, data, 2 * 60 * 1000); // 2 minutes for real-time data
            return data;
        } catch (error) {
            console.error('SQM Network fetch error:', error);
            throw error;
        }
    }

    async fetchStatistics(geometry, year = 2023) {
        try {
            const response = await fetch(`${this.baseUrl}/statistics/region`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ geometry, year })
            });
            
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            return await response.json();
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
            const response = await fetch(url);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
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
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
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
    }
}

// Initialize global API client
window.APIClient = new APIClient();