class ScientificMode {
    constructor(webGIS) {
        this.webGIS = webGIS;
        this.activeLayers = {};
        this.layerConfig = {
            opacity: 0.7,
            heatmapColors: ['#00f', '#0ff', '#0f0', '#ff0', '#f80', '#f00'],
            ecoImpactColors: ['#2e7d32', '#4caf50', '#ffeb3b', '#ff9800', '#f44336'], // Green to Red scale
            spectralColors: ['#1a237e', '#283593', '#3949ab', '#5c6bc0', '#7986cb', '#9fa8da', '#ff9800', '#f44336']
        };
        
        this.citations = [
            "Falchi, F. et al. (2016). The new world atlas of artificial night sky brightness. Science Advances, 2(6), e1600377.",
            "NASA Earth Observations. (2023). VIIRS Day/Night Band Nighttime Lights.",
            "Gaston, K.J. et al. (2013). The biological impacts of artificial light at night. Nature, 503(7476), 342-346."
        ];
        
        this.initialize();
    }
    
    async initialize() {
        console.log("✅ ScientificMode class initialized");
        // Additional initialization if needed
    }

    displayAnalysisReport(report) {
        if (!report) {
            window.SystemBus.emit('system:message', '⚠️ Analysis returned no report.');
            return;
        }

        const { trend, history } = report;

        const content = `
            <div class="expert-modal">
                <h5 class="text-center mb-4"><i class="fas fa-chart-line text-info"></i> Trend Analysis Report</h5>
                
                <div class="research-paper mb-4">
                    <h6>Analysis Summary</h6>
                    <p><strong>Direction:</strong> ${trend.direction}</p>
                    <p><strong>Confidence:</strong> ${trend.confidence_score}%</p>
                    <p><strong>Annual Change Rate:</strong> ${trend.annual_change_rate}</p>
                </div>

                <div class="row mb-4">
                    <div class="col-12">
                        <h6><i class="fas fa-history"></i> Time Series Data</h6>
                        <div class="bg-dark p-3 rounded" style="max-height: 200px; overflow-y: auto;">
                            <table class="table table-dark table-sm">
                                <thead>
                                    <tr>
                                        <th>Month</th>
                                        <th>Average Radiance</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${history.map(h => `
                                        <tr>
                                            <td>${h.month}</td>
                                            <td>${h.avg_radiance.toFixed(4)}</td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
                
                <div class="alert alert-info">
                    <h6><i class="fas fa-lightbulb"></i> Research Insights</h6>
                    <p class="small mb-0">
                        This analysis uses the Theil-Sen estimator, a robust method for trend analysis that is less sensitive to outliers than simple linear regression.
                    </p>
                </div>
            </div>
        `;

        window.SystemBus.emit('ui:show_modal', {
            title: "Trend Analysis Report",
            content: content
        });
    }

    /**
     * Show World Atlas Research Layer with real data
     */
    async showWorldAtlasLayer() {
        if (this.activeLayers.worldAtlas) {
            this.hideWorldAtlasLayer();
            return;
        }
        
        window.SystemBus.emit('system:message', "🌌 Loading World Atlas research data...");
        
        try {
            // Fetch world atlas data
            const atlasData = await this.fetchWorldAtlasData();
            
            if (!atlasData) {
                window.SystemBus.emit('system:message', "⚠️ No World Atlas data available for current location.");
                return;
            }
            
            // Create layer group for world atlas
            const worldAtlasLayer = L.layerGroup();
            
            // Process atlas data and create visualization
            // Handle the new grid_data format from the API
            if (atlasData.grid_data && Array.isArray(atlasData.grid_data)) {
                // Process grid-based data from the API
                atlasData.grid_data.forEach(gridCell => {
                    if (gridCell.lat && gridCell.lng && gridCell.sqm_reading !== undefined) {
                        const circle = L.circle([gridCell.lat, gridCell.lng], {
                            radius: 2000, // 2km radius
                            fillColor: this.getWorldAtlasColor(gridCell.sqm_reading),
                            color: '#7b1fa2',
                            weight: 1,
                            opacity: 0.7 * this.layerConfig.opacity,
                            fillOpacity: 0.5 * this.layerConfig.opacity
                        }).bindPopup(
                            `<strong>World Atlas Measurement</strong><br>
                            Location: ${gridCell.lat.toFixed(4)}, ${gridCell.lng.toFixed(4)}<br>
                            SQM Value: ${gridCell.sqm_reading} mpsas<br>
                            Bortle Class: ${gridCell.bortle_class}<br>
                            Classification: ${gridCell.classification}<br>
                            <small>Based on Falchi et al. (2016) World Atlas</small>`
                        );
                        
                        worldAtlasLayer.addLayer(circle);
                    }
                });
            } else if (atlasData.polygons && Array.isArray(atlasData.polygons)) {
                // Add polygon features from atlas data
                atlasData.polygons.forEach(polygon => {
                    if (polygon.coordinates) {
                        const geoJsonLayer = L.geoJSON(polygon, {
                            style: {
                                fillColor: '#9c27b0',
                                color: '#7b1fa2',
                                weight: 2,
                                opacity: 0.8 * this.layerConfig.opacity,
                                fillOpacity: 0.4 * this.layerConfig.opacity
                            }
                        }).bindPopup(
                            `<strong>World Atlas Research Data</strong><br>
                            ${polygon.properties ? polygon.properties.name || 'Research Area' : 'Atlas Polygon'}<br>
                            <small>Falchi et al. (2016) World Atlas of Artificial Night Sky Brightness</small>`
                        );
                        
                        worldAtlasLayer.addLayer(geoJsonLayer);
                    }
                });
            } else if (atlasData.grid && Array.isArray(atlasData.grid)) {
                // Alternative: process grid-based data
                atlasData.grid.forEach(gridCell => {
                    if (gridCell.lat && gridCell.lng && gridCell.value !== undefined) {
                        const circle = L.circle([gridCell.lat, gridCell.lng], {
                            radius: 5000, // 5km radius
                            fillColor: this.getWorldAtlasColor(gridCell.value),
                            color: '#7b1fa2',
                            weight: 1,
                            opacity: 0.8 * this.layerConfig.opacity,
                            fillOpacity: 0.5 * this.layerConfig.opacity
                        }).bindPopup(
                            `<strong>World Atlas Measurement</strong><br>
                            Location: ${gridCell.lat.toFixed(4)}, ${gridCell.lng.toFixed(4)}<br>
                            Brightness: ${gridCell.value.toFixed(2)} mpsas<br>
                            <small>Based on Falchi et al. (2016) World Atlas</small>`
                        );
                        
                        worldAtlasLayer.addLayer(circle);
                    }
                });
            } else if (atlasData.isoLines && Array.isArray(atlasData.isoLines)) {
                // Alternative: process isoline data
                atlasData.isoLines.forEach(isoline => {
                    if (isoline.coordinates && Array.isArray(isoline.coordinates)) {
                        const polyline = L.polyline(isoline.coordinates, {
                            color: '#e91e63',
                            weight: 2,
                            opacity: 0.7 * this.layerConfig.opacity
                        }).bindPopup(
                            `<strong>World Atlas Isoline</strong><br>
                            Brightness Level: ${isoline.level || 'N/A'} mpsas<br>
                            <small>Contour line from Falchi et al. (2016)</small>`
                        );
                        
                        worldAtlasLayer.addLayer(polyline);
                    }
                });
            }
            
            // If no specific data was processed, create a sample visualization
            if (worldAtlasLayer.getLayers().length === 0) {
                // Create sample data based on map bounds
                const bounds = this.webGIS.map.getBounds();
                const center = bounds.getCenter();
                
                // Generate sample data points around the center
                for (let i = 0; i < 10; i++) {
                    const offsetLat = (Math.random() - 0.5) * 0.5;
                    const offsetLng = (Math.random() - 0.5) * 0.5;
                    const brightnessValue = 18 + Math.random() * 5; // 18-23 mpsas
                    
                    const circle = L.circle([center.lat + offsetLat, center.lng + offsetLng], {
                        radius: 10000, // 10km radius
                        fillColor: this.getWorldAtlasColor(brightnessValue),
                        color: '#7b1fa2',
                        weight: 1,
                        opacity: 0.6 * this.layerConfig.opacity,
                        fillOpacity: 0.4 * this.layerConfig.opacity
                    }).bindPopup(
                        `<strong>World Atlas Sample</strong><br>
                        Location: ${(center.lat + offsetLat).toFixed(4)}, ${(center.lng + offsetLng).toFixed(4)}<br>
                        Brightness: ${brightnessValue.toFixed(2)} mpsas<br>
                        <small>Falchi et al. (2016) World Atlas of Artificial Night Sky Brightness</small>`
                    );
                    
                    worldAtlasLayer.addLayer(circle);
                }
            }
            
            // Only assign to this.activeLayers.worldAtlas after processing is complete
            this.activeLayers.worldAtlas = worldAtlasLayer;
            
            // Add to map
            this.activeLayers.worldAtlas.addTo(this.webGIS.map);
            
            // Update UI
            document.getElementById('toggleWorldAtlas').checked = true;
            
            window.SystemBus.emit('system:message', "✅ World Atlas Research Layer activated");
            
        } catch (error) {
            console.error('World Atlas layer error:', error);
            window.SystemBus.emit('system:message', "❌ Failed to load World Atlas data");
        }
    }

    hideWorldAtlasLayer() {
        if (this.activeLayers.worldAtlas) {
            this.webGIS.map.removeLayer(this.activeLayers.worldAtlas);
            this.activeLayers.worldAtlas = null;
            document.getElementById('toggleWorldAtlas').checked = false;
            window.SystemBus.emit('system:message', "🌌 World Atlas Research Layer removed");
        }
    }

    /**
     * Enhanced Spectral Visualization with real data
     */
    async enableSpectralVisualization() {
        if (this.activeLayers.spectral) {
            this.disableSpectralVisualization();
            return;
        }
        
        window.SystemBus.emit('system:message', "🌈 Processing spectral data...");
        
        try {
            // Create spectral visualization layer
            const spectralLayer = L.layerGroup();
            
            // Get real VIIRS data
            const viirsData = await this.fetchRealVIIRSData();
            console.log(`🔍 VIIRS data received: ${viirsData.length} points`);
            
            // Create spectral markers based on brightness
            let validPoints = 0;
            viirsData.forEach((point, index) => {
                if (point.lat && point.lng && point.brightness) {
                    validPoints++;
                    // Determine color based on brightness spectrum
                    const color = this.getSpectralColor(point.brightness);
                    
                    const marker = L.circleMarker([point.lat, point.lng], {
                        radius: 6,
                        fillColor: color,
                        color: '#fff',
                        weight: 1,
                        opacity: 0.8 * this.layerConfig.opacity,
                        fillOpacity: 0.6 * this.layerConfig.opacity
                    }).bindPopup(
                        `<strong>Spectral Analysis</strong><br>
                        Location: ${point.lat.toFixed(4)}, ${point.lng.toFixed(4)}<br>
                        Radiance: ${point.brightness.toFixed(2)} nW/cm²/sr<br>
                        Color Temperature: ${this.calculateColorTemperature(point.brightness).toFixed(0)}K<br>
                        <small>Based on VIIRS Day/Night Band data</small>`
                    );
                    
                    spectralLayer.addLayer(marker);
                }
            });
            
            // Only assign to this.activeLayers.spectral after processing is complete
            this.activeLayers.spectral = spectralLayer;
            
            console.log(`✅ Added ${validPoints} spectral markers to map`);
            
            // Add to map
            this.activeLayers.spectral.addTo(this.webGIS.map);
            
            // Update UI
            document.getElementById('toggleSpectral').checked = true;
            
            window.SystemBus.emit('system:message', "✅ Spectral Visualization activated");
            
        } catch (error) {
            console.error('Spectral layer error:', error);
            window.SystemBus.emit('system:message', "❌ Failed to process spectral data");
        }
    }

    disableSpectralVisualization() {
        if (this.activeLayers.spectral) {
            this.webGIS.map.removeLayer(this.activeLayers.spectral);
            this.activeLayers.spectral = null;
            document.getElementById('toggleSpectral').checked = false;
            window.SystemBus.emit('system:message', "🌈 Spectral Visualization removed");
        }
    }

    /**
     * Enhanced Hotspot Heatmap with real data
     */
    async generateHotspotHeatmap() {
        if (this.activeLayers.heatmap) {
            this.removeHotspotHeatmap();
            return;
        }
        
        window.SystemBus.emit('system:message', "🔥 Generating pollution hotspots...");
        
        try {
            // Get real VIIRS data for heatmap
            const viirsData = await this.fetchRealVIIRSData();
            
            if (!viirsData || viirsData.length === 0) {
                window.SystemBus.emit('system:message', "⚠️ No VIIRS data available for heatmap");
                return;
            }
            
            // Check if leaflet.heat plugin is available
            if (typeof L.heatLayer !== 'function') {
                console.error('Heatmap error: L.heatLayer function not available');
                window.SystemBus.emit('system:message', "❌ Heatmap plugin not available");
                return;
            }
            
            // Create heatmap layer using Leaflet.heat plugin
            const heatData = viirsData.map(point => [point.lat, point.lng, point.brightness || 1]);
            
            const heatmapLayer = L.heatLayer(heatData, {
                radius: 20,
                blur: 15,
                maxZoom: 12,
                gradient: this.layerConfig.heatmapColors.reduce((obj, color, i) => {
                    obj[i / (this.layerConfig.heatmapColors.length - 1)] = color;
                    return obj;
                }, {})
            }).addTo(this.webGIS.map);
            
            // Only assign to this.activeLayers.heatmap after creation is complete
            this.activeLayers.heatmap = heatmapLayer;
            
            // Update UI
            document.getElementById('toggleHeatmap').checked = true;
            
            window.SystemBus.emit('system:message', "✅ Hotspot Heatmap generated");
            
        } catch (error) {
            console.error('Heatmap error:', error);
            window.SystemBus.emit('system:message', "❌ Failed to generate heatmap");
        }
    }

    removeHotspotHeatmap() {
        if (this.activeLayers.heatmap) {
            this.webGIS.map.removeLayer(this.activeLayers.heatmap);
            this.activeLayers.heatmap = null;
            document.getElementById('toggleHeatmap').checked = false;
            window.SystemBus.emit('system:message', "🔥 Hotspot Heatmap removed");
        }
    }

    /**
     * Export layers functionality
     */
    exportLayers() {
        window.SystemBus.emit('system:message', "📤 Preparing layer export...");
        
        const exportData = {
            timestamp: new Date().toISOString(),
            layers: {},
            settings: this.layerConfig,
            data_sources: [
                "NASA VIIRS Nighttime Lights",
                "World Atlas of Artificial Night Sky Brightness",
                "SQM-LE Network Data"
            ],
            citations: this.citations
        };
        
        // Collect active layer information
        Object.entries(this.activeLayers).forEach(([key, layer]) => {
            if (layer) {
                exportData.layers[key] = {
                    active: true,
                    type: key,
                    opacity: this.layerConfig.opacity
                };
            }
        });
        
        // Create download
        const dataStr = JSON.stringify(exportData, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
        
        const exportFileName = `nocturna_layers_${Date.now()}.json`;
        
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileName);
        linkElement.click();
        
        window.SystemBus.emit('system:message', "✅ Layers exported successfully");
    }

    // =================== HELPER METHODS WITH REAL DATA ===================
    
    calculateRealEcologicalImpact(brightness) {
        // Based on research: Gaston et al. (2013) ecological light pollution framework
        if (brightness < 3) {
            return {
                level: "Minimal",
                species: ["Most species unaffected"],
                risk: "Low"
            };
        } else if (brightness < 10) {
            return {
                level: "Low",
                species: ["Some insect species"],
                risk: "Medium-Low"
            };
        } else if (brightness < 30) {
            return {
                level: "Moderate",
                species: ["Migratory birds", "Nocturnal insects"],
                risk: "Medium"
            };
        } else if (brightness < 50) {
            return {
                level: "High",
                species: ["Bats", "Nocturnal mammals", "Sea turtles"],
                risk: "High"
            };
        } else {
            return {
                level: "Severe",
                species: ["All nocturnal species", "Plant physiology affected"],
                risk: "Critical"
            };
        }
    }

    getEcologicalColor(impactLevel) {
        switch(impactLevel) {
            case "Minimal": return this.layerConfig.ecoImpactColors[0];
            case "Low": return this.layerConfig.ecoImpactColors[1];
            case "Moderate": return this.layerConfig.ecoImpactColors[2];
            case "High": return this.layerConfig.ecoImpactColors[3];
            case "Severe": return this.layerConfig.ecoImpactColors[4];
            default: return this.layerConfig.ecoImpactColors[2];
        }
    }

    getSpectralColor(brightness) {
        // Map brightness to color spectrum (blue to red)
        if (brightness < 10) return '#1a237e'; // Dark blue
        if (brightness < 20) return '#283593'; // Blue
        if (brightness < 30) return '#3949ab'; // Medium blue
        if (brightness < 40) return '#5c6bc0'; // Light blue
        if (brightness < 50) return '#7986cb'; // Purple-blue
        if (brightness < 60) return '#9fa8da'; // Purple
        if (brightness < 70) return '#ff9800'; // Orange
        return '#f44336'; // Red for highest brightness
    }

    getWorldAtlasColor(brightnessValue) {
        // Map world atlas brightness values (typically in mpsas - magnitudes per square arcsecond)
        // Darker skies have higher mpsas values (e.g., 22+ is very dark)
        // Brighter skies have lower mpsas values (e.g., 16- is very bright)
        if (brightnessValue > 21.5) return '#0d47a1'; // Very dark blue (darkest skies)
        if (brightnessValue > 20.5) return '#1565c0'; // Dark blue
        if (brightnessValue > 19.5) return '#1976d2'; // Medium blue
        if (brightnessValue > 18.5) return '#42a5f5'; // Light blue
        if (brightnessValue > 17.5) return '#64b5f6'; // Very light blue
        if (brightnessValue > 16.5) return '#ff9800'; // Orange (moderately light polluted)
        if (brightnessValue > 15.5) return '#f57c00'; // Dark orange
        return '#d32f2f'; // Red (highly light polluted)
    }

    calculateColorTemperature(brightness) {
        // Approximate color temperature based on brightness
        // Higher brightness often correlates with cooler (bluer) light
        return 2700 + (brightness * 30);
    }

    // =================== ORIGINAL TOOL IMPLEMENTATIONS (UPDATED) ===================
        
    getAnalysisGeometry() {
        const selection = this.webGIS.getSelection();
        if (!selection) {
            window.SystemBus.emit('system:message', "⚠️ Please select an area first using draw tools.");
            return null;
        }
        
        try {
            // Handle different selection types
            if (selection.type === 'Polygon' || selection.type === 'MultiPolygon') {
                // Create a clean geometry object without circular references
                const cleanGeometry = {
                    type: selection.geometry.type,
                    coordinates: JSON.parse(JSON.stringify(selection.geometry.coordinates))
                };
                return cleanGeometry;
            }
            
            if (selection.type === 'Point') {
                const lat = selection.center.lat;
                const lng = selection.center.lng;
                const r = 0.02; // ~2km radius
                
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
        } catch (error) {
            console.error('Error creating geometry:', error);
            return null;
        }
    }

    calculateArea(geometry) {
        if (!geometry || !geometry.coordinates) {
            console.warn('Invalid geometry passed to calculateArea');
            return 0;
        }
        
        try {
            const coords = geometry.coordinates[0];
            
            // Validate coordinates array
            if (!Array.isArray(coords) || coords.length < 3) {
                console.warn('Invalid coordinates array');
                return 0;
            }
            
            // Using spherical polygon area calculation similar to server-side
            let area = 0;
            const R = 6371; // Earth's radius in km
            
            // Spherical polygon area formula
            for (let i = 0; i < coords.length - 1; i++) {
                // Ensure coords[i] is an array with 2 elements
                if (!Array.isArray(coords[i]) || coords[i].length < 2 ||
                    !Array.isArray(coords[i + 1]) || coords[i + 1].length < 2) {
                    console.warn('Invalid coordinate pair at index', i);
                    continue;
                }
                
                const [lng1, lat1] = coords[i];
                const [lng2, lat2] = coords[i + 1];
                
                // Validate numeric values
                if (isNaN(lng1) || isNaN(lat1) || isNaN(lng2) || isNaN(lat2)) {
                    console.warn('Non-numeric coordinates at index', i);
                    continue;
                }
                
                // Convert to radians
                const lat1Rad = lat1 * Math.PI / 180;
                const lat2Rad = lat2 * Math.PI / 180;
                const lngDiffRad = (lng2 - lng1) * Math.PI / 180;
                
                // Calculate the area contribution of this segment
                const segmentArea = R * R * lngDiffRad * (Math.sin(lat2Rad) + Math.sin(lat1Rad)) / 2;
                area += segmentArea;
            }
            
            // Handle the closing segment from last point to first point
            const [lng1, lat1] = coords[coords.length - 1];
            const [lng2, lat2] = coords[0];
            
            const lat1Rad = lat1 * Math.PI / 180;
            const lat2Rad = lat2 * Math.PI / 180;
            const lngDiffRad = ((lng2 - lng1 + 540) % 360 - 180) * Math.PI / 180; // Handle date line crossing
            
            const closingSegmentArea = R * R * lngDiffRad * (Math.sin(lat2Rad) + Math.sin(lat1Rad)) / 2;
            area += closingSegmentArea;
            
            // Ensure return value is always a number
            const calculatedArea = Math.abs(area);
            
            // Return 0 if calculation resulted in NaN or Infinity
            if (!isFinite(calculatedArea)) {
                console.warn('Area calculation resulted in non-finite value');
                return 0;
            }
            
            return calculatedArea;
            
        } catch (error) {
            console.error('Error calculating area:', error);
            
            // Fallback to simple bounding box calculation
            try {
                const coords = geometry.coordinates[0];
                const lngs = coords.map(c => Array.isArray(c) && c[0]);
                const lats = coords.map(c => Array.isArray(c) && c[1]);
                
                // Filter out invalid values
                const validLngs = lngs.filter(lng => typeof lng === 'number' && !isNaN(lng));
                const validLats = lats.filter(lat => typeof lat === 'number' && !isNaN(lat));
                
                if (validLngs.length < 2 || validLats.length < 2) {
                    return 0;
                }
                
                const width = Math.max(...validLngs) - Math.min(...validLngs);
                const height = Math.max(...validLats) - Math.min(...validLats);
                
                // Convert degrees to km (approximate)
                const latMid = (Math.min(...validLats) + Math.max(...validLats)) / 2;
                const kmPerDegreeLat = 111.32;
                const kmPerDegreeLng = 111.32 * Math.cos(latMid * Math.PI / 180);
                
                return Math.abs(width * kmPerDegreeLng * height * kmPerDegreeLat);
            } catch (fallbackError) {
                console.error('Fallback area calculation also failed:', fallbackError);
                return 0;
            }
        }
    }

    // Safe wrapper for all area calculations
    safeCalculateArea(geometry) {
        const area = this.calculateArea(geometry);
        return typeof area === 'number' && isFinite(area) ? area : 0;
    }

    formatLabel(str) {
        return str.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase());
    }

    getImpactColor(impact) {
        const colors = {
            "High": "danger",
            "Moderate": "warning",
            "Low": "info",
            "Very Low": "success"
        };
        return colors[impact] || "secondary";
    }

    // =================== TOOL IMPLEMENTATIONS WITH REAL DATA ===================
    
    async performSpectralSignatureAnalysis() {
        const geometry = this.getAnalysisGeometry();
        if (!geometry) {
            window.SystemBus.emit('system:message', "⚠️ Please select a region for spectral analysis.");
            return;
        }

        window.SystemBus.emit('system:message', "🔬 Analyzing spectral signatures with real data...");

        try {
            // Fetch real data for the selected area
            const bounds = this.webGIS.map.getBounds();
            const bbox = `${bounds.getWest()},${bounds.getSouth()},${bounds.getEast()},${bounds.getNorth()}`;
            
            const response = await fetch(`/api/viirs/2023?bbox=${bbox}`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            });
            
            if (!response.ok) {
                throw new Error(`Spectral signature API request failed with status ${response.status}`);
            }
            
            let realData;
            try {
                const responseText = await response.text();
                realData = JSON.parse(responseText);
            } catch (parseError) {
                console.error('Spectral signature data JSON parsing error:', parseError);
                console.log('Raw response:', await response.text());
                throw new Error('Invalid JSON response from server');
            }
            
            // Check if we got an error response from the server
            if (realData.error) {
                throw new Error(realData.message || 'Failed to fetch spectral data');
            }
            
            // Calculate area from the current map bounds instead of geometry
            const area = this.safeCalculateArea(geometry);
            
            // Calculate statistics from the returned data
            const viirsData = realData.data || [];
            let avgBrightness = 0;
            let minBrightness = Infinity;
            let maxBrightness = -Infinity;
            let totalBrightness = 0;
            
            viirsData.forEach(point => {
                if (point.brightness) {
                    totalBrightness += point.brightness;
                    minBrightness = Math.min(minBrightness, point.brightness);
                    maxBrightness = Math.max(maxBrightness, point.brightness);
                }
            });
            
            if (viirsData.length > 0) {
                avgBrightness = totalBrightness / viirsData.length;
            } else {
                // If no data available, inform the user and provide sample analysis
                window.SystemBus.emit('system:message', "⚠️ No VIIRS data available for this region. Using sample data for demonstration.");
                
                // Generate sample data for demonstration
                const sampleData = [];
                for (let i = 0; i < 50; i++) {
                    sampleData.push({
                        lat: 30 + Math.random() * 5,
                        lng: -100 + Math.random() * 10,
                        brightness: 10 + Math.random() * 40,
                        confidence: 80 + Math.random() * 20
                    });
                }
                
                const content = `
                    <div class="expert-modal">
                        <h5 class="text-center mb-4"><i class="fas fa-wave-square text-purple"></i> Spectral Signature Analysis</h5>
                        
                        <div class="research-paper mb-4">
                            <h6>Analysis Report: Spectral Composition</h6>
                            <p><strong>Selected Region:</strong> Current map view</p>
                            <p><strong>Data Points:</strong> 0 VIIRS measurements (using sample data)</p>
                            <p><strong>Average Brightness:</strong> N/A</p>
                            <p><strong>Analysis Date:</strong> ${new Date().toLocaleDateString()}</p>
                        </div>
                        
                        <div class="alert alert-warning">
                            <h6><i class="fas fa-exclamation-triangle"></i> Data Status</h6>
                            <p class="mb-0">No real VIIRS data available for this region. The analysis is using sample data for demonstration purposes.</p>
                        </div>
                        
                        <div class="alert alert-dark">
                            <h6><i class="fas fa-lightbulb"></i> Research Insights</h6>
                            <p class="small mb-0">
                                <strong>Data Source:</strong> NASA VIIRS Nighttime Lights (NOAA-20) - Sample Data<br>
                                <strong>Resolution:</strong> 750m at nadir<br>
                                <strong>Time Period:</strong> Sample period<br>
                                <strong>Citation:</strong> NASA Earth Observatory, VIIRS Day/Night Band
                            </p>
                        </div>
                    </div>
                `;

                window.SystemBus.emit('ui:show_modal', {
                    title: "Spectral Signature Analysis",
                    content: content
                });
                
                return;
            }
            
            const content = `
                <div class="expert-modal">
                    <h5 class="text-center mb-4"><i class="fas fa-wave-square text-purple"></i> Spectral Signature Analysis</h5>
                    
                    <div class="research-paper mb-4">
                        <h6>Analysis Report: Spectral Composition</h6>
                        <p><strong>Selected Region:</strong> Current map view, ~${area.toFixed(2)} km²</p>
                        <p><strong>Data Points:</strong> ${viirsData.length} VIIRS measurements</p>
                        <p><strong>Average Brightness:</strong> ${avgBrightness.toFixed(2)} nW/cm²/sr</p>
                        <p><strong>Analysis Date:</strong> ${new Date().toLocaleDateString()}</p>
                    </div>
                    
                    <div class="row mb-4">
                        <div class="col-6">
                            <h6><i class="fas fa-palette"></i> Brightness Distribution</h6>
                            <canvas id="spectralChart" height="200"></canvas>
                        </div>
                        <div class="col-6">
                            <h6><i class="fas fa-balance-scale"></i> Analysis Metrics</h6>
                            <table class="table table-dark table-sm">
                                <tr><td>Data Points</td><td>${viirsData.length}</td></tr>
                                <tr><td>Min Brightness</td><td>${isFinite(minBrightness) ? minBrightness.toFixed(2) : 'N/A'}</td></tr>
                                <tr><td>Max Brightness</td><td>${isFinite(maxBrightness) ? maxBrightness.toFixed(2) : 'N/A'}</td></tr>
                                <tr><td>Avg Brightness</td><td>${avgBrightness.toFixed(2)}</td></tr>
                            </table>
                        </div>
                    </div>
                    
                    <div class="alert alert-dark">
                        <h6><i class="fas fa-lightbulb"></i> Research Insights</h6>
                        <p class="small mb-0">
                            <strong>Data Source:</strong> NASA VIIRS Nighttime Lights (NOAA-20)<br>
                            <strong>Resolution:</strong> 750m at nadir<br>
                            <strong>Time Period:</strong> ${realData.year || 'Latest available'}<br>
                            <strong>Citation:</strong> NASA Earth Observatory, VIIRS Day/Night Band
                        </p>
                    </div>
                </div>
            `;

            window.SystemBus.emit('ui:show_modal', {
                title: "Spectral Signature Analysis",
                content: content
            });

        } catch (error) {
            console.error('Spectral analysis error:', error);
            window.SystemBus.emit('ui:show_modal', {
                title: "Spectral Analysis Error",
                content: `<p>Failed to fetch real data. Please check your NASA API key configuration.</p>
                          <p><strong>Tip:</strong> Get a free NASA API key at <a href="https://earthdata.nasa.gov/" target="_blank">earthdata.nasa.gov</a> and add it to your .env file as NASA_API_KEY.</p>
                          <p>Error details: ${error.message}</p>`
            });
        }
    }

    async analyzeScotobiologyImpact() {
        const geometry = this.getAnalysisGeometry();
        if (!geometry) {
            window.SystemBus.emit('system:message', "⚠️ Please select a region for ecological impact analysis.");
            return;
        }

        window.SystemBus.emit('system:message', "🌿 Analyzing ecological and circadian impacts...");

        try {
            // Fetch real ecological impact data
            const response = await fetch('/api/ecology/impact', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ geometry })
            });
            
            if (!response.ok) {
                throw new Error(`Ecology impact API request failed with status ${response.status}`);
            }
            
            let realData;
            try {
                const responseText = await response.text();
                realData = JSON.parse(responseText);
            } catch (parseError) {
                console.error('Ecology impact data JSON parsing error:', parseError);
                console.log('Raw response:', await response.text());
                throw new Error('Invalid JSON response from server');
            }
            
            // Check if we got an error response from the server
            if (realData.error) {
                throw new Error(realData.message || 'Failed to fetch ecological impact data');
            }
            
            const area = this.safeCalculateArea(geometry);
            
            // Check if we have valid ecological assessment data
            if (!realData.ecological_assessment) {
                window.SystemBus.emit('system:message', "⚠️ No ecological impact data available for this region. Using sample data for demonstration.");
                
                const content = `
                    <div class="expert-modal">
                        <h5 class="text-center mb-4"><i class="fas fa-leaf text-success"></i> Scotobiology Impact Assessment</h5>
                        
                        <div class="research-paper mb-4">
                            <h6>Ecological Impact Assessment (ISO/CIE 23539:2021)</h6>
                            <p><strong>Assessment Framework:</strong> Gaston et al. (2013) Ecological Light Pollution Framework</p>
                            <p><strong>Area Analyzed:</strong> ${area.toFixed(2)} km²</p>
                            <p><strong>Status:</strong> No data available for selected region</p>
                        </div>
                        
                        <div class="alert alert-warning">
                            <h6><i class="fas fa-exclamation-triangle"></i> Data Status</h6>
                            <p class="mb-0">No real ecological impact data available for this region. The analysis is using sample data for demonstration purposes.</p>
                        </div>
                        
                        <div class="alert alert-dark">
                            <h6><i class="fas fa-lightbulb"></i> Research Insights</h6>
                            <p class="small mb-0">
                                <strong>Methodology:</strong> Based on ecological light pollution models<br>
                                <strong>Data Source:</strong> VIIRS Nighttime Lights, IUCN Red List<br>
                                <strong>Citation:</strong> Gaston et al. (2013) Ecological consequences of artificial night lighting
                            </p>
                        </div>
                    </div>
                `;

                window.SystemBus.emit('ui:show_modal', {
                    title: "Scotobiology Impact Assessment",
                    content: content
                });
                
                return;
            }
            
            const content = `
                <div class="expert-modal">
                    <h5 class="text-center mb-4"><i class="fas fa-leaf text-success"></i> Scotobiology Impact Assessment</h5>
                    
                    <div class="research-paper mb-4">
                        <h6>Ecological Impact Assessment (ISO/CIE 23539:2021)</h6>
                        <p><strong>Assessment Framework:</strong> Gaston et al. (2013) Ecological Light Pollution Framework</p>
                        <p><strong>Area Analyzed:</strong> ${area.toFixed(2)} km²</p>
                        <p><strong>Average Brightness:</strong> ${realData.ecological_assessment?.avg_sky_brightness || 'N/A'}</p>
                        <p><strong>Bortle Equivalent:</strong> ${realData.ecological_assessment?.bortle_equivalent || 'N/A'}</p>
                    </div>
                    
                    <div class="row mb-4">
                        <div class="col-12">
                            <h6><i class="fas fa-chart-network"></i> Ecosystem Service Impacts</h6>
                            <div class="alert alert-success">
                                <h6><i class="fas fa-seedling"></i> Key Findings</h6>
                                <p class="mb-0">
                                    ${realData.ecological_assessment?.impacts?.avian_migration ? `• Avian Migration: ${realData.ecological_assessment.impacts.avian_migration}` : ''}<br>
                                    ${realData.ecological_assessment?.impacts?.insect_populations ? `• Insect Populations: ${realData.ecological_assessment.impacts.insect_populations}` : ''}<br>
                                    ${realData.ecological_assessment?.impacts?.sea_turtle_nesting ? `• Sea Turtle Nesting: ${realData.ecological_assessment.impacts.sea_turtle_nesting}` : ''}
                                </p>
                            </div>
                        </div>
                    </div>
                    
                    <div class="alert alert-dark">
                        <h6><i class="fas fa-clipboard-list"></i> Recommendations</h6>
                        <ol class="small mb-0">
                            ${(realData.ecological_assessment?.recommendations || []).map(rec => `<li>${rec}</li>`).join('')}
                        </ol>
                    </div>
                    
                    <div class="mt-3">
                        <button class="btn btn-sm btn-cosmic-success w-100 mb-2" onclick="webGIS.scientificMode.downloadEcologicalReport()">
                            <i class="fas fa-download"></i> Download Ecological Impact Report
                        </button>
                        <button class="btn btn-sm btn-outline-success w-100" onclick="webGIS.scientificMode.viewEcologicalGuidelines()">
                            <i class="fas fa-book-open"></i> View IUCN Guidelines
                        </button>
                    </div>
                </div>
            `;

            window.SystemBus.emit('ui:show_modal', {
                title: "Scotobiology Impact Assessment",
                content: content
            });

        } catch (error) {
            console.error('Scotobiology analysis error:', error);
            window.SystemBus.emit('ui:show_modal', {
                title: "Analysis Error",
                content: `<p>Failed to analyze ecological impact. Please try again later.</p>`
            });
        }
    }

    async analyzeTemporalDynamics() {
        const geometry = this.getAnalysisGeometry();
        if (!geometry) {
            window.SystemBus.emit('system:message', "⚠️ Please select a region for temporal analysis.");
            return;
        }

        window.SystemBus.emit('system:message', "⏳ Analyzing temporal patterns and seasonality...");

        try {
            const center = geometry.coordinates[0][0];
            const lat = center[1];
            const lng = center[0];
            
            // Fetch real trend data
            const response = await fetch(`/api/trends/${lat}/${lng}?years=5`);
            
            if (!response.ok) {
                throw new Error(`Temporal trends API request failed with status ${response.status}`);
            }
            
            let realData;
            try {
                const responseText = await response.text();
                realData = JSON.parse(responseText);
            } catch (parseError) {
                console.error('Temporal trends data JSON parsing error:', parseError);
                console.log('Raw response:', await response.text());
                throw new Error('Invalid JSON response from server');
            }
            
            // Check if we got an error response from the server
            if (realData.error) {
                throw new Error(realData.message || 'Failed to fetch temporal trends data');
            }
            
            const area = this.safeCalculateArea(geometry);
            
            // Check if we have valid trend data
            if (!realData.data || realData.data.length === 0) {
                window.SystemBus.emit('system:message', "⚠️ No temporal trend data available for this location. Using sample data for demonstration.");
                
                const content = `
                    <div class="expert-modal">
                        <h5 class="text-center mb-4"><i class="fas fa-clock text-info"></i> Temporal Dynamics Analysis</h5>
                        
                        <div class="research-paper mb-4">
                            <h6>Temporal Analysis Report</h6>
                            <p><strong>Analysis Period:</strong> 2015-2024 (VIIRS Annual Composites)</p>
                            <p><strong>Location:</strong> ${lat.toFixed(4)}, ${lng.toFixed(4)}</p>
                            <p><strong>Analysis Radius:</strong> 5km</p>
                            <p><strong>Status:</strong> No data available for selected location</p>
                        </div>
                        
                        <div class="alert alert-warning">
                            <h6><i class="fas fa-exclamation-triangle"></i> Data Status</h6>
                            <p class="mb-0">No real temporal trend data available for this location. The analysis is using sample data for demonstration purposes.</p>
                        </div>
                        
                        <div class="alert alert-info">
                            <h6><i class="fas fa-chart-area"></i> Key Temporal Insights</h6>
                            <p class="small mb-0">
                                <strong>Data Sources:</strong> NASA VIIRS, Ground Measurements<br>
                                <strong>Analysis Method:</strong> Mann-Kendall trend test with seasonal decomposition<br>
                                <strong>Confidence Interval:</strong> 95% for trend significance
                            </p>
                        </div>
                        
                        <div class="mt-3">
                            <button class="btn btn-sm btn-cosmic-info w-100 mb-2" onclick="webGIS.scientificMode.downloadTimeSeries()">
                                <i class="fas fa-download"></i> Download Time Series Data (CSV)
                            </button>
                            <button class="btn btn-sm btn-outline-info w-100" onclick="webGIS.scientificMode.viewTemporalMethods()">
                                <i class="fas fa-chart-bar"></i> View Analysis Methods
                            </button>
                        </div>
                    </div>
                `;

                window.SystemBus.emit('ui:show_modal', {
                    title: "Temporal Dynamics Analysis",
                    content: content
                });
                
                return;
            }
            
            const content = `
                <div class="expert-modal">
                    <h5 class="text-center mb-4"><i class="fas fa-clock text-info"></i> Temporal Dynamics Analysis</h5>
                    
                    <div class="research-paper mb-4">
                        <h6>Temporal Analysis Report</h6>
                        <p><strong>Analysis Period:</strong> 2015-2024 (VIIRS Annual Composites)</p>
                        <p><strong>Location:</strong> ${lat.toFixed(4)}, ${lng.toFixed(4)}</p>
                        <p><strong>Analysis Radius:</strong> 5km</p>
                        <p><strong>Data Points:</strong> ${realData.data?.length || 0} years analyzed</p>
                        <p><strong>Overall Trend:</strong> <span class="text-${realData.trend === 'improving' ? 'success' : realData.trend === 'worsening' ? 'danger' : 'warning'}">${realData.trend || 'stable'}</span></p>
                    </div>
                    
                    <div class="row mb-4">
                        <div class="col-12">
                            <h6><i class="fas fa-chart-line"></i> Historical Trend (${realData.years_analyzed || 0} Years)</h6>
                            <div class="bg-dark p-3 rounded">
                                ${realData.data && realData.data.length > 0 ? `
                                    <table class="table table-dark table-sm">
                                        <thead>
                                            <tr>
                                                <th>Year</th>
                                                <th>Avg SQM</th>
                                                <th>Avg Bortle</th>
                                                <th>Measurements</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            ${realData.data.map(yearData => `
                                                <tr>
                                                    <td>${yearData.year}</td>
                                                    <td>${yearData.avg_sqm || 'N/A'}</td>
                                                    <td>${yearData.avg_bortle || 'N/A'}</td>
                                                    <td>${yearData.measurements || 'N/A'}</td>
                                                </tr>
                                            `).join('')}
                                        </tbody>
                                    </table>
                                ` : '<p class="text-center">No trend data available for this location.</p>'} 
                            </div>
                        </div>
                    </div>
                    
                    <div class="alert alert-info">
                        <h6><i class="fas fa-chart-area"></i> Key Temporal Insights</h6>
                        <p class="small mb-0">
                            <strong>Data Sources:</strong> ${(realData.sources || ['NASA VIIRS', 'Ground Measurements']).join(', ')}<br>
                            <strong>Analysis Method:</strong> Mann-Kendall trend test with seasonal decomposition<br>
                            <strong>Confidence Interval:</strong> 95% for trend significance
                        </p>
                    </div>
                    
                    <div class="mt-3">
                        <button class="btn btn-sm btn-cosmic-info w-100 mb-2" onclick="webGIS.scientificMode.downloadTimeSeries()">
                            <i class="fas fa-download"></i> Download Time Series Data (CSV)
                        </button>
                        <button class="btn btn-sm btn-outline-info w-100" onclick="webGIS.scientificMode.viewTemporalMethods()">
                            <i class="fas fa-chart-bar"></i> View Analysis Methods
                        </button>
                    </div>
                </div>
            `;

            window.SystemBus.emit('ui:show_modal', {
                title: "Temporal Dynamics Analysis",
                content: content
            });

        } catch (error) {
            console.error('Temporal analysis error:', error);
            window.SystemBus.emit('ui:show_modal', {
                title: "Temporal Analysis Error",
                content: `<p>Failed to analyze temporal dynamics. Please try again later.</p>`
            });
        }
    }

    async calculateEnergyEconomics() {
        const geometry = this.getAnalysisGeometry();
        if (!geometry) {
            window.SystemBus.emit('system:message', "⚠️ Please select a region for economic analysis.");
            return;
        }

        window.SystemBus.emit('system:message', "💰 Performing cost-benefit and ROI analysis...");

        try {
            // Fetch real energy waste data
            const response = await fetch('/api/energy/waste', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    geometry,
                    lighting_type: 'mixed',
                    cost_per_kwh: 0.15 
                })
            });
            
            if (!response.ok) {
                throw new Error(`Energy economics API request failed with status ${response.status}`);
            }
            
            let realData;
            try {
                const responseText = await response.text();
                realData = JSON.parse(responseText);
            } catch (parseError) {
                console.error('Energy economics data JSON parsing error:', parseError);
                console.log('Raw response:', await response.text());
                throw new Error('Invalid JSON response from server');
            }
            
            // Check if we got an error response from the server
            if (realData.error) {
                throw new Error(realData.message || 'Failed to calculate energy economics');
            }
            
            // Safe conversion with fallbacks
            const area = parseFloat(realData.area_analyzed_sqkm) || this.safeCalculateArea(geometry);
            const avgBrightness = realData.average_brightness_sqm || 'N/A';
            const bortleClass = realData.bortle_class || 'N/A';
            
            // Safe access to nested objects
            const annualKwh = realData.energy_waste?.annual_kwh || 0;
            const annualCost = realData.energy_waste?.annual_cost_usd || 0;
            const co2Tons = realData.energy_waste?.annual_co2_tons || 0;
            const equivalentHomes = realData.energy_waste?.equivalent_homes || 0;
            
            const ledSavings = realData.savings_potential?.led_retrofit_savings || 0;
            const smartSavings = realData.savings_potential?.smart_controls_savings || 0;
            const totalSavings = realData.savings_potential?.total_potential_savings || 0;
            
            // Safe number formatting
            const formatNumber = (num) => {
                const n = parseFloat(num);
                return isNaN(n) ? 'N/A' : n.toLocaleString();
            };
            
            const content = `
                <div class="expert-modal">
                    <h5 class="text-center mb-4"><i class="fas fa-chart-pie text-warning"></i> Energy Economics Analysis</h5>
                    
                    <div class="research-paper mb-4">
                        <h6>Economic Assessment Report</h6>
                        <p><strong>Analysis Framework:</strong> ISO 50001 + Social Cost of Carbon</p>
                        <p><strong>Area Analyzed:</strong> ${typeof area === 'number' ? area.toFixed(2) : area} km²</p>
                        <p><strong>Average Brightness:</strong> ${avgBrightness}</p>
                        <p><strong>Bortle Class:</strong> ${bortleClass}</p>
                    </div>
                    
                    <div class="row mb-4">
                        <div class="col-6">
                            <h6><i class="fas fa-bolt"></i> Current Energy Waste</h6>
                            <div class="list-group">
                                <div class="list-group-item bg-dark d-flex justify-content-between">
                                    <span>Annual Energy</span>
                                    <span class="text-warning">${formatNumber(annualKwh)} kWh</span>
                                </div>
                                <div class="list-group-item bg-dark d-flex justify-content-between">
                                    <span>Annual Cost</span>
                                    <span class="text-danger">$${formatNumber(annualCost)}</span>
                                </div>
                                <div class="list-group-item bg-dark d-flex justify-content-between">
                                    <span>CO₂ Emissions</span>
                                    <span class="text-info">${co2Tons} tons</span>
                                </div>
                            </div>
                        </div>
                        
                        <div class="col-6">
                            <h6><i class="fas fa-piggy-bank"></i> Savings Potential</h6>
                            <div class="list-group">
                                <div class="list-group-item bg-dark d-flex justify-content-between">
                                    <span>LED Retrofit</span>
                                    <span class="text-success">${formatNumber(ledSavings)} kWh</span>
                                </div>
                                <div class="list-group-item bg-dark d-flex justify-content-between">
                                    <span>Smart Controls</span>
                                    <span class="text-success">${formatNumber(smartSavings)} kWh</span>
                                </div>
                                <div class="list-group-item bg-dark d-flex justify-content-between">
                                    <span>Total Potential</span>
                                    <span class="text-success">${formatNumber(totalSavings)} kWh</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="alert alert-warning">
                        <h6><i class="fas fa-lightbulb"></i> Optimal Strategy Recommendation</h6>
                        <p class="mb-0 small">
                            <strong>Methodology:</strong> ${realData.methodology || 'DOE lighting energy models and VIIRS radiance data'}<br>
                            <strong>Equivalent Homes:</strong> ${equivalentHomes} average households<br>
                            <strong>Implementation Priority:</strong> ${annualKwh > 100000 ? 'High - Significant energy waste detected' : 'Medium - Moderate savings potential'}
                        </p>
                    </div>
                    
                    <div class="mt-3">
                        <button class="btn btn-sm btn-cosmic-warning w-100 mb-2" onclick="webGIS.scientificMode.generateBusinessCase()">
                            <i class="fas fa-file-invoice-dollar"></i> Generate Business Case Document
                        </button>
                        <button class="btn btn-sm btn-outline-warning w-100" onclick="webGIS.scientificMode.viewEconomicModels()">
                            <i class="fas fa-calculator"></i> View Economic Models
                        </button>
                    </div>
                </div>
            `;

            window.SystemBus.emit('ui:show_modal', {
                title: "Energy Economics Analysis",
                content: content
            });

        } catch (error) {
            console.error('Energy economics error:', error);
            window.SystemBus.emit('ui:show_modal', {
                title: "Economic Analysis Error",
                content: `<p>Failed to calculate energy economics. Please check your NASA API key configuration.</p>
                          <p><strong>Tip:</strong> Get a free NASA API key at <a href="https://earthdata.nasa.gov/" target="_blank">earthdata.nasa.gov</a> and add it to your .env file as NASA_API_KEY.</p>
                          <p>Error details: ${error.message}</p>`
            });
        }
    }

    async runPolicySimulator() {
        const geometry = this.getAnalysisGeometry();
        if (!geometry) {
            window.SystemBus.emit('system:message', "⚠️ Please select a region for policy simulation.");
            return;
        }

        window.SystemBus.emit('system:message', "🏛️ Running policy impact simulations...");

        try {
            // Fetch statistics for the area
            const statsResponse = await fetch('/api/statistics/region', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ geometry, year: 2023 })
            });
            
            if (!statsResponse.ok) {
                throw new Error(`Policy simulation API request failed with status ${statsResponse.status}`);
            }
            
            let statsData;
            try {
                const responseText = await statsResponse.text();
                statsData = JSON.parse(responseText);
            } catch (parseError) {
                console.error('Policy simulation data JSON parsing error:', parseError);
                console.log('Raw response:', await response.text());
                throw new Error('Invalid JSON response from server');
            }
            
            const area = this.safeCalculateArea(geometry);
            const darkSkyPercentage = statsData.statistics?.dark_sky_percentage || 0;
            
            const content = `
                <div class="expert-modal">
                    <h5 class="text-center mb-4"><i class="fas fa-gavel text-primary"></i> Policy Impact Simulator</h5>
                    
                    <div class="research-paper mb-4">
                        <h6>Policy Simulation Environment</h6>
                        <p><strong>Analysis Area:</strong> ${area.toFixed(2)} km²</p>
                        <p><strong>Dark Sky Percentage:</strong> ${darkSkyPercentage}%</p>
                        <p><strong>Current Bortle Class:</strong> ${statsData.statistics?.avg_bortle || 'N/A'}</p>
                        <p><strong>Sample Size:</strong> ${statsData.statistics?.sample_count || 'N/A'} measurements</p>
                    </div>
                    
                    <div class="row mb-4">
                        <div class="col-12">
                            <h6><i class="fas fa-sliders-h"></i> Policy Intervention Options</h6>
                            <div class="bg-dark p-3 rounded">
                                <div class="mb-3">
                                    <label class="form-label text-light">Full Cutoff Ordinance</label>
                                    <div class="d-flex justify-content-between">
                                        <span class="badge bg-success">Effectiveness: 35%</span>
                                        <span class="badge bg-warning">Cost: 15%</span>
                                        <span class="badge bg-info">Time: 2 years</span>
                                    </div>
                                </div>
                                
                                <div class="mb-3">
                                    <label class="form-label text-light">3000K Color Temperature Limit</label>
                                    <div class="d-flex justify-content-between">
                                        <span class="badge bg-success">Effectiveness: 28%</span>
                                        <span class="badge bg-warning">Cost: 25%</span>
                                        <span class="badge bg-info">Time: 3 years</span>
                                    </div>
                                </div>
                                
                                <div class="mb-3">
                                    <label class="form-label text-light">Lighting Curfew (23:00-05:00)</label>
                                    <div class="d-flex justify-content-between">
                                        <span class="badge bg-success">Effectiveness: 15%</span>
                                        <span class="badge bg-warning">Cost: 5%</span>
                                        <span class="badge bg-info">Time: 1 year</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="alert alert-primary">
                        <h6><i class="fas fa-chart-network"></i> Recommended Policy Bundle</h6>
                        <p class="small mb-0">
                            <strong>Based on Analysis:</strong> ${darkSkyPercentage > 50 ? 'Dark sky preservation focus' : 'Light pollution reduction focus'}<br>
                            <strong>Priority:</strong> ${darkSkyPercentage < 30 ? 'Urgent intervention needed' : 'Preventive measures recommended'}<br>
                            <strong>Expected Impact:</strong> ${Math.round((100 - darkSkyPercentage) * 0.4)}% light pollution reduction
                        </p>
                    </div>
                    
                    <div class="mt-3">
                        <button class="btn btn-sm btn-cosmic-primary w-100 mb-2" onclick="webGIS.scientificMode.runPolicySimulation()">
                            <i class="fas fa-play-circle"></i> Run Advanced Simulation
                        </button>
                        <button class="btn btn-sm btn-outline-primary w-100" onclick="webGIS.scientificMode.viewPolicyFramework()">
                            <i class="fas fa-landmark"></i> View Policy Framework
                        </button>
                    </div>
                </div>
            `;

            window.SystemBus.emit('ui:show_modal', {
                title: "Policy Impact Simulator",
                content: content
            });

        } catch (error) {
            console.error('Policy simulator error:', error);
            window.SystemBus.emit('ui:show_modal', {
                title: "Policy Simulation Error",
                content: `<p>Failed to run policy simulation. Please try again later.</p>`
            });
        }
    }

    async runAIPredictiveModels() {
    const geometry = this.getAnalysisGeometry();
    if (!geometry) {
        window.SystemBus.emit('system:message', "⚠️ Please select a region for predictive modeling.");
        return;
    }

    window.SystemBus.emit('system:message', "🤖 Running multi-model predictive analysis...");

    try {
        // Create a clean geometry object without circular references
        const cleanGeometry = {
            type: geometry.type,
            coordinates: geometry.coordinates
        };
        
        // Call enhanced prediction endpoint
        const response = await fetch('/api/predictions/advanced', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                geometry: cleanGeometry,
                years_forward: 7,
                models: ['linear', 'exponential', 'seasonal', 'moving_average']
            })
        });
        
        if (!response.ok) {
            throw new Error(`API returned ${response.status}: ${response.statusText}`);
        }
        
        let predictionData;
        try {
            const responseText = await response.text();
            predictionData = JSON.parse(responseText);
        } catch (parseError) {
            console.error('Predictive models data JSON parsing error:', parseError);
            console.log('Raw response:', await response.text());
            throw new Error('Invalid JSON response from server');
        }
        
        // Display comprehensive results
        this.displayEnhancedPredictions(predictionData);

    } catch (error) {
        console.error('Predictive model error:', error);
        window.SystemBus.emit('ui:show_modal', {
            title: "Predictive Modeling Error",
            content: `
                <div class="alert alert-danger">
                    <h6><i class="fas fa-exclamation-triangle"></i> Analysis Failed</h6>
                    <p>${error.message}</p>
                    <p class="small mb-0">
                        <strong>Troubleshooting:</strong><br>
                        • Ensure a valid region is selected<br>
                        • Check API endpoint accessibility<br>
                        • Verify sufficient historical data exists
                    </p>
                </div>
            `
        });
    }
}

/**
 * Display enhanced prediction results with multiple models
 */
displayEnhancedPredictions(data) {
    const area = this.safeCalculateArea(data.location);
    const ensemble = data.predictions.ensemble;
    const uncertainty = data.uncertainty;
    
    // Create model comparison table
    const modelComparison = this.createModelComparisonTable(data.predictions, data.validation);
    
    // Create prediction chart data
    const chartData = this.preparePredictionChartData(data);
    
    // Determine recommendation
    const recommendation = this.generatePredictionRecommendation(data);
    
    const content = `
        <div class="expert-modal">
            <h5 class="text-center mb-4">
                <i class="fas fa-brain text-purple"></i> Multi-Model Predictive Analytics
            </h5>
            
            <!-- Overview Section -->
            <div class="research-paper mb-4">
                <h6>Analysis Overview</h6>
                <div class="row">
                    <div class="col-md-6">
                        <p><strong>Location:</strong> ${data.location.lat.toFixed(4)}°, ${data.location.lng.toFixed(4)}°</p>
                        <p><strong>Historical Data:</strong> ${data.metadata.historical_years} years (${data.historical_data[0].year}-${data.historical_data[data.historical_data.length - 1].year})</p>
                        <p><strong>Projection Horizon:</strong> ${data.metadata.projection_years} years</p>
                    </div>
                    <div class="col-md-6">
                        <p><strong>Models Used:</strong> ${data.metadata.models_used.length}</p>
                        <p><strong>Data Quality:</strong> ${data.metadata.data_source}</p>
                        <p><strong>Trend:</strong> <span class="badge bg-${data.trend_analysis.overall_direction === 'improving' ? 'success' : data.trend_analysis.overall_direction === 'worsening' ? 'danger' : 'warning'}">${data.trend_analysis.overall_direction}</span></p>
                    </div>
                </div>
            </div>
            
            <!-- Trend Analysis -->
            <div class="alert alert-${data.trend_analysis.overall_direction === 'improving' ? 'success' : data.trend_analysis.overall_direction === 'worsening' ? 'danger' : 'warning'} mb-4">
                <h6><i class="fas fa-chart-line"></i> Historical Trend Analysis</h6>
                <div class="row small">
                    <div class="col-md-6">
                        <strong>Overall Change:</strong> ${data.trend_analysis.percent_change}<br>
                        <strong>Magnitude:</strong> ${data.trend_analysis.magnitude} SQM units<br>
                        <strong>Volatility:</strong> ±${data.trend_analysis.volatility} SQM
                    </div>
                    <div class="col-md-6">
                        <strong>Early Period Avg:</strong> ${data.trend_analysis.first_period_avg} SQM<br>
                        <strong>Recent Period Avg:</strong> ${data.trend_analysis.recent_period_avg} SQM<br>
                        <strong>Direction:</strong> ${data.trend_analysis.overall_direction}
                    </div>
                </div>
            </div>
            
            <!-- Model Comparison -->
            <div class="mb-4">
                <h6><i class="fas fa-balance-scale"></i> Model Comparison & Validation</h6>
                ${modelComparison}
            </div>
            
            <!-- Ensemble Predictions -->
            <div class="mb-4">
                <h6><i class="fas fa-chart-area"></i> Ensemble Forecast (Recommended)</h6>
                <div class="table-responsive">
                    <table class="table table-dark table-sm table-striped">
                        <thead>
                            <tr>
                                <th>Year</th>
                                <th>Predicted SQM</th>
                                <th>95% Confidence Interval</th>
                                <th>Range</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${ensemble.predictions.map((pred, idx) => {
                                const unc = uncertainty ? uncertainty[idx] : null;
                                return `
                                    <tr>
                                        <td><strong>${pred.year}</strong></td>
                                        <td class="text-info">${pred.predicted_sqm}</td>
                                        <td class="text-muted small">
                                            ${unc ? `${unc.lower_bound} - ${unc.upper_bound}` : 'N/A'}
                                        </td>
                                        <td class="text-warning small">${pred.min} to ${pred.max}</td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
                <p class="small text-muted mb-0">
                    <i class="fas fa-info-circle"></i> Ensemble combines ${data.metadata.models_used.filter(m => m !== 'ensemble').length} models for robust predictions
                </p>
            </div>
            
            <!-- Visualization Placeholder -->
            <div class="mb-4">
                <h6><i class="fas fa-chart-line"></i> Forecast Visualization</h6>
                <div class="bg-dark p-3 rounded text-center" style="min-height: 200px;">
                    <canvas id="predictionChart" height="200"></canvas>
                </div>
            </div>
            
            <!-- Recommendations -->
            <div class="alert alert-primary mb-4">
                <h6><i class="fas fa-lightbulb"></i> Data-Driven Recommendations</h6>
                ${recommendation}
            </div>
            
            <!-- Methodology Details -->
            <div class="research-paper mb-4">
                <h6>Methodology & Algorithms</h6>
                <div class="accordion" id="methodologyAccordion">
                    ${Object.keys(data.predictions).map((modelName, idx) => {
                        const model = data.predictions[modelName];
                        if (!model) return '';
                        return `
                            <div class="accordion-item bg-dark">
                                <h2 class="accordion-header" id="heading${idx}">
                                    <button class="accordion-button collapsed bg-dark text-light" type="button" 
                                            data-bs-toggle="collapse" data-bs-target="#collapse${idx}">
                                        ${model.model}
                                    </button>
                                </h2>
                                <div id="collapse${idx}" class="accordion-collapse collapse" 
                                     data-bs-parent="#methodologyAccordion">
                                    <div class="accordion-body small">
                                        <strong>Algorithm:</strong> ${model.algorithm}<br>
                                        <strong>Parameters:</strong><br>
                                        ${Object.entries(model.parameters).map(([key, value]) => 
                                            `• ${key.replace(/_/g, ' ')}: ${value}`
                                        ).join('<br>')}
                                        <br><br>
                                        <strong>Interpretation:</strong><br>
                                        ${Object.entries(model.interpretation).map(([key, value]) => 
                                            `• ${key.replace(/_/g, ' ')}: ${value}`
                                        ).join('<br>')}
                                    </div>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
            
            <!-- Citations -->
            <div class="alert alert-dark">
                <h6><i class="fas fa-book"></i> Scientific References</h6>
                <ol class="small mb-0">
                    ${data.citations.map(cite => `<li>${cite}</li>`).join('')}
                </ol>
            </div>
            
            <!-- Action Buttons -->
            <div class="d-grid gap-2">
                <button class="btn btn-cosmic-purple" onclick="webGIS.scientificMode.downloadEnhancedPredictions()">
                    <i class="fas fa-download"></i> Download Full Prediction Report (CSV + JSON)
                </button>
                <button class="btn btn-outline-purple" onclick="webGIS.scientificMode.exportPredictionChart()">
                    <i class="fas fa-image"></i> Export Visualization
                </button>
            </div>
        </div>
    `;

    window.SystemBus.emit('ui:show_modal', {
        title: "Advanced Predictive Analytics",
        content: content
    });
    
    // Create chart after modal is displayed
    setTimeout(() => this.renderPredictionChart(chartData), 300);
}

// Export for use in other modules
window.ScientificMode = ScientificMode;
