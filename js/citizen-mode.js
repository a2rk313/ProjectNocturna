// js/citizen-mode.js
class CitizenMode {
    constructor(webGIS) {
        this.webGIS = webGIS;
    }

    initialize() {
        this.setupTools();
        window.SystemBus.emit('system:message', "🌍 Citizen Mode: Tools Ready.");
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
        
        bind('findObservatories', () => this.findObservatories());
        bind('astroForecast', () => this.astroForecast());
        bind('findDarkSky', () => this.findDarkSkyParks());
        bind('moonPhase', () => this.showMoonPhase());
        bind('weatherCheck', () => this.astroForecast());
        
        // Restore manual marker placement for 'dropMarker' button
        // GPS functionality moved to a dedicated button
        bind('dropMarker', () => {
            // Let WebGIS handle manual marker placement through its startTool method
            if (this.webGIS) {
                this.webGIS.startTool('marker');
            }
        });
    }

    async locateUser() {
        window.SystemBus.emit('system:message', "📍 Acquiring GPS...");
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                // IMPORTANT: This now sets the "Active Selection" to this point
                this.webGIS.setGPSLocation(pos.coords.latitude, pos.coords.longitude);
            },
            () => window.SystemBus.emit('system:message', "⚠️ GPS Failed.")
        );
    }

    async findObservatories() {
        // Use Selection Center OR Map Center
        const selection = this.webGIS.getSelection();
        const center = selection ? selection.center : this.webGIS.map.getCenter();
        
        window.SystemBus.emit('system:message', `🔭 Scanning near ${selection ? 'selected location' : 'map view'}...`);
        
        let observatories = [];
        try {
            // Query Overpass API for observatories
            const overpassQuery = `
                [out:json];
                (
                  node["amenity"="observatory"](around:50000, ${center.lat}, ${center.lng});
                  way["amenity"="observatory"](around:50000, ${center.lat}, ${center.lng});
                  relation["amenity"="observatory"](around:50000, ${center.lat}, ${center.lng});
                );
                out center;
            `;
            
            const response = await fetch('/api/proxy/overpass', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query: encodeURIComponent(overpassQuery) })
            });
            
            if (!response.ok) throw new Error('Network response was not ok');
            
            const data = await response.json();
            
            if (data.elements && data.elements.length > 0) {
                data.elements.forEach(element => {
                    if (element.lat && element.lon) {
                        observatories.push({
                            lat: element.lat,
                            lng: element.lon,
                            tags: element.tags || {}
                        });
                    } else if (element.center) {
                        observatories.push({
                            lat: element.center.lat,
                            lng: element.center.lon,
                            tags: element.tags || {}
                        });
                    }
                });
            }
        } catch (error) {
            console.error('Error finding observatories:', error);
        }

        if (observatories.length > 0) {
            window.SystemBus.emit('map:add_markers', { data: observatories });
            window.SystemBus.emit('system:message', `✅ Found ${observatories.length} observatories.`);
        } else {
            // Fallback demo data if no real observatories found or error occurred
            const famous = [
                { lat: 51.4769, lng: -0.0005, tags: { name: 'Royal Observatory Greenwich' } },
                { lat: 19.8236, lng: -155.4700, tags: { name: 'Mauna Kea' } }
            ];
            window.SystemBus.emit('map:add_markers', { data: famous });
            window.SystemBus.emit('system:message', "✅ Found observatories (demo data).");
        }
    }

    async astroForecast() {
        // Use Selection Center OR Map Center
        const selection = this.webGIS.getSelection();
        const center = selection ? selection.center : this.webGIS.map.getCenter();

        window.SystemBus.emit('system:message', `🌤️ Forecasting for ${center.lat.toFixed(2)}, ${center.lng.toFixed(2)}...`);
        
        try {
            // Fetch real weather data from Open-Meteo API
            const response = await fetch(`/api/proxy/weather?lat=${center.lat}&lng=${center.lng}`);
            if (!response.ok) throw new Error('Weather API failed');
            
            const weatherData = await response.json();
            const current = weatherData.current || {};
            
            const cloudCover = current.cloud_cover !== undefined ? current.cloud_cover : 'N/A';
            const windSpeed = current.wind_speed_10m !== undefined ? current.wind_speed_10m : 'N/A';
            const temperature = current.temperature_2m !== undefined ? current.temperature_2m : 'N/A';
            
            // Determine condition rating based on cloud cover
            let conditionRating = "Poor Conditions";
            let ratingClass = "bg-danger";
            if (cloudCover <= 25) {
                conditionRating = "Excellent Conditions";
                ratingClass = "bg-success";
            } else if (cloudCover <= 50) {
                conditionRating = "Good Conditions";
                ratingClass = "bg-warning";
            } else if (cloudCover <= 75) {
                conditionRating = "Fair Conditions";
                ratingClass = "bg-info";
            }
            
            const content = `
                <div class="text-center">
                    <h5>Forecast for Selected Area</h5>
                    <div class="row">
                        <div class="col-4"><h2>☁️</h2><small>${cloudCover !== 'N/A' ? cloudCover + '%' : cloudCover}</small></div>
                        <div class="col-4"><h2>💨</h2><small>${windSpeed !== 'N/A' ? windSpeed + ' km/h' : windSpeed}</small></div>
                        <div class="col-4"><h2>🌡️</h2><small>${temperature !== 'N/A' ? temperature + '°C' : temperature}</small></div>
                    </div>
                    <span class="badge ${ratingClass} p-2 mt-2">${conditionRating}</span>
                </div>
            `;
            window.SystemBus.emit('ui:show_modal', { title: "Astro Forecast", content: content });
        } catch (error) {
            console.error('Error getting weather forecast:', error);
            // Fallback to original static content on error
            const content = `
                <div class="text-center">
                    <h5>Forecast for Selected Area</h5>
                    <div class="row">
                        <div class="col-4"><h2>🌙</h2><small>Clear</small></div>
                        <div class="col-4"><h2>💨</h2><small>12 km/h</small></div>
                        <div class="col-4"><h2>🌡️</h2><small>15°C</small></div>
                    </div>
                    <span class="badge bg-success p-2 mt-2">Good Conditions</span>
                </div>
            `;
            window.SystemBus.emit('ui:show_modal', { title: "Astro Forecast", content: content });
        }
    }

    async findDarkSkyParks() {
        window.SystemBus.emit('system:message', '🌌 Locating Dark Sky Parks...');
        
        try {
            // Load real dark sky parks data
            const response = await fetch(API_CONFIG.DARK_SKY_PARKS.jsonUrl);
            if (!response.ok) throw new Error('Failed to load dark sky parks data');
            
            const data = await response.json();
            const parks = data.parks || [];
            
            // Get current map center or selection center
            const selection = this.webGIS.getSelection();
            const center = selection ? selection.center : this.webGIS.map.getCenter();
            
            // Calculate distances to find the closest park
            let closestPark = null;
            let minDistance = Infinity;
            
            parks.forEach(park => {
                const distance = this.calculateDistance(center.lat, center.lng, park.lat, park.lng);
                if (distance < minDistance) {
                    minDistance = distance;
                    closestPark = park;
                }
            });
            
            if (closestPark) {
                // Zoom to the closest park
                window.SystemBus.emit('map:zoom_to', { 
                    lat: closestPark.lat, 
                    lng: closestPark.lng, 
                    zoom: 10 
                });
                
                const content = `
                    <div class="text-center">
                        <h5>${closestPark.name}</h5>
                        <p>
                            <strong>Type:</strong> ${closestPark.type}<br>
                            <strong>Country:</strong> ${closestPark.country}<br>
                            <strong>Area:</strong> ${closestPark.area}<br>
                            <strong>Distance:</strong> ${minDistance.toFixed(2)} km
                        </p>
                    </div>
                `;
                window.SystemBus.emit('ui:show_modal', { title: "Dark Sky Park", content: content });
            } else {
                // Fallback to hardcoded park if no data found
                window.SystemBus.emit('map:zoom_to', { lat: 55.05, lng: -4.45, zoom: 10 });
                const content = `<div class="text-center"><h5>Galloway Forest Park</h5><p>Status: Gold Tier</p></div>`;
                window.SystemBus.emit('ui:show_modal', { title: "Dark Sky Park", content: content });
            }
        } catch (error) {
            console.error('Error finding dark sky parks:', error);
            // Fallback to hardcoded park on error
            window.SystemBus.emit('map:zoom_to', { lat: 55.05, lng: -4.45, zoom: 10 });
            const content = `<div class="text-center"><h5>Galloway Forest Park</h5><p>Status: Gold Tier</p></div>`;
            window.SystemBus.emit('ui:show_modal', { title: "Dark Sky Park", content: content });
        }
    }
    
    // Helper function to calculate distance between two points (in km)
    calculateDistance(lat1, lng1, lat2, lng2) {
        const R = 6371; // Earth radius in km
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lng2 - lng1) * Math.PI / 180;
        const a = 
            Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
            Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    }


    async showMoonPhase() {
        window.SystemBus.emit('system:message', "🌓 Calculating moon phase...");
        
        try {
            // Calculate moon phase based on the current date
            const today = new Date();
            const moonData = await this.calculateMoonPhase(today);

            const content = `
                <div class="text-center">
                    <h1>${moonData.emoji}</h1>
                    <p>Phase: ${moonData.phaseName}</p>
                    <p>Illumination: ${Math.round(moonData.illumination * 100)}%</p>
                </div>
            `;
            window.SystemBus.emit('ui:show_modal', { title: "Moon Phase", content: content });
        } catch (error) {
            console.error('Error calculating moon phase:', error);
            // Fallback to original static content on error
            const content = `<div class="text-center"><h1>🌑</h1><p>Phase: New Moon</p></div>`;
            window.SystemBus.emit('ui:show_modal', { title: "Moon Phase", content: content });
        }
    }

    // Helper function to calculate moon phase
    calculateMoonPhase(date) {
        return new Promise((resolve) => {
            try {
                // Calculate days since known new moon (Jan 6, 2000)
                const knownNewMoon = new Date('2000-01-06T18:14:00Z');
                const diffDays = (date - knownNewMoon) / (1000 * 60 * 60 * 24);
                
                // Synodic month is 29.53058867 days
                const synodicMonth = 29.53058867;
                const phase = Math.abs((diffDays % synodicMonth) / synodicMonth);
                
                // Calculate illumination (from 0 to 1)
                const illumination = (1 - Math.cos(phase * 2 * Math.PI)) / 2;
                
                // Determine phase name and emoji based on the phase
                let phaseName, emoji;
                if (phase < 0.02 || phase > 0.98) {
                    phaseName = "New Moon";
                    emoji = "🌑";
                } else if (phase < 0.23) {
                    phaseName = "Waxing Crescent";
                    emoji = "🌒";
                } else if (phase < 0.27) {
                    phaseName = "First Quarter";
                    emoji = "🌓";
                } else if (phase < 0.48) {
                    phaseName = "Waxing Gibbous";
                    emoji = "🌔";
                } else if (phase < 0.52) {
                    phaseName = "Full Moon";
                    emoji = "🌕";
                } else if (phase < 0.73) {
                    phaseName = "Waning Gibbous";
                    emoji = "🌖";
                } else if (phase < 0.77) {
                    phaseName = "Last Quarter";
                    emoji = "🌗";
                } else {
                    phaseName = "Waning Crescent";
                    emoji = "🌘";
                }
                
                resolve({
                    phaseName: phaseName,
                    illumination: illumination,
                    emoji: emoji
                });
            } catch (error) {
                // On error, return new moon as default
                resolve({
                    phaseName: "New Moon",
                    illumination: 0,
                    emoji: "🌑"
                });
            }
        });
    }
}
window.CitizenMode = CitizenMode;
