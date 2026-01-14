// js/citizen-mode.js - Citizen Science Module for Light Pollution Research
// Implements real-world data collection and analysis tools for community scientists

class CitizenMode {
    constructor(webGIS) {
        this.webGIS = webGIS;
        this.initializeTools();
    }

    initializeTools() {
        // Bind all citizen science tools to their respective buttons
        this.clearExistingBindings();
        this.bindTool('astroForecast', () => this.showRealAstroForecast());
        this.bindTool('findObservatories', () => this.findRealObservatories());
        this.bindTool('moonPhase', () => this.showRealMoonPhase());
        this.bindTool('darkSkyFinder', () => this.findRealDarkSkyParks());
        this.bindTool('gpsLocation', () => this.locateUserWithRealData());
    }

    clearExistingBindings() {
        const toolsDiv = document.getElementById('citizenTools');
        if (toolsDiv) {
            const newTools = toolsDiv.cloneNode(true);
            toolsDiv.parentNode.replaceChild(newTools, toolsDiv);
        }
    }

    bindTool(id, handler) {
        const el = document.getElementById(id);
        if (el) {
            el.onclick = handler;
            console.log(`✅ Citizen tool bound: ${id}`);
        } else {
            console.warn(`⚠️ Citizen tool not found: ${id}`);
        }
    }

    // REAL DATA TOOL IMPLEMENTATIONS
    async showRealAstroForecast() {
        window.SystemBus.emit('system:message', "🌤️ Checking astronomical conditions...");
        
        try {
            // Get current location or map center
            const center = this.webGIS.map.getCenter();
            
            // Initialize weather service and get real conditions
            const weatherService = new WeatherService();
            const conditions = await weatherService.getStargazingConditions(
                center.lat,
                center.lng
            );
            
            const content = `
                <div class="text-center">
                    <h5><i class="fas fa-cloud-sun"></i> Stargazing Forecast</h5>
                    <p>Tonight's conditions based on current weather data:</p>
                    
                    <div class="alert alert-${conditions.recommendation === 'Excellent' ? 'success' : conditions.recommendation === 'Good' ? 'info' : 'warning'}">
                        <strong>Quality: ${conditions.quality}/10 (${conditions.recommendation})</strong>
                    </div>
                    
                    <div class="row mt-3">
                        <div class="col-4">
                            <div class="bg-dark p-2 rounded">
                                <i class="fas fa-cloud text-info"></i>
                                <div class="mt-1"><strong>${conditions.cloudCover}%</strong></div>
                                <small>Cloud Cover</small>
                            </div>
                        </div>
                        <div class="col-4">
                            <div class="bg-dark p-2 rounded">
                                <i class="fas fa-eye text-success"></i>
                                <div class="mt-1"><strong>${conditions.visibility} km</strong></div>
                                <small>Visibility</small>
                            </div>
                        </div>
                        <div class="col-4">
                            <div class="bg-dark p-2 rounded">
                                <i class="fas fa-wind text-secondary"></i>
                                <div class="mt-1"><strong>${conditions.windSpeed} m/s</strong></div>
                                <small>Wind Speed</small>
                            </div>
                        </div>
                    </div>
                    
                    <div class="mt-3">
                        <h6><i class="fas fa-moon"></i> Moon Phase</h6>
                        <div class="d-flex justify-content-center align-items-center">
                            <span class="fs-3 me-2">${conditions.moon.emoji}</span>
                            <div>
                                <div><strong>${conditions.moon.phase}</strong></div>
                                <div class="small">${conditions.moon.illumination.toFixed(1)}% illuminated</div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="mt-3">
                        <h6><i class="fas fa-info-circle"></i> Conditions Summary</h6>
                        <p class="small">${conditions.conditions_summary}</p>
                    </div>
                    
                    ${conditions.best_times && conditions.best_times.length > 0 ? `
                    <div class="mt-3">
                        <h6><i class="fas fa-clock"></i> Best Observation Times</h6>
                        <div class="small">
                            ${conditions.best_times.map(time => `<div>${time}</div>`).join('')}
                        </div>
                    </div>
                    ` : ''}
                    
                    <div class="mt-3">
                        <p class="small text-muted">Location: ${center.lat.toFixed(6)}, ${center.lng.toFixed(6)}</p>
                        <p class="small text-muted">Source: Open-Meteo API and astronomical calculations</p>
                    </div>
                </div>
            `;
            
            window.SystemBus.emit('ui:show_modal', { 
                title: "Stargazing Forecast", 
                content: content 
            });
            
        } catch (error) {
            console.error('Forecast error:', error);
            window.SystemBus.emit('system:message', "❌ Failed to get forecast data.");
            
            // Fallback to original implementation
            const center = this.webGIS.map.getCenter();
            
            const content = `
                <div class="text-center">
                    <h5><i class="fas fa-cloud-sun"></i> Stargazing Forecast</h5>
                    <p>Weather service temporarily unavailable. Showing mock data:</p>
                    <div class="row mt-3">
                        <div class="col-4">
                            <div class="bg-dark p-2 rounded">
                                <i class="fas fa-cloud text-info"></i>
                                <div class="mt-1"><strong>${Math.round(Math.random() * 30) + 10}%</strong></div>
                                <small>Cloud Cover</small>
                            </div>
                        </div>
                        <div class="col-4">
                            <div class="bg-dark p-2 rounded">
                                <i class="fas fa-eye text-success"></i>
                                <div class="mt-1"><strong>${Math.round(Math.random() * 30) + 60}%</strong></div>
                                <small>Visibility</small>
                            </div>
                        </div>
                        <div class="col-4">
                            <div class="bg-dark p-2 rounded">
                                <i class="fas fa-star text-warning"></i>
                                <div class="mt-1"><strong>${Math.round(Math.random() * 4) + 6}/10</strong></div>
                                <small>Seeing</small>
                            </div>
                        </div>
                    </div>
                    <div class="mt-3">
                        <p class="small text-muted">Location: ${center.lat.toFixed(2)}, ${center.lng.toFixed(2)}</p>
                        <p class="small text-muted">Based on Open-Meteo API and astronomical calculations.</p>
                    </div>
                </div>
            `;
            
            window.SystemBus.emit('ui:show_modal', { 
                title: "Stargazing Forecast (Fallback)", 
                content: content 
            });
        }
    }

    async findRealObservatories() {
        window.SystemBus.emit('system:message', "🔭 Finding nearby observatories...");
        
        try {
            const center = this.webGIS.map.getCenter();
            const obsService = new ObservatoryService();
            const observatories = await obsService.findNearbyObservatories(
                center.lat,
                center.lng,
                200 // 200 km radius
            );
            
            if (observatories.length === 0) {
                const content = `
                    <div class="text-center">
                        <h5><i class="fas fa-telescope"></i> Nearby Observatories</h5>
                        <p>No major observatories found within 200km of your location.</p>
                        <div class="small text-muted">
                            Location: ${center.lat.toFixed(6)}, ${center.lng.toFixed(6)}
                        </div>
                    </div>
                `;
                
                window.SystemBus.emit('ui:show_modal', {
                    title: "Observatories",
                    content: content
                });
                return;
            }
            
            // Add markers for each observatory on the map
            observatories.forEach(obs => {
                this.webGIS.addMarker(obs.lat, obs.lng, {
                    icon: '🔭',
                    title: obs.name,
                    popup: `
                        <strong>${obs.name}</strong><br>
                        ${obs.type} • ${obs.country}<br>
                        Altitude: ${obs.altitude}m<br>
                        Distance: ${obs.distance.toFixed(1)} km<br>
                        ${obs.sqm ? `SQM: ${obs.sqm} (Bortle: ${obs.bortle})` : 'Light pollution data unavailable'}<br>
                        <a href="${obs.website}" target="_blank" rel="noopener">Website</a>
                    `,
                    customClass: obs.is_dark_sky ? 'dark-sky-observatory' : 'regular-observatory'
                });
            });
            
            const content = `
                <div class="text-center">
                    <h5><i class="fas fa-telescope"></i> Nearby Observatories</h5>
                    <p>Found ${observatories.length} observatories within 200km:</p>
                    
                    <div class="list-group text-start">
                        ${observatories.map(obs => `
                            <div class="list-group-item d-flex justify-content-between align-items-center">
                                <div>
                                    <h6 class="mb-0">${obs.name}</h6>
                                    <small class="text-muted">
                                        ${obs.type} • ${obs.country}<br>
                                        ${obs.distance.toFixed(1)} km away • Altitude: ${obs.altitude}m<br>
                                        ${obs.sqm ? `SQM: ${obs.sqm} (Bortle: ${obs.bortle})` : 'Light pollution data N/A'}
                                    </small>
                                </div>
                                <button class="btn btn-sm btn-outline-primary" onclick="map.setView([${obs.lat}, ${obs.lng}], 10)">
                                    Go To
                                </button>
                            </div>
                        `).join('')}
                    </div>
                    
                    <div class="mt-3">
                        <p class="small text-muted">Location: ${center.lat.toFixed(6)}, ${center.lng.toFixed(6)}</p>
                        <p class="small text-muted">Source: IAU Observatory Database</p>
                    </div>
                </div>
            `;
            
            window.SystemBus.emit('ui:show_modal', {
                title: "Observatories",
                content: content
            });
            
        } catch (error) {
            console.error('Observatory search error:', error);
            window.SystemBus.emit('system:message', "❌ Failed to find observatories.");
            
            // Fallback to original implementation
            const center = this.webGIS.map.getCenter();
            
            const content = `
                <div class="text-center">
                    <h5><i class="fas fa-telescope"></i> Nearby Observatories</h5>
                    <p>Observatory database temporarily unavailable. Showing example data:</p>
                    
                    <div class="list-group text-start">
                        <div class="list-group-item">
                            <h6 class="mb-0">Example Observatory</h6>
                            <small class="text-muted">
                                Research • USA<br>
                                0.0 km away • Altitude: 2000m<br>
                                SQM: 21.5 (Bortle: 1)
                            </small>
                        </div>
                    </div>
                    
                    <div class="mt-3">
                        <p class="small text-muted">Location: ${center.lat.toFixed(6)}, ${center.lng.toFixed(6)}</p>
                        <p class="small text-muted">Source: IAU Observatory Database</p>
                    </div>
                </div>
            `;
            
            window.SystemBus.emit('ui:show_modal', {
                title: "Observatories (Fallback)",
                content: content
            });
        }
    }

    showRealMoonPhase() {
        try {
            // Calculate real moon phase using astronomical algorithms
            const now = new Date();
            const lunarCycle = 29.53; // days in lunar cycle
            const knownNewMoon = new Date('2024-01-11'); // Known new moon date
            const daysSinceNewMoon = (now - knownNewMoon) / (1000 * 60 * 60 * 24);
            const moonAge = daysSinceNewMoon % lunarCycle;
            const illumination = 50 * (1 - Math.cos(2 * Math.PI * moonAge / lunarCycle));
            
            let phaseName;
            if (moonAge < 1) phaseName = "New Moon";
            else if (moonAge < 7.4) phaseName = "Waxing Crescent";
            else if (moonAge < 7.9) phaseName = "First Quarter";
            else if (moonAge < 14.8) phaseName = "Waxing Gibbous";
            else if (moonAge < 15.3) phaseName = "Full Moon";
            else if (moonAge < 22.2) phaseName = "Waning Gibbous";
            else if (moonAge < 22.7) phaseName = "Last Quarter";
            else phaseName = "Waning Crescent";
            
            let emoji;
            if (moonAge < 1) emoji = "🌑";
            else if (moonAge < 7.4) emoji = "🌒";
            else if (moonAge < 7.9) emoji = "🌓";
            else if (moonAge < 14.8) emoji = "🌔";
            else if (moonAge < 15.3) emoji = "🌕";
            else if (moonAge < 22.2) emoji = "🌖";
            else if (moonAge < 22.7) emoji = "🌗";
            else emoji = "🌘";
            
            const content = `
                <div class="text-center">
                    <h5><i class="fas fa-moon"></i> Current Moon Phase</h5>
                    <div class="display-1 my-3">${emoji}</div>
                    <h6>${phaseName}</h6>
                    <p class="lead">${illumination.toFixed(1)}% illuminated</p>
                    <div class="progress mb-3">
                        <div class="progress-bar" role="progressbar" style="width: ${illumination}%" aria-valuenow="${illumination}" aria-valuemin="0" aria-valuemax="100"></div>
                    </div>
                    <p>Moon age: ${moonAge.toFixed(1)} days into lunar cycle</p>
                    <p class="small text-muted">Calculated using astronomical algorithms</p>
                </div>
            `;
            
            window.SystemBus.emit('ui:show_modal', {
                title: "Moon Phase",
                content: content
            });
            
        } catch (error) {
            console.error('Moon phase calculation error:', error);
            window.SystemBus.emit('system:message', "❌ Failed to calculate moon phase.");
        }
    }

    async findRealDarkSkyParks() {
        window.SystemBus.emit('system:message', "🌌 Finding certified dark sky places...");
        
        try {
            const center = this.webGIS.map.getCenter();
            
            // Get dark sky parks from IDA database (real data already exists)
            const response = await fetch(
                `/api/dark-sky-parks?lat=${center.lat}&lng=${center.lng}&radius=500`
            );
            
            if (!response.ok) {
                throw new Error('Failed to fetch dark sky parks');
            }
            
            const data = await response.json();
            const parks = data.parks || [];
            
            // Calculate actual distances
            const parksWithDistance = parks.map(park => ({
                ...park,
                distance: this.calculateDistance(center.lat, center.lng, park.lat, park.lng)
            })).sort((a, b) => a.distance - b.distance);
            
            // Add markers for each park on the map
            parksWithDistance.forEach(park => {
                this.webGIS.addMarker(park.lat, park.lng, {
                    icon: '🌌',
                    title: park.name,
                    popup: `
                        <strong>${park.name}</strong><br>
                        Tier: ${park.designation}<br>
                        Distance: ${park.distance.toFixed(1)} km<br>
                        SQM: ${park.sqm || 'N/A'}<br>
                        Area: ${park.area_sqkm || 'N/A'} km²
                    `,
                    customClass: 'dark-sky-park'
                });
            });
            
            const content = `
                <div class="text-center">
                    <h5><i class="fas fa-mountain"></i> Certified Dark Sky Places</h5>
                    <p>Found ${parksWithDistance.length} within 500km:</p>
                    
                    <div class="list-group text-start">
                        ${parksWithDistance.slice(0, 10).map(park => `
                            <div class="list-group-item">
                                <div class="d-flex justify-content-between">
                                    <div>
                                        <h6 class="mb-0">${park.name}</h6>
                                        <small class="text-muted">
                                            ${park.country} | ${park.type}<br>
                                            ${park.distance.toFixed(1)} km away
                                            ${park.sqm ? `<br>SQM: ${park.sqm}` : ''}
                                        </small>
                                    </div>
                                    <button class="btn btn-sm btn-outline-primary" onclick="map.setView([${park.lat}, ${park.lng}], 10)">
                                        View
                                    </button>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                    
                    <div class="mt-3">
                        <p class="small text-muted">Source: International Dark-Sky Association</p>
                        ${data.total_parks_worldwide ? `<p class="small text-muted">Total certified places worldwide: ${data.total_parks_worldwide}</p>` : ''}
                    </div>
                </div>
            `;
            
            window.SystemBus.emit('ui:show_modal', {
                title: "Dark Sky Parks",
                content: content
            });
            
        } catch (error) {
            console.error('Dark sky park search error:', error);
            window.SystemBus.emit('system:message', "❌ Failed to find dark sky parks.");
            
            // Fallback showing some real examples
            const center = this.webGIS.map.getCenter();
            
            const content = `
                <div class="text-center">
                    <h5><i class="fas fa-mountain"></i> Certified Dark Sky Places</h5>
                    <p>Dark Sky database temporarily unavailable. Examples of certified places:</p>
                    
                    <div class="list-group text-start">
                        <div class="list-group-item">
                            <div class="d-flex justify-content-between">
                                <div>
                                    <h6 class="mb-0">Natural Bridges National Monument</h6>
                                    <small class="text-muted">
                                        USA | International Dark Sky Park<br>
                                        SQM: 21.9 | Bortle: Class 1
                                    </small>
                                </div>
                            </div>
                        </div>
                        <div class="list-group-item">
                            <div class="d-flex justify-content-between">
                                <div>
                                    <h6 class="mb-0">Aoraki Mackenzie Dark Sky Reserve</h6>
                                    <small class="text-muted">
                                        New Zealand | Dark Sky Reserve<br>
                                        SQM: 21.7 | Bortle: Class 1-2
                                    </small>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="mt-3">
                        <p class="small text-muted">Location: ${center.lat.toFixed(6)}, ${center.lng.toFixed(6)}</p>
                        <p class="small text-muted">Source: International Dark-Sky Association</p>
                    </div>
                </div>
            `;
            
            window.SystemBus.emit('ui:show_modal', {
                title: "Dark Sky Parks (Fallback)",
                content: content
            });
        }
    }

    async locateUserWithRealData() {
        window.SystemBus.emit('system:message', "📍 Locating user with GPS...");
        
        if (!navigator.geolocation) {
            window.SystemBus.emit('system:message', "❌ Geolocation is not supported by your browser.");
            return;
        }
        
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const { latitude, longitude } = position.coords;
                
                // Update map view to user's location
                this.webGIS.map.setView([latitude, longitude], 12);
                
                // Get location information
                try {
                    const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
                    const locationData = await response.json();
                    
                    const locationName = locationData.display_name || `(${latitude.toFixed(6)}, ${longitude.toFixed(6)})`;
                    
                    const content = `
                        <div class="text-center">
                            <h5><i class="fas fa-location-arrow"></i> Your Location</h5>
                            <p>Successfully located using GPS:</p>
                            <h6>${locationName}</h6>
                            <p>Latitude: ${latitude.toFixed(6)}</p>
                            <p>Longitude: ${longitude.toFixed(6)}</p>
                            <p>Accuracy: ${position.coords.accuracy.toFixed(2)} meters</p>
                            
                            <div class="mt-3">
                                <button class="btn btn-primary" onclick="map.setView([${latitude}, ${longitude}], 15)">
                                    Zoom to Location
                                </button>
                            </div>
                            
                            <div class="mt-3">
                                <p class="small text-muted">Coordinates obtained from GPS device</p>
                            </div>
                        </div>
                    `;
                    
                    window.SystemBus.emit('ui:show_modal', {
                        title: "GPS Location",
                        content: content
                    });
                    
                    window.SystemBus.emit('system:message', `📍 Located at ${locationName}`);
                    
                } catch (geoError) {
                    console.error('Geocoding error:', geoError);
                    
                    const content = `
                        <div class="text-center">
                            <h5><i class="fas fa-location-arrow"></i> Your Location</h5>
                            <p>Successfully located using GPS:</p>
                            <h6>(${latitude.toFixed(6)}, ${longitude.toFixed(6)})</h6>
                            <p>Latitude: ${latitude.toFixed(6)}</p>
                            <p>Longitude: ${longitude.toFixed(6)}</p>
                            <p>Accuracy: ${position.coords.accuracy.toFixed(2)} meters</p>
                            
                            <div class="mt-3">
                                <button class="btn btn-primary" onclick="map.setView([${latitude}, ${longitude}], 15)">
                                    Zoom to Location
                                </button>
                            </div>
                            
                            <div class="mt-3">
                                <p class="small text-muted">Coordinates obtained from GPS device</p>
                            </div>
                        </div>
                    `;
                    
                    window.SystemBus.emit('ui:show_modal', {
                        title: "GPS Location",
                        content: content
                    });
                    
                    window.SystemBus.emit('system:message', `📍 Located at ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
                }
            },
            (error) => {
                console.error('Geolocation error:', error);
                
                let errorMessage = "Unknown error";
                switch(error.code) {
                    case error.PERMISSION_DENIED:
                        errorMessage = "User denied the request for Geolocation.";
                        break;
                    case error.POSITION_UNAVAILABLE:
                        errorMessage = "Location information is unavailable.";
                        break;
                    case error.TIMEOUT:
                        errorMessage = "The request to get user location timed out.";
                        break;
                    default:
                        errorMessage = error.message || "An unknown error occurred.";
                        break;
                }
                
                window.SystemBus.emit('system:message', `❌ ${errorMessage}`);
                
                // Show a modal with the error
                const content = `
                    <div class="text-center">
                        <h5><i class="fas fa-exclamation-triangle"></i> Location Error</h5>
                        <p>${errorMessage}</p>
                        <p>To use location services:</p>
                        <ul class="text-start">
                            <li>Enable location services in your browser settings</li>
                            <li>Allow this site to access your location</li>
                            <li>Ensure you're not using a private browsing mode that blocks location</li>
                        </ul>
                        <div class="mt-3">
                            <p class="small text-muted">Browser geolocation API error</p>
                        </div>
                    </div>
                `;
                
                window.SystemBus.emit('ui:show_modal', {
                    title: "Location Error",
                    content: content
                });
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 60000
            }
        );
    }

    calculateDistance(lat1, lng1, lat2, lng2) {
        const R = 6371; // Earth radius in km
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLng = (lng2 - lng1) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                  Math.sin(dLng/2) * Math.sin(dLng/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    }
}

// Make CitizenMode available globally
if (typeof window !== 'undefined' && !window.CitizenMode) {
    window.CitizenMode = CitizenMode;
}

module.exports = CitizenMode;