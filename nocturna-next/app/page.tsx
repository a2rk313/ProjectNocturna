'use client';

import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for Leaflet marker icons in Next.js
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Types
interface DarkSkySite {
  id: string;
  name: string;
  lat: number;
  lng: number;
  bortleClass: number;
  sqmReading: number;
  status: 'certified' | 'candidate' | 'rejected';
}

interface LightPollutionPoint {
  id: string;
  lat: number;
  lng: number;
  brightness: number;
  timestamp: string;
}

const HomePage = () => {
  const [darkSkySites, setDarkSkySites] = useState<DarkSkySite[]>([]);
  const [lightPollutionData, setLightPollutionData] = useState<LightPollutionPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [chatMessages, setChatMessages] = useState<{id: number, text: string, sender: 'user' | 'bot'}[]>([
    { id: 1, text: "Hello! I'm your Cosmic Guide. How can I help you explore dark skies today?", sender: 'bot' }
  ]);
  const [userInput, setUserInput] = useState('');

  // Load sample data on mount
  useEffect(() => {
    // Sample dark sky sites
    const sampleSites: DarkSkySite[] = [
      {
        id: '1',
        name: 'Natural Bridges National Monument',
        lat: 37.6061,
        lng: -110.0004,
        bortleClass: 2,
        sqmReading: 21.7,
        status: 'certified'
      },
      {
        id: '2',
        name: 'Isle of Wight',
        lat: 50.6927,
        lng: -1.3159,
        bortleClass: 4,
        sqmReading: 20.1,
        status: 'candidate'
      },
      {
        id: '3',
        name: 'Central Idaho Dark Sky Reserve',
        lat: 44.2721,
        lng: -114.7509,
        bortleClass: 1,
        sqmReading: 22.0,
        status: 'certified'
      }
    ];

    // Sample light pollution data
    const samplePollution: LightPollutionPoint[] = [
      { id: 'p1', lat: 37.7749, lng: -122.4194, brightness: 85.2, timestamp: '2023-10-15T08:00:00Z' },
      { id: 'p2', lat: 40.7128, lng: -74.0060, brightness: 92.5, timestamp: '2023-10-15T08:05:00Z' },
      { id: 'p3', lat: 34.0522, lng: -118.2437, brightness: 78.3, timestamp: '2023-10-15T08:10:00Z' },
    ];

    setDarkSkySites(sampleSites);
    setLightPollutionData(samplePollution);
    setIsLoading(false);
  }, []);

  const handleSendMessage = () => {
    if (!userInput.trim()) return;

    // Add user message
    const newUserMessage = {
      id: chatMessages.length + 1,
      text: userInput,
      sender: 'user' as const
    };

    setChatMessages(prev => [...prev, newUserMessage]);

    // Simulate bot response
    setTimeout(() => {
      const botResponse = {
        id: chatMessages.length + 2,
        text: getBotResponse(userInput),
        sender: 'bot' as const
      };
      setChatMessages(prev => [...prev, botResponse]);
    }, 1000);

    setUserInput('');
  };

  const getBotResponse = (input: string): string => {
    const lowerInput = input.toLowerCase();
    
    if (lowerInput.includes('dark sky') || lowerInput.includes('site')) {
      return "I found several dark sky sites nearby. The closest is Natural Bridges National Monument with Bortle Class 2 (pristine skies). Would you like directions?";
    } else if (lowerInput.includes('pollution') || lowerInput.includes('bright')) {
      return "Current light pollution levels indicate urban conditions (Bortle Class 8-9). Consider traveling to designated dark sky preserves for better stargazing.";
    } else if (lowerInput.includes('weather') || lowerInput.includes('cloud')) {
      return "Clear skies tonight with minimal cloud cover. Perfect conditions for stargazing! The moon is in a waxing crescent phase, so it won't interfere much.";
    } else if (lowerInput.includes('sqm') || lowerInput.includes('magnitude')) {
      return "SQM (Sky Quality Meter) readings measure sky brightness. Values above 21.0 indicate excellent dark skies, while values below 18.0 suggest bright urban conditions.";
    } else {
      return "I'm your Cosmic Guide. I can help you find dark sky sites, analyze light pollution data, provide stargazing forecasts, or explain astronomical concepts like the Bortle scale.";
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-indigo-950 text-white">
      {/* Header */}
      <header className="bg-black/30 backdrop-blur-md border-b border-indigo-800/50 py-4 px-6">
        <div className="container mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-300 to-purple-300 bg-clip-text text-transparent">
              Project Nocturna
            </h1>
            <p className="text-sm text-indigo-200">AI-Optimized Dark Sky Explorer</p>
          </div>
          <nav className="flex space-x-6">
            <a href="#" className="hover:text-blue-300 transition-colors">Map</a>
            <a href="#" className="hover:text-blue-300 transition-colors">Data</a>
            <a href="#" className="hover:text-blue-300 transition-colors">Research</a>
            <a href="#" className="hover:text-blue-300 transition-colors">About</a>
          </nav>
        </div>
      </header>

      <main className="container mx-auto p-4 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Map Section */}
        <div className="lg:col-span-2 bg-gray-800/30 rounded-xl overflow-hidden border border-indigo-800/30 h-[600px]">
          <MapContainer 
            center={[39.8283, -98.5795]} 
            zoom={4} 
            style={{ height: '100%', width: '100%' }}
            className="z-0"
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            
            {/* Dark Sky Sites */}
            {darkSkySites.map(site => (
              <Marker key={site.id} position={[site.lat, site.lng]}>
                <Popup>
                  <div className="font-semibold">{site.name}</div>
                  <div>Bortle Class: {site.bortleClass}</div>
                  <div>SQM Reading: {site.sqmReading}</div>
                  <div>Status: {site.status}</div>
                </Popup>
              </Marker>
            ))}
            
            {/* Light Pollution Points */}
            {lightPollutionData.map(point => (
              <Marker 
                key={point.id} 
                position={[point.lat, point.lng]}
                icon={
                  L.divIcon({
                    className: 'pollution-marker',
                    html: `<div style="
                      width: 12px; 
                      height: 12px; 
                      border-radius: 50%; 
                      background: ${point.brightness > 85 ? '#ef4444' : point.brightness > 70 ? '#f59e0b' : '#10b981'};
                      border: 2px solid white;
                      box-shadow: 0 0 5px rgba(0,0,0,0.5);
                    "></div>`,
                    iconSize: [16, 16],
                    iconAnchor: [8, 8]
                  })
                }
              >
                <Popup>
                  <div>Light Pollution Point</div>
                  <div>Brightness: {point.brightness}</div>
                  <div>Date: {new Date(point.timestamp).toLocaleDateString()}</div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>

        {/* Chatbot Panel */}
        <div className="flex flex-col bg-gray-800/30 backdrop-blur-md rounded-xl border border-indigo-800/30">
          <div className="p-4 border-b border-indigo-800/30">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <span className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></span>
              Cosmic Guide (AI Assistant)
            </h2>
            <p className="text-xs text-indigo-200 mt-1">Ask about dark skies, light pollution, or stargazing</p>
          </div>
          
          <div className="flex-1 p-4 overflow-y-auto max-h-96">
            <div className="space-y-4">
              {chatMessages.map(msg => (
                <div 
                  key={msg.id} 
                  className={`p-3 rounded-lg max-w-[80%] ${
                    msg.sender === 'user' 
                      ? 'bg-indigo-700/50 ml-auto' 
                      : 'bg-gray-700/50 mr-auto'
                  }`}
                >
                  {msg.text}
                </div>
              ))}
            </div>
          </div>
          
          <div className="p-4 border-t border-indigo-800/30">
            <div className="flex gap-2">
              <textarea
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Ask about dark skies, pollution data, or stargazing..."
                className="flex-1 bg-gray-700/50 border border-indigo-800/30 rounded-lg p-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-indigo-500"
                rows={2}
              />
              <button
                onClick={handleSendMessage}
                disabled={!userInput.trim()}
                className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 px-4 py-2 rounded-lg transition-colors"
              >
                Send
              </button>
            </div>
            <div className="mt-2 text-xs text-gray-400">
              Examples: "Find dark sky sites near me", "What is the Bortle scale?", "Weather forecast?"
            </div>
          </div>
        </div>

        {/* Stats Panel */}
        <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
          <div className="bg-gray-800/30 backdrop-blur-md rounded-xl p-4 border border-indigo-800/30">
            <h3 className="text-sm text-indigo-300 mb-1">Total Sites</h3>
            <p className="text-2xl font-bold">1,248</p>
            <p className="text-xs text-gray-400 mt-1">Certified dark sky places</p>
          </div>
          
          <div className="bg-gray-800/30 backdrop-blur-md rounded-xl p-4 border border-indigo-800/30">
            <h3 className="text-sm text-indigo-300 mb-1">Avg. Brightness</h3>
            <p className="text-2xl font-bold">20.4 mag</p>
            <p className="text-xs text-gray-400 mt-1">SQM reading</p>
          </div>
          
          <div className="bg-gray-800/30 backdrop-blur-md rounded-xl p-4 border border-indigo-800/30">
            <h3 className="text-sm text-indigo-300 mb-1">Data Points</h3>
            <p className="text-2xl font-bold">2.4M+</p>
            <p className="text-xs text-gray-400 mt-1">Measurements collected</p>
          </div>
          
          <div className="bg-gray-800/30 backdrop-blur-md rounded-xl p-4 border border-indigo-800/30">
            <h3 className="text-sm text-indigo-300 mb-1">Coverage</h3>
            <p className="text-2xl font-bold">96%</p>
            <p className="text-xs text-gray-400 mt-1">Of Earth's surface</p>
          </div>
        </div>
      </main>

      <footer className="mt-12 py-6 border-t border-indigo-800/30 text-center text-sm text-gray-400">
        <p>Project Nocturna - AI-Optimized Dark Sky Explorer | Data from NASA VIIRS, NOAA, and Global Light Pollution Networks</p>
        <p className="mt-2">© {new Date().getFullYear()} Project Nocturna Team. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default HomePage;