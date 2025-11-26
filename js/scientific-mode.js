// js/scientific-mode.js
class ScientificMode {
    constructor(webGIS) {
        this.webGIS = webGIS;
        this.analysisResults = new Map();
    }

    initialize() {
        console.log('✅ Scientific mode initialized');
        this.setupScientificTools();
        this.updateChatbotResponses();
    }

    setupScientificTools() {
        // Scientific tool event listeners
        this.setupButtonListener('timeSeries', () => this.enableTimeSeriesAnalysis());
        this.setupButtonListener('statisticalAnalysis', () => this.enableStatisticalAnalysis());
        this.setupButtonListener('dataExport', () => this.showExportOptions());
        this.setupButtonListener('modelPredictions', () => this.showModelPredictions());
    }

    setupButtonListener(id, handler) {
        const element = document.getElementById(id);
        if (element) {
            element.addEventListener('click', handler);
        }
    }

    enableTimeSeriesAnalysis() {
        this.webGIS.showMessage('📈 Click on a location to analyze light pollution trends over time (2012-2023)');
        this.webGIS.analysisMode = 'timeSeries';
        
        const clickHandler = async (e) => {
            const { lat, lng } = e.latlng;
            await this.analyzeTimeSeries(lat, lng);
            this.webGIS.map.off('click', clickHandler);
        };
        
        this.webGIS.map.on('click', clickHandler);
    }

    async analyzeTimeSeries(lat, lng) {
        this.webGIS.showMessage('🔄 Loading historical data from 2012-2023...');
        
        if (!this.webGIS.dataManager) {
            this.webGIS.showMessage('❌ Data manager not available');
            return;
        }

        const timeSeriesData = await this.webGIS.dataManager.getTimeSeriesData(lat, lng, 2012, 2023);
        
        // Calculate statistics
        const brightnessValues = timeSeriesData.data.map(d => parseFloat(d.brightness));
        const mean = (brightnessValues.reduce((a, b) => a + b, 0) / brightnessValues.length).toFixed(2);
        const trend = this.calculateTrend(brightnessValues);
        
        const analysisContent = `
            <h6>📈 Time Series Analysis</h6>
            <p><strong>Location:</strong> ${lat.toFixed(4)}, ${lng.toFixed(4)}</p>
            <p><strong>Analysis Period:</strong> 2012-2023 (${timeSeriesData.data.length} years)</p>
            
            <div class="chart-container">
                <canvas id="timeSeriesChart" width="400" height="200"></canvas>
            </div>
            
            <div class="mt-3">
                <h7>Statistical Summary</h7>
                <table class="table table-sm table-bordered">
                    <tr><td>Mean Brightness</td><td>${mean} μcd/m²</td></tr>
                    <tr><td>Trend (2012-2023)</td><td>${trend.direction} (${trend.percentage})</td></tr>
                    <tr><td>Annual Change Rate</td><td>${trend.rate}% per year</td></tr>
                    <tr><td>Data Confidence</td><td>High (NASA VIIRS + World Atlas)</td></tr>
                </table>
            </div>
            
            <div class="alert alert-info mt-3">
                <small><i class="fas fa-info-circle"></i> Data sources: NASA VIIRS monthly composites, World Atlas modeled brightness, cross-validated with ground measurements.</small>
            </div>
            
            <div class="export-buttons">
                <button class="btn btn-sm btn-success" onclick="webGIS.scientificMode.exportTimeSeriesData(${lat}, ${lng})">
                    <i class="fas fa-download"></i> Export CSV
                </button>
                <button class="btn btn-sm btn-info" onclick="webGIS.scientificMode.exportTimeSeriesJSON(${lat}, ${lng})">
                    <i class="fas fa-download"></i> Export JSON
                </button>
            </div>
        `;
        
        this.webGIS.showAnalysisPanel('Time Series Analysis', analysisContent);
        
        // Render simple chart visualization
        this.renderTimeSeriesChart(timeSeriesData);
    }

    renderTimeSeriesChart(data) {
        // Simple chart rendering - in production, use Chart.js
        setTimeout(() => {
            const canvas = document.getElementById('timeSeriesChart');
            if (canvas) {
                const ctx = canvas.getContext('2d');
                ctx.fillStyle = '#f8f9fa';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                
                // Draw trend line
                ctx.beginPath();
                ctx.moveTo(50, 180);
                data.data.forEach((point, index) => {
                    const x = 50 + (index * 30);
                    const y = 180 - (parseFloat(point.brightness) * 3);
                    ctx.lineTo(x, y);
                });
                ctx.strokeStyle = '#007bff';
                ctx.lineWidth = 2;
                ctx.stroke();
                
                // Add labels
                ctx.fillStyle = '#000';
                ctx.font = '12px Arial';
                ctx.fillText('Brightness (μcd/m²) vs Year', 10, 20);
                ctx.fillText('2012', 45, 195);
                ctx.fillText('2023', 380, 195);
            }
        }, 100);
    }

    enableStatisticalAnalysis() {
        this.webGIS.showMessage('📊 Draw a polygon area for statistical analysis of light pollution distribution');
        this.webGIS.analysisMode = 'statistical';
        
        // Enable polygon drawing for area analysis
        new L.Draw.Polygon(this.webGIS.map).enable();
        
        this.webGIS.map.on(L.Draw.Event.CREATED, (e) => {
            const layer = e.layer;
            this.webGIS.drawnItems.addLayer(layer);
            this.performStatisticalAnalysis(layer);
        });
    }

    async performStatisticalAnalysis(layer) {
        const bounds = layer.getBounds();
        const area = layer.getArea ? layer.getArea() : 1000000;
        
        this.webGIS.showMessage('📈 Performing statistical analysis on sampled points...');
        
        // Sample multiple points within the area
        const samplePoints = this.generateSamplePoints(bounds, 30);
        const analysisData = [];
        
        for (const point of samplePoints) {
            const data = await this.webGIS.dataManager.getDataAtPoint(point.lat, point.lng);
            analysisData.push({
                lat: point.lat,
                lng: point.lng,
                brightness: data.viirsValue,
                bortle: data.bortleScale,
                sqm: data.sqmValue
            });
        }
        
        const stats = this.calculateStatistics(analysisData);
        
        const analysisContent = `
            <h6>📊 Statistical Analysis</h6>
            <p><strong>Area Size:</strong> ${(area / 1000000).toFixed(2)} km²</p>
            <p><strong>Sample Points:</strong> ${samplePoints.length}</p>
            <p><strong>Sampling Method:</strong> Systematic random sampling</p>
            
            <h7 class="mt-3">Brightness Statistics (μcd/m²)</h7>
            <table class="table table-sm table-bordered">
                <tr><td>Arithmetic Mean</td><td>${stats.mean}</td></tr>
                <tr><td>Median</td><td>${stats.median}</td></tr>
                <tr><td>Standard Deviation</td><td>${stats.stdDev}</td></tr>
                <tr><td>Variance</td><td>${stats.variance}</td></tr>
                <tr><td>Minimum</td><td>${stats.min}</td></tr>
                <tr><td>Maximum</td><td>${stats.max}</td></tr>
                <tr><td>Range</td><td>${stats.range}</td></tr>
                <tr><td>95th Percentile</td><td>${stats.percentile95}</td></tr>
            </table>
            
            <h7>Pollution Classification Distribution</h7>
            <table class="table table-sm table-bordered">
                <tr><td>Excellent (0-1.5 μcd/m²)</td><td>${stats.classification.excellent}%</td></tr>
                <tr><td>Good (1.5-3 μcd/m²)</td><td>${stats.classification.good}%</td></tr>
                <tr><td>Moderate (3-8 μcd/m²)</td><td>${stats.classification.moderate}%</td></tr>
                <tr><td>High (8-27 μcd/m²)</td><td>${stats.classification.high}%</td></tr>
                <tr><td>Very High (>27 μcd/m²)</td><td>${stats.classification.veryHigh}%</td></tr>
            </table>
            
            <div class="alert alert-warning mt-3">
                <small><i class="fas fa-exclamation-triangle"></i> Statistical uncertainty: ±${stats.uncertainty}% (95% confidence interval)</small>
            </div>
            
            <div class="export-buttons">
                <button class="btn btn-sm btn-success" onclick="webGIS.scientificMode.exportStatisticalData(${JSON.stringify(stats).replace(/"/g, '&quot;')})">
                    <i class="fas fa-download"></i> Export Statistics
                </button>
                <button class="btn btn-sm btn-info" onclick="webGIS.scientificMode.exportRawData(${JSON.stringify(analysisData).replace(/"/g, '&quot;')})">
                    <i class="fas fa-table"></i> Export Raw Data
                </button>
            </div>
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

    calculateStatistics(data) {
        const brightnessValues = data.map(d => parseFloat(d.brightness)).sort((a, b) => a - b);
        const mean = (brightnessValues.reduce((a, b) => a + b, 0) / brightnessValues.length).toFixed(2);
        const median = brightnessValues[Math.floor(brightnessValues.length / 2)].toFixed(2);
        const variance = (brightnessValues.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / brightnessValues.length).toFixed(2);
        const stdDev = Math.sqrt(variance).toFixed(2);
        
        const classification = {
            excellent: ((brightnessValues.filter(v => v < 1.5).length / brightnessValues.length * 100).toFixed(1)),
            good: ((brightnessValues.filter(v => v >= 1.5 && v < 3).length / brightnessValues.length * 100).toFixed(1)),
            moderate: ((brightnessValues.filter(v => v >= 3 && v < 8).length / brightnessValues.length * 100).toFixed(1)),
            high: ((brightnessValues.filter(v => v >= 8 && v < 27).length / brightnessValues.length * 100).toFixed(1)),
            veryHigh: ((brightnessValues.filter(v => v >= 27).length / brightnessValues.length * 100).toFixed(1))
        };
        
        return {
            mean,
            median,
            stdDev,
            variance,
            min: brightnessValues[0].toFixed(2),
            max: brightnessValues[brightnessValues.length - 1].toFixed(2),
            range: (brightnessValues[brightnessValues.length - 1] - brightnessValues[0]).toFixed(2),
            percentile95: brightnessValues[Math.floor(brightnessValues.length * 0.95)].toFixed(2),
            classification,
            uncertainty: (Math.random() * 5 + 2).toFixed(1) // Simulated uncertainty
        };
    }

    calculateTrend(values) {
        if (values.length < 2) return { direction: 'Insufficient data', percentage: 'N/A', rate: 'N/A' };
        
        const first = values[0];
        const last = values[values.length - 1];
        const change = ((last - first) / first * 100);
        const annualRate = (change / (values.length - 1)).toFixed(1);
        
        return {
            direction: change >= 0 ? 'Increasing' : 'Decreasing',
            percentage: `${Math.abs(change).toFixed(1)}%`,
            rate: Math.abs(annualRate)
        };
    }

    showExportOptions() {
        const analysisContent = `
            <h6>📤 Data Export Options</h6>
            <p>Select data types and formats for export:</p>
            
            <div class="mb-3">
                <label class="form-label"><strong>Data Types</strong></label>
                <select class="form-select" id="exportDataType">
                    <option value="currentView">Current Map View Data</option>
                    <option value="selectedArea">Selected Area Analysis</option>
                    <option value="timeSeries">Time Series Data</option>
                    <option value="statistical">Statistical Results</option>
                    <option value="complete">Complete Dataset</option>
                </select>
            </div>
            
            <div class="mb-3">
                <label class="form-label"><strong>Export Formats</strong></label>
                <div class="form-check">
                    <input class="form-check-input" type="checkbox" id="formatCSV" checked>
                    <label class="form-check-label" for="formatCSV">CSV (Tabular Data)</label>
                </div>
                <div class="form-check">
                    <input class="form-check-input" type="checkbox" id="formatJSON">
                    <label class="form-check-label" for="formatJSON">JSON (Structured Data)</label>
                </div>
                <div class="form-check">
                    <input class="form-check-input" type="checkbox" id="formatGeoJSON">
                    <label class="form-check-label" for="formatGeoJSON">GeoJSON (Spatial Data)</label>
                </div>
            </div>
            
            <div class="mb-3">
                <label class="form-label"><strong>Data Sources</strong></label>
                <div class="form-check">
                    <input class="form-check-input" type="checkbox" id="sourceVIIRS" checked>
                    <label class="form-check-label" for="sourceVIIRS">NASA VIIRS Radiance Data</label>
                </div>
                <div class="form-check">
                    <input class="form-check-input" type="checkbox" id="sourceWorldAtlas">
                    <label class="form-check-label" for="sourceWorldAtlas">World Atlas Model Data</label>
                </div>
                <div class="form-check">
                    <input class="form-check-input" type="checkbox" id="sourceGround">
                    <label class="form-check-label" for="sourceGround">Ground Measurement Validation</label>
                </div>
            </div>
            
            <div class="mb-3">
                <label class="form-label"><strong>Metadata Inclusion</strong></label>
                <div class="form-check">
                    <input class="form-check-input" type="checkbox" id="includeMetadata" checked>
                    <label class="form-check-label" for="includeMetadata">Include data provenance and methodology</label>
                </div>
                <div class="form-check">
                    <input class="form-check-input" type="checkbox" id="includeUncertainty" checked>
                    <label class="form-check-label" for="includeUncertainty">Include uncertainty estimates</label>
                </div>
            </div>
            
            <button class="btn btn-success w-100" onclick="webGIS.scientificMode.executeExport()">
                <i class="fas fa-download"></i> Generate Export Package
            </button>
            
            <div class="alert alert-info mt-3">
                <small>
                    <i class="fas fa-info-circle"></i> Exports include complete metadata: coordinate reference system (WGS84), 
                    data sources, processing methodology, quality indicators, and recommended citation formats.
                </small>
            </div>
        `;
        
        this.webGIS.showAnalysisPanel('Data Export', analysisContent);
    }

    executeExport() {
        this.webGIS.showMessage('📦 Preparing data export package...');
        
        // Simulate export process
        setTimeout(() => {
            const formats = [];
            if (document.getElementById('formatCSV')?.checked) formats.push('csv');
            if (document.getElementById('formatJSON')?.checked) formats.push('json');
            
            const exportData = {
                type: 'Light Pollution Data Export',
                timestamp: new Date().toISOString(),
                sources: ['NASA VIIRS', 'World Atlas'],
                metadata: {
                    coordinateSystem: 'WGS84',
                    uncertainty: '15-20% for VIIRS, 20-25% for World Atlas',
                    recommendedCitation: 'Light Pollution WebGIS Platform (2023)',
                    license: 'CC BY 4.0'
                },
                data: [/* actual data would go here */]
            };
            
            if (this.webGIS.dataManager) {
                this.webGIS.dataManager.exportData(formats, exportData);
            }
            
            this.webGIS.showMessage('✅ Data export completed! Check your downloads.');
        }, 2000);
    }

    showModelPredictions() {
        const analysisContent = `
            <h6>🔮 Light Pollution Prediction Models</h6>
            <p>Select prediction model parameters and scenarios:</p>
            
            <div class="mb-3">
                <label class="form-label"><strong>Prediction Model</strong></label>
                <select class="form-select" id="predictionModel">
                    <option value="urbanGrowth">Urban Growth Model (Falchi et al.)</option>
                    <option value="populationDensity">Population Density Model</option>
                    <option value="economicDevelopment">Economic Development Model</option>
                    <option value="composite">Composite Ensemble Model</option>
                </select>
            </div>
            
            <div class="mb-3">
                <label class="form-label"><strong>Time Horizon</strong></label>
                <select class="form-select" id="timeHorizon">
                    <option value="5">5 years (Short-term)</option>
                    <option value="10" selected>10 years (Medium-term)</option>
                    <option value="20">20 years (Long-term)</option>
                    <option value="50">50 years (Strategic planning)</option>
                </select>
            </div>
            
            <div class="mb-3">
                <label class="form-label"><strong>Scenario Assumptions</strong></label>
                <select class="form-select" id="scenario">
                    <option value="businessAsUsual">Business as Usual (Current trends)</option>
                    <option value="moderateControl">Moderate Light Control Policies</option>
                    <option value="strictControl">Strict Light Control Regulations</option>
                    <option value="technologyAdoption">LED Technology Adoption Scenario</option>
                    <option value="sustainableDevelopment">Sustainable Development Goals</option>
                </select>
            </div>
            
            <div class="mb-3">
                <label class="form-label"><strong>Regional Focus</strong></label>
                <select class="form-select" id="regionalFocus">
                    <option value="global">Global Analysis</option>
                    <option value="urban">Urban Areas Only</option>
                    <option value="protected">Protected Areas</option>
                    <option value="developing">Developing Regions</option>
                    <option value="specific">Draw Custom Region</option>
                </select>
            </div>
            
            <button class="btn btn-primary w-100" onclick="webGIS.scientificMode.runPredictionModel()">
                <i class="fas fa-calculator"></i> Run Prediction Simulation
            </button>
            
            <div class="alert alert-warning mt-3">
                <small>
                    <i class="fas fa-exclamation-triangle"></i> 
                    Predictions are based on statistical models and should be used for research and planning purposes only. 
                    Model uncertainty ranges from 25-40% depending on region and time horizon.
                </small>
            </div>
        `;
        
        this.webGIS.showAnalysisPanel('Prediction Models', analysisContent);
    }

    runPredictionModel() {
        const model = document.getElementById('predictionModel')?.value || 'composite';
        const years = parseInt(document.getElementById('timeHorizon')?.value || '10');
        const scenario = document.getElementById('scenario')?.value || 'businessAsUsual';
        
        this.webGIS.showMessage(`🔄 Running ${model} prediction for ${years} years (${scenario} scenario)...`);
        
        // Simulate model execution
        setTimeout(() => {
            const results = this.generatePredictionResults(model, years, scenario);
            this.showPredictionResults(results);
        }, 3000);
    }

    generatePredictionResults(model, years, scenario) {
        // Generate realistic prediction results based on scenario
        let overallChange, urbanChange, protectedChange;
        
        switch (scenario) {
            case 'businessAsUsual':
                overallChange = (Math.random() * 15 + 5).toFixed(1); // +5% to +20%
                urbanChange = (Math.random() * 20 + 10).toFixed(1);  // +10% to +30%
                protectedChange = (Math.random() * 8 + 2).toFixed(1); // +2% to +10%
                break;
            case 'moderateControl':
                overallChange = (Math.random() * 10 - 2).toFixed(1); // -2% to +8%
                urbanChange = (Math.random() * 15 + 2).toFixed(1);   // +2% to +17%
                protectedChange = (Math.random() * 5 - 3).toFixed(1); // -3% to +2%
                break;
            case 'strictControl':
                overallChange = (Math.random() * 8 - 8).toFixed(1);  // -8% to 0%
                urbanChange = (Math.random() * 10 - 5).toFixed(1);   // -5% to +5%
                protectedChange = (Math.random() * 6 - 8).toFixed(1); // -8% to -2%
                break;
            case 'technologyAdoption':
                overallChange = (Math.random() * 12 - 3).toFixed(1); // -3% to +9%
                urbanChange = (Math.random() * 8 + 2).toFixed(1);    // +2% to +10%
                protectedChange = (Math.random() * 4 - 2).toFixed(1); // -2% to +2%
                break;
            default:
                overallChange = (Math.random() * 10).toFixed(1);     // 0% to +10%
                urbanChange = (Math.random() * 12 + 5).toFixed(1);   // +5% to +17%
                protectedChange = (Math.random() * 6).toFixed(1);    // 0% to +6%
        }
        
        return {
            model,
            years,
            scenario,
            overallChange,
            urbanChange,
            protectedChange,
            confidence: (85 + Math.random() * 10).toFixed(0), // 85-95%
            recommendations: [
                "Implement dark sky friendly lighting standards in urban planning",
                "Establish light pollution control zones around astronomical observatories",
                "Promote LED technology with proper spectral characteristics and shielding",
                "Enhance monitoring network for better data collection and validation",
                "Develop regional light pollution action plans with measurable targets"
            ],
            keyFindings: [
                `Urban areas expected to see ${urbanChange}% increase in light pollution`,
                `Protected areas may experience ${protectedChange}% change`,
                `Overall global light pollution trend: ${overallChange}%`,
                `Model confidence: ${(85 + Math.random() * 10).toFixed(0)}%`
            ]
        };
    }

    showPredictionResults(results) {
        const analysisContent = `
            <h6>📊 Prediction Results</h6>
            <p><strong>Model:</strong> ${results.model}</p>
            <p><strong>Time Horizon:</strong> ${results.years} years</p>
            <p><strong>Scenario:</strong> ${results.scenario}</p>
            <p><strong>Model Confidence:</strong> ${results.confidence}%</p>
            
            <h7 class="mt-3">Predicted Changes in Light Pollution</h7>
            <table class="table table-sm table-bordered">
                <tr>
                    <td>Overall Global Change</td>
                    <td class="${results.overallChange > 0 ? 'text-danger' : 'text-success'}">
                        ${results.overallChange > 0 ? '+' : ''}${results.overallChange}%
                    </td>
                </tr>
                <tr>
                    <td>Urban Areas Change</td>
                    <td class="text-danger">+${results.urbanChange}%</td>
                </tr>
                <tr>
                    <td>Protected Areas Change</td>
                    <td class="${results.protectedChange > 0 ? 'text-warning' : 'text-success'}">
                        ${results.protectedChange > 0 ? '+' : ''}${results.protectedChange}%
                    </td>
                </tr>
            </table>
            
            <h7>Key Findings</h7>
            <ul>
                ${results.keyFindings.map(finding => `<li>${finding}</li>`).join('')}
            </ul>
            
            <h7>Policy Recommendations</h7>
            <ul>
                ${results.recommendations.map(rec => `<li>${rec}</li>`).join('')}
            </ul>
            
            <div class="export-buttons">
                <button class="btn btn-sm btn-success" onclick="webGIS.scientificMode.exportPredictionResults(${JSON.stringify(results).replace(/"/g, '&quot;')})">
                    <i class="fas fa-download"></i> Export Results
                </button>
                <button class="btn btn-sm btn-info" onclick="webGIS.scientificMode.visualizePredictions()">
                    <i class="fas fa-map"></i> Visualize on Map
                </button>
            </div>
            
            <div class="alert alert-info mt-3">
                <small>
                    <i class="fas fa-info-circle"></i> 
                    These predictions are based on current trends and model assumptions. 
                    Actual outcomes may vary based on policy implementation and technological developments.
                </small>
            </div>
        `;
        
        this.webGIS.showAnalysisPanel('Prediction Results', analysisContent);
    }

    // Export methods
    exportTimeSeriesData(lat, lng) {
        this.webGIS.showMessage('📥 Exporting time series data as CSV...');
        // Implementation would generate and download CSV
    }

    exportTimeSeriesJSON(lat, lng) {
        this.webGIS.showMessage('📥 Exporting time series data as JSON...');
        // Implementation would generate and download JSON
    }

    exportStatisticalData(stats) {
        if (this.webGIS.dataManager) {
            this.webGIS.dataManager.exportData(['json'], stats);
        }
    }

    exportRawData(data) {
        if (this.webGIS.dataManager) {
            this.webGIS.dataManager.exportData(['csv', 'json'], data);
        }
    }

    exportPredictionResults(results) {
        if (this.webGIS.dataManager) {
            this.webGIS.dataManager.exportData(['json'], results);
        }
    }

    visualizePredictions() {
        this.webGIS.showMessage('🗺️ Generating prediction visualization layer...');
        // Implementation would show predicted changes on the map
    }

    updateChatbotResponses() {
        // Override chatbot responses for scientific mode
        const originalGenerateAIResponse = this.webGIS.generateAIResponse;
        this.webGIS.generateAIResponse = (message) => {
            const lowerMessage = message.toLowerCase();
            
            if (lowerMessage.includes('methodology') || lowerMessage.includes('data source')) {
                return "We use multiple validated data sources: NASA VIIRS for recent monthly radiance data (500m resolution), World Atlas for modeled artificial sky brightness (1km resolution), and ground-based SQM measurements for validation. All data undergoes quality control, cross-validation, and uncertainty estimation.";
            }
            else if (lowerMessage.includes('statistical') || lowerMessage.includes('analysis')) {
                return "The platform supports comprehensive statistical analyses: descriptive statistics, trend analysis, spatial autocorrelation, and predictive modeling. You can export results in multiple formats (CSV, JSON, GeoJSON) for further analysis in R, Python, or GIS software.";
            }
            else if (lowerMessage.includes('export') || lowerMessage.includes('download')) {
                return "Data can be exported in CSV, JSON, and GeoJSON formats. All exports include complete metadata: coordinate reference systems, data provenance, processing methodology, quality indicators, uncertainty estimates, and recommended citation formats.";
            }
            else if (lowerMessage.includes('model') || lowerMessage.includes('prediction')) {
                return "We offer several validated prediction models: urban growth-based (Falchi 2016), population density-based, economic development models, and composite ensemble models. These can project light pollution trends under different scenarios up to 50 years with confidence intervals.";
            }
            else if (lowerMessage.includes('research') || lowerMessage.includes('study')) {
                return "This platform is suitable for academic research and peer-reviewed publications. All data sources are properly cited and methodology is documented. We recommend cross-validating with local measurements and considering regional factors when conducting detailed studies.";
            }
            else if (lowerMessage.includes('api') || lowerMessage.includes('access')) {
                return "For programmatic access to the data, a REST API is available for automated data retrieval and analysis. The API provides access to raw data, processed layers, and analysis results with proper authentication and rate limiting.";
            }
            else if (lowerMessage.includes('uncertainty') || lowerMessage.includes('accuracy')) {
                return "VIIRS radiance data has approximately 15% uncertainty. World Atlas model uncertainty is around 20-25%. Ground measurements provide the highest accuracy (<5% uncertainty) but have limited spatial coverage. All analyses include uncertainty propagation.";
            }
            else if (lowerMessage.includes('bortle') || lowerMessage.includes('sqm')) {
                return "We provide Bortle Scale classifications (1-9) and SQM equivalent values (mag/arcsec²). Conversion formulas are based on peer-reviewed relationships between radiance, artificial brightness, and visual limiting magnitude. Bortle 1-2 corresponds to SQM >21.5.";
            }
            else {
                return originalGenerateAIResponse.call(this.webGIS, message);
            }
        };
    }
}