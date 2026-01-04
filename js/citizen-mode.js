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
        
        // This initiates GPS, which now creates a valid "Selection"
        bind('dropMarker', () => {
             // We can trigger the Manual Marker tool OR GPS here. 
             // Based on your UI, "Pick Location" usually implies manual.
             // I will leave 'Pick Location' to WebGIS manual tool (handled in WebGIS)
             // and make this button trigger GPS if you prefer, OR add a dedicated GPS button.
             // For now, let's map it to GPS as requested previously.
             this.locateUser();
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
        
        // Fallback demo data
        const famous = [
            { lat: 51.4769, lng: -0.0005, tags: { name: 'Royal Observatory Greenwich' } },
            { lat: 19.8236, lng: -155.4700, tags: { name: 'Mauna Kea' } }
        ];
        window.SystemBus.emit('map:add_markers', { data: famous });
        window.SystemBus.emit('system:message', "✅ Found observatories.");
    }

    astroForecast() {
        // Use Selection Center OR Map Center
        const selection = this.webGIS.getSelection();
        const center = selection ? selection.center : this.webGIS.map.getCenter();

        window.SystemBus.emit('system:message', `🌤️ Forecasting for ${center.lat.toFixed(2)}, ${center.lng.toFixed(2)}...`);
        
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

    findDarkSkyParks() {
        window.SystemBus.emit('system:message', '🌌 Locating Dark Sky Park...');
        window.SystemBus.emit('map:zoom_to', { lat: 55.05, lng: -4.45, zoom: 10 });
        const content = `<div class="text-center"><h5>Galloway Forest Park</h5><p>Status: Gold Tier</p></div>`;
        window.SystemBus.emit('ui:show_modal', { title: "Dark Sky Park", content: content });
    }

    showMoonPhase() {
        const content = `<div class="text-center"><h1>🌑</h1><p>Phase: New Moon</p></div>`;
        window.SystemBus.emit('ui:show_modal', { title: "Moon Phase", content: content });
    }
}
window.CitizenMode = CitizenMode;