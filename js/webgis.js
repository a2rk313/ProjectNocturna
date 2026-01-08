// js/webgis.js - Complete with base layer management
class WebGIS {
    constructor() {
        this.map = null;
        this.dataManager = window.DataManager ? new window.DataManager() : null;
        this.currentMode = null;
        this.drawnItems = new L.FeatureGroup();
        this.uiMarkers = L.layerGroup();
        this.stationsLayer = L.layerGroup();
        this.researchLayer = L.layerGroup();
        this.layers = {};
        this.drawControl = null;
        
        // Initialize marker cluster if available
        if (typeof L.markerClusterGroup === 'function') {
            this.stationsLayer = L.markerClusterGroup({ disableClusteringAtZoom: 16 });
        }

        this.initMap();
        this.initializeDrawControl();
        this.initEventBusListeners();
        this.setupLayerControls();
        this.setupBaseLayerControls();
        
        // Initialize ActionBot if available
        if (window.ActionBotController) {
            this.actionBot = new window.ActionBotController(this);
            this.actionBot.initialize();
            console.log("✅ ActionBot Connected");
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
        
        L.control.zoom({ position: 'topleft' }).addTo(this.map);

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
        
        // Draw event
        this.map.on(L.Draw.Event.CREATED, (e) => {
            this.drawnItems.clearLayers();
            const layer = e.layer;
            this.drawnItems.addLayer(layer);
            const type = e.layerType === 'marker' ? 'Point' : 'Region';
            window.SystemBus.emit('system:message', `✅ ${type} selected.`);
            
            // If in scientific mode, trigger analysis
            if (this.currentMode === 'scientific' && this.scientificMode) {
                const geometry = this.getSelection();
                if (geometry) {
                    this.scientificMode.analyzeSelectedArea(geometry);
                }
            }
        });

        console.log("🗺️ Map initialized with real data layers");
    }

    async loadVIIRSDataLayer() {
        try {
            // Load VIIRS data for current view
            const bounds = this.map.getBounds();
            const response = await fetch(`/api/viirs/2023?bbox=${bounds.getWest()},${bounds.getSouth()},${bounds.getEast()},${bounds.getNorth()}`);
            const data = await response.json();
            
            if (data.data && data.data.length > 0) {
                // Create heatmap layer if leaflet.heat plugin is available
                if (typeof L.heatLayer !== 'function') {
                    console.warn('VIIRS data load failed: L.heatLayer function not available');
                    return;
                }
                
                const heatData = data.data.map(point => [point.lat, point.lng, point.brightness]);
                
                this.viirsLayer = L.heatLayer(heatData, {
                    radius: 15,
                    blur: 15,
                    maxZoom: 12,
                    gradient: {0.1: 'blue', 0.3: 'cyan', 0.5: 'lime', 0.7: 'yellow', 1: 'red'}
                }).addTo(this.map);
                
                console.log(`✅ Loaded ${data.data.length} VIIRS data points`);
            }
        } catch (error) {
            console.warn('VIIRS data load failed:', error);
        }
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
        }
    }

    setupLayerControls() {
        // Toggle VIIRS data
        const toggleVIIRS = document.getElementById('toggleVIIRS');
        if (toggleVIIRS) {
            toggleVIIRS.addEventListener('change', (e) => {
                if (e.target.checked) {
                    if (this.viirsLayer) {
                        this.map.addLayer(this.viirsLayer);
                    } else {
                        this.loadVIIRSDataLayer();
                    }
                } else {
                    if (this.viirsLayer) {
                        this.map.removeLayer(this.viirsLayer);
                    }
                }
            });
        }

        // Toggle ground stations
        const toggleGroundStations = document.getElementById('toggleGroundStations');
        if (toggleGroundStations) {
            toggleGroundStations.addEventListener('change', (e) => {
                if (e.target.checked) {
                    this.map.addLayer(this.stationsLayer);
                    this.loadStationsData();
                } else {
                    this.map.removeLayer(this.stationsLayer);
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
        
        return new Promise((resolve) => {
            setTimeout(() => {
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
                
                // 6. Hide loader
                if (loader) loader.style.display = 'none';
                
                console.log(`✅ ${mode} mode activated`);
                resolve(true);
            }, 800);
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
        
        if (mode === 'citizen') {
            if (window.CitizenMode) {
                this.citizenMode = new window.CitizenMode(this);
                this.citizenMode.initialize();
                console.log("✅ Citizen Mode initialized");
            }
        } else if (mode === 'scientific') {
            if (window.ScientificMode) {
                this.scientificMode = new window.ScientificMode(this);
                this.scientificMode.initialize();
                console.log("✅ Scientific Mode initialized");
                
                // Setup scientific layer controls
                this.setupScientificLayerControls();
            }
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

    setupPanelCollapse() {
        const panels = document.querySelectorAll('.cosmic-panel .panel-header');
        panels.forEach(panel => {
            panel.addEventListener('click', (e) => {
                if (e.target.closest('.btn') || e.target.closest('.collapse-icon')) return;
                
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
        return "I am ready. Use the tools to analyze light pollution data.";
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