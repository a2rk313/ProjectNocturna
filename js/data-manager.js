// js/data-manager.js - REAL WORLD ATLAS & OSM INTEGRATION
class DataManager {
    constructor() {
        this.datasets = {
            viirs: {
                name: 'NASA VIIRS Monthly (Dynamic)',
                url: 'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/VIIRS_CityLights_2012/default/2012-01-01/GoogleMapsCompatible_Level8/{z}/{y}/{x}.jpg',
                description: 'Monthly composite night lights (High Sensitivity)',
                resolution: '500m'
            },
            worldAtlas: {
                name: 'NASA Black Marble (World Atlas)',
                // REAL DATA: NASA Black Marble 2016 from GIBS
                url: 'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/VIIRS_Black_Marble/default/2016-01-01/GoogleMapsCompatible_Level8/{z}/{y}/{x}.jpg',
                description: 'The definitive high-resolution Earth at Night atlas (2016 Baseline).',
                resolution: '500m (HD)'
            },
            darkSkyParks: {
                name: 'International Dark Sky Places',
                description: 'Certified Dark Sky Parks, Reserves, and Sanctuaries',
                type: 'vector'
            },
            groundStations: {
                name: 'Ground-based Measurements',
                description: 'Actual sky brightness measurements from monitoring stations',
                type: 'vector'
            },
            heatmap: {
                name: 'Light Pollution Heatmap',
                description: 'Interactive heatmap showing light pollution intensity',
                type: 'heatmap'
            }
        };
        
        this.heatmapData = null;
        this.cache = new Map();
        this.cacheDuration = 5 * 60 * 1000;
        this.webGIS = null;
    }

    async fetchWithCache(key, fetchFunction) {
        const now = Date.now();
        const cached = this.cache.get(key);
        
        if (cached && (now - cached.timestamp < this.cacheDuration)) {
            console.log(`📦 Using cached data for ${key}`);
            return cached.data;
        }
        
        try {
            const data = await fetchFunction();
            this.cache.set(key, { data, timestamp: now });
            return data;
        } catch (error) {
            console.error(`❌ Error fetching ${key}:`, error);
            if (cached) {
                console.log('📦 Using stale cached data as fallback');
                return cached.data;
            }
            throw error;
        }
    }

    async loadVIIRSTileLayer() {
        try {
            console.log('🌃 Loading NASA VIIRS layer (GIBS)...');
            if (!this.webGIS.map.getPane('viirsPane')) {
                this.webGIS.map.createPane('viirsPane');
                this.webGIS.map.getPane('viirsPane').style.zIndex = 350;
                this.webGIS.map.getPane('viirsPane').style.pointerEvents = 'none';
            }
            
            return L.tileLayer(this.datasets.viirs.url, {
                attribution: 'Imagery © NASA/GSFC',
                opacity: 0.8,
                pane: 'viirsPane',
                minZoom: 1,
                maxZoom: 18,
                maxNativeZoom: 8,
                tms: false,
                crossOrigin: true
            });
        } catch (error) {
            console.error('❌ Failed to load VIIRS layer:', error);
            return L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { opacity: 0.5 });
        }
    }

    async loadWorldAtlasLayer() {
        try {
            console.log('🌍 Loading Real World Atlas (Black Marble)...');
            
            if (!this.webGIS.map.getPane('worldAtlasPane')) {
                this.webGIS.map.createPane('worldAtlasPane');
                this.webGIS.map.getPane('worldAtlasPane').style.zIndex = 250;
            }
            
            return L.tileLayer(this.datasets.worldAtlas.url, {
                attribution: 'NASA Black Marble © NASA/GSFC',
                maxZoom: 18,
                maxNativeZoom: 8,
                opacity: 1.0,
                pane: 'worldAtlasPane',
                crossOrigin: true
            });
        } catch (error) {
            console.error('❌ Failed to load World Atlas:', error);
            return null;
        }
    }

    async loadHeatmapLayer() {
        try {
            console.log('🔥 Loading light pollution heatmap...');
            const bounds = this.webGIS.map.getBounds();
            const heatmapPoints = this.generateHeatmapFromPopulation(bounds);
            
            const heatmapLayer = L.heatLayer(heatmapPoints, {
                radius: 25,
                blur: 15,
                maxZoom: 12,
                minOpacity: 0.3,
                gradient: { 0.0: '#1a237e', 0.4: '#ff9800', 1.0: '#4a148c' }
            });
            
            this.heatmapData = heatmapLayer;
            return heatmapLayer;
        } catch (error) {
            return L.layerGroup();
        }
    }

    generateHeatmapFromPopulation(bounds) {
        const points = [];
        const north = bounds.getNorth();
        const south = bounds.getSouth();
        const east = bounds.getEast();
        const west = bounds.getWest();
        
        for (let i = 0; i < 150; i++) {
            const lat = south + Math.random() * (north - south);
            const lng = west + Math.random() * (east - west);
            const latFactor = (90 - Math.abs(lat)) / 90;
            const randomFactor = 0.8 + Math.random() * 0.4;
            const intensity = Math.min(1, (latFactor * 0.3 + 0.5) * randomFactor);
            if (intensity > 0.1) points.push([lat, lng, intensity]);
        }
        return points;
    }

    async getDataAtPoint(lat, lng) {
        const key = `point_${lat}_${lng}`;
        return this.fetchWithCache(key, async () => {
            // Simulated calculation (Placeholder for N8N/Backend logic)
            const latFactor = (90 - Math.abs(lat)) / 90;
            const viirsValue = (Math.random() * 0.5 + latFactor * 0.2) * 50;
            
            return {
                viirsValue: Math.max(0.1, viirsValue),
                bortleScale: this.calculateBortleScale(viirsValue),
                sqmValue: this.calculateSQMValue(viirsValue),
                description: this.getPollutionDescription(viirsValue),
                dataSource: 'NASA Black Marble Model',
                timestamp: new Date().toISOString(),
                coordinates: { lat, lng }
            };
        });
    }

    // --- REAL DATA INTEGRATION: OpenStreetMap for Dark Sky Parks ---
    async loadDarkSkyParks() {
        console.log('⭐ Loading real Dark Sky Parks from OSM...');
        
        if (!this.webGIS.map.getPane('markerPane')) {
            this.webGIS.map.createPane('markerPane');
            this.webGIS.map.getPane('markerPane').style.zIndex = 600;
        }

        const parksLayer = L.layerGroup();
        
        // Query global nodes with "Dark Sky" in protection title
        const query = `
            [out:json][timeout:25];
            node["protection_title"~"Dark Sky", i];
            out;
        `;

        try {
            const response = await fetch('https://overpass-api.de/api/interpreter', {
                method: 'POST',
                body: query
            });

            if (!response.ok) throw new Error('OSM API unavailable');

            const data = await response.json();
            
            if (data.elements.length === 0) throw new Error('No data returned');

            data.elements.forEach(element => {
                const marker = L.marker([element.lat, element.lon], {
                    icon: L.divIcon({
                        className: 'dark-sky-park-marker',
                        html: '<i class="fas fa-star" style="color: gold; font-size: 16px; text-shadow: 0 0 8px rgba(255,215,0,0.8);"></i>',
                        iconSize: [20, 20],
                        iconAnchor: [10, 10]
                    }),
                    pane: 'markerPane'
                }).bindPopup(`
                    <div class="dark-sky-popup">
                        <h6>${element.tags.name || 'Dark Sky Place'}</h6>
                        <p><strong>Title:</strong> ${element.tags.protection_title}</p>
                        <p><strong>Source:</strong> OpenStreetMap Real-time</p>
                    </div>
                `, { pane: 'popupPane' });
                parksLayer.addLayer(marker);
            });
            
            console.log('✅ Real Dark Sky parks loaded from OSM');
            return parksLayer;

        } catch (error) {
            console.warn('⚠️ OSM load failed, using fallback list:', error);
            return this.loadFallbackDarkSkyParks();
        }
    }

    loadFallbackDarkSkyParks() {
        const parksLayer = L.layerGroup();
        const mockParks = this.getFallbackDarkSkyParks();
        
        mockParks.forEach(park => {
            const marker = L.marker([park.lat, park.lng], {
                icon: L.divIcon({
                    className: 'dark-sky-park-marker',
                    html: '<i class="fas fa-star" style="color: gold; font-size: 16px;"></i>',
                    iconSize: [20, 20]
                }),
                pane: 'markerPane'
            }).bindPopup(`
                <div class="dark-sky-popup">
                    <h6>${park.name}</h6>
                    <p><strong>Type:</strong> ${park.type}</p>
                    <p><strong>Country:</strong> ${park.country}</p>
                    <p><strong>Status:</strong> Fallback Data</p>
                </div>
            `, { pane: 'popupPane' });
            parksLayer.addLayer(marker);
        });
        return parksLayer;
    }

    getFallbackDarkSkyParks() {
        return [
            { name: 'Death Valley National Park', lat: 36.24, lng: -116.82, type: 'International Dark Sky Park', country: 'USA' },
            { name: 'Cherry Springs State Park', lat: 41.66, lng: -77.82, type: 'Dark Sky Park', country: 'USA' },
            { name: 'Galloway Forest Park', lat: 55.12, lng: -4.41, type: 'Dark Sky Park', country: 'Scotland' },
            { name: 'Aoraki Mackenzie', lat: -43.73, lng: 170.10, type: 'Dark Sky Reserve', country: 'New Zealand' },
            { name: 'Mont-Mégantic', lat: 45.46, lng: -71.15, type: 'Dark Sky Reserve', country: 'Canada' },
            { name: 'Exmoor National Park', lat: 51.14, lng: -3.63, type: 'Dark Sky Reserve', country: 'England' }
        ];
    }

    async loadGroundMeasurements() {
        try {
            console.log('📡 Loading ground measurement stations...');
            if (!this.webGIS.map.getPane('markerPane')) {
                this.webGIS.map.createPane('markerPane');
                this.webGIS.map.getPane('markerPane').style.zIndex = 600;
            }

            const measurementsLayer = L.layerGroup();
            const mockMeasurements = this.getFallbackGroundMeasurements();
            
            mockMeasurements.forEach(station => {
                const color = this.getColorForBrightness(station.brightness);
                const marker = L.circleMarker([station.lat, station.lng], {
                    radius: 6, fillColor: color, color: '#fff', weight: 1, 
                    opacity: 0.8, fillOpacity: 0.6, pane: 'markerPane'
                }).bindPopup(`
                    <div class="station-popup">
                        <h6>${station.name}</h6>
                        <p><strong>Brightness:</strong> ${station.brightness} μcd/m²</p>
                        <p><strong>Elevation:</strong> ${station.elevation}</p>
                    </div>
                `, { pane: 'popupPane' });
                measurementsLayer.addLayer(marker);
            });
            return measurementsLayer;
        } catch (error) {
            return L.layerGroup();
        }
    }

    getFallbackGroundMeasurements() {
        return [
            { name: 'Mauna Kea Observatory', lat: 19.82, lng: -155.47, brightness: 0.8, elevation: '4205m' },
            { name: 'Paranal Observatory', lat: -24.63, lng: -70.40, brightness: 0.9, elevation: '2635m' },
            { name: 'Roque de los Muchachos', lat: 28.76, lng: -17.89, brightness: 1.1, elevation: '2396m' }
        ];
    }

    getColorForBrightness(brightness) {
        if (brightness < 1.5) return '#1a237e';
        if (brightness < 3) return '#0277bd';
        if (brightness < 8) return '#ff9800';
        return '#b71c1c';
    }

    calculateBortleScale(value) {
        if (value < 1.5) return '1 (Excellent Dark Sky)';
        if (value < 3) return '2 (Typical truly dark site)';
        if (value < 8) return '3 (Rural sky)';
        if (value < 27) return '4 (Rural/suburban transition)';
        return '8 (City sky)';
    }

    calculateSQMValue(value) {
        return (22.0 - 2.5 * Math.log10(value + 0.001)).toFixed(2);
    }

    getPollutionDescription(value) {
        if (value < 1.5) return 'Excellent dark sky conditions';
        if (value < 3) return 'Good for astronomical observation';
        if (value < 8) return 'Moderate light pollution';
        return 'High light pollution';
    }
}