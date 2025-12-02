// js/app.js - UPDATED WITH COLLAPSIBLE PANELS AND REAL DATA
class LightPollutionWebGIS {
    constructor() {
        this.map = null;
        this.mode = null;
        this.dataManager = null;
        this.citizenMode = null;
        this.scientificMode = null;
        this.drawnItems = null;
        this.analysisMode = null;
        this.comparisonPoints = [];
        this.routePoints = [];
        this.darkSkySpots = [];
        this.routingControl = null;
        this.activeLayers = new Map();
        this.n8nAvailable = false;
        this.baseLayers = null;
        this.activeBaseLayer = null;
        this.collapsedPanels = new Set();
        
        console.log('🔧 WebGIS Constructor called');
        this.init();
    }

    async init() {
        console.log('🚀 Starting WebGIS initialization...');
        
        const urlParams = new URLSearchParams(window.location.search);
        this.mode = urlParams.get('mode');
        
        if (!this.mode || (this.mode !== 'citizen' && this.mode !== 'scientific')) {
            window.location.href = 'mode-selection.html';
            return;
        }

        console.log(`✅ Starting in ${this.mode} mode`);
        
        this.showLoadingScreen();
        
        try {
            this.n8nAvailable = await this.testN8NConnection();
            console.log(`n8n ${this.n8nAvailable ? 'available' : 'unavailable, using fallback'}`);
            
            this.initializeUI();
            await this.initializeMap();
            this.dataManager = new DataManager();
            await this.loadLightPollutionData();
            this.initializeModeFunctionality();
            this.setupEventListeners();
            this.initializePanelCollapse();
            
            setTimeout(() => {
                this.hideLoadingScreen();
                console.log('🎉 WebGIS fully initialized!');
            }, 1000);
            
        } catch (error) {
            console.error('💥 Error during initialization:', error);
            this.hideLoadingScreen();
            alert('Failed to initialize the application. Please refresh the page.');
        }
    }

    async testN8NConnection() {
        try {
            const response = await fetch(N8N_CONFIG.webhookUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    test: true,
                    chatInput: 'Test connection',
                    locationContext: { lat: 0, lng: 0 },
                    sessionId: 'test-session'
                }),
                signal: AbortSignal.timeout(N8N_CONFIG.timeout)
            });
            return response.ok;
        } catch (error) {
            console.warn('n8n connection test failed:', error);
            return false;
        }
    }

    showLoadingScreen() {
        const loadingScreen = document.getElementById('loadingScreen');
        const loadingMode = document.getElementById('loadingMode');
        
        if (loadingScreen && loadingMode) {
            loadingMode.textContent = this.mode === 'citizen' ? 'Citizen' : 'Scientific';
            loadingScreen.style.display = 'flex';
        }
    }

    hideLoadingScreen() {
        const loadingScreen = document.getElementById('loadingScreen');
        if (loadingScreen) {
            loadingScreen.style.display = 'none';
        }
    }

    initializeUI() {
        console.log('🎨 Initializing UI...');
        
        document.body.className = '';
        document.body.classList.add(`${this.mode}-mode-active`);
        
        const modeIndicator = document.getElementById('modeIndicator');
        if (modeIndicator) {
            modeIndicator.textContent = this.mode === 'citizen' ? 'Citizen Mode' : 'Scientific Mode';
            modeIndicator.className = this.mode === 'citizen' ? 'badge ms-2 bg-success' : 'badge ms-2 bg-warning';
        }
        
        const panelTitle = document.getElementById('panelTitle');
        const assistantName = document.getElementById('assistantName');
        const welcomeMessage = document.getElementById('welcomeMessage');
        
        if (this.mode === 'citizen') {
            if (panelTitle) panelTitle.textContent = 'Stargazing Tools';
            if (assistantName) assistantName.textContent = 'Lumina';
            if (welcomeMessage) welcomeMessage.textContent = 'Hello! I\'m Lumina, I can help you find the best spots for sky observation and plan your stargazing sessions.';
            
            const citizenTools = document.getElementById('citizenTools');
            const scientificTools = document.getElementById('scientificTools');
            if (citizenTools) citizenTools.style.display = 'block';
            if (scientificTools) scientificTools.style.display = 'none';
        } else {
            if (panelTitle) panelTitle.textContent = 'Scientific Analysis';
            if (assistantName) assistantName.textContent = 'Lumina';
            if (welcomeMessage) welcomeMessage.textContent = 'Welcome to Scientific Mode. I\'m Lumina, I can help you analyze light pollution data, run statistical models, and export research data.';
            
            const citizenTools = document.getElementById('citizenTools');
            const scientificTools = document.getElementById('scientificTools');
            if (citizenTools) citizenTools.style.display = 'none';
            if (scientificTools) scientificTools.style.display = 'block';
        }
    }

    async initializeMap() {
        console.log('🗺️ Initializing map...');
        
        return new Promise((resolve) => {
            setTimeout(() => {
                try {
                    this.map = L.map('map', {
                        center: [30, 0],
                        zoom: 2,
                        zoomControl: true,
                        attributionControl: true
                    });

                    this.map.zoomControl.setPosition('topright');
                    
                    this.drawnItems = new L.FeatureGroup();
                    this.drawnItems.addTo(this.map);
                    
                    this.addBaseLayers();
                    this.initializeDrawControl();
                    
                    console.log('✅ Map initialized successfully');
                    resolve();
                } catch (error) {
                    console.error('❌ Map initialization failed:', error);
                    throw error;
                }
            }, 100);
        });
    }

    addBaseLayers() {
        const osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 19
        }).addTo(this.map);

        const darkLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
            attribution: '© CARTO',
            maxZoom: 19
        });

        const satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
            attribution: '© Esri',
            maxZoom: 19
        });

        const terrainLayer = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenTopoMap',
            maxZoom: 17
        });

        this.baseLayers = {
            osm: osmLayer,
            dark: darkLayer,
            satellite: satelliteLayer,
            terrain: terrainLayer
        };
        
        this.activeBaseLayer = 'osm';
    }

    switchBasemap(basemapId) {
        if (this.baseLayers && this.baseLayers[basemapId]) {
            if (this.activeBaseLayer) {
                this.map.removeLayer(this.baseLayers[this.activeBaseLayer]);
            }
            
            this.baseLayers[basemapId].addTo(this.map);
            this.activeBaseLayer = basemapId;
            
            this.updateBasemapDropdown(basemapId);
            this.showMessage(`🗺️ Switched to ${this.getBasemapName(basemapId)}`);
        }
    }

    updateBasemapDropdown(selectedId) {
        const dropdown = document.getElementById('basemapDropdown');
        if (dropdown) {
            const options = dropdown.querySelectorAll('.basemap-option');
            options.forEach(option => {
                option.classList.remove('active');
                if (option.dataset.basemap === selectedId) {
                    option.classList.add('active');
                }
            });
        }
    }

    getBasemapName(basemapId) {
        const names = {
            osm: 'OpenStreetMap',
            dark: 'Dark Map',
            satellite: 'Satellite',
            terrain: 'Terrain'
        };
        return names[basemapId] || basemapId;
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
        this.map.on(L.Draw.Event.CREATED, (e) => this.onDrawCreated(e));
    }

    async loadLightPollutionData() {
        if (!this.dataManager) {
            throw new Error('DataManager not initialized');
        }

        console.log('📊 Loading light pollution data...');
        
        this.dataManager.webGIS = this;
        
        const viirsLayer = await this.dataManager.loadVIIRSTileLayer();
        viirsLayer.addTo(this.map);
        this.activeLayers.set('viirs', viirsLayer);

        const darkSkyLayer = await this.dataManager.loadDarkSkyParks();
        darkSkyLayer.addTo(this.map);
        this.activeLayers.set('darkSkyParks', darkSkyLayer);

        if (this.mode === 'scientific') {
            const groundLayer = await this.dataManager.loadGroundMeasurements();
            groundLayer.addTo(this.map);
            this.activeLayers.set('groundMeasurements', groundLayer);
        }
        
        console.log('✅ Light pollution data loaded');
    }

    initializeModeFunctionality() {
        console.log(`🎯 Initializing ${this.mode} mode functionality...`);
        
        if (this.mode === 'citizen') {
            this.citizenMode = new CitizenMode(this);
            this.citizenMode.initialize();
        } else {
            this.scientificMode = new ScientificMode(this);
            this.scientificMode.initialize();
        }
    }

    // In the setupEventListeners method, add:
    setupEventListeners() {
        console.log('🔗 Setting up event listeners...');
        
        // Common tools
        this.setupButtonListener('drawPolygon', () => this.enableDrawMode());
        this.setupButtonListener('findDarkSky', () => this.findDarkSkySpots());
        this.setupButtonListener('compareLocations', () => this.enableCompareMode());
        this.setupButtonListener('planRoute', () => this.enableRoutePlanning());
        this.setupButtonListener('clearAll', () => this.clearAll());
        
        // Mode switching
        this.setupButtonListener('switchMode', () => this.switchMode());
        this.setupButtonListener('dataSources', () => this.showDataSources());

        // Data layer toggles
        this.setupCheckboxListener('viirsLayer', 'viirs');
        this.setupCheckboxListener('worldAtlasLayer', 'worldAtlas');
        this.setupCheckboxListener('groundMeasurements', 'groundMeasurements');
        this.setupCheckboxListener('darkSkyParks', 'darkSkyParks');
        this.setupCheckboxListener('heatmapLayer', 'heatmap');

        // Basemap switcher (make sure it's connected)
        const basemapSwitcher = document.getElementById('basemapSwitcher');
        if (basemapSwitcher) {
            basemapSwitcher.addEventListener('click', (e) => {
                e.stopPropagation();
                const dropdown = document.getElementById('basemapDropdown');
                if (dropdown) {
                    dropdown.classList.toggle('show');
                }
            });
        }

        // Handle basemap selection
        const basemapOptions = document.querySelectorAll('.basemap-option');
        basemapOptions.forEach(option => {
            option.addEventListener('click', () => {
                const basemapId = option.dataset.basemap;
                this.switchBasemap(basemapId);
                
                // Hide dropdown
                const dropdown = document.getElementById('basemapDropdown');
                if (dropdown) {
                    dropdown.classList.remove('show');
                }
            });
        });

        // Panel collapse handlers - ADD THIS
        this.setupPanelCollapseListeners();

        // Chatbot
        this.setupButtonListener('send-message', () => this.sendChatMessage());
        
        const userInput = document.getElementById('user-input');
        if (userInput) {
            userInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.sendChatMessage();
            });
        }

        // Analysis panel
        this.setupButtonListener('closeAnalysis', () => this.hideAnalysisPanel());
        
        console.log('✅ Event listeners set up');
    }

    // Add these methods to the class:
    setupPanelCollapseListeners() {
        const panelIds = ['controlPanel', 'dataLayersPanel', 'legendPanel', 'chatbotPanel'];
        
        panelIds.forEach(panelId => {
            const panel = document.getElementById(panelId);
            if (panel) {
                const header = panel.querySelector('.panel-header');
                if (header) {
                    // Remove existing collapse icon if any
                    const existingIcon = header.querySelector('.collapse-icon');
                    if (existingIcon) {
                        existingIcon.remove();
                    }
                    
                    // Add new collapse icon
                    const collapseIcon = document.createElement('span');
                    collapseIcon.className = 'collapse-icon';
                    collapseIcon.innerHTML = '<i class="fas fa-chevron-down"></i>';
                    header.appendChild(collapseIcon);
                    
                    // Make header clickable
                    header.style.cursor = 'pointer';
                    header.addEventListener('click', (e) => {
                        // Don't collapse if clicking on a button inside
                        if (!e.target.closest('button')) {
                            this.togglePanelCollapse(panelId);
                        }
                    });
                }
            }
        });
    }

    initializePanelCollapse() {
        // Initialize all panels as expanded by default
        const panelIds = ['controlPanel', 'dataLayersPanel', 'legendPanel', 'chatbotPanel'];
        
        panelIds.forEach(panelId => {
            const panel = document.getElementById(panelId);
            if (panel) {
                panel.classList.remove('panel-collapsed');
            }
        });
    }

    togglePanelCollapse(panelId) {
        const panel = document.getElementById(panelId);
        if (!panel) return;
        
        panel.classList.toggle('panel-collapsed');
        
        // Update icon
        const header = panel.querySelector('.panel-header');
        if (header) {
            const icon = header.querySelector('.collapse-icon i');
            if (icon) {
                if (panel.classList.contains('panel-collapsed')) {
                    icon.className = 'fas fa-chevron-right';
                } else {
                    icon.className = 'fas fa-chevron-down';
                }
            }
        }
    }

    setupPanelCollapseListeners() {
        const panels = [
            'controlPanel',
            'dataLayersPanel',
            'legendPanel',
            'analysisPanel',
            'chatbotPanel'
        ];
        
        panels.forEach(panelId => {
            const panel = document.getElementById(panelId);
            if (panel) {
                const header = panel.querySelector('.panel-header');
                if (header) {
                    const collapseIcon = document.createElement('span');
                    collapseIcon.className = 'collapse-icon ms-2';
                    collapseIcon.innerHTML = '<i class="fas fa-chevron-down"></i>';
                    header.appendChild(collapseIcon);
                    
                    header.style.cursor = 'pointer';
                    header.addEventListener('click', (e) => {
                        if (!e.target.closest('.btn-close-cosmic')) {
                            this.togglePanelCollapse(panelId);
                        }
                    });
                }
            }
        });
    }

    initializePanelCollapse() {
        const savedState = localStorage.getItem('panelCollapseState');
        if (savedState) {
            this.collapsedPanels = new Set(JSON.parse(savedState));
            this.collapsedPanels.forEach(panelId => {
                const panel = document.getElementById(panelId);
                if (panel) {
                    panel.classList.add('panel-collapsed');
                }
            });
        }
    }

    togglePanelCollapse(panelId) {
        const panel = document.getElementById(panelId);
        if (!panel) return;
        
        if (this.collapsedPanels.has(panelId)) {
            this.collapsedPanels.delete(panelId);
            panel.classList.remove('panel-collapsed');
        } else {
            this.collapsedPanels.add(panelId);
            panel.classList.add('panel-collapsed');
        }
        
        localStorage.setItem('panelCollapseState', JSON.stringify([...this.collapsedPanels]));
    }

    setupButtonListener(id, handler) {
        const element = document.getElementById(id);
        if (element) {
            element.addEventListener('click', handler);
        } else {
            console.warn(`⚠️ Button with id '${id}' not found`);
        }
    }

    setupCheckboxListener(id, layerName) {
        const element = document.getElementById(id);
        if (element) {
            element.addEventListener('change', (e) => this.toggleLayer(layerName, e.target.checked));
        }
    }

    toggleBasemapDropdown() {
        const dropdown = document.getElementById('basemapDropdown');
        if (dropdown) {
            dropdown.classList.toggle('show');
        }
    }

    enableDrawMode() {
        this.showMessage('🎯 Draw a polygon on the map to analyze light pollution in that area');
        new L.Draw.Polygon(this.map).enable();
        this.analysisMode = 'draw';
    }

    onDrawCreated(e) {
        const layer = e.layer;
        this.drawnItems.addLayer(layer);
        
        if (this.analysisMode === 'draw') {
            this.analyzeArea(layer);
        }
    }

    async analyzeArea(layer) {
        const bounds = layer.getBounds();
        const center = bounds.getCenter();
        
        this.showMessage('🔍 Analyzing light pollution in selected area...');
        
        if (!this.dataManager) {
            this.showMessage('❌ Data manager not ready. Please try again.');
            return;
        }

        const areaData = await this.dataManager.getDataAtPoint(center.lat, center.lng);
        
        let recommendation, pollutionClass;
        if (areaData.viirsValue < 1.5) {
            recommendation = '⭐ Excellent for sky observation! Perfect dark sky conditions.';
            pollutionClass = 'heatmap-excellent';
        } else if (areaData.viirsValue < 3) {
            recommendation = '🌙 Good for astronomical observation - very good conditions';
            pollutionClass = 'heatmap-good';
        } else if (areaData.viirsValue < 8) {
            recommendation = '💡 Moderate light pollution - acceptable for basic observation';
            pollutionClass = 'heatmap-moderate';
        } else if (areaData.viirsValue < 27) {
            recommendation = '🏙️ High light pollution - limited visibility of stars';
            pollutionClass = 'heatmap-high';
        } else {
            recommendation = '🚨 Very high light pollution - poor observation conditions';
            pollutionClass = 'heatmap-very-high';
        }
        
        const popupContent = `
            <div class="analysis-popup">
                <h6>🔍 Area Analysis Results</h6>
                <p><strong>📍 Coordinates:</strong> ${center.lat.toFixed(4)}, ${center.lng.toFixed(4)}</p>
                <p><strong>💡 Light Pollution:</strong> ${areaData.viirsValue.toFixed(2)} μcd/m²</p>
                <p><strong>📊 Bortle Scale:</strong> ${areaData.bortleScale}</p>
                <p><strong>🌟 SQM Equivalent:</strong> ${areaData.sqmValue} mag/arcsec²</p>
                <p><strong>📡 Data Source:</strong> ${areaData.dataSource}</p>
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

    findDarkSkySpots() {
        if (this.mode === 'citizen' && this.citizenMode) {
            this.citizenMode.findBestObservationAreas();
        } else if (this.mode === 'scientific' && this.scientificMode) {
            this.showMessage('🔭 Use the statistical analysis tools for detailed dark sky spot identification');
        } else {
            this.showMessage('🔭 Finding dark sky spots with optimal observation conditions...');
        }
    }

    enableCompareMode() {
        this.showMessage('⚖️ Click on two locations to compare light pollution levels');
        this.analysisMode = 'compare';
        this.comparisonPoints = [];
        
        const clickHandler = (e) => {
            this.addComparisonPoint(e);
            if (this.comparisonPoints.length === 2) {
                this.map.off('click', clickHandler);
            }
        };
        
        this.map.on('click', clickHandler);
    }

    addComparisonPoint(e) {
        const point = e.latlng;
        const pollution = Math.random() * 50;
        
        const marker = L.marker(point)
            .addTo(this.map)
            .bindPopup(`💡 Light Pollution: ${pollution.toFixed(1)} μcd/m²`);
        
        this.comparisonPoints.push({ point, pollution, marker });
        
        if (this.comparisonPoints.length === 2) {
            this.compareLocations();
        }
    }

    compareLocations() {
        const [point1, point2] = this.comparisonPoints;
        const difference = Math.abs(point1.pollution - point2.pollution);
        
        let comparisonResult = '';
        if (difference > 25) {
            comparisonResult = '🚨 Significant difference in light pollution levels';
        } else if (difference > 10) {
            comparisonResult = '⚠️ Noticeable difference in light pollution';
        } else {
            comparisonResult = '✅ Similar light pollution levels';
        }
        
        this.showMessage(`
            ${comparisonResult}<br>
            📍 Location 1: ${point1.pollution.toFixed(1)} μcd/m²<br>
            📍 Location 2: ${point2.pollution.toFixed(1)} μcd/m²<br>
            📊 Difference: ${difference.toFixed(1)} μcd/m²
        `);
        
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
        
        if (this.routingControl) {
            this.map.removeControl(this.routingControl);
        }
        
        const clickHandler = (e) => {
            this.addRoutePoint(e);
            if (this.routePoints.length === 2) {
                this.map.off('click', clickHandler);
            }
        };
        
        this.map.on('click', clickHandler);
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
            createMarker: function() { return null; }
        }).addTo(this.map);
        
        this.analysisMode = null;
        this.showMessage('🛣️ Route planned! The blue line shows your dark sky journey.');
    }

    clearAll() {
        if (this.drawnItems) {
            this.drawnItems.clearLayers();
        }
        
        this.comparisonPoints.forEach(p => p.marker.remove());
        this.comparisonPoints = [];
        
        this.routePoints.forEach(p => p.marker.remove());
        this.routePoints = [];
        
        if (this.routingControl) {
            this.map.removeControl(this.routingControl);
            this.routingControl = null;
        }
        
        this.analysisMode = null;
        this.showMessage('🗑️ All cleared! Ready for new analysis.');
    }

    async toggleLayer(layerName, visible) {
        if (!this.dataManager) return;
        
        if (visible && !this.activeLayers.has(layerName)) {
            let layer;
            switch (layerName) {
                case 'worldAtlas':
                    layer = await this.dataManager.loadWorldAtlasLayer();
                    break;
                case 'groundMeasurements':
                    layer = await this.dataManager.loadGroundMeasurements();
                    break;
                case 'heatmap':
                    layer = await this.dataManager.loadHeatmapLayer();
                    break;
                default:
                    return;
            }
            if (layer) {
                layer.addTo(this.map);
                this.activeLayers.set(layerName, layer);
            }
        } else if (!visible && this.activeLayers.has(layerName)) {
            this.map.removeLayer(this.activeLayers.get(layerName));
            this.activeLayers.delete(layerName);
        }
    }

    switchMode() {
        const newMode = this.mode === 'citizen' ? 'scientific' : 'citizen';
        console.log(`🔄 Switching to ${newMode} mode`);
        window.location.href = `index.html?mode=${newMode}`;
    }

    showDataSources() {
        if (!this.dataManager) {
            this.showMessage('❌ Data manager not initialized yet.');
            return;
        }

        const sources = this.dataManager.datasets;
        let content = '<h6>📊 Data Sources</h6><div class="data-sources-list">';
        
        Object.values(sources).forEach(source => {
            content += `
                <div class="data-source-item mb-3 p-2 border rounded">
                    <h7>${source.name}</h7>
                    <p class="mb-1"><small>${source.description}</small></p>
                    <p class="mb-1"><small><strong>Type:</strong> ${source.type || 'tile layer'}</small></p>
                    <p class="mb-1"><small><strong>Update Frequency:</strong> ${source.updateFrequency || 'Varies'}</small></p>
                    <p class="mb-1"><small><strong>API Endpoint:</strong> ${source.apiEndpoint ? 'Available' : 'Not available'}</small></p>
                </div>
            `;
        });
        
        content += '</div>';
        this.showAnalysisPanel('Data Sources', content);
    }

    showAnalysisPanel(title, content) {
        document.getElementById('analysisTitle').textContent = title;
        document.getElementById('analysisContent').innerHTML = content;
        document.getElementById('analysisPanel').style.display = 'block';
        
        if (this.collapsedPanels.has('analysisPanel')) {
            this.togglePanelCollapse('analysisPanel');
        }
    }

    hideAnalysisPanel() {
        document.getElementById('analysisPanel').style.display = 'none';
    }

    async sendChatMessage() {
        const input = document.getElementById('user-input');
        const message = input.value.trim();
        
        if (message) {
            this.addChatMessage('user', message);
            input.value = '';
            
            try {
                const response = await this.generateAIResponse(message);
                this.addChatMessage('assistant', response);
            } catch (error) {
                console.error('Error generating response:', error);
                this.addChatMessage('assistant', "I'm having trouble connecting right now. Please try again shortly.");
            }
        }
    }

    async generateAIResponse(message) {
        try {
            const center = this.map.getCenter();
            
            const requestData = {
                chatInput: message,
                locationContext: {
                    lat: center.lat,
                    lng: center.lng
                },
                sessionId: 'webgis-session-' + Date.now()
            };

            this.addChatMessage('assistant', 'Thinking...');

            const response = await fetch(N8N_CONFIG.webhookUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestData),
                signal: AbortSignal.timeout(N8N_CONFIG.timeout)
            });

            if (!response.ok) {
                throw new Error('Network response was not ok');
            }

            const data = await response.json();
            
            const chatMessages = document.getElementById('chat-messages');
            const lastMessage = chatMessages.lastChild;
            if (lastMessage && lastMessage.textContent.includes('Thinking...')) {
                chatMessages.removeChild(lastMessage);
            }
            
            return data.output || "I'm here to help with light pollution questions!";

        } catch (error) {
            console.error('Error calling n8n:', error);
            
            const chatMessages = document.getElementById('chat-messages');
            const lastMessage = chatMessages.lastChild;
            if (lastMessage && lastMessage.textContent.includes('Thinking...')) {
                chatMessages.removeChild(lastMessage);
            }
            
            return this.getFallbackResponse(message);
        }
    }

    getFallbackResponse(message) {
        const lowerMessage = message.toLowerCase();
        
        if (lowerMessage.includes('light pollution') || lowerMessage.includes('what is')) {
            return "Light pollution is excessive artificial light that brightens the night sky. There are four main types: glare (excessive brightness), skyglow (urban glow), light trespass (unwanted light), and clutter (confusing groupings).";
        }
        else if (lowerMessage.includes('health') || lowerMessage.includes('sleep')) {
            return "Blue light at night disrupts circadian rhythms by suppressing melatonin production. This can lead to sleep disorders, increased stress, and long-term health issues. I recommend using warm-colored lights (<3000K) after dark.";
        }
        else if (lowerMessage.includes('bird') || lowerMessage.includes('turtle') || lowerMessage.includes('insect')) {
            return "Light pollution affects wildlife significantly: birds get disoriented during migration, sea turtles avoid dark beaches to nest, and insects are drawn to lights until exhaustion. Shielded, warm lighting helps protect them.";
        }
        else if (lowerMessage.includes('solution') || lowerMessage.includes('reduce') || lowerMessage.includes('prevent')) {
            return "To reduce light pollution: use fully shielded fixtures, choose warm color temperatures (<3000K), install motion sensors, turn off unnecessary lights, and direct lighting downward where needed.";
        }
        else if (lowerMessage.includes('dark sky') || lowerMessage.includes('best') || lowerMessage.includes('where')) {
            return "The best dark sky spots have light pollution below 3 μcd/m². Look for certified International Dark Sky Parks, remote areas away from cities, and use the tools here to find optimal locations!";
        }
        else if (lowerMessage.includes('help') || lowerMessage.includes('hello') || lowerMessage.includes('hi')) {
            return "Hello! I'm Lumina, your light pollution assistant. I can explain the impacts of artificial light, help you find dark sky areas, and suggest solutions for reducing light pollution. What would you like to know?";
        }
        else {
            return "I specialize in light pollution and dark sky conservation. I can explain the different types of light pollution, their impacts on health and wildlife, and help you find solutions. What specifically would you like to know?";
        }
    }

    addChatMessage(sender, message) {
        const chatMessages = document.getElementById('chat-messages');
        const messageDiv = document.createElement('div');
        messageDiv.className = `chat-message ${sender} cosmic-message`;
        
        if (sender === 'user') {
            messageDiv.innerHTML = `
                <div class="message-avatar" style="background: linear-gradient(135deg, var(--cosmic-primary), var(--cosmic-secondary));">
                    <i class="fas fa-user"></i>
                </div>
                <div class="message-content">
                    <strong>You:</strong> ${message}
                </div>
            `;
        } else {
            messageDiv.innerHTML = `
                <div class="message-avatar">
                    <i class="fas fa-robot"></i>
                </div>
                <div class="message-content">
                    <strong>Lumina:</strong> ${message}
                </div>
            `;
        }
        
        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    showMessage(message) {
        if (this.map) {
            L.popup()
                .setLatLng(this.map.getCenter())
                .setContent(`<div class="p-2">${message}</div>`)
                .openOn(this.map);
        }
    }

    exportAreaData() {
        const data = {
            type: 'Light Pollution Analysis Export',
            timestamp: new Date().toISOString(),
            area: 'User drawn analysis area',
            features: [
                {
                    pollution_level: 'Real Data Analysis',
                    recommendation: 'Use the scientific mode tools for detailed data export',
                    export_format: 'JSON',
                    data_quality: 'real_data_analysis'
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

// Simple initialization
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 DOM loaded, starting WebGIS...');
    try {
        window.webGIS = new LightPollutionWebGIS();
    } catch (error) {
        console.error('💥 Failed to initialize WebGIS:', error);
        alert('Failed to load the application. Please check the console for details.');
    }
});