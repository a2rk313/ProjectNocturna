class CitizenMode {
    constructor(webGIS) {
        this.webGIS = webGIS;
    }

    initialize() {
        this.setupTools();
        window.SystemBus.emit('system:message', "🌍 Citizen Mode: Ready to explore.");
    }

    setupTools() {
        console.log('🔧 Setting up Citizen Mode tools...');
        
        const bind = (id, fn) => { 
            const el = document.getElementById(id); 
            console.log(`🔍 Looking for element: ${id}`, el);
            if(el) {
                // Remove existing listeners
                const newEl = el.cloneNode(true);
                el.parentNode.replaceChild(newEl, el);
                
                // Add new listener
                newEl.addEventListener('click', (e) => {
                    console.log(`🖱️ Button clicked: ${id}`);
                    e.preventDefault();
                    e.stopPropagation();
                    fn();
                });
                console.log(`✅ Bound listener to: ${id}`);
            } else {
                console.warn(`❌ Element not found: ${id}`);
            }
        };
        
        bind('findObservatories', () => this.findObservatories());
        bind('astroForecast', () => this.astroForecast());
        bind('dropMarker', () => this.locateUser()); // Mapped 'Pick Location' to Locate User
        
        console.log('🎯 Citizen Mode tools setup complete');
    }

    // --- RESTORED: LOCATE USER WITH FALLBACK ---
    async locateUser() {
        window.SystemBus.emit('system:message', "📍 Requesting GPS...");
        
        if (!navigator.geolocation) {
            this.useDemoLocation("Geolocation not supported");
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (pos) => {
                window.SystemBus.emit('map:zoom_to', { lat: pos.coords.latitude, lng: pos.coords.longitude, zoom: 13 });
                window.SystemBus.emit('system:message', "✅ Location found.");
            },
            (err) => {
                console.warn(err);
                this.useDemoLocation("GPS Error. Using Demo Location.");
            },
            { timeout: 5000 }
        );
    }

    useDemoLocation(msg) {
        window.SystemBus.emit('system:message', `⚠️ ${msg}`);
        // Default to London (Greenwich) as per your stable code
        setTimeout(() => {
            window.SystemBus.emit('map:zoom_to', { lat: 51.4769, lng: -0.0005, zoom: 13 });
        }, 1000);
    }

    // --- RESTORED: OBSERVATORIES WITH FALLBACK ---
    async findObservatories() {
        window.SystemBus.emit('system:message', '🔭 Scanning for observatories...');
        const center = this.webGIS.map.getCenter();
        const query = `[out:json][timeout:25];(node["man_made"~"observatory|telescope"](${center.lat - 1},${center.lng - 1},${center.lat + 1},${center.lng + 1}););out center;`;

        try {
            const response = await fetch('/api/proxy/overpass', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query })
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                throw new Error('Invalid response format: Expected JSON');
            }

            const data = await response.json();
            
            if (!data.elements || data.elements.length === 0) {
                window.SystemBus.emit('system:message', '⚠️ No results. Showing famous spots.');
                this.loadFallbackObservatories();
                return;
            }

            window.SystemBus.emit('map:add_markers', { data: data.elements });
            window.SystemBus.emit('system:message', `✅ Found ${data.elements.length} observatories!`);
        } catch (error) {
            console.error('Observatory search error:', error);
            window.SystemBus.emit('system:message', `⚠️ Search failed: ${error.message}. Showing fallback locations.`);
            this.loadFallbackObservatories();
        }
    }

    loadFallbackObservatories() {
        // Data from your stable code
        const famous = [
            { lat: 51.4769, lng: -0.0005, tags: { name: 'Royal Observatory Greenwich' } },
            { lat: 19.8236, lng: -155.4700, tags: { name: 'Mauna Kea' } },
            { lat: -24.6272, lng: -70.4042, tags: { name: 'Paranal Observatory' } }
        ];
        window.SystemBus.emit('map:add_markers', { data: famous });
    }

    // --- RESTORED: DETAILED WEATHER UI ---
    async astroForecast() {
        const center = this.webGIS.map.getCenter();
        window.SystemBus.emit('system:message', '🌤️ Checking weather...');

        try {
            const response = await fetch(`/api/proxy/weather?lat=${center.lat}&lng=${center.lng}`);
            const data = await response.json();
            const current = data.current;

            // Restored Logic
            const quality = current.cloud_cover < 20 ? 'Excellent' : current.cloud_cover < 50 ? 'Good' : 'Poor';
            const moonPhase = "Visible"; // Simplified

            // Restored HTML Template
            const content = `
                <div class="text-center">
                    <div class="row">
                        <div class="col-4"><h2>${current.cloud_cover < 20 ? '☀️' : '☁️'}</h2><small>Clouds: ${current.cloud_cover}%</small></div>
                        <div class="col-4"><h2>💨</h2><small>Wind: ${current.wind_speed_10m || 0} km/h</small></div>
                        <div class="col-4"><h2>🌡️</h2><small>Temp: ${current.temperature_2m}°C</small></div>
                    </div>
                    <hr>
                    <span class="badge bg-${quality === 'Excellent' ? 'success' : 'warning'} p-2">${quality} Conditions</span>
                </div>
            `;

            window.SystemBus.emit('ui:show_modal', { title: "Astro Forecast", content: content });
        } catch (e) {
            window.SystemBus.emit('system:message', '⚠️ Weather unavailable.');
        }
    }
}

// Make available globally
window.CitizenMode = CitizenMode;