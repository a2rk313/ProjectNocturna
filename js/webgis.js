// js/webgis.js - Complete with base layer management
class WebGIS {
    constructor() {
        this.map = null;
        this.dataManager = window.DataManager ? new window.DataManager() : null;
        this.dataSourceManager = window.DataSourceManager ? new window.DataSourceManager() : null;
        this.gibsManager = null; // Initialize GIBS manager
        this.currentMode = null;
        this.drawnItems = new L.FeatureGroup();
        this.uiMarkers = L.layerGroup();
        this.stationsLayer = L.layerGroup();
        this.researchLayer = L.layerGroup();
        this.layers = {};
        this.drawControl = null;
        this.isLoading = false; // Track loading state
        
        // Performance optimization: Debounce functions
        this.debounceTimers = {};
        
        // Initialize marker cluster if available
        if (typeof L.markerClusterGroup === 'function') {
            this.stationsLayer = L.markerClusterGroup({ 
                disableClusteringAtZoom: 16,
                spiderfyOnMaxZoom: false,
                showCoverageOnHover: false
            });
        }

        this.initMap();
        this.initializeDrawControl();
        this.initEventBusListeners();
        this.setupLayerControls();
        this.setupBaseLayerControls();
        
        // Initialize GIBS Manager
        this.initializeGIBSManager();
        
        // Initialize GeoServer Manager
        this.initializeGeoServerManager();
        
        // Initialize Data Source Manager
        this.initializeDataSourceManager();
        
        // Initialize ActionBot if available
        if (window.ActionBotController) {
            this.actionBot = new window.ActionBotController(this);
            this.actionBot.initialize();
            console.log("✅ ActionBot Connected");
        }
        
        // Performance optimization: Add map moveend debouncing
        this.map.on('moveend', this.debounce(() => {
            this.handleMapMove();
        }, 500));
    }

    async initializeGIBSManager() {
        try {
            // Wait for GIBSManager to be loaded
            if (typeof GIBSManager !== 'function') {
                console.warn('⚠️ GIBSManager not available, loading dynamically...');
                // Try to load the GIBS manager script
                await this.loadScript('/js/gibs-manager.js');
            }

            if (typeof GIBSManager === 'function') {
                this.gibsManager = new GIBSManager(this.map);
                const initialized = await this.gibsManager.initialize();
                
                if (initialized) {
                    console.log('🌍 GIBS Manager initialized successfully');
                    
                    // Add event listeners for GIBS-related functionality
                    this.setupGIBSEventListeners();
                } else {
                    console.warn('⚠️ GIBS Manager failed to initialize');
                }
            } else {
                console.warn('⚠️ GIBSManager class not available');
            }
        } catch (error) {
            console.error('❌ Error initializing GIBS Manager:', error);
        }
    }
    
    async initializeGeoServerManager() {
        try {
            // Wait for GeoServerManager to be loaded
            if (typeof GeoServerManager !== 'function') {
                console.warn('⚠️ GeoServerManager not available, loading dynamically...');
                // Try to load the GeoServer manager script
                await this.loadScript('/js/geoserver-manager.js');
            }

            if (typeof GeoServerManager === 'function') {
                this.geoServerManager = new GeoServerManager(this.map);
                console.log('🌍 GeoServer Manager initialized successfully');
                
                // Add event listeners for GeoServer-related functionality
                this.setupGeoServerEventListeners();
            } else {
                console.warn('⚠️ GeoServerManager class not available');
            }
        } catch (error) {
            console.error('❌ Error initializing GeoServer Manager:', error);
        }
    }
    
    async initializeDataSourceManager() {
        try {
            // Wait for DataSourceManager to be loaded
            if (typeof DataSourceManager !== 'function') {
                console.warn('⚠️ DataSourceManager not available, loading dynamically...');
                // Try to load the DataSourceManager script
                await this.loadScript('/js/data-source-manager.js');
            }

            if (typeof DataSourceManager === 'function') {
                this.dataSourceManager = new DataSourceManager();
                
                // Initialize the data source manager
                const initResult = await this.dataSourceManager.initialize();
                console.log('🌍 Data Source Manager initialized successfully');
                console.log('📊 Vector source status:', initResult.vector.status);
                console.log('🌐 Raster source status:', initResult.raster.status);
                
                // Add event listeners for data source-related functionality
                this.setupDataSourceEventListeners();
            } else {
                console.warn('⚠️ DataSourceManager class not available');
            }
        } catch (error) {
            console.error('❌ Error initializing Data Source Manager:', error);
        }
    }
    
    setupGeoServerEventListeners() {
        // Add event listeners for GeoServer-related functionality
        console.log('🌍 GeoServer Event listeners set up');
    }
    
    setupDataSourceEventListeners() {
        // Add event listeners for data source-related functionality
        console.log('🌍 Data Source Event listeners set up');
    }

    // Helper method to load script dynamically
    loadScript(src) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = src;
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    setupGIBSEventListeners() {
        // Add event listeners for GIBS-related functionality
        // This can be expanded based on specific requirements
        console.log('🌍 GIBS Event listeners set up');
    }
    
    /**
     * Debounce function to optimize performance
     */
    debounce(func, wait) {
        return (...args) => {
            clearTimeout(this.debounceTimers[func.name]);
            this.debounceTimers[func.name] = setTimeout(() => func.apply(this, args), wait);
        };
    }
    
    /**
     * Handle map move events with debouncing
     */
    handleMapMove() {
        if (this.currentMode === 'scientific' && this.scientificMode) {
            // Update scientific overlays when map moves
            this.scientificMode.updateOverlaysForBounds(this.map.getBounds());
        }
    }

    initMap() {
        // Create map
        this.map = L.map('map', { 
            zoomControl: false,
            center: [20, 0],
            zoom: 2,
            minZoom: 2,
            maxZoom: 19
        });
        
        L.control.zoom({ position: 'bottomright' }).addTo(this.map);

        // Base layers - REAL data sources
        this.baseLayers = {
            "dark": L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', { 
                attribution: '© OpenStreetMap, CARTO',
                maxZoom: 19
            }),
            "viirs": L.tileLayer('https://map1.vis.earthdata.nasa.gov/wmts-webmerc/VIIRS_CityLights_2012/default/GoogleMapsCompatible_Level8/{z}/{y}/{x}.jpg', {
                attribution: 'Imagery © NASA Earth Observatory',
                maxZoom: 8
            }),
            "satellite": L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', { 
                attribution: '© Esri',
                maxZoom: 19
            }),
            "topo": L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenTopoMap',
                maxZoom: 17
            })
        };
        
        // Start with Dark Matter base layer
        this.baseLayers.dark.addTo(this.map);
        this.map.addLayer(this.drawnItems);
        this.map.addLayer(this.uiMarkers);
        this.map.addLayer(this.stationsLayer);

        // Add VIIRS data layer (real data)
        this.loadVIIRSDataLayer();
        
        // Add legend for light pollution data
        this.addLightPollutionLegend();
        
        // Add legend for Bortle Scale
        this.addBortleScaleLegend();
        
        // Draw event
        this.map.on(L.Draw.Event.CREATED, (e) => {
            this.drawnItems.clearLayers();
            const layer = e.layer;
            this.drawnItems.addLayer(layer);
            const type = e.layerType === 'marker' ? 'Point' : 'Region';
            window.SystemBus.emit('system:message', `✅ ${type} selected.`);
            
            // If in scientific mode, trigger analysis
            if (this.currentMode === 'scientific' && this.scientificMode) {
                const selection = this.getSelection();
                if (selection && selection.geometry) {
                    this.scientificMode.analyzeSelectedArea(selection.geometry);
                }
            }
        });

        console.log("🗺️ Map initialized with real data layers");
    }
    
    addLightPollutionLegend() {
        // Create a custom legend control
        const legend = L.control({position: 'bottomright'});
        
        legend.onAdd = function (map) {
            const div = L.DomUtil.create('div', 'lp-legend');
            
            div.innerHTML = `
                <div class="lp-legend-title">Light Pollution Intensity</div>
                <div class="lp-legend-scale">
                    <div class="lp-legend-item">
                        <div class="lp-legend-color lp-natural-color"></div>
                        <span>Natural Darkness</span>
                    </div>
                    <div class="lp-legend-item">
                        <div class="lp-legend-color lp-low-color"></div>
                        <span>Low Pollution</span>
                    </div>
                    <div class="lp-legend-item">
                        <div class="lp-legend-color lp-moderate-color"></div>
                        <span>Moderate Pollution</span>
                    </div>
                    <div class="lp-legend-item">
                        <div class="lp-legend-color lp-high-color"></div>
                        <span>High Pollution</span>
                    </div>
                    <div class="lp-legend-item">
                        <div class="lp-legend-color lp-extreme-color"></div>
                        <span>Extreme Pollution</span>
                    </div>
                </div>
                <div class="dataset-source">NASA VIIRS DNB Composite</div>
            `;
            
            return div;
        };
        
        legend.addTo(this.map);
    }
    
    // Add Bortle Scale Legend
    addBortleScaleLegend() {
        // Create a custom legend control for Bortle Scale
        const legend = L.control({position: 'bottomleft'});
        
        legend.onAdd = function (map) {
            const div = L.DomUtil.create('div', 'bortle-legend');
            
            div.innerHTML = `
                <div class="bortle-legend-title">Bortle Scale Classification</div>
                <div class="bortle-legend-scale">
                    <div class="bortle-legend-item">
                        <div class="bortle-legend-color bortle-1-color"></div>
                        <span>Class 1: Excellent Dark Sky</span>
                    </div>
                    <div class="bortle-legend-item">
                        <div class="bortle-legend-color bortle-2-color"></div>
                        <span>Class 2: Typical True Dark Sky</span>
                    </div>
                    <div class="bortle-legend-item">
                        <div class="bortle-legend-color bortle-3-color"></div>
                        <span>Class 3: Rural Sky</span>
                    </div>
                    <div class="bortle-legend-item">
                        <div class="bortle-legend-color bortle-4-color"></div>
                        <span>Class 4: Rural/Suburban Transition</span>
                    </div>
                    <div class="bortle-legend-item">
                        <div class="bortle-legend-color bortle-5-color"></div>
                        <span>Class 5: Suburban Sky</span>
                    </div>
                    <div class="bortle-legend-item">
                        <div class="bortle-legend-color bortle-6-color"></div>
                        <span>Class 6: Bright Suburban Sky</span>
                    </div>
                    <div class="bortle-legend-item">
                        <div class="bortle-legend-color bortle-7-color"></div>
                        <span>Class 7: Suburban/Urban Transition</span>
                    </div>
                    <div class="bortle-legend-item">
                        <div class="bortle-legend-color bortle-8-color"></div>
                        <span>Class 8: City Sky</span>
                    </div>
                    <div class="bortle-legend-item">
                        <div class="bortle-legend-color bortle-9-color"></div>
                        <span>Class 9: Inner City Sky</span>
                    </div>
                </div>
                <div class="dataset-source">Astronomical Visibility Classification</div>
            `;
            
            return div;
        };
        
        legend.addTo(this.map);
    }

    async loadVIIRSDataLayer() {
        // Rate limiting: prevent too frequent API calls
        const now = Date.now();
        if (this.lastVIIRSLoad && (now - this.lastVIIRSLoad) < 3000) { // 3 second minimum interval
            return; // Too soon to load again
        }
        this.lastVIIRSLoad = now;
        try {
            // Load VIIRS data for current view
            const bounds = this.map.getBounds();
            const bbox = `${bounds.getWest()},${bounds.getSouth()},${bounds.getEast()},${bounds.getNorth()}`;
            
            const response = await fetch(`/api/viirs/2023?bbox=${bbox}`);
            
            if (!response.ok) {
                throw new Error(`VIIRS API request failed with status ${response.status}`);
            }
            
            let data;
            try {
                const responseText = await response.text();
                data = JSON.parse(responseText);
            } catch (parseError) {
                console.error('VIIRS data JSON parsing error:', parseError);
                console.log('Raw response:', await response.text());
                return;
            }
            
            const viirsData = data.data || [];
            console.log(`📡 VIIRS API Response: ${viirsData.length} data points, source: ${data.source}`);
            
            if (viirsData.length > 0) {
                // Create heatmap layer if leaflet.heat plugin is available
                if (typeof L.heatLayer !== 'function') {
                    console.warn('VIIRS data load failed: L.heatLayer function not available');
                    return;
                }
                
                // Filter out any points that don't have valid coordinates or brightness
                const validData = viirsData.filter(point => 
                    point.lat && point.lng && point.brightness !== undefined && 
                    !isNaN(point.lat) && !isNaN(point.lng) && !isNaN(point.brightness)
                );
                
                if (validData.length > 0) {
                    // Create heat data with weighted values based on brightness
                    const heatData = validData.map(point => [point.lat, point.lng, point.brightness]);
                    
                    // Remove existing VIIRS layer if present
                    if (this.viirsLayer) {
                        this.map.removeLayer(this.viirsLayer);
                    }
                    
                    this.viirsLayer = L.heatLayer(heatData, {
                        radius: 20,
                        blur: 15,
                        maxZoom: 12,
                        minOpacity: 0.3,
                        gradient: {
                            0.1: '#000080',   // Deep blue for low values
                            0.3: '#0000FF',   // Blue
                            0.5: '#0080FF',   // Light blue
                            0.6: '#00FFFF',   // Cyan
                            0.7: '#00FF00',   // Green
                            0.8: '#FFFF00',   // Yellow
                            0.9: '#FF8000',   // Orange
                            1.0: '#FF0000'    // Red for high values
                        }
                    }).addTo(this.map);
                    
                    console.log(`✅ Loaded ${validData.length} valid VIIRS data points`);
                } else {
                    console.log('⚠️ No valid VIIRS data points available for current map view.');
                }
            } else {
                console.log('⚠️ No VIIRS data available for current map view.');
            }
        } catch (error) {
            console.warn('VIIRS data load failed:', error);
        }
    }
    
    // Load a more detailed VIIRS tile layer for better visualization
    loadVIIRSTileLayer() {
        // Remove existing VIIRS layer if present
        if (this.viirsTileLayer) {
            this.map.removeLayer(this.viirsTileLayer);
        }
        
        // Create a tile layer that shows NASA's VIIRS nighttime lights
        this.viirsTileLayer = L.tileLayer('https://map1.vis.earthdata.nasa.gov/wmts-webmerc/VIIRS_CityLights_2012/default/{time}/{tilematrixset}{maxZoom}/{z}/{y}/{x}.{format}', {
            attribution: 'Imagery provided by services from the Global Imagery Browse Services (GIBS), operated by the NASA/GSFC/Earth Science Data and Information System (<a href=\"https://earthdata.nasa.gov\">ESDIS</a>) with funding provided by NASA/HQ.',
            tilematrixset: 'GoogleMapsCompatible_Level8/',
            maxZoom: 8,
            format: 'jpg',
            time: '',
            opacity: 0.8
        });
        
        this.viirsTileLayer.addTo(this.map);
    }

    initializeDrawControl() {
        if (this.drawControl) return;

        this.drawControl = new L.Control.Draw({
            edit: { featureGroup: this.drawnItems },
            draw: {
                polygon: { 
                    allowIntersection: false, 
                    showArea: true,
                    shapeOptions: {
                        color: '#00ffff',
                        fillOpacity: 0.3
                    }
                },
                marker: {
                    icon: L.divIcon({
                        className: 'custom-marker',
                        html: '<i class="fas fa-map-marker-alt text-danger" style="font-size: 24px;"></i>'
                    })
                },
                circle: false,
                rectangle: {
                    shapeOptions: {
                        color: '#00ffff',
                        fillOpacity: 0.3
                    }
                },
                polyline: false,
                circlemarker: false
            }
        });

        this.map.addControl(this.drawControl);
        
        // Hide default toolbar
        const toolbar = document.querySelector('.leaflet-draw-toolbar');
        if (toolbar) toolbar.style.display = 'none';
    }

    setupBaseLayerControls() {
        const baseMapButtons = document.querySelectorAll('.basemap-option');
        
        baseMapButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                // Remove active class from all buttons
                baseMapButtons.forEach(btn => {
                    btn.classList.remove('active');
                    btn.classList.remove('btn-cosmic-primary');
                    btn.classList.add('btn-outline-light');
                });
                
                // Add active class to clicked button
                e.target.classList.add('active');
                e.target.classList.add('btn-cosmic-primary');
                e.target.classList.remove('btn-outline-light');
                
                // Get the base map type
                const baseMapType = e.target.dataset.basemap;
                
                // Switch base layer
                this.switchBaseLayer(baseMapType);
            });
        });
    }

    switchBaseLayer(baseMapType) {
        // Remove all base layers
        Object.values(this.baseLayers).forEach(layer => {
            this.map.removeLayer(layer);
        });
        
        // Add selected layer
        if (this.baseLayers[baseMapType]) {
            this.baseLayers[baseMapType].addTo(this.map);
            window.SystemBus.emit('system:message', `✅ Switched to ${baseMapType} base map`);
        } else if (baseMapType === 'viirs') {
            // Special handling for NASA Black Marble layer
            if (this.blackMarbleLayer) {
                this.map.removeLayer(this.blackMarbleLayer);
            }
            
            this.blackMarbleLayer = L.tileLayer('https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/BlackMarble_2016/default//GoogleMapsCompatible_Level8/{z}/{y}/{x}.jpg', {
                attribution: 'NASA Black Marble imagery',
                maxZoom: 8,
                // Add error handling for tile loading failures
                errorTileUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', // Transparent 1x1 pixel
                // Retry mechanism
                subdomains: ['gibs.earthdata.nasa.gov', 'map1.vis.earthdata.nasa.gov', 'map2.vis.earthdata.nasa.gov']
            });
            
            // Add event listeners for tile loading errors
            this.blackMarbleLayer.on('tileerror', function(error) {
                console.warn('Failed to load Black Marble tile:', error);
            });
            
            this.blackMarbleLayer.addTo(this.map);
            window.SystemBus.emit('system:message', `✅ Switched to NASA Black Marble base map`);
        }
    }

    setupLayerControls() {
        // Toggle VIIRS data (raster layer - uses DataSourceManager for fallback)
        const toggleVIIRS = document.getElementById('toggleVIIRS');
        if (toggleVIIRS) {
            toggleVIIRS.addEventListener('change', (e) => {
                if (e.target.checked) {
                    if (this.viirsLayer) {
                        this.map.addLayer(this.viirsLayer);
                    } else {
                        // Try to load via DataSourceManager first, fallback to original method
                        if (this.dataSourceManager) {
                            this.dataSourceManager.addRasterLayerToMap(this.map, 'viirs_nightlights', {
                                options: { opacity: 0.7 }
                            }).then(result => {
                                if (result.success) {
                                    this.viirsLayer = result.layer;
                                    console.log(`✅ VIIRS layer loaded from ${result.source} source`);
                                } else {
                                    // Fallback to original method
                                    this.loadVIIRSDataLayer();
                                }
                            }).catch(error => {
                                console.warn('VIIRS layer from DataSourceManager failed, using fallback:', error);
                                this.loadVIIRSDataLayer();
                            });
                        } else {
                            this.loadVIIRSDataLayer();
                        }
                    }
                } else {
                    if (this.viirsLayer) {
                        this.map.removeLayer(this.viirsLayer);
                    }
                }
            });
        }

        // Toggle ground stations (vector layer - uses DataSourceManager for fallback)
        const toggleGroundStations = document.getElementById('toggleGroundStations');
        if (toggleGroundStations) {
            toggleGroundStations.addEventListener('change', (e) => {
                if (e.target.checked) {
                    // Try to load via DataSourceManager first, fallback to original method
                    if (this.dataSourceManager) {
                        this.dataSourceManager.addVectorLayerToMap(this.map, 'light_pollution_measurements').then(result => {
                            if (result.success) {
                                this.stationsLayer = result.layer;
                                this.map.addLayer(this.stationsLayer);
                                console.log(`✅ Ground stations loaded from ${result.source} source`);
                            } else {
                                // Fallback to original method
                                this.map.addLayer(this.stationsLayer);
                                this.loadStationsData();
                            }
                        }).catch(error => {
                            console.warn('Ground stations from DataSourceManager failed, using fallback:', error);
                            this.map.addLayer(this.stationsLayer);
                            this.loadStationsData();
                        });
                    } else {
                        this.map.addLayer(this.stationsLayer);
                        this.loadStationsData();
                    }
                } else {
                    this.map.removeLayer(this.stationsLayer);
                }
            });
        }

        // Toggle World Atlas layer (raster layer - uses DataSourceManager for fallback)
        const toggleWorldAtlas = document.getElementById('toggleWorldAtlas');
        if (toggleWorldAtlas) {
            toggleWorldAtlas.addEventListener('change', (e) => {
                if (e.target.checked) {
                    // Add world atlas layer if available
                    if (this.worldAtlasLayer) {
                        this.map.addLayer(this.worldAtlasLayer);
                    } else {
                        // Try to load via DataSourceManager first, fallback to original method
                        if (this.dataSourceManager) {
                            this.dataSourceManager.addRasterLayerToMap(this.map, 'world_atlas_brightness', {
                                options: { opacity: 0.7 }
                            }).then(result => {
                                if (result.success) {
                                    this.worldAtlasLayer = result.layer;
                                    console.log(`✅ World Atlas layer loaded from ${result.source} source`);
                                } else {
                                    // Fallback to original method
                                    this.loadWorldAtlasLayer();
                                }
                            }).catch(error => {
                                console.warn('World Atlas from DataSourceManager failed, using fallback:', error);
                                this.loadWorldAtlasLayer();
                            });
                        } else {
                            this.loadWorldAtlasLayer();
                        }
                    }
                } else {
                    if (this.worldAtlasLayer) {
                        this.map.removeLayer(this.worldAtlasLayer);
                    }
                }
            });
        }

        // Layer opacity slider
        const opacitySlider = document.getElementById('layerOpacitySlider');
        if (opacitySlider) {
            opacitySlider.addEventListener('input', (e) => {
                const value = e.target.value;
                document.getElementById('opacityValue').textContent = value;

                // Update all active layers
                if (this.viirsLayer && this.viirsLayer.setOptions) {
                    this.viirsLayer.setOptions({ opacity: value / 100 });
                }

                if (this.viirsTileLayer) {
                    this.viirsTileLayer.setOpacity(value / 100);
                }

                if (this.scientificMode) {
                    this.scientificMode.setLayerOpacity(value / 100);
                }
            });
        }

        // Export layers button
        const exportBtn = document.getElementById('exportLayersBtn');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => {
                if (this.scientificMode) {
                    this.scientificMode.exportLayers();
                } else {
                    this.exportCurrentView();
                }
            });
        }
    }
    
    // Load World Atlas layer for research-grade visualization
    loadWorldAtlasLayer() {
        // Remove existing world atlas layer if present
        if (this.worldAtlasLayer) {
            this.map.removeLayer(this.worldAtlasLayer);
        }
        
        // Create a tile layer showing light pollution data using NASA's Black Marble dataset
        this.worldAtlasLayer = L.tileLayer('https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/BlackMarble_2016/default//GoogleMapsCompatible_Level8/{z}/{y}/{x}.jpg', {
            attribution: 'NASA Black Marble imagery',
            opacity: 0.7,
            zIndex: 100,
            // Add error handling for tile loading failures
            errorTileUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', // Transparent 1x1 pixel
            // Retry mechanism
            subdomains: ['gibs.earthdata.nasa.gov', 'map1.vis.earthdata.nasa.gov', 'map2.vis.earthdata.nasa.gov']
        });
        
        // Add event listeners for tile loading errors
        this.worldAtlasLayer.on('tileerror', function(error) {
            console.warn('Failed to load World Atlas tile:', error);
        });
        
        this.worldAtlasLayer.addTo(this.map);
    }

    async loadStationsData() {
        try {
            const url = window.AppConfig ? 
                window.AppConfig.getApiUrl('stations') : 
                '/api/stations';
                
            const res = await fetch(url);
            if (!res.ok) throw new Error("API Error");
            const stations = await res.json();

            const markers = stations.map(s => {
                const color = s.is_research_grade ? '#00ff00' : '#ffff00';
                const marker = L.circleMarker([s.lat, s.lng], { 
                    radius: 6, 
                    fillColor: color, 
                    color: '#000', 
                    weight: 1, 
                    fillOpacity: 0.8 
                }).bindPopup(this.createStationPopup(s));
                
                return marker;
            });

            this.stationsLayer.clearLayers();
            this.stationsLayer.addLayers(markers);
            
            console.log(`✅ Loaded ${stations.length} ground stations`);
        } catch(e) {
            console.error("Station Load Error:", e);
        }
    }

    createStationPopup(station) {
        return `
            <div class="station-popup">
                <h6><i class="fas fa-rss"></i> Ground Measurement</h6>
                <table class="table table-sm table-borderless">
                    <tr><td><strong>Location:</strong></td><td>${station.lat.toFixed(4)}, ${station.lng.toFixed(4)}</td></tr>
                    <tr><td><strong>SQM Reading:</strong></td><td>${station.sqm || 'N/A'}</td></tr>
                    <tr><td><strong>Bortle Class:</strong></td><td>${station.mag || 'N/A'}</td></tr>
                    <tr><td><strong>Date:</strong></td><td>${new Date(station.date_observed).toLocaleDateString()}</td></tr>
                    <tr><td><strong>Source:</strong></td><td>${station.source || 'Unknown'}</td></tr>
                </table>
                ${station.is_research_grade ? '<span class="badge bg-success">Research Grade</span>' : '<span class="badge bg-info">Citizen Science</span>'}
            </div>
        `;
    }

    // =================== MODE MANAGEMENT ===================
    
    cleanupAllTools() {
        console.log("🧹 Cleaning up all tools...");
        
        // Hide scientific layers section
        const scientificLayers = document.getElementById('scientificLayers');
        if (scientificLayers) scientificLayers.style.display = 'none';
        
        // Hide layer settings
        const layerSettings = document.getElementById('layerSettings');
        if (layerSettings) layerSettings.style.display = 'none';
        
        // Nullify mode controllers
        this.citizenMode = null;
        this.scientificMode = null;
        
        // Hide both tool sets
        const citizenTools = document.getElementById('citizenTools');
        const scientificTools = document.getElementById('scientificTools');
        
        if (citizenTools) citizenTools.classList.remove('active');
        if (scientificTools) scientificTools.classList.remove('active');
    }

    async setMode(mode) {
        console.log(`🔄 Switching to ${mode} mode...`);
        
        const loader = document.getElementById('loadingScreen');
        if (loader) {
            const title = document.getElementById('loadingMode');
            if (title) title.innerText = mode.charAt(0).toUpperCase() + mode.slice(1);
            loader.style.display = 'flex';
            loader.style.opacity = '1';
        }
        
        return new Promise(async (resolve) => {
            try {
                // Use a more robust approach with async/await instead of setTimeout
                await new Promise(resolveInner => setTimeout(resolveInner, 800));
                
                // 1. Clean up previous mode completely
                this.cleanupAllTools();
                
                // 2. Update current mode
                this.currentMode = mode;
                
                // 3. Update UI
                this.updateUIForMode(mode);
                
                // 4. Initialize the new mode
                this.initializeMode(mode);
                
                // 5. Re-bind common UI listeners
                this.initUIListeners();
                
            } catch (error) {
                console.error(`Error during ${mode} mode initialization:`, error);
                window.SystemBus.emit('system:message', `⚠️ Error initializing ${mode} mode. Some features may not work properly.`);
            } finally {
                // 6. Always hide loader regardless of success or failure
                if (loader) {
                    loader.style.display = 'none';
                    loader.style.opacity = '0';
                }
                
                console.log(`✅ ${mode} mode activation attempt completed`);
                resolve(true);
            }
        });
    }

    updateUIForMode(mode) {
        console.log(`🎨 Updating UI for ${mode} mode`);
        
        const indicator = document.getElementById('modeIndicator');
        const title = document.getElementById('panelTitle');
        const assistant = document.getElementById('assistantName');
        const welcome = document.getElementById('welcomeMessage');
        const scientificLayers = document.getElementById('scientificLayers');
        
        if (mode === 'citizen') {
            if (indicator) {
                indicator.innerText = 'Citizen Mode';
                indicator.className = 'badge bg-success ms-2 mode-badge';
            }
            if (title) title.innerText = 'Stargazing Tools';
            if (assistant) assistant.innerText = 'Lumina';
            if (welcome) welcome.innerText = 'Hello! I\'m Lumina. Ask me to "Find dark sky spots".';
            if (scientificLayers) scientificLayers.style.display = 'none';
            
            // Show only citizen tools
            const citizenTools = document.getElementById('citizenTools');
            const scientificTools = document.getElementById('scientificTools');
            
            if (citizenTools) citizenTools.classList.add('active');
            if (scientificTools) scientificTools.classList.remove('active');
            
        } else if (mode === 'scientific') {
            if (indicator) {
                indicator.innerText = 'Scientific Mode';
                indicator.className = 'badge bg-warning ms-2 mode-badge';
            }
            if (title) title.innerText = 'Scientific Analysis';
            if (assistant) assistant.innerText = 'Lumina Pro';
            if (welcome) welcome.innerText = 'Scientific Mode active. Use draw tools to analyze areas.';
            if (scientificLayers) scientificLayers.style.display = 'block';
            
            // Show only scientific tools
            const citizenTools = document.getElementById('citizenTools');
            const scientificTools = document.getElementById('scientificTools');
            
            if (citizenTools) citizenTools.classList.remove('active');
            if (scientificTools) scientificTools.classList.add('active');
        }
    }

    initializeMode(mode) {
        console.log(`⚙️ Initializing ${mode} mode controller...`);
        
        try {
            if (mode === 'citizen') {
                if (window.CitizenMode) {
                    this.citizenMode = new window.CitizenMode(this);
                    this.citizenMode.initialize();
                    console.log("✅ Citizen Mode initialized");
                } else {
                    console.warn("⚠️ CitizenMode class not available");
                }
            } else if (mode === 'scientific') {
                if (window.ScientificMode) {
                    this.scientificMode = new window.ScientificMode(this);
                    this.scientificMode.initialize();
                    console.log("✅ Scientific Mode initialized");
                    
                    // Setup scientific layer controls
                    this.setupScientificLayerControls();
                } else {
                    console.warn("⚠️ ScientificMode class not available");
                }
            }
        } catch (error) {
            console.error(`❌ Error initializing ${mode} mode:`, error);
            window.SystemBus.emit('system:message', `⚠️ Error initializing ${mode} mode: ${error.message}`);
        }
    }

    setupScientificLayerControls() {
        // Ecological Impact
        const ecoToggle = document.getElementById('toggleEcoImpact');
        if (ecoToggle && this.scientificMode) {
            ecoToggle.addEventListener('change', (e) => {
                this.scientificMode.toggleEcoImpact(e.target.checked);
            });
        }

        // Spectral Analysis
        const spectralToggle = document.getElementById('toggleSpectral');
        if (spectralToggle && this.scientificMode) {
            spectralToggle.addEventListener('change', (e) => {
                this.scientificMode.toggleSpectral(e.target.checked);
            });
        }

        // Heatmap
        const heatmapToggle = document.getElementById('toggleHeatmap');
        if (heatmapToggle && this.scientificMode) {
            heatmapToggle.addEventListener('change', (e) => {
                this.scientificMode.toggleHeatmap(e.target.checked);
            });
        }

        // World Atlas
        const worldAtlasToggle = document.getElementById('toggleWorldAtlas');
        if (worldAtlasToggle && this.scientificMode) {
            worldAtlasToggle.addEventListener('change', (e) => {
                this.scientificMode.toggleWorldAtlas(e.target.checked);
            });
        }
    }

    // =================== COMMON METHODS ===================
    
    getSelection() {
        const layers = this.drawnItems.getLayers();
        if (layers.length === 0) return null;
        
        const layer = layers[layers.length - 1];
        const geoJSON = layer.toGeoJSON();
        let center;
        
        if (layer.getLatLng) center = layer.getLatLng();
        else if (layer.getBounds) center = layer.getBounds().getCenter();
        
        return {
            layer: layer,
            geoJSON: geoJSON,
            geometry: geoJSON.geometry,
            type: geoJSON.geometry.type,
            center: center
        };
    }

    setGPSLocation(lat, lng) {
        this.drawnItems.clearLayers();
        const marker = L.marker([lat, lng]);
        this.drawnItems.addLayer(marker);
        this.map.flyTo([lat, lng], 12);
        window.SystemBus.emit('system:message', "✅ GPS Location selected.");
    }

    // =================== UI LISTENERS ===================
    
    initUIListeners() {
        console.log("🔗 Binding UI listeners...");
        
        // Mode switcher
        const switchBtn = document.getElementById('switchMode');
        if (switchBtn) {
            switchBtn.onclick = () => {
                const newMode = this.currentMode === 'citizen' ? 'scientific' : 'citizen';
                this.setMode(newMode);
            };
        }
        
        // Data sources
        const dataBtn = document.getElementById('dataSources');
        if (dataBtn) {
            dataBtn.onclick = () => {
                const content = `
                    <div class="expert-modal">
                        <h5>📚 Data Sources & Citations</h5>
                        <div class="research-paper">
                            <h6>Primary Data Sources</h6>
                            <ul>
                                <li><strong>NASA VIIRS Nighttime Lights:</strong> Suomi NPP & NOAA-20 satellites</li>
                                <li><strong>NASA Black Marble:</strong> Corrected nighttime lights annual data</li>
                                <li><strong>World Atlas of Artificial Night Sky Brightness:</strong> Falchi et al. (2016)</li>
                                <li><strong>SQM-LE Network:</strong> Global ground measurements</li>
                                <li><strong>International Dark-Sky Association:</strong> Certified parks database</li>
                            </ul>
                            <h6>Research Citations</h6>
                            <p>Falchi, F., et al. (2016). The new world atlas of artificial night sky brightness.</p>
                            <p>Kyba, C. C., et al. (2017). Artificially lit surface of Earth at night increasing.</p>
                            <p>Gaston, K. J., et al. (2013). The ecological impacts of nighttime light pollution.</p>
                        </div>
                    </div>
                `;
                window.SystemBus.emit('ui:show_modal', { title: "Data Sources", content: content });
            };
        }
        
        // Time controls
        this.initTimeControls();
        
        // Drawing tools
        const drawBtn = document.getElementById('drawPolygon');
        if (drawBtn) {
            drawBtn.onclick = () => this.startTool('polygon');
        }
        
        const dropBtn = document.getElementById('dropMarker');
        if (dropBtn) {
            dropBtn.onclick = () => this.startTool('marker');
        }
        
        const clearBtn = document.getElementById('clearAll');
        if (clearBtn) {
            clearBtn.onclick = () => {
                this.drawnItems.clearLayers();
                this.uiMarkers.clearLayers();
                window.SystemBus.emit('system:message', "🗑️ Selection cleared.");
            };
        }
        
        // Panel collapse functionality
        this.setupPanelCollapse();
        
        // Chat listeners
        this.initChatListeners();
    }
    
    initTimeControls() {
        // Year selector
        const yearSelector = document.getElementById('yearSelector');
        if (yearSelector) {
            yearSelector.addEventListener('change', (e) => {
                const selectedYear = e.target.value;
                window.SystemBus.emit('system:message', `📅 Year changed to ${selectedYear}`);
                
                // Reload data for the selected year
                if (document.getElementById('toggleVIIRS').checked) {
                    this.loadVIIRSDataLayer(selectedYear);
                }
                
                if (document.getElementById('toggleWorldAtlas').checked) {
                    // For Black Marble 2016 specifically
                    if (selectedYear === '2016') {
                        this.loadWorldAtlasLayer();
                    }
                }
            });
        }
        
        // Compare years button
        const compareBtn = document.getElementById('compareYears');
        if (compareBtn) {
            compareBtn.addEventListener('click', () => {
                this.compareYears();
            });
        }
        
        // Trend analysis button
        const trendBtn = document.getElementById('trendAnalysis');
        if (trendBtn) {
            trendBtn.addEventListener('click', () => {
                this.performTrendAnalysis();
            });
        }
    }
    
    async loadVIIRSDataLayer(year = '2023') {
        try {
            // Load VIIRS data for current view
            const bounds = this.map.getBounds();
            const bbox = `${bounds.getWest()},${bounds.getSouth()},${bounds.getEast()},${bounds.getNorth()}`;
            
            // Construct API endpoint with year parameter
            const response = await fetch(`/api/viirs/${year}?bbox=${bbox}`);
            
            if (!response.ok) {
                throw new Error(`VIIRS API request failed with status ${response.status}`);
            }
            
            let data;
            try {
                const responseText = await response.text();
                data = JSON.parse(responseText);
            } catch (parseError) {
                console.error('VIIRS data JSON parsing error:', parseError);
                console.log('Raw response:', await response.text());
                return;
            }
            
            const viirsData = data.data || [];
            console.log(`📡 VIIRS API Response: ${viirsData.length} data points, source: ${data.source}, year: ${year}`);
            
            if (viirsData.length > 0) {
                // Create heatmap layer if leaflet.heat plugin is available
                if (typeof L.heatLayer !== 'function') {
                    console.warn('VIIRS data load failed: L.heatLayer function not available');
                    return;
                }
                
                // Filter out any points that don't have valid coordinates or brightness
                const validData = viirsData.filter(point => 
                    point.lat && point.lng && point.brightness !== undefined && 
                    !isNaN(point.lat) && !isNaN(point.lng) && !isNaN(point.brightness)
                );
                
                if (validData.length > 0) {
                    // Create heat data with weighted values based on brightness
                    const heatData = validData.map(point => [point.lat, point.lng, point.brightness]);
                    
                    // Remove existing VIIRS layer if present
                    if (this.viirsLayer) {
                        this.map.removeLayer(this.viirsLayer);
                    }
                    
                    this.viirsLayer = L.heatLayer(heatData, {
                        radius: 20,
                        blur: 15,
                        maxZoom: 12,
                        minOpacity: 0.3,
                        gradient: {
                            0.1: '#000080',   // Deep blue for low values
                            0.3: '#0000FF',   // Blue
                            0.5: '#0080FF',   // Light blue
                            0.6: '#00FFFF',   // Cyan
                            0.7: '#00FF00',   // Green
                            0.8: '#FFFF00',   // Yellow
                            0.9: '#FF8000',   // Orange
                            1.0: '#FF0000'    // Red for high values
                        }
                    }).addTo(this.map);
                    
                    console.log(`✅ Loaded ${validData.length} valid VIIRS data points for year ${year}`);
                } else {
                    console.log('⚠️ No valid VIIRS data points available for current map view.');
                }
            } else {
                console.log('⚠️ No VIIRS data available for current map view.');
            }
        } catch (error) {
            console.warn('VIIRS data load failed:', error);
        }
    }
    
    compareYears() {
        // Show a comparison modal
        const content = `
            <div class="expert-modal">
                <h5>📊 Year Comparison</h5>
                <p>Select two years to compare light pollution changes over time.</p>
                <div class="row">
                    <div class="col-md-6">
                        <label for="year1">First Year</label>
                        <select class="form-select" id="year1">
                            <option value="2023">2023</option>
                            <option value="2022">2022</option>
                            <option value="2021">2021</option>
                            <option value="2020">2020</option>
                            <option value="2016">2016</option>
                        </select>
                    </div>
                    <div class="col-md-6">
                        <label for="year2">Second Year</label>
                        <select class="form-select" id="year2">
                            <option value="2023">2023</option>
                            <option value="2022">2022</option>
                            <option value="2021">2021</option>
                            <option value="2020">2020</option>
                            <option value="2016">2016</option>
                        </select>
                    </div>
                </div>
                <div class="mt-3">
                    <button class="btn btn-cosmic-primary w-100" id="performComparison">Compare</button>
                </div>
            </div>
        `;
        
        window.SystemBus.emit('ui:show_modal', { title: "Year Comparison", content: content });
        
        // Set up event listener for the comparison button
        setTimeout(() => {
            const compareButton = document.getElementById('performComparison');
            if (compareButton) {
                compareButton.addEventListener('click', () => {
                    const year1 = document.getElementById('year1').value;
                    const year2 = document.getElementById('year2').value;
                    this.performYearComparison(year1, year2);
                });
            }
        }, 100);
    }
    
    performYearComparison(year1, year2) {
        // Placeholder for actual comparison logic
        window.SystemBus.emit('system:message', `Comparing light pollution data between ${year1} and ${year2}...`);
        console.log(`Comparing ${year1} vs ${year2}`);
    }
    
    performTrendAnalysis() {
        // Placeholder for trend analysis
        window.SystemBus.emit('system:message', "Performing trend analysis...");
        console.log("Performing trend analysis");
    }

    setupPanelCollapse() {
        const panels = document.querySelectorAll('.cosmic-panel .panel-header');
        panels.forEach(panel => {
            // Handle clicks on the panel header (excluding buttons but allowing collapse icon)
            panel.addEventListener('click', (e) => {
                if (e.target.closest('.btn')) return;
                
                // If click is on collapse icon, toggle the collapse state
                if (e.target.closest('.collapse-icon')) {
                    e.preventDefault();
                    e.stopPropagation();
                }
                
                const panelBody = panel.nextElementSibling;
                const panelContainer = panel.closest('.cosmic-panel');
                const collapseIcon = panel.querySelector('.collapse-icon');
                
                if (panelContainer.classList.contains('panel-collapsed')) {
                    panelContainer.classList.remove('panel-collapsed');
                    if (collapseIcon) collapseIcon.classList.remove('fa-chevron-down');
                    if (collapseIcon) collapseIcon.classList.add('fa-chevron-up');
                } else {
                    panelContainer.classList.add('panel-collapsed');
                    if (collapseIcon) collapseIcon.classList.remove('fa-chevron-up');
                    if (collapseIcon) collapseIcon.classList.add('fa-chevron-down');
                }
            });
        });
    }

    initChatListeners() {
        const sendBtn = document.getElementById('send-message');
        const input = document.getElementById('user-input');
        
        if (!sendBtn || !input) return;
        
        const sendMessage = async () => {
            const text = input.value.trim();
            if (!text) return;
            
            this.addChatMessage(text, 'user');
            input.value = '';
            
            const loadingId = this.addChatMessage('<i class="fas fa-spinner fa-spin"></i> Thinking...', 'assistant');
            
            try {
                const response = await this.generateAIResponse(text);
                const loadingEl = document.getElementById(loadingId);
                if (loadingEl) {
                    loadingEl.innerHTML = `<div class="message-avatar"><i class="fas fa-robot"></i></div><div class="message-content">${response}</div>`;
                }
            } catch (error) {
                console.error(error);
                const loadingEl = document.getElementById(loadingId);
                if (loadingEl) loadingEl.innerHTML = "Error connecting to AI.";
            }
        };
        
        sendBtn.onclick = sendMessage;
        input.onkeypress = (e) => {
            if (e.key === 'Enter') sendMessage();
        };
    }

    startTool(type) {
        this.drawnItems.clearLayers();
        let drawer;
        
        if (type === 'polygon') {
            drawer = new L.Draw.Polygon(this.map, { 
                showArea: true, 
                shapeOptions: { 
                    color: '#00ffff',
                    fillOpacity: 0.3
                } 
            });
            window.SystemBus.emit('system:message', "🖊️ Draw a region on the map.");
        } else if (type === 'marker') {
            drawer = new L.Draw.Marker(this.map);
            window.SystemBus.emit('system:message', "📍 Click map to place marker.");
        }
        
        if (drawer) drawer.enable();
    }

    async generateAIResponse(message) {
        // Check if we have the enhanced chatbot available
        if (window.LightPollutionChatbot) {
            try {
                // Create a new instance of the chatbot
                const chatbot = new window.LightPollutionChatbot();
                
                // Prepare context for the chatbot
                const context = {
                    mapCenter: this.map.getCenter(),
                    hasSelection: this.drawnItems.getLayers().length > 0,
                    selectedArea: this.getSelection()
                };
                
                // Process the message with the enhanced chatbot
                const response = await chatbot.processMessage(message, context);
                
                // If the response has an action that should be executed, handle it
                if (response.action && response.action !== 'chat') {
                    this.handleChatbotAction(response);
                }
                
                // Return the message part of the response
                return response.message || "I processed your request successfully.";
            } catch (error) {
                console.error('Enhanced chatbot error:', error);
                // Fallback to basic response
                return "I'm having trouble processing your request. Could you try rephrasing?";
            }
        } else {
            // Fallback basic response
            return "I am ready. Use the tools to analyze light pollution data.";
        }
    }
    
    // Handle actions from the chatbot
    handleChatbotAction(response) {
        switch (response.action) {
            case 'zoom_to':
                if (response.location && response.location.lat && response.location.lng) {
                    this.map.flyTo([response.location.lat, response.location.lng], response.location.zoom || 10);
                    L.marker([response.location.lat, response.location.lng])
                        .addTo(this.map)
                        .bindPopup(`📍 ${response.location.name || 'Target Location'}`)
                        .openPopup();
                    this.addChatMessage(`✅ Zoomed to ${response.location.name || 'location'}`, 'assistant');
                }
                break;
                
            case 'extract_data':
                this.addChatMessage(response.message, 'assistant');
                // The user should already have selected an area
                if (this.currentMode === 'scientific' && this.scientificMode) {
                    const selection = this.getSelection();
                    if (selection && selection.geometry) {
                        this.scientificMode.analyzeSelectedArea(selection.geometry);
                    }
                }
                break;
                
            case 'dark_sky_found':
                if (response.spots && response.spots.length > 0) {
                    // Clear any existing dark sky markers
                    this.uiMarkers.clearLayers();
                    
                    // Add markers for dark sky locations
                    response.spots.forEach(spot => {
                        const marker = L.circleMarker([spot.lat, spot.lng], {
                            radius: 8,
                            fillColor: '#00ff00',
                            color: '#000',
                            weight: 1,
                            opacity: 1,
                            fillOpacity: 0.7
                        }).bindPopup(`<strong>${spot.name}</strong><br>Designation: ${spot.designation}<br>SQM: ${spot.sqm}`);
                        this.uiMarkers.addLayer(marker);
                    });
                    
                    this.map.addLayer(this.uiMarkers);
                    this.addChatMessage(`✅ Found ${response.spots.length} dark sky locations. Markers added to map.`, 'assistant');
                }
                break;
                
            case 'scientific_analysis':
                if (this.currentMode !== 'scientific') {
                    this.addChatMessage("Switching to scientific mode for detailed analysis...", 'assistant');
                    this.setMode('scientific');
                }
                this.addChatMessage(response.message, 'assistant');
                break;
                
            case 'error':
                this.addChatMessage(`⚠️ ${response.message}`, 'assistant');
                break;
                
            default:
                this.addChatMessage(response.message || "Action processed.", 'assistant');
        }
    }

    addChatMessage(text, type) {
        const container = document.getElementById('chat-messages');
        if (!container) return null;
        
        const id = 'msg-' + Date.now();
        const icon = type === 'user' ? '<i class="fas fa-user"></i>' : '<i class="fas fa-robot"></i>';
        
        const html = `
            <div id="${id}" class="chat-message ${type} cosmic-message">
                <div class="message-avatar">${icon}</div>
                <div class="message-content">${text}</div>
            </div>
        `;
        
        container.insertAdjacentHTML('beforeend', html);
        container.scrollTop = container.scrollHeight;
        return id;
    }

    exportCurrentView() {
        const bounds = this.map.getBounds();
        const center = this.map.getCenter();
        const zoom = this.map.getZoom();
        
        const exportData = {
            timestamp: new Date().toISOString(),
            view: {
                bounds: {
                    north: bounds.getNorth(),
                    south: bounds.getSouth(),
                    east: bounds.getEast(),
                    west: bounds.getWest()
                },
                center: { lat: center.lat, lng: center.lng },
                zoom: zoom
            },
            activeLayers: {
                viirs: document.getElementById('toggleVIIRS')?.checked || false,
                stations: document.getElementById('toggleGroundStations')?.checked || false
            }
        };
        
        const dataStr = JSON.stringify(exportData, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
        
        const exportFileName = `nocturna_view_${Date.now()}.json`;
        
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileName);
        linkElement.click();
        
        window.SystemBus.emit('system:message', "✅ View exported successfully");
    }

    initEventBusListeners() {
        window.SystemBus.on('system:message', (msg) => {
            this.addChatMessage(msg, 'assistant');
        });
        
        window.SystemBus.on('ui:show_modal', (p) => {
            const panel = document.getElementById('analysisPanel');
            if (panel) {
                document.getElementById('analysisTitle').innerText = p.title;
                document.getElementById('analysisContent').innerHTML = p.content;
                panel.style.display = 'block';
                document.getElementById('closeAnalysis').onclick = () => panel.style.display = 'none';
            }
        });
        
        window.SystemBus.on('map:zoom_to', (p) => {
            if (p.lat && p.lng && this.map) {
                this.map.flyTo([p.lat, p.lng], p.zoom || 12);
            }
        });
        
        window.SystemBus.on('map:add_markers', (p) => {
            if (p.data && this.map) {
                p.data.forEach(d => {
                    if (d.lat && (d.lng || d.lon)) {
                        L.marker([d.lat, d.lng || d.lon])
                            .addTo(this.uiMarkers)
                            .bindPopup(d.tags?.name || 'Point');
                    }
                });
            }
        });
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log("🚀 Starting Project Nocturna...");
    
    // Initialize the app
    window.webGIS = new WebGIS();
    
    // Check URL parameter for mode
    const params = new URLSearchParams(window.location.search);
    const modeFromUrl = params.get('mode');
    
    // Set initial mode
    const initialMode = modeFromUrl === 'scientific' ? 'scientific' : 'citizen';
    setTimeout(() => {
        window.webGIS.setMode(initialMode);
    }, 500);
    
    console.log(`🌍 Initial mode: ${initialMode}`);
});