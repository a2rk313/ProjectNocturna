const AppController = {
    currentMode: 'citizen',

    init: function() {
        console.log("System Initializing...");
        this.initMap();
        this.switchMode('citizen'); // Default start
    },

    initMap: function() {
        // Initialize Leaflet with Dark Matter tiles
        window.map = L.map('map').setView([20, 0], 2);
        
        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; OpenStreetMap &copy; CARTO',
            subdomains: 'abcd',
            maxZoom: 20
        }).addTo(window.map);
    },

    switchMode: function(mode) {
        this.currentMode = mode;
        const sidebar = document.getElementById('dynamic-sidebar');
        const title = document.getElementById('panel-title');

        // 1. Update Buttons
        document.querySelectorAll('.btn-cosmic').forEach(b => b.classList.remove('active'));
        if(mode === 'citizen') document.getElementById('btn-citizen').classList.add('active');
        if(mode === 'science') document.getElementById('btn-science').classList.add('active');

        // 2. Clear Sidebar
        sidebar.innerHTML = '';

        // 3. Inject Content
        if (mode === 'citizen') {
            title.innerText = "Citizen Reporting & Assistant";
            this.renderCitizenTools(sidebar);
        } else {
            title.innerText = "Data Analytics & Trends";
            this.renderScienceTools(sidebar);
        }
    },

    renderCitizenTools: function(container) {
        container.innerHTML = `
            <div class="alert cosmic-panel text-neon-cyan">
                <i class="bi bi-info-circle"></i> Chat with Nocturna AI or report a light pollution source below.
            </div>
            <div id="chat-interface" class="h-50 mb-3 cosmic-panel p-2">
                <div id="chat-messages" style="height: 200px; overflow-y: auto;"></div>
                <div class="input-group mt-2">
                    <input type="text" class="form-control" placeholder="Ask about light pollution...">
                    <button class="btn btn-cosmic">SEND</button>
                </div>
            </div>
            <button class="btn btn-cosmic w-100 py-3">
                Report Light Source
            </button>
        `;
    },

    renderScienceTools: function(container) {
        container.innerHTML = `
            <h6 class="text-muted">Regional Analysis</h6>
            <canvas id="pollutionChart" width="400" height="200"></canvas>
            
            <h6 class="text-muted mt-4">Data Layers</h6>
            <div class="form-check form-switch">
                <input class="form-check-input" type="checkbox" id="layerViirs">
                <label class="form-check-label" for="layerViirs">VIIRS Satellite Data</label>
            </div>
            <div class="form-check form-switch">
                <input class="form-check-input" type="checkbox" id="layerSky" checked>
                <label class="form-check-label" for="layerSky">Sky Quality Meter</label>
            </div>
        `;
        // Initialize Chart.js here if needed
    }
};

// Start the engine
document.addEventListener('DOMContentLoaded', () => {
    AppController.init();
});