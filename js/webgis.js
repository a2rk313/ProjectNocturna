class WebGIS {
    constructor() {
        this.map = null;
        this.dataManager = new window.DataManager();
        this.currentMode = 'citizen'; 
        this.actionBot = null; // Restored ActionBot
        this.activeLayers = new Map(); // Track layers
        this.collapsedPanels = new Set(); // UI State

        // Feature Groups
        this.drawnItems = new L.FeatureGroup();
        this.uiMarkers = L.layerGroup();
        this.heatmapLayer = null; 
        this.drawControl = null;

        // Initialize Marker Clusters
        if (typeof L.markerClusterGroup === 'function') {
            this.stationsLayer = L.markerClusterGroup({
                disableClusteringAtZoom: 16,
                spiderfyOnMaxZoom: true,
                chunkedLoading: true
            });
        } else {
            this.stationsLayer = L.layerGroup();
        }

        this.initMap();
        this.initUIListeners(); 
        this.initEventBusListeners(); 
    }

    initMap() {
        // 1. Map Init (Zoom Control Top-Left as requested)
        this.map = L.map('map', { zoomControl: false }).setView([45.49, 15.53], 6); 
        L.control.zoom({ position: 'topleft' }).addTo(this.map);

        // 2. Base Layers
        this.baseLayers = {
            osm: L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', { attribution: '© OpenStreetMap, CARTO' }),
            satellite: L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', { attribution: '© Esri' })
        };
        this.baseLayers.osm.addTo(this.map); // Default

        // 3. Add Groups
        this.map.addLayer(this.drawnItems);
        this.map.addLayer(this.uiMarkers);
        this.map.addLayer(this.stationsLayer);

        // 4. Initialize Data
        this.initStationsLayer();
        this.initGeoServerLayer();

        // 5. Initialize ActionBot (if loaded)
        if (typeof window.ActionBotController !== 'undefined') {
            this.actionBot = new window.ActionBotController(this);
            this.actionBot.initialize();
            console.log('🤖 ActionBot connected.');
        }
    }

    // --- MODE SWITCHING (Restored from stable version) ---
    setMode(mode) {
        console.log(`Switching to ${mode} mode...`);
        this.currentMode = mode;

        // Update Text
        const labels = {
            loading: document.getElementById('loadingMode'),
            indicator: document.getElementById('modeIndicator'),
            title: document.getElementById('panelTitle'),
            welcome: document.getElementById('welcomeMessage'),
            botName: document.getElementById('assistantName')
        };

        if (labels.loading) labels.loading.innerText = mode.charAt(0).toUpperCase() + mode.slice(1);
        
        if (mode === 'citizen') {
            console.log('🌍 Switching to Citizen Mode...');
            if(labels.indicator) { labels.indicator.innerText = 'Citizen Mode'; labels.indicator.className = 'badge bg-success ms-2'; }
            if(labels.title) labels.title.innerText = 'Stargazing Tools';
            if(labels.botName) labels.botName.innerText = 'Lumina';
            if(labels.welcome) labels.welcome.innerText = 'Hello! I\'m Lumina. Ask me to "Find dark sky spots".';
            
            document.getElementById('citizenTools').style.display = 'grid';
            document.getElementById('scientificTools').style.display = 'none';
            
            this.toggleDrawControl(false);
            this.toggleHeatmap(false);
            
            const citizenMode = new window.CitizenMode(this);
            citizenMode.initialize();
            console.log('✅ Citizen Mode initialized');

        } else {
            if(labels.indicator) { labels.indicator.innerText = 'Scientific Mode'; labels.indicator.className = 'badge bg-warning ms-2'; }
            if(labels.title) labels.title.innerText = 'Scientific Analysis';
            if(labels.botName) labels.botName.innerText = 'Lumina Pro';
            if(labels.welcome) labels.welcome.innerText = 'Scientific Mode active. Use draw tools to analyze areas.';

            document.getElementById('citizenTools').style.display = 'none';
            document.getElementById('scientificTools').style.display = 'grid';

            this.toggleDrawControl(true);
            this.toggleHeatmap(true);
            new window.ScientificMode(this).initialize();
        }
    }

    // --- UI LISTENERS (Restored Collapsing & Base Maps) ---
    initUIListeners() {
        // Mode Switch
        const switchBtn = document.getElementById('switchMode');
        if (switchBtn) switchBtn.addEventListener('click', () => {
            this.setMode(this.currentMode === 'citizen' ? 'scientific' : 'citizen');
        });

        // Clear All
        const clearBtn = document.getElementById('clearAll');
        if(clearBtn) clearBtn.addEventListener('click', () => {
            this.drawnItems.clearLayers();
            this.uiMarkers.clearLayers();
            window.SystemBus.emit('system:message', "🗑️ Map cleared.");
        });

        // Base Map Switcher
        const baseOptions = document.querySelectorAll('.basemap-option');
        baseOptions.forEach(opt => {
            opt.addEventListener('click', (e) => {
                const type = e.target.closest('.basemap-option').dataset.basemap;
                if(type === 'satellite') {
                    this.map.removeLayer(this.baseLayers.osm);
                    this.baseLayers.satellite.addTo(this.map);
                } else {
                    this.map.removeLayer(this.baseLayers.satellite);
                    this.baseLayers.osm.addTo(this.map);
                }
                // Update active class
                baseOptions.forEach(o => o.classList.remove('active'));
                e.target.closest('.basemap-option').classList.add('active');
            });
        });

        // Layer Toggles (VIIRS, etc.)
        ['viirsLayer', 'darkSkyParks', 'groundMeasurements'].forEach(id => {
            const el = document.getElementById(id);
            if(el) el.addEventListener('change', (e) => this.toggleLayer(id, e.target.checked));
        });

        // Panel Collapsing
        document.querySelectorAll('.panel-header').forEach(header => {
            header.addEventListener('click', (e) => {
                if(e.target.closest('.btn-close-cosmic')) return;
                const panel = header.parentElement; // .cosmic-panel or .cosmic-card
                panel.classList.toggle('panel-collapsed');
            });
        });
    }

    // --- LAYER LOGIC ---
    async toggleLayer(id, show) {
        // Simple mock of the previous logic using standard Leaflet calls
        // In a real scenario, DataManager would return these layers
        if (id === 'viirsLayer') {
            if (!this.viirsLayer) {
                this.viirsLayer = L.tileLayer('https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/VIIRS_CityLights_2012/default/2012-01-01/GoogleMapsCompatible_Level8/{z}/{y}/{x}.jpg', { opacity: 0.8 });
            }
            show ? this.viirsLayer.addTo(this.map) : this.map.removeLayer(this.viirsLayer);
        }
    }

    // --- MAP FEATURES (Draw & Heatmap) ---
    toggleDrawControl(show) {
        if (show) {
            if (!this.drawControl) {
                this.initializeDrawControl();
            } else {
                this.map.addControl(this.drawControl);
            }
        } else {
            if (this.drawControl) {
                this.map.removeControl(this.drawControl);
            }
            this.drawnItems.clearLayers();
        }
    }

    async toggleHeatmap(show) {
        if (show && !this.heatmapLayer) {
            const stations = await this.dataManager.fetchStations();
            const points = stations.map(s => [s.lat, s.lng, (22 - s.sqm)/5]); // Simple intensity calc
            if(L.heatLayer) this.heatmapLayer = L.heatLayer(points, { radius: 25 }).addTo(this.map);
        } else if (!show && this.heatmapLayer) {
            this.map.removeLayer(this.heatmapLayer);
            this.heatmapLayer = null;
        }
    }

    // --- DATA & EVENT BUS ---
    async initStationsLayer() {
        try {
            const stations = await this.dataManager.fetchStations();
            const markers = stations.map(s => {
                const color = s.sqm > 21 ? '#00ff00' : s.sqm > 19 ? '#ffff00' : '#ff0000';
                return L.circleMarker([s.lat, s.lng], { radius: 5, fillColor: color, color: '#fff', weight: 1, fillOpacity: 0.8 })
                    .bindPopup(`<b>SQM:</b> ${s.sqm}`);
            });
            if(this.stationsLayer.addLayers) this.stationsLayer.addLayers(markers);
            else markers.forEach(m => this.stationsLayer.addLayer(m));
            this.stationsLayer.addTo(this.map);
        } catch(e) { console.warn(e); }
        finally { this.hideLoadingScreen(); }
    }

    initGeoServerLayer() {
        try {
            const url = this.dataManager.getGeoServerURL();
            L.tileLayer.wms(url, { layers: 'nocturna:dark_sky_parks', format: 'image/png', transparent: true }).addTo(this.map);
        } catch(e) {}
    }

    initEventBusListeners() {
        window.SystemBus.on('map:add_markers', (payload) => {
            if (payload.data) {
                payload.data.forEach(item => {
                    const lat = item.lat || item.center?.lat;
                    const lon = item.lon || item.center?.lon;
                    if (lat && lon) {
                        const m = L.marker([lat, lon]).bindPopup(`<b>${item.tags.name || 'Location'}</b>`);
                        this.uiMarkers.addLayer(m);
                    }
                });
                this.uiMarkers.addTo(this.map);
            }
        });

        window.SystemBus.on('system:message', (msg) => {
            const chat = document.getElementById('chat-messages');
            if (chat) {
                const div = document.createElement('div');
                div.className = 'chat-message assistant cosmic-message';
                div.innerHTML = `<div class="message-content">${msg}</div>`;
                chat.appendChild(div);
                chat.scrollTop = chat.scrollHeight;
            }
        });

        window.SystemBus.on('ui:show_modal', (p) => {
            const panel = document.getElementById('analysisPanel');
            if(panel) {
                document.getElementById('analysisTitle').innerText = p.title;
                document.getElementById('analysisContent').innerHTML = p.content;
                panel.style.display = 'block';
                document.getElementById('closeAnalysis').onclick = () => panel.style.display = 'none';
            }
        });
        
        // Listen for Zoom requests (from Citizen Mode)
        window.SystemBus.on('map:zoom_to', (p) => {
            if(p.lat && p.lng) this.map.flyTo([p.lat, p.lng], p.zoom || 12);
        });
    }

    hideLoadingScreen() {
        const loader = document.getElementById('loadingScreen');
        if (loader) setTimeout(() => loader.style.display = 'none', 500);
    }

    // --- RESTORED: showMessage method for backward compatibility ---
    showMessage(message) {
        window.SystemBus.emit('system:message', message);
    }

    // --- ADDED: initializeDrawControl method for ActionBot compatibility ---
    initializeDrawControl() {
        console.log('🎨 Initializing draw control for ActionBot...');
        if (!this.drawControl) {
            this.drawControl = new L.Control.Draw({
                edit: { featureGroup: this.drawnItems },
                draw: { 
                    polygon: { showArea: true }, 
                    rectangle: true, 
                    marker: true, 
                    circle: false, 
                    polyline: false, 
                    circlemarker: false 
                }
            });
            this.map.addControl(this.drawControl);
            
            // Add event listener for created shapes
            this.map.on(L.Draw.Event.CREATED, (e) => {
                this.drawnItems.addLayer(e.layer);
                window.SystemBus.emit('system:message', "✅ Shape drawn.");
            });
            
            console.log('✅ Draw control initialized');
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.webGIS = new WebGIS();
    window.webGIS.setMode('citizen');
});