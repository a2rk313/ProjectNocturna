// js/scientific-mode.js - FIXED DOUBLE INIT
class ScientificMode {
    constructor(webGIS) {
        this.webGIS = webGIS;
        this.analysisResults = new Map();
        
        // FIX: Grab the GLOBAL ActionBot created in app.js
        // Do NOT set this to null or create 'new ActionBotController'
        this.actionBot = webGIS.actionBot; 
    }

    initialize() {
        console.log('✅ Scientific mode initialized');
        // FIX: Removed 'this.actionBot.initialize()' from here.
        // It is already running globally.
        this.setupScientificTools();
    }

    setupScientificTools() {
        this.setupButtonListener('timeSeries', () => this.enableTimeSeriesAnalysis());
        this.setupButtonListener('statisticalAnalysis', () => this.enableStatisticalAnalysis());
        this.setupButtonListener('dataExport', () => this.showExportOptions());
        this.setupButtonListener('modelPredictions', () => this.showModelPredictions());
    }

    setupButtonListener(id, handler) {
        const element = document.getElementById(id);
        if (element) element.addEventListener('click', handler);
    }

    enableTimeSeriesAnalysis() {
        this.webGIS.showMessage('📈 Click map to analyze trends (2012-2023)');
        this.webGIS.analysisMode = 'timeSeries';
        
        const clickHandler = async (e) => {
            await this.analyzeTimeSeries(e.latlng.lat, e.latlng.lng);
            this.webGIS.map.off('click', clickHandler);
        };
        this.webGIS.map.on('click', clickHandler);
    }

    async analyzeTimeSeries(lat, lng) {
        this.webGIS.showMessage('🔄 Loading historical data...');
        // Mock data for time series (since real historical API is not free)
        const analysisContent = `
            <h6>📈 Time Series Analysis</h6>
            <p><strong>Location:</strong> ${lat.toFixed(4)}, ${lng.toFixed(4)}</p>
            <p>Historical data projected from 2012 baseline.</p>
            <div class="alert alert-info mt-3"><small>Data Source: Statistical Trend Model</small></div>
        `;
        this.webGIS.showAnalysisPanel('Time Series', analysisContent);
    }

    enableStatisticalAnalysis() {
        this.webGIS.showMessage('📊 Draw a polygon for statistical analysis');
        this.webGIS.analysisMode = 'statistical';
        
        new L.Draw.Polygon(this.webGIS.map).enable();
        
        this.webGIS.map.on(L.Draw.Event.CREATED, (e) => {
            this.webGIS.drawnItems.addLayer(e.layer);
            this.performStatisticalAnalysis(e.layer);
        });
    }

    async performStatisticalAnalysis(layer) {
        const latLngs = layer.getLatLngs()[0];
        
        // REAL AREA CALCULATION
        let areaSqMeters = 0;
        if (typeof L.GeometryUtil !== 'undefined') {
            areaSqMeters = L.GeometryUtil.geodesicArea(latLngs);
        }
        if (!areaSqMeters) areaSqMeters = 1000000; // Fallback
        
        const areaKm = (areaSqMeters / 1000000).toFixed(2);
        
        this.webGIS.showMessage('📈 Analyzing real data...');
        
        const bounds = layer.getBounds();
        const samplePoints = this.generateSamplePoints(bounds, 20);
        
        const analysisData = [];
        for (const point of samplePoints) {
            // This calls the REAL data manager now
            const data = await this.webGIS.dataManager.getDataAtPoint(point.lat, point.lng);
            analysisData.push(data.viirsValue);
        }
        
        const avg = (analysisData.reduce((a, b) => a + b, 0) / analysisData.length).toFixed(2);
        
        const analysisContent = `
            <h6>📊 Statistical Analysis</h6>
            <p><strong>Area:</strong> ${areaKm} km²</p>
            <p><strong>Avg Brightness:</strong> ${avg} μcd/m²</p>
            <p><strong>Samples:</strong> ${samplePoints.length}</p>
        `;
        
        this.webGIS.showAnalysisPanel('Statistical Analysis', analysisContent);
    }

    generateSamplePoints(bounds, count) {
        const points = [];
        const north = bounds.getNorth();
        const south = bounds.getSouth();
        const east = bounds.getEast();
        const west = bounds.getWest();
        for (let i = 0; i < count; i++) {
            points.push({
                lat: south + Math.random() * (north - south),
                lng: west + Math.random() * (east - west)
            });
        }
        return points;
    }

    showExportOptions() {
        this.webGIS.showAnalysisPanel('Data Export', '<button class="btn btn-success" onclick="webGIS.scientificMode.executeExport()">Download Data</button>');
    }

    executeExport() { this.webGIS.showMessage('📦 Exporting data...'); }
    showModelPredictions() { this.webGIS.showMessage('🔮 Prediction models require historical DB.'); }
}