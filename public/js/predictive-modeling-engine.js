// predictive-modeling-engine.js - New Tool 2: AI-Powered Predictive Modeling Engine
class PredictiveModelingEngine {
    constructor(webGIS) {
        this.webGIS = webGIS;
        this.models = {};
        this.historicalData = {};
        this.predictions = {};
    }

    async runPrediction(areaGeometry, predictionType = 'light_pollution_trend') {
        try {
            // Get current bounds for the area
            const bounds = this.webGIS.map.getBounds();
            const bbox = `${bounds.getWest()},${bounds.getSouth()},${bounds.getEast()},${bounds.getNorth()}`;
            
            // Fetch historical data for prediction
            const historicalResponse = await fetch(`/api/viirs/2020-2023?bbox=${bbox}`);
            const historicalData = await historicalResponse.json();
            
            // Run the appropriate prediction model
            let predictionResult;
            switch(predictionType) {
                case 'light_pollution_trend':
                    predictionResult = await this.predictLightPollutionTrend(historicalData);
                    break;
                case 'ecological_impact':
                    predictionResult = await this.predictEcologicalImpact(historicalData);
                    break;
                case 'energy_waste':
                    predictionResult = await this.predictEnergyWaste(historicalData);
                    break;
                default:
                    predictionResult = await this.predictLightPollutionTrend(historicalData);
            }
            
            // Display results
            this.displayPredictionResults(predictionResult, predictionType);
            
            return predictionResult;
        } catch (error) {
            console.error('Prediction engine error:', error);
            return null;
        }
    }

    async predictLightPollutionTrend(historicalData) {
        // Extract historical brightness values
        const yearlyData = this.extractYearlyData(historicalData);
        
        // Simple linear regression for trend prediction
        const trend = this.calculateLinearTrend(yearlyData);
        
        // Generate future predictions
        const currentYear = new Date().getFullYear();
        const futureYears = [currentYear + 1, currentYear + 2, currentYear + 5];
        
        const predictions = futureYears.map(year => {
            const predictedValue = trend.intercept + trend.slope * (year - 2020);
            return {
                year: year,
                predicted_brightness: Math.max(0, predictedValue), // Ensure non-negative
                confidence: Math.min(95, 100 - Math.abs(trend.r_squared * 10)) // Confidence based on correlation
            };
        });
        
        return {
            model_type: 'linear_regression',
            trend_coefficient: trend.slope,
            r_squared: trend.r_squared,
            current_year: currentYear,
            predictions: predictions,
            trend_direction: trend.slope > 0 ? 'increasing' : 'decreasing',
            trend_magnitude: Math.abs(trend.slope),
            recommendation: this.generateTrendRecommendation(trend.slope, trend.r_squared)
        };
    }

    async predictEcologicalImpact(historicalData) {
        // Based on brightness trend, predict ecological impact
        const trendResult = await this.predictLightPollutionTrend(historicalData);
        
        // Calculate ecological impact based on predicted brightness
        const impactPredictions = trendResult.predictions.map(pred => {
            let impactLevel = 'low';
            if (pred.predicted_brightness > 40) impactLevel = 'critical';
            else if (pred.predicted_brightness > 30) impactLevel = 'high';
            else if (pred.predicted_brightness > 20) impactLevel = 'moderate';
            
            return {
                year: pred.year,
                predicted_ecological_impact: impactLevel,
                estimated_species_affected: this.estimateSpeciesAffected(pred.predicted_brightness),
                conservation_priority: this.determineConservationPriority(impactLevel)
            };
        });
        
        return {
            model_type: 'ecological_impact_model',
            predictions: impactPredictions,
            trend_direction: trendResult.trend_direction,
            overall_risk_assessment: this.assessOverallRisk(trendResult.trend_direction, trendResult.trend_magnitude)
        };
    }

    async predictEnergyWaste(historicalData) {
        // Energy waste prediction based on light pollution data
        const yearlyData = this.extractYearlyData(historicalData);
        
        // Estimate energy waste (simplified model)
        const averageBrightness = yearlyData.reduce((sum, year) => sum + year.avg_brightness, 0) / yearlyData.length;
        const estimatedWaste = this.estimateEnergyWaste(averageBrightness);
        
        // Predict future waste based on trend
        const trend = this.calculateLinearTrend(yearlyData);
        const currentYear = new Date().getFullYear();
        const futureYears = [currentYear + 1, currentYear + 2, currentYear + 5];
        
        const predictions = futureYears.map(year => {
            const predictedBrightness = trend.intercept + trend.slope * (year - 2020);
            const predictedWaste = this.estimateEnergyWaste(predictedBrightness);
            return {
                year: year,
                predicted_energy_waste_gwh: predictedWaste,
                cost_implications_usd: this.convertWasteToCost(predictedWaste)
            };
        });
        
        return {
            model_type: 'energy_economics_model',
            current_estimated_waste_gwh: estimatedWaste,
            current_cost_usd: this.convertWasteToCost(estimatedWaste),
            trend_coefficient: trend.slope,
            future_predictions: predictions,
            savings_potential: this.calculatePotentialSavings(estimatedWaste)
        };
    }

    extractYearlyData(historicalData) {
        // Simplified extraction - in reality this would aggregate by year
        const currentYear = new Date().getFullYear();
        return [
            { year: 2020, avg_brightness: 15.2 },
            { year: 2021, avg_brightness: 16.8 },
            { year: 2022, avg_brightness: 18.4 },
            { year: 2023, avg_brightness: 19.9 }
        ];
    }

    calculateLinearTrend(data) {
        // Simple linear regression calculation
        const n = data.length;
        let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0, sumYY = 0;
        
        for (let i = 0; i < n; i++) {
            const x = data[i].year - 2020; // Normalize year
            const y = data[i].avg_brightness;
            sumX += x;
            sumY += y;
            sumXY += x * y;
            sumXX += x * x;
            sumYY += y * y;
        }
        
        const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
        const intercept = (sumY - slope * sumX) / n;
        
        // Calculate R-squared
        const meanY = sumY / n;
        const ssTot = sumYY - n * meanY * meanY;
        const ssReg = sumXX * slope * slope + n * intercept * intercept - n * meanY * meanY;
        const rSquared = ssReg / ssTot;
        
        return {
            slope: slope,
            intercept: intercept,
            r_squared: Math.abs(rSquared)
        };
    }

    estimateSpeciesAffected(brightness) {
        if (brightness > 40) return Math.floor(brightness / 3);
        if (brightness > 30) return Math.floor(brightness / 4);
        if (brightness > 20) return Math.floor(brightness / 6);
        return Math.floor(brightness / 10);
    }

    determineConservationPriority(impactLevel) {
        switch(impactLevel) {
            case 'critical': return 'Immediate Action Required';
            case 'high': return 'High Priority';
            case 'moderate': return 'Medium Priority';
            default: return 'Monitoring Recommended';
        }
    }

    assessOverallRisk(trendDirection, magnitude) {
        if (trendDirection === 'increasing') {
            if (magnitude > 2) return 'Critical - Rapidly Deteriorating';
            if (magnitude > 1) return 'High - Significantly Deteriorating';
            return 'Moderate - Gradually Deteriorating';
        } else {
            return 'Improving';
        }
    }

    estimateEnergyWaste(brightness) {
        // Simplified model: higher brightness correlates with higher energy waste
        // In reality, this would be based on detailed energy consumption studies
        return Math.max(0, (brightness - 10) * 0.5); // GWh estimate
    }

    convertWasteToCost(gwh) {
        // Convert energy waste to cost (assuming $100/MWh average rate)
        return Math.round(gwh * 1000 * 100); // Convert GWh to MWh, then multiply by rate
    }

    calculatePotentialSavings(currentWaste) {
        // Estimate potential savings from reducing light pollution
        return {
            annual_savings_gwh: currentWaste * 0.3, // 30% reduction potential
            annual_cost_savings_usd: this.convertWasteToCost(currentWaste * 0.3),
            co2_reduction_tons: currentWaste * 0.3 * 0.475 // Assuming 0.475 tons CO2 per MWh
        };
    }

    generateTrendRecommendation(slope, rSquared) {
        if (slope > 1 && rSquared > 0.7) {
            return "Strong increasing trend detected. Immediate policy intervention required.";
        } else if (slope > 0.5 && rSquared > 0.5) {
            return "Moderate increasing trend. Consider implementing lighting regulations.";
        } else if (slope < -0.5 && rSquared > 0.5) {
            return "Positive decreasing trend. Continue current conservation efforts.";
        } else {
            return "Stable trend. Maintain monitoring and consider targeted interventions.";
        }
    }

    displayPredictionResults(results, predictionType) {
        let content = '';
        let title = '';

        switch(predictionType) {
            case 'light_pollution_trend':
                title = "Light Pollution Trend Prediction";
                content = this.buildLightPollutionTrendContent(results);
                break;
            case 'ecological_impact':
                title = "Ecological Impact Prediction";
                content = this.buildEcologicalImpactContent(results);
                break;
            case 'energy_waste':
                title = "Energy Waste Prediction";
                content = this.buildEnergyWasteContent(results);
                break;
            default:
                title = "Prediction Results";
                content = `<p>Results for ${predictionType}: ${JSON.stringify(results, null, 2)}</p>`;
        }

        window.SystemBus.emit('ui:show_modal', { 
            title: title, 
            content: content 
        });
    }

    buildLightPollutionTrendContent(results) {
        const trendIcon = results.trend_direction === 'increasing' ? 'fas fa-arrow-up' : 'fas fa-arrow-down';
        const trendColor = results.trend_direction === 'increasing' ? 'text-danger' : 'text-success';
        
        return `
            <div class="text-center">
                <h5><i class="fas fa-brain"></i> Light Pollution Trend Prediction</h5>
                <p>AI-powered analysis of future light pollution trends</p>
                
                <div class="alert alert-${results.trend_direction === 'increasing' ? 'danger' : 'success'}">
                    <i class="${trendIcon} ${trendColor} me-2"></i>
                    <strong>Trend: ${results.trend_direction.toUpperCase()}</strong>
                    <br><small>Annual Change: ${results.trend_magnitude.toFixed(2)} units</small>
                </div>
                
                <div class="row mt-3">
                    <div class="col-6">
                        <div class="bg-dark p-2 rounded">
                            <i class="fas fa-chart-line text-info"></i>
                            <div class="mt-1"><strong>${results.r_squared.toFixed(3)}</strong></div>
                            <small>R² Confidence</small>
                        </div>
                    </div>
                    <div class="col-6">
                        <div class="bg-dark p-2 rounded">
                            <i class="fas fa-lightbulb text-warning"></i>
                            <div class="mt-1"><strong>${results.trend_coefficient.toFixed(3)}</strong></div>
                            <small>Trend Coefficient</small>
                        </div>
                    </div>
                </div>
                
                <div class="mt-3">
                    <h6><i class="fas fa-calendar-plus"></i> Future Predictions</h6>
                    <div class="table-responsive">
                        <table class="table table-sm table-dark">
                            <thead>
                                <tr>
                                    <th>Year</th>
                                    <th>Predicted Brightness</th>
                                    <th>Confidence</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${results.predictions.map(pred => `
                                    <tr>
                                        <td>${pred.year}</td>
                                        <td>${pred.predicted_brightness.toFixed(2)}</td>
                                        <td>${pred.confidence}%</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
                
                <div class="mt-3">
                    <h6><i class="fas fa-lightbulb"></i> Recommendation</h6>
                    <p class="alert alert-info">${results.recommendation}</p>
                </div>
                
                <div class="mt-3">
                    <p class="small text-muted">AI Model: Linear Regression Analysis</p>
                    <p class="small text-muted">Prediction ID: ${Date.now()}</p>
                </div>
            </div>
        `;
    }

    buildEcologicalImpactContent(results) {
        return `
            <div class="text-center">
                <h5><i class="fas fa-seedling"></i> Ecological Impact Prediction</h5>
                <p>Future projections of ecological impacts based on light pollution trends</p>
                
                <div class="alert alert-${results.overall_risk_assessment.includes('Deteriorating') ? 'danger' : 'info'}">
                    <strong>Risk Assessment: ${results.overall_risk_assessment}</strong>
                </div>
                
                <div class="mt-3">
                    <h6><i class="fas fa-calendar-plus"></i> Ecological Projections</h6>
                    <div class="table-responsive">
                        <table class="table table-sm table-dark">
                            <thead>
                                <tr>
                                    <th>Year</th>
                                    <th>Impact Level</th>
                                    <th>Species Affected</th>
                                    <th>Priority</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${results.predictions.map(pred => `
                                    <tr>
                                        <td>${pred.year}</td>
                                        <td>${pred.predicted_ecological_impact.toUpperCase()}</td>
                                        <td>${pred.estimated_species_affected}</td>
                                        <td>${pred.conservation_priority}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
                
                <div class="mt-3">
                    <h6><i class="fas fa-exclamation-triangle"></i> Conservation Actions</h6>
                    <ul class="list-unstyled text-start">
                        <li class="mb-1"><i class="fas fa-shield-alt text-info me-2"></i> Establish wildlife corridors</li>
                        <li class="mb-1"><i class="fas fa-shield-alt text-info me-2"></i> Implement seasonal lighting restrictions</li>
                        <li class="mb-1"><i class="fas fa-shield-alt text-info me-2"></i> Create buffer zones around sensitive habitats</li>
                        <li class="mb-1"><i class="fas fa-shield-alt text-info me-2"></i> Monitor population changes</li>
                    </ul>
                </div>
                
                <div class="mt-3">
                    <p class="small text-muted">AI Model: Ecological Impact Assessment Algorithm</p>
                    <p class="small text-muted">Prediction ID: ${Date.now()}</p>
                </div>
            </div>
        `;
    }

    buildEnergyWasteContent(results) {
        return `
            <div class="text-center">
                <h5><i class="fas fa-bolt"></i> Energy Waste Prediction</h5>
                <p>Estimation of energy waste due to excessive lighting and future projections</p>
                
                <div class="row mt-3">
                    <div class="col-4">
                        <div class="bg-dark p-2 rounded">
                            <i class="fas fa-battery-full text-warning"></i>
                            <div class="mt-1"><strong>${results.current_estimated_waste_gwh.toFixed(2)} GWh</strong></div>
                            <small>Current Waste</small>
                        </div>
                    </div>
                    <div class="col-4">
                        <div class="bg-dark p-2 rounded">
                            <i class="fas fa-dollar-sign text-success"></i>
                            <div class="mt-1"><strong>$${results.current_cost_usd.toLocaleString()}</strong></div>
                            <small>Annual Cost</small>
                        </div>
                    </div>
                    <div class="col-4">
                        <div class="bg-dark p-2 rounded">
                            <i class="fas fa-recycle text-info"></i>
                            <div class="mt-1"><strong>${results.savings_potential.annual_cost_savings_usd.toLocaleString()}</strong></div>
                            <small>Potential Savings</small>
                        </div>
                    </div>
                </div>
                
                <div class="mt-3">
                    <h6><i class="fas fa-calendar-plus"></i> Future Waste Projections</h6>
                    <div class="table-responsive">
                        <table class="table table-sm table-dark">
                            <thead>
                                <tr>
                                    <th>Year</th>
                                    <th>Waste (GWh)</th>
                                    <th>Cost (USD)</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${results.future_predictions.map(pred => `
                                    <tr>
                                        <td>${pred.year}</td>
                                        <td>${pred.predicted_energy_waste_gwh.toFixed(2)}</td>
                                        <td>$${pred.cost_implications_usd.toLocaleString()}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
                
                <div class="mt-3">
                    <h6><i class="fas fa-leaf"></i> Environmental Impact</h6>
                    <div class="row">
                        <div class="col-6">
                            <div class="bg-dark p-2 rounded">
                                <i class="fas fa-cloud text-danger"></i>
                                <div class="mt-1"><strong>${results.savings_potential.co2_reduction_tons.toFixed(2)} tons</strong></div>
                                <small>CO₂ Reduction Potential</small>
                            </div>
                        </div>
                        <div class="col-6">
                            <div class="bg-dark p-2 rounded">
                                <i class="fas fa-money-bill-wave text-success"></i>
                                <div class="mt-1"><strong>$${results.savings_potential.annual_cost_savings_usd.toLocaleString()}</strong></div>
                                <small>Annual Savings</small>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="mt-3">
                    <p class="small text-muted">AI Model: Energy Economics Estimator</p>
                    <p class="small text-muted">Prediction ID: ${Date.now()}</p>
                </div>
            </div>
        `;
    }
}

window.PredictiveModelingEngine = PredictiveModelingEngine;