// js/scientific-mode.js
export class ScientificMode {
    constructor(webGIS) {
        this.webGIS = webGIS;
        this.actionBot = webGIS.actionBot; 
    }

    initialize() {
        console.log('✅ Scientific mode initialized');
        this.setupScientificTools();
    }

    setupScientificTools() {
        const bind = (id, fn) => { const el = document.getElementById(id); if(el) el.addEventListener('click', fn); };
        bind('timeSeries', () => this.enableTimeSeriesAnalysis());
        bind('statisticalAnalysis', () => this.enableStatisticalAnalysis());
        bind('dataExport', () => this.showExportOptions());
        bind('energyCalc', () => this.calculateEnergyWaste());
    }

    async calculateEnergyWaste() {
        let center = this.webGIS.map.getCenter();
        let areaSqKm = 1.0; 
        let sourceLabel = "Map Center View";
        let isPolygon = false;

        const drawnLayers = this.webGIS.drawnItems.getLayers();
        if (drawnLayers.length > 0) {
            const layer = drawnLayers[drawnLayers.length - 1]; 
            if (layer instanceof L.Polygon || layer instanceof L.Rectangle) {
                center = layer.getBounds().getCenter();
                const areaSqMeters = L.GeometryUtil.geodesicArea(layer.getLatLngs()[0]);
                areaSqKm = Math.max(0.01, (areaSqMeters / 1_000_000));
                sourceLabel = "Selected Polygon";
                isPolygon = true;
            }
        } else if (this.webGIS.uiMarkers.getLayers().length > 0) {
            const markers = this.webGIS.uiMarkers.getLayers();
            center = markers[markers.length - 1].getLatLng(); 
            sourceLabel = "Selected Marker";
        }

        this.webGIS.showMessage(`⚡ Analyzing ${sourceLabel}...`);
        
        const data = await this.webGIS.dataManager.getDataAtPoint(center.lat, center.lng);
        const sqm = data.light_pollution && !isNaN(parseFloat(data.light_pollution.sqm)) 
                    ? parseFloat(data.light_pollution.sqm) : 18.0;
        
        const radiance = Math.pow(10, (26.2 - sqm) / 2.5); 
        const annualWastedKwh = Math.round(radiance * 5000 * areaSqKm); 
        const annualCost = Math.round(annualWastedKwh * 0.15); 
        const co2Tons = (annualWastedKwh * 0.0007).toFixed(2); 

        const areaDisplay = areaSqKm < 0.1 ? (areaSqKm * 100).toFixed(1) + " hectares" : areaSqKm.toFixed(2) + " km²";

        const content = `
            <div class="text-center">
                <span class="badge ${isPolygon ? 'bg-primary' : 'bg-secondary'} mb-2">${sourceLabel}</span>
                <h6 class="text-warning">Target Area: ${areaDisplay}</h6>
                
                <div class="py-3">
                    <i class="fas fa-bolt fa-3x text-warning mb-2"></i>
                    <h2>${annualWastedKwh.toLocaleString()} kWh</h2>
                    <p class="mb-0">Estimated Annual Wasted Energy</p>
                </div>
                
                <div class="row g-2">
                    <div class="col-6">
                        <div class="p-2 border border-secondary rounded bg-dark">
                            <h4 class="text-danger mb-0">$${annualCost.toLocaleString()}</h4>
                            <small class="text-light">Loss</small>
                        </div>
                    </div>
                    <div class="col-6">
                        <div class="p-2 border border-secondary rounded bg-dark">
                            <h4 class="text-danger mb-0">${co2Tons} t</h4>
                            <small class="text-light">CO₂</small>
                        </div>
                    </div>
                </div>
            </div>
        `;

        this.webGIS.showAnalysisPanel('⚡ Energy & CO₂ Impact', content);
    }

    enableTimeSeriesAnalysis() { this.webGIS.showMessage("Feature: Time Series Analysis"); }
    enableStatisticalAnalysis() { this.webGIS.showMessage("Feature: Statistical Analysis"); }
    showExportOptions() { this.webGIS.showMessage("Feature: Export"); }
}