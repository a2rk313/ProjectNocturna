import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { GoogleGenerativeAI } from '@google/generative-ai';

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

    let response: string;

    if (process.env.GOOGLE_GEMINI_API_KEY) {
        try {
            const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY);
            const model = genAI.getGenerativeModel({ model: "gemini-pro" });

            let prompt = `You are Lumina, the cosmic guide for Project Nocturna, a professional light pollution WebGIS platform.
Your goal is to help users discover dark skies, analyze light pollution data (VIIRS satellite data), and understand the impact of artificial light at night.

Context:
- User Mode: ${context?.mode ? context.mode : 'General'}
- User Location: ${context?.lat && context?.lon ? `${context.lat.toFixed(4)}, ${context.lon.toFixed(4)}` : 'Unknown'}
${bounds ? `- Map View Area: approx ${calculateArea(bounds).toFixed(0)} km²` : ''}

Tools available in the platform:
- Science Mode: VIIRS Radiance Map, Trend Analysis, Ecological Impact Simulator, Energy Waste Estimation.
- Citizen Mode: Dark Sky Parks Directory, Observation Planner (Astro Forecast), Real-time Light Pollution Map.

User Message: "${message}"

Respond directly to the user. Be helpful, scientific yet accessible, and professional. Keep responses concise (under 3 sentences unless detailed explanation is requested).
If the user asks about a specific tool, guide them to the appropriate mode.
`;

            const result = await model.generateContent(prompt);
            response = result.response.text();
        } catch (geminiError) {
            console.error("Gemini API Error:", geminiError);
            response = generateRuleBasedResponse(message, bounds, context);
        }
    } else {
        response = generateRuleBasedResponse(message, bounds, context);
    }

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

function generateRuleBasedResponse(message: string, bounds?: any, context?: any): string {
  const lowerMessage = message.toLowerCase();
  
  // Location-aware responses
  if (context?.lat && context?.lon) {
    if (lowerMessage.includes('light pollution') || lowerMessage.includes('radiance')) {
      return `Based on your location at ${context.lat.toFixed(4)}, ${context.lon.toFixed(4)}, I can analyze the current light pollution levels. Check the Science Mode for details.`;
    }
    if (lowerMessage.includes('dark sky') || lowerMessage.includes('stargazing')) {
      return `I can help you find the best dark sky sites near ${context.lat.toFixed(4)}, ${context.lon.toFixed(4)}. Try the Citizen Mode Parks Directory.`;
    }
  }
  
  // Map bounds aware responses
  if (bounds) {
    const area = calculateArea(bounds);
    if (area > 10000) {
      return `You're looking at a large area (${area.toFixed(0)} km²). For detailed analysis, try zooming in.`;
    }
  }
  
  if (lowerMessage.includes('hello') || lowerMessage.includes('hi')) {
    return "Greetings, stargazer! I'm Lumina, your cosmic guide. How can I assist you with your night sky journey today? (Gemini AI not configured, using fallback)";
  } else if (lowerMessage.includes('site') || lowerMessage.includes('park')) {
    return "You can find certified Dark Sky Parks in 'Citizen Mode' via the Parks tab.";
  } else if (lowerMessage.includes('pollution') || lowerMessage.includes('light')) {
      return "Light pollution affects 80% of the world's population. Use Science Mode to analyze it.";
  }
  
  return "Hello! I'm Lumina. I can help you discover dark skies and analyze light pollution. What would you like to explore?";
}

function calculateArea(bounds: any): number {
  if (!bounds || !bounds._northEast || !bounds._southWest) return 0;
  const latDiff = bounds._northEast.lat - bounds._southWest.lat;
  const lngDiff = bounds._northEast.lng - bounds._southWest.lng;
  const avgLat = (bounds._northEast.lat + bounds._southWest.lat) / 2;
  const kmPerDegLng = 111 * Math.cos(avgLat * Math.PI / 180);
  return Math.abs(latDiff * 111 * lngDiff * kmPerDegLng);
}
