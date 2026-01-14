// js/gibs-manager.js - GIBS (Global Imagery Browse Services) Manager
// Handles NASA GIBS integration for light pollution data visualization

class GIBSManager {
    constructor(map) {
        this.map = map;
        this.activeLayers = new Map();
        this.layerConfigs = {};
        this.isInitialized = false;
    }

    async initialize() {
        try {
            // Fetch available GIBS layers from the API
            const response = await fetch('/api/gibs/layers');
            const data = await response.json();
            
            this.layerConfigs = data.layers;
            this.isInitialized = true;
            
            console.log('🌍 GIBS Manager initialized with', Object.keys(this.layerConfigs).length, 'layer categories');
            return true;
        } catch (error) {
            console.error('❌ GIBS Manager initialization failed:', error);
            return false;
        }
    }

    /**
     * Get available GIBS layers
     */
    getAvailableLayers() {
        return this.layerConfigs;
    }

    /**
     * Add a GIBS layer to the map
     */
    async addLayer(layerId, options = {}) {
        try {
            // Get layer metadata
            const metadataResponse = await fetch(`/api/gibs/layer/${layerId}`);
            const metadata = await metadataResponse.json();
            
            // Get tile template
            const templateResponse = await fetch(`/api/gibs/tile-template/${layerId}`);
            const templateData = await templateResponse.json();
            
            const tileUrl = templateData.tile_template;
            
            // Create Leaflet tile layer
            const layer = L.tileLayer(tileUrl, {
                attribution: 'NASA GIBS Imagery | Project Nocturna',
                maxZoom: metadata.metadata.maxZoom || 8,
                opacity: options.opacity || 0.8,
                zIndex: options.zIndex || 100
            });
            
            // Store layer reference
            this.activeLayers.set(layerId, {
                layer: layer,
                metadata: metadata.metadata,
                options: options
            });
            
            // Add to map
            layer.addTo(this.map);
            
            console.log(`✅ Added GIBS layer: ${layerId}`);
            return layer;
        } catch (error) {
            console.error(`❌ Failed to add GIBS layer ${layerId}:`, error);
            throw error;
        }
    }

    /**
     * Remove a GIBS layer from the map
     */
    removeLayer(layerId) {
        const layerInfo = this.activeLayers.get(layerId);
        if (layerInfo) {
            this.map.removeLayer(layerInfo.layer);
            this.activeLayers.delete(layerId);
            console.log(`🗑️ Removed GIBS layer: ${layerId}`);
        }
    }

    /**
     * Update layer opacity
     */
    updateLayerOpacity(layerId, opacity) {
        const layerInfo = this.activeLayers.get(layerId);
        if (layerInfo) {
            layerInfo.layer.setOpacity(opacity);
            layerInfo.options.opacity = opacity;
            console.log(`🔄 Updated opacity for GIBS layer ${layerId}: ${opacity}`);
        }
    }

    /**
     * Get statistics for a specific area using GIBS data
     */
    async getAreaStatistics(layerId, bounds, date = null) {
        try {
            const requestBody = {
                layerId: layerId,
                bounds: bounds,
                date: date
            };

            const response = await fetch('/api/gibs/statistics', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody)
            });

            const data = await response.json();
            return data;
        } catch (error) {
            console.error('❌ Failed to get GIBS statistics:', error);
            throw error;
        }
    }

    /**
     * Get temporal comparison using GIBS data
     */
    async getTemporalComparison(layerId, bounds, date1, date2) {
        try {
            const requestBody = {
                layerId: layerId,
                bounds: bounds,
                date1: date1,
                date2: date2
            };

            const response = await fetch('/api/gibs/comparison', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody)
            });

            const data = await response.json();
            return data;
        } catch (error) {
            console.error('❌ Failed to get GIBS temporal comparison:', error);
            throw error;
        }
    }

    /**
     * Search for GIBS imagery products
     */
    async searchProducts(startDate, endDate, productTypes = ['nighttime_lights']) {
        try {
            const requestBody = {
                startDate: startDate,
                endDate: endDate,
                productTypes: productTypes
            };

            const response = await fetch('/api/gibs/search', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody)
            });

            const data = await response.json();
            return data;
        } catch (error) {
            console.error('❌ Failed to search GIBS products:', error);
            throw error;
        }
    }

    /**
     * Get time series data using GIBS
     */
    async getTimeSeries(layerId, bounds, startDate, endDate) {
        try {
            const requestBody = {
                layerId: layerId,
                bounds: bounds,
                startDate: startDate,
                endDate: endDate
            };

            const response = await fetch('/api/gibs/timeseries', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody)
            });

            const data = await response.json();
            return data;
        } catch (error) {
            console.error('❌ Failed to get GIBS time series:', error);
            throw error;
        }
    }

    /**
     * Check GIBS service health
     */
    async healthCheck() {
        try {
            const response = await fetch('/api/gibs/health');
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('❌ GIBS health check failed:', error);
            return { status: 'error', error: error.message };
        }
    }

    /**
     * Get current date in GIBS format
     */
    getCurrentDate() {
        return new Date().toISOString().split('T')[0];
    }

    /**
     * Get date range for recent imagery
     */
    getRecentDateRange(daysBack = 30) {
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(endDate.getDate() - daysBack);
        
        return {
            startDate: startDate.toISOString().split('T')[0],
            endDate: endDate.toISOString().split('T')[0]
        };
    }

    /**
     * Add pre-configured light pollution layers
     */
    async addPredefinedLayers(layerCategory = 'nighttime_lights') {
        if (!this.isInitialized) {
            await this.initialize();
        }

        const availableLayers = this.layerConfigs[layerCategory] || [];
        
        for (const layerId of availableLayers) {
            try {
                // Skip layers that are already added
                if (this.activeLayers.has(layerId)) continue;

                await this.addLayer(layerId, {
                    opacity: 0.7,
                    zIndex: 100
                });
                
                console.log(`✅ Added predefined GIBS layer: ${layerId}`);
            } catch (error) {
                console.warn(`⚠️ Could not add GIBS layer ${layerId}:`, error);
            }
        }
    }

    /**
     * Get layer bounds for the current map view
     */
    getCurrentMapBounds() {
        const bounds = this.map.getBounds();
        return [
            bounds.getSouth(),
            bounds.getWest(),
            bounds.getNorth(),
            bounds.getEast()
        ];
    }

    /**
     * Toggle GIBS layer visibility
     */
    toggleLayerVisibility(layerId) {
        const layerInfo = this.activeLayers.get(layerId);
        if (layerInfo) {
            if (this.map.hasLayer(layerInfo.layer)) {
                this.map.removeLayer(layerInfo.layer);
                return false;
            } else {
                this.map.addLayer(layerInfo.layer);
                return true;
            }
        }
        return false;
    }

    /**
     * Clear all GIBS layers
     */
    clearAllLayers() {
        for (const [layerId, layerInfo] of this.activeLayers) {
            this.map.removeLayer(layerInfo.layer);
        }
        this.activeLayers.clear();
        console.log('🗑️ Cleared all GIBS layers');
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GIBSManager;
}

// Make globally available if in browser
if (typeof window !== 'undefined') {
    window.GIBSManager = GIBSManager;
}