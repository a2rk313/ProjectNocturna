/**
 * Citizen Mode Logic
 * Updated: Uses Server Proxy & Event Bus Architecture
 */
export class CitizenMode {
    constructor(webGIS) {
        this.webGIS = webGIS; // Keep reference for map center, but use Bus for actions
        this.userMarker = null;
    }

    initialize() {
        console.log('✅ Citizen mode initialized');
        this.setupTools();
    }

    setupTools() {
        const bind = (id, fn) => { 
            const el = document.getElementById(id); 
            if(el) el.addEventListener('click', fn); 
        };
        
        bind('findObservatories', () => this.findObservatories());
        bind('astroForecast', () => this.astroForecast());
        bind('locateUser', () => this.locateUser());
    }

    // --- TOOL: LOCATE USER ---
    async locateUser() {
        window.SystemBus.emit('system:message', "📍 Requesting location...");
        
        if (!navigator.geolocation) {
            window.SystemBus.emit('system:message', "⚠️ Geolocation not supported");
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const { latitude, longitude } = pos.coords;
                // Emit event to map to zoom to this location
                window.SystemBus.emit('map:zoom_to', { lat: latitude, lng: longitude });
                window.SystemBus.emit('system:message', "✅ Location found.");
            },
            () => {
                window.SystemBus.emit('system:message', "⚠️ GPS unavailable.");
            }
        );
    }

    // --- TOOL: FIND OBSERVATORIES (via PROXY) ---
    async findObservatories() {
        const center = this.webGIS.map.getCenter();
        window.SystemBus.emit('system:message', '🔭 Scanning via Secure Proxy...');

        // Overpass QL Query
        const query = `[out:json][timeout:25];(node["man_made"~"observatory|telescope"](${center.lat - 1},${center.lng - 1},${center.lat + 1},${center.lng + 1}););out center;`;

        try {
            // CALL SERVER PROXY (Bypasses CORS)
            const response = await fetch('/api/proxy/overpass', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query })
            });
            
            const data = await response.json();
            
            // Decoupled: Send data to WebGIS to draw
            window.SystemBus.emit('map:add_markers', { 
                data: data.elements,
                type: 'observatory' 
            });
            window.SystemBus.emit('system:message', `✅ Found ${data.elements.length} observatories.`);
            
        } catch (e) {
            console.error(e);
            window.SystemBus.emit('system:message', '⚠️ Proxy Error. Try again.');
        }
    }

    // --- TOOL: ASTRO FORECAST (via PROXY & MATH) ---
    async astroForecast() {
        const center = this.webGIS.map.getCenter();
        window.SystemBus.emit('system:message', '🌤️ Fetching weather...');

        try {
            // Call Weather Proxy
            const response = await fetch(`/api/proxy/weather?lat=${center.lat}&lng=${center.lng}`);
            const weather = await response.json();
            
            // Accurate Moon Phase Math (Conway's Algorithm)
            const moonAge = this.getMoonAge(new Date());
            const phaseName = moonAge < 2 || moonAge > 28 ? "New Moon 🌑" : 
                              moonAge > 13 && moonAge < 17 ? "Full Moon 🌕" : "Visible 🌓";

            // Generate HTML Report
            const cloudCover = weather.current.cloud_cover || 0;
            const quality = cloudCover < 20 ? "Excellent" : cloudCover < 50 ? "Fair" : "Poor";
            
            const content = `
                <div style="text-align:center">
                    <h3>${quality} Stargazing</h3>
                    <p>☁️ Cloud Cover: <strong>${cloudCover}%</strong></p>
                    <p>🌑 Moon Phase: <strong>${phaseName}</strong></p>
                </div>
            `;

            // Show UI via Event Bus
            window.SystemBus.emit('ui:show_modal', { 
                title: "Astro Forecast", 
                content: content 
            });

        } catch (e) {
            console.error(e);
            window.SystemBus.emit('system:message', '⚠️ Weather service unavailable.');
        }
    }

    // Helper: Conway's Moon Phase Algorithm (Valid for any date)
    getMoonAge(date) {
        let year = date.getFullYear();
        let month = date.getMonth() + 1;
        let day = date.getDate();
        if (month < 3) { year--; month += 12; }
        const c = 365.25 * year;
        const e = 30.6 * month;
        const jd = c + e + day - 694039.09; 
        const phase = jd / 29.5305882; 
        const ip = Math.floor(phase);
        return Math.round((phase - ip) * 29.53);
    }
}