class WebGIS {
    constructor() {
        this.map = null;
        this.dataManager = new window.DataManager();
        this.currentMode = 'citizen'; 
        this.drawnItems = new L.FeatureGroup();
        this.uiMarkers = L.layerGroup();
        this.stationsLayer = L.layerGroup();
        this.viirsLayer = null;  // Added VIIRS layer
        this.drawControl = null;

        if (typeof L.markerClusterGroup === 'function') {
            this.stationsLayer = L.markerClusterGroup({ disableClusteringAtZoom: 16 });
        }

        this.initMap();
        this.initUIListeners(); 
        this.initEventBusListeners(); 
    }

    initMap() {
        this.map = L.map('map', { zoomControl: false }).setView([45.49, 15.53], 6); 
        L.control.zoom({ position: 'topleft' }).addTo(this.map);

        this.baseLayers = {
            osm: L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', { attribution: '© OpenStreetMap, CARTO' }),
            satellite: L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', { attribution: '© Esri' })
        };
        this.baseLayers.osm.addTo(this.map);

        // Add VIIRS layer initially
        this.viirsLayer = L.tileLayer(this.dataManager.getVIIRSTileUrl(), {
            attribution: 'NASA Earth Observatory',
            opacity: 0.7,
            zIndex: 1
        });
        this.viirsLayer.addTo(this.map);

        this.map.addLayer(this.drawnItems);
        this.map.addLayer(this.uiMarkers);
        this.map.addLayer(this.stationsLayer);

        this.map.on(L.Draw.Event.CREATED, (e) => {
            this.drawnItems.clearLayers(); 
            const layer = e.layer;
            this.drawnItems.addLayer(layer);
            const type = e.layerType === 'marker' ? 'Point' : 'Region';
            window.SystemBus.emit('system:message', `✅ ${type} selected.`);
        });

        this.initStationsLayer();
        this.initDataLayersControls();  // Initialize data layer controls
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

    // --- GPS Handler ---
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
                document.getElementById('loadingMode').innerText = mode.charAt(0).toUpperCase() + mode.slice(1);
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
            
            // UI Visibility
            document.getElementById('citizenTools').style.display = 'grid';
            document.getElementById('scientificTools').style.display = 'none';
            
            // --- CLEANUP: Remove Research Toggle when leaving Scientific Mode ---
            const toggle = document.getElementById('researchToggle');
            if (toggle) {
                // Find the parent div wrapper we added in ScientificMode.addResearchToggle()
                const wrapper = toggle.closest('.form-check'); 
                if(wrapper) wrapper.remove();
            }

            new window.CitizenMode(this).initialize();
        } else {
            if(indicator) { indicator.innerText = 'Scientific Mode'; indicator.className = 'badge bg-warning ms-2 mode-badge'; }
            if(labels.title) labels.title.innerText = 'Scientific Analysis';
            if(labels.botName) labels.botName.innerText = 'Lumina Pro';
            if(labels.welcome) labels.welcome.innerText = 'Scientific Mode active. Use draw tools to analyze areas.';

            document.getElementById('citizenTools').style.display = 'none';
            document.getElementById('scientificTools').style.display = 'grid';

            new window.ScientificMode(this).initialize();
        }
    }

    initUIListeners() {
        const switchBtn = document.getElementById('switchMode');
        if (switchBtn) switchBtn.addEventListener('click', () => {
            this.setMode(this.currentMode === 'citizen' ? 'scientific' : 'citizen');
        });

        const dataBtn = document.getElementById('dataSources');
        if (dataBtn) dataBtn.addEventListener('click', () => {
             const content = `<div class="text-start"><h6>Data Sources</h6><ul><li>GaN2024 Database</li><li>NASA VIIRS (2012)</li><li>Open-Meteo API</li></ul></div>`;
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
        
        // Basemap switching functionality
        const basemapSwitcher = document.getElementById('basemapSwitcher');
        const basemapDropdown = document.getElementById('basemapDropdown');
        if (basemapSwitcher && basemapDropdown) {
            basemapSwitcher.addEventListener('click', (e) => {
                e.stopPropagation();
                basemapDropdown.classList.toggle('show');
            });
            
            // Handle basemap option clicks
            const basemapOptions = basemapDropdown.querySelectorAll('.basemap-option');
            basemapOptions.forEach(option => {
                option.addEventListener('click', (e) => {
                    const basemapType = e.currentTarget.getAttribute('data-basemap');
                    this.switchBasemap(basemapType);
                    
                    // Update active class
                    basemapOptions.forEach(opt => opt.classList.remove('active'));
                    e.currentTarget.classList.add('active');
                    
                    // Hide dropdown after selection
                    basemapDropdown.classList.remove('show');
                });
            });
        }
    }
    
    switchBasemap(type) {
        // Remove all base layers from map
        Object.values(this.baseLayers).forEach(layer => {
            if (this.map.hasLayer(layer)) {
                this.map.removeLayer(layer);
            }
        });
        
        // Add the selected base layer
        if (this.baseLayers[type]) {
            this.baseLayers[type].addTo(this.map);
        }
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

    async initStationsLayer() {
        try {
            const stations = await this.dataManager.fetchStations();
            const markers = stations.map(s => L.circleMarker([s.lat, s.lng], { radius: 5, fillColor: '#00ff00', color: '#fff', weight: 1, fillOpacity: 0.8 }).bindPopup(`<b>SQM:</b> ${s.sqm}`));
            this.stationsLayer.addLayers(markers);
        } catch(e) {}
    }
    
    initDataLayersControls() {
        // Handle VIIRS layer checkbox
        const viirsCheckbox = document.getElementById('viirsLayer');
        if (viirsCheckbox) {
            viirsCheckbox.checked = true;  // Default to visible
            viirsCheckbox.addEventListener('change', (e) => {
                if (e.target.checked) {
                    this.map.addLayer(this.viirsLayer);
                } else {
                    this.map.removeLayer(this.viirsLayer);
                }
            });
        }
        
        // Handle ground measurements layer checkbox
        const groundCheckbox = document.getElementById('groundMeasurements');
        if (groundCheckbox) {
            groundCheckbox.checked = true;  // Default to visible
            groundCheckbox.addEventListener('change', (e) => {
                if (e.target.checked) {
                    this.map.addLayer(this.stationsLayer);
                } else {
                    this.map.removeLayer(this.stationsLayer);
                }
            });
        }
        
        // Handle dark sky parks layer checkbox
        const darkSkyCheckbox = document.getElementById('darkSkyParks');
        if (darkSkyCheckbox) {
            darkSkyCheckbox.checked = true;  // Default to visible
            darkSkyCheckbox.addEventListener('change', (e) => {
                // In a real implementation, this would control a WMS layer
                // For now, we'll just log the action
                console.log(`Dark sky parks layer ${e.target.checked ? 'enabled' : 'disabled'}`);
            });
        }
    }

    initEventBusListeners() {
        window.SystemBus.on('system:message', (msg) => {
            const chat = document.getElementById('chat-messages');
            if (chat) chat.innerHTML += `<div class="chat-message assistant cosmic-message"><div class="message-content">${msg}</div></div>`;
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
            if(p.data) p.data.forEach(d => { if(d.lat && d.lon) L.marker([d.lat, d.lon]).addTo(this.uiMarkers).bindPopup(d.tags?.name || 'Point'); });
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.webGIS = new WebGIS();
    const params = new URLSearchParams(window.location.search);
    window.webGIS.setMode(params.get('mode') || 'citizen');
});