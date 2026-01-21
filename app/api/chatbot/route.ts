import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const ChatbotSchema = z.object({
  message: z.string().min(1).max(1000),
  bounds: z.object({
    _southWest: z.object({ lat: z.number(), lng: z.number() }),
    _northEast: z.object({ lat: z.number(), lng: z.number() })
  }).optional(),
  context: z.object({
    lat: z.number().optional(),
    lon: z.number().optional(),
    mode: z.enum(['science', 'citizen']).optional(),
  }).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = ChatbotSchema.parse(body);
    const { message, bounds, context } = validatedData;

    // Generate context-aware response
    const response = generateAIResponse(message, bounds, context);

    return NextResponse.json({ 
      success: true,
      response,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Invalid request format',
        details: error.errors
      }, { status: 400 });
    }
    
    console.error('Chatbot API error:', error);
    return NextResponse.json({ 
      success: false,
      error: 'Chatbot service unavailable' 
    }, { status: 500 });
  }
}

function generateAIResponse(message: string, bounds?: any, context?: any): string {
  const lowerMessage = message.toLowerCase();
  
  // Location-aware responses
  if (context?.lat && context?.lon) {
    if (lowerMessage.includes('light pollution') || lowerMessage.includes('radiance')) {
      return `Based on your location at ${context.lat.toFixed(4)}, ${context.lon.toFixed(4)}, I can analyze the current light pollution levels. Would you like me to run a detailed assessment?`;
    }
    if (lowerMessage.includes('dark sky') || lowerMessage.includes('stargazing')) {
      return `I can help you find the best dark sky sites near ${context.lat.toFixed(4)}, ${context.lon.toFixed(4)}. Let me search for nearby parks and low-light areas.`;
    }
  }
  
  // Map bounds aware responses
  if (bounds) {
    const area = calculateArea(bounds);
    if (area > 10000) {
      return `You're looking at a large area (${area.toFixed(0)} km²). For detailed analysis, try zooming in to a specific region.`;
    }
  }
  
  // Enhanced rule-based responses
  if (lowerMessage.includes('hello') || lowerMessage.includes('hi')) {
    return "Greetings, stargazer! I'm Lumina, your cosmic guide. How can I assist you with your night sky journey today?";
  } else if (lowerMessage.includes('site') || lowerMessage.includes('park') || lowerMessage.includes('where')) {
    return context?.lat && context?.lon 
      ? "Let me find the nearest Dark Sky Parks and stargazing locations for your area."
      : "You can find certified Dark Sky Parks in 'Citizen Mode' via the Parks tab, or search nearby locations in Discovery mode.";
  } else if (lowerMessage.includes('pollution') || lowerMessage.includes('light')) {
    if (bounds) {
      return "For the current map area, I can analyze light pollution levels using VIIRS satellite data. Check the Scientific Mode for detailed radiance analysis.";
    } else {
      return "Light pollution affects 80% of the world's population. I can help you analyze current conditions and trends using satellite data.";
    }
  } else if (lowerMessage.includes('bortle')) {
    return "The Bortle Scale measures night sky brightness from Class 1 (excellent dark skies) to Class 9 (inner-city). I can determine the Bortle class for your location using satellite data.";
  } else if (lowerMessage.includes('viirs')) {
    return "VIIRS provides high-quality nighttime light data from space. I use this to measure current radiance levels and analyze light pollution trends over time.";
  } else if (lowerMessage.includes('weather') || lowerMessage.includes('cloud')) {
    return "You can check cloud cover and moon phase in the Observation Planner (Citizen Mode) to find the best nights for stargazing.";
  } else if (lowerMessage.includes('trend') || lowerMessage.includes('energy')) {
    return "Switch to Scientific Mode to run comprehensive trend analysis and energy waste assessments using historical satellite data.";
  } else if (lowerMessage.includes('help')) {
    return "I can help you with: finding dark sky sites, analyzing light pollution, understanding the Bortle scale, VIIRS data analysis, energy waste assessments, and observation planning. What interests you most?";
  }
  
  return "Hello! I'm Lumina, your cosmic guide for Project Nocturna. I can help you discover dark skies, analyze light pollution, and plan observations. What would you like to explore?";
}

function calculateArea(bounds: any): number {
  // Simple rectangular area calculation in km² (rough approximation)
  const latDiff = bounds._northEast.lat - bounds._southWest.lat;
  const lngDiff = bounds._northEast.lng - bounds._southWest.lng;
  // Convert degrees to approximate km (111 km per degree latitude, varies by longitude)
  const avgLat = (bounds._northEast.lat + bounds._southWest.lat) / 2;
  const kmPerDegLng = 111 * Math.cos(avgLat * Math.PI / 180);
  return Math.abs(latDiff * 111 * lngDiff * kmPerDegLng);
}
