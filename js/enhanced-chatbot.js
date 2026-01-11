// Enhanced Chatbot Implementation - Replaces n8n workflow
// Provides intelligent responses for light pollution research and WebGIS interactions

class LightPollutionChatbot {
    constructor() {
        this.apiEndpoint = '/api/chatbot';
        this.conversationHistory = [];
        this.maxHistoryLength = 10;
        this.intentPatterns = {
            zoom_to: [
                /zoom\s+to\s+(.+)/i,
                /go\s+to\s+(.+)/i,
                /show\s+me\s+(.+)/i,
                /navigate\s+to\s+(.+)/i,
                /take\s+me\s+to\s+(.+)/i,
                /view\s+(.+)/i,
                /(.+)\s+location/i,
                /(.+)\s+map/i
            ],
            extract_data: [
                /analyze\s+(this\s+)?area/i,
                /extract\s+data/i,
                /measure\s+light\s+pollution/i,
                /calculate\s+statistics/i,
                /get\s+measurements/i,
                /analyze\s+selected/i,
                /draw\s+area/i,
                /select\s+area/i
            ],
            find_dark_sky: [
                /dark\s+sky/i,
                /stargazing/i,
                /astronomy/i,
                /observatory/i,
                /dark\s+park/i,
                /best\s+view/i,
                /where\s+to\s+see\s+stars/i
            ],
            get_help: [
                /help/i,
                /how\s+to/i,
                /what\s+can\s+i\s+do/i,
                /tutorial/i,
                /guide/i,
                /instructions/i
            ],
            scientific_analysis: [
                /scientific/i,
                /research/i,
                /analysis/i,
                /predict/i,
                /forecast/i,
                /trend/i,
                /statistics/i
            ]
        };
    }

    // Main chat processing method
    async processMessage(userInput, context = {}) {
        try {
            // Add user message to history
            this.addToHistory('user', userInput);
            
            // Detect intent
            const intent = this.detectIntent(userInput);
            
            // Process based on intent
            let response;
            switch (intent) {
                case 'zoom_to':
                    response = await this.handleZoomTo(userInput, context);
                    break;
                case 'extract_data':
                    response = await this.handleDataExtraction(userInput, context);
                    break;
                case 'find_dark_sky':
                    response = await this.handleDarkSkySearch(userInput, context);
                    break;
                case 'scientific_analysis':
                    response = await this.handleScientificAnalysis(userInput, context);
                    break;
                case 'get_help':
                    response = this.handleHelp(userInput, context);
                    break;
                default:
                    response = await this.handleGeneralChat(userInput, context);
            }
            
            // Add bot response to history
            this.addToHistory('assistant', response.message);
            
            return response;
            
        } catch (error) {
            console.error('Chatbot processing error:', error);
            return {
                action: 'error',
                message: 'I apologize, but I encountered an error processing your request. Please try again.',
                error: error.message
            };
        }
    }

    // Intent detection using pattern matching
    detectIntent(userInput) {
        const input = userInput.toLowerCase().trim();
        
        for (const [intent, patterns] of Object.entries(this.intentPatterns)) {
            for (const pattern of patterns) {
                if (pattern.test(input)) {
                    return intent;
                }
            }
        }
        
        return 'general_chat';
    }

    // Handle zoom/location requests
    async handleZoomTo(userInput, context) {
        const match = userInput.match(/(?:zoom\s+to|go\s+to|show\s+me|navigate\s+to|take\s+me\s+to|view|find)\s+(.+)/i);
        const location = match ? match[1].trim() : '';
        
        if (!location) {
            return {
                action: 'chat',
                message: "I'd be happy to help you navigate! Please tell me which location you'd like to zoom to. For example: 'Zoom to New York' or 'Take me to Paris'."
            };
        }
        
        try {
            // Geocode the location
            const geocodeResponse = await fetch(
                `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(location)}&format=json&limit=1`,
                {
                    headers: {
                        'User-Agent': 'Project-Nocturna-Chatbot/1.0'
                    }
                }
            );
            
            if (geocodeResponse.ok) {
                const locations = await geocodeResponse.json();
                
                if (locations && locations.length > 0) {
                    const place = locations[0];
                    return {
                        action: 'zoom_to',
                        location: {
                            name: place.display_name,
                            lat: parseFloat(place.lat),
                            lng: parseFloat(place.lon),
                            zoom: 12
                        },
                        message: `Zooming to ${place.display_name}...`
                    };
                } else {
                    return {
                        action: 'chat',
                        message: `I couldn't find "${location}". Could you try a more specific location name?`
                    };
                }
            } else {
                throw new Error('Geocoding service unavailable');
            }
            
        } catch (error) {
            return {
                action: 'chat',
                message: `I'm having trouble finding "${location}" right now. The mapping service might be temporarily unavailable. Please try again in a moment.`
            };
        }
    }

    // Handle data extraction/analysis requests
    async handleDataExtraction(userInput, context) {
        if (!context.selectedArea && !context.hasSelection) {
            return {
                action: 'extract_data',
                message: "To analyze light pollution, please first draw an area on the map. Use the drawing tools to select a region, then I can provide detailed analysis."
            };
        }
        
        return {
            action: 'extract_data',
            message: "Starting light pollution analysis for the selected area. This may take a moment as I process the satellite data...",
            requiresSelection: false
        };
    }

    // Handle dark sky location searches
    async handleDarkSkySearch(userInput, context) {
        const mapCenter = context.mapCenter || { lat: 40.7128, lng: -74.0060 };
        
        try {
            // Search for dark sky parks
            const response = await fetch(
                `/api/dark-sky-parks?lat=${mapCenter.lat}&lng=${mapCenter.lng}&radius=500`
            );
            
            if (response.ok) {
                const data = await response.json();
                const parks = data.parks || [];
                
                if (parks.length > 0) {
                    const parkList = parks.slice(0, 3).map(park => 
                        `• ${park.name} (${park.designation} Tier) - SQM: ${park.sqm || 'N/A'}`
                    ).join('\n');
                    
                    return {
                        action: 'dark_sky_found',
                        spots: parks.slice(0, 5),
                        message: `I found ${parks.length} certified dark sky locations near you:\n\n${parkList}\n\nWould you like me to show you these on the map?`
                    };
                } else {
                    return {
                        action: 'chat',
                        message: "I couldn't find any certified dark sky parks in your immediate area. Dark sky locations are typically in rural areas far from city lights. Would you like me to suggest some general stargazing tips?"
                    };
                }
            } else {
                throw new Error('Dark sky API unavailable');
            }
            
        } catch (error) {
            return {
                action: 'chat',
                message: "I'm having trouble accessing dark sky location data right now. For the best stargazing, look for areas far from city lights with minimal light pollution. Rural parks and nature reserves are often good choices."
            };
        }
    }

    // Handle scientific analysis requests
    async handleScientificAnalysis(userInput, context) {
        const analysisTypes = {
            'predict': 'predictive modeling',
            'trend': 'trend analysis', 
            'forecast': 'forecasting',
            'statistics': 'statistical analysis',
            'research': 'comprehensive analysis'
        };
        
        let analysisType = 'comprehensive analysis';
        for (const [keyword, type] of Object.entries(analysisTypes)) {
            if (userInput.toLowerCase().includes(keyword)) {
                analysisType = type;
                break;
            }
        }
        
        if (!context.selectedArea && !context.hasSelection) {
            return {
                action: 'chat',
                message: `For ${analysisType}, please first select an area on the map. I can then provide detailed scientific analysis including light pollution trends, predictions, and research-grade measurements.`
            };
        }
        
        return {
            action: 'scientific_analysis',
            analysisType: analysisType,
            message: `Initiating ${analysisType} for the selected area. This will include processing satellite data, calculating trends, and generating research-grade insights...`
        };
    }

    // Handle help requests
    handleHelp(userInput, context) {
        const helpContent = `
🌟 **Project Nocturna Chatbot Help**

**Navigation Commands:**
• "Zoom to [location]" - Navigate to any place
• "Show me [city]" - Go to a specific location

**Analysis Commands:**
• "Analyze this area" - Measure light pollution
• "Extract data" - Get detailed measurements
• "Scientific analysis" - Research-grade insights

**Dark Sky Commands:**
• "Find dark sky parks" - Locate stargazing spots
• "Best stargazing locations" - Dark sky areas
• "Astronomy sites" - Observatory locations

**Research Commands:**
• "Predict light pollution" - Future trends
• "Analyze trends" - Historical patterns
• "Statistics" - Detailed measurements

**Tips:**
• Draw an area on the map before requesting analysis
• I can help with both basic and advanced research
• All analyses use real NASA satellite data when available

What would you like to explore today?
        `;
        
        return {
            action: 'chat',
            message: helpContent.trim()
        };
    }

    // Handle general chat with fallback to AI
    async handleGeneralChat(userInput, context) {
        const lightPollutionResponses = [
            "Light pollution affects both wildlife and human health. Would you like me to analyze light levels in your area?",
            "I can help you understand light pollution using real satellite data. Try selecting an area on the map for analysis.",
            "Did you know? Light pollution wastes billions in energy costs annually. I can analyze energy waste in your region.",
            "Dark sky preservation is important for astronomy and ecosystem health. Would you like to find dark sky locations near you?",
            "I use NASA VIIRS satellite data for accurate light pollution measurements. What aspect interests you most?"
        ];
        
        // Check if this might be a light pollution related question
        const lightPollutionKeywords = [
            'light', 'pollution', 'dark', 'sky', 'stars', 'night', 'energy', 'wildlife', 'health'
        ];
        
        const isRelated = lightPollutionKeywords.some(keyword => 
            userInput.toLowerCase().includes(keyword)
        );
        
        if (isRelated) {
            const randomResponse = lightPollutionResponses[
                Math.floor(Math.random() * lightPollutionResponses.length)
            ];
            
            return {
                action: 'chat',
                message: randomResponse
            };
        }
        
        // Fallback responses for general questions
        const generalResponses = [
            "I'm specialized in light pollution analysis and dark sky research. I can help you navigate to locations, analyze light pollution, find dark sky parks, and provide scientific insights. What would you like to explore?",
            "As a light pollution research assistant, I can help you with mapping, analysis, and finding dark sky locations. Try asking me to zoom to a location or analyze an area!",
            "I focus on helping with light pollution research and dark sky preservation. I can navigate to places, analyze satellite data, and find the best stargazing spots. How can I assist you today?"
        ];
        
        return {
            action: 'chat',
            message: generalResponses[
                Math.floor(Math.random() * generalResponses.length)
            ]
        };
    }

    // Conversation history management
    addToHistory(role, message) {
        this.conversationHistory.push({
            role: role,
            message: message,
            timestamp: new Date().toISOString()
        });
        
        // Keep history within limits
        if (this.conversationHistory.length > this.maxHistoryLength) {
            this.conversationHistory = this.conversationHistory.slice(-this.maxHistoryLength);
        }
    }

    getHistory() {
        return this.conversationHistory;
    }

    clearHistory() {
        this.conversationHistory = [];
    }

    // Get suggested actions based on context
    getSuggestions(context = {}) {
        const suggestions = [];
        
        if (!context.hasSelection) {
            suggestions.push({
                text: "Analyze this area",
                action: "prompt_selection",
                icon: "📊"
            });
        }
        
        if (context.mapCenter) {
            suggestions.push({
                text: "Find dark sky parks",
                action: "find_dark_sky",
                icon: "🌌"
            });
        }
        
        suggestions.push({
            text: "Get help",
            action: "get_help", 
            icon: "❓"
        });
        
        return suggestions;
    }

    // Export conversation for research purposes
    exportConversation() {
        return {
            conversation: this.conversationHistory,
            export_date: new Date().toISOString(),
            session_id: this.generateSessionId(),
            chatbot_version: "1.0.0"
        };
    }

    generateSessionId() {
        return 'chat_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
}

// Export for use in the application
if (typeof module !== 'undefined' && module.exports) {
    module.exports = LightPollutionChatbot;
} else if (typeof window !== 'undefined') {
    window.LightPollutionChatbot = LightPollutionChatbot;
}