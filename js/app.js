// Light Pollution WebGIS Main Application
class LightPollutionWebGIS {
    constructor() {
        this.map = null;
        this.drawnItems = new L.FeatureGroup();
        this.analysisMode = null;
        this.comparisonPoints = [];
        this.routePoints = [];
        this.darkSkySpots = [];
        this.routingControl = null;
        this.heatLayer = null;
        this.init();
    }

    init() {
        this.initializeMap();
        this.setupEventListeners();
        this.addBaseLayers();
        this.addLightPollutionData();
        console.log('✅ Light Pollution WebGIS initialized!');
    }

    initializeMap() {
        // Initialize map with better view
        this.map = L.map('map', {
            center: [30, 0],
            zoom: 2,
            zoomControl: true,
            attributionControl: true
        });

        // Add zoom control position
        this.map.zoomControl.setPosition('topright');

        // Add drawn items layer
        this.drawnItems.addTo(this.map);

        // Initialize draw control
        this.initializeDrawControl();
    }

    initializeDrawControl() {
        this.drawControl = new L.Control.Draw({
            draw: {
                polygon: {
                    shapeOptions: {
                        color: '#3388ff',
                        fillColor: '#3388ff',
                        fillOpacity: 0.2,
                        weight: 2
                    },
                    allowIntersection: false,
                    showArea: true
                },
                rectangle: {
                    shapeOptions: {
                        color: '#3388ff',
                        fillColor: '#3388ff',
                        fillOpacity: 0.2,
                        weight: 2
                    }
                },
                circle: false,
                marker: false,
                circlemarker: false,
                polyline: false
            },
            edit: {
                featureGroup: this.drawnItems
            }
        });
        
        this.map.addControl(this.drawControl);

        // Add draw events
        this.map.on(L.Draw.Event.CREATED, (e) => this.onDrawCreated(e));
    }

    addBaseLayers() {
        // OpenStreetMap Base Layer
        const osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 19
        }).addTo(this.map);

        // Dark Map Layer (better for light pollution visualization)
        const darkLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
            attribution: '© CARTO',
            maxZoom: 19
        });

        // Satellite Layer
        const satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
            attribution: '© Esri',
            maxZoom: 19
        });

        // Add layer control
        const baseLayers = {
            "OpenStreetMap": osmLayer,
            "Dark Map": darkLayer,
            "Satellite": satelliteLayer
        };

        L.control.layers(baseLayers).addTo(this.map);
    }

    addLightPollutionData() {
        // Create realistic light pollution data
        const points = this.generateLightPollutionData();
        
        this.heatLayer = L.heatLayer(points, {
            radius: 25,
            blur: 20,
            maxZoom: 10,
            minOpacity: 0.5,
            gradient: {
                0.1: 'blue',
                0.3: 'cyan',
                0.5: 'lime', 
                0.7: 'yellow',
                0.8: 'orange',
                1.0: 'red'
            }
        }).addTo(this.map);
    }

    generateLightPollutionData() {
        const points = [];
        
        // Major cities with high light pollution
        const majorCities = [
            // North America
            { lat: 40.7128, lng: -74.0060, intensity: 0.95 }, // New York
            { lat: 34.0522, lng: -118.2437, intensity: 0.9 }, // Los Angeles
            { lat: 41.8781, lng: -87.6298, intensity: 0.92 }, // Chicago
            { lat: 29.7604, lng: -95.3698, intensity: 0.85 }, // Houston
            
            // Europe
            { lat: 51.5074, lng: -0.1278, intensity: 0.88 }, // London
            { lat: 48.8566, lng: 2.3522, intensity: 0.82 },  // Paris
            { lat: 52.5200, lng: 13.4050, intensity: 0.8 },  // Berlin
            { lat: 41.9028, lng: 12.4964, intensity: 0.78 }, // Rome
            
            // Asia
            { lat: 35.6762, lng: 139.6503, intensity: 0.98 }, // Tokyo
            { lat: 39.9042, lng: 116.4074, intensity: 0.95 }, // Beijing
            { lat: 19.0760, lng: 72.8777, intensity: 0.9 },  // Mumbai
            { lat: 1.3521, lng: 103.8198, intensity: 0.88 }, // Singapore
            
            // Other regions
            { lat: -33.8688, lng: 151.2093, intensity: 0.75 }, // Sydney
            { lat: -23.5505, lng: -46.6333, intensity: 0.8 },  // Sao Paulo
            { lat: -26.2041, lng: 28.0473, intensity: 0.7 },   // Johannesburg
            { lat: 30.0444, lng: 31.2357, intensity: 0.65 }    // Cairo
        ];

        // Add city centers
        majorCities.forEach(city => {
            points.push([city.lat, city.lng, city.intensity]);
            
            // Add surrounding urban areas
            for (let i = 0; i < 15; i++) {
                points.push([
                    city.lat + (Math.random() - 0.5) * 2,
                    city.lng + (Math.random() - 0.5) * 2,
                    city.intensity * (0.7 + Math.random() * 0.3)
                ]);
            }
        });

        // Add suburban areas
        for (let i = 0; i < 200; i++) {
            points.push([
                (Math.random() * 160) - 80,
                (Math.random() * 360) - 180,
                Math.random() * 0.6
            ]);
        }

        // Add rural areas with low pollution
        for (let i = 0; i < 150; i++) {
            points.push([
                (Math.random() * 160) - 80,
                (Math.random() * 360) - 180,
                Math.random() * 0.3
            ]);
        }

        return points;
    }

    setupEventListeners() {
        // Tool buttons
        document.getElementById('drawPolygon').addEventListener('click', () => this.enableDrawMode());
        document.getElementById('findDarkSky').addEventListener('click', () => this.findDarkSkySpots());
        document.getElementById('compareLocations').addEventListener('click', () => this.enableCompareMode());
        document.getElementById('planRoute').addEventListener('click', () => this.enableRoutePlanning());
        document.getElementById('clearAll').addEventListener('click', () => this.clearAll());
        
        // Chatbot
        document.getElementById('send-message').addEventListener('click', () => this.sendChatMessage());
        document.getElementById('toggleChat').addEventListener('click', () => this.toggleChat());
        
        // Enter key for chat
        document.getElementById('user-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.sendChatMessage();
        });
    }

    enableDrawMode() {
        new L.Draw.Polygon(this.map).enable();
        this.analysisMode = 'draw';
        this.showMessage('🎯 Draw a polygon on the map to analyze light pollution in that area');
    }

    onDrawCreated(e) {
        const layer = e.layer;
        this.drawnItems.addLayer(layer);
        
        if (this.analysisMode === 'draw') {
            this.analyzeArea(layer);
        }
    }

    analyzeArea(layer) {
        const bounds = layer.getBounds();
        const area = layer.getArea ? layer.getArea() : 1000000; // Fallback area
        
        // Simulate light pollution analysis
        const pollutionLevel = Math.random() * 100;
        let recommendation, pollutionClass;
        
        if (pollutionLevel < 30) {
            recommendation = '⭐ Excellent for sky observation! Perfect dark sky conditions.';
            pollutionClass = 'success';
        } else if (pollutionLevel < 60) {
            recommendation = '🌙 Moderate light pollution - acceptable for basic observation';
            pollutionClass = 'info';
        } else if (pollutionLevel < 80) {
            recommendation = '💡 High light pollution - limited visibility of stars';
            pollutionClass = 'warning';
        } else {
            recommendation = '🏙️ Very high light pollution - poor observation conditions';
            pollutionClass = 'danger';
        }
        
        const popupContent = `
            <div class="analysis-popup">
                <h6>🔍 Area Analysis Results</h6>
                <p><strong>📍 Area Size:</strong> ${(area / 1000000).toFixed(2)} km²</p>
                <p><strong>💡 Light Pollution:</strong> ${pollutionLevel.toFixed(1)}%</p>
                <p><strong>📊 Pollution Level:</strong> <span class="text-${pollutionClass}">${this.getPollutionLevelText(pollutionLevel)}</span></p>
                <p><strong>💡 Recommendation:</strong> ${recommendation}</p>
                <div class="d-grid gap-2 mt-3">
                    <button class="btn btn-sm btn-primary" onclick="webGIS.exportAreaData()">
                        <i class="fas fa-download"></i> Export Data
                    </button>
                </div>
            </div>
        `;
        
        layer.bindPopup(popupContent).openPopup();
    }

    getPollutionLevelText(level) {
        if (level < 30) return 'Low';
        if (level < 60) return 'Medium';
        if (level < 80) return 'High';
        return 'Very High';
    }

    findDarkSkySpots() {
        this.showMessage('🔭 Scanning for dark sky spots with low light pollution...');
        
        // Clear previous spots
        this.clearDarkSkySpots();
        
        // Known dark sky locations around the world
        const darkSkyLocations = [
            { lat: 36.24, lng: -116.82, name: 'Death Valley, USA', pollution: 12.5 },
            { lat: -31.27, lng: 149.07, name: 'Warrumbungle, Australia', pollution: 15.2 },
            { lat: 28.30, lng: -16.51, name: 'Canary Islands, Spain', pollution: 18.7 },
            { lat: 44.30, lng: -110.50, name: 'Yellowstone, USA', pollution: 22.3 },
            { lat: -25.75, lng: 28.19, name: 'Sutherland, South Africa', pollution: 14.8 },
            { lat: 19.82, lng: -155.47, name: 'Mauna Kea, Hawaii', pollution: 11.9 },
            { lat: 67.86, lng: 20.97, name: 'Abisko, Sweden', pollution: 16.4 },
            { lat: 46.46, lng: 7.98, name: 'Swiss Alps, Switzerland', pollution: 19.1 }
        ];
        
        darkSkyLocations.forEach(spot => {
            const marker = L.marker([spot.lat, spot.lng])
                .addTo(this.map)
                .bindPopup(`
                    <div>
                        <h6>🌌 ${spot.name}</h6>
                        <p>💡 Light Pollution: ${spot.pollution}%</p>
                        <p>⭐ Excellent dark sky location</p>
                        <p>📏 Bortle Scale: ${this.getBortleScale(spot.pollution)}</p>
                        <button class="btn btn-sm btn-info mt-2" onclick="webGIS.analyzeThisSpot([${spot.lat}, ${spot.lng}])">
                            <i class="fas fa-chart-bar"></i> Analyze This Spot
                        </button>
                    </div>
                `);
            
            this.darkSkySpots.push(marker);
        });
    }

    getBortleScale(pollution) {
        if (pollution < 15) return '1-2 (Excellent)';
        if (pollution < 30) return '3-4 (Good)';
        if (pollution < 50) return '5-6 (Moderate)';
        return '7-9 (Poor)';
    }

    analyzeThisSpot(coords) {
        const [lat, lng] = coords;
        const pollution = 10 + Math.random() * 20;
        
        this.showMessage(`📍 Analyzing spot at ${lat.toFixed(2)}, ${lng.toFixed(2)} - Light Pollution: ${pollution.toFixed(1)}% - Excellent for observation!`);
    }

    enableCompareMode() {
        this.showMessage('⚖️ Click on two locations to compare light pollution levels');
        this.analysisMode = 'compare';
        this.comparisonPoints = [];
        
        this.map.on('click', (e) => this.addComparisonPoint(e));
    }

    addComparisonPoint(e) {
        const point = e.latlng;
        const pollution = Math.random() * 100;
        
        const marker = L.marker(point)
            .addTo(this.map)
            .bindPopup(`💡 Light Pollution: ${pollution.toFixed(1)}%`);
        
        this.comparisonPoints.push({ point, pollution, marker });
        
        if (this.comparisonPoints.length === 2) {
            this.compareLocations();
        }
    }

    compareLocations() {
        const [point1, point2] = this.comparisonPoints;
        const difference = Math.abs(point1.pollution - point2.pollution);
        
        let comparisonResult = '';
        if (difference > 50) {
            comparisonResult = '🚨 Significant difference in light pollution levels';
        } else if (difference > 20) {
            comparisonResult = '⚠️ Noticeable difference in light pollution';
        } else {
            comparisonResult = '✅ Similar light pollution levels';
        }
        
        this.showMessage(`
            ${comparisonResult}<br>
            📍 Location 1: ${point1.pollution.toFixed(1)}%<br>
            📍 Location 2: ${point2.pollution.toFixed(1)}%<br>
            📊 Difference: ${difference.toFixed(1)}%
        `);
        
        // Reset
        this.map.off('click');
        this.analysisMode = null;
        setTimeout(() => {
            this.comparisonPoints.forEach(p => p.marker.remove());
            this.comparisonPoints = [];
        }, 10000);
    }

    enableRoutePlanning() {
        this.showMessage('🗺️ Click start and end points for dark sky route planning');
        this.analysisMode = 'route';
        this.routePoints = [];
        
        // Clear existing routing
        if (this.routingControl) {
            this.map.removeControl(this.routingControl);
        }
        
        this.map.on('click', (e) => this.addRoutePoint(e));
    }

    addRoutePoint(e) {
        const point = e.latlng;
        const marker = L.marker(point)
            .addTo(this.map)
            .bindPopup(this.routePoints.length === 0 ? '🚦 Start Point' : '🏁 End Point');
        
        this.routePoints.push({ point, marker });
        
        if (this.routePoints.length === 2) {
            this.planRoute();
        }
    }

    planRoute() {
        const [start, end] = this.routePoints;
        
        this.routingControl = L.Routing.control({
            waypoints: [
                L.latLng(start.point.lat, start.point.lng),
                L.latLng(end.point.lat, end.point.lng)
            ],
            routeWhileDragging: true,
            lineOptions: {
                styles: [{color: 'blue', opacity: 0.7, weight: 6}]
            },
            createMarker: function() { return null; } // Don't create default markers
        }).addTo(this.map);
        
        this.map.off('click');
        this.analysisMode = null;
        
        this.showMessage('🛣️ Route planned! The blue line shows your dark sky journey.');
    }

    sendChatMessage() {
        const input = document.getElementById('user-input');
        const message = input.value.trim();
        
        if (message) {
            this.addChatMessage('user', message);
            input.value = '';
            
            // Generate AI response
            setTimeout(() => {
                const response = this.generateAIResponse(message);
                this.addChatMessage('assistant', response);
            }, 1000);
        }
    }

    generateAIResponse(message) {
        const lowerMessage = message.toLowerCase();
        
        if (lowerMessage.includes('light pollution') || lowerMessage.includes('what is')) {
            return "Light pollution is excessive artificial light that brightens the night sky, making stars harder to see. It's measured in percentages - lower percentages mean better star visibility! Areas in blue on the map have low pollution (0-30%), perfect for astronomy.";
        }
        else if (lowerMessage.includes('best') || lowerMessage.includes('where') || lowerMessage.includes('observation')) {
            return "The best spots for sky observation have light pollution below 30% (blue areas on map). Use the 'Find Dark Sky Spots' button to locate excellent observation areas like Death Valley, Mauna Kea, or the Swiss Alps!";
        }
        else if (lowerMessage.includes('tool') || lowerMessage.includes('how') || lowerMessage.includes('use')) {
            return "You can: 1) Draw areas to analyze pollution levels, 2) Find pre-identified dark sky spots, 3) Compare two locations, or 4) Plan routes through low-pollution areas! Try drawing a polygon on the map to start.";
        }
        else if (lowerMessage.includes('data') || lowerMessage.includes('source') || lowerMessage.includes('real')) {
            return "This demo uses simulated data representing realistic patterns. Real light pollution data comes from NASA VIIRS satellite imagery, the World Atlas of Artificial Night Sky Brightness, and ground-based measurements.";
        }
        else if (lowerMessage.includes('city') || lowerMessage.includes('urban')) {
            return "Cities typically have 70-95% light pollution (red areas) due to street lights, buildings, and vehicles. Rural areas are much better for observation (10-40% pollution, blue/green areas).";
        }
        else if (lowerMessage.includes('help') || lowerMessage.includes('hello') || lowerMessage.includes('hi')) {
            return "Hello! I'm your Light Pollution Assistant. I can help you find dark sky spots, analyze light pollution levels, compare locations, and plan observation routes. What would you like to know?";
        }
        else {
            const responses = [
                "I can help you understand light pollution and find the best spots for sky observation! Try using the drawing tools on the map.",
                "Look for blue areas on the map - they indicate low light pollution perfect for stargazing! Red areas have high pollution.",
                "Did you know? Light pollution affects both astronomy and ecosystems like bird migration and turtle nesting.",
                "You can draw any area on the map to get detailed light pollution analysis for that specific region.",
                "The route planner can help you find paths through areas with minimal light pollution for your observation trips."
            ];
            return responses[Math.floor(Math.random() * responses.length)];
        }
    }

    addChatMessage(sender, message) {
        const chatMessages = document.getElementById('chat-messages');
        const messageDiv = document.createElement('div');
        messageDiv.className = `chat-message ${sender}`;
        
        if (sender === 'user') {
            messageDiv.innerHTML = `<strong>You:</strong> ${message}`;
        } else {
            messageDiv.innerHTML = `<strong>AI Assistant:</strong> ${message}`;
        }
        
        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    toggleChat() {
        const chatbot = document.querySelector('.chatbot-container');
        const toggleBtn = document.getElementById('toggleChat');
        const icon = toggleBtn.querySelector('i');
        
        chatbot.classList.toggle('minimized');
        if (chatbot.classList.contains('minimized')) {
            icon.className = 'fas fa-plus';
        } else {
            icon.className = 'fas fa-minus';
        }
    }

    clearAll() {
        // Clear drawn items
        this.drawnItems.clearLayers();
        
        // Clear dark sky spots
        this.clearDarkSkySpots();
        
        // Clear comparison points
        this.comparisonPoints.forEach(p => p.marker.remove());
        this.comparisonPoints = [];
        
        // Clear route points and routing
        this.routePoints.forEach(p => p.marker.remove());
        this.routePoints = [];
        
        if (this.routingControl) {
            this.map.removeControl(this.routingControl);
            this.routingControl = null;
        }
        
        this.analysisMode = null;
        this.showMessage('🗑️ All cleared! Ready for new analysis.');
    }

    clearDarkSkySpots() {
        this.darkSkySpots.forEach(spot => this.map.removeLayer(spot));
        this.darkSkySpots = [];
    }

    showMessage(message) {
        L.popup()
            .setLatLng(this.map.getCenter())
            .setContent(`<div class="p-2">${message}</div>`)
            .openOn(this.map);
    }

    exportAreaData() {
        const data = {
            type: 'Light Pollution Analysis Export',
            timestamp: new Date().toISOString(),
            area: 'User drawn analysis area',
            features: [
                {
                    pollution_level: 'Simulated Data',
                    recommendation: 'Use the analysis tools to get specific area data',
                    export_format: 'JSON',
                    data_quality: 'demo_simulated_data'
                }
            ]
        };
        
        const dataStr = JSON.stringify(data, null, 2);
        const dataBlob = new Blob([dataStr], {type: 'application/json'});
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = 'light-pollution-analysis.json';
        link.click();
        
        this.showMessage('📥 Data exported successfully! Check your downloads folder.');
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    window.webGIS = new LightPollutionWebGIS();
    console.log('🚀 Light Pollution WebGIS is ready!');
});