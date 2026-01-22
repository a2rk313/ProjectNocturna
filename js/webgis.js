class WebGIS {
    constructor() {
        this.map = null;
        this.dataManager = new window.DataManager();
        this.currentMode = 'citizen'; 
        this.drawnItems = new L.FeatureGroup();
        this.uiMarkers = L.layerGroup();
        
        // Layers
        this.stationsLayer = L.markerClusterGroup({ disableClusteringAtZoom: 16 }); // Keep for detailed interaction
        this.geoServerLayer = null; // New WMS Layer
        this.viirsLayer = null;
        
        this.drawControl = null;

        this.initMap();
        this.initUIListeners(); 
        this.initEventBusListeners(); 
    }

    initMap() {
        this.map = L.map('map', { zoomControl: false }).setView([45.49, 15.53], 6); 
        L.control.zoom({ position: 'topleft' }).addTo(this.map);

        this.baseLayers = {
            osm: L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', { attribution: '© OpenStreetMap, CARTO' }),
            satellite: L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/ {z}/{y}/{x}', { attribution: '© Esri' })
        };
        this.baseLayers.osm.addTo(this.map);

        // --- STRATEGY FIX: Initialize GeoServer WMS Layer ---
        // This consumes the data stored in PostGIS via GeoServer
        this.geoServerLayer = L.tileLayer.wms(this.dataManager.getGeoServerURL(), {
            layers: 'nocturna:measurements', // Ensure this layer is published in GeoServer
            format: 'image/png',
            transparent: true,
            version: '1.1.0',
            attribution: 'Local PostGIS/GeoServer'
        });

        // Add VIIRS layer (NASA)
        this.viirsLayer = L.tileLayer(this.dataManager.getVIIRSTileUrl(), {
            attribution: 'NASA Earth Observatory',
            opacity: 0.7,
            zIndex: 1
        });
        this.viirsLayer.addTo(this.map);

        this.map.addLayer(this.drawnItems);
        this.map.addLayer(this.uiMarkers);
        
        // Add GeoServer layer by default to prove connectivity
        this.map.addLayer(this.geoServerLayer);

        this.map.on(L.Draw.Event.CREATED, (e) => {
            this.drawnItems.clearLayers(); 
            const layer = e.layer;
            this.drawnItems.addLayer(layer);
            const type = e.layerType === 'marker' ? 'Point' : 'Region';
            window.SystemBus.emit('system:message', `✅ ${type} selected.`);
        });

        this.initStationsLayer(); // Fetches interactive markers for top-layer
        this.initDataLayersControls(); 
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

        // Reset the dropMarker button to its default function (manual marker placement)
        const dropBtn = document.getElementById('dropMarker');
        if (dropBtn) {
            // Remove existing event listeners by cloning the element
            const newDropBtn = dropBtn.cloneNode(true);
            dropBtn.parentNode.replaceChild(newDropBtn, dropBtn);
            
            // Rebind to default manual marker function
            newDropBtn.addEventListener('click', () => this.startTool('marker'));
        }

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
             const content = `<div class="text-start"><h6>Data Sources</h6><ul><li>GaN2024 Database (PostGIS)</li><li>NASA VIIRS (2012)</li><li>Open-Meteo API</li></ul></div>`;
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
        
        // Plan Route functionality
        const routeBtn = document.getElementById('planRoute');
        if (routeBtn) routeBtn.addEventListener('click', () => this.planRoute());
        
        // Compare Locations functionality
        const compareBtn = document.getElementById('compareLocations');
        if (compareBtn) compareBtn.addEventListener('click', () => this.enableCompareMode());
        
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
        // Keep fetching JSON for interaction (Popups), but use GeoServer for visual density
        try {
            const stations = await this.dataManager.fetchStations();
            // We can make these markers invisible or smaller since GeoServer handles the main view
            const markers = stations.map(s => L.circleMarker([s.lat, s.lng], { radius: 4, fillColor: '#00ff00', color: '#fff', weight: 1, fillOpacity: 0.0 }).bindPopup(`<b>SQM:</b> ${s.sqm}`));
            this.stationsLayer.addLayers(markers);
        } catch(e) {}
    }
    
    initDataLayersControls() {
        const viirsCheckbox = document.getElementById('viirsLayer');
        if (viirsCheckbox) {
            viirsCheckbox.checked = true;
            viirsCheckbox.addEventListener('change', (e) => {
                if (e.target.checked) this.map.addLayer(this.viirsLayer);
                else this.map.removeLayer(this.viirsLayer);
            });
        }
        
        // --- STRATEGY FIX: Controls toggle GeoServer WMS now ---
        const groundCheckbox = document.getElementById('groundMeasurements');
        if (groundCheckbox) {
            groundCheckbox.checked = true;
            groundCheckbox.addEventListener('change', (e) => {
                if (e.target.checked) {
                    this.map.addLayer(this.geoServerLayer); // Add WMS
                    this.map.addLayer(this.stationsLayer);  // Add Interactive Overlay
                } else {
                    this.map.removeLayer(this.geoServerLayer);
                    this.map.removeLayer(this.stationsLayer);
                }
            });
        }
        
        const darkSkyCheckbox = document.getElementById('darkSkyParks');
        if (darkSkyCheckbox) {
            darkSkyCheckbox.checked = true;
            darkSkyCheckbox.addEventListener('change', async (e) => {
                if (e.target.checked) {
                    try {
                        const response = await fetch('./data/dark-sky-parks.json');
                        const data = await response.json();
                        if (!this.darkSkyLayer) this.darkSkyLayer = L.layerGroup();
                        
                        data.parks.forEach(park => {
                            const marker = L.circleMarker([park.lat, park.lng], {
                                radius: 8, fillColor: '#FFD700', color: '#FFA500', weight: 2, opacity: 1, fillOpacity: 0.7
                            }).bindPopup(`<b>${park.name}</b><br>${park.type}<br>${park.country}`);
                            this.darkSkyLayer.addLayer(marker);
                        });
                        this.map.addLayer(this.darkSkyLayer);
                    } catch (error) { console.error('Error loading dark sky parks:', error); }
                } else {
                    if (this.darkSkyLayer) this.map.removeLayer(this.darkSkyLayer);
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
    /**
     * Plan a route between two locations
     */
    planRoute() {
        // Show a modal for planning a route
        const content = `
            <div class="container-fluid">
                <h5>Plan a Route</h5>
                <div class="mb-3">
                    <label class="form-label">Start Location</label>
                    <input type="text" id="routeStart" class="form-control" placeholder="Enter starting point">
                </div>
                <div class="mb-3">
                    <label class="form-label">End Location</label>
                    <input type="text" id="routeEnd" class="form-control" placeholder="Enter destination">
                </div>
                <button id="routeSubmit" class="btn btn-primary w-100">Get Directions</button>
            </div>
        `;
        
        // Show modal with route planning interface
        window.SystemBus.emit('ui:show_modal', { title: "Route Planner", content: content });
        
        // Set up event listener for route planning
        setTimeout(() => {
            const routeBtn = document.getElementById('routeSubmit');
            if (routeBtn) {
                routeBtn.addEventListener('click', () => {
                    const startLoc = document.getElementById('routeStart').value;
                    const endLoc = document.getElementById('routeEnd').value;
                    
                    if (startLoc && endLoc) {
                        this.calculateRoute(startLoc, endLoc);
                    } else {
                        alert('Please enter both start and end locations');
                    }
                });
            }
        }, 100);
    }
    
    /**
     * Calculate and display route between two locations
     */
    async calculateRoute(start, end) {
        try {
            // Parse coordinates if they're in lat,lng format
            let startCoords, endCoords;
            
            if (start.includes(',')) {
                const [lat, lng] = start.split(',').map(Number);
                startCoords = { lat, lng };
            } else {
                // Geocode location name to coordinates
                startCoords = await this.geocodeLocation(start);
            }
            
            if (end.includes(',')) {
                const [lat, lng] = end.split(',').map(Number);
                endCoords = { lat, lng };
            } else {
                // Geocode location name to coordinates
                endCoords = await this.geocodeLocation(end);
            }
            
            if (!startCoords || !endCoords || startCoords.lat === 0 || endCoords.lat === 0) {
                throw new Error('Could not geocode one or both locations');
            }

            // Create a simple line between the two points (since we don't have a real routing service)
            // In a real implementation, this would use a routing service like OSRM or Google Maps
            
            // Clear any existing routing layer
            if (this.routingLayer) {
                this.map.removeLayer(this.routingLayer);
            }
            
            // Create a simple line between the two points
            const routeLine = L.polyline([
                [startCoords.lat, startCoords.lng],
                [endCoords.lat, endCoords.lng]
            ], {
                color: '#00ffff',
                weight: 4,
                opacity: 0.8
            }).addTo(this.map);
            
            this.routingLayer = routeLine;
            
            // Fit the map to show both points
            const group = L.featureGroup([routeLine]);
            this.map.fitBounds(group.getBounds().pad(0.1));
            
            // Show route information
            const distance = this.calculateDistance(startCoords.lat, startCoords.lng, endCoords.lat, endCoords.lng);
            
            const routeContent = `
                <div class="container-fluid">
                    <h6>Route Information</h6>
                    <p><strong>From:</strong> ${start}</p>
                    <p><strong>To:</strong> ${end}</p>
                    <p><strong>Distance:</strong> ${distance.toFixed(2)} km</p>
                    <p><strong>Note:</strong> This is a straight-line path. Real navigation may vary.</p>
                    <div class="mt-3">
                        <button class="btn btn-secondary" onclick="webGIS.map.setView([${startCoords.lat}, ${startCoords.lng}], 10)">Go to Start</button>
                        <button class="btn btn-secondary ms-2" onclick="webGIS.map.setView([${endCoords.lat}, ${endCoords.lng}], 10)">Go to End</button>
                    </div>
                </div>
            `;
            
            window.SystemBus.emit('ui:show_modal', { title: "Route Details", content: routeContent });

        } catch (error) {
            console.error('Route calculation error:', error);
            alert('Error calculating route: ' + error.message);
        }
    }
    
    /**
     * Calculate distance between two points using Haversine formula
     */
    calculateDistance(lat1, lng1, lat2, lng2) {
        const R = 6371; // Earth radius in km
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLng = (lng2 - lng1) * Math.PI / 180;
        const a = 
            Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
            Math.sin(dLng/2) * Math.sin(dLng/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    }
    
    async geocodeLocation(locationName) {
        // In a real implementation, this would call a geocoding service
        // For now, we'll use a few hardcoded locations for demo purposes
        const locations = {
            'new york': { lat: 40.7128, lng: -74.0060 },
            'london': { lat: 51.5074, lng: -0.1278 },
            'tokyo': { lat: 35.6762, lng: 139.6503 },
            'sydney': { lat: -33.8688, lng: 151.2093 },
            'paris': { lat: 48.8566, lng: 2.3522 },
            'berlin': { lat: 52.5200, lng: 13.4050 },
            'rome': { lat: 41.9028, lng: 12.4964 },
            'madrid': { lat: 40.4168, lng: -3.7038 },
            'amsterdam': { lat: 52.3676, lng: 4.9041 },
            'vienna': { lat: 48.2082, lng: 16.3738 }
        };
        
        const normalized = locationName.toLowerCase().trim();
        return locations[normalized] || { lat: 0, lng: 0 }; // Default to 0,0 if not found
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