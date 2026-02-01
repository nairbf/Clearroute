// Reverse geocoding using OpenStreetMap Nominatim (free)

interface NearbyRoad {
    name: string;
    type: string; // e.g., "primary", "residential", "motorway"
    distance?: number;
  }
  
  interface NominatimResult {
    address: {
      road?: string;
      highway?: string;
      street?: string;
      suburb?: string;
      city?: string;
      town?: string;
      village?: string;
      county?: string;
    };
    display_name: string;
  }
  
  // Get the road name at a specific location
  export async function getRoadAtLocation(lat: number, lng: number): Promise<string | null> {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18`,
        {
          headers: {
            'User-Agent': 'ClearRoute-CNY/1.0',
          },
        }
      );
  
      if (!response.ok) return null;
  
      const data: NominatimResult = await response.json();
      
      return data.address?.road || 
             data.address?.highway || 
             data.address?.street || 
             null;
    } catch (error) {
      console.error('Geocoding error:', error);
      return null;
    }
  }
  
  // Get nearby roads by searching in a small radius
  export async function getNearbyRoads(lat: number, lng: number): Promise<NearbyRoad[]> {
    const roads: NearbyRoad[] = [];
    const seenRoads = new Set<string>();
  
    // Search at the exact location first
    const mainRoad = await getRoadAtLocation(lat, lng);
    if (mainRoad && !seenRoads.has(mainRoad.toLowerCase())) {
      roads.push({ name: mainRoad, type: 'current' });
      seenRoads.add(mainRoad.toLowerCase());
    }
  
    // Search in 8 directions around the point (roughly 200m away)
    const offset = 0.002; // ~200 meters
    const directions = [
      { lat: lat + offset, lng: lng },          // North
      { lat: lat - offset, lng: lng },          // South
      { lat: lat, lng: lng + offset },          // East
      { lat: lat, lng: lng - offset },          // West
      { lat: lat + offset, lng: lng + offset }, // NE
      { lat: lat + offset, lng: lng - offset }, // NW
      { lat: lat - offset, lng: lng + offset }, // SE
      { lat: lat - offset, lng: lng - offset }, // SW
    ];
  
    // Fetch nearby roads (with small delay to respect rate limits)
    for (const dir of directions) {
      try {
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 200));
        
        const road = await getRoadAtLocation(dir.lat, dir.lng);
        if (road && !seenRoads.has(road.toLowerCase())) {
          roads.push({ name: road, type: 'nearby' });
          seenRoads.add(road.toLowerCase());
        }
      } catch (error) {
        // Continue even if one request fails
      }
  
      // Stop if we have enough roads
      if (roads.length >= 6) break;
    }
  
    return roads;
  }
  
  // Get location details (city, county, etc.)
  export async function getLocationDetails(lat: number, lng: number): Promise<{
    road: string | null;
    city: string | null;
    county: string | null;
    displayName: string;
  }> {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=16`,
        {
          headers: {
            'User-Agent': 'ClearRoute-CNY/1.0',
          },
        }
      );
  
      if (!response.ok) {
        return { road: null, city: null, county: null, displayName: `${lat.toFixed(4)}, ${lng.toFixed(4)}` };
      }
  
      const data: NominatimResult = await response.json();
      
      const road = data.address?.road || data.address?.highway || data.address?.street || null;
      const city = data.address?.city || data.address?.town || data.address?.village || data.address?.suburb || null;
      const county = data.address?.county || null;
  
      let displayName = '';
      if (road) displayName += road;
      if (city) displayName += displayName ? `, ${city}` : city;
      if (!displayName) displayName = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  
      return { road, city, county, displayName };
    } catch (error) {
      console.error('Geocoding error:', error);
      return { road: null, city: null, county: null, displayName: `${lat.toFixed(4)}, ${lng.toFixed(4)}` };
    }
  }
  
  // Map county names from Nominatim to our enum values
  export function mapCountyName(county: string | null): string | null {
    if (!county) return null;
    
    const countyLower = county.toLowerCase();
    
    if (countyLower.includes('onondaga')) return 'onondaga';
    if (countyLower.includes('oswego')) return 'oswego';
    if (countyLower.includes('madison')) return 'madison';
    if (countyLower.includes('cayuga')) return 'cayuga';
    if (countyLower.includes('oneida')) return 'oneida';
    if (countyLower.includes('cortland')) return 'cortland';
    
    return null;
  }