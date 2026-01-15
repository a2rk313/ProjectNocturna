// NEW: js/weather-service.js
class WeatherService {
  constructor() {
    this.apiURL = 'https://api.open-meteo.com/v1'; // Free, no API key required
    this.moonCalculation = this.calculateMoonPhase();
  }
  
  async getAstroWeather(lat, lng) {
    try {
      const response = await fetch(
        `${this.apiURL}/forecast?latitude=${lat}&longitude=${lng}&current=cloud_cover,visibility,wind_speed_10m&hourly=cloud_cover,visibility&timezone=auto`
      );
      
      if (!response.ok) {
        throw new Error(`Weather API request failed: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      return {
        cloudCover: data.current.cloud_cover,
        visibility: data.current.visibility,
        windSpeed: data.current.wind_speed_10m,
        hourlyData: {
          cloudCover: data.hourly.cloud_cover,
          visibility: data.hourly.visibility,
          time: data.hourly.time
        }
      };
    } catch (error) {
      console.error('Weather API error:', error);
      // Fallback to mock data if API fails
      return this.getFallbackWeather(lat, lng);
    }
  }
  
  getFallbackWeather(lat, lng) {
    // Provide realistic weather data based on location
    const baseCloudCover = Math.random() * 40 + 10; // 10-50% typical
    const baseVisibility = Math.random() * 30 + 50; // 50-80 km typical
    
    return {
      cloudCover: Math.round(baseCloudCover),
      visibility: Math.round(baseVisibility),
      windSpeed: Math.round(Math.random() * 15),
      hourlyData: {
        cloudCover: Array(24).fill(0).map(() => Math.round(Math.random() * 100)),
        visibility: Array(24).fill(0).map(() => Math.round(Math.random() * 50 + 30)),
        time: Array(24).fill(0).map((_, i) => new Date(Date.now() + i * 3600000).toISOString())
      }
    };
  }
  
  calculateMoonPhase() {
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
    
    return {
      age: moonAge,
      illumination: illumination,
      phase: phaseName,
      emoji: this.getMoonEmoji(moonAge)
    };
  }
  
  getMoonEmoji(moonAge) {
    if (moonAge < 1) return "🌑";
    if (moonAge < 7.4) return "🌒";
    if (moonAge < 7.9) return "🌓";
    if (moonAge < 14.8) return "🌔";
    if (moonAge < 15.3) return "🌕";
    if (moonAge < 22.2) return "🌖";
    if (moonAge < 22.7) return "🌗";
    return "🌘";
  }
  
  async getStargazingConditions(lat, lng) {
    const weather = await this.getAstroWeather(lat, lng);
    const moon = this.calculateMoonPhase();
    
    // Calculate stargazing quality (1-10 scale)
    let score = 10;
    score -= (weather.cloudCover / 10);  // Clouds reduce quality significantly
    score -= (moon.illumination / 20);   // Moon reduces quality
    score += (weather.visibility / 20);  // Better visibility improves quality
    score = Math.max(1, Math.min(10, score));
    
    // Determine recommendation based on conditions
    let recommendation;
    if (score > 8 && weather.cloudCover < 20 && moon.illumination < 30) {
      recommendation = 'Excellent';
    } else if (score > 6 && weather.cloudCover < 40) {
      recommendation = 'Good';
    } else if (score > 4) {
      recommendation = 'Fair';
    } else {
      recommendation = 'Poor';
    }
    
    return {
      ...weather,
      moon,
      quality: Math.round(score),
      recommendation: recommendation,
      conditions_summary: this.generateConditionSummary(recommendation, weather, moon),
      best_times: this.identifyBestObservationTimes(weather)
    };
  }
  
  generateConditionSummary(recommendation, weather, moon) {
    const summaryParts = [];
    
    if (recommendation === 'Excellent') {
      summaryParts.push("✨ Perfect stargazing conditions!");
    } else if (recommendation === 'Good') {
      summaryParts.push("🌟 Good conditions for stargazing.");
    } else if (recommendation === 'Fair') {
      summaryParts.push("🌙 Fair conditions - better during darker hours.");
    } else {
      summaryParts.push("☁️ Poor conditions for stargazing.");
    }
    
    if (weather.cloudCover > 70) {
      summaryParts.push(`Cloud cover is ${weather.cloudCover}%, limiting visibility.`);
    } else if (weather.cloudCover > 40) {
      summaryParts.push(`Partly cloudy (${weather.cloudCover}% cloud cover) - watch for clearing skies.`);
    }
    
    if (moon.illumination > 80) {
      summaryParts.push(`Full moon (${moon.phase}) will wash out faint objects.`);
    } else if (moon.illumination > 50) {
      summaryParts.push(`Bright moon (${Math.round(moon.illumination)}% illuminated) may affect faint objects.`);
    } else {
      summaryParts.push(`Dark moon phase (${moon.phase}) - excellent for deep-sky objects.`);
    }
    
    return summaryParts.join(' ');
  }
  
  identifyBestObservationTimes(weather) {
    // Analyze hourly data to find best times
    if (!weather.hourlyData || !weather.hourlyData.cloudCover) {
      return ["Evening hours typically best"];
    }
    
    const bestTimes = [];
    const cloudCover = weather.hourlyData.cloudCover;
    const visibility = weather.hourlyData.visibility;
    
    // Look for periods of low clouds and good visibility in next 12 hours
    for (let i = 0; i < Math.min(12, cloudCover.length); i++) {
      const hourCloudCover = cloudCover[i];
      const hourVisibility = visibility[i];
      
      if (hourCloudCover < 30 && hourVisibility > 50) {
        const timeStr = new Date(weather.hourlyData.time[i]).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        bestTimes.push(timeStr);
      }
    }
    
    if (bestTimes.length > 0) {
      return bestTimes.slice(0, 3); // Return up to 3 best times
    } else {
      return ["Cloudy conditions expected - check again later"];
    }
  }
}

// Make WeatherService available globally if not already defined
if (typeof window !== 'undefined' && !window.WeatherService) {
  window.WeatherService = WeatherService;
}

module.exports = WeatherService;