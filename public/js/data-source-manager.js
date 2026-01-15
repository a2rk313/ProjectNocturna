// js/data-source-manager.js - Dual System for Vector and Raster Datasets
// Manages vector datasets in Supabase/PostGIS with sample points fallback
// and raster datasets in local GeoServer with API fallback

class DataSourceManager {
    constructor() {
        this.vectorSources = {
            primary: 'supabase', // Supabase/PostGIS as primary
            fallback: 'sample_points' // Sample points as fallback
        };
        
        this.rasterSources = {
            primary: 'geoserver', // Local GeoServer as primary
            fallback: 'api' // APIs as fallback
        };
        
        this.geoserverManager = window.GeoServerManager || null;
        this.dataManager = window.DataManager || new DataManager();
        this.apiClient = window.APIClient || new APIClient();
        
        // Vector layer configurations
        this.vectorLayers = {
            light_pollution_measurements: {
                supabaseTable: 'light_pollution_measurements',
                sampleDataPath: '/data/light_pollution_samples.json',
                primaryKey: 'id'
            },
            dark_sky_parks: {
                supabaseTable: 'dark_sky_parks',
                sampleDataPath: '/data/dark-sky-parks.json',
                primaryKey: 'id'
            }
        };
        
        // Raster layer configurations
        this.rasterLayers = {
            viirs_nightlights: {
                geoserverLayer: 'nocturna:viirs_nightlights',
                apiEndpoint: 'viirs',
                fallbackParams: { year: 2023 }
            },
            world_atlas_brightness: {
                geoserverLayer: 'nocturna:world_atlas_brightness',
                apiEndpoint: 'worldAtlas',
                fallbackParams: {}
            }
        };
    }

    /**
     * Initialize the data source manager
     */
    async initialize() {
        console.log('🌍 Initializing Data Source Manager...');
        
        // Test connection to primary vector source (Supabase)
        const vectorHealth = await this.testVectorSource(this.vectorSources.primary);
        console.log(`✅ Vector source (${this.vectorSources.primary}): ${vectorHealth.status}`);
        
        // Test connection to primary raster source (GeoServer)
        const rasterHealth = await this.testRasterSource(this.rasterSources.primary);
        console.log(`✅ Raster source (${this.rasterSources.primary}): ${rasterHealth.status}`);
        
        return {
            vector: vectorHealth,
            raster: rasterHealth
        };
    }

    /**
     * Test vector source availability
     */
    async testVectorSource(source) {
        try {
            if (source === 'supabase') {
                // Test Supabase connection by fetching a small dataset
                const response = await fetch('/api/stations');
                if (response.ok) {
                    const data = await response.json();
                    return {
                        status: 'connected',
                        available: true,
                        recordCount: Array.isArray(data) ? data.length : 0,
                        timestamp: new Date().toISOString()
                    };
                }
            } else if (source === 'sample_points') {
                // Test sample points availability
                const response = await fetch('/data/light_pollution_samples.json');
                if (response.ok) {
                    return {
                        status: 'available',
                        available: true,
                        source: 'sample_data',
                        timestamp: new Date().toISOString()
                    };
                }
            }
        } catch (error) {
            console.warn(`⚠️ Vector source ${source} test failed:`, error.message);
        }
        
        return {
            status: 'unavailable',
            available: false,
            error: 'Connection failed',
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Test raster source availability
     */
    async testRasterSource(source) {
        try {
            if (source === 'geoserver') {
                // Test GeoServer connection
                if (this.geoserverManager) {
                    const health = await this.geoserverManager.healthCheck();
                    return {
                        status: health.status,
                        available: health.connected,
                        version: health.version,
                        timestamp: new Date().toISOString()
                    };
                } else {
                    // Try direct connection
                    const response = await fetch('http://localhost:8080/geoserver/rest/about/version', {
                        method: 'GET',
                        headers: {
                            'Accept': 'application/json',
                            'Authorization': `Basic ${btoa('admin:geoserver')}`
                        }
                    });
                    
                    if (response.ok) {
                        const data = await response.json();
                        return {
                            status: 'healthy',
                            available: true,
                            version: data.about.version,
                            timestamp: new Date().toISOString()
                        };
                    }
                }
            } else if (source === 'api') {
                // Test API availability
                const response = await fetch('/api/viirs/2023');
                if (response.ok) {
                    return {
                        status: 'available',
                        available: true,
                        source: 'api_fallback',
                        timestamp: new Date().toISOString()
                    };
                }
            }
        } catch (error) {
            console.warn(`⚠️ Raster source ${source} test failed:`, error.message);
        }
        
        return {
            status: 'unavailable',
            available: false,
            error: 'Connection failed',
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Fetch vector data with fallback mechanism
     */
    async fetchVectorData(layerName, params = {}) {
        console.log(`🌍 Fetching vector data for layer: ${layerName}`);
        
        // Try primary source first (Supabase/PostGIS)
        try {
            const primaryResult = await this.fetchVectorFromPrimary(layerName, params);
            if (primaryResult && primaryResult.success) {
                console.log(`✅ Vector data fetched from primary source (Supabase)`);
                return {
                    source: 'supabase',
                    data: primaryResult.data,
                    success: true
                };
            }
        } catch (error) {
            console.warn(`⚠️ Primary vector source failed:`, error.message);
        }

        // Fallback to sample points
        try {
            const fallbackResult = await this.fetchVectorFromFallback(layerName, params);
            if (fallbackResult && fallbackResult.success) {
                console.log(`✅ Vector data fetched from fallback source (Sample Points)`);
                return {
                    source: 'sample_points',
                    data: fallbackResult.data,
                    success: true
                };
            }
        } catch (error) {
            console.warn(`⚠️ Vector fallback source failed:`, error.message);
        }

        // If both sources fail, return empty result
        return {
            source: 'none',
            data: [],
            success: false,
            error: 'All vector sources unavailable'
        };
    }

    /**
     * Fetch vector data from primary source (Supabase/PostGIS)
     */
    async fetchVectorFromPrimary(layerName, params = {}) {
        try {
            const layerConfig = this.vectorLayers[layerName];
            if (!layerConfig) {
                throw new Error(`Unknown vector layer: ${layerName}`);
            }

            // Use the existing DataManager to fetch from API (which connects to Supabase)
            switch (layerName) {
                case 'light_pollution_measurements':
                    const measurements = await this.dataManager.fetchStations();
                    return {
                        success: true,
                        data: measurements
                    };
                
                case 'dark_sky_parks':
                    const parks = await this.dataManager.fetchDarkSkyParks(
                        params.lat, 
                        params.lng, 
                        params.radius
                    );
                    return {
                        success: true,
                        data: parks
                    };
                
                default:
                    // Generic approach for other vector layers
                    const response = await fetch(`/api/${layerConfig.supabaseTable}`);
                    if (response.ok) {
                        const data = await response.json();
                        return {
                            success: true,
                            data: data
                        };
                    }
            }
        } catch (error) {
            console.error(`❌ Error fetching vector data from primary source:`, error.message);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Fetch vector data from fallback source (Sample Points)
     */
    async fetchVectorFromFallback(layerName, params = {}) {
        try {
            const layerConfig = this.vectorLayers[layerName];
            if (!layerConfig) {
                throw new Error(`Unknown vector layer: ${layerName}`);
            }

            const response = await fetch(layerConfig.sampleDataPath);
            if (response.ok) {
                const data = await response.json();
                
                // Apply basic filtering if parameters are provided
                if (params.bbox) {
                    // Simple bbox filtering (west, south, east, north)
                    const [west, south, east, north] = params.bbox;
                    return {
                        success: true,
                        data: data.filter(item => {
                            if (!item.latitude || !item.longitude) return true;
                            return (
                                item.longitude >= west && 
                                item.longitude <= east &&
                                item.latitude >= south && 
                                item.latitude <= north
                            );
                        })
                    };
                }
                
                return {
                    success: true,
                    data: data
                };
            } else {
                throw new Error(`Failed to load sample data from ${layerConfig.sampleDataPath}`);
            }
        } catch (error) {
            console.error(`❌ Error fetching vector data from fallback source:`, error.message);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Fetch raster data with fallback mechanism
     */
    async fetchRasterData(layerName, params = {}) {
        console.log(`🌍 Fetching raster data for layer: ${layerName}`);
        
        // Try primary source first (GeoServer)
        try {
            const primaryResult = await this.fetchRasterFromPrimary(layerName, params);
            if (primaryResult && primaryResult.success) {
                console.log(`✅ Raster data loaded from primary source (GeoServer)`);
                return {
                    source: 'geoserver',
                    layer: primaryResult.layer,
                    success: true
                };
            }
        } catch (error) {
            console.warn(`⚠️ Primary raster source failed:`, error.message);
        }

        // Fallback to API
        try {
            const fallbackResult = await this.fetchRasterFromFallback(layerName, params);
            if (fallbackResult && fallbackResult.success) {
                console.log(`✅ Raster data loaded from fallback source (API)`);
                return {
                    source: 'api',
                    layer: fallbackResult.layer,
                    success: true
                };
            }
        } catch (error) {
            console.warn(`⚠️ Raster fallback source failed:`, error.message);
        }

        // If both sources fail, return null
        return {
            source: 'none',
            layer: null,
            success: false,
            error: 'All raster sources unavailable'
        };
    }

    /**
     * Fetch raster data from primary source (GeoServer)
     */
    async fetchRasterFromPrimary(layerName, params = {}) {
        try {
            const layerConfig = this.rasterLayers[layerName];
            if (!layerConfig) {
                throw new Error(`Unknown raster layer: ${layerName}`);
            }

            if (!this.geoserverManager) {
                throw new Error('GeoServer manager not initialized');
            }

            // Add the WMS layer from GeoServer
            const wmsLayer = this.geoserverManager.addWmsLayer(
                layerConfig.geoserverLayer.replace('nocturna:', ''),
                params.options || {}
            );

            return {
                success: true,
                layer: wmsLayer
            };
        } catch (error) {
            console.error(`❌ Error fetching raster data from primary source:`, error.message);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Fetch raster data from fallback source (API)
     */
    async fetchRasterFromFallback(layerName, params = {}) {
        try {
            const layerConfig = this.rasterLayers[layerName];
            if (!layerConfig) {
                throw new Error(`Unknown raster layer: ${layerName}`);
            }

            // Use API client to fetch raster data
            switch (layerName) {
                case 'viirs_nightlights':
                    // Get VIIRS data via API and create a tile layer
                    const viirsData = await this.apiClient.fetchVIIRSData(
                        params.year || layerConfig.fallbackParams.year,
                        params.month,
                        params.bbox
                    );
                    
                    // Create a tile layer using the NASA VIIRS endpoint
                    const tileUrl = 'https://map1.vis.earthdata.nasa.gov/wmts-webmerc/VIIRS_CityLights_2012/default/GoogleMapsCompatible_Level8/{z}/{y}/{x}.jpg';
                    const tileLayer = L.tileLayer(tileUrl, {
                        attribution: 'NASA Earth Observatory, VIIRS Day/Night Band',
                        opacity: params.opacity || 0.7
                    });
                    
                    return {
                        success: true,
                        layer: tileLayer
                    };
                
                case 'world_atlas_brightness':
                    // For world atlas, we could fetch statistical data instead
                    // and potentially create a heatmap or similar visualization
                    const atlasData = await this.apiClient.fetchWorldAtlasData(
                        params.lat || 0,
                        params.lng || 0
                    );
                    
                    // For now, return a simple tile layer as fallback
                    // In a real implementation, this would be more sophisticated
                    const dummyTileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                        attribution: 'OpenStreetMap contributors',
                        opacity: params.opacity || 0.5
                    });
                    
                    return {
                        success: true,
                        layer: dummyTileLayer
                    };
                
                default:
                    throw new Error(`Unsupported raster layer for API fallback: ${layerName}`);
            }
        } catch (error) {
            console.error(`❌ Error fetching raster data from fallback source:`, error.message);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Add vector layer to map with automatic source selection
     */
    async addVectorLayerToMap(map, layerName, params = {}) {
        const result = await this.fetchVectorData(layerName, params);
        
        if (result.success) {
            // Convert the fetched data to a Leaflet layer
            const leafletLayer = this.convertToLeafletLayer(result.data, layerName, params.style);
            
            if (leafletLayer) {
                leafletLayer.addTo(map);
                
                console.log(`✅ Vector layer '${layerName}' added to map from ${result.source} source`);
                return {
                    layer: leafletLayer,
                    source: result.source,
                    success: true
                };
            }
        }
        
        console.error(`❌ Failed to add vector layer '${layerName}' to map`);
        return {
            layer: null,
            source: 'none',
            success: false,
            error: result.error || 'Conversion to Leaflet layer failed'
        };
    }

    /**
     * Add raster layer to map with automatic source selection
     */
    async addRasterLayerToMap(map, layerName, params = {}) {
        const result = await this.fetchRasterData(layerName, params);
        
        if (result.success) {
            result.layer.addTo(map);
            
            console.log(`✅ Raster layer '${layerName}' added to map from ${result.source} source`);
            return {
                layer: result.layer,
                source: result.source,
                success: true
            };
        }
        
        console.error(`❌ Failed to add raster layer '${layerName}' to map`);
        return {
            layer: null,
            source: 'none',
            success: false,
            error: result.error || 'Layer creation failed'
        };
    }

    /**
     * Convert data to Leaflet layer based on layer type
     */
    convertToLeafletLayer(data, layerName, styleFunction = null) {
        if (!data || !Array.isArray(data) || data.length === 0) {
            console.warn(`⚠️ No data to convert for layer: ${layerName}`);
            return null;
        }

        // Determine geometry type and create appropriate layer
        let geojsonData = null;
        
        if (data[0].geometry) {
            // Already in GeoJSON format
            geojsonData = {
                type: 'FeatureCollection',
                features: data
            };
        } else {
            // Convert tabular data to GeoJSON
            geojsonData = {
                type: 'FeatureCollection',
                features: data.map((item, index) => {
                    // Determine geometry based on available fields
                    let geometry = null;
                    
                    if (item.longitude !== undefined && item.latitude !== undefined) {
                        geometry = {
                            type: 'Point',
                            coordinates: [item.longitude, item.latitude]
                        };
                    } else if (item.geom) {
                        // Assuming WKT or similar geometry field
                        geometry = item.geom; // This would need proper parsing
                    } else if (item.coordinates) {
                        geometry = item.coordinates;
                    }
                    
                    return {
                        type: 'Feature',
                        properties: { ...item, id: index },
                        geometry: geometry
                    };
                }).filter(feature => feature.geometry !== null) // Filter out features without geometry
            };
        }

        if (!geojsonData.features || geojsonData.features.length === 0) {
            console.warn(`⚠️ No valid geometries found for layer: ${layerName}`);
            return null;
        }

        // Create Leaflet GeoJSON layer with optional styling
        if (styleFunction) {
            return L.geoJSON(geojsonData, {
                style: styleFunction,
                pointToLayer: (feature, latlng) => {
                    // Default point styling if not handled by style function
                    return L.circleMarker(latlng, {
                        radius: 8,
                        fillColor: "#ff7800",
                        color: "#000",
                        weight: 1,
                        opacity: 1,
                        fillOpacity: 0.8
                    });
                },
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
            return L.geoJSON(geojsonData, {
                pointToLayer: (feature, latlng) => {
                    // Default styling based on layer name
                    let style = {
                        radius: 8,
                        fillColor: "#ff7800",
                        color: "#000",
                        weight: 1,
                        opacity: 1,
                        fillOpacity: 0.8
                    };

                    // Different colors based on layer type
                    switch (layerName) {
                        case 'light_pollution_measurements':
                            const brightness = feature.properties.brightness || feature.properties.sqm_value || 0;
                            if (brightness >= 20) style.fillColor = '#006600';  // Dark green for natural
                            else if (brightness >= 18) style.fillColor = '#00aa00';  // Green for low pollution
                            else if (brightness >= 16) style.fillColor = '#ffff00';  // Yellow for moderate
                            else if (brightness >= 14) style.fillColor = '#ff8800';  // Orange for high
                            else style.fillColor = '#ff0000';  // Red for extreme
                            break;
                            
                        case 'dark_sky_parks':
                            style.fillColor = '#006600';  // Green for dark sky areas
                            style.radius = 10;
                            break;
                    }

                    return L.circleMarker(latlng, style);
                },
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
    }

    /**
     * Get current status of all data sources
     */
    async getStatus() {
        const vectorStatus = await this.testVectorSource(this.vectorSources.primary);
        const rasterStatus = await this.testRasterSource(this.rasterSources.primary);
        
        return {
            vector: {
                primary: this.vectorSources.primary,
                status: vectorStatus
            },
            raster: {
                primary: this.rasterSources.primary,
                status: rasterStatus
            },
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Switch primary vector source
     */
    setVectorSource(source) {
        if (['supabase', 'sample_points'].includes(source)) {
            this.vectorSources.primary = source;
            console.log(`✅ Vector source switched to: ${source}`);
            return true;
        }
        return false;
    }

    /**
     * Switch primary raster source
     */
    setRasterSource(source) {
        if (['geoserver', 'api'].includes(source)) {
            this.rasterSources.primary = source;
            console.log(`✅ Raster source switched to: ${source}`);
            return true;
        }
        return false;
    }
}

// Initialize global DataSourceManager
window.DataSourceManager = DataSourceManager;

console.log('🌍 Data Source Manager module loaded');