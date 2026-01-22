import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';

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

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

const tools = [
  {
    functionDeclarations: [
      {
        name: "navigate_map",
        description: "Moves the map to a specific location (latitude/longitude) with an optional zoom level.",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            lat: { type: SchemaType.NUMBER, description: "Latitude of the location" },
            lon: { type: SchemaType.NUMBER, description: "Longitude of the location" },
            zoom: { type: SchemaType.NUMBER, description: "Zoom level (1-18). Default is 10." },
            location_name: { type: SchemaType.STRING, description: "Name of the location for confirmation" }
          },
          required: ["lat", "lon"]
        }
      },
      {
        name: "set_layer_visibility",
        description: "Turns a map layer on or off.",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            layer_id: {
              type: SchemaType.STRING,
              description: "The ID of the layer. Options: 'viirs' (Night Lights), 'parks' (Dark Sky Parks), 'measurements' (SQM Heatmap)."
            },
            visible: { type: SchemaType.BOOLEAN, description: "True to show, false to hide." }
          },
          required: ["layer_id", "visible"]
        }
      }
    ]
  }
];

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = ChatbotSchema.parse(body);
    const { message, bounds, context } = validatedData;

    if (!process.env.GEMINI_API_KEY) {
      // Fallback if no key provided
      return NextResponse.json({
        success: true,
        response: "I'm sorry, I cannot access my advanced brain functions right now (Missing API Key). But I can still help guide you manually!",
        action: null
      });
    }

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash", tools: tools });

    const chat = model.startChat({
      history: [
        {
          role: "user",
          parts: [{ text: "You are Lumina, an intelligent assistant for Project Nocturna, a WebGIS for light pollution analysis. You can control the map. Use tools when the user asks to go somewhere or see a layer. You also have access to new tools: 'Impact Simulator' (in Science Mode) which simulates new light sources, and 'Astrophotography Forecast' (in Citizen Mode) which predicts stargazing conditions. Guide users to these if relevant." }],
        },
        {
          role: "model",
          parts: [{ text: "Understood. I am Lumina. I can navigate the map, toggle layers, and guide users to the Light Pollution Impact Simulator and Astrophotography Forecast tools." }],
        }
      ],
    });

    const msgWithContext = `User Context: ${JSON.stringify(context || {})}. Map Bounds: ${JSON.stringify(bounds || {})}. User Message: ${message}`;
    const result = await chat.sendMessage(msgWithContext);
    const response = result.response;

    // Check for function calls
    const functionCalls = response.functionCalls();

    let action = null;
    let textResponse = response.text() || "Processing your request on the map...";

    if (functionCalls && functionCalls.length > 0) {
      const call = functionCalls[0];
      if (call.name === 'navigate_map') {
        action = {
          type: 'flyTo',
          center: [call.args.lat, call.args.lon],
          zoom: call.args.zoom || 10
        };
        textResponse = `Navigating to ${call.args.location_name || 'destination'}...`;
      } else if (call.name === 'set_layer_visibility') {
        action = {
          type: 'setLayer',
          layer: call.args.layer_id,
          visible: call.args.visible
        };
        textResponse = `${call.args.visible ? 'Enabling' : 'Disabling'} ${call.args.layer_id} layer.`;
      }
    }

    return NextResponse.json({ 
      success: true,
      response: textResponse,
      action: action,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Chatbot API error:', error);
    // Fallback response in case of API error
    return NextResponse.json({ 
      success: true, // Return true to show message
      response: "I'm having trouble connecting to my AI core. Please try again later.",
      error: 'AI Error'
    });
  }
}
