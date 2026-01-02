/**
 * DataManager - Handles data fetching and processing.
 * UPDATED: Uses Node.js/PostGIS Backend + GeoServer WMS
 */
export class DataManager {
    constructor(webGIS) {
        this.webGIS = webGIS;
        this.apiBaseUrl = 'http://localhost:3000/api'; // Backend URL
        this.stationsLayer = L.layerGroup(); // Initialize layer group
    }

    // --- NEW FUNCTION REQUIRED BY WEBGIS.JS ---
    async loadStationsLayer(map) {
        console.log("🌍 Loading stations from Database...");
        
        try {
            const response = await fetch(`${this.apiBaseUrl}/stations`);
            if (!response.ok) throw new Error('Network response was not ok');
            
            const stations = await response.json();

            // Clear previous layers
            this.stationsLayer.clearLayers();

            stations.forEach(station => {
                // Color code based on SQM
                const sqm = parseFloat(station.sqm);
                let color = '#ff0000'; // Poor
                if (sqm > 21) color = '#00ff00'; // Excellent
                else if (sqm > 19) color = '#ffff00'; // Fair

                const marker = L.circleMarker([station.lat, station.lng], {
                    radius: 5,
                    fillColor: color,
                    color: "#000",
                    weight: 1,
                    opacity: 1,
                    fillOpacity: 0.8
                });

                marker.bindPopup(`
                    <strong>Sky Quality Meter</strong><br>
                    <b>SQM:</b> ${sqm}<br>
                    <b>Mag:</b> ${station.mag || 'N/A'}<br>
                    <b>Date:</b> ${station.date_observed}
                `);

                marker.addTo(this.stationsLayer);
            });

            // Add to map
            this.stationsLayer.addTo(map);
            console.log(`✅ Loaded ${stations.length} stations.`);
            
        } catch (error) {
            console.error("❌ Error loading stations:", error);
        }
    }

    // --- REQUIREMENT 4: LAYER FROM GEOSERVER ---
    async loadGeoServerLayer() {
        console.log('🌍 Loading WMS layer from GeoServer...');
        
        try {
            const wmsLayer = L.tileLayer.wms('http://localhost:8080/geoserver/nocturna/wms', {
                layers: 'nocturna:dark_sky_parks', 
                format: 'image/png',
                transparent: true,
                version: '1.1.0',
                attribution: 'GeoServer Local Layer',
                zIndex: 400
            });
            return wmsLayer;
        } catch (e) {
            console.error("GeoServer WMS Failed:", e);
            return null;
        }
    }

    // --- REQUIREMENT 3: DATA FROM POSTGIS ---
    async getDataAtPoint(lat, lng) {
        try {
            const response = await fetch(`${this.apiBaseUrl}/measurement?lat=${lat}&lng=${lng}`);
            if (!response.ok) throw new Error('DB Error');
            
            const dbData = await response.json();
            
            let elevation = dbData.elevation + " m";
            try {
                const elevResp = await fetch(`https://api.open-meteo.com/v1/elevation?latitude=${lat}&longitude=${lng}`);
                const elevJson = await elevResp.json();
                if (elevJson.elevation && elevJson.elevation.length > 0) elevation = elevJson.elevation[0] + " m";
            } catch(e) {}

            return {
                light_pollution: {
                    sqm: dbData.sqm,
                    bortle: this.sqmToBortle(dbData.sqm),
                    limiting_mag: dbData.mag,
                    source: "PostGIS Database (Realtime)"
                },
                location: {
                    lat: lat,
                    lng: lng,
                    elevation: elevation,
                    nearest_observation_km: parseFloat(dbData.distance_km).toFixed(2)
                },
                metadata: {
                    date_observed: dbData.date_observed,
                    constellation: dbData.constellation,
                    comment: dbData.comment
                }
            };
        } catch (error) {
            console.error(error);
            return { 
                error: "Database unavailable.",
                location: { lat, lng, elevation: "N/A" }
            };
        }
    }

    // Kept for backward compatibility if needed
    async loadGroundMeasurements() {
        return this.loadStationsLayer(this.webGIS.map);
    }

    async loadVIIRSTileLayer() {
        return L.tileLayer('https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/VIIRS_CityLights_2012/default/2012-01-01/GoogleMapsCompatible_Level8/{z}/{y}/{x}.jpg', {
            attribution: 'Imagery © NASA/GSFC', opacity: 0.8
        });
    }

    async loadWorldAtlasLayer() {
        return L.tileLayer('https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/VIIRS_Black_Marble/default/2016-01-01/GoogleMapsCompatible_Level8/{z}/{y}/{x}.jpg', {
            attribution: 'NASA Black Marble', opacity: 1.0
        });
    }

    async loadHeatmapLayer() {
        const bounds = this.webGIS.map.getBounds();
        const points = [];
        const north = bounds.getNorth(); const south = bounds.getSouth();
        const east = bounds.getEast(); const west = bounds.getWest();
        
        for (let i = 0; i < 150; i++) {
            const lat = south + Math.random() * (north - south);
            const lng = west + Math.random() * (east - west);
            const intensity = Math.random();
            points.push([lat, lng, intensity]);
        }
        return L.heatLayer(points, { radius: 25, blur: 15, maxZoom: 12, minOpacity: 0.3 });
    }

    sqmToBortle(sqm) {
        if (!sqm) return "Unknown";
        if (sqm >= 21.99) return "1 (Excellent)";
        if (sqm >= 21.89) return "2 (Typical)";
        if (sqm >= 21.69) return "3 (Rural)";
        if (sqm >= 20.49) return "4 (Rural/Suburban)";
        if (sqm >= 19.50) return "5 (Suburban)";
        if (sqm >= 18.94) return "6 (Bright Suburban)";
        if (sqm >= 18.38) return "7 (Suburban/Urban)";
        if (sqm >= 17.80) return "8 (City)";
        return "9 (Inner City)";
    }
}