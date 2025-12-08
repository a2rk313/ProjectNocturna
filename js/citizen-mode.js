// js/citizen-mode.js - ROBUST FALLBACK VERSION
class CitizenMode {
    constructor(webGIS) {
        this.webGIS = webGIS;
        this.observationSpots = [];
        this.userMarker = null;
    }

    initialize() {
        console.log('✅ Citizen mode initialized');
        this.setupCitizenTools();
        this.updateChatbotResponses();
    }

    setupCitizenTools() {
        this.setupButtonListener('findObservatories', () => this.findObservationSpots());
        this.setupButtonListener('moonPhase', () => this.showMoonPhase());
        this.setupButtonListener('weatherCheck', () => this.checkWeatherConditions());
    }

    setupButtonListener(id, handler) {
        const element = document.getElementById(id);
        if (element) element.addEventListener('click', handler);
    }

    // --- UPDATED: LOCATE USER WITH FALLBACK ---
    async locateUser() {
        return new Promise((resolve) => {
            // 1. Check if Geolocation exists
            if (!navigator.geolocation) {
                this.useDemoLocation(resolve, "Geolocation not supported");
                return;
            }

            this.webGIS.showMessage("📍 Requesting your location...");
            
            navigator.geolocation.getCurrentPosition(
                // A. SUCCESS
                (position) => {
                    const lat = position.coords.latitude;
                    const lng = position.coords.longitude;
                    this.zoomToLocation(lat, lng, "You Are Here");
                    resolve({ lat, lng });
                },
                // B. ERROR - Trigger Fallback
                (error) => {
                    console.warn("Location failed:", error);
                    let msg = "GPS unavailable.";
                    if(error.code === 1) msg = "Location permission denied.";
                    if(error.code === 2) msg = "Position unavailable (Check HTTPS).";
                    
                    this.useDemoLocation(resolve, `${msg} Using Demo Location.`);
                },
                { enableHighAccuracy: true, timeout: 8000 }
            );
        });
    }

    // New Helper: Use London as fallback so the tool ALWAYS zooms
    useDemoLocation(resolve, message) {
        this.webGIS.showMessage(`⚠️ ${message}`);
        // Default to London (Greenwich)
        const demoLat = 51.4769; 
        const demoLng = -0.0005; 
        
        setTimeout(() => {
            this.zoomToLocation(demoLat, demoLng, "Demo Location (London)");
            resolve({ lat: demoLat, lng: demoLng });
        }, 1000); // Small delay so user sees the error message first
    }

    // New Helper: Handle the Visual Zoom & Marker
    zoomToLocation(lat, lng, title) {
        // Remove old marker
        if (this.userMarker) this.webGIS.map.removeLayer(this.userMarker);

        // Add distinct marker
        this.userMarker = L.marker([lat, lng], {
            icon: L.divIcon({
                className: 'user-location-pulse',
                html: '<div style="width: 15px; height: 15px; background: #2196F3; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 15px #2196F3;"></div>',
                iconSize: [20, 20],
                iconAnchor: [10, 10]
            })
        }).addTo(this.webGIS.map).bindPopup(`<b>${title}</b>`);

        // ANIMATE ZOOM
        this.webGIS.map.flyTo([lat, lng], 13, {
            animate: true,
            duration: 2.0 // Slower animation for better effect
        });
    }

    // --- TOOL 1: FIND OBSERVATORIES ---
    async findObservationSpots() {
        const userLoc = await this.locateUser(); 
        const center = userLoc || this.webGIS.map.getCenter();

        this.webGIS.showMessage('🔭 Scanning for observatories (OSM)...');
        this.clearObservationSpots();
        
        // Search box (~50km)
        const offset = 0.5; 
        const query = `
            [out:json][timeout:25];
            (
              node["man_made"~"observatory|telescope"](${center.lat - offset},${center.lng - offset},${center.lat + offset},${center.lng + offset});
              way["man_made"~"observatory|telescope"](${center.lat - offset},${center.lng - offset},${center.lat + offset},${center.lng + offset});
            );
            out center;
        `;

        try {
            const response = await fetch('https://overpass-api.de/api/interpreter', { method: 'POST', body: query });
            if (!response.ok) throw new Error('API Error');
            const data = await response.json();

            if (data.elements.length === 0) {
                this.webGIS.showMessage('⚠️ No observatories found nearby. Showing famous spots.');
                this.loadFallbackObservatories();
                return;
            }

            data.elements.forEach(el => {
                const lat = el.lat || el.center.lat;
                const lon = el.lon || el.center.lon;
                const name = el.tags.name || "Unnamed Observatory";
                const marker = L.marker([lat, lon]).addTo(this.webGIS.map)
                    .bindPopup(`<h6>🔭 ${name}</h6><p>Real-time OSM Data</p>`);
                this.observationSpots.push(marker);
            });
            this.webGIS.showMessage(`✅ Found ${data.elements.length} locations.`);

        } catch (error) {
            console.error(error);
            this.loadFallbackObservatories();
        }
    }

    loadFallbackObservatories() {
        const observatories = [
            { name: 'Royal Observatory Greenwich', lat: 51.4769, lng: -0.0005 },
            { name: 'Mauna Kea', lat: 19.8236, lng: -155.4700 },
            { name: 'Paranal', lat: -24.6272, lng: -70.4042 }
        ];
        observatories.forEach(obs => {
            const marker = L.marker([obs.lat, obs.lng]).addTo(this.webGIS.map)
                .bindPopup(`<h6>${obs.name}</h6><p>Famous Location</p>`);
            this.observationSpots.push(marker);
        });
    }

    // --- TOOL 2: WEATHER CHECK ---
    async checkWeatherConditions() {
        const userLoc = await this.locateUser();
        const center = userLoc || this.webGIS.map.getCenter();
        
        this.webGIS.showMessage('☁️ Fetching local weather (Open-Meteo)...');
        
        try {
            const response = await fetch(
                `https://api.open-meteo.com/v1/forecast?latitude=${center.lat}&longitude=${center.lng}&current=temperature_2m,relative_humidity_2m,cloud_cover,wind_speed_10m,visibility&daily=sunrise,sunset&timezone=auto`
            );
            
            if (!response.ok) throw new Error('Weather API unavailable');

            const data = await response.json();
            const current = data.current;

            const weather = {
                clouds: current.cloud_cover,
                windSpeed: current.wind_speed_10m,
                visibility: (current.visibility / 1000).toFixed(1),
                humidity: current.relative_humidity_2m,
                temperature: current.temperature_2m,
                quality: this.calculateWeatherQuality(current.cloud_cover, current.visibility),
                recommendation: this.getWeatherRecommendation(current.cloud_cover)
            };
            
            this.displayWeatherPanel(weather);

        } catch (error) {
            console.error('Weather error:', error);
            this.webGIS.showMessage('⚠️ Weather data unavailable.');
        }
    }

    calculateWeatherQuality(clouds, visibility) {
        if (clouds < 15 && visibility > 20000) return 'Excellent';
        if (clouds < 40) return 'Good';
        if (clouds < 75) return 'Fair';
        return 'Poor';
    }

    getWeatherRecommendation(clouds) {
        if (clouds < 20) return 'Perfect conditions!';
        if (clouds < 50) return 'Good conditions.';
        return 'Too cloudy for observation.';
    }

    displayWeatherPanel(weather) {
        const analysisContent = `
            <h6>🌤️ Local Weather (${this.userMarker ? 'GPS/Demo' : 'Map Center'})</h6>
            <div class="row text-center">
                <div class="col-4">
                    <div style="font-size: 2rem;">${weather.clouds < 20 ? '☀️' : '☁️'}</div>
                    <small>Cloud Cover</small><p><strong>${weather.clouds}%</strong></p>
                </div>
                <div class="col-4">
                    <div style="font-size: 2rem;">💨</div>
                    <small>Wind</small><p><strong>${weather.windSpeed} km/h</strong></p>
                </div>
                <div class="col-4">
                    <div style="font-size: 2rem;">🌡️</div>
                    <small>Temp</small><p><strong>${weather.temperature}°C</strong></p>
                </div>
            </div>
            <div class="mt-2 text-center">
                <span class="badge bg-${weather.quality === 'Excellent' ? 'success' : weather.quality === 'Good' ? 'info' : 'warning'}">${weather.quality}</span>
                <p class="mt-2 text-muted"><small>${weather.recommendation}</small></p>
            </div>
        `;
        this.webGIS.showAnalysisPanel('Weather Conditions', analysisContent);
    }

    showMoonPhase() {
        // ... previous moon phase logic ...
        // Re-paste standard moon phase logic if needed, or keep existing
        const currentDate = new Date();
        const moonPhase = this.calculateMoonPhase(currentDate);
        this.webGIS.showAnalysisPanel('Moon Phase', `<h6>🌙 ${moonPhase.phase}</h6><p>Illumination: ${moonPhase.illumination}%</p>`);
    }

    calculateMoonPhase(date) {
        // Simplified Logic
        const daysInLunarCycle = 29.53;
        const knownNewMoon = new Date('2023-11-13');
        const daysSinceNewMoon = (date - knownNewMoon) / (1000 * 60 * 60 * 24);
        const pos = (daysSinceNewMoon % daysInLunarCycle) / daysInLunarCycle;
        if(pos < 0.03 || pos > 0.97) return { phase: 'New Moon', illumination: '0-2' };
        if(pos < 0.5) return { phase: 'Waxing', illumination: '50+' };
        return { phase: 'Waning', illumination: '50-' };
    }

    viewObservatoryDetails(lat, lng) { this.webGIS.showMessage(`📍 Observatory at ${lat.toFixed(2)}, ${lng.toFixed(2)}`); }
    clearObservationSpots() {
        this.observationSpots.forEach(spot => this.webGIS.map.removeLayer(spot));
        this.observationSpots = [];
    }
    updateChatbotResponses() { /* ... */ }
}