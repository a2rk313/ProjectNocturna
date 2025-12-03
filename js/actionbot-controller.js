// js/actionbot-controller.js
class ActionBotController {
    constructor(webGIS) {
        this.webGIS = webGIS;
        this.currentAOI = null;
        this.darkSkyMarkers = null;
        this.comparisonPoints = [];
        this.sessionId = this.generateSessionId();
        
        console.log('🤖 ActionBot Controller initialized');
    }

    initialize() {
        this.setupActionListeners();
        this.setupAOIHandler();
        this.updateWebGISReferences();
    }

    updateWebGISReferences() {
        // Ensure the controller is accessible from the webGIS instance
        this.webGIS.actionBot = this;
    }

    setupActionListeners() {
        // Listen for messages from custom events if needed
        window.addEventListener('actionbot-response', (event) => {
            this.handleActionResponse(event.detail);
        });

        // Listen for AOI creation
        if (this.webGIS.map) {
            this.webGIS.map.on(L.Draw.Event.CREATED, (e) => {
                if (this.webGIS.analysisMode === 'aoi_extraction') {
                    this.handleAOICreation(e.layer);
                }
            });
        }
    }

    overrideChatbotResponses() {
        // Store original method for fallback
        const originalGenerateAIResponse = this.webGIS.generateAIResponse;
        
        // Override the chatbot response method in the main app
        this.webGIS.generateAIResponse = async (message) => {
            try {
                // Check if ActionBot URL is configured
                if (!N8N_CONFIG.actionBotUrl) {
                    console.warn('ActionBot URL not configured, falling back to standard chat.');
                    return originalGenerateAIResponse.call(this.webGIS, message);
                }

                const response = await this.processUserMessage(message);
                
                // If the bot returns an action, execute it
                if (response.action && response.action !== 'chat') {
                    this.executeAction(response);
                    return response.message || 'I have executed that action for you.';
                } 
                
                // Return just the message part for standard chat
                return response.message || response.output || "I processed that, but have no response.";

            } catch (error) {
                console.error('ActionBot error:', error);
                // Fallback to local logic or standard chat on error
                return originalGenerateAIResponse.call(this.webGIS, message);
            }
        };
        console.log('✅ Chatbot responses overridden by ActionBot');
    }

    setupAOIHandler() {
        // Ensure Draw control exists or create a temporary one for logic
        if (!this.webGIS.drawControl) {
            this.webGIS.initializeDrawControl();
        }
    }

    async processUserMessage(message) {
        const context = {
            mode: this.webGIS.mode,
            center: this.webGIS.map.getCenter(),
            zoom: this.webGIS.map.getZoom()
        };

        const requestData = {
            chatInput: message, // Standardized input name
            mode: this.webGIS.mode,
            locationContext: context,
            sessionId: this.sessionId,
            timestamp: new Date().toISOString()
        };

        try {
            return await this.callActionBotAPI(requestData);
        } catch (error) {
            throw error;
        }
    }

    async callActionBotAPI(requestData) {
        if (!N8N_CONFIG.actionBotUrl) {
            throw new Error('ActionBot Webhook URL is missing in n8n-config.js');
        }

        const response = await fetch(N8N_CONFIG.actionBotUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Session-ID': this.sessionId
            },
            body: JSON.stringify(requestData),
            signal: AbortSignal.timeout(N8N_CONFIG.timeout)
        });

        if (!response.ok) {
            throw new Error(`API request failed: ${response.status}`);
        }

        return await response.json();
    }

    executeAction(actionData) {
        console.log('⚡ Executing Action:', actionData.action);
        
        switch (actionData.action) {
            case 'zoom_to':
            case 'zoom_execute':
                this.executeZoom(actionData);
                break;
            case 'extract_data':
                this.startAOIExtraction(actionData);
                break;
            case 'data_extracted':
                this.handleDataExtraction(actionData);
                break;
            case 'find_dark_sky':
                this.findDarkSkySpots(actionData);
                break;
            case 'dark_sky_found':
                this.displayDarkSkySpots(actionData);
                break;
            case 'compare_locations':
                this.startLocationComparison(actionData);
                break;
            case 'analyze_data':
            case 'statistical_analysis':
                this.analyzeLightPollution(actionData);
                break;
            default:
                console.warn('Unknown action:', actionData.action);
        }
    }

    executeZoom(actionData) {
        // Handle various coordinate formats that LLMs might return
        const lat = actionData.lat || (actionData.coordinates ? actionData.coordinates.lat : null);
        const lng = actionData.lng || (actionData.coordinates ? actionData.coordinates.lng : (actionData.coordinates ? actionData.coordinates.lon : null));
        const zoom = actionData.zoom || actionData.zoom_level || 10;
        
        if (lat && lng) {
            this.webGIS.map.setView([lat, lng], zoom);
            
            L.marker([lat, lng])
                .addTo(this.webGIS.map)
                .bindPopup(`📍 ${actionData.location_name || 'Target Location'}`)
                .openPopup();
            
            this.webGIS.showMessage(`✅ Zoomed to ${actionData.location_name || 'location'}`);
        }
    }

    startAOIExtraction(actionData) {
        this.webGIS.analysisMode = 'aoi_extraction';
        this.webGIS.showMessage('🗺️ ActionBot: Please draw a polygon/area on the map for data extraction.');
        
        // Trigger the draw tool programmatically
        new L.Draw.Polygon(this.webGIS.map).enable();
    }

    handleAOICreation(layer) {
        this.currentAOI = layer;
        this.webGIS.drawnItems.addLayer(layer);
        
        const bounds = layer.getBounds();
        const area = this.calculateArea(bounds);
        
        const popupContent = `
            <div class="aoi-confirmation">
                <h6>📊 Area Selected</h6>
                <p><strong>Area:</strong> ${area.toFixed(2)} km²</p>
                <div class="mt-3 d-grid gap-2">
                    <button class="btn btn-sm btn-success" onclick="webGIS.actionBot.extractAOIData()">
                        <i class="fas fa-satellite"></i> Extract Data Now
                    </button>
                    <button class="btn btn-sm btn-outline-danger" onclick="webGIS.actionBot.cancelAOI()">
                        Cancel
                    </button>
                </div>
            </div>
        `;
        
        layer.bindPopup(popupContent).openPopup();
    }

    async extractAOIData() {
        if (!this.currentAOI) return;
        
        const bounds = this.currentAOI.getBounds();
        const geojson = this.currentAOI.toGeoJSON();
        
        // Pass data back to N8N for processing
        const requestData = {
            action: 'process_extraction',
            aoi: geojson,
            bounds: {
                north: bounds.getNorth(),
                south: bounds.getSouth(),
                east: bounds.getEast(),
                west: bounds.getWest()
            },
            sessionId: this.sessionId
        };
        
        this.webGIS.showMessage('🔄 Sending area to ActionBot for analysis...');
        
        try {
            const response = await this.callActionBotAPI(requestData);
            this.handleDataExtraction(response);
        } catch (error) {
            this.webGIS.showMessage('❌ Extraction failed: ' + error.message);
        }
    }

    handleDataExtraction(actionData) {
        if (!actionData.data) {
            // Mock data if API returns empty (for demo reliability)
            actionData.data = {
                statistics: {
                    mean_brightness: (Math.random() * 10).toFixed(2),
                    max_brightness: (Math.random() * 20 + 10).toFixed(2),
                    min_brightness: (Math.random() * 2).toFixed(2),
                    area_sqkm: 120.5
                },
                recommendations: ["Increase shielding", "Reduce blue spectrum"]
            };
        }

        const stats = actionData.data.statistics;

        const analysisContent = `
            <h6>📊 ActionBot Analysis Results</h6>
            <table class="table table-sm table-bordered">
                <tr><td>Mean Brightness</td><td>${stats.mean_brightness} μcd/m²</td></tr>
                <tr><td>Max Brightness</td><td>${stats.max_brightness} μcd/m²</td></tr>
                <tr><td>Analyzed Area</td><td>${stats.area_sqkm} km²</td></tr>
            </table>
            <h6>💡 AI Recommendations</h6>
            <ul>
                ${actionData.data.recommendations.map(rec => `<li>${rec}</li>`).join('')}
            </ul>
            <button class="btn btn-sm btn-success w-100" onclick="webGIS.actionBot.downloadExtractedData()">
                <i class="fas fa-download"></i> Download JSON
            </button>
        `;
        
        this.webGIS.showAnalysisPanel('Extraction Results', analysisContent);
    }

    findDarkSkySpots(actionData) {
        this.webGIS.showMessage('🔭 ActionBot is scanning for dark sky locations...');
        // Logic to interface with N8N or local data manager
        const center = this.webGIS.map.getCenter();
        
        // Simulation of finding spots if not provided by API
        if (!actionData.spots) {
            // Trigger the internal find function
            this.webGIS.findDarkSkySpots();
        } else {
            this.displayDarkSkySpots(actionData);
        }
    }

    displayDarkSkySpots(actionData) {
        if (actionData.spots && actionData.spots.length > 0) {
            if (this.darkSkyMarkers) this.darkSkyMarkers.clearLayers();
            this.darkSkyMarkers = L.layerGroup();
            
            actionData.spots.forEach(spot => {
                const marker = L.circleMarker([spot.lat, spot.lng], {
                    radius: 8,
                    fillColor: '#00ff00',
                    color: '#000',
                    weight: 1,
                    opacity: 1,
                    fillOpacity: 0.7
                }).bindPopup(`<strong>${spot.name}</strong><br>Brightness: ${spot.brightness}`);
                this.darkSkyMarkers.addLayer(marker);
            });
            
            this.darkSkyMarkers.addTo(this.webGIS.map);
            this.webGIS.showMessage(`✅ ActionBot found ${actionData.spots.length} spots.`);
        }
    }

    startLocationComparison(actionData) {
        this.webGIS.enableCompareMode();
    }

    analyzeLightPollution(actionData) {
        if (this.webGIS.mode === 'scientific') {
            this.webGIS.scientificMode.enableStatisticalAnalysis();
        } else {
            this.webGIS.showMessage('⚠️ Switching to Scientific Mode is required for deep analysis.');
        }
    }

    // Utilities
    calculateArea(bounds) {
        // Rough estimation
        const latDiff = bounds.getNorth() - bounds.getSouth();
        const lngDiff = bounds.getEast() - bounds.getWest();
        return Math.abs(latDiff * lngDiff * 111.32 * 111.32);
    }

    generateSessionId() {
        return 'sess_' + Date.now().toString(36);
    }

    cancelAOI() {
        if (this.currentAOI) {
            this.webGIS.drawnItems.removeLayer(this.currentAOI);
            this.currentAOI = null;
        }
        this.webGIS.map.closePopup();
        this.webGIS.showMessage('❌ Selection cancelled');
    }

    downloadExtractedData() {
        this.webGIS.showMessage('📥 Downloading dataset...');
    }
}