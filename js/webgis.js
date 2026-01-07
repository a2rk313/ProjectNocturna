class WebGIS {
    constructor() {
        this.map = null;
        this.dataManager = window.DataManager ? new window.DataManager() : null;
        this.currentMode = 'citizen'; 
        this.drawnItems = new L.FeatureGroup();
        this.uiMarkers = L.layerGroup();
        this.stationsLayer = L.layerGroup();
        this.researchLayer = L.layerGroup(); // Holds the Red Polygons
        this.layers = {}; 
        this.drawControl = null;

        // Initialize MarkerCluster if available
        if (typeof L.markerClusterGroup === 'function') {
            this.stationsLayer = L.markerClusterGroup({ disableClusteringAtZoom: 16 });
        }

        this.initMap();
        this.initializeDrawControl(); 
        this.initUIListeners(); 
        this.initChatListeners();
        
        // Initialize ActionBot
        if (window.ActionBotController) {
            this.actionBot = new window.ActionBotController(this);
            this.actionBot.initialize();
            console.log("✅ ActionBot Connected");
        } else {
            console.warn("⚠️ ActionBotController not found.");
        }

        this.initEventBusListeners(); 
    }

    initMap() {
        // 1. Map Setup
        this.map = L.map('map', { zoomControl: false }).setView([20, 0], 2);
        L.control.zoom({ position: 'topleft' }).addTo(this.map);

        // 2. Base Layers
        this.baseLayers = {
            "Dark Matter": L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', { attribution: '© OpenStreetMap, CARTO' }),
            "NASA Night Lights": L.tileLayer('https://map1.vis.earthdata.nasa.gov/wmts-webmerc/VIIRS_CityLights_2012/default/GoogleMapsCompatible_Level8/{z}/{y}/{x}.jpg', {
                attribution: 'Imagery © NASA Earth Observatory',
                maxZoom: 8 
            }),
            "Satellite": L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', { attribution: '© Esri' })
        };
        this.baseLayers["NASA Night Lights"].addTo(this.map);

        // 3. Add Feature Layers (NOTE: researchLayer is NOT added by default anymore)
        this.map.addLayer(this.drawnItems);
        this.map.addLayer(this.uiMarkers);
        this.map.addLayer(this.stationsLayer);
        // this.map.addLayer(this.researchLayer); <--- Removed so the Toggle controls it

        // 4. Initialize Layer Control (Standard Leaflet Control)
        this.layerControl = L.control.layers(this.baseLayers, {}, { position: 'topright' }).addTo(this.map);

        // 5. Load Data
        this.loadResearchLayer(); 
        this.initStationsLayer(); 

        // 6. Event Listeners
        this.map.on(L.Draw.Event.CREATED, (e) => {
            this.drawnItems.clearLayers(); 
            const layer = e.layer;
            this.drawnItems.addLayer(layer);
            const type = e.layerType === 'marker' ? 'Point' : 'Region';
            window.SystemBus.emit('system:message', `✅ ${type} selected.`);
        });
    }

    initializeDrawControl() {
        if (this.drawControl) return;

        this.drawControl = new L.Control.Draw({
            edit: { featureGroup: this.drawnItems },
            draw: {
                polygon: { allowIntersection: false, showArea: true },
                marker: true,
                circle: false,
                rectangle: true,
                polyline: false,
                circlemarker: false
            }
        });

        this.map.addControl(this.drawControl);
        
        // Hide default toolbar (we use custom buttons)
        const toolbar = document.querySelector('.leaflet-draw-toolbar');
        if (toolbar) toolbar.style.display = 'none';
    }

    async loadResearchLayer() {
        console.log("📡 Connecting to Research Layer...");
        
        // TODO: Replace with your actual Render URL when ready
        const geoserverUrl = "https://your-app-name.onrender.com/geoserver/nocturna/wms"; 
        const isLocal = window.location.hostname === 'localhost';

        if (!isLocal) {
            // Production: WMS
            const wmsLayer = L.tileLayer.wms(geoserverUrl, {
                layers: 'nocturna:analysis_grid',
                format: 'image/png',
                transparent: true,
                version: '1.1.0',
                attribution: "Analysis © Project Nocturna"
            });
            this.researchLayer.addLayer(wmsLayer);
            // We don't add to layerControl here because we have a custom HTML toggle
        } else {
            // Local: GeoJSON
            try {
                const response = await fetch('/geoserver_data/data_layers/analysis_results_real.geojson');
                if (response.ok) {
                    const data = await response.json();
                    const localLayer = L.geoJSON(data, {
                        style: { color: "#ff0000", weight: 2, fillColor: "#ff3333", fillOpacity: 0.4 }
                    });
                    this.researchLayer.addLayer(localLayer);
                }
            } catch (e) { console.warn("Local research layer not found."); }
        }
    }

    async initStationsLayer() {
        try {
            const res = await fetch('/api/stations');
            if (!res.ok) throw new Error("API Error");
            const stations = await res.json();

            const markers = stations.map(s => {
                const color = s.is_research_grade ? '#00ff00' : '#ffff00';
                return L.circleMarker([s.lat, s.lng], { 
                    radius: 5, fillColor: color, color: '#000', weight: 1, fillOpacity: 0.8 
                }).bindPopup(`<b>SQM:</b> ${s.sqm}<br><b>Mag:</b> ${s.mag}`);
            });

            this.stationsLayer.clearLayers();
            this.stationsLayer.addLayers(markers);
            // Only add to standard control (custom toggle not needed for this)
            this.layerControl.addOverlay(this.stationsLayer, "Ground Sensors");
        } catch(e) {
            console.error("Station Load Error:", e);
        }
    }

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

    async setMode(mode) {
        return new Promise((resolve) => {
            const loader = document.getElementById('loadingScreen');
            if (loader) {
                const title = document.getElementById('loadingMode');
                if(title) title.innerText = mode.charAt(0).toUpperCase() + mode.slice(1);
                loader.style.display = 'flex'; loader.style.opacity = '1';
            }
            setTimeout(() => {
                this.currentMode = mode;
                this.updateUIForMode(mode);
                if (loader) loader.style.display = 'none';
                resolve(true);
            }, 1000);
        });
    }

    updateUIForMode(mode) {
        const indicator = document.getElementById('modeIndicator');
        const labels = {
            title: document.getElementById('panelTitle'),
            welcome: document.getElementById('welcomeMessage'),
            botName: document.getElementById('assistantName')
        };
        const cTools = document.getElementById('citizenTools');
        const sTools = document.getElementById('scientificTools');

        if (mode === 'citizen') {
            // UI Updates
            if(indicator) { indicator.innerText = 'Citizen Mode'; indicator.className = 'badge bg-success ms-2 mode-badge'; }
            if(labels.title) labels.title.innerText = 'Stargazing Tools';
            if(labels.botName) labels.botName.innerText = 'Lumina';
            if(labels.welcome) labels.welcome.innerText = 'Hello! I\'m Lumina. Ask me to "Find dark sky spots".';
            
            // Toggle Panels
            if(cTools) cTools.style.display = 'grid';
            if(sTools) sTools.style.display = 'none';
            
            // MAP LOGIC: Force remove scientific layers
            this.map.removeLayer(this.researchLayer);

            if(window.CitizenMode) new window.CitizenMode(this).initialize();

        } else {
            // UI Updates
            if(indicator) { indicator.innerText = 'Scientific Mode'; indicator.className = 'badge bg-warning ms-2 mode-badge'; }
            if(labels.title) labels.title.innerText = 'Scientific Analysis';
            if(labels.botName) labels.botName.innerText = 'Lumina Pro';
            if(labels.welcome) labels.welcome.innerText = 'Scientific Mode active. Use draw tools to analyze areas.';

            // Toggle Panels
            if(cTools) cTools.style.display = 'none';
            if(sTools) sTools.style.display = 'grid';

            // MAP LOGIC: Check the toggle state to see if we should show layer
            const toggle = document.getElementById('toggleResearchLayer');
            if (toggle && toggle.checked) {
                this.map.addLayer(this.researchLayer);
            }

            if(window.ScientificMode) new window.ScientificMode(this).initialize();
        }
    }

    initUIListeners() {
        const switchBtn = document.getElementById('switchMode');
        if (switchBtn) switchBtn.addEventListener('click', () => {
            this.setMode(this.currentMode === 'citizen' ? 'scientific' : 'citizen');
        });

        const dataBtn = document.getElementById('dataSources');
        if (dataBtn) dataBtn.addEventListener('click', () => {
             const content = `<div class="text-start"><h6>Data Sources</h6><ul><li>GaN2024 Database</li><li>NASA VIIRS (2022-2023)</li><li>Open-Meteo API</li></ul></div>`;
            window.SystemBus.emit('ui:show_modal', { title: "📚 Data Sources", content: content });
        });

        // --- NEW: Toggle Satellite Layer from Custom Checkbox ---
        const researchToggle = document.getElementById('toggleResearchLayer');
        if (researchToggle) {
            researchToggle.addEventListener('change', (e) => {
                if (e.target.checked) {
                    this.map.addLayer(this.researchLayer);
                } else {
                    this.map.removeLayer(this.researchLayer);
                }
            });
        }
        // -------------------------------------------------------

        const drawBtn = document.getElementById('drawPolygon');
        if (drawBtn) drawBtn.addEventListener('click', () => this.startTool('polygon'));

        const dropBtn = document.getElementById('dropMarker');
        if (dropBtn) dropBtn.addEventListener('click', () => this.startTool('marker'));
        
        const clearBtn = document.getElementById('clearAll');
        if(clearBtn) clearBtn.addEventListener('click', () => {
            this.drawnItems.clearLayers();
            this.uiMarkers.clearLayers();
            window.SystemBus.emit('system:message', "🗑️ Selection cleared.");
        });
    }

    initChatListeners() {
        const sendBtn = document.getElementById('send-message');
        const input = document.getElementById('user-input');

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

        if (sendBtn) sendBtn.addEventListener('click', sendMessage);
        if (input) input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') sendMessage();
        });
    }

    async generateAIResponse(message) {
        return "I am ready. Use the buttons on the left to analyze the map.";
    }

    addChatMessage(text, type) {
        const container = document.getElementById('chat-messages');
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

    startTool(type) {
        this.drawnItems.clearLayers(); 
        let drawer;
        if (type === 'polygon') {
            drawer = new L.Draw.Polygon(this.map, { showArea: true, shapeOptions: { color: '#00ffff' } });
            window.SystemBus.emit('system:message', "🖊️ Draw a region.");
        } else if (type === 'marker') {
            drawer = new L.Draw.Marker(this.map);
            window.SystemBus.emit('system:message', "📍 Click map to place marker.");
        }
        if(drawer) drawer.enable();
    }

    initEventBusListeners() {
        window.SystemBus.on('system:message', (msg) => {
            this.addChatMessage(msg, 'assistant');
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
        window.SystemBus.on('map:zoom_to', (p) => { if(p.lat && p.lng) this.map.flyTo([p.lat, p.lng], p.zoom || 12); });
        window.SystemBus.on('map:add_markers', (p) => { 
            if(p.data) p.data.forEach(d => { 
                if(d.lat && (d.lng || d.lon)) L.marker([d.lat, d.lng || d.lon]).addTo(this.uiMarkers).bindPopup(d.tags?.name || 'Point'); 
            });
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.webGIS = new WebGIS();
    const params = new URLSearchParams(window.location.search);
    window.webGIS.setMode(params.get('mode') || 'citizen');
});