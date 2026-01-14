    async loadVIIRSDataLayer(year = '2023') {
        try {
            // Load VIIRS data for current view
            const bounds = this.map.getBounds();
            const bbox = `${bounds.getWest()},${bounds.getSouth()},${bounds.getEast()},${bounds.getNorth()}`;

            // Construct API endpoint with year parameter
            const response = await fetch(`/api/viirs/${year}?bbox=${bbox}`);

            if (!response.ok) {
                // Log the error but continue with fallback
                console.warn(`VIIRS API request failed with status ${response.status}:`, response.statusText);
                
                // Try to use the NASA public VIIRS tile layer as a fallback
                if (typeof L.tileLayer !== 'undefined') {
                    // Remove existing VIIRS layer if present
                    if (this.viirsLayer) {
                        this.map.removeLayer(this.viirsLayer);
                    }

                    // Use NASA's public VIIRS tile layer
                    this.viirsLayer = L.tileLayer('https://map1.vis.earthdata.nasa.gov/wmts-webmerc/VIIRS_CityLights_2012/default/GoogleMapsCompatible_Level8/{z}/{y}/{x}.jpg', {
                        attribution: 'NASA Earth Observatory, VIIRS Day/Night Band',
                        opacity: 0.6,
                        maxZoom: 8
                    }).addTo(this.map);

                    console.log(`✅ Loaded VIIRS tile layer as fallback`);
                }
                return;
            }

            let data;
            try {
                const responseText = await response.text();
                data = JSON.parse(responseText);
            } catch (parseError) {
                console.error('VIIRS data JSON parsing error:', parseError);
                console.log('Raw response:', await response.text());
                
                // Use tile layer as fallback
                if (typeof L.tileLayer !== 'undefined') {
                    if (this.viirsLayer) {
                        this.map.removeLayer(this.viirsLayer);
                    }

                    this.viirsLayer = L.tileLayer('https://map1.vis.earthdata.nasa.gov/wmts-webmerc/VIIRS_CityLights_2012/default/GoogleMapsCompatible_Level8/{z}/{y}/{x}.jpg', {
                        attribution: 'NASA Earth Observatory, VIIRS Day/Night Band',
                        opacity: 0.6,
                        maxZoom: 8
                    }).addTo(this.map);

                    console.log(`✅ Loaded VIIRS tile layer as fallback after parsing error`);
                }
                return;
            }

            const viirsData = data.data || [];
            console.log(`📡 VIIRS API Response: ${viirsData.length} data points, source: ${data.source}, year: ${year}`);

            if (viirsData.length > 0) {
                // Create heatmap layer if leaflet.heat plugin is available
                if (typeof L.heatLayer !== 'function') {
                    console.warn('VIIRS data load failed: L.heatLayer function not available');
                    
                    // Fallback to tile layer
                    if (typeof L.tileLayer !== 'undefined') {
                        if (this.viirsLayer) {
                            this.map.removeLayer(this.viirsLayer);
                        }

                        this.viirsLayer = L.tileLayer('https://map1.vis.earthdata.nasa.gov/wmts-webmerc/VIIRS_CityLights_2012/default/GoogleMapsCompatible_Level8/{z}/{y}/{x}.jpg', {
                            attribution: 'NASA Earth Observatory, VIIRS Day/Night Band',
                            opacity: 0.6,
                            maxZoom: 8
                        }).addTo(this.map);

                        console.log(`✅ Loaded VIIRS tile layer as fallback`);
                    }
                    return;
                }

                // Filter out any points that don't have valid coordinates or brightness
                const validData = viirsData.filter(point =>
                    point.lat && point.lng && point.brightness !== undefined &&
                    !isNaN(point.lat) && !isNaN(point.lng) && !isNaN(point.brightness)
                );

                if (validData.length > 0) {
                    // Create heat data with weighted values based on brightness
                    const heatData = validData.map(point => [point.lat, point.lng, point.brightness]);

                    // Remove existing VIIRS layer if present
                    if (this.viirsLayer) {
                        this.map.removeLayer(this.viirsLayer);
                    }

                    this.viirsLayer = L.heatLayer(heatData, {
                        radius: 20,
                        blur: 15,
                        maxZoom: 12,
                        minOpacity: 0.3,
                        gradient: {
                            0.1: '#000080',   // Deep blue for low values
                            0.3: '#0000FF',   // Blue
                            0.5: '#0080FF',   // Light blue
                            0.6: '#00FFFF',   // Cyan
                            0.7: '#00FF00',   // Green
                            0.8: '#FFFF00',   // Yellow
                            0.9: '#FF8000',   // Orange
                            1.0: '#FF0000'    // Red for high values
                        }
                    }).addTo(this.map);

                    console.log(`✅ Loaded ${validData.length} valid VIIRS data points for year ${year}`);
                } else {
                    console.log('⚠️ No valid VIIRS data points available for current map view.');
                    
                    // Load tile layer as fallback
                    if (typeof L.tileLayer !== 'undefined') {
                        if (this.viirsLayer) {
                            this.map.removeLayer(this.viirsLayer);
                        }

                        this.viirsLayer = L.tileLayer('https://map1.vis.earthdata.nasa.gov/wmts-webmerc/VIIRS_CityLights_2012/default/GoogleMapsCompatible_Level8/{z}/{y}/{x}.jpg', {
                            attribution: 'NASA Earth Observatory, VIIRS Day/Night Band',
                            opacity: 0.6,
                            maxZoom: 8
                        }).addTo(this.map);

                        console.log(`✅ Loaded VIIRS tile layer as fallback`);
                    }
                }
            } else {
                console.log('⚠️ No VIIRS data available for current map view.');
                
                // Load tile layer as fallback
                if (typeof L.tileLayer !== 'undefined') {
                    if (this.viirsLayer) {
                        this.map.removeLayer(this.viirsLayer);
                    }

                    this.viirsLayer = L.tileLayer('https://map1.vis.earthdata.nasa.gov/wmts-webmerc/VIIRS_CityLights_2012/default/GoogleMapsCompatible_Level8/{z}/{y}/{x}.jpg', {
                        attribution: 'NASA Earth Observatory, VIIRS Day/Night Band',
                        opacity: 0.6,
                        maxZoom: 8
                    }).addTo(this.map);

                    console.log(`✅ Loaded VIIRS tile layer as fallback`);
                }
            }
        } catch (error) {
            console.warn('VIIRS data load failed (network error):', error);
            
            // Use tile layer as fallback
            if (typeof L.tileLayer !== 'undefined') {
                if (this.viirsLayer) {
                    this.map.removeLayer(this.viirsLayer);
                }

                this.viirsLayer = L.tileLayer('https://map1.vis.earthdata.nasa.gov/wmts-webmerc/VIIRS_CityLights_2012/default/GoogleMapsCompatible_Level8/{z}/{y}/{x}.jpg', {
                    attribution: 'NASA Earth Observatory, VIIRS Day/Night Band',
                    opacity: 0.6,
                    maxZoom: 8
                }).addTo(this.map);

                console.log(`✅ Loaded VIIRS tile layer as fallback after network error`);
            }
        }
    }