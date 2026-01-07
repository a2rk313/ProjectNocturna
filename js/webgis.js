class WebGIS {
    constructor() {
        this.map = null;
        this.dataManager = window.DataManager ? new window.DataManager() : null;
        this.currentMode = 'citizen'; 
        this.drawnItems = new L.FeatureGroup();
        this.uiMarkers = L.layerGroup();
        this.stationsLayer = L.layerGroup();
        this.researchLayer = L.layerGroup(); // New: For WMS/Cloud layers
        this.layers = {}; 
        this.drawControl = null;

        // Initialize MarkerCluster if available
        if (typeof L.markerClusterGroup === 'function') {
            this.stationsLayer = L.markerClusterGroup({ disableClusteringAtZoom: 16 });
        }

        this.initMap();
        
        // --- FIX START: Initialize Draw Control for ActionBot ---
        this.initializeDrawControl(); 
        // --- FIX END ---
        
        this.initUIListeners(); 
        this.initChatListeners();
        
        // Initialize ActionBot
        if (window.ActionBotController) {
            this.actionBot = new window.ActionBotController(this);
            this.actionBot.initialize();
            console.log("✅ ActionBot Connected");
        } else {
            console.warn("⚠️ ActionBotController not found. Check imports.");
        }

        this.initEventBusListeners(); 
    }

    initMap() {
        // 1. Map Setup - CHANGED: Global View for Cloud Deployment
        this.map = L.map('map', { zoomControl: false }).setView([20, 0], 2);
        L.control.zoom({ position: 'topleft' }).addTo(this.map);

        // 2. Base Layers - CHANGED: Added NASA Black Marble
        this.baseLayers = {
            "Dark Matter": L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', { attribution: '© OpenStreetMap, CARTO' }),
            "NASA Night Lights": L.tileLayer('https://map1.vis.earthdata.nasa.gov/wmts-webmerc/VIIRS_CityLights_2012/default/GoogleMapsCompatible_Level8/{z}/{y}/{x}.jpg', {
                attribution: 'Imagery © NASA Earth Observatory',
                maxZoom: 8 
            }),
            "Satellite": L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', { attribution: '© Esri' })
        };
        this.baseLayers["NASA Night Lights"].addTo(this.map); // Default for impact

        // 3. Add Feature Layers
        this.map.addLayer(this.drawnItems);
        this.map.addLayer(this.uiMarkers);
        this.map.addLayer(this.stationsLayer);
        this.map.addLayer(this.researchLayer);

        // 4. Initialize Layer Control
        this.layerControl = L.control.layers(this.baseLayers, {}, { position: 'topright' }).addTo(this.map);

        // 5. Load Data Layers
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

    // --- NEW METHOD REQUIRED BY ACTIONBOT ---
    initializeDrawControl() {
        if (this.drawControl) return;

        // Initialize the standard Leaflet Draw control
        this.drawControl = new L.Control.Draw({
            edit: {
                featureGroup: this.drawnItems
            },
            draw: {
                polygon: { allowIntersection: false, showArea: true },
                marker: true,
                circle: false,
                rectangle: true,
                polyline: false,
                circlemarker: false
            }
        });

        // Add to map so ActionBot can find it
        this.map.addControl(this.drawControl);
        
        // Hide the default toolbar (optional)
        const toolbar = document.querySelector('.leaflet-draw-toolbar');
        if (toolbar) toolbar.style.display = 'none';
    }
    // ----------------------------------------

    // --- CHANGED: Load Research Data (Cloud/WMS Ready) ---
    async loadResearchLayer() {
        console.log("📡 Connecting to Research Layer...");
        
        // OPTION A: Cloud GeoServer (Render)
        // Once you deploy to Render, replace the URL below:
        const geoserverUrl = "https://your-app-name.onrender.com/geoserver/nocturna/wms"; 
        
        // Check if we are in dev or prod (simple check)
        const isLocal = window.location.hostname === 'localhost';

        if (!isLocal) {
            // Production: Use WMS
            const wmsLayer = L.tileLayer.wms(geoserverUrl, {
                layers: 'nocturna:analysis_grid',
                format: 'image/png',
                transparent: true,
                version: '1.1.0',
                attribution: "Analysis © Project Nocturna"
            });
            this.researchLayer.addLayer(wmsLayer);
            this.layerControl.addOverlay(wmsLayer, "Research Analysis (WMS)");
        } else {
            // Local Fallback: Try fetching the static file (legacy method)
            try {
                const response = await fetch('/geoserver_data/data_layers/analysis_results_real.geojson');
                if (response.ok) {
                    const data = await response.json();
                    const localLayer = L.geoJSON(data, {
                        style: { color: "#ff0000", weight: 2, fillColor: "#ff3333", fillOpacity: 0.4 }
                    });
                    this.researchLayer.addLayer(localLayer);
                    this.layerControl.addOverlay(localLayer, "Research Analysis (Local)");
                }
            } catch (e) { console.warn("Local research layer not found."); }
        }
    }

    // --- RESTORED: Station Layer (Ground Sensors) ---
    async initStationsLayer() {
        try {
            // CHANGED: Use relative API path for Vercel compatibility
            const res = await fetch('/api/stations');
            if (!res.ok) throw new Error("API Error");
            const stations = await res.json();

            if (stations.length === 0) console.log("ℹ️ No stations found.");

            const markers = stations.map(s => {
                const color = s.is_research_grade ? '#00ff00' : '#ffff00';
                return L.circleMarker([s.lat, s.lng], { 
                    radius: 5, fillColor: color, color: '#000', weight: 1, fillOpacity: 0.8 
                }).bindPopup(`<b>SQM:</b> ${s.sqm}<br><b>Mag:</b> ${s.mag}`);
            });

            this.stationsLayer.clearLayers();
            this.stationsLayer.addLayers(markers);
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

        if (mode === 'citizen') {
            if(indicator) { indicator.innerText = 'Citizen Mode'; indicator.className = 'badge bg-success ms-2 mode-badge'; }
            if(labels.title) labels.title.innerText = 'Stargazing Tools';
            if(labels.botName) labels.botName.innerText = 'Lumina';
            if(labels.welcome) labels.welcome.innerText = 'Hello! I\'m Lumina. Ask me to "Find dark sky spots".';
            
            const cTools = document.getElementById('citizenTools');
            const sTools = document.getElementById('scientificTools');
            if(cTools) cTools.style.display = 'grid';
            if(sTools) sTools.style.display = 'none';
            
            // Remove research toggle in citizen mode
            const toggle = document.getElementById('researchToggleWrapper');
            if (toggle) toggle.remove();

            if(window.CitizenMode) new window.CitizenMode(this).initialize();
        } else {
            if(indicator) { indicator.innerText = 'Scientific Mode'; indicator.className = 'badge bg-warning ms-2 mode-badge'; }
            if(labels.title) labels.title.innerText = 'Scientific Analysis';
            if(labels.botName) labels.botName.innerText = 'Lumina Pro';
            if(labels.welcome) labels.welcome.innerText = 'Scientific Mode active. Use draw tools to analyze areas.';

            const cTools = document.getElementById('citizenTools');
            const sTools = document.getElementById('scientificTools');
            if(cTools) cTools.style.display = 'none';
            if(sTools) sTools.style.display = 'grid';

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
        // Fallback if n8n not connected
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