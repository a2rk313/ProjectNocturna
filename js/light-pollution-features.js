// light-pollution-features.js - Additional features inspired by lightpollutionmap.app
class LightPollutionFeatures {
    constructor(webgis) {
        this.webgis = webgis;
        this.bortleLayer = null;
        this.darkSkyReservesLayer = null;
        this.auroraForecastLayer = null;
        this.milkyWayVisibilityLayer = null;
        
        this.init();
    }
    
    init() {
        this.setupLayerControls();
        console.log("🌟 Light Pollution Features module initialized");
    }
    
    setupLayerControls() {
        // Bortle Scale Control
        const bortleToggle = document.getElementById('toggleBortleScale');
        if (bortleToggle) {
            bortleToggle.addEventListener('change', (e) => {
                if (e.target.checked) {
                    this.loadBortleScaleLayer();
                } else {
                    this.removeBortleLayer();
                }
            });
        }
        
        // Dark Sky Reserves Control
        const darkSkyToggle = document.getElementById('toggleDarkSkyPlaces');
        if (darkSkyToggle) {
            darkSkyToggle.addEventListener('change', (e) => {
                if (e.target.checked) {
                    this.loadDarkSkyReservesLayer();
                } else {
                    this.removeDarkSkyReservesLayer();
                }
            });
        }
        
        // Aurora Forecast Control
        const auroraToggle = document.getElementById('toggleAuroraForecast');
        if (auroraToggle) {
            auroraToggle.addEventListener('change', (e) => {
                if (e.target.checked) {
                    this.loadAuroraForecastLayer();
                } else {
                    this.removeAuroraForecastLayer();
                }
            });
        }
        
        // Milky Way Visibility Control
        const milkyWayToggle = document.getElementById('toggleMilkyWay');
        if (milkyWayToggle) {
            milkyWayToggle.addEventListener('change', (e) => {
                if (e.target.checked) {
                    this.loadMilkyWayVisibilityLayer();
                } else {
                    this.removeMilkyWayVisibilityLayer();
                }
            });
        }
    }
    
    async loadBortleScaleLayer() {
        try {
            // Remove existing layer if present
            this.removeBortleLayer();
            
            // Create a choropleth layer representing Bortle scale classes
            // This would normally come from a real data source, but we'll simulate it
            const bortleData = await this.fetchBortleData();
            
            if (bortleData && bortleData.features && bortleData.features.length > 0) {
                this.bortleLayer = L.geoJSON(bortleData, {
                    style: (feature) => this.getBortleStyle(feature.properties.class),
                    onEachFeature: (feature, layer) => {
                        layer.bindPopup(this.createBortlePopup(feature));
                    }
                }).addTo(this.webgis.map);
                
                console.log(`✅ Bortle Scale layer loaded with ${bortleData.features.length} regions`);
            } else {
                // If no real data available, create sample regions
                this.createSampleBortleRegions();
            }
        } catch (error) {
            console.warn('Bortle Scale layer load failed, creating sample data:', error);
            this.createSampleBortleRegions();
        }
    }
    
    removeBortleLayer() {
        if (this.bortleLayer) {
            this.webgis.map.removeLayer(this.bortleLayer);
            this.bortleLayer = null;
        }
    }
    
    async fetchBortleData() {
        try {
            // Simulate fetching Bortle scale data
            // In a real implementation, this would fetch from an API
            const bounds = this.webgis.map.getBounds();
            const bbox = [
                bounds.getWest(),
                bounds.getSouth(),
                bounds.getEast(),
                bounds.getNorth()
            ].join(',');
            
            // For now, return sample data since we don't have a real API
            return this.generateSampleBortleData(bounds);
        } catch (error) {
            console.error('Error fetching Bortle data:', error);
            return null;
        }
    }
    
    generateSampleBortleData(bounds) {
        // Generate sample Bortle scale polygons based on the current map view
        const center = bounds.getCenter();
        const halfLat = (bounds.getNorth() - bounds.getSouth()) / 4;
        const halfLng = (bounds.getEast() - bounds.getWest()) / 4;
        
        // Sample Bortle scale classifications (1-9, where 1 is darkest, 9 is brightest)
        const bortleClasses = [
            { class: 1, name: "Excellent Dark Sky", color: "#000080" }, // Deep blue
            { class: 2, name: "Typical True Dark Sky", color: "#0000FF" }, // Blue
            { class: 3, name: "Rural Sky", color: "#0080FF" }, // Light blue
            { class: 4, name: "Rural/Suburban Transition", color: "#00FFFF" }, // Cyan
            { class: 5, name: "Suburban Sky", color: "#00FF00" }, // Green
            { class: 6, name: "Bright Suburban Sky", color: "#FFFF00" }, // Yellow
            { class: 7, name: "Suburban/Urban Transition", color: "#FF8000" }, // Orange
            { class: 8, name: "City Sky", color: "#FF4000" }, // Red-orange
            { class: 9, name: "Inner City Sky", color: "#FF0000" }  // Red
        ];
        
        // Create sample polygons around the map center
        const features = [];
        for (let i = 0; i < 5; i++) {
            const offsetLat = (Math.random() - 0.5) * halfLat * 2;
            const offsetLng = (Math.random() - 0.5) * halfLng * 2;
            const bortleClass = Math.floor(Math.random() * 9) + 1; // Random class 1-9
            
            features.push({
                type: "Feature",
                properties: {
                    class: bortleClass,
                    name: bortleClasses[bortleClass - 1].name
                },
                geometry: {
                    type: "Polygon",
                    coordinates: [[
                        [center.lng + offsetLng - 0.1, center.lat + offsetLat - 0.1],
                        [center.lng + offsetLng + 0.1, center.lat + offsetLat - 0.1],
                        [center.lng + offsetLng + 0.1, center.lat + offsetLat + 0.1],
                        [center.lng + offsetLng - 0.1, center.lat + offsetLat + 0.1],
                        [center.lng + offsetLng - 0.1, center.lat + offsetLat - 0.1]
                    ]]
                }
            });
        }
        
        return {
            type: "FeatureCollection",
            features: features
        };
    }
    
    getBortleStyle(classNum) {
        const bortleColors = {
            1: { fillColor: '#000080', color: '#000033', weight: 1, fillOpacity: 0.7 }, // Excellent Dark Sky
            2: { fillColor: '#0000FF', color: '#000033', weight: 1, fillOpacity: 0.7 }, // Typical True Dark Sky
            3: { fillColor: '#0080FF', color: '#000033', weight: 1, fillOpacity: 0.7 }, // Rural Sky
            4: { fillColor: '#00FFFF', color: '#000033', weight: 1, fillOpacity: 0.7 }, // Rural/Suburban Transition
            5: { fillColor: '#00FF00', color: '#003300', weight: 1, fillOpacity: 0.7 }, // Suburban Sky
            6: { fillColor: '#FFFF00', color: '#333300', weight: 1, fillOpacity: 0.7 }, // Bright Suburban Sky
            7: { fillColor: '#FF8000', color: '#331900', weight: 1, fillOpacity: 0.7 }, // Suburban/Urban Transition
            8: { fillColor: '#FF4000', color: '#330D00', weight: 1, fillOpacity: 0.7 }, // City Sky
            9: { fillColor: '#FF0000', color: '#330000', weight: 1, fillOpacity: 0.7 }  // Inner City Sky
        };
        
        return bortleColors[classNum] || bortleColors[5]; // Default to suburban if unknown
    }
    
    createBortlePopup(feature) {
        const bortleClasses = {
            1: "Excellent Dark Sky",
            2: "Typical True Dark Sky", 
            3: "Rural Sky",
            4: "Rural/Suburban Transition",
            5: "Suburban Sky",
            6: "Bright Suburban Sky",
            7: "Suburban/Urban Transition",
            8: "City Sky",
            9: "Inner City Sky"
        };
        
        const className = bortleClasses[feature.properties.class] || "Unknown";
        
        return `
            <div class="bortle-popup">
                <h6><i class="fas fa-star"></i> Bortle Scale Classification</h6>
                <table class="table table-sm table-borderless">
                    <tr><td><strong>Class:</strong></td><td>${feature.properties.class} - ${className}</td></tr>
                    <tr><td><strong>Description:</strong></td><td>${this.getBortleDescription(feature.properties.class)}</td></tr>
                    <tr><td><strong>Limiting Magnitude:</strong></td><td>${this.getBortleMagnitude(feature.properties.class)}</td></tr>
                </table>
            </div>
        `;
    }
    
    getBortleDescription(classNum) {
        const descriptions = {
            1: "Best dark-sky sites in the world. Airglow visible. M33 visible with naked eye.",
            2: "Near the very best dark-sky sites. Zodiacal light extends to zenith.",
            3: "Rural sky. Zodiacal light bright and extends well above horizon after sunset.",
            4: "Rural/suburban transition. Zodiacal light extends to zenith during spring/fall evenings.",
            5: "Suburban sky. M31 visible to naked eye. Triangulum Galaxy (M33) difficult to see.",
            6: "Bright suburban sky. M31 and M4 are visible with binoculars.",
            7: "Suburban/urban transition. Only 50+ constellation stars visible.",
            8: "City sky. Only 20-30 constellation stars visible.",
            9: "Inner city sky. Only 10-15 of the brightest stars visible."
        };
        
        return descriptions[classNum] || "Unknown classification";
    }
    
    getBortleMagnitude(classNum) {
        const magnitudes = {
            1: "6.6+",
            2: "6.5",
            3: "6.1-6.5",
            4: "5.6-6.0",
            5: "5.0-5.5",
            6: "4.5-5.0",
            7: "4.0-4.5",
            8: "3.5-4.0",
            9: "3.0-3.5"
        };
        
        return magnitudes[classNum] || "Unknown";
    }
    
    async loadDarkSkyReservesLayer() {
        try {
            this.removeDarkSkyReservesLayer();
            
            // Fetch dark sky reserve locations
            const reservesData = await this.fetchDarkSkyReserves();
            
            if (reservesData && reservesData.length > 0) {
                this.darkSkyReservesLayer = L.layerGroup();
                
                reservesData.forEach(reserve => {
                    const marker = L.circleMarker([reserve.lat, reserve.lng], {
                        radius: 10,
                        fillColor: '#00ff00',
                        color: '#008000',
                        weight: 2,
                        opacity: 1,
                        fillOpacity: 0.8
                    }).bindPopup(this.createDarkSkyPopup(reserve));
                    
                    this.darkSkyReservesLayer.addLayer(marker);
                });
                
                this.darkSkyReservesLayer.addTo(this.webgis.map);
                console.log(`✅ Loaded ${reservesData.length} Dark Sky Reserves`);
            } else {
                // Create sample data if no real data available
                this.createSampleDarkSkyReserves();
            }
        } catch (error) {
            console.warn('Dark Sky Reserves layer load failed:', error);
            this.createSampleDarkSkyReserves();
        }
    }
    
    removeDarkSkyReservesLayer() {
        if (this.darkSkyReservesLayer) {
            this.webgis.map.removeLayer(this.darkSkyReservesLayer);
            this.darkSkyReservesLayer = null;
        }
    }
    
    async fetchDarkSkyReserves() {
        try {
            // In a real implementation, this would fetch from an API
            // For now, return sample data
            return this.getSampleDarkSkyReserves();
        } catch (error) {
            console.error('Error fetching dark sky reserves:', error);
            return [];
        }
    }
    
    getSampleDarkSkyReserves() {
        // Sample dark sky reserves from around the world
        return [
            { name: "Aoraki Mackenzie", country: "New Zealand", lat: -44.00, lng: 170.20, designation: "Gold", sqm: 21.7 },
            { name: "Natural Bridges", country: "USA", lat: 37.20, lng: -112.00, designation: "Gold", sqm: 21.5 },
            { name: "Pic du Midi", country: "France", lat: 42.93, lng: 0.14, designation: "Silver", sqm: 20.8 },
            { name: "Exmoor National Park", country: "UK", lat: 51.00, lng: -3.50, designation: "Silver", sqm: 20.5 },
            { name: "Cherry Springs", country: "USA", lat: 41.39, lng: -77.97, designation: "Gold", sqm: 21.6 },
            { name: "Calar Alto", country: "Spain", lat: 37.23, lng: -2.54, designation: "Silver", sqm: 20.9 },
            { name: "Mont-Mégantic", country: "Canada", lat: 45.43, lng: -71.11, designation: "Gold", sqm: 21.4 },
            { name: "NamibRand", country: "Namibia", lat: -24.47, lng: 15.18, designation: "Gold", sqm: 21.8 }
        ];
    }
    
    createSampleDarkSkyReserves() {
        const reserves = this.getSampleDarkSkyReserves();
        this.darkSkyReservesLayer = L.layerGroup();
        
        reserves.forEach(reserve => {
            const marker = L.circleMarker([reserve.lat, reserve.lng], {
                radius: 10,
                fillColor: '#00ff00',
                color: '#008000',
                weight: 2,
                opacity: 1,
                fillOpacity: 0.8
            }).bindPopup(this.createDarkSkyPopup(reserve));
            
            this.darkSkyReservesLayer.addLayer(marker);
        });
        
        this.darkSkyReservesLayer.addTo(this.webgis.map);
        console.log(`✅ Created ${reserves.length} sample Dark Sky Reserves`);
    }
    
    createDarkSkyPopup(reserve) {
        return `
            <div class="dark-sky-popup">
                <h6><i class="fas fa-moon"></i> ${reserve.name}</h6>
                <table class="table table-sm table-borderless">
                    <tr><td><strong>Country:</strong></td><td>${reserve.country}</td></tr>
                    <tr><td><strong>Designation:</strong></td><td>${reserve.designation} Reserve</td></tr>
                    <tr><td><strong>SQM Reading:</strong></td><td>${reserve.sqm}</td></tr>
                    <tr><td><strong>Classification:</strong></td><td>Bortle Class 1-2</td></tr>
                </table>
            </div>
        `;
    }
    
    async loadAuroraForecastLayer() {
        try {
            this.removeAuroraForecastLayer();
            
            // Fetch aurora forecast data
            const auroraData = await this.fetchAuroraForecast();
            
            if (auroraData && auroraData.length > 0) {
                this.auroraForecastLayer = L.layerGroup();
                
                auroraData.forEach(aurora => {
                    const circle = L.circle([aurora.lat, aurora.lng], {
                        radius: aurora.radius * 1000, // Convert km to meters
                        fillColor: this.getAuroraColor(aurora.kpIndex),
                        color: '#3388ff',
                        weight: 1,
                        fillOpacity: 0.4
                    }).bindPopup(this.createAuroraPopup(aurora));
                    
                    this.auroraForecastLayer.addLayer(circle);
                });
                
                this.auroraForecastLayer.addTo(this.webgis.map);
                console.log(`✅ Loaded Aurora Forecast for ${auroraData.length} regions`);
            } else {
                // Create sample data if no real data available
                this.createSampleAuroraForecast();
            }
        } catch (error) {
            console.warn('Aurora Forecast layer load failed:', error);
            this.createSampleAuroraForecast();
        }
    }
    
    removeAuroraForecastLayer() {
        if (this.auroraForecastLayer) {
            this.webgis.map.removeLayer(this.auroraForecastLayer);
            this.auroraForecastLayer = null;
        }
    }
    
    async fetchAuroraForecast() {
        try {
            // In a real implementation, this would fetch from an aurora forecast API
            // For now, return sample data
            return this.getSampleAuroraForecast();
        } catch (error) {
            console.error('Error fetching aurora forecast:', error);
            return [];
        }
    }
    
    getSampleAuroraForecast() {
        // Sample aurora forecast data
        const bounds = this.webgis.map.getBounds();
        const center = bounds.getCenter();
        
        // Only show aurora in polar regions
        if (Math.abs(center.lat) > 50) {
            return [
                { 
                    lat: center.lat + 5, 
                    lng: center.lng, 
                    kpIndex: 7, 
                    probability: 85, 
                    radius: 500,
                    activity: "Strong"
                },
                { 
                    lat: center.lat - 5, 
                    lng: center.lng, 
                    kpIndex: 5, 
                    probability: 40, 
                    radius: 300,
                    activity: "Moderate"
                }
            ];
        }
        
        // For lower latitudes, return a chance if conditions are right
        if (Math.random() > 0.7) { // 30% chance of aurora at lower latitudes
            return [
                { 
                    lat: center.lat + 2, 
                    lng: center.lng, 
                    kpIndex: 8, 
                    probability: 60, 
                    radius: 200,
                    activity: "Visible"
                }
            ];
        }
        
        return [];
    }
    
    createSampleAuroraForecast() {
        const auroraData = this.getSampleAuroraForecast();
        this.auroraForecastLayer = L.layerGroup();
        
        auroraData.forEach(aurora => {
            const circle = L.circle([aurora.lat, aurora.lng], {
                radius: aurora.radius * 1000, // Convert km to meters
                fillColor: this.getAuroraColor(aurora.kpIndex),
                color: '#3388ff',
                weight: 1,
                fillOpacity: 0.4
            }).bindPopup(this.createAuroraPopup(aurora));
            
            this.auroraForecastLayer.addLayer(circle);
        });
        
        if (auroraData.length > 0) {
            this.auroraForecastLayer.addTo(this.webgis.map);
            console.log(`✅ Created sample Aurora Forecast for ${auroraData.length} regions`);
        }
    }
    
    getAuroraColor(kpIndex) {
        // Color coding based on aurora activity (Kp index)
        if (kpIndex >= 7) return '#00ff00';  // Strong green
        if (kpIndex >= 5) return '#ffff00';  // Moderate yellow
        if (kpIndex >= 3) return '#ffa500';  // Weak orange
        return '#ff0000';  // Very weak red
    }
    
    createAuroraPopup(aurora) {
        return `
            <div class="aurora-popup">
                <h6><i class="fas fa-circle-nodes"></i> Aurora Activity Forecast</h6>
                <table class="table table-sm table-borderless">
                    <tr><td><strong>Kp Index:</strong></td><td>${aurora.kpIndex}/9 (${aurora.activity})</td></tr>
                    <tr><td><strong>Visibility Probability:</strong></td><td>${aurora.probability}%</td></tr>
                    <tr><td><strong>Activity Radius:</strong></td><td>${aurora.radius} km</td></tr>
                    <tr><td><strong>Best Viewing Time:</strong></td><td>22:00 - 02:00 Local Time</td></tr>
                </table>
            </div>
        `;
    }
    
    async loadMilkyWayVisibilityLayer() {
        try {
            this.removeMilkyWayVisibilityLayer();
            
            // Fetch Milky Way visibility data
            const mwData = await this.fetchMilkyWayVisibility();
            
            if (mwData && mwData.length > 0) {
                this.milkyWayVisibilityLayer = L.layerGroup();
                
                mwData.forEach(mw => {
                    const marker = L.marker([mw.lat, mw.lng], {
                        icon: L.divIcon({
                            className: 'milkyway-marker',
                            html: '<i class="fas fa-galaxy" style="color: #ffffff; font-size: 18px; text-shadow: 0 0 5px #00aaff;"></i>',
                            iconSize: [24, 24],
                            iconAnchor: [12, 12]
                        })
                    }).bindPopup(this.createMilkyWayPopup(mw));
                    
                    this.milkyWayVisibilityLayer.addLayer(marker);
                });
                
                this.milkyWayVisibilityLayer.addTo(this.webgis.map);
                console.log(`✅ Loaded Milky Way visibility for ${mwData.length} locations`);
            } else {
                // Create sample data if no real data available
                this.createSampleMilkyWayVisibility();
            }
        } catch (error) {
            console.warn('Milky Way Visibility layer load failed:', error);
            this.createSampleMilkyWayVisibility();
        }
    }
    
    removeMilkyWayVisibilityLayer() {
        if (this.milkyWayVisibilityLayer) {
            this.webgis.map.removeLayer(this.milkyWayVisibilityLayer);
            this.milkyWayVisibilityLayer = null;
        }
    }
    
    async fetchMilkyWayVisibility() {
        try {
            // In a real implementation, this would consider season, time, light pollution
            // For now, return sample data
            return this.getSampleMilkyWayVisibility();
        } catch (error) {
            console.error('Error fetching Milky Way visibility:', error);
            return [];
        }
    }
    
    getSampleMilkyWayVisibility() {
        const bounds = this.webgis.map.getBounds();
        const center = bounds.getCenter();
        
        // Milky Way visibility depends on location and time of year
        // It's generally best away from galactic center in dark skies
        const visibilityData = [];
        
        // Generate sample Milky Way visibility points
        for (let i = 0; i < 3; i++) {
            const offsetLat = (Math.random() - 0.5) * (bounds.getNorth() - bounds.getSouth());
            const offsetLng = (Math.random() - 0.5) * (bounds.getEast() - bounds.getWest());
            
            // Visibility score based on latitude (better at certain latitudes)
            let visibilityScore = 70 + Math.floor(Math.random() * 30); // 70-100%
            
            // Adjust based on proximity to the equator (generally better visibility)
            if (Math.abs(center.lat) < 30) {
                visibilityScore += 10;
            }
            
            // Cap at 100%
            visibilityScore = Math.min(visibilityScore, 100);
            
            visibilityData.push({
                lat: center.lat + offsetLat,
                lng: center.lng + offsetLng,
                visibility: visibilityScore,
                season: this.getCurrentMilkyWaySeason(),
                coreVisible: Math.abs(center.lat) < 40, // Galactic core visible from these latitudes
                bestTime: "22:00 - 04:00"
            });
        }
        
        return visibilityData;
    }
    
    getCurrentMilkyWaySeason() {
        const month = new Date().getMonth();
        
        // Season varies by hemisphere
        // Northern hemisphere: Mar-Sep
        // Southern hemisphere: Sep-Mar
        if (this.webgis.map.getCenter().lat > 0) {
            // Northern hemisphere
            return (month >= 2 && month <= 8) ? "Prime Season" : "Off Season";
        } else {
            // Southern hemisphere
            return (month >= 8 || month <= 2) ? "Prime Season" : "Off Season";
        }
    }
    
    createSampleMilkyWayVisibility() {
        const mwData = this.getSampleMilkyWayVisibility();
        this.milkyWayVisibilityLayer = L.layerGroup();
        
        mwData.forEach(mw => {
            const marker = L.marker([mw.lat, mw.lng], {
                icon: L.divIcon({
                    className: 'milkyway-marker',
                    html: '<i class="fas fa-galaxy" style="color: #ffffff; font-size: 18px; text-shadow: 0 0 5px #00aaff;"></i>',
                    iconSize: [24, 24],
                    iconAnchor: [12, 12]
                })
            }).bindPopup(this.createMilkyWayPopup(mw));
            
            this.milkyWayVisibilityLayer.addLayer(marker);
        });
        
        if (mwData.length > 0) {
            this.milkyWayVisibilityLayer.addTo(this.webgis.map);
            console.log(`✅ Created sample Milky Way visibility for ${mwData.length} locations`);
        }
    }
    
    createMilkyWayPopup(mw) {
        return `
            <div class="milkyway-popup">
                <h6><i class="fas fa-galaxy"></i> Milky Way Visibility</h6>
                <table class="table table-sm table-borderless">
                    <tr><td><strong>Visibility:</strong></td><td>${mw.visibility}%</td></tr>
                    <tr><td><strong>Season:</strong></td><td>${mw.season}</td></tr>
                    <tr><td><strong>Galactic Core:</strong></td><td>${mw.coreVisible ? 'Visible' : 'Not Visible'}</td></tr>
                    <tr><td><strong>Best Viewing:</strong></td><td>${mw.bestTime}</td></tr>
                    <tr><td><strong>Conditions Needed:</strong></td><td>Dark Skies, Clear Weather</td></tr>
                </table>
            </div>
        `;
    }
    
    // Method to create sample regions when real data isn't available
    createSampleBortleRegions() {
        const bounds = this.webgis.map.getBounds();
        const center = bounds.getCenter();
        const halfLat = (bounds.getNorth() - bounds.getSouth()) / 4;
        const halfLng = (bounds.getEast() - bounds.getWest()) / 4;
        
        // Create sample Bortle regions around the map center
        const features = [];
        for (let i = 0; i < 5; i++) {
            const offsetLat = (Math.random() - 0.5) * halfLat * 2;
            const offsetLng = (Math.random() - 0.5) * halfLng * 2;
            const bortleClass = Math.floor(Math.random() * 7) + 1; // Random class 1-7
            
            features.push({
                type: "Feature",
                properties: {
                    class: bortleClass,
                    name: `Sample Bortle Region ${i+1}`
                },
                geometry: {
                    type: "Polygon",
                    coordinates: [[
                        [center.lng + offsetLng - 0.05, center.lat + offsetLat - 0.05],
                        [center.lng + offsetLng + 0.05, center.lat + offsetLat - 0.05],
                        [center.lng + offsetLng + 0.05, center.lat + offsetLat + 0.05],
                        [center.lng + offsetLng - 0.05, center.lat + offsetLat + 0.05],
                        [center.lng + offsetLng - 0.05, center.lat + offsetLat - 0.05]
                    ]]
                }
            });
        }
        
        this.bortleLayer = L.geoJSON({
            type: "FeatureCollection",
            features: features
        }, {
            style: (feature) => this.getBortleStyle(feature.properties.class),
            onEachFeature: (feature, layer) => {
                layer.bindPopup(this.createBortlePopup(feature));
            }
        }).addTo(this.webgis.map);
        
        console.log(`✅ Created sample Bortle Scale layer with ${features.length} regions`);
    }
}

// Initialize the LightPollutionFeatures when the webgis object is available
document.addEventListener('DOMContentLoaded', () => {
    // Wait a bit to ensure WebGIS is initialized
    setTimeout(() => {
        if (window.webGIS) {
            window.lightPollutionFeatures = new LightPollutionFeatures(window.webGIS);
        } else {
            // If webGIS isn't ready yet, try again later
            const checkWebGIS = setInterval(() => {
                if (window.webGIS) {
                    clearInterval(checkWebGIS);
                    window.lightPollutionFeatures = new LightPollutionFeatures(window.webGIS);
                }
            }, 500);
        }
    }, 1000);
});