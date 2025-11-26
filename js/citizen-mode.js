// js/citizen-mode.js
class CitizenMode {
    constructor(webGIS) {
        this.webGIS = webGIS;
        this.observationSpots = [];
    }

    initialize() {
        console.log('✅ Citizen mode initialized');
        this.setupCitizenTools();
        this.updateChatbotResponses();
    }

    setupCitizenTools() {
        // Citizen tool event listeners
        this.setupButtonListener('findObservatories', () => this.findObservationSpots());
        this.setupButtonListener('moonPhase', () => this.showMoonPhase());
        this.setupButtonListener('weatherCheck', () => this.checkWeatherConditions());
    }

    setupButtonListener(id, handler) {
        const element = document.getElementById(id);
        if (element) {
            element.addEventListener('click', handler);
        }
    }

    findObservationSpots() {
        this.webGIS.showMessage('🔭 Finding certified observation spots and observatories...');
        
        // Clear previous spots
        this.clearObservationSpots();
        
        // Known observatories and dark sky locations
        const observatories = [
            { name: 'Mauna Kea Observatories', lat: 19.8236, lng: -155.4700, type: 'Research', altitude: '4205m', brightness: '0.8' },
            { name: 'Paranal Observatory', lat: -24.6272, lng: -70.4042, type: 'Research', altitude: '2635m', brightness: '0.9' },
            { name: 'Roque de los Muchachos', lat: 28.7625, lng: -17.8944, type: 'Research', altitude: '2396m', brightness: '1.1' },
            { name: 'Siding Spring Observatory', lat: -31.2723, lng: 149.0711, type: 'Research', altitude: '1165m', brightness: '1.3' },
            { name: 'Kitt Peak National Observatory', lat: 31.9633, lng: -111.6000, type: 'Research', altitude: '2120m', brightness: '2.1' }
        ];

        observatories.forEach(obs => {
            const marker = L.marker([obs.lat, obs.lng])
                .addTo(this.webGIS.map)
                .bindPopup(`
                    <div class="observatory-popup">
                        <h6>${obs.name}</h6>
                        <p><strong>Type:</strong> ${obs.type} Observatory</p>
                        <p><strong>Altitude:</strong> ${obs.altitude}</p>
                        <p><strong>Brightness:</strong> ${obs.brightness} μcd/m²</p>
                        <p><strong>Conditions:</strong> Excellent</p>
                        <button class="btn btn-sm btn-info mt-2" onclick="webGIS.citizenMode.viewObservatoryDetails(${obs.lat}, ${obs.lng})">
                            View Details
                        </button>
                    </div>
                `);
            this.observationSpots.push(marker);
        });

        this.webGIS.showMessage('✅ Observatories loaded! Click on any marker for details.');
    }

    findBestObservationAreas() {
        this.webGIS.showMessage('🌌 Analyzing areas with optimal observation conditions...');
        
        // Optimal dark sky areas
        const optimalAreas = [
            { name: 'Atacama Desert', lat: -23.5, lng: -68.5, reason: 'Dry climate, high altitude, remote location' },
            { name: 'Namib Desert', lat: -23.5, lng: 15.0, reason: 'Clear skies, minimal light pollution' },
            { name: 'Australian Outback', lat: -25.0, lng: 133.0, reason: 'Low population, vast dark areas' },
            { name: 'Death Valley', lat: 36.24, lng: -116.82, reason: 'Dark sky park, clear air, high elevation' },
            { name: 'Canadian Rockies', lat: 51.5, lng: -116.0, reason: 'High altitude, protected areas' }
        ];

        optimalAreas.forEach(area => {
            L.circle([area.lat, area.lng], {
                color: 'green',
                fillColor: '#00ff00',
                fillOpacity: 0.1,
                radius: 75000
            }).addTo(this.webGIS.map)
            .bindPopup(`
                <div class="optimal-area-popup">
                    <h6>${area.name}</h6>
                    <p><strong>Why it's great:</strong> ${area.reason}</p>
                    <p><strong>Light Pollution:</strong> Very Low (1-3 μcd/m²)</p>
                    <p><strong>Best Season:</strong> Year-round</p>
                    <p><strong>Accessibility:</strong> ${area.name.includes('Desert') ? 'Challenging' : 'Moderate'}</p>
                </div>
            `);
        });

        this.webGIS.showMessage('✅ Optimal observation areas marked with green circles!');
    }

    showMoonPhase() {
        const currentDate = new Date();
        const moonPhase = this.calculateMoonPhase(currentDate);
        
        const analysisContent = `
            <h6>🌙 Moon Phase Information</h6>
            <div class="text-center">
                <div style="font-size: 4rem; margin: 10px 0;">${moonPhase.emoji}</div>
                <p><strong>Current Phase:</strong> ${moonPhase.phase}</p>
                <p><strong>Illumination:</strong> ${moonPhase.illumination}%</p>
                <p><strong>Next Full Moon:</strong> ${this.getNextFullMoon(currentDate)}</p>
                <p><strong>Observation Quality:</strong> ${moonPhase.quality}</p>
                <p><strong>Recommendation:</strong> ${moonPhase.recommendation}</p>
            </div>
            <div class="mt-3">
                <h7>Moon Phase Calendar (Next 7 Days)</h7>
                <div style="background: #f8f9fa; border-radius: 5px; margin: 10px 0; padding: 10px;">
                    <p class="text-center text-muted">New Moon in ${moonPhase.daysToNewMoon} days</p>
                    <p class="text-center text-muted">Best observing: ${moonPhase.bestObservingTimes}</p>
                </div>
            </div>
        `;
        
        this.webGIS.showAnalysisPanel('Moon Phase Calculator', analysisContent);
    }

    calculateMoonPhase(date) {
        // Simplified moon phase calculation
        const daysInLunarCycle = 29.53;
        const knownNewMoon = new Date('2023-11-13');
        const daysSinceNewMoon = (date - knownNewMoon) / (1000 * 60 * 60 * 24);
        const cyclePosition = (daysSinceNewMoon % daysInLunarCycle) / daysInLunarCycle;
        
        let phase, emoji, illumination, quality, recommendation, daysToNewMoon, bestObservingTimes;
        
        if (cyclePosition < 0.03 || cyclePosition > 0.97) {
            phase = 'New Moon'; emoji = '🌑'; illumination = '0-2'; quality = 'Excellent';
            recommendation = 'Perfect for deep sky observation!';
            daysToNewMoon = 0;
            bestObservingTimes = 'All night';
        } else if (cyclePosition < 0.22) {
            phase = 'Waxing Crescent'; emoji = '🌒'; illumination = '3-34'; quality = 'Very Good';
            recommendation = 'Great for observation, moon sets early evening';
            daysToNewMoon = Math.floor((0.97 - cyclePosition) * daysInLunarCycle);
            bestObservingTimes = 'Evening to midnight';
        } else if (cyclePosition < 0.28) {
            phase = 'First Quarter'; emoji = '🌓'; illumination = '35-50'; quality = 'Good';
            recommendation = 'Good for lunar and planetary observation';
            daysToNewMoon = Math.floor((0.97 - cyclePosition) * daysInLunarCycle);
            bestObservingTimes = 'Evening';
        } else if (cyclePosition < 0.47) {
            phase = 'Waxing Gibbous'; emoji = '🌔'; illumination = '51-99'; quality = 'Fair';
            recommendation = 'Limited deep sky observation, good for bright objects';
            daysToNewMoon = Math.floor((0.97 - cyclePosition) * daysInLunarCycle);
            bestObservingTimes = 'Late evening';
        } else if (cyclePosition < 0.53) {
            phase = 'Full Moon'; emoji = '🌕'; illumination = '100'; quality = 'Poor';
            recommendation = 'Poor for deep sky, good for lunar observation';
            daysToNewMoon = Math.floor((0.97 - cyclePosition) * daysInLunarCycle);
            bestObservingTimes = 'Moon viewing all night';
        } else if (cyclePosition < 0.72) {
            phase = 'Waning Gibbous'; emoji = '🌖'; illumination = '99-51'; quality = 'Fair';
            recommendation = 'Limited deep sky observation';
            daysToNewMoon = Math.floor((0.97 - cyclePosition) * daysInLunarCycle);
            bestObservingTimes = 'Late night to early morning';
        } else if (cyclePosition < 0.78) {
            phase = 'Last Quarter'; emoji = '🌗'; illumination = '50-35'; quality = 'Good';
            recommendation = 'Good for morning observation sessions';
            daysToNewMoon = Math.floor((0.97 - cyclePosition) * daysInLunarCycle);
            bestObservingTimes = 'Early morning';
        } else {
            phase = 'Waning Crescent'; emoji = '🌘'; illumination = '34-3'; quality = 'Very Good';
            recommendation = 'Excellent for deep sky objects in morning hours';
            daysToNewMoon = Math.floor((0.97 - cyclePosition) * daysInLunarCycle);
            bestObservingTimes = 'Pre-dawn to morning';
        }
        
        return { phase, emoji, illumination, quality, recommendation, daysToNewMoon, bestObservingTimes };
    }

    getNextFullMoon(currentDate) {
        // Simplified next full moon calculation
        const nextFullMoon = new Date(currentDate);
        const daysToNextFullMoon = (29.53 - (currentDate.getDate() % 29.53));
        nextFullMoon.setDate(currentDate.getDate() + daysToNextFullMoon);
        return nextFullMoon.toLocaleDateString() + ` (in ${daysToNextFullMoon} days)`;
    }

    async checkWeatherConditions() {
        this.webGIS.showMessage('☁️ Checking weather conditions for optimal observation...');
        
        // Get current map center or prompt for location
        const center = this.webGIS.map.getCenter();
        const weather = await this.getWeatherData(center.lat, center.lng);
        
        const analysisContent = `
            <h6>🌤️ Observation Weather Conditions</h6>
            <div class="row text-center">
                <div class="col-4">
                    <div style="font-size: 2rem;">${weather.clouds < 20 ? '☀️' : weather.clouds < 60 ? '⛅' : '☁️'}</div>
                    <small>Cloud Cover</small>
                    <p><strong>${weather.clouds}%</strong></p>
                </div>
                <div class="col-4">
                    <div style="font-size: 2rem;">💨</div>
                    <small>Wind Speed</small>
                    <p><strong>${weather.windSpeed} km/h</strong></p>
                </div>
                <div class="col-4">
                    <div style="font-size: 2rem;">👁️</div>
                    <small>Visibility</small>
                    <p><strong>${weather.visibility} km</strong></p>
                </div>
            </div>
            <div class="row text-center mt-2">
                <div class="col-6">
                    <div style="font-size: 1.5rem;">💧</div>
                    <small>Humidity</small>
                    <p><strong>${weather.humidity}%</strong></p>
                </div>
                <div class="col-6">
                    <div style="font-size: 1.5rem;">🌡️</div>
                    <small>Temperature</small>
                    <p><strong>${weather.temperature}°C</strong></p>
                </div>
            </div>
            <div class="mt-3">
                <p><strong>Observation Quality:</strong> <span class="badge bg-${weather.quality === 'Excellent' ? 'success' : weather.quality === 'Good' ? 'info' : weather.quality === 'Fair' ? 'warning' : 'danger'}">${weather.quality}</span></p>
                <p><strong>Recommendation:</strong> ${weather.recommendation}</p>
                <p><strong>Best Time Tonight:</strong> ${weather.bestTime}</p>
            </div>
            <div class="alert alert-info mt-3">
                <small><i class="fas fa-info-circle"></i> For the most accurate conditions, check local weather forecasts before observing. Conditions can change rapidly.</small>
            </div>
        `;
        
        this.webGIS.showAnalysisPanel('Weather Conditions', analysisContent);
    }

    async getWeatherData(lat, lng) {
        // Mock weather data - in real implementation, integrate with weather API
        return new Promise(resolve => {
            setTimeout(() => {
                const conditions = [
                    { clouds: 10, windSpeed: 5, visibility: 25, humidity: 30, temperature: 15, quality: 'Excellent', recommendation: 'Perfect conditions! Set up your equipment.', bestTime: '8 PM - 2 AM' },
                    { clouds: 35, windSpeed: 12, visibility: 15, humidity: 45, temperature: 12, quality: 'Good', recommendation: 'Good conditions with some high clouds.', bestTime: '9 PM - 1 AM' },
                    { clouds: 65, windSpeed: 8, visibility: 10, humidity: 60, temperature: 10, quality: 'Fair', recommendation: 'Fair conditions, watch for cloud coverage.', bestTime: '10 PM - Midnight' },
                    { clouds: 85, windSpeed: 20, visibility: 5, humidity: 75, temperature: 8, quality: 'Poor', recommendation: 'Poor conditions, consider rescheduling.', bestTime: 'Not recommended' }
                ];
                resolve(conditions[Math.floor(Math.random() * conditions.length)]);
            }, 1000);
        });
    }

    viewObservatoryDetails(lat, lng) {
        this.webGIS.showMessage(`📍 Viewing details for observatory at ${lat.toFixed(2)}, ${lng.toFixed(2)}`);
        // In a real implementation, this would show detailed information
    }

    clearObservationSpots() {
        this.observationSpots.forEach(spot => this.webGIS.map.removeLayer(spot));
        this.observationSpots = [];
    }

    updateChatbotResponses() {
        // Override chatbot responses for citizen mode
        const originalGenerateAIResponse = this.webGIS.generateAIResponse;
        this.webGIS.generateAIResponse = (message) => {
            const lowerMessage = message.toLowerCase();
            
            if (lowerMessage.includes('best time') || lowerMessage.includes('when')) {
                return "The best time for observation is during new moon phases when the sky is darkest. Also, nights with low humidity and after midnight typically offer the best viewing conditions. Use the Moon Phase tool to check current conditions!";
            }
            else if (lowerMessage.includes('telescope') || lowerMessage.includes('equipment')) {
                return "For beginners, I recommend a 6-8 inch Dobsonian telescope - they're easy to use and provide great views. For astrophotography, you'll need a tracking mount. Don't forget a red flashlight to preserve night vision and a star chart app!";
            }
            else if (lowerMessage.includes('what to see') || lowerMessage.includes('observe')) {
                return "Start with the Moon and planets (Jupiter's moons, Saturn's rings). Then try bright star clusters like the Pleiades. With darker skies, you can see galaxies like Andromeda and nebulae like Orion. The Find Observatories tool shows great locations!";
            }
            else if (lowerMessage.includes('dark sky park') || lowerMessage.includes('reserve')) {
                return "Use the 'Find Observatories' tool to locate certified International Dark Sky Parks. These are protected areas with exceptional starry nights and natural darkness. They often have facilities and scheduled observation events!";
            }
            else if (lowerMessage.includes('moon') || lowerMessage.includes('phase')) {
                return "Check the Moon Phase tool to see current conditions. New moons are best for deep sky objects like galaxies, while full moons are good for lunar observation but poor for faint objects. The tool shows illumination and best viewing times!";
            }
            else if (lowerMessage.includes('weather') || lowerMessage.includes('cloud')) {
                return "Use the Weather Check tool to assess current conditions. Look for clear skies (<30% clouds), low humidity (<50%), and minimal wind (<15 km/h) for the best observing experience. The tool provides specific recommendations!";
            }
            else {
                return originalGenerateAIResponse.call(this.webGIS, message);
            }
        };
    }
}