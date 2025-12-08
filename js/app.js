// js/app.js - ZOOM CONTROLS POSITIONED BOTTOM-RIGHT
class LightPollutionWebGIS {
    constructor() {
        this.map = null;
        this.mode = null;
        this.dataManager = null;
        this.citizenMode = null;
        this.scientificMode = null;
        this.actionBot = null;
        this.drawnItems = null;
        this.analysisMode = null;
        this.comparisonPoints = [];
        this.routePoints = [];
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
            console.log(`n8n ${this.n8nAvailable ? 'available' : 'unavailable'}`);
            
            this.initializeUI();
            await this.initializeMap();
            
            this.dataManager = new DataManager();
            this.dataManager.webGIS = this; 
            
            if (typeof window.ActionBotController !== 'undefined') {
                this.actionBot = new window.ActionBotController(this);
                this.actionBot.initialize();
                console.log('🤖 ActionBot globally initialized');
            }

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
            alert('Failed to initialize: ' + error.message);
        }
    }

    async testN8NConnection() {
        const url = N8N_CONFIG.actionBotUrl || N8N_CONFIG.webhookUrl;
        if (!url) {
            console.warn('⚠️ N8N URL not configured');
            return false;
        }
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    chatInput: 'ping', 
                    mode: 'test', 
                    sessionId: 'init_test',
                    timestamp: new Date().toISOString()
                }),
                signal: AbortSignal.timeout(5000)
            });
            const isConnected = response.ok;
            console.log(`🌐 N8N ${isConnected ? 'connected' : 'not responding'}`);
            return isConnected;
        } catch (error) {
            console.warn('🌐 N8N server not available:', error.message);
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
        if (loadingScreen) loadingScreen.style.display = 'none';
    }

    initializeUI() {
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
        const citizenTools = document.getElementById('citizenTools');
        const scientificTools = document.getElementById('scientificTools');

        if (this.mode === 'citizen') {
            if (panelTitle) panelTitle.textContent = 'Stargazing Tools';
            if (assistantName) assistantName.textContent = 'Lumina';
            if (welcomeMessage) welcomeMessage.textContent = 'Hello! I\'m Lumina. Ask me to "Find dark sky spots" or "Zoom to London".';
            if (citizenTools) citizenTools.style.display = 'block';
            if (scientificTools) scientificTools.style.display = 'none';
        } else {
            if (panelTitle) panelTitle.textContent = 'Scientific Analysis';
            if (assistantName) assistantName.textContent = 'Lumina Pro';
            if (welcomeMessage) welcomeMessage.textContent = 'Scientific Mode active. Use the tools below or ask me to "Analyze current area".';
            if (citizenTools) citizenTools.style.display = 'none';
            if (scientificTools) scientificTools.style.display = 'block';
        }
    }

    async initializeMap() {
        return new Promise((resolve) => {
            setTimeout(() => {
                this.map = L.map('map', {
                    center: [30, 0],
                    zoom: 2,
                    zoomControl: false, // Disable default
                    attributionControl: true
                });

                // ✅ MOVE ZOOM TO TOP-LEFT
                // (CSS will shift it slightly right to clear the sidebar)
                L.control.zoom({
                    position: 'topleft'
                }).addTo(this.map);
                
                this.drawnItems = new L.FeatureGroup();
                this.drawnItems.addTo(this.map);
                
                this.addBaseLayers();
                this.initializeDrawControl();
                resolve();
            }, 100);
        });
    }

    addBaseLayers() {
        const osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap' }).addTo(this.map);
        const satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', { attribution: '© Esri' });
        
        this.baseLayers = { osm: osmLayer, satellite: satelliteLayer };
        this.activeBaseLayer = 'osm';
    }

    switchBasemap(basemapId) {
        if (this.baseLayers && this.baseLayers[basemapId]) {
            if (this.activeBaseLayer) this.map.removeLayer(this.baseLayers[this.activeBaseLayer]);
            this.baseLayers[basemapId].addTo(this.map);
            this.activeBaseLayer = basemapId;
            this.updateBasemapDropdown(basemapId);
        }
    }

    updateBasemapDropdown(selectedId) {
        const dropdown = document.getElementById('basemapDropdown');
        if (dropdown) {
            dropdown.querySelectorAll('.basemap-option').forEach(option => {
                option.classList.toggle('active', option.dataset.basemap === selectedId);
            });
        }
    }

    initializeDrawControl() {
        if (this.drawControl) return;

        this.drawControl = new L.Control.Draw({
            draw: {
                polygon: { allowIntersection: false, showArea: true },
                rectangle: true, circle: false, marker: false, circlemarker: false, polyline: false
            },
            edit: { featureGroup: this.drawnItems }
        });
        this.map.addControl(this.drawControl);
        this.map.on(L.Draw.Event.CREATED, (e) => this.onDrawCreated(e));
    }

    async loadLightPollutionData() {
        if (!this.dataManager) return;
        
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
    }

    initializeModeFunctionality() {
        if (this.mode === 'citizen') {
            this.citizenMode = new CitizenMode(this);
            this.citizenMode.initialize();
        } else {
            this.scientificMode = new ScientificMode(this);
            this.scientificMode.initialize();
        }
    }

    setupEventListeners() {
        this.setupButtonListener('drawPolygon', () => this.enableDrawMode());
        this.setupButtonListener('findDarkSky', () => this.findDarkSkySpots());
        this.setupButtonListener('compareLocations', () => this.enableCompareMode());
        this.setupButtonListener('planRoute', () => this.enableRoutePlanning());
        this.setupButtonListener('clearAll', () => this.clearAll());
        this.setupButtonListener('switchMode', () => this.switchMode());
        this.setupButtonListener('dataSources', () => this.showDataSources());
        this.setupButtonListener('send-message', () => this.sendChatMessage());
        
        const userInput = document.getElementById('user-input');
        if (userInput) userInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') this.sendChatMessage(); });
        
        ['viirsLayer', 'worldAtlasLayer', 'groundMeasurements', 'darkSkyParks', 'heatmapLayer'].forEach(id => {
            const layerName = id.replace('Layer', '');
            this.setupCheckboxListener(id, layerName === 'viirs' ? 'viirs' : layerName);
        });

        const basemapSwitcher = document.getElementById('basemapSwitcher');
        if (basemapSwitcher) basemapSwitcher.addEventListener('click', (e) => {
            e.stopPropagation();
            document.getElementById('basemapDropdown')?.classList.toggle('show');
        });
        document.querySelectorAll('.basemap-option').forEach(opt => {
            opt.addEventListener('click', () => {
                this.switchBasemap(opt.dataset.basemap);
                document.getElementById('basemapDropdown')?.classList.remove('show');
            });
        });

        this.setupPanelCollapseListeners();
    }

    setupPanelCollapseListeners() {
        const panelIds = ['controlPanel', 'dataLayersPanel', 'legendPanel', 'chatbotPanel', 'analysisPanel'];
        panelIds.forEach(panelId => {
            const panel = document.getElementById(panelId);
            if (panel) {
                const header = panel.querySelector('.panel-header');
                if (header && !header.querySelector('.collapse-icon')) {
                    const collapseIcon = document.createElement('span');
                    collapseIcon.className = 'collapse-icon ms-2';
                    collapseIcon.innerHTML = '<i class="fas fa-chevron-down"></i>';
                    header.appendChild(collapseIcon);
                    header.style.cursor = 'pointer';
                    header.addEventListener('click', (e) => {
                        if (!e.target.closest('.btn-close-cosmic')) this.togglePanelCollapse(panelId);
                    });
                }
            }
        });
    }

    initializePanelCollapse() {
        const savedCollapsed = localStorage.getItem('collapsedPanels');
        if (savedCollapsed) {
            this.collapsedPanels = new Set(JSON.parse(savedCollapsed));
            this.collapsedPanels.forEach(panelId => {
                const panel = document.getElementById(panelId);
                if (panel) panel.classList.add('panel-collapsed');
            });
        }
    }

    togglePanelCollapse(panelId) {
        const panel = document.getElementById(panelId);
        if (panel) {
            panel.classList.toggle('panel-collapsed');
            if (panel.classList.contains('panel-collapsed')) {
                this.collapsedPanels.add(panelId);
            } else {
                this.collapsedPanels.delete(panelId);
            }
            localStorage.setItem('collapsedPanels', JSON.stringify(Array.from(this.collapsedPanels)));
        }
    }

    setupButtonListener(id, handler) {
        const el = document.getElementById(id);
        if (el) el.addEventListener('click', handler);
    }

    setupCheckboxListener(id, layerName) {
        const el = document.getElementById(id);
        if (el) el.addEventListener('change', (e) => this.toggleLayer(layerName, e.target.checked));
    }

    async toggleLayer(layerName, visible) {
        if (!this.dataManager) return;
        if (visible && !this.activeLayers.has(layerName)) {
            let layer;
            switch (layerName) {
                case 'worldAtlas': layer = await this.dataManager.loadWorldAtlasLayer(); break;
                case 'groundMeasurements': layer = await this.dataManager.loadGroundMeasurements(); break;
                case 'heatmap': layer = await this.dataManager.loadHeatmapLayer(); break;
                case 'viirs': layer = await this.dataManager.loadVIIRSTileLayer(); break;
                case 'darkSkyParks': layer = await this.dataManager.loadDarkSkyParks(); break;
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

    enableDrawMode() {
        this.showMessage('🎯 Draw a polygon on the map.');
        new L.Draw.Polygon(this.map).enable();
        this.analysisMode = 'draw';
    }

    onDrawCreated(e) {
        const layer = e.layer;
        this.drawnItems.addLayer(layer);
        if (this.analysisMode === 'draw') this.analyzeArea(layer);
    }

    async analyzeArea(layer) {
        const center = layer.getBounds().getCenter();
        const data = await this.dataManager.getDataAtPoint(center.lat, center.lng);
        layer.bindPopup(`
            <div class="analysis-popup">
                <h6>🔍 Quick Analysis</h6>
                <p><strong>Brightness:</strong> ${data.viirsValue.toFixed(2)} μcd/m²</p>
                <p><strong>Source:</strong> ${data.dataSource}</p>
            </div>
        `).openPopup();
    }

    findDarkSkySpots() {
        this.showMessage('🔭 Searching for dark sky locations...');
        if (this.citizenMode) this.citizenMode.findBestObservationAreas();
    }

    enableCompareMode() {
        this.showMessage('⚖️ Click on two locations to compare.');
        this.analysisMode = 'compare';
        this.comparisonPoints = [];
        const handler = (e) => {
            const point = e.latlng;
            L.marker(point).addTo(this.map).bindPopup('Point Selected').openPopup();
            this.comparisonPoints.push(point);
            if (this.comparisonPoints.length === 2) {
                this.map.off('click', handler);
                this.compareLocations();
            }
        };
        this.map.on('click', handler);
    }

    async compareLocations() {
        const [p1, p2] = this.comparisonPoints;
        const d1 = await this.dataManager.getDataAtPoint(p1.lat, p1.lng);
        const d2 = await this.dataManager.getDataAtPoint(p2.lat, p2.lng);
        
        const content = `
            <h6>⚖️ Comparison</h6>
            <table class="table table-sm">
                <tr><th>Metric</th><th>Loc A</th><th>Loc B</th></tr>
                <tr><td>Brightness</td><td>${d1.viirsValue.toFixed(2)}</td><td>${d2.viirsValue.toFixed(2)}</td></tr>
            </table>
        `;
        this.showAnalysisPanel('Comparison', content);
        this.comparisonPoints = [];
        this.analysisMode = null;
    }

    enableRoutePlanning() {
        this.showMessage('🗺️ Click start and end points.');
        this.analysisMode = 'route';
        this.routePoints = [];
        if (this.routingControl) this.map.removeControl(this.routingControl);
        
        const handler = (e) => {
            this.routePoints.push(e.latlng);
            L.marker(e.latlng).addTo(this.map);
            if (this.routePoints.length === 2) {
                this.map.off('click', handler);
                this.planRoute();
            }
        };
        this.map.on('click', handler);
    }

    clearAll() {
        if (this.drawnItems) this.drawnItems.clearLayers();
        if (this.routingControl) {
            this.map.removeControl(this.routingControl);
            this.routingControl = null;
        }
        if (this.citizenMode) {
             this.citizenMode.clearObservationSpots();
             if (this.citizenMode.userMarker) {
                 this.map.removeLayer(this.citizenMode.userMarker);
                 this.citizenMode.userMarker = null;
             }
        }
        document.querySelectorAll('.leaflet-marker-icon').forEach(m => m.remove());
        document.querySelectorAll('.leaflet-marker-shadow').forEach(s => s.remove()); 
        document.querySelectorAll('.leaflet-popup-pane > *').forEach(p => p.remove());
        this.showMessage('🗑️ Map cleared.');
    }

    switchMode() {
        const newMode = this.mode === 'citizen' ? 'scientific' : 'citizen';
        window.location.href = `index.html?mode=${newMode}`;
    }
    
    showDataSources() {
        const sources = [
            { name: 'NASA VIIRS', url: 'https://viirsland.gsfc.nasa.gov/', desc: 'Nighttime lights data from Suomi NPP satellite' },
            { name: 'World Atlas', url: 'https://www.lightpollutionmap.info/', desc: 'Light pollution atlas data' },
            { name: 'Dark Sky Parks', url: 'https://www.darksky.org/', desc: 'International Dark Sky Places database' },
            { name: 'OpenStreetMap', url: 'https://www.openstreetmap.org/', desc: 'Base map and location data' }
        ];
        
        const content = `
            <h6>📚 Data Sources</h6>
            <div class="list-group">
                ${sources.map(src => `
                    <a href="${src.url}" target="_blank" class="list-group-item list-group-item-action">
                        <div class="d-flex w-100 justify-content-between">
                            <h7 class="mb-1">${src.name}</h7>
                        </div>
                        <p class="mb-1">${src.desc}</p>
                    </a>
                `).join('')}
            </div>
        `;
        this.showAnalysisPanel('Data Sources', content);
    }

    showAnalysisPanel(title, content) {
        document.getElementById('analysisTitle').textContent = title;
        document.getElementById('analysisContent').innerHTML = content;
        const panel = document.getElementById('analysisPanel');
        panel.style.display = 'block';
        
        const closeBtn = document.getElementById('closeAnalysis');
        if (closeBtn) closeBtn.onclick = () => panel.style.display = 'none';
    }

    async sendChatMessage() {
        const input = document.getElementById('user-input');
        const message = input.value.trim();
        if (message) {
            this.addChatMessage('user', message);
            input.value = '';
            const response = await this.generateAIResponse(message);
            this.addChatMessage('assistant', response);
        }
    }

    async generateAIResponse(message) {
        if (this.n8nAvailable === false) {
            return "I'm running in basic mode. N8N ActionBot server is not available.";
        }
        try {
            if (this.actionBot && typeof this.actionBot.processUserMessage === 'function') {
                const response = await this.actionBot.processUserMessage(message);
                return response.message || "I processed your request.";
            }
            const lowerMsg = message.toLowerCase();
            if (lowerMsg.includes('dark') || lowerMsg.includes('star')) {
                return "Try clicking 'Find Dark Sky Spots' button or use the draw tool to analyze an area.";
            }
            if (lowerMsg.includes('zoom') || lowerMsg.includes('go to')) {
                return "Use the map controls to navigate, or try 'Zoom to London' in the chat.";
            }
            return "I'm running in basic mode. For advanced features, ensure N8N server is running.";
        } catch (error) {
            console.error('Chat response error:', error);
            return "Sorry, I encountered an error. Please try again.";
        }
    }

    addChatMessage(sender, message) {
        const container = document.getElementById('chat-messages');
        const div = document.createElement('div');
        div.className = `chat-message ${sender} cosmic-message`;
        div.innerHTML = `
            <div class="message-avatar"><i class="fas fa-${sender === 'user' ? 'user' : 'robot'}"></i></div>
            <div class="message-content"><strong>${sender === 'user' ? 'You' : 'Lumina'}:</strong> ${message}</div>
        `;
        container.appendChild(div);
        container.scrollTop = container.scrollHeight;
    }

    showMessage(msg) {
        if (this.map) L.popup().setLatLng(this.map.getCenter()).setContent(msg).openOn(this.map);
    }
}

document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 DOM loaded, starting WebGIS...');
    try {
        window.webGIS = new LightPollutionWebGIS();
    } catch (error) {
        console.error('💥 Failed to initialize WebGIS:', error);
    }
});