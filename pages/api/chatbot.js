// pages/api/chatbot.js - Enhanced Chatbot API for Next.js
// Simple fallback implementation for now
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { message, context = {}, sessionId } = req.body;

    console.log(`🤖 Chatbot received: "${message}"`);

    // Basic intent detection
    const input = message.toLowerCase();
    
    // Intent detection
    if (input.includes('zoom') || input.includes('go to') || input.includes('show me') || input.includes('navigate')) {
      // Extract location using simple regex
      const locationMatch = message.match(/(?:to|at|in|near)\s+(.+)/i);
      const location = locationMatch ? locationMatch[1].trim() : '';
      
      if (location) {
        res.status(200).json({
          action: 'chat',
          message: `I can help you navigate to ${location}. Please use the zoom functionality or I can search for this location.`,
          timestamp: new Date().toISOString()
        });
      } else {
        res.status(200).json({
          action: 'chat',
          message: "I'd be happy to help you navigate! Please specify a location. For example: 'Zoom to New York' or 'Show me Paris'.",
          timestamp: new Date().toISOString()
        });
      }
      return;
    }

    if (input.includes('analyze') || input.includes('measure') || input.includes('extract') || input.includes('data')) {
      if (context.hasSelection || context.selectedArea) {
        res.status(200).json({
          action: 'extract_data',
          message: "Starting analysis of the selected area. This will process satellite data and provide light pollution measurements.",
          timestamp: new Date().toISOString()
        });
      } else {
        res.status(200).json({
          action: 'chat',
          message: "To analyze light pollution, please first select an area on the map using the drawing tools. Then I can provide detailed analysis.",
          timestamp: new Date().toISOString()
        });
      }
      return;
    }

    if (input.includes('dark sky') || input.includes('stargazing') || input.includes('astronomy') || input.includes('observatory')) {
      res.status(200).json({
        action: 'chat',
        message: "I can help you find dark sky locations. Dark sky parks and preserves offer the best stargazing opportunities. Would you like me to search for locations near you?",
        timestamp: new Date().toISOString()
      });
      return;
    }

    if (input.includes('help') || input.includes('what can') || input.includes('how to')) {
      res.status(200).json({
        action: 'chat',
        message: `I'm Lumina, your light pollution research assistant! Here's what I can help with:\n\n• **Navigation**: "Zoom to [location]" to navigate anywhere\n• **Analysis**: "Analyze this area" to measure light pollution \n• **Dark Skies**: "Find dark sky parks" to locate stargazing spots\n• **Research**: "Scientific analysis" for advanced insights\n\nTry selecting an area on the map first, then ask me to analyze it!`,
        timestamp: new Date().toISOString()
      });
      return;
    }

    // General light pollution related responses
    const lightPollutionKeywords = ['light', 'pollution', 'dark', 'sky', 'stars', 'night', 'energy', 'wildlife'];
    const isRelated = lightPollutionKeywords.some(keyword => input.includes(keyword));
    
    if (isRelated) {
      res.status(200).json({
        action: 'chat',
        message: "I specialize in light pollution analysis and dark sky preservation. I can help you understand satellite measurements, find dark sky locations, and analyze environmental impacts. What would you like to explore?",
        timestamp: new Date().toISOString()
      });
      return;
    }

    // Default response
    res.status(200).json({
      action: 'chat',
      message: "I'm Lumina, your light pollution research assistant. I can help with navigation, analysis of light pollution data, finding dark sky locations, and scientific insights. Try asking me to zoom to a location or analyze an area!",
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Chatbot error:', error);
    res.status(500).json({
      action: 'error',
      message: 'I apologize, but I encountered an error processing your request.',
      error: error.message
    });
  }
}