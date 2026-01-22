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

        // Initialize GeoServer WMS Layer
        this.geoServerLayer = L.tileLayer.wms(this.dataManager.getGeoServerURL(), {
            layers: 'nocturna:measurements',
            format: 'image/png',
            transparent: true,
            version: '1.1.0',
            attribution: 'Local PostGIS/GeoServer'
        });

        // Add VIIRS layer initially (Async load from GEE)
        this.dataManager.fetchVIIRSTileUrl().then(url => {
            this.viirsLayer = L.tileLayer(url, {
                attribution: 'Google Earth Engine | NASA Earth Observatory',
                opacity: 0.7,
                zIndex: 1
            });
            this.viirsLayer.addTo(this.map);
        });

        this.map.addLayer(this.drawnItems);
        this.map.addLayer(this.uiMarkers);

        // Add GeoServer layer by default
        this.map.addLayer(this.geoServerLayer);
        // We still keep stationsLayer available for interaction if needed, but visually GeoServer takes over for density
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
            
            // UI Visibility - Show/hide separate toolbars
            document.getElementById('citizenToolbar').style.display = 'block';
            document.getElementById('scientificToolbar').style.display = 'none';
            
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

            document.getElementById('citizenToolbar').style.display = 'none';
            document.getElementById('scientificToolbar').style.display = 'block';

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
        
        // Fix: Connect Route Planning
        const routeBtn = document.getElementById('planRoute');
        if(routeBtn) routeBtn.addEventListener('click', () => {
             // Basic routing implementation (straight line)
             // FUTURE: Upgrade to OSRM or Valhalla for real road network routing.
             const content = `
                <div class="p-2">
                    <p class="small text-muted mb-2">Note: Calculates direct path (linear distance).</p>
                    <input type="text" id="routeStart" class="form-control mb-2" placeholder="Start (e.g. New York)">
                    <input type="text" id="routeEnd" class="form-control mb-2" placeholder="End (e.g. Boston)">
                    <button class="btn btn-primary w-100" onclick="webGIS.calculateRoute()">Go</button>
                </div>
             `;
             window.SystemBus.emit('ui:show_modal', { title: "Plan Route", content: content });
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
            // Make markers invisible/small as GeoServer handles main visualization
            // They are kept for popup interaction
            const markers = stations.map(s => L.circleMarker([s.lat, s.lng], { radius: 4, fillColor: '#00ff00', color: '#fff', weight: 1, fillOpacity: 0.0 }).bindPopup(`<b>SQM:</b> ${s.sqm}`));
            this.stationsLayer.addLayers(markers);
        } catch(e) {}
    }
    
    initDataLayersControls() {
        // Handle VIIRS layer checkbox
        const viirsCheckbox = document.getElementById('viirsLayer');
        if (viirsCheckbox) {
            viirsCheckbox.checked = true;  // Default to visible
            viirsCheckbox.addEventListener('change', (e) => {
                if (!this.viirsLayer) return;
                if (e.target.checked) {
                    this.map.addLayer(this.viirsLayer);
                } else {
                    this.map.removeLayer(this.viirsLayer);
                }
            });
        }
        
        // Handle ground measurements layer checkbox (Toggles both WMS and Interactive layer)
        const groundCheckbox = document.getElementById('groundMeasurements');
        if (groundCheckbox) {
            groundCheckbox.checked = true;  // Default to visible
            groundCheckbox.addEventListener('change', (e) => {
                if (e.target.checked) {
                    if (this.geoServerLayer) this.map.addLayer(this.geoServerLayer);
                    this.map.addLayer(this.stationsLayer);
                } else {
                    if (this.geoServerLayer) this.map.removeLayer(this.geoServerLayer);
                    this.map.removeLayer(this.stationsLayer);
                }
            });
        }
        
        // Handle dark sky parks layer checkbox
        const darkSkyCheckbox = document.getElementById('darkSkyParks');
        if (darkSkyCheckbox) {
            darkSkyCheckbox.checked = true;  // Default to visible
            darkSkyCheckbox.addEventListener('change', async (e) => {
                if (e.target.checked) {
                    // Load dark sky parks data and display on map
                    try {
                        const response = await fetch('./data/dark-sky-parks.json');
                        const data = await response.json();
                        
                        // Create a layer for dark sky parks
                        if (!this.darkSkyLayer) {
                            this.darkSkyLayer = L.layerGroup();
                        }

                        // Add each park as a circle marker
                        data.parks.forEach(park => {
                            const marker = L.circleMarker([park.lat, park.lng], {
                                radius: 8,
                                fillColor: '#FFD700',
                                color: '#FFA500',
                                weight: 2,
                                opacity: 1,
                                fillOpacity: 0.7
                            }).bindPopup(`<b>${park.name}</b><br>${park.type}<br>${park.country}`);

                            this.darkSkyLayer.addLayer(marker);
                        });

                        this.map.addLayer(this.darkSkyLayer);
                        console.log('Dark sky parks layer enabled');
                    } catch (error) {
                        console.error('Error loading dark sky parks:', error);
                    }
                } else {
                    // Remove the dark sky parks layer
                    if (this.darkSkyLayer) {
                        this.map.removeLayer(this.darkSkyLayer);
                        console.log('Dark sky parks layer disabled');
                    }
                }
            });
        }
    }
    
    /**
     * Enable compare mode for side-by-side location comparison
     */
    enableCompareMode() {
        // Show a modal for comparing two locations
        const content = `
            <div class="container-fluid">
                <h5>Compare Two Locations</h5>
                <div class="mb-3">
                    <label class="form-label">First Location</label>
                    <input type="text" id="firstLocation" class="form-control" placeholder="Enter coordinates or address">
                </div>
                <div class="mb-3">
                    <label class="form-label">Second Location</label>
                    <input type="text" id="secondLocation" class="form-control" placeholder="Enter coordinates or address">
                </div>
                <button id="compareSubmit" class="btn btn-primary w-100">Compare</button>
            </div>
        `;
        
        // Show modal with comparison interface
        window.SystemBus.emit('ui:show_modal', { title: "Location Comparison", content: content });
        
        // Set up event listener for comparison
        setTimeout(() => {
            const compareBtn = document.getElementById('compareSubmit');
            if (compareBtn) {
                compareBtn.addEventListener('click', () => {
                    const firstLoc = document.getElementById('firstLocation').value;
                    const secondLoc = document.getElementById('secondLocation').value;

                    if (firstLoc && secondLoc) {
                        this.performLocationComparison(firstLoc, secondLoc);
                    } else {
                        alert('Please enter both locations');
                    }
                });
            }
        }, 100);
    }
    
    /**
     * Perform actual comparison between two locations
     */
    async performLocationComparison(loc1, loc2) {
        try {
            // Parse coordinates if they're in lat,lng format
            let coords1, coords2;
            
            if (loc1.includes(',')) {
                const [lat, lng] = loc1.split(',').map(Number);
                coords1 = { lat, lng };
            } else {
                // Geocode location name to coordinates (simplified)
                coords1 = await this.geocodeLocation(loc1);
            }
            
            if (loc2.includes(',')) {
                const [lat, lng] = loc2.split(',').map(Number);
                coords2 = { lat, lng };
            } else {
                // Geocode location name to coordinates (simplified)
                coords2 = await this.geocodeLocation(loc2);
            }
            
            if (!coords1 || !coords2) {
                throw new Error('Could not geocode one or both locations');
            }
            
            // Get data for both locations
            const data1 = await this.dataManager.getDataAtPoint(coords1.lat, coords1.lng);
            const data2 = await this.dataManager.getDataAtPoint(coords2.lat, coords2.lng);
            
            // Show comparison results
            const comparisonContent = `
                <div class="container-fluid">
                    <div class="row">
                        <div class="col-md-6">
                            <h6>Location 1: ${loc1}</h6>
                            <p><strong>SQM:</strong> ${data1.light_pollution?.sqm || 'N/A'}</p>
                            <p><strong>Bortle:</strong> ${data1.light_pollution?.bortle || 'N/A'}</p>
                            <p><strong>Elevation:</strong> ${data1.location?.elevation || 'N/A'}</p>
                        </div>
                        <div class="col-md-6">
                            <h6>Location 2: ${loc2}</h6>
                            <p><strong>SQM:</strong> ${data2.light_pollution?.sqm || 'N/A'}</p>
                            <p><strong>Bortle:</strong> ${data2.light_pollution?.bortle || 'N/A'}</p>
                            <p><strong>Elevation:</strong> ${data2.location?.elevation || 'N/A'}</p>
                        </div>
                    </div>
                    <div class="mt-3">
                        <button class="btn btn-secondary" onclick="webGIS.map.setView([${coords1.lat}, ${coords1.lng}], 10)">Go to Location 1</button>
                        <button class="btn btn-secondary ms-2" onclick="webGIS.map.setView([${coords2.lat}, ${coords2.lng}], 10)">Go to Location 2</button>
                    </div>
                </div>
            `;
            
            window.SystemBus.emit('ui:show_modal', { title: "Comparison Results", content: comparisonContent });
            
        } catch (error) {
            console.error('Comparison error:', error);
            alert('Error performing comparison: ' + error.message);
        }
    }
    
    /**
     * Simple geocoding function to convert location names to coordinates
     */
    async geocodeLocation(locationName) {
        try {
            const query = encodeURIComponent(locationName);
            const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${query}`);
            const data = await response.json();

            if (data && data.length > 0) {
                return {
                    lat: parseFloat(data[0].lat),
                    lng: parseFloat(data[0].lon)
                };
            }
        } catch (e) {
            console.error("Geocoding failed:", e);
        }

        return null;
    }

    // Helper for simple routing
    async calculateRoute() {
        const start = document.getElementById('routeStart').value;
        const end = document.getElementById('routeEnd').value;
        if (!start || !end) return;

        const s = await this.geocodeLocation(start);
        const e = await this.geocodeLocation(end);

        if (s && e) {
             window.SystemBus.emit('system:message', "🚗 Calculating route...");
             try {
                 const response = await fetch(`https://router.project-osrm.org/route/v1/driving/${s.lng},${s.lat};${e.lng},${e.lat}?overview=full&geometries=geojson`);
                 const data = await response.json();

                 if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
                     const route = data.routes[0];

                     // Add route to map
                     const routeLayer = L.geoJSON(route.geometry, {
                         style: { color: '#00ccff', weight: 5, opacity: 0.8 }
                     }).addTo(this.map);

                     this.drawnItems.addLayer(routeLayer); // Add to drawnItems so it can be cleared
                     this.map.fitBounds(routeLayer.getBounds());

                     const distKm = (route.distance / 1000).toFixed(1);
                     const durMin = Math.round(route.duration / 60);

                     window.SystemBus.emit('system:message', `✅ Route found: ${distKm}km, ~${durMin} min.`);
                 } else {
                     throw new Error('No route found');
                 }
             } catch (err) {
                 console.error(err);
                 // Fallback to straight line
                 const polyline = L.polyline([[s.lat, s.lng], [e.lat, e.lng]], {color: 'red', dashArray: '5, 10'}).addTo(this.map);
                 this.drawnItems.addLayer(polyline);
                 this.map.fitBounds(polyline.getBounds());
                 window.SystemBus.emit('system:message', "⚠️ OSRM failed. Showing direct path.");
             }
        } else {
             window.SystemBus.emit('system:message', "❌ Could not find locations.");
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