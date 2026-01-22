// Script to add planRoute functionality to webgis.js
const fs = require('fs');

// Read the current file
let content = fs.readFileSync('/workspace/js/webgis.js', 'utf8');

// Define the new functions to insert
const newFunctions = `    /**
     * Plan a route between two locations
     */
    planRoute() {
        // Show a modal for planning a route
        const content = \`
            <div class="container-fluid">
                <h5>Plan a Route</h5>
                <div class="mb-3">
                    <label class="form-label">Start Location</label>
                    <input type="text" id="routeStart" class="form-control" placeholder="Enter starting point">
                </div>
                <div class="mb-3">
                    <label class="form-label">End Location</label>
                    <input type="text" id="routeEnd" class="form-control" placeholder="Enter destination">
                </div>
                <button id="routeSubmit" class="btn btn-primary w-100">Get Directions</button>
            </div>
        \`;
        
        // Show modal with route planning interface
        window.SystemBus.emit('ui:show_modal', { title: "Route Planner", content: content });
        
        // Set up event listener for route planning
        setTimeout(() => {
            const routeBtn = document.getElementById('routeSubmit');
            if (routeBtn) {
                routeBtn.addEventListener('click', () => {
                    const startLoc = document.getElementById('routeStart').value;
                    const endLoc = document.getElementById('routeEnd').value;
                    
                    if (startLoc && endLoc) {
                        this.calculateRoute(startLoc, endLoc);
                    } else {
                        alert('Please enter both start and end locations');
                    }
                });
            }
        }, 100);
    }
    
    /**
     * Calculate and display route between two locations
     */
    async calculateRoute(start, end) {
        try {
            // Parse coordinates if they're in lat,lng format
            let startCoords, endCoords;
            
            if (start.includes(',')) {
                const [lat, lng] = start.split(',').map(Number);
                startCoords = { lat, lng };
            } else {
                // Geocode location name to coordinates
                startCoords = await this.geocodeLocation(start);
            }
            
            if (end.includes(',')) {
                const [lat, lng] = end.split(',').map(Number);
                endCoords = { lat, lng };
            } else {
                // Geocode location name to coordinates
                endCoords = await this.geocodeLocation(end);
            }
            
            if (!startCoords || !endCoords || startCoords.lat === 0 || endCoords.lat === 0) {
                throw new Error('Could not geocode one or both locations');
            }

            // Create a simple line between the two points (since we don't have a real routing service)
            // In a real implementation, this would use a routing service like OSRM or Google Maps
            
            // Clear any existing routing layer
            if (this.routingLayer) {
                this.map.removeLayer(this.routingLayer);
            }
            
            // Create a simple line between the two points
            const routeLine = L.polyline([
                [startCoords.lat, startCoords.lng],
                [endCoords.lat, endCoords.lng]
            ], {
                color: '#00ffff',
                weight: 4,
                opacity: 0.8
            }).addTo(this.map);
            
            this.routingLayer = routeLine;
            
            // Fit the map to show both points
            const group = L.featureGroup([routeLine]);
            this.map.fitBounds(group.getBounds().pad(0.1));
            
            // Show route information
            const distance = this.calculateDistance(startCoords.lat, startCoords.lng, endCoords.lat, endCoords.lng);
            
            const routeContent = \`
                <div class="container-fluid">
                    <h6>Route Information</h6>
                    <p><strong>From:</strong> \${start}</p>
                    <p><strong>To:</strong> \${end}</p>
                    <p><strong>Distance:</strong> \${distance.toFixed(2)} km</p>
                    <p><strong>Note:</strong> This is a straight-line path. Real navigation may vary.</p>
                    <div class="mt-3">
                        <button class="btn btn-secondary" onclick="webGIS.map.setView([\${startCoords.lat}, \${startCoords.lng}], 10)">Go to Start</button>
                        <button class="btn btn-secondary ms-2" onclick="webGIS.map.setView([\${endCoords.lat}, \${endCoords.lng}], 10)">Go to End</button>
                    </div>
                </div>
            \`;
            
            window.SystemBus.emit('ui:show_modal', { title: "Route Details", content: routeContent });

        } catch (error) {
            console.error('Route calculation error:', error);
            alert('Error calculating route: ' + error.message);
        }
    }
    
    /**
     * Calculate distance between two points using Haversine formula
     */
    calculateDistance(lat1, lng1, lat2, lng2) {
        const R = 6371; // Earth radius in km
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLng = (lng2 - lng1) * Math.PI / 180;
        const a = 
            Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
            Math.sin(dLng/2) * Math.sin(dLng/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    }
    
`;

// Find the location to insert (before geocodeLocation function)
const insertionPoint = content.indexOf("    async geocodeLocation(locationName) {");

if (insertionPoint !== -1) {
    // Insert the new functions before the geocodeLocation function
    const updatedContent = content.substring(0, insertionPoint) + newFunctions + content.substring(insertionPoint);
    
    // Write the updated content back to the file
    fs.writeFileSync('/workspace/js/webgis.js', updatedContent, 'utf8');
    console.log("Successfully added planRoute functionality to webgis.js");
} else {
    console.log("Could not find insertion point in webgis.js");
}