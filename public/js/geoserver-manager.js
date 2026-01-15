// js/geoserver-manager.js - Client-side GeoServer Manager
// Handles GeoServer integration in the browser for Project Nocturna

class GeoServerManager {
    constructor(map) {
        this.map = map;
        this.baseUrl = window.AppConfig ? 
            window.AppConfig.getGeoserverUrl() : 
            'http://localhost:8080/geoserver';
        this.workspace = 'nocturna';
        this.layers = {};
        this.activeLayers = [];
        
        // Initialize when map is ready
        if (this.map) {
            this.initialize();
        } else {
            console.warn('⚠️ Map not provided to GeoServerManager');
        }
    }

    async initialize() {
        console.log('🌍 Initializing GeoServer Manager...');
        
        try {
            // Test connection to GeoServer
            const health = await this.healthCheck();
            if (health.connected) {
                console.log('✅ GeoServer connection established');
                // Load available layers
                await this.loadAvailableLayers();
            } else {
                console.warn('⚠️ GeoServer not available:', health.error);
                // Still initialize with fallback data
                this.setupFallbackLayers();
            }
        } catch (error) {
            console.warn('⚠️ GeoServer initialization failed:', error.message);
            // Still initialize with fallback data
            this.setupFallbackLayers();
        }
    }
    
    /**
     * Setup fallback layers when GeoServer is not available
     */
    setupFallbackLayers() {
        console.log('🔧 Setting up fallback layers for GeoServer manager');
        // Update UI with message about fallback
        const layerSelect = document.getElementById('geoserver-layer-select');
        if (layerSelect) {
            layerSelect.innerHTML = '';
            const option = document.createElement('option');
            option.value = '';
            option.textContent = 'GeoServer unavailable - using fallback data';
            option.disabled = true;
            layerSelect.appendChild(option);
        }
    }

    /**
     * Health check for GeoServer
     */
    async healthCheck() {
        try {
            // For Vercel deployment, use our API proxy to avoid CORS issues
            if (window.AppConfig && (window.AppConfig.isVercel || window.location.hostname.includes('vercel'))) {
                const response = await fetch('/api/geoserver/health', {
                    method: 'GET',
                    headers: {
                        'Accept': 'application/json'
                    }
                });
                
                if (response.ok) {
                    const data = await response.json();
                    return {
                        status: 'healthy',
                        connected: true,
                        version: data.version || 'unknown',
                        timestamp: new Date().toISOString()
                    };
                } else {
                    return {
                        status: 'unhealthy',
                        connected: false,
                        error: `HTTP ${response.status}`,
                        timestamp: new Date().toISOString()
                    };
                }
            } else {
                // Original approach for local development
                const response = await fetch(`${this.baseUrl}/rest/about/version`, {
                    method: 'GET',
                    headers: {
                        'Accept': 'application/json',
                        'Authorization': `Basic ${btoa('admin:geoserver')}` // Basic auth
                    }
                });
                
                if (response.ok) {
                    const data = await response.json();
                    return {
                        status: 'healthy',
                        connected: true,
                        version: data.about.version,
                        timestamp: new Date().toISOString()
                    };
                } else {
                    return {
                        status: 'unhealthy',
                        connected: false,
                        error: `HTTP ${response.status}`,
                        timestamp: new Date().toISOString()
                    };
                }
            }
        } catch (error) {
            return {
                status: 'unhealthy',
                connected: false,
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }

    /**
     * Load available layers from GeoServer
     */
    async loadAvailableLayers() {
        try {
            const response = await fetch(`${this.baseUrl}/rest/layers`, {
                headers: {
                    'Accept': 'application/json',
                    'Authorization': `Basic ${btoa('admin:geoserver')}`
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                this.layers = data;
                console.log(`✅ Loaded ${data.length || (data.layers && data.layers.layer ? data.layers.layer.length : 0)} layers from GeoServer`);
                
                // Update UI with available layers
                this.updateLayerListUI();
            }
        } catch (error) {
            console.error('❌ Error loading layers:', error.message);
        }
    }

    /**
     * Update UI with available layers
     */
    updateLayerListUI() {
        // Update layer selection dropdown if it exists
        const layerSelect = document.getElementById('geoserver-layer-select');
        if (layerSelect) {
            // Clear existing options
            layerSelect.innerHTML = '';
            
            // Add default option
            const defaultOption = document.createElement('option');
            defaultOption.value = '';
            defaultOption.textContent = 'Select GeoServer Layer';
            layerSelect.appendChild(defaultOption);
            
            // Add GeoServer layers (if available)
            const layers = this.layers.layers?.layer || [];
            layers.forEach(layer => {
                if (layer.name.startsWith('nocturna:')) { // Only show nocturna layers
                    const option = document.createElement('option');
                    option.value = layer.name.replace('nocturna:', '');
                    option.textContent = layer.name.replace('nocturna:', '');
                    layerSelect.appendChild(option);
                }
            });
        }
    }

    /**
     * Add a WMS layer from GeoServer to the map
     */
    addWmsLayer(layerName, options = {}) {
        const defaultOptions = {
            layers: `${this.workspace}:${layerName}`,
            format: 'image/png',
            transparent: true,
            attribution: 'GeoServer WMS Layer',
            opacity: 0.7
        };

        const wmsOptions = { ...defaultOptions, ...options };

        // Create WMS layer
        const wmsLayer = L.tileLayer.wms(`${this.baseUrl}/wms`, wmsOptions);

        // Add to map
        wmsLayer.addTo(this.map);

        // Store reference
        this.activeLayers.push({
            name: layerName,
            layer: wmsLayer,
            type: 'wms'
        });

        console.log(`✅ Added WMS layer: ${layerName}`);

        return wmsLayer;
    }

    /**
     * Add a WFS layer from GeoServer to the map
     */
    async addWfsLayer(layerName, styleFunction = null) {
        try {
            const response = await fetch(`${this.baseUrl}/wfs?service=WFS&version=1.0.0&request=GetFeature&typeName=${this.workspace}:${layerName}&outputFormat=application/json`, {
                headers: {
                    'Accept': 'application/json',
                    'Authorization': `Basic ${btoa('admin:geoserver')}`
                }
            });

            if (response.ok) {
                const geojsonData = await response.json();

                // Create GeoJSON layer with optional styling
                let geoJsonLayer;
                if (styleFunction) {
                    geoJsonLayer = L.geoJSON(geojsonData, {
                        style: styleFunction,
                        onEachFeature: (feature, layer) => {
                            // Add popup with feature properties
                            let popupContent = '<div class="feature-popup"><h6>Feature Details</h6><table class="table table-sm">';
                            
                            for (const [key, value] of Object.entries(feature.properties || {})) {
                                popupContent += `<tr><td><strong>${key}:</strong></td><td>${value}</td></tr>`;
                            }
                            
                            popupContent += '</table></div>';
                            layer.bindPopup(popupContent);
                        }
                    });
                } else {
                    geoJsonLayer = L.geoJSON(geojsonData, {
                        onEachFeature: (feature, layer) => {
                            // Add popup with feature properties
                            let popupContent = '<div class="feature-popup"><h6>Feature Details</h6><table class="table table-sm">';
                            
                            for (const [key, value] of Object.entries(feature.properties || {})) {
                                popupContent += `<tr><td><strong>${key}:</strong></td><td>${value}</td></tr>`;
                            }
                            
                            popupContent += '</table></div>';
                            layer.bindPopup(popupContent);
                        }
                    });
                }

                // Add to map
                geoJsonLayer.addTo(this.map);

                // Store reference
                this.activeLayers.push({
                    name: layerName,
                    layer: geoJsonLayer,
                    type: 'wfs'
                });

                console.log(`✅ Added WFS layer: ${layerName}`);

                return geoJsonLayer;
            } else {
                throw new Error(`WFS request failed: ${response.status}`);
            }
        } catch (error) {
            console.error(`❌ Error adding WFS layer ${layerName}:`, error.message);
            throw error;
        }
    }

    /**
     * Remove a layer from the map
     */
    removeLayer(layerName) {
        const layerIndex = this.activeLayers.findIndex(l => l.name === layerName);
        if (layerIndex !== -1) {
            const layerInfo = this.activeLayers[layerIndex];
            this.map.removeLayer(layerInfo.layer);
            this.activeLayers.splice(layerIndex, 1);
            console.log(`✅ Removed layer: ${layerName}`);
        }
    }

    /**
     * Remove all GeoServer layers from the map
     */
    removeAllLayers() {
        this.activeLayers.forEach(layerInfo => {
            this.map.removeLayer(layerInfo.layer);
        });
        this.activeLayers = [];
        console.log('✅ Removed all GeoServer layers');
    }

    /**
     * Query features within bounds
     */
    async queryFeatures(layerName, bounds, cqlFilter = null) {
        try {
            let url = `${this.baseUrl}/wfs?service=WFS&version=1.0.0&request=GetFeature&typeName=${this.workspace}:${layerName}&outputFormat=application/json&maxFeatures=1000`;

            // Add bounding box filter
            if (bounds) {
                const bbox = `${bounds.getWest()},${bounds.getSouth()},${bounds.getEast()},${bounds.getNorth()},EPSG:4326`;
                url += `&bbox=${bbox}`;
            }

            // Add CQL filter if provided
            if (cqlFilter) {
                url += `&cql_filter=${encodeURIComponent(cqlFilter)}`;
            }

            const response = await fetch(url, {
                headers: {
                    'Accept': 'application/json',
                    'Authorization': `Basic ${btoa('admin:geoserver')}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                return data;
            } else {
                throw new Error(`Query failed: ${response.status}`);
            }
        } catch (error) {
            console.error(`❌ Error querying features from ${layerName}:`, error.message);
            throw error;
        }
    }

    /**
     * Get layer information
     */
    async getLayerInfo(layerName) {
        try {
            const response = await fetch(`${this.baseUrl}/rest/layers/${this.workspace}:${layerName}`, {
                headers: {
                    'Accept': 'application/json',
                    'Authorization': `Basic ${btoa('admin:geoserver')}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                return data;
            } else {
                throw new Error(`Layer info request failed: ${response.status}`);
            }
        } catch (error) {
            console.error(`❌ Error getting layer info for ${layerName}:`, error.message);
            throw error;
        }
    }

    /**
     * Get layer bounds
     */
    async getLayerBounds(layerName) {
        try {
            const response = await fetch(`${this.baseUrl}/rest/layers/${this.workspace}:${layerName}/bounds`, {
                headers: {
                    'Accept': 'application/json',
                    'Authorization': `Basic ${btoa('admin:geoserver')}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                return data;
            } else {
                throw new Error(`Bounds request failed: ${response.status}`);
            }
        } catch (error) {
            console.error(`❌ Error getting bounds for ${layerName}:`, error.message);
            throw error;
        }
    }

    /**
     * Create a style for light pollution visualization
     */
    createLightPollutionStyle() {
        return (feature) => {
            // Default style for light pollution features
            const brightness = feature.properties?.brightness || feature.properties?.sqm_value || 0;
            
            // Color scale based on light pollution intensity
            let fillColor;
            if (brightness >= 20) {
                fillColor = '#006600'; // Natural darkness - dark green
            } else if (brightness >= 18) {
                fillColor = '#00aa00'; // Low pollution - green
            } else if (brightness >= 16) {
                fillColor = '#ffff00'; // Moderate pollution - yellow
            } else if (brightness >= 14) {
                fillColor = '#ff8800'; // High pollution - orange
            } else {
                fillColor = '#ff0000'; // Extreme pollution - red
            }

            return {
                fillColor: fillColor,
                weight: 1,
                opacity: 1,
                color: 'white',
                dashArray: '3',
                fillOpacity: 0.7
            };
        };
    }

    /**
     * Add light pollution measurement layer
     */
    async addLightPollutionMeasurements() {
        try {
            // Try to get light pollution data from our own API first
            const apiResponse = await fetch('/api/measurements');
            
            if (apiResponse.ok) {
                const measurements = await apiResponse.json();
                
                // Convert to GeoJSON format
                const geojsonData = {
                    type: 'FeatureCollection',
                    features: measurements.map(measurement => ({
                        type: 'Feature',
                        properties: {
                            id: measurement.id,
                            sqm_value: measurement.sqm_value,
                            bortle_class: measurement.bortle_class,
                            brightness: measurement.brightness,
                            location: measurement.location,
                            date_observed: measurement.date_observed,
                            source: measurement.source
                        },
                        geometry: {
                            type: 'Point',
                            coordinates: [measurement.longitude, measurement.latitude]
                        }
                    }))
                };

                // Create styled layer
                const lightPollutionLayer = L.geoJSON(geojsonData, {
                    pointToLayer: (feature, latlng) => {
                        const brightness = feature.properties.brightness || feature.properties.sqm_value || 0;
                        
                        // Size based on brightness value
                        let radius = 8;
                        if (brightness >= 20) radius = 4;  // Small for dark areas
                        else if (brightness >= 18) radius = 6;  // Medium for low pollution
                        else if (brightness >= 16) radius = 8;  // Large for moderate pollution
                        else if (brightness >= 14) radius = 10; // Larger for high pollution
                        else radius = 12;  // Largest for extreme pollution
                        
                        // Color based on pollution level
                        let fillColor;
                        if (brightness >= 20) fillColor = '#006600';  // Natural darkness
                        else if (brightness >= 18) fillColor = '#00aa00';  // Low pollution
                        else if (brightness >= 16) fillColor = '#ffff00';  // Moderate pollution
                        else if (brightness >= 14) fillColor = '#ff8800';  // High pollution
                        else fillColor = '#ff0000';  // Extreme pollution
                        
                        return L.circleMarker(latlng, {
                            radius: radius,
                            fillColor: fillColor,
                            color: '#ffffff',
                            weight: 1,
                            opacity: 1,
                            fillOpacity: 0.8
                        });
                    },
                    onEachFeature: (feature, layer) => {
                        const props = feature.properties;
                        const popupContent = `
                            <div class="measurement-popup">
                                <h6>Light Pollution Measurement</h6>
                                <table class="table table-sm">
                                    <tr><td><strong>Location:</strong></td><td>${props.location || 'Unknown'}</td></tr>
                                    <tr><td><strong>SQM Value:</strong></td><td>${props.sqm_value || 'N/A'}</td></tr>
                                    <tr><td><strong>Bortle Class:</strong></td><td>${props.bortle_class || 'N/A'}</td></tr>
                                    <tr><td><strong>Brightness:</strong></td><td>${props.brightness || 'N/A'}</td></tr>
                                    <tr><td><strong>Date:</strong></td><td>${new Date(props.date_observed).toLocaleDateString() || 'N/A'}</td></tr>
                                    <tr><td><strong>Source:</strong></td><td>${props.source || 'Unknown'}</td></tr>
                                </table>
                            </div>
                        `;
                        layer.bindPopup(popupContent);
                    }
                });

                // Add to map
                lightPollutionLayer.addTo(this.map);
                
                // Store reference
                this.activeLayers.push({
                    name: 'light_pollution_measurements',
                    layer: lightPollutionLayer,
                    type: 'measurements'
                });

                console.log(`✅ Added ${measurements.length} light pollution measurements to map`);
                return lightPollutionLayer;
            } else {
                console.warn('⚠️ Could not fetch measurements from API, trying GeoServer...');
                // Fallback: try to get from GeoServer
                return await this.addWfsLayer('light_pollution_measurements', this.createLightPollutionStyle());
            }
        } catch (error) {
            console.error('❌ Error adding light pollution measurements:', error.message);
            throw error;
        }
    }

    /**
     * Add dark sky reserves layer
     */
    async addDarkSkyReserves() {
        try {
            // Try to get dark sky reserves from our own API first
            const apiResponse = await fetch('/api/dark-sky-parks');
            
            if (apiResponse.ok) {
                const reserves = await apiResponse.json();
                
                // Convert to GeoJSON format
                const geojsonData = {
                    type: 'FeatureCollection',
                    features: reserves.map(reserve => ({
                        type: 'Feature',
                        properties: {
                            id: reserve.id,
                            name: reserve.name,
                            designation: reserve.designation,
                            country: reserve.country,
                            sqm: reserve.sqm,
                            certification_date: reserve.certification_date
                        },
                        geometry: {
                            type: 'Point',
                            coordinates: [reserve.longitude, reserve.latitude]
                        }
                    }))
                };

                // Create styled layer for dark sky reserves
                const reservesLayer = L.geoJSON(geojsonData, {
                    pointToLayer: (feature, latlng) => {
                        return L.circleMarker(latlng, {
                            radius: 10,
                            fillColor: '#006600',
                            color: '#00ff00',
                            weight: 2,
                            opacity: 1,
                            fillOpacity: 0.8
                        });
                    },
                    onEachFeature: (feature, layer) => {
                        const props = feature.properties;
                        const popupContent = `
                            <div class="reserve-popup">
                                <h6><i class="fas fa-star"></i> ${props.name}</h6>
                                <table class="table table-sm">
                                    <tr><td><strong>Designation:</strong></td><td>${props.designation}</td></tr>
                                    <tr><td><strong>Country:</strong></td><td>${props.country}</td></tr>
                                    <tr><td><strong>SQM:</strong></td><td>${props.sqm || 'N/A'}</td></tr>
                                    <tr><td><strong>Certified:</strong></td><td>${new Date(props.certification_date).toLocaleDateString() || 'N/A'}</td></tr>
                                </table>
                            </div>
                        `;
                        layer.bindPopup(popupContent);
                    }
                });

                // Add to map
                reservesLayer.addTo(this.map);
                
                // Store reference
                this.activeLayers.push({
                    name: 'dark_sky_reserves',
                    layer: reservesLayer,
                    type: 'reserves'
                });

                console.log(`✅ Added ${reserves.length} dark sky reserves to map`);
                return reservesLayer;
            } else {
                console.warn('⚠️ Could not fetch dark sky reserves from API, trying GeoServer...');
                // Fallback: try to get from GeoServer
                return await this.addWfsLayer('dark_sky_reserves');
            }
        } catch (error) {
            console.error('❌ Error adding dark sky reserves:', error.message);
            throw error;
        }
    }

    /**
     * Refresh all active layers
     */
    async refreshLayers() {
        const layerNames = [...this.activeLayers.map(l => l.name)];
        
        // Remove all layers
        this.removeAllLayers();
        
        // Re-add them
        for (const layerName of layerNames) {
            try {
                if (layerName === 'light_pollution_measurements') {
                    await this.addLightPollutionMeasurements();
                } else if (layerName === 'dark_sky_reserves') {
                    await this.addDarkSkyReserves();
                } else {
                    // Try WFS first, then WMS
                    try {
                        await this.addWfsLayer(layerName);
                    } catch {
                        this.addWmsLayer(layerName);
                    }
                }
            } catch (error) {
                console.error(`❌ Error refreshing layer ${layerName}:`, error.message);
            }
        }
    }

    /**
     * Get statistics for current map view
     */
    async getMapViewStats() {
        const bounds = this.map.getBounds();
        const stats = {
            totalFeatures: 0,
            avgBrightness: 0,
            minBrightness: Infinity,
            maxBrightness: -Infinity,
            darkAreas: 0,  // Areas with low light pollution (SQM > 20)
            pollutedAreas: 0  // Areas with high light pollution (SQM < 15)
        };

        // Query each active vector layer
        for (const layerInfo of this.activeLayers) {
            if (layerInfo.type === 'wfs' || layerInfo.type === 'measurements' || layerInfo.type === 'reserves') {
                try {
                    const features = await this.queryFeatures(layerInfo.name, bounds);
                    if (features.features) {
                        features.features.forEach(feature => {
                            const brightness = feature.properties?.brightness || feature.properties?.sqm_value || 0;
                            
                            if (brightness < stats.minBrightness) stats.minBrightness = brightness;
                            if (brightness > stats.maxBrightness) stats.maxBrightness = brightness;
                            
                            stats.totalFeatures++;
                            stats.avgBrightness += brightness;
                            
                            if (brightness > 20) stats.darkAreas++;
                            if (brightness < 15) stats.pollutedAreas++;
                        });
                    }
                } catch (error) {
                    console.warn(`⚠️ Could not query features for ${layerInfo.name}:`, error.message);
                }
            }
        }

        if (stats.totalFeatures > 0) {
            stats.avgBrightness /= stats.totalFeatures;
        } else {
            stats.avgBrightness = null;
        }

        if (stats.minBrightness === Infinity) stats.minBrightness = null;
        if (stats.maxBrightness === -Infinity) stats.maxBrightness = null;

        return stats;
    }

    /**
     * Export current map view as GeoJSON
     */
    exportCurrentViewAsGeoJSON() {
        const geojsonData = {
            type: 'FeatureCollection',
            features: []
        };

        // Collect features from all active vector layers
        for (const layerInfo of this.activeLayers) {
            if (layerInfo.layer.toGeoJSON) {
                const layerGeoJSON = layerInfo.layer.toGeoJSON();
                if (layerGeoJSON.features) {
                    geojsonData.features = geojsonData.features.concat(layerGeoJSON.features);
                }
            }
        }

        // Create download
        const dataStr = JSON.stringify(geojsonData, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);

        const exportFileName = `geoserver_features_${Date.now()}.geojson`;

        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileName);
        linkElement.click();

        console.log(`✅ Exported ${geojsonData.features.length} features as GeoJSON`);
        return geojsonData;
    }
}

// Make globally available
window.GeoServerManager = GeoServerManager;