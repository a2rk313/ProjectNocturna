// js/scientific-mode.js
class ScientificMode {
    constructor(webGIS) {
        this.webGIS = webGIS;
    }

    initialize() {
        this.setupTools();
        this.addResearchToggle();
        window.SystemBus.emit('system:message', "🔬 Scientific Mode: Physics engine active.");
    }

    setupTools() {
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
        bind('statisticalAnalysis', () => this.performStats());
        bind('dataExport', () => this.exportData());
    }

    addResearchToggle() {
        const container = document.getElementById('scientificTools');
        if (!document.getElementById('researchToggle')) {
            const toggleDiv = document.createElement('div');
            toggleDiv.className = 'form-check form-switch text-light mt-2 p-2 rounded bg-dark border border-secondary';
            toggleDiv.innerHTML = `<input class="form-check-input" type="checkbox" id="researchToggle"><label class="form-check-label" for="researchToggle"><i class="fas fa-filter text-info me-1"></i> Research Grade</label>`;
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

    // --- REAL TIME SERIES (Chart.js) ---
    async analyzeTimeSeries() {
        const selection = this.webGIS.getSelection();
        if (!selection) {
             window.SystemBus.emit('system:message', "⚠️ Select a location first.");
             alert("Please draw a region or select a location on the map first.");
             return;
        }

        const center = selection.center;
        window.SystemBus.emit('system:message', "📈 Fetching historical data...");

        try {
            const response = await fetch(`/api/history?lat=${center.lat}&lng=${center.lng}`);
            const data = await response.json();

            if (data.length < 2) {
                window.SystemBus.emit('system:message', "⚠️ Not enough historical data here.");
                return;
            }

            // Prepare Data
            const labels = data.map(d => new Date(d.date_observed).getFullYear());
            const values = data.map(d => d.sqm);

            // Create Canvas
            const canvasId = 'chart_' + Date.now();
            const content = `
                <div class="text-center">
                    <h6>Historical Trend (5km Radius)</h6>
                    <canvas id="${canvasId}" width="400" height="200"></canvas>
                </div>
            `;

            window.SystemBus.emit('ui:show_modal', { title: "📈 Light Pollution Trend", content: content });

            // Render Chart
            setTimeout(() => {
                const ctx = document.getElementById(canvasId).getContext('2d');
                new Chart(ctx, {
                    type: 'line',
                    data: {
                        labels: labels,
                        datasets: [{
                            label: 'Sky Brightness (SQM)',
                            data: values,
                            borderColor: '#00ffff',
                            backgroundColor: 'rgba(0, 255, 255, 0.1)',
                            fill: true,
                            tension: 0.4
                        }]
                    },
                    options: {
                        responsive: true,
                        plugins: { legend: { labels: { color: 'white' } } },
                        scales: {
                            y: { 
                                reverse: true, // Higher SQM = Darker
                                title: { display: true, text: 'Darkness (Mag/arcsec²)', color: '#aaa' },
                                ticks: { color: '#fff' }
                            },
                            x: { ticks: { color: '#fff' } }
                        }
                    }
                });
            }, 500);

        } catch (e) {
            console.error(e);
            window.SystemBus.emit('system:message', "❌ Trend analysis failed.");
        }
    }

    // --- PHYSICS-BASED ENERGY CALCULATOR ---
    async calculateEnergyWaste() {
        const geometry = this.getAnalysisGeometry();
        if (!geometry) {
             window.SystemBus.emit('system:message', "⚠️ Select a region first.");
             alert("Please draw a region on the map first to analyze energy.");
             return;
        }
        
        window.SystemBus.emit('system:message', "⚡ Calculating radiance flux...");

        try {
            const response = await fetch('/api/analyze-energy', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ geometry })
            });

            const stats = await response.json();

            const content = `
                <div class="text-center">
                    <h5 class="text-warning">Physics-Based Analysis</h5>
                    <div class="row mt-3 text-start">
                        <div class="col-6"><small class="text-muted">Avg SQM</small><br><strong>${stats.sqm}</strong></div>
                        <div class="col-6"><small class="text-muted">Luminance</small><br><strong>${stats.luminance} cd/m²</strong></div>
                    </div>
                    <hr class="border-secondary">
                    <h3 class="mb-0">${stats.annual_kwh.toLocaleString()} kWh</h3>
                    <p class="text-muted small">Est. Wasted Upward Energy / Year</p>
                    <h4 class="text-danger">$${stats.annual_cost.toLocaleString()}</h4>
                    <small class="text-light opacity-50">Area: ${stats.area_km2} km²</small>
                </div>
            `;
            window.SystemBus.emit('ui:show_modal', { title: "⚡ Energy Waste Model", content: content });

        } catch (e) {
            console.error(e);
            window.SystemBus.emit('system:message', "❌ Calculation failed.");
        }
    }

    // --- ENHANCED STATS ---
    async performStats() {
        const geometry = this.getAnalysisGeometry();
        if (!geometry) {
             window.SystemBus.emit('system:message', "⚠️ Select a region first.");
             alert("Please draw a region on the map first to analyze statistics.");
             return;
        }

        const researchMode = document.getElementById('researchToggle')?.checked || false;
        window.SystemBus.emit('system:message', `🔄 Calculating stats...`);

        try {
            // Fetch regular stats
            const response = await fetch('/api/stats', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ geometry, researchMode }) 
            });
            
            const stats = await response.json();
            
            // Also fetch VIIRS stats
            const viirsStats = await this.webGIS.dataManager.fetchVIIRSStats(geometry);
            
            let viirsContent = '';
            if (viirsStats && viirsStats.avg_radiance !== undefined) {
                viirsContent = `
                    <div class="mt-3 pt-3 border-top">
                        <h6 class="text-warning">VIIRS Nighttime Lights Data</h6>
                        <table class="table table-sm table-dark table-bordered">
                            <tr><td>Avg Radiance:</td><td><strong>${viirsStats.avg_radiance ? viirsStats.avg_radiance.toFixed(2) : 'N/A'}</strong></td></tr>
                            <tr><td>Tiles Count:</td><td>${viirsStats.tile_count || 0}</td></tr>
                            <tr><td>Date Range:</td><td>${viirsStats.min_date || 'N/A'} to ${viirsStats.max_date || 'N/A'}</td></tr>
                        </table>
                    </div>
                `;
            }
            
            const content = `
                <div class="text-center">
                    <h6>${researchMode ? 'Research Grade' : 'Standard'} Analysis</h6>
                    <div class="${researchMode ? 'alert alert-info' : 'alert alert-secondary'} py-1 mb-2">
                        <small>${researchMode ? 'Filtered for High Quality Data' : 'All Data Sources Included'}</small>
                    </div>
                    <table class="table table-sm table-dark table-bordered">
                        <tr><td>Avg Brightness:</td><td><strong>${stats.avg_brightness || 'N/A'}</strong> mag/arcsec²</td></tr>
                        <tr><td>Avg Data Quality:</td><td><span class="text-${stats.avg_quality > 80 ? 'success' : 'warning'}">${stats.avg_quality || 0}/100</span></td></tr>
                        <tr><td>Sample Size:</td><td>${stats.sample_size} stations</td></tr>
                    </table>
                    ${viirsContent}
                </div>
            `;
            window.SystemBus.emit('ui:show_modal', { title: "📊 Statistics", content: content });

        } catch (error) {
            window.SystemBus.emit('system:message', "❌ Analysis failed.");
        }
    }

    exportData() {
        const selection = this.webGIS.getSelection();
        if (!selection) return;
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(selection.geoJSON));
        const node = document.createElement('a');
        node.setAttribute("href", dataStr);
        node.setAttribute("download", "nocturna_data.geojson");
        document.body.appendChild(node);
        node.click();
        node.remove();
        window.SystemBus.emit('system:message', "✅ Data exported.");
    }
}
window.ScientificMode = ScientificMode;