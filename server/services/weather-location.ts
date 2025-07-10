// Weather and Location Information Service
// Provides real-time weather data and location information

interface WeatherData {
  location: string;
  temperature: number;
  condition: string;
  humidity: number;
  windSpeed: number;
  feelsLike: number;
  visibility: number;
  pressure: number;
  uvIndex: number;
}

interface LocationInfo {
  name: string;
  country: string;
  region: string;
  latitude: number;
  longitude: number;
  timezone: string;
  population?: number;
  currency?: string;
  languages?: string[];
}

// Get country information from country code
function getCountryInfo(countryCode: string): { currency?: string; languages?: string[] } {
  const countryData: { [key: string]: { currency?: string; languages?: string[] } } = {
    'US': { currency: 'USD', languages: ['English'] },
    'GB': { currency: 'GBP', languages: ['English'] },
    'CA': { currency: 'CAD', languages: ['English', 'French'] },
    'AU': { currency: 'AUD', languages: ['English'] },
    'DE': { currency: 'EUR', languages: ['German'] },
    'FR': { currency: 'EUR', languages: ['French'] },
    'JP': { currency: 'JPY', languages: ['Japanese'] },
    'CN': { currency: 'CNY', languages: ['Chinese'] },
    'IN': { currency: 'INR', languages: ['Hindi', 'English'] },
    'BR': { currency: 'BRL', languages: ['Portuguese'] },
    'RU': { currency: 'RUB', languages: ['Russian'] },
    'IT': { currency: 'EUR', languages: ['Italian'] },
    'ES': { currency: 'EUR', languages: ['Spanish'] },
    'MX': { currency: 'MXN', languages: ['Spanish'] },
    'AR': { currency: 'ARS', languages: ['Spanish'] },
    'KR': { currency: 'KRW', languages: ['Korean'] },
    'NL': { currency: 'EUR', languages: ['Dutch'] },
    'SE': { currency: 'SEK', languages: ['Swedish'] },
    'NO': { currency: 'NOK', languages: ['Norwegian'] },
    'DK': { currency: 'DKK', languages: ['Danish'] },
    'FI': { currency: 'EUR', languages: ['Finnish'] },
    'CH': { currency: 'CHF', languages: ['German', 'French', 'Italian'] },
    'AT': { currency: 'EUR', languages: ['German'] },
    'BE': { currency: 'EUR', languages: ['Dutch', 'French'] },
    'PT': { currency: 'EUR', languages: ['Portuguese'] },
    'GR': { currency: 'EUR', languages: ['Greek'] },
    'PL': { currency: 'PLN', languages: ['Polish'] },
    'CZ': { currency: 'CZK', languages: ['Czech'] },
    'HU': { currency: 'HUF', languages: ['Hungarian'] },
    'RO': { currency: 'RON', languages: ['Romanian'] },
    'BG': { currency: 'BGN', languages: ['Bulgarian'] },
    'HR': { currency: 'EUR', languages: ['Croatian'] },
    'SI': { currency: 'EUR', languages: ['Slovenian'] },
    'SK': { currency: 'EUR', languages: ['Slovak'] },
    'EE': { currency: 'EUR', languages: ['Estonian'] },
    'LV': { currency: 'EUR', languages: ['Latvian'] },
    'LT': { currency: 'EUR', languages: ['Lithuanian'] },
    'IE': { currency: 'EUR', languages: ['English', 'Irish'] },
    'IS': { currency: 'ISK', languages: ['Icelandic'] },
    'MT': { currency: 'EUR', languages: ['Maltese', 'English'] },
    'CY': { currency: 'EUR', languages: ['Greek', 'Turkish'] },
    'LU': { currency: 'EUR', languages: ['French', 'German', 'Luxembourgish'] },
    'TR': { currency: 'TRY', languages: ['Turkish'] },
    'IL': { currency: 'ILS', languages: ['Hebrew', 'Arabic'] },
    'SA': { currency: 'SAR', languages: ['Arabic'] },
    'AE': { currency: 'AED', languages: ['Arabic'] },
    'EG': { currency: 'EGP', languages: ['Arabic'] },
    'ZA': { currency: 'ZAR', languages: ['Afrikaans', 'English'] },
    'NG': { currency: 'NGN', languages: ['English'] },
    'KE': { currency: 'KES', languages: ['English', 'Swahili'] },
    'TH': { currency: 'THB', languages: ['Thai'] },
    'VN': { currency: 'VND', languages: ['Vietnamese'] },
    'ID': { currency: 'IDR', languages: ['Indonesian'] },
    'MY': { currency: 'MYR', languages: ['Malay'] },
    'SG': { currency: 'SGD', languages: ['English', 'Malay', 'Chinese', 'Tamil'] },
    'PH': { currency: 'PHP', languages: ['Filipino', 'English'] },
    'NZ': { currency: 'NZD', languages: ['English'] },
    'CL': { currency: 'CLP', languages: ['Spanish'] },
    'PE': { currency: 'PEN', languages: ['Spanish'] },
    'CO': { currency: 'COP', languages: ['Spanish'] },
    'VE': { currency: 'VES', languages: ['Spanish'] },
    'UY': { currency: 'UYU', languages: ['Spanish'] },
    'PY': { currency: 'PYG', languages: ['Spanish', 'Guaraní'] },
    'EC': { currency: 'USD', languages: ['Spanish'] },
    'BO': { currency: 'BOB', languages: ['Spanish'] },
    'CR': { currency: 'CRC', languages: ['Spanish'] },
    'PA': { currency: 'PAB', languages: ['Spanish'] },
    'GT': { currency: 'GTQ', languages: ['Spanish'] },
    'HN': { currency: 'HNL', languages: ['Spanish'] },
    'SV': { currency: 'USD', languages: ['Spanish'] },
    'NI': { currency: 'NIO', languages: ['Spanish'] },
    'BZ': { currency: 'BZD', languages: ['English'] },
    'JM': { currency: 'JMD', languages: ['English'] },
    'TT': { currency: 'TTD', languages: ['English'] },
    'BB': { currency: 'BBD', languages: ['English'] },
    'GY': { currency: 'GYD', languages: ['English'] },
    'SR': { currency: 'SRD', languages: ['Dutch'] },
    'FK': { currency: 'FKP', languages: ['English'] },
    'GF': { currency: 'EUR', languages: ['French'] },
    'DO': { currency: 'DOP', languages: ['Spanish'] },
    'HT': { currency: 'HTG', languages: ['French', 'Haitian Creole'] },
    'CU': { currency: 'CUP', languages: ['Spanish'] },
    'BS': { currency: 'BSD', languages: ['English'] },
    'PR': { currency: 'USD', languages: ['Spanish', 'English'] },
    'VI': { currency: 'USD', languages: ['English'] },
    'GP': { currency: 'EUR', languages: ['French'] },
    'MQ': { currency: 'EUR', languages: ['French'] },
    'AI': { currency: 'XCD', languages: ['English'] },
    'AG': { currency: 'XCD', languages: ['English'] },
    'DM': { currency: 'XCD', languages: ['English'] },
    'GD': { currency: 'XCD', languages: ['English'] },
    'KN': { currency: 'XCD', languages: ['English'] },
    'LC': { currency: 'XCD', languages: ['English'] },
    'VC': { currency: 'XCD', languages: ['English'] },
    'MS': { currency: 'XCD', languages: ['English'] },
    'VG': { currency: 'USD', languages: ['English'] },
    'KY': { currency: 'KYD', languages: ['English'] },
    'TC': { currency: 'USD', languages: ['English'] },
    'BM': { currency: 'BMD', languages: ['English'] },
    'GL': { currency: 'DKK', languages: ['Greenlandic', 'Danish'] },
    'FO': { currency: 'DKK', languages: ['Faroese', 'Danish'] },
    'AX': { currency: 'EUR', languages: ['Swedish'] },
    'SJ': { currency: 'NOK', languages: ['Norwegian'] },
    'GG': { currency: 'GBP', languages: ['English'] },
    'JE': { currency: 'GBP', languages: ['English'] },
    'IM': { currency: 'GBP', languages: ['English'] },
    'GI': { currency: 'GIP', languages: ['English'] },
    'AD': { currency: 'EUR', languages: ['Catalan'] },
    'SM': { currency: 'EUR', languages: ['Italian'] },
    'VA': { currency: 'EUR', languages: ['Italian', 'Latin'] },
    'MC': { currency: 'EUR', languages: ['French'] },
    'LI': { currency: 'CHF', languages: ['German'] },
    'MK': { currency: 'MKD', languages: ['Macedonian'] },
    'AL': { currency: 'ALL', languages: ['Albanian'] },
    'ME': { currency: 'EUR', languages: ['Montenegrin'] },
    'RS': { currency: 'RSD', languages: ['Serbian'] },
    'BA': { currency: 'BAM', languages: ['Bosnian', 'Croatian', 'Serbian'] },
    'XK': { currency: 'EUR', languages: ['Albanian', 'Serbian'] },
    'MD': { currency: 'MDL', languages: ['Romanian'] },
    'UA': { currency: 'UAH', languages: ['Ukrainian'] },
    'BY': { currency: 'BYN', languages: ['Belarusian', 'Russian'] },
    'AM': { currency: 'AMD', languages: ['Armenian'] },
    'AZ': { currency: 'AZN', languages: ['Azerbaijani'] },
    'GE': { currency: 'GEL', languages: ['Georgian'] },
    'KZ': { currency: 'KZT', languages: ['Kazakh', 'Russian'] },
    'KG': { currency: 'KGS', languages: ['Kyrgyz', 'Russian'] },
    'TJ': { currency: 'TJS', languages: ['Tajik'] },
    'TM': { currency: 'TMT', languages: ['Turkmen'] },
    'UZ': { currency: 'UZS', languages: ['Uzbek'] },
    'MN': { currency: 'MNT', languages: ['Mongolian'] },
    'AF': { currency: 'AFN', languages: ['Pashto', 'Dari'] },
    'BD': { currency: 'BDT', languages: ['Bengali'] },
    'BT': { currency: 'BTN', languages: ['Dzongkha'] },
    'BN': { currency: 'BND', languages: ['Malay'] },
    'KH': { currency: 'KHR', languages: ['Khmer'] },
    'LA': { currency: 'LAK', languages: ['Lao'] },
    'MV': { currency: 'MVR', languages: ['Dhivehi'] },
    'MM': { currency: 'MMK', languages: ['Burmese'] },
    'NP': { currency: 'NPR', languages: ['Nepali'] },
    'PK': { currency: 'PKR', languages: ['Urdu', 'English'] },
    'LK': { currency: 'LKR', languages: ['Sinhala', 'Tamil'] },
    'TW': { currency: 'TWD', languages: ['Chinese'] },
    'HK': { currency: 'HKD', languages: ['Chinese', 'English'] },
    'MO': { currency: 'MOP', languages: ['Chinese', 'Portuguese'] },
    'IR': { currency: 'IRR', languages: ['Persian'] },
    'IQ': { currency: 'IQD', languages: ['Arabic'] },
    'JO': { currency: 'JOD', languages: ['Arabic'] },
    'KW': { currency: 'KWD', languages: ['Arabic'] },
    'LB': { currency: 'LBP', languages: ['Arabic'] },
    'OM': { currency: 'OMR', languages: ['Arabic'] },
    'QA': { currency: 'QAR', languages: ['Arabic'] },
    'SY': { currency: 'SYP', languages: ['Arabic'] },
    'YE': { currency: 'YER', languages: ['Arabic'] },
    'BH': { currency: 'BHD', languages: ['Arabic'] },
    'CY': { currency: 'EUR', languages: ['Greek', 'Turkish'] },
    'GE': { currency: 'GEL', languages: ['Georgian'] },
    'PS': { currency: 'ILS', languages: ['Arabic'] },
    'AU': { currency: 'AUD', languages: ['English'] },
    'NR': { currency: 'AUD', languages: ['Nauruan', 'English'] },
    'NU': { currency: 'NZD', languages: ['Niuean', 'English'] },
    'CK': { currency: 'NZD', languages: ['English'] },
    'FJ': { currency: 'FJD', languages: ['Fijian', 'English'] },
    'KI': { currency: 'AUD', languages: ['English'] },
    'MH': { currency: 'USD', languages: ['Marshallese', 'English'] },
    'FM': { currency: 'USD', languages: ['English'] },
    'PW': { currency: 'USD', languages: ['Palauan', 'English'] },
    'PG': { currency: 'PGK', languages: ['English'] },
    'WS': { currency: 'WST', languages: ['Samoan', 'English'] },
    'SB': { currency: 'SBD', languages: ['English'] },
    'TO': { currency: 'TOP', languages: ['Tongan', 'English'] },
    'TV': { currency: 'AUD', languages: ['Tuvaluan', 'English'] },
    'VU': { currency: 'VUV', languages: ['Bislama', 'English', 'French'] },
    'NC': { currency: 'XPF', languages: ['French'] },
    'PF': { currency: 'XPF', languages: ['French'] },
    'WF': { currency: 'XPF', languages: ['French'] },
    'TK': { currency: 'NZD', languages: ['English'] },
    'PN': { currency: 'NZD', languages: ['English'] },
    'GU': { currency: 'USD', languages: ['English'] },
    'AS': { currency: 'USD', languages: ['English'] },
    'MP': { currency: 'USD', languages: ['English'] },
    'UM': { currency: 'USD', languages: ['English'] },
    'AQ': { currency: 'USD', languages: ['English'] },
    'BV': { currency: 'NOK', languages: ['Norwegian'] },
    'HM': { currency: 'AUD', languages: ['English'] },
    'GS': { currency: 'GBP', languages: ['English'] },
    'TF': { currency: 'EUR', languages: ['French'] },
    'IO': { currency: 'USD', languages: ['English'] },
    'CC': { currency: 'AUD', languages: ['English'] },
    'CX': { currency: 'AUD', languages: ['English'] },
    'NF': { currency: 'AUD', languages: ['English'] },
    'SH': { currency: 'SHP', languages: ['English'] },
    'TA': { currency: 'GBP', languages: ['English'] },
    'AC': { currency: 'GBP', languages: ['English'] },
    'EH': { currency: 'MAD', languages: ['Arabic'] },
    'PM': { currency: 'EUR', languages: ['French'] },
    'YT': { currency: 'EUR', languages: ['French'] },
    'RE': { currency: 'EUR', languages: ['French'] },
    'MF': { currency: 'EUR', languages: ['French'] },
    'BL': { currency: 'EUR', languages: ['French'] },
    'CW': { currency: 'ANG', languages: ['Dutch'] },
    'SX': { currency: 'ANG', languages: ['Dutch'] },
    'BQ': { currency: 'USD', languages: ['Dutch'] },
    'AW': { currency: 'AWG', languages: ['Dutch'] }
  };
  
  return countryData[countryCode] || { currency: undefined, languages: undefined };
}

// Get weather data from OpenMeteo API (free, no API key required)
export async function getWeatherData(location: string): Promise<WeatherData> {
  try {
    // First get coordinates using OpenMeteo geocoding
    const geocodeUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(location)}&count=1&language=en&format=json`;
    const geocodeResponse = await fetch(geocodeUrl);
    
    if (!geocodeResponse.ok) {
      throw new Error(`Geocoding failed: ${geocodeResponse.status}`);
    }
    
    const geocodeData = await geocodeResponse.json();
    if (!geocodeData.results || geocodeData.results.length === 0) {
      throw new Error(`Location "${location}" not found`);
    }
    
    const { latitude, longitude, name, country } = geocodeData.results[0];
    
    // Get weather data from OpenMeteo
    const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,surface_pressure,wind_speed_10m,wind_direction_10m&timezone=auto&forecast_days=1`;
    const weatherResponse = await fetch(weatherUrl);
    
    if (!weatherResponse.ok) {
      throw new Error(`Weather API failed: ${weatherResponse.status}`);
    }
    
    const weatherData = await weatherResponse.json();
    const current = weatherData.current;
    
    // Convert weather code to condition description
    const getWeatherCondition = (code: number): string => {
      const conditions: { [key: number]: string } = {
        0: "Clear sky",
        1: "Mainly clear", 2: "Partly cloudy", 3: "Overcast",
        45: "Fog", 48: "Depositing rime fog",
        51: "Light drizzle", 53: "Moderate drizzle", 55: "Dense drizzle",
        56: "Light freezing drizzle", 57: "Dense freezing drizzle",
        61: "Slight rain", 63: "Moderate rain", 65: "Heavy rain",
        66: "Light freezing rain", 67: "Heavy freezing rain",
        71: "Slight snow", 73: "Moderate snow", 75: "Heavy snow",
        77: "Snow grains",
        80: "Slight rain showers", 81: "Moderate rain showers", 82: "Violent rain showers",
        85: "Slight snow showers", 86: "Heavy snow showers",
        95: "Thunderstorm", 96: "Thunderstorm with slight hail", 99: "Thunderstorm with heavy hail"
      };
      return conditions[code] || "Unknown";
    };
    
    return {
      location: `${name}, ${country}`,
      temperature: Math.round((current.temperature_2m * 9/5) + 32), // Convert to Fahrenheit
      condition: getWeatherCondition(current.weather_code),
      humidity: current.relative_humidity_2m,
      windSpeed: Math.round(current.wind_speed_10m * 2.237), // Convert km/h to mph
      feelsLike: Math.round((current.apparent_temperature * 9/5) + 32), // Convert to Fahrenheit
      visibility: 10, // OpenMeteo doesn't provide visibility, default to 10 miles
      pressure: Math.round(current.surface_pressure * 0.02953), // Convert hPa to inches of mercury
      uvIndex: 0 // UV index not available in free tier
    };
    
  } catch (error) {
    throw new Error(`Failed to get weather data: ${error.message}`);
  }
}

// Get detailed location information using OpenMeteo geocoding (free)
export async function getLocationInfo(location: string): Promise<LocationInfo> {
  try {
    // Use OpenMeteo geocoding API for comprehensive location info
    const geocodeUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(location)}&count=1&language=en&format=json`;
    const response = await fetch(geocodeUrl);
    
    if (!response.ok) {
      throw new Error(`Location lookup failed: ${response.status}`);
    }
    
    const data = await response.json();
    if (!data.results || data.results.length === 0) {
      throw new Error(`Location "${location}" not found`);
    }
    
    const result = data.results[0];
    
    // Get country info from country code
    const countryInfo = getCountryInfo(result.country_code);
    
    return {
      name: result.name,
      country: result.country,
      region: result.admin1 || result.country,
      latitude: result.latitude,
      longitude: result.longitude,
      timezone: result.timezone || 'UTC',
      population: result.population || undefined,
      currency: countryInfo.currency,
      languages: countryInfo.languages
    };
    
  } catch (error) {
    throw new Error(`Failed to get location info: ${error.message}`);
  }
}

// Enhanced location data with time zone information using free APIs
export async function getWorldTimeInfo(location: string): Promise<{ location: string; localTime: string; timezone: string; utcOffset: string }> {
  try {
    const locationInfo = await getLocationInfo(location);
    
    // Use WorldTimeAPI for accurate timezone info based on coordinates
    const timeApiUrl = `https://worldtimeapi.org/api/timezone`;
    const timeResponse = await fetch(timeApiUrl);
    
    if (timeResponse.ok) {
      const timezones = await timeResponse.json();
      
      // Find closest timezone based on location name and country
      const matchingTimezone = timezones.find((tz: string) => 
        tz.toLowerCase().includes(locationInfo.country.toLowerCase()) ||
        tz.toLowerCase().includes(locationInfo.name.toLowerCase()) ||
        tz.toLowerCase().includes(locationInfo.region.toLowerCase())
      ) || timezones[0];
      
      // Get current time for that timezone
      const currentTimeResponse = await fetch(`https://worldtimeapi.org/api/timezone/${matchingTimezone}`);
      if (currentTimeResponse.ok) {
        const timeData = await currentTimeResponse.json();
        
        return {
          location: `${locationInfo.name}, ${locationInfo.country}`,
          localTime: new Date(timeData.datetime).toLocaleString(),
          timezone: timeData.timezone,
          utcOffset: timeData.utc_offset
        };
      }
    }
    
    // Fallback to UTC time
    return {
      location: `${locationInfo.name}, ${locationInfo.country}`,
      localTime: new Date().toLocaleString(),
      timezone: "UTC",
      utcOffset: "+00:00"
    };
    
  } catch (error) {
    throw new Error(`Failed to get time info: ${error.message}`);
  }
}

// Format weather report for AI response
export function formatWeatherReport(weather: WeatherData): string {
  return `Current weather in ${weather.location}:
🌡️ Temperature: ${weather.temperature}°F (feels like ${weather.feelsLike}°F)
☁️ Conditions: ${weather.condition}
💧 Humidity: ${weather.humidity}%
💨 Wind Speed: ${weather.windSpeed} mph
👁️ Visibility: ${weather.visibility} miles
🔽 Pressure: ${weather.pressure} inHg`;
}

// Format location report for AI response
export function formatLocationReport(location: LocationInfo, timeInfo?: any): string {
  let report = `Information about ${location.name}:
📍 Location: ${location.name}, ${location.region}, ${location.country}
🌐 Coordinates: ${location.latitude.toFixed(4)}°, ${location.longitude.toFixed(4)}°`;

  if (timeInfo) {
    report += `
🕐 Local Time: ${timeInfo.localTime}
⏰ Timezone: ${timeInfo.timezone} (${timeInfo.utcOffset})`;
  }

  if (location.population) {
    report += `\n👥 Population: ${location.population.toLocaleString()}`;
  }

  return report;
}

// Check if a message is asking for weather information
export function isWeatherQuery(message: string): boolean {
  const weatherKeywords = ['weather', 'temperature', 'temp', 'climate', 'forecast', 'rain', 'snow', 'sunny', 'cloudy'];
  const messageWords = message.toLowerCase().split(' ');
  
  return weatherKeywords.some(keyword => 
    messageWords.some(word => word.includes(keyword))
  );
}

// Check if a message is asking for location/time information
export function isLocationQuery(message: string): boolean {
  const msg = message.toLowerCase();
  
  // Skip questions about "time to do something"
  if (msg.match(/\b(time to|best time|when to|how to|what's the best|good time|better time)\b/i)) {
    return false;
  }
  
  // Only match specific location query patterns
  const locationPatterns = [
    /\b(where is|location of|coordinates of|country of|city of)\b/i,
    /\b(time in|timezone in|what time is it in)\b/i,
    /\b(current time in|local time in)\b/i
  ];
  
  return locationPatterns.some(pattern => pattern.test(msg));
}

// Extract location from user message
export function extractLocation(message: string): string | null {
  const msg = message.toLowerCase();
  
  // Skip if it's clearly not a location query
  if (msg.match(/\b(time to|best time|when to|how to|what's the best|good time|better time)\b/i)) {
    return null;
  }
  
  // Skip common timezone abbreviations that aren't places when at end of message
  if (msg.match(/\b(est|pst|cst|mst|utc|gmt|edt|pdt|cdt|mdt)\b(\s*\?*\s*)$/i)) {
    return null;
  }
  
  // Enhanced location patterns - more specific
  const patterns = [
    /(?:weather|temperature|forecast|climate)\s+(?:in|at|for|of)\s+([a-zA-Z\s,]{3,30})/i,
    /(?:time)\s+(?:in|at|for|of)\s+([a-zA-Z\s,]{3,30})/i,
    /(?:in|at|for|of)\s+([a-zA-Z\s,]{3,30})(?:\s+weather|\s+temperature|\s+forecast|\s+climate)/i,
    /([a-zA-Z\s,]{3,30})\s+(?:weather|temperature|forecast|climate)$/i
  ];
  
  for (const pattern of patterns) {
    const match = message.match(pattern);
    if (match && match[1]) {
      let location = match[1].trim();
      
      // Clean up the location
      location = location
        .replace(/\b(weather|temperature|forecast|climate|time|the|a|an|is|are|in|at|for|of|to|from)\b/gi, '')
        .replace(/[?.,!]/g, '')
        .trim();
      
      // Validate location (must be reasonable length and not action words)
      if (location.length >= 3 && location.length <= 50 && /[a-zA-Z]/.test(location) && 
          !location.match(/\b(grill|cook|eat|sleep|work|study|exercise|run|walk|talk|play|watch|read|best|good|better|perfect|ideal)\b/i)) {
        return location;
      }
    }
  }
  
  return null;
}

export function isTimeZoneQuery(message: string): boolean {
  const msg = message.toLowerCase();
  
  // Direct timezone abbreviation queries
  if (msg.match(/\b(what time.*est|what time.*pst|what time.*cst|what time.*mst|time.*est|time.*pst|time.*cst|time.*mst)\b/i)) {
    return true;
  }
  
  const timeZoneKeywords = [
    'timezone', 'time zone', 'utc', 'gmt',
    'different time zones', 'world time', 'international time',
    'time difference', 'offset', 'daylight saving', 'time zones'
  ];
  
  return timeZoneKeywords.some(keyword => 
    msg.includes(keyword)
  );
}

// Comprehensive time zone data
export const WORLD_TIME_ZONES = {
  // North America
  'PST': { name: 'Pacific Standard Time', offset: 'UTC-8', regions: ['Los Angeles', 'San Francisco', 'Seattle', 'Vancouver'] },
  'PDT': { name: 'Pacific Daylight Time', offset: 'UTC-7', regions: ['Los Angeles', 'San Francisco', 'Seattle', 'Vancouver'] },
  'MST': { name: 'Mountain Standard Time', offset: 'UTC-7', regions: ['Denver', 'Phoenix', 'Salt Lake City'] },
  'MDT': { name: 'Mountain Daylight Time', offset: 'UTC-6', regions: ['Denver', 'Salt Lake City'] },
  'CST': { name: 'Central Standard Time', offset: 'UTC-6', regions: ['Chicago', 'Dallas', 'Mexico City'] },
  'CDT': { name: 'Central Daylight Time', offset: 'UTC-5', regions: ['Chicago', 'Dallas'] },
  'EST': { name: 'Eastern Standard Time', offset: 'UTC-5', regions: ['New York', 'Miami', 'Toronto'] },
  'EDT': { name: 'Eastern Daylight Time', offset: 'UTC-4', regions: ['New York', 'Miami', 'Toronto'] },
  
  // Europe & Africa
  'UTC': { name: 'Coordinated Universal Time', offset: 'UTC+0', regions: ['London (winter)', 'Dublin', 'Lisbon'] },
  'GMT': { name: 'Greenwich Mean Time', offset: 'UTC+0', regions: ['London (winter)', 'Dublin'] },
  'BST': { name: 'British Summer Time', offset: 'UTC+1', regions: ['London (summer)'] },
  'CET': { name: 'Central European Time', offset: 'UTC+1', regions: ['Paris', 'Berlin', 'Rome', 'Madrid'] },
  'CEST': { name: 'Central European Summer Time', offset: 'UTC+2', regions: ['Paris', 'Berlin', 'Rome', 'Madrid'] },
  'EET': { name: 'Eastern European Time', offset: 'UTC+2', regions: ['Helsinki', 'Athens', 'Cairo'] },
  'EEST': { name: 'Eastern European Summer Time', offset: 'UTC+3', regions: ['Helsinki', 'Athens'] },
  
  // Asia
  'JST': { name: 'Japan Standard Time', offset: 'UTC+9', regions: ['Tokyo', 'Osaka', 'Seoul'] },
  'CST_CHINA': { name: 'China Standard Time', offset: 'UTC+8', regions: ['Beijing', 'Shanghai', 'Hong Kong'] },
  'IST': { name: 'India Standard Time', offset: 'UTC+5:30', regions: ['Mumbai', 'Delhi', 'Bangalore'] },
  'MSK': { name: 'Moscow Standard Time', offset: 'UTC+3', regions: ['Moscow', 'St. Petersburg'] },
  
  // Australia & Oceania
  'AEST': { name: 'Australian Eastern Standard Time', offset: 'UTC+10', regions: ['Sydney', 'Melbourne'] },
  'AEDT': { name: 'Australian Eastern Daylight Time', offset: 'UTC+11', regions: ['Sydney', 'Melbourne'] },
  'AWST': { name: 'Australian Western Standard Time', offset: 'UTC+8', regions: ['Perth'] },
  'NZST': { name: 'New Zealand Standard Time', offset: 'UTC+12', regions: ['Auckland', 'Wellington'] },
  'NZDT': { name: 'New Zealand Daylight Time', offset: 'UTC+13', regions: ['Auckland', 'Wellington'] },
  
  // South America
  'BRT': { name: 'Brasília Time', offset: 'UTC-3', regions: ['São Paulo', 'Rio de Janeiro'] },
  'ART': { name: 'Argentina Time', offset: 'UTC-3', regions: ['Buenos Aires'] },
  'CLT': { name: 'Chile Standard Time', offset: 'UTC-4', regions: ['Santiago'] },
};

export function getTimeZoneInfo(): string {
  const zones = Object.entries(WORLD_TIME_ZONES);
  let info = "🌍 **WORLD TIME ZONES REFERENCE**\n\n";
  
  info += "**NORTH AMERICA:**\n";
  const northAmerica = zones.filter(([key]) => ['PST', 'PDT', 'MST', 'MDT', 'CST', 'CDT', 'EST', 'EDT'].includes(key));
  northAmerica.forEach(([code, data]) => {
    info += `• **${code}** - ${data.name} (${data.offset})\n  Major cities: ${data.regions.join(', ')}\n`;
  });
  
  info += "\n**EUROPE & AFRICA:**\n";
  const europe = zones.filter(([key]) => ['UTC', 'GMT', 'BST', 'CET', 'CEST', 'EET', 'EEST'].includes(key));
  europe.forEach(([code, data]) => {
    info += `• **${code}** - ${data.name} (${data.offset})\n  Major cities: ${data.regions.join(', ')}\n`;
  });
  
  info += "\n**ASIA:**\n";
  const asia = zones.filter(([key]) => ['JST', 'CST_CHINA', 'IST', 'MSK'].includes(key));
  asia.forEach(([code, data]) => {
    info += `• **${code}** - ${data.name} (${data.offset})\n  Major cities: ${data.regions.join(', ')}\n`;
  });
  
  info += "\n**AUSTRALIA & OCEANIA:**\n";
  const oceania = zones.filter(([key]) => ['AEST', 'AEDT', 'AWST', 'NZST', 'NZDT'].includes(key));
  oceania.forEach(([code, data]) => {
    info += `• **${code}** - ${data.name} (${data.offset})\n  Major cities: ${data.regions.join(', ')}\n`;
  });
  
  info += "\n**SOUTH AMERICA:**\n";
  const southAmerica = zones.filter(([key]) => ['BRT', 'ART', 'CLT'].includes(key));
  southAmerica.forEach(([code, data]) => {
    info += `• **${code}** - ${data.name} (${data.offset})\n  Major cities: ${data.regions.join(', ')}\n`;
  });
  
  info += "\n**💡 KEY FACTS:**\n";
  info += "• UTC (Coordinated Universal Time) is the world's time standard\n";
  info += "• Daylight Saving Time (DST) shifts clocks forward 1 hour in summer\n";
  info += "• Time zones are typically 1 hour apart, but some are 30 or 45 minutes\n";
  info += "• The International Date Line roughly follows 180° longitude\n";
  info += "• There are 24 main time zones, but over 400 time zone regions worldwide\n";
  
  return info;
}