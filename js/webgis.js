import { DataManager } from './data-manager.js';
import { CitizenMode } from './citizen-mode.js';
import { ScientificMode } from './scientific-mode.js';

class WebGIS {
    constructor() {
        this.map = null;
        this.dataManager = new DataManager();
        this.initMap();
        this.initEventBusListeners(); 
    }

    initMap() {
        // 1. Initialize Leaflet Map
        // Default view: Croatia (based on your dataset)
        this.map = L.map('map').setView([45.49, 15.53], 6); 

        // 2. Add Base Layer (Dark Matter for Light Pollution theme)
        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; OpenStreetMap &copy; CARTO',
            maxZoom: 19
        }).addTo(this.map);

        // 3. Load Database Stations by default
        // This calls your DataManager to fetch points from PostGIS
        this.dataManager.loadStationsLayer(this.map);
    }

    /**
     * NEW: Event Bus Listeners
     * This decouples the map from the UI.
     * WebGIS simply listens for commands like "add markers" or "show message".
     */
    initEventBusListeners() {
        // Listener 1: Add Markers to Map (e.g., from Find Observatories tool)
        window.SystemBus.on('map:add_markers', (payload) => {
            const { data } = payload;
            if (data && data.length > 0) {
                data.forEach(item => {
                    // OpenStreetMap data structure often puts lat/lon in 'center' for ways/relations
                    const lat = item.lat || (item.center && item.center.lat);
                    const lon = item.lon || (item.center && item.center.lon);

                    if (lat && lon) {
                        L.marker([lat, lon])
                            .addTo(this.map)
                            .bindPopup(`
                                <b>${item.tags.name || 'Unknown Location'}</b><br>
                                Type: ${item.tags.man_made || 'Observatory'}
                            `);
                    }
                });
            }
        });

        // Listener 2: Handle System Messages (e.g., Logs)
        window.SystemBus.on('system:message', (msg) => {
             console.log("System Message:", msg);
             // If you have a chat/log UI element, you can update it here:
             // document.getElementById('log-window').innerText += msg + '\n';
        });
    }

    // Switch between "Citizen" and "Scientific" modes
    setMode(mode) {
        console.log(`Switching to ${mode} mode...`);
        if (mode === 'citizen') {
            new CitizenMode(this).initialize();
        } else if (mode === 'scientific') {
            new ScientificMode(this).initialize();
        }
    }
}

// Initialize the App when the DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const webGis = new WebGIS();
    
    // Auto-detect mode based on URL (e.g., citizen-mode.html vs scientific-mode.html)
    // If running on single page, defaults to 'scientific'
    const mode = window.location.pathname.includes('citizen') ? 'citizen' : 'scientific';
    webGis.setMode(mode);
});