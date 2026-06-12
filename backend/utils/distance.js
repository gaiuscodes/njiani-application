import axios from 'axios';

/**
 * Calculate distance between two coordinates using Haversine formula
 * Returns distance in kilometers
 */
export const calculateDistance = (lat1, lng1, lat2, lng2) => {
  const R = 6371; // Radius of the Earth in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  return distance;
};

/**
 * Get distance using Google Maps Distance Matrix API (more accurate for road distance)
 */
export const getDistanceFromGoogle = async (origin, destination) => {
  try {
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      // Fallback to Haversine if no API key
      if (origin.lat && origin.lng && destination.lat && destination.lng) {
        const distance = calculateDistance(origin.lat, origin.lng, destination.lat, destination.lng);
        return {
          distance: distance,
          distanceText: `${distance.toFixed(1)} km`,
          duration: null,
          durationText: null
        };
      }
      return null;
    }

    const url = 'https://maps.googleapis.com/maps/api/distancematrix/json';
    const params = {
      origins: `${origin.lat},${origin.lng}`,
      destinations: `${destination.lat},${destination.lng}`,
      key: apiKey,
      units: 'metric'
    };

    const response = await axios.get(url, { params });
    
    if (response.data.status === 'OK' && response.data.rows[0].elements[0].status === 'OK') {
      const element = response.data.rows[0].elements[0];
      return {
        distance: element.distance.value / 1000, // Convert meters to km
        distanceText: element.distance.text,
        duration: element.duration.value / 60, // Convert seconds to minutes
        durationText: element.duration.text
      };
    }
    
    return null;
  } catch (error) {
    console.error('Google Distance Matrix API error:', error.message);
    // Fallback to Haversine
    if (origin.lat && origin.lng && destination.lat && destination.lng) {
      const distance = calculateDistance(origin.lat, origin.lng, destination.lat, destination.lng);
      return {
        distance: distance,
        distanceText: `${distance.toFixed(1)} km`,
        duration: null,
        durationText: null
      };
    }
    return null;
  }
};

/**
 * Get coordinates from address using Google Geocoding API
 */
export const geocodeAddress = async (address) => {
  try {
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      return null;
    }

    const url = 'https://maps.googleapis.com/maps/api/geocode/json';
    const params = {
      address: address,
      key: apiKey,
      region: 'ke' // Restrict to Kenya
    };

    const response = await axios.get(url, { params });
    
    if (response.data.status === 'OK' && response.data.results.length > 0) {
      const location = response.data.results[0].geometry.location;
      return {
        lat: location.lat,
        lng: location.lng,
        formattedAddress: response.data.results[0].formatted_address
      };
    }
    
    return null;
  } catch (error) {
    console.error('Geocoding error:', error.message);
    return null;
  }
};

