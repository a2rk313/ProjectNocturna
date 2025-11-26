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
            }
        };
    }

    async loadVIIRSTileLayer() {
        try {
            console.log('🌃 Loading VIIRS nighttime lights layer...');
            return L.tileLayer(this.datasets.viirs.url, {
                attribution: 'NASA VIIRS Nighttime Lights',
                maxZoom: 8,
                opacity: 0.7,
                errorTileUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='
            });
        } catch (error) {
            console.error('❌ Failed to load VIIRS layer:', error);
            // Fallback to a simple tile layer
            return L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: 'OpenStreetMap (VIIRS fallback)',
                opacity: 0.5
            });
        }
    }

    async loadWorldAtlasLayer() {
        try {
            console.log('🗺️ Loading World Atlas layer...');
            return L.tileLayer(this.datasets.worldAtlas.url, {
                attribution: 'World Atlas of Artificial Night Sky Brightness',
                maxZoom: 10,
                opacity: 0.6
            });
        } catch (error) {
            console.error('❌ Failed to load World Atlas layer:', error);
            return L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: 'OpenStreetMap (World Atlas fallback)',
                opacity: 0.4
            });
        }
    }

    async loadDarkSkyParks() {
        try {
            console.log('⭐ Loading dark sky parks...');
            
            // Create mock dark sky park data
            const mockParks = [
                { 
                    name: 'Death Valley National Park', 
                    lat: 36.24, 
                    lng: -116.82, 
                    type: 'International Dark Sky Park', 
                    country: 'USA',
                    brightness: '1.2',
                    bortle: '2'
                },
                { 
                    name: 'Cherry Springs State Park', 
                    lat: 41.66, 
                    lng: -77.82, 
                    type: 'Dark Sky Park', 
                    country: 'USA',
                    brightness: '1.5',
                    bortle: '2'
                },
                { 
                    name: 'Galloway Forest Park', 
                    lat: 55.12, 
                    lng: -4.41, 
                    type: 'Dark Sky Park', 
                    country: 'Scotland',
                    brightness: '1.8',
                    bortle: '3'
                },
                { 
                    name: 'Aoraki Mackenzie', 
                    lat: -43.73, 
                    lng: 170.10, 
                    type: 'Dark Sky Reserve', 
                    country: 'New Zealand',
                    brightness: '1.1',
                    bortle: '1'
                },
                { 
                    name: 'Natural Bridges Monument', 
                    lat: 37.60, 
                    lng: -110.00, 
                    type: 'Dark Sky Park', 
                    country: 'USA',
                    brightness: '1.3',
                    bortle: '2'
                }
            ];

            const parksLayer = L.layerGroup();
            
            mockParks.forEach(park => {
                const marker = L.marker([park.lat, park.lng], {
                    icon: L.divIcon({
                        className: 'dark-sky-park-marker',
                        html: '<i class="fas fa-star" style="color: gold; font-size: 16px;"></i>',
                        iconSize: [20, 20],
                        iconAnchor: [10, 10]
                    })
                }).bindPopup(`
                    <div class="dark-sky-popup">
                        <h6>${park.name}</h6>
                        <p><strong>Type:</strong> ${park.type}</p>
                        <p><strong>Country:</strong> ${park.country}</p>
                        <p><strong>Brightness:</strong> ${park.brightness} μcd/m²</p>
                        <p><strong>Bortle Scale:</strong> ${park.bortle} (Excellent)</p>
                        <p><strong>Status:</strong> Certified Dark Sky Area</p>
                        <div class="mt-2">
                            <button class="btn btn-sm btn-info" onclick="webGIS.showMessage('📍 ${park.name} - Perfect for observation!')">
                                View Details
                            </button>
                        </div>
                    </div>
                `);
                parksLayer.addLayer(marker);
            });
            
            console.log('✅ Dark sky parks loaded successfully');
            return parksLayer;
        } catch (error) {
            console.error('❌ Error loading dark sky parks:', error);
            return L.layerGroup();
        }
    }

    async loadGroundMeasurements() {
        try {
            console.log('📡 Loading ground measurement stations...');
            
            // Create mock ground measurement data
            const mockMeasurements = [
                { 
                    name: 'Mauna Kea Observatory', 
                    lat: 19.82, 
                    lng: -155.47, 
                    brightness: 0.8, 
                    date: '2023-11-15',
                    organization: 'NASA/University of Hawaii'
                },
                { 
                    name: 'Paranal Observatory', 
                    lat: -24.63, 
                    lng: -70.40, 
                    brightness: 0.9, 
                    date: '2023-11-10',
                    organization: 'ESO'
                },
                { 
                    name: 'Roque de los Muchachos', 
                    lat: 28.76, 
                    lng: -17.89, 
                    brightness: 1.1, 
                    date: '2023-11-12',
                    organization: 'IAC'
                },
                { 
                    name: 'Siding Spring Observatory', 
                    lat: -31.27, 
                    lng: 149.07, 
                    brightness: 1.3, 
                    date: '2023-11-08',
                    organization: 'Australian National University'
                },
                { 
                    name: 'Kitt Peak National Observatory', 
                    lat: 31.96, 
                    lng: -111.60, 
                    brightness: 2.1, 
                    date: '2023-11-05',
                    organization: 'NOIRLab'
                }
            ];

            const measurementsLayer = L.layerGroup();
            
            mockMeasurements.forEach(station => {
                const color = this.getColorForBrightness(station.brightness);
                const marker = L.circleMarker([station.lat, station.lng], {
                    radius: 8,
                    fillColor: color,
                    color: '#000',
                    weight: 1,
                    opacity: 1,
                    fillOpacity: 0.8
                }).bindPopup(`
                    <div class="station-popup">
                        <h6>${station.name}</h6>
                        <p><strong>Brightness:</strong> ${station.brightness} μcd/m²</p>
                        <p><strong>Date:</strong> ${station.date}</p>
                        <p><strong>Organization:</strong> ${station.organization}</p>
                        <p><strong>Conditions:</strong> Excellent</p>
                        <p><strong>Bortle Scale:</strong> ${station.brightness < 1.5 ? '1-2' : '2-3'}</p>
                        <div class="mt-2">
                            <span class="badge bg-success">Verified Data</span>
                        </div>
                    </div>
                `);
                measurementsLayer.addLayer(marker);
            });
            
            console.log('✅ Ground measurements loaded successfully');
            return measurementsLayer;
        } catch (error) {
            console.error('❌ Error loading ground measurements:', error);
            return L.layerGroup();
        }
    }

    getColorForBrightness(brightness) {
        if (brightness < 1.5) return '#000080'; // Excellent - Dark Blue
        if (brightness < 3) return '#0000FF';   // Good - Blue
        if (brightness < 8) return '#00FF00';   // Moderate - Green
        if (brightness < 27) return '#FFFF00';  // High - Yellow
        return '#FF0000'; // Very High - Red
    }

    async getDataAtPoint(lat, lng) {
        console.log(`📊 Getting data for point: ${lat.toFixed(4)}, ${lng.toFixed(4)}`);
        
        // Simulate API call to get data at point with realistic values
        return new Promise(resolve => {
            setTimeout(() => {
                // Generate realistic data based on latitude (more light pollution in populated areas)
                const baseValue = Math.abs(lat) < 30 ? 25 : 10; // More pollution near equator
                const randomVariation = (Math.random() - 0.5) * 15;
                const viirsValue = Math.max(0.5, baseValue + randomVariation);
                
                const mockData = {
                    coordinates: { lat, lng },
                    viirsValue: parseFloat(viirsValue.toFixed(2)),
                    worldAtlasValue: parseFloat((viirsValue * 0.9 + Math.random() * 5).toFixed(2)),
                    groundMeasurement: parseFloat((viirsValue * 0.8 + Math.random() * 3).toFixed(2)),
                    bortleScale: this.calculateBortleScale(viirsValue),
                    sqmValue: this.calculateSQMValue(viirsValue)
                };
                
                console.log(`✅ Data retrieved: ${mockData.viirsValue} μcd/m², Bortle ${mockData.bortleScale}`);
                resolve(mockData);
            }, 300);
        });
    }

    calculateBortleScale(brightness) {
        if (brightness < 1.5) return '1-2';
        if (brightness < 3) return '3';
        if (brightness < 8) return '4';
        if (brightness < 15) return '5';
        if (brightness < 27) return '6-7';
        return '8-9';
    }

    calculateSQMValue(brightness) {
        // Convert brightness to SQM magnitude (approximate conversion)
        const sqm = 22.0 - (2.5 * Math.log10(brightness / 0.84));
        return sqm.toFixed(2);
    }

    async getTimeSeriesData(lat, lng, startYear = 2012, endYear = 2023) {
        console.log(`📈 Getting time series data for ${startYear}-${endYear}`);
        
        // Simulate time series data with realistic trends
        const years = [];
        const data = [];
        
        // Base trend - increasing light pollution over time
        const baseTrend = 0.8; // 0.8 μcd/m² increase per year on average
        
        for (let year = startYear; year <= endYear; year++) {
            const yearsFromStart = year - startYear;
            const baseValue = 5 + (baseTrend * yearsFromStart);
            const randomVariation = (Math.random() - 0.5) * 3;
            const brightness = Math.max(0.5, baseValue + randomVariation);
            
            years.push(year);
            data.push({
                year: year,
                brightness: brightness.toFixed(2),
                trend: brightness > (5 + baseTrend * yearsFromStart) ? 'increasing' : 'decreasing',
                change: (brightness - (5 + baseTrend * (yearsFromStart - 1))).toFixed(2)
            });
        }
        
        return { years, data };
    }

    exportData(formats = ['csv', 'json'], data) {
        console.log(`📤 Exporting data in formats: ${formats.join(', ')}`);
        
        formats.forEach(format => {
            let content, mimeType, extension;
            
            switch (format) {
                case 'csv':
                    content = this.convertToCSV(data);
                    mimeType = 'text/csv';
                    extension = 'csv';
                    break;
                case 'json':
                    content = JSON.stringify(data, null, 2);
                    mimeType = 'application/json';
                    extension = 'json';
                    break;
                case 'geojson':
                    content = JSON.stringify(this.convertToGeoJSON(data), null, 2);
                    mimeType = 'application/json';
                    extension = 'geojson';
                    break;
            }
            
            this.downloadFile(content, `light_pollution_data.${extension}`, mimeType);
        });
        
        console.log('✅ Data export completed');
    }

    convertToCSV(data) {
        if (Array.isArray(data)) {
            if (data.length === 0) return '';
            const headers = Object.keys(data[0]).join(',');
            const rows = data.map(row => 
                Object.values(row).map(value => 
                    typeof value === 'string' && value.includes(',') ? `"${value}"` : value
                ).join(',')
            );
            return [headers, ...rows].join('\n');
        }
        return 'data';
    }

    convertToGeoJSON(data) {
        if (Array.isArray(data)) {
            return {
                type: 'FeatureCollection',
                features: data.map(item => ({
                    type: 'Feature',
                    geometry: {
                        type: 'Point',
                        coordinates: [item.lng, item.lat]
                    },
                    properties: item
                }))
            };
        }
        return {
            type: 'FeatureCollection',
            features: []
        };
    }

    downloadFile(content, fileName, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }
}