/**
 * Weather Intelligence Utility for LogiFlow
 * Simulates realistic weather conditions for Indian cities/routes
 */

export type WeatherCondition = 'sunny' | 'cloudy' | 'rain' | 'heavy_rain' | 'fog' | 'storm' | 'hot' | 'flood_risk';

export interface CityWeather {
  city: string;
  condition: WeatherCondition;
  tempC: number;
  humidity: number;
  windKmph: number;
  visibility: 'good' | 'moderate' | 'poor';
  riskLevel: 'low' | 'medium' | 'high' | 'severe';
  warning?: string;
  icon: string;
}

export interface RouteWeatherRisk {
  origin: string;
  destination: string;
  overallRisk: number; // 0-100
  primaryHazard: string;
  delayEstimateHours: number;
  conditions: Array<{ location: string; condition: WeatherCondition; impact: string }>;
  recommendation: string;
}

const now = new Date();
const month = now.getMonth() + 1; // 1-12

// Determine Indian season
function getSeason(): 'winter' | 'summer' | 'monsoon' | 'post_monsoon' {
  if (month >= 12 || month <= 2) return 'winter';
  if (month >= 3 && month <= 5) return 'summer';
  if (month >= 6 && month <= 9) return 'monsoon';
  return 'post_monsoon'; // Oct-Nov
}

// Realistic base conditions per city and season
const CITY_BASE: Record<string, Record<string, { condition: WeatherCondition; tempC: number; humidity: number; wind: number }>> = {
  Mumbai: {
    winter:       { condition: 'sunny',     tempC: 24, humidity: 62, wind: 12 },
    summer:       { condition: 'hot',       tempC: 36, humidity: 70, wind: 18 },
    monsoon:      { condition: 'heavy_rain',tempC: 28, humidity: 95, wind: 25 },
    post_monsoon: { condition: 'cloudy',    tempC: 30, humidity: 75, wind: 15 },
  },
  Delhi: {
    winter:       { condition: 'fog',       tempC: 12, humidity: 80, wind: 8  },
    summer:       { condition: 'hot',       tempC: 42, humidity: 28, wind: 22 },
    monsoon:      { condition: 'rain',      tempC: 31, humidity: 85, wind: 18 },
    post_monsoon: { condition: 'cloudy',    tempC: 26, humidity: 55, wind: 12 },
  },
  Bangalore: {
    winter:       { condition: 'sunny',     tempC: 20, humidity: 55, wind: 10 },
    summer:       { condition: 'cloudy',    tempC: 30, humidity: 55, wind: 14 },
    monsoon:      { condition: 'rain',      tempC: 24, humidity: 85, wind: 16 },
    post_monsoon: { condition: 'sunny',     tempC: 23, humidity: 65, wind: 11 },
  },
  Chennai: {
    winter:       { condition: 'rain',      tempC: 26, humidity: 78, wind: 16 },
    summer:       { condition: 'hot',       tempC: 38, humidity: 72, wind: 20 },
    monsoon:      { condition: 'storm',     tempC: 29, humidity: 95, wind: 35 },
    post_monsoon: { condition: 'heavy_rain',tempC: 27, humidity: 90, wind: 25 },
  },
  Kolkata: {
    winter:       { condition: 'fog',       tempC: 14, humidity: 75, wind: 8  },
    summer:       { condition: 'hot',       tempC: 38, humidity: 68, wind: 16 },
    monsoon:      { condition: 'heavy_rain',tempC: 30, humidity: 92, wind: 28 },
    post_monsoon: { condition: 'cloudy',    tempC: 27, humidity: 72, wind: 14 },
  },
  Hyderabad: {
    winter:       { condition: 'sunny',     tempC: 22, humidity: 50, wind: 10 },
    summer:       { condition: 'hot',       tempC: 40, humidity: 35, wind: 18 },
    monsoon:      { condition: 'rain',      tempC: 28, humidity: 82, wind: 20 },
    post_monsoon: { condition: 'cloudy',    tempC: 26, humidity: 60, wind: 12 },
  },
  Pune: {
    winter:       { condition: 'sunny',     tempC: 17, humidity: 55, wind: 10 },
    summer:       { condition: 'hot',       tempC: 35, humidity: 40, wind: 15 },
    monsoon:      { condition: 'heavy_rain',tempC: 25, humidity: 90, wind: 22 },
    post_monsoon: { condition: 'cloudy',    tempC: 24, humidity: 68, wind: 12 },
  },
  Ahmedabad: {
    winter:       { condition: 'sunny',     tempC: 19, humidity: 45, wind: 12 },
    summer:       { condition: 'hot',       tempC: 44, humidity: 25, wind: 25 },
    monsoon:      { condition: 'rain',      tempC: 31, humidity: 80, wind: 20 },
    post_monsoon: { condition: 'sunny',     tempC: 28, humidity: 50, wind: 14 },
  },
  Jaipur: {
    winter:       { condition: 'fog',       tempC: 13, humidity: 65, wind: 8  },
    summer:       { condition: 'hot',       tempC: 43, humidity: 20, wind: 22 },
    monsoon:      { condition: 'rain',      tempC: 30, humidity: 78, wind: 18 },
    post_monsoon: { condition: 'sunny',     tempC: 26, humidity: 42, wind: 12 },
  },
  Lucknow: {
    winter:       { condition: 'fog',       tempC: 10, humidity: 82, wind: 6  },
    summer:       { condition: 'hot',       tempC: 42, humidity: 32, wind: 18 },
    monsoon:      { condition: 'rain',      tempC: 30, humidity: 88, wind: 20 },
    post_monsoon: { condition: 'sunny',     tempC: 26, humidity: 55, wind: 10 },
  },
  Nagpur: {
    winter:       { condition: 'sunny',     tempC: 18, humidity: 52, wind: 10 },
    summer:       { condition: 'hot',       tempC: 44, humidity: 28, wind: 20 },
    monsoon:      { condition: 'heavy_rain',tempC: 28, humidity: 88, wind: 22 },
    post_monsoon: { condition: 'cloudy',    tempC: 25, humidity: 62, wind: 12 },
  },
  Kochi: {
    winter:       { condition: 'sunny',     tempC: 28, humidity: 72, wind: 15 },
    summer:       { condition: 'rain',      tempC: 32, humidity: 78, wind: 20 },
    monsoon:      { condition: 'storm',     tempC: 27, humidity: 98, wind: 40 },
    post_monsoon: { condition: 'rain',      tempC: 27, humidity: 85, wind: 22 },
  },
};

const WEATHER_ICONS: Record<WeatherCondition, string> = {
  sunny:      '☀️',
  cloudy:     '⛅',
  rain:       '🌧️',
  heavy_rain: '🌧️',
  fog:        '🌫️',
  storm:      '⛈️',
  hot:        '🔥',
  flood_risk: '🌊',
};

function computeRisk(condition: WeatherCondition, wind: number, humidity: number): 'low' | 'medium' | 'high' | 'severe' {
  if (condition === 'storm' || condition === 'flood_risk') return 'severe';
  if ((condition === 'heavy_rain' || condition === 'fog') && wind > 35) return 'high';
  if (condition === 'heavy_rain' || (condition === 'fog' && humidity > 85)) return 'high';
  if (condition === 'rain' || condition === 'hot' || condition === 'fog') return 'medium';
  return 'low';
}

function getWarning(condition: WeatherCondition, city: string, risk: string): string | undefined {
  if (risk === 'severe') return `⛈️ Severe weather advisory for ${city}. Avoid road freight if possible.`;
  if (condition === 'fog') return `🌫️ Dense fog in ${city}. Road/rail delays expected 2-4h.`;
  if (condition === 'heavy_rain') return `🌧️ Heavy rainfall in ${city}. Water logging risk on arterial roads.`;
  if (condition === 'storm') return `⚡ Storm warning for ${city}. Port operations may be suspended.`;
  if (condition === 'hot') return `🔥 Heatwave in ${city}. Driver fatigue risk — ensure breaks and hydration.`;
  return undefined;
}

export function getCityWeather(city: string): CityWeather {
  const season = getSeason();
  const base = CITY_BASE[city]?.[season] ?? { condition: 'sunny' as WeatherCondition, tempC: 28, humidity: 60, wind: 12 };
  
  // Add small random variance for realism
  const seed = city.charCodeAt(0) + now.getDate();
  const tempVariance = ((seed % 5) - 2);
  const windVariance = ((seed % 7) - 3);
  
  const tempC = base.tempC + tempVariance;
  const windKmph = Math.max(4, base.wind + windVariance);
  const humidity = base.humidity;
  
  const visibility: 'good' | 'moderate' | 'poor' =
    base.condition === 'fog' || (base.condition === 'heavy_rain' && windKmph > 25) ? 'poor' :
    base.condition === 'rain' || base.condition === 'cloudy' || base.condition === 'storm' ? 'moderate' : 'good';
  
  const riskLevel = computeRisk(base.condition, windKmph, humidity);
  const warning = getWarning(base.condition, city, riskLevel);
  
  return {
    city, condition: base.condition, tempC, humidity, windKmph,
    visibility, riskLevel, warning, icon: WEATHER_ICONS[base.condition]
  };
}

export function getRouteWeatherRisk(origin: string, destination: string): RouteWeatherRisk {
  const originW = getCityWeather(origin);
  const destW = getCityWeather(destination);
  
  const risks = [originW.riskLevel, destW.riskLevel];
  const riskMap = { 'low': 1, 'medium': 2, 'high': 3, 'severe': 4 };
  const maxRisk = Math.max(...risks.map(r => riskMap[r]));
  
  const overallRiskScore = maxRisk === 4 ? 90 : maxRisk === 3 ? 70 : maxRisk === 2 ? 40 : 15;
  
  const hazards: Record<WeatherCondition, string> = {
    storm:      'Active storm system',
    heavy_rain: 'Heavy rainfall / waterlogging',
    flood_risk: 'Flood risk zone',
    fog:        'Dense fog advisory',
    hot:        'Extreme heat (>42°C)',
    rain:       'Rain on route',
    cloudy:     'Overcast conditions',
    sunny:      'Clear conditions',
  };
  
  const worstCondition = maxRisk === riskMap[destW.riskLevel] ? destW.condition : originW.condition;
  const primaryHazard = hazards[worstCondition];
  
  const delayMap = { 'low': 0, 'medium': 1.5, 'high': 3.5, 'severe': 6 };
  const delayEstimateHours = Math.max(
    delayMap[originW.riskLevel], delayMap[destW.riskLevel]
  );
  
  const conditions = [
    { location: origin, condition: originW.condition, impact: originW.warning || `Normal ${originW.condition} conditions` },
    { location: destination, condition: destW.condition, impact: destW.warning || `Normal ${destW.condition} conditions` },
  ];
  
  const recommendations: Record<string, string> = {
    storm:      'Delay dispatch by 24h or switch to rail',
    heavy_rain: 'Add 3-4h buffer, check NHAI flood alerts on route',
    flood_risk: 'Avoid road freight — use rail or air',
    fog:        'Dispatch post-0900h when fog clears; use GPS tracking',
    hot:        'Schedule night/early morning departure; ensure driver breaks',
    rain:       'Allow 1-2h extra buffer; verify waterproofing of cargo',
    cloudy:     'No special precautions needed',
    sunny:      'Optimal conditions — proceed normally',
  };
  
  return {
    origin, destination, overallRisk: overallRiskScore,
    primaryHazard, delayEstimateHours, conditions,
    recommendation: recommendations[worstCondition]
  };
}

// Weather for all key cities — used in dashboard widget
export const KEY_CITIES = ['Mumbai', 'Delhi', 'Bangalore', 'Chennai', 'Kolkata', 'Hyderabad', 'Pune', 'Ahmedabad'];

export function getWeatherRiskColor(risk: string): string {
  switch (risk) {
    case 'severe': return 'text-red-700 bg-red-100 border-red-200';
    case 'high':   return 'text-orange-700 bg-orange-100 border-orange-200';
    case 'medium': return 'text-amber-700 bg-amber-100 border-amber-200';
    default:       return 'text-green-700 bg-green-100 border-green-200';
  }
}

export function getWeatherRiskBadge(risk: string): string {
  switch (risk) {
    case 'severe': return 'bg-red-500';
    case 'high':   return 'bg-orange-500';
    case 'medium': return 'bg-amber-500';
    default:       return 'bg-green-500';
  }
}
