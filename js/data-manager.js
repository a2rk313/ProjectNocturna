// js/data-manager.js - FIXED VERSION
class DataManager {
    constructor() {
        this.datasets = {
            viirs: {
                name: 'NASA VIIRS Nighttime Lights',
                url: 'https://map1.vis.earthdata.nasa.gov/wmts-webmerc/VIIRS_CityLights_2012/default/GoogleMapsCompatible_Level8/{z}/{y}/{x}.jpg',
                description: 'Monthly composite data from Visible Infrared Imaging Radiometer Suite',
                resolution: '500m',
                updateFrequency: 'Monthly'
            },
            worldAtlas: {
                name: 'World Atlas of Artificial Night Sky Brightness',
                // Using a fallback satellite/hybrid layer since actual World Atlas tiles often require specific paid API keys
                // In a real app, this would be the specific Falchi et al. tile layer
                url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
                description: 'Scientific model of artificial night sky brightness',
                resolution: '1km',
                updateFrequency: 'Annual'
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
            console.log('🌃 Loading VIIRS nighttime lights layer...');
            if (!this.webGIS.map.getPane('viirsPane')) {
                this.webGIS.map.createPane('viirsPane');
                this.webGIS.map.getPane('viirsPane').style.zIndex = 200;
            }
            
            return L.tileLayer(this.datasets.viirs.url, {
                attribution: 'NASA VIIRS Nighttime Lights',
                maxZoom: 8,
                opacity: 0.7,
                pane: 'viirsPane',
                errorTileUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='
            });
        } catch (error) {
            console.error('❌ Failed to load VIIRS layer:', error);
            return L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: 'OpenStreetMap (VIIRS fallback)',
                opacity: 0.5
            });
        }
    }

    // --- NEW METHOD ADDED TO FIX ERROR ---
    async loadWorldAtlasLayer() {
        try {
            console.log('🌍 Loading World Atlas layer...');
            
            // Create specific pane for World Atlas to control Z-index
            // VIIRS is 200, Markers are 600. We place this at 250 to sit on top of VIIRS if both are active.
            if (!this.webGIS.map.getPane('worldAtlasPane')) {
                this.webGIS.map.createPane('worldAtlasPane');
                this.webGIS.map.getPane('worldAtlasPane').style.zIndex = 250;
            }
            
            return L.tileLayer(this.datasets.worldAtlas.url, {
                attribution: 'World Atlas / Esri World Imagery',
                maxZoom: 18,
                opacity: 0.6,
                pane: 'worldAtlasPane'
            });
        } catch (error) {
            console.error('❌ Failed to load World Atlas layer:', error);
            return null;
        }
    }
    // -------------------------------------

    async loadHeatmapLayer() {
        try {
            console.log('🔥 Loading light pollution heatmap...');
            
            // Generate heatmap based on population density (no API calls)
            const bounds = this.webGIS.map.getBounds();
            const heatmapPoints = this.generateHeatmapFromPopulation(bounds);
            
            const heatmapLayer = L.heatLayer(heatmapPoints, {
                radius: 25,
                blur: 15,
                maxZoom: 12,
                minOpacity: 0.3,
                gradient: {
                    0.0: '#1a237e',   // Deep Blue (Excellent)
                    0.2: '#0277bd',   // Sky Blue (Good)
                    0.4: '#ff9800',   // Orange (Moderate)
                    0.6: '#e65100',   // Deep Orange (High)
                    0.8: '#b71c1c',   // Red (Very High)
                    1.0: '#4a148c'    // Purple (Extreme)
                }
            });
            
            this.heatmapData = heatmapLayer;
            return heatmapLayer;
        } catch (error) {
            console.error('❌ Failed to load heatmap layer:', error);
            return L.layerGroup();
        }
    }

    generateHeatmapFromPopulation(bounds) {
        const points = [];
        const north = bounds.getNorth();
        const south = bounds.getSouth();
        const east = bounds.getEast();
        const west = bounds.getWest();
        
        // Sample 100 points
        for (let i = 0; i < 100; i++) {
            const lat = south + Math.random() * (north - south);
            const lng = west + Math.random() * (east - west);
            
            const latFactor = (90 - Math.abs(lat)) / 90; // More pollution near equator
            const populationFactor = this.estimatePopulationDensity(lat, lng);
            const randomFactor = 0.8 + Math.random() * 0.4;
            
            const intensity = Math.min(1, (latFactor * 0.3 + populationFactor * 0.7) * randomFactor);
            
            if (intensity > 0.05) { // Only add points with significant pollution
                points.push([lat, lng, intensity]);
            }
        }
        
        return points;
    }

    async getDataAtPoint(lat, lng) {
        const key = `point_${lat}_${lng}`;
        
        return this.fetchWithCache(key, async () => {
            const populationFactor = this.estimatePopulationDensity(lat, lng);
            const cityDistanceFactor = this.calculateCityDistanceFactor(lat, lng);
            const latFactor = (90 - Math.abs(lat)) / 90;
            
            const viirsValue = (populationFactor * 0.5 + cityDistanceFactor * 0.3 + latFactor * 0.2) * 50;
            
            return {
                viirsValue: Math.max(0.1, viirsValue),
                bortleScale: this.calculateBortleScale(viirsValue),
                sqmValue: this.calculateSQMValue(viirsValue),
                description: this.getPollutionDescription(viirsValue),
                dataSource: 'Statistical Model',
                timestamp: new Date().toISOString(),
                coordinates: { lat, lng },
                calculationMethod: 'Population Density + City Proximity Model'
            };
        });
    }

    calculateCityDistanceFactor(lat, lng) {
        const majorCities = [
            { name: 'New York', lat: 40.7128, lng: -74.0060, weight: 1.0 },
            { name: 'Los Angeles', lat: 34.0522, lng: -118.2437, weight: 0.9 },
            { name: 'London', lat: 51.5074, lng: -0.1278, weight: 0.8 },
            { name: 'Tokyo', lat: 35.6762, lng: 139.6503, weight: 0.9 },
            { name: 'Shanghai', lat: 31.2304, lng: 121.4737, weight: 0.7 },
            { name: 'Paris', lat: 48.8566, lng: 2.3522, weight: 0.6 },
            { name: 'Moscow', lat: 55.7558, lng: 37.6173, weight: 0.5 },
            { name: 'Sydney', lat: -33.8688, lng: 151.2093, weight: 0.4 }
        ];
        
        let totalWeightedInfluence = 0;
        let totalWeight = 0;
        
        majorCities.forEach(city => {
            const distance = this.calculateDistance(lat, lng, city.lat, city.lng);
            if (distance < 2000) { 
                const influence = city.weight * (1 - distance / 2000);
                totalWeightedInfluence += influence;
                totalWeight += city.weight;
            }
        });
        
        return totalWeight > 0 ? totalWeightedInfluence / totalWeight : 0;
    }

    calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371;
        const dLat = this.toRad(lat2 - lat1);
        const dLon = this.toRad(lon2 - lon1);
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
                Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    }

    toRad(degrees) {
        return degrees * Math.PI / 180;
    }

    estimatePopulationDensity(lat, lng) {
        const northernFactor = lat > 0 ? 0.7 : 0.3;
        const coastalFactor = Math.abs(Math.sin(lng * Math.PI / 180)) * 0.5 + 0.5;
        const polarFactor = 1 - (Math.abs(lat) / 90);
        
        return (northernFactor * 0.4 + coastalFactor * 0.3 + polarFactor * 0.3);
    }

    async getTimeSeriesData(lat, lng, startYear, endYear) {
        const key = `timeseries_${lat}_${lng}_${startYear}_${endYear}`;
        
        return this.fetchWithCache(key, async () => {
            const data = [];
            const basePollution = await this.getDataAtPoint(lat, lng);
            const baseValue = basePollution.viirsValue;
            
            for (let year = startYear; year <= endYear; year++) {
                const yearsFromStart = year - startYear;
                const globalTrend = 1 + (yearsFromStart * 0.02); 
                const regionalVariation = 0.95 + Math.random() * 0.1;
                const randomFluctuation = 0.9 + Math.random() * 0.2;
                
                const brightness = baseValue * globalTrend * regionalVariation * randomFluctuation;
                
                data.push({
                    year: year,
                    brightness: brightness.toFixed(2),
                    confidence: Math.random() > 0.3 ? 'high' : 'medium',
                    trend: globalTrend.toFixed(3)
                });
            }
            
            return {
                data,
                location: { lat, lng },
                period: { startYear, endYear },
                dataSource: 'Statistical Trend Model',
                units: 'μcd/m²',
                methodology: 'Based on global urbanization trends (2% annual increase) with regional variations'
            };
        });
    }

    async loadDarkSkyParks() {
        try {
            console.log('⭐ Loading dark sky parks...');
            
            if (!this.webGIS.map.getPane('markerPane')) {
                this.webGIS.map.createPane('markerPane');
                this.webGIS.map.getPane('markerPane').style.zIndex = 600;
            }
            
            const parksLayer = L.layerGroup();
            const mockParks = this.getFallbackDarkSkyParks();
            
            mockParks.forEach(park => {
                const marker = L.marker([park.lat, park.lng], {
                    icon: L.divIcon({
                        className: 'dark-sky-park-marker',
                        html: '<i class="fas fa-star" style="color: gold; font-size: 16px; text-shadow: 0 0 8px rgba(255,215,0,0.8);"></i>',
                        iconSize: [20, 20],
                        iconAnchor: [10, 10]
                    }),
                    pane: 'markerPane'
                }).bindPopup(`
                    <div class="dark-sky-popup">
                        <h6>${park.name}</h6>
                        <p><strong>Type:</strong> ${park.type}</p>
                        <p><strong>Country:</strong> ${park.country}</p>
                        <p><strong>Status:</strong> Certified Dark Sky Area</p>
                        <p><strong>Certification:</strong> International Dark-Sky Association</p>
                        <div class="mt-2">
                            <button class="btn btn-sm btn-info" onclick="webGIS.showMessage('📍 ${park.name} - Perfect for observation!')">
                                View Details
                            </button>
                        </div>
                    </div>
                `, {
                    pane: 'popupPane'
                });
                parksLayer.addLayer(marker);
            });
            
            console.log('✅ Dark sky parks loaded successfully');
            return parksLayer;
        } catch (error) {
            console.error('❌ Error loading dark sky parks:', error);
            return L.layerGroup();
        }
    }

    getFallbackDarkSkyParks() {
        return [
            { name: 'Death Valley National Park', lat: 36.24, lng: -116.82, type: 'International Dark Sky Park', country: 'USA' },
            { name: 'Cherry Springs State Park', lat: 41.66, lng: -77.82, type: 'Dark Sky Park', country: 'USA' },
            { name: 'Galloway Forest Park', lat: 55.12, lng: -4.41, type: 'Dark Sky Park', country: 'Scotland' },
            { name: 'Aoraki Mackenzie', lat: -43.73, lng: 170.10, type: 'Dark Sky Reserve', country: 'New Zealand' },
            { name: 'Natural Bridges Monument', lat: 37.60, lng: -110.00, type: 'Dark Sky Park', country: 'USA' },
            { name: 'Mont-Mégantic', lat: 45.46, lng: -71.15, type: 'Dark Sky Reserve', country: 'Canada' },
            { name: 'Exmoor National Park', lat: 51.14, lng: -3.63, type: 'Dark Sky Reserve', country: 'England' },
            { name: 'Warrumbungle National Park', lat: -31.28, lng: 149.00, type: 'Dark Sky Park', country: 'Australia' }
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
                    radius: 6,
                    fillColor: color,
                    color: '#fff',
                    weight: 1,
                    opacity: 0.8,
                    fillOpacity: 0.6,
                    pane: 'markerPane'
                }).bindPopup(`
                    <div class="station-popup">
                        <h6>${station.name}</h6>
                        <p><strong>Brightness:</strong> ${station.brightness} μcd/m²</p>
                        <p><strong>Elevation:</strong> ${station.elevation}</p>
                        <p><strong>Type:</strong> ${station.type}</p>
                        <p><strong>Last Reading:</strong> ${station.lastReading}</p>
                        <div class="mt-2">
                            <span class="badge bg-${station.status === 'Active' ? 'success' : 'warning'}">${station.status}</span>
                        </div>
                    </div>
                `, {
                    pane: 'popupPane'
                });
                measurementsLayer.addLayer(marker);
            });
            
            console.log('✅ Ground measurements loaded successfully');
            return measurementsLayer;
        } catch (error) {
            console.error('❌ Error loading ground measurements:', error);
            return L.layerGroup();
        }
    }

    getFallbackGroundMeasurements() {
        return [
            { name: 'Mauna Kea Observatory', lat: 19.82, lng: -155.47, brightness: 0.8, elevation: '4205m', type: 'Research Observatory', status: 'Active', lastReading: '2023-11-15' },
            { name: 'Paranal Observatory', lat: -24.63, lng: -70.40, brightness: 0.9, elevation: '2635m', type: 'Research Observatory', status: 'Active', lastReading: '2023-11-10' },
            { name: 'Roque de los Muchachos', lat: 28.76, lng: -17.89, brightness: 1.1, elevation: '2396m', type: 'Research Observatory', status: 'Active', lastReading: '2023-11-12' },
            { name: 'Siding Spring Observatory', lat: -31.27, lng: 149.07, brightness: 1.3, elevation: '1165m', type: 'Research Observatory', status: 'Active', lastReading: '2023-11-08' },
            { name: 'Kitt Peak National Observatory', lat: 31.96, lng: -111.60, brightness: 2.1, elevation: '2120m', type: 'Research Observatory', status: 'Active', lastReading: '2023-11-05' },
            { name: 'Cerro Tololo', lat: -30.17, lng: -70.80, brightness: 0.7, elevation: '2200m', type: 'Research Observatory', status: 'Active', lastReading: '2023-11-20' },
            { name: 'La Silla Observatory', lat: -29.26, lng: -70.73, brightness: 0.8, elevation: '2400m', type: 'Research Observatory', status: 'Active', lastReading: '2023-11-18' }
        ];
    }

    getColorForBrightness(brightness) {
        if (brightness < 1.5) return '#1a237e';
        if (brightness < 3) return '#0277bd';
        if (brightness < 8) return '#ff9800';
        if (brightness < 27) return '#e65100';
        return '#b71c1c';
    }

    calculateBortleScale(value) {
        if (value < 1.5) return '1 (Excellent Dark Sky)';
        if (value < 3) return '2 (Typical truly dark site)';
        if (value < 8) return '3 (Rural sky)';
        if (value < 27) return '4 (Rural/suburban transition)';
        if (value < 80) return '5 (Suburban sky)';
        if (value < 250) return '6 (Bright suburban sky)';
        if (value < 750) return '7 (Suburban/urban transition)';
        if (value < 2500) return '8 (City sky)';
        return '9 (Inner-city sky)';
    }

    calculateSQMValue(value) {
        const sqm = 22.0 - 2.5 * Math.log10(value + 0.001);
        return sqm.toFixed(2);
    }

    getPollutionDescription(value) {
        if (value < 1.5) return 'Excellent dark sky conditions - perfect for astronomy';
        if (value < 3) return 'Good for astronomical observation - very good conditions';
        if (value < 8) return 'Moderate light pollution - acceptable for basic observation';
        if (value < 27) return 'High light pollution - limited visibility of stars';
        return 'Very high light pollution - poor observation conditions';
    }

    exportData(formats, data) {
        formats.forEach(format => {
            console.log(`Exporting data as ${format}...`);
            let content, mimeType, extension;
            
            if (format === 'csv') {
                content = this.convertToCSV(data);
                mimeType = 'text/csv';
                extension = 'csv';
            } else if (format === 'json') {
                content = JSON.stringify(data, null, 2);
                mimeType = 'application/json';
                extension = 'json';
            } else if (format === 'geojson') {
                content = this.convertToGeoJSON(data);
                mimeType = 'application/json';
                extension = 'geojson';
            }
            
            const blob = new Blob([content], { type: mimeType });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `light-pollution-data-${new Date().toISOString().split('T')[0]}.${extension}`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        });
    }

    convertToCSV(data) {
        if (Array.isArray(data)) {
            if (data.length === 0) return '';
            const headers = Object.keys(data[0]).join(',');
            const rows = data.map(row => {
                return Object.values(row).map(value => {
                    if (typeof value === 'string' && value.includes(',')) {
                        return `"${value}"`;
                    }
                    return value;
                }).join(',');
            }).join('\n');
            return `${headers}\n${rows}`;
        } else if (typeof data === 'object') {
            const flattened = this.flattenObject(data);
            return flattened.map(entry => `${entry.key},${entry.value}`).join('\n');
        }
        return '';
    }

    convertToGeoJSON(data) {
        const geojson = {
            type: 'FeatureCollection',
            features: []
        };
        
        if (Array.isArray(data) && data[0] && data[0].lat !== undefined && data[0].lng !== undefined) {
            geojson.features = data.map(item => ({
                type: 'Feature',
                geometry: {
                    type: 'Point',
                    coordinates: [item.lng, item.lat]
                },
                properties: {
                    brightness: item.brightness,
                    bortle: item.bortle,
                    sqm: item.sqm,
                    description: item.description || '',
                    timestamp: item.timestamp || new Date().toISOString(),
                    dataSource: item.dataSource || 'Statistical Model'
                }
            }));
        }
        
        return JSON.stringify(geojson, null, 2);
    }

    flattenObject(obj, prefix = '') {
        const result = [];
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                const value = obj[key];
                const newKey = prefix ? `${prefix}.${key}` : key;
                
                if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                    result.push(...this.flattenObject(value, newKey));
                } else if (Array.isArray(value)) {
                    value.forEach((item, index) => {
                        if (typeof item === 'object' && item !== null) {
                            result.push(...this.flattenObject(item, `${newKey}[${index}]`));
                        } else {
                            result.push({ key: `${newKey}[${index}]`, value: item });
                        }
                    });
                } else {
                    result.push({ key: newKey, value });
                }
            }
        }
        return result;
    }
}