// js/scientific-mode.js
class ScientificMode {
    constructor(webGIS) {
        this.webGIS = webGIS;
    }

    initialize() {
        this.setupTools();
        this.addResearchToggle();
        window.SystemBus.emit('system:message', "🔬 Scientific Mode: Decision Support System Active.");
    }

    setupTools() {
        // Helper to replace elements to clear old listeners
        const bind = (id, fn) => { 
            const el = document.getElementById(id); 
            if(el) {
                const newEl = el.cloneNode(true);
                el.parentNode.replaceChild(newEl, el);
                newEl.addEventListener('click', fn);
            }
        };

        bind('energyCalc', () => this.calculateEnergyWaste());
        bind('timeSeries', () => this.analyzeTimeSeries());
        bind('statisticalAnalysis', () => this.generateDistrictReport()); 
        bind('dataExport', () => this.exportData());
    }

    addResearchToggle() {
        const container = document.getElementById('scientificTools');
        if (!document.getElementById('researchToggle')) {
            const toggleDiv = document.createElement('div');
            toggleDiv.className = 'form-check form-switch text-light mt-2 p-2 rounded bg-dark border border-secondary';
            toggleDiv.innerHTML = `<input class="form-check-input" type="checkbox" id="researchToggle"><label class="form-check-label" for="researchToggle"><i class="fas fa-filter text-info me-1"></i> Research Grade Filter</label>`;
            container.prepend(toggleDiv);
        }
    }

    // --- HELPER: Handle Point vs Polygon Selection ---
    getAnalysisGeometry() {
        const selection = this.webGIS.getSelection();
        if (!selection) return null;

        // If Polygon, use it directly
        if (selection.type === 'Polygon' || selection.type === 'MultiPolygon') {
            return selection.geometry;
        }

        // If Point (Marker/GPS), create a virtual 10km buffer (0.1 deg)
        if (selection.type === 'Point') {
            const lat = selection.center.lat;
            const lng = selection.center.lng;
            const r = 0.05; // ~5km radius
            
            return {
                type: "Polygon",
                coordinates: [[
                    [lng - r, lat - r],
                    [lng + r, lat - r],
                    [lng + r, lat + r],
                    [lng - r, lat + r],
                    [lng - r, lat - r]
                ]]
            };
        }
        return null;
    }

    // --- TOOL 1: DISTRICT POLICY REPORT (Real Data from /api/stats) ---
    async generateDistrictReport() {
        const geometry = this.getAnalysisGeometry();
        if (!geometry) {
             window.SystemBus.emit('system:message', "⚠️ Select a district or region first.");
             return;
        }

        window.SystemBus.emit('system:message', "📊 Generating Zonal Statistics Report...");

        const researchMode = document.getElementById('researchToggle')?.checked;

        try {
            // CALL BACKEND API
            const response = await fetch('/api/stats', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ geometry, researchMode })
            });

            if (!response.ok) throw new Error("Analysis failed");
            const data = await response.json();

            // Handle empty results
            const avgBrightness = data.avg_brightness || "N/A";
            const sampleSize = data.sample_size || 0;
            const qualityScore = data.avg_quality || "N/A";

            const content = `
                <div class="text-center">
                    <h5 class="text-info border-bottom pb-2">Zonal Analysis</h5>
                    <div class="row text-start mt-2">
                        <div class="col-6">
                            <small class="text-muted">Avg Brightness (SQM)</small>
                            <br><strong>${avgBrightness}</strong> <span style="font-size:0.7em">mag/arcsec²</span>
                        </div>
                        <div class="col-6">
                            <small class="text-muted">Data Points</small>
                            <br><strong>${sampleSize}</strong>
                        </div>
                    </div>

                    <div class="alert alert-dark mt-3 p-2">
                        <div class="d-flex justify-content-between align-items-center">
                            <span>✅ Data Quality Score:</span>
                            <strong class="text-success">${qualityScore}/100</strong>
                        </div>
                        <small class="text-muted d-block mt-1">
                            ${researchMode ? 'Filtered for research-grade sensors only.' : 'Includes all citizen science data.'}
                        </small>
                    </div>
                    
                    <div class="mt-2">
                         <button class="btn btn-sm btn-outline-light w-100" onclick="window.print()"><i class="fas fa-print me-2"></i>Print Report</button>
                    </div>
                </div>
            `;
            window.SystemBus.emit('ui:show_modal', { title: "🏛️ Zonal Statistics", content: content });

        } catch (e) {
            console.error(e);
            window.SystemBus.emit('system:message', "❌ Failed to generate report.");
        }
    }

    // --- TOOL 2: TIME SERIES ANALYSIS (Real Data from /api/history) ---
    async analyzeTimeSeries() {
        const selection = this.webGIS.getSelection();
        if (!selection || selection.type !== 'Point') {
             // For time series, we prefer a point to find nearest neighbors
             // If polygon, we use centroid (simplified for this demo)
             window.SystemBus.emit('system:message', "⚠️ Select a specific location (Marker) for time history.");
             return;
        }

        window.SystemBus.emit('system:message', "📈 Querying historical trends...");

        try {
            const lat = selection.center.lat;
            const lng = selection.center.lng;

            // CALL BACKEND API
            const response = await fetch(`/api/history?lat=${lat}&lng=${lng}`);
            const data = await response.json();

            if (data.length === 0) {
                window.SystemBus.emit('system:message', "⚠️ No historical data found nearby.");
                return;
            }

            const labels = data.map(d => new Date(d.date_observed).getFullYear());
            const values = data.map(d => d.sqm);

            const canvasId = 'chart_' + Date.now();
            const content = `
                <div class="text-center">
                    <h6>Sky Brightness Trend (SQM)</h6>
                    <canvas id="${canvasId}" width="400" height="200"></canvas>
                    <div class="mt-2 text-start small text-muted border-top pt-2">
                        <strong>Data Source:</strong> Citizen Science Stations (5km Radius)
                        <br><em>Higher SQM values mean darker skies.</em>
                    </div>
                </div>
            `;

            window.SystemBus.emit('ui:show_modal', { title: "📈 Temporal Analysis", content: content });

            setTimeout(() => {
                const ctx = document.getElementById(canvasId).getContext('2d');
                new Chart(ctx, {
                    type: 'line',
                    data: {
                        labels: labels,
                        datasets: [{
                            label: 'Sky Quality (Mag/arcsec²)',
                            data: values,
                            borderColor: '#ff6b6b',
                            backgroundColor: 'rgba(255, 107, 107, 0.1)',
                            fill: true,
                            tension: 0.4
                        }]
                    },
                    options: {
                        responsive: true,
                        scales: {
                            y: { title: { display: true, text: 'Darker ->', color: '#aaa' }, ticks: { color: '#fff' } },
                            x: { ticks: { color: '#fff' } }
                        }
                    }
                });
            }, 500);

        } catch (e) {
            console.error(e);
            window.SystemBus.emit('system:message', "❌ History Query Failed.");
        }
    }

    // --- TOOL 3: PHYSICS-BASED ENERGY CALCULATOR (Real Data from /api/analyze-energy) ---
    async calculateEnergyWaste() {
        const geometry = this.getAnalysisGeometry();
        if (!geometry) { 
            window.SystemBus.emit('system:message', "⚠️ Select a region first."); 
            return; 
        }
        
        window.SystemBus.emit('system:message', "⚡ Integrating upward radiance flux...");

        try {
            // CALL BACKEND API
            const response = await fetch('/api/analyze-energy', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ geometry })
            });

            if (!response.ok) throw new Error("Calculation failed");
            const stats = await response.json();

            const content = `
                <div class="text-center">
                    <h5 class="text-warning">Physics-Based Model</h5>
                    <div class="row mt-3 text-start">
                        <div class="col-6"><small class="text-muted">Avg SQM</small><br><strong>${stats.sqm}</strong></div>
                        <div class="col-6"><small class="text-muted">Area</small><br><strong>${stats.area_km2} km²</strong></div>
                    </div>
                    <hr class="border-secondary">
                    <h3 class="mb-0 text-white">${parseInt(stats.annual_kwh).toLocaleString()} kWh</h3>
                    <p class="text-muted small">Estimated Wasted Energy (Upward Flux)</p>
                    <h4 class="text-danger">$${parseInt(stats.annual_cost).toLocaleString()}</h4>
                    <div class="alert alert-dark mt-2 p-1 text-start">
                        <small><strong>Luminance:</strong> ${stats.luminance} cd/m²<br>Formula: L = 10.8e4 * 10^(-0.4 * SQM)</small>
                    </div>
                </div>
            `;
            window.SystemBus.emit('ui:show_modal', { title: "⚡ Energy & Cost Estimator", content: content });

        } catch (e) {
            console.error(e);
            window.SystemBus.emit('system:message', "❌ Calculation Error.");
        }
    }

    // --- TOOL 4: DATA EXPORT ---
    exportData() {
        const selection = this.webGIS.getSelection();
        if (!selection) {
            window.SystemBus.emit('system:message', "⚠️ Nothing to export.");
            return;
        }
        
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(selection.geoJSON));
        const node = document.createElement('a');
        node.setAttribute("href", dataStr);
        node.setAttribute("download", "nocturna_analysis_data.geojson");
        document.body.appendChild(node);
        node.click();
        node.remove();
        
        window.SystemBus.emit('system:message', "✅ GeoJSON downloaded successfully.");
    }
}

window.ScientificMode = ScientificMode;