import { useState, useCallback, useRef, useEffect } from 'react';
import { GoogleMap, LoadScript, Marker, InfoWindow, Circle, Polyline } from '@react-google-maps/api';
import axios from 'axios';
import { io } from 'socket.io-client';

// Sample delivery locations in Kenya (major cities/areas) with geofence radius in meters
const deliveryLocations = [
  {
    id: 1,
    name: 'Nairobi CBD',
    position: { lat: -1.2921, lng: 36.8219 },
    description: 'Central Business District - High delivery volume',
    deliveries: '500+ daily',
    radius: 3000, // 3km radius
    active: true
  },
  {
    id: 2,
    name: 'Westlands',
    position: { lat: -1.2649, lng: 36.8025 },
    description: 'Commercial hub with many shops',
    deliveries: '300+ daily',
    radius: 2500, // 2.5km radius
    active: true
  },
  {
    id: 3,
    name: 'Kileleshwa',
    position: { lat: -1.2833, lng: 36.7833 },
    description: 'Residential area with frequent deliveries',
    deliveries: '200+ daily',
    radius: 2000, // 2km radius
    active: true
  },
  {
    id: 4,
    name: 'Parklands',
    position: { lat: -1.2667, lng: 36.8167 },
    description: 'Business and residential district',
    deliveries: '250+ daily',
    radius: 2200, // 2.2km radius
    active: true
  },
  {
    id: 5,
    name: 'Kilimani',
    position: { lat: -1.2833, lng: 36.7833 },
    description: 'Upmarket residential area',
    deliveries: '180+ daily',
    radius: 2000, // 2km radius
    active: true
  },
  {
    id: 6,
    name: 'Jevanjee Gardens',
    position: { lat: -1.2864, lng: 36.8172 },
    description: 'Historic area near CBD',
    deliveries: '150+ daily',
    radius: 1500, // 1.5km radius
    active: true
  },
  {
    id: 7,
    name: 'Mombasa Road',
    position: { lat: -1.3000, lng: 36.8500 },
    description: 'Major transport corridor',
    deliveries: '220+ daily',
    radius: 4000, // 4km radius (longer corridor)
    active: true
  },
  {
    id: 8,
    name: 'Thika Road',
    position: { lat: -1.2000, lng: 36.9000 },
    description: 'Industrial and commercial zone',
    deliveries: '190+ daily',
    radius: 3500, // 3.5km radius
    active: true
  }
];

const mapContainerStyle = {
  width: '100%',
  height: '100%',
  borderRadius: '8px'
};

// Default center: Nairobi, Kenya
const defaultCenter = {
  lat: -1.2921,
  lng: 36.8219
};

const defaultOptions = {
  zoomControl: true,
  streetViewControl: false,
  mapTypeControl: false,
  fullscreenControl: true,
  styles: [
    {
      featureType: 'all',
      elementType: 'geometry',
      stylers: [{ color: '#242f3e' }]
    },
    {
      featureType: 'all',
      elementType: 'labels.text.stroke',
      stylers: [{ color: '#242f3e' }]
    },
    {
      featureType: 'all',
      elementType: 'labels.text.fill',
      stylers: [{ color: '#746855' }]
    },
    {
      featureType: 'water',
      elementType: 'geometry',
      stylers: [{ color: '#17263c' }]
    },
    {
      featureType: 'road',
      elementType: 'geometry',
      stylers: [{ color: '#38414e' }]
    },
    {
      featureType: 'road',
      elementType: 'geometry.stroke',
      stylers: [{ color: '#212a37' }]
    },
    {
      featureType: 'road',
      elementType: 'labels.text.fill',
      stylers: [{ color: '#9ca5b3' }]
    },
    {
      featureType: 'road.highway',
      elementType: 'geometry',
      stylers: [{ color: '#746855' }]
    },
    {
      featureType: 'road.highway',
      elementType: 'geometry.stroke',
      stylers: [{ color: '#1f2835' }]
    },
    {
      featureType: 'road.highway',
      elementType: 'labels.text.fill',
      stylers: [{ color: '#f3d19c' }]
    },
    {
      featureType: 'transit',
      elementType: 'geometry',
      stylers: [{ color: '#2f3948' }]
    },
    {
      featureType: 'poi',
      elementType: 'labels.text.fill',
      stylers: [{ color: '#d59563' }]
    }
  ]
};

const InteractiveMap = () => {
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState(null);
  const [currentPosition, setCurrentPosition] = useState(null);
  const [activeGeofences, setActiveGeofences] = useState([]);
  const [geofenceAlerts, setGeofenceAlerts] = useState([]);
  const [liveData, setLiveData] = useState({
    activeDeliveries: [],
    activeRiders: [],
    shops: []
  });
  const [selectedDelivery, setSelectedDelivery] = useState(null);
  const [showLiveData, setShowLiveData] = useState(true);
  const [mapType, setMapType] = useState('deliveries'); // 'deliveries', 'riders', 'shops', 'all'
  const mapRef = useRef(null);
  const watchIdRef = useRef(null);
  const socketRef = useRef(null);
  const updateIntervalRef = useRef(null);

  // Load live map data
  const loadLiveData = useCallback(async () => {
    try {
      const response = await axios.get('/api/orders/live-map');
      setLiveData(response.data);
    } catch (error) {
      console.error('Error loading live map data:', error);
    }
  }, []);

  // Initialize socket for real-time updates
  useEffect(() => {
    const socketUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';
    const socket = io(socketUrl, {
      withCredentials: true
    });

    socket.on('connect', () => {
      console.log('Connected to socket for live map updates');
    });

    socket.on('location_update', (data) => {
      // Update rider location in real-time
      setLiveData(prev => ({
        ...prev,
        activeRiders: prev.activeRiders.map(rider =>
          rider.id === data.riderId
            ? { ...rider, location: { lat: data.lat, lng: data.lng } }
            : rider
        ),
        activeDeliveries: prev.activeDeliveries.map(delivery =>
          delivery.rider && delivery.rider.id === data.riderId
            ? {
                ...delivery,
                rider: {
                  ...delivery.rider,
                  currentLocation: { lat: data.lat, lng: data.lng }
                }
              }
            : delivery
        )
      }));
    });

    socket.on('order_status_update', () => {
      // Reload data when order status changes
      loadLiveData();
    });

    socketRef.current = socket;

    return () => {
      if (socket) socket.disconnect();
    };
  }, [loadLiveData]);

  // Auto-refresh live data every 10 seconds
  useEffect(() => {
    loadLiveData();
    updateIntervalRef.current = setInterval(loadLiveData, 10000);

    return () => {
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current);
      }
    };
  }, [loadLiveData]);

  const onMapLoad = useCallback((map) => {
    try {
      mapRef.current = map;
      setMapLoaded(true);
      setMapError(null);
      
      // Start geofencing when map loads
      startGeofencing();
    } catch (error) {
      console.error('Error loading map:', error);
      setMapError('Failed to load map');
    }
  }, []);

  // Calculate distance between two points using Haversine formula
  const calculateDistance = (lat1, lng1, lat2, lng2) => {
    const R = 6371000; // Earth's radius in meters
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in meters
  };

  // Check if position is within geofence
  const checkGeofences = useCallback((position) => {
    if (!position) return;

    setActiveGeofences(prevActive => {
      const newActiveGeofences = [];
      const newAlerts = [];

      deliveryLocations.forEach((location) => {
        if (!location.active) return;

        const distance = calculateDistance(
          position.lat,
          position.lng,
          location.position.lat,
          location.position.lng
        );

        const isInside = distance <= location.radius;
        const wasInside = prevActive.some(g => g.id === location.id);

        if (isInside) {
          newActiveGeofences.push({
            ...location,
            distance: Math.round(distance),
            enteredAt: wasInside ? prevActive.find(g => g.id === location.id)?.enteredAt : new Date()
          });

          if (!wasInside) {
            // Entered geofence
            newAlerts.push({
              type: 'enter',
              location: location.name,
              message: `Entered ${location.name} delivery zone`,
              timestamp: new Date()
            });
          }
        } else if (wasInside) {
          // Exited geofence
          newAlerts.push({
            type: 'exit',
            location: location.name,
            message: `Exited ${location.name} delivery zone`,
            timestamp: new Date()
          });
        }
      });

      if (newAlerts.length > 0) {
        setGeofenceAlerts(prev => [...newAlerts, ...prev].slice(0, 5)); // Keep last 5 alerts
      }

      return newActiveGeofences;
    });
  }, []);

  // Start geofencing with geolocation
  const startGeofencing = useCallback(() => {
    if (!navigator.geolocation) {
      console.warn('Geolocation is not supported by this browser');
      return;
    }

    // Get current position
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const pos = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
        setCurrentPosition(pos);
        checkGeofences(pos);
      },
      (error) => {
        console.error('Error getting location:', error);
      },
      {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0
      }
    );

    // Watch position for real-time updates
    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const pos = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
        setCurrentPosition(pos);
        checkGeofences(pos);
      },
      (error) => {
        console.error('Error watching location:', error);
      },
      {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 10000 // Use cached position if less than 10 seconds old
      }
    );
  }, [checkGeofences]);

  // Cleanup geolocation watch on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  const onMapError = useCallback((error) => {
    console.error('Map error:', error);
    setMapError('Failed to load Google Maps');
  }, []);

  const onMarkerClick = useCallback((location) => {
    setSelectedLocation(location);
  }, []);

  const onInfoWindowClose = useCallback(() => {
    setSelectedLocation(null);
  }, []);

  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

  // Fallback UI if no API key
  if (!apiKey) {
    return (
      <div className="bg-dark-700/50 rounded-lg h-96 flex items-center justify-center backdrop-blur-sm">
        <div className="text-center p-6">
          <div className="text-6xl mb-4">🗺️</div>
          <p className="text-gray-200 text-lg mb-2">Interactive Delivery Map</p>
          <p className="text-sm text-gray-300 mb-4">
            To enable the interactive map, add your Google Maps API key
          </p>
          <div className="bg-dark-800 p-4 rounded-lg text-left max-w-md mx-auto">
            <p className="text-xs text-gray-400 mb-2">Add to your <code className="bg-dark-900 px-2 py-1 rounded">.env</code> file:</p>
            <code className="text-xs text-primary-400 bg-dark-900 px-2 py-1 rounded block">
              VITE_GOOGLE_MAPS_API_KEY=your_key_here
            </code>
            <p className="text-xs text-gray-400 mt-3">
              Get your API key from{' '}
              <a 
                href="https://console.cloud.google.com/" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-primary-500 hover:underline"
              >
                Google Cloud Console
              </a>
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (mapError) {
    return (
      <div className="bg-dark-700/50 rounded-lg h-96 flex items-center justify-center backdrop-blur-sm">
        <div className="text-center p-6">
          <div className="text-6xl mb-4">⚠️</div>
          <p className="text-gray-200 text-lg mb-2">Map Loading Error</p>
          <p className="text-sm text-gray-300">{mapError}</p>
        </div>
      </div>
    );
  }

  try {
    return (
      <LoadScript 
        googleMapsApiKey={apiKey}
        onError={onMapError}
        loadingElement={
          <div className="h-96 flex items-center justify-center bg-dark-700/50 rounded-lg">
            <p className="text-gray-400">Loading map...</p>
          </div>
        }
        libraries={['places', 'geometry']}
      >
        <div className="relative w-full h-96 rounded-lg overflow-hidden">
          <GoogleMap
            mapContainerStyle={mapContainerStyle}
            center={defaultCenter}
            zoom={12}
            options={defaultOptions}
            onLoad={onMapLoad}
            onError={onMapError}
          >
            {/* Geofence Circles */}
            {mapLoaded && typeof window !== 'undefined' && window.google && window.google.maps && deliveryLocations.map((location) => {
              if (!location.active) return null;
              
              const isActive = activeGeofences.some(g => g.id === location.id);
              
              try {
                return (
                  <Circle
                    key={`geofence-${location.id}`}
                    center={location.position}
                    radius={location.radius}
                    options={{
                      fillColor: isActive ? '#10b981' : '#ef4444',
                      fillOpacity: isActive ? 0.2 : 0.1,
                      strokeColor: isActive ? '#10b981' : '#ef4444',
                      strokeOpacity: isActive ? 0.8 : 0.5,
                      strokeWeight: isActive ? 3 : 2,
                      clickable: true,
                      zIndex: isActive ? 2 : 1
                    }}
                    onClick={() => onMarkerClick(location)}
                  />
                );
              } catch (error) {
                console.error('Error rendering geofence:', error);
                return null;
              }
            })}

            {/* Location Markers */}
            {mapLoaded && typeof window !== 'undefined' && window.google && window.google.maps && deliveryLocations.map((location) => {
              try {
                const isActive = activeGeofences.some(g => g.id === location.id);
                return (
                  <Marker
                    key={location.id}
                    position={location.position}
                    onClick={() => onMarkerClick(location)}
                    icon={{
                      url: isActive 
                        ? 'http://maps.google.com/mapfiles/ms/icons/green-dot.png'
                        : 'http://maps.google.com/mapfiles/ms/icons/red-dot.png',
                      scaledSize: new window.google.maps.Size(isActive ? 50 : 40, isActive ? 50 : 40),
                      anchor: new window.google.maps.Point(isActive ? 25 : 20, isActive ? 50 : 40)
                    }}
                    animation={isActive ? window.google.maps.Animation?.BOUNCE : window.google.maps.Animation?.DROP}
                  />
                );
              } catch (error) {
                console.error('Error rendering marker:', error);
                return null;
              }
            })}

            {/* Current Position Marker */}
            {currentPosition && mapLoaded && typeof window !== 'undefined' && window.google && window.google.maps && (
              <Marker
                position={currentPosition}
                icon={{
                  url: 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png',
                  scaledSize: new window.google.maps.Size(30, 30),
                  anchor: new window.google.maps.Point(15, 30)
                }}
                animation={window.google.maps.Animation?.BOUNCE}
                title="Your Current Location"
              />
            )}

            {/* Live Active Deliveries */}
            {showLiveData && mapType !== 'shops' && mapLoaded && typeof window !== 'undefined' && window.google && window.google.maps && liveData.activeDeliveries.map((delivery) => {
              if (!delivery.rider || !delivery.rider.currentLocation) return null;
              
              const riderPos = delivery.rider.currentLocation;
              const deliveryPos = delivery.deliveryLocation || { lat: -1.2921, lng: 36.8219 };
              
              try {
                return (
                  <div key={`delivery-${delivery.id}`}>
                    {/* Rider Location Marker */}
                    <Marker
                      position={riderPos}
                      onClick={() => setSelectedDelivery(delivery)}
                      icon={{
                        url: 'http://maps.google.com/mapfiles/ms/icons/motorcycling.png',
                        scaledSize: new window.google.maps.Size(40, 40),
                        anchor: new window.google.maps.Point(20, 40)
                      }}
                      animation={window.google.maps.Animation?.BOUNCE}
                      title={`${delivery.rider.name} - ${delivery.status}`}
                    />
                    
                    {/* Delivery Destination Marker */}
                    {deliveryPos && (
                      <Marker
                        position={deliveryPos}
                        onClick={() => setSelectedDelivery(delivery)}
                        icon={{
                          url: 'http://maps.google.com/mapfiles/ms/icons/red-dot.png',
                          scaledSize: new window.google.maps.Size(35, 35),
                          anchor: new window.google.maps.Point(17, 35)
                        }}
                        title={`Delivery to ${delivery.deliveryAddress}`}
                      />
                    )}

                    {/* Route Line */}
                    {riderPos && deliveryPos && (
                      <Polyline
                        path={[riderPos, deliveryPos]}
                        options={{
                          strokeColor: '#f97316',
                          strokeOpacity: 0.6,
                          strokeWeight: 3,
                          icons: [{
                            icon: {
                              path: window.google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
                              scale: 3,
                              strokeColor: '#f97316'
                            },
                            offset: '50%',
                            repeat: '100px'
                          }]
                        }}
                      />
                    )}
                  </div>
                );
              } catch (error) {
                console.error('Error rendering delivery:', error);
                return null;
              }
            })}

            {/* Active Riders (not on deliveries) */}
            {showLiveData && mapType !== 'deliveries' && mapLoaded && typeof window !== 'undefined' && window.google && window.google.maps && liveData.activeRiders
              .filter(rider => !liveData.activeDeliveries.some(d => d.rider && d.rider.id === rider.id))
              .map((rider) => {
                if (!rider.location) return null;
                
                try {
                  return (
                    <Marker
                      key={`rider-${rider.id}`}
                      position={rider.location}
                      icon={{
                        url: 'http://maps.google.com/mapfiles/ms/icons/green-dot.png',
                        scaledSize: new window.google.maps.Size(35, 35),
                        anchor: new window.google.maps.Point(17, 35)
                      }}
                      title={`${rider.name} - ${rider.vehicleType} - Available`}
                    />
                  );
                } catch (error) {
                  console.error('Error rendering rider:', error);
                  return null;
                }
              })}

            {/* Shops */}
            {showLiveData && mapType !== 'riders' && mapLoaded && typeof window !== 'undefined' && window.google && window.google.maps && liveData.shops.map((shop) => {
              // Try to geocode shop address or use default location
              const shopPos = { lat: -1.2921, lng: 36.8219 }; // Default Nairobi
              
              try {
                return (
                  <Marker
                    key={`shop-${shop.id}`}
                    position={shopPos}
                    icon={{
                      url: 'http://maps.google.com/mapfiles/ms/icons/shopping.png',
                      scaledSize: new window.google.maps.Size(40, 40),
                      anchor: new window.google.maps.Point(20, 40)
                    }}
                    title={shop.name}
                  />
                );
              } catch (error) {
                console.error('Error rendering shop:', error);
                return null;
              }
            })}

            {/* Delivery Info Window */}
            {selectedDelivery && mapLoaded && (
              <InfoWindow
                position={selectedDelivery.rider?.currentLocation || selectedDelivery.deliveryLocation}
                onCloseClick={() => setSelectedDelivery(null)}
              >
                <div className="text-dark-900 p-2 max-w-xs">
                  <h3 className="font-bold text-lg mb-2 text-primary-600">
                    🚚 Active Delivery
                  </h3>
                  {selectedDelivery.rider && (
                    <p className="text-sm text-gray-700 mb-1">
                      <strong>Rider:</strong> {selectedDelivery.rider.name}
                    </p>
                  )}
                  <p className="text-sm text-gray-700 mb-1">
                    <strong>Status:</strong> {selectedDelivery.status}
                  </p>
                  <p className="text-sm text-gray-700 mb-1">
                    <strong>To:</strong> {selectedDelivery.deliveryAddress}
                  </p>
                  {selectedDelivery.shop && (
                    <p className="text-sm text-gray-700">
                      <strong>Shop:</strong> {selectedDelivery.shop.name}
                    </p>
                  )}
                </div>
              </InfoWindow>
            )}

            {selectedLocation && mapLoaded && (
              <InfoWindow
                position={selectedLocation.position}
                onCloseClick={onInfoWindowClose}
              >
                <div className="text-dark-900 p-2">
                  <h3 className="font-bold text-lg mb-1 text-primary-600">
                    {selectedLocation.name}
                  </h3>
                  <p className="text-sm text-gray-700 mb-2">
                    {selectedLocation.description}
                  </p>
                  <p className="text-xs text-primary-600 font-semibold">
                    📦 {selectedLocation.deliveries} deliveries
                  </p>
                </div>
              </InfoWindow>
            )}
          </GoogleMap>

          {/* Map Controls Overlay */}
          {mapLoaded && (
            <>
              <div className="absolute top-4 left-4 bg-dark-800/90 backdrop-blur-sm rounded-lg p-3 text-white text-sm z-10 max-w-xs">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-semibold">🗺️ Live Map</p>
                  <button
                    onClick={() => setShowLiveData(!showLiveData)}
                    className="text-xs px-2 py-1 bg-primary-500/20 hover:bg-primary-500/30 rounded"
                  >
                    {showLiveData ? 'Hide' : 'Show'} Live
                  </button>
                </div>
                
                {/* Map Type Selector */}
                {showLiveData && (
                  <div className="mb-2 flex gap-1 flex-wrap">
                    <button
                      onClick={() => setMapType('all')}
                      className={`text-xs px-2 py-1 rounded ${
                        mapType === 'all' ? 'bg-primary-500' : 'bg-dark-700'
                      }`}
                    >
                      All
                    </button>
                    <button
                      onClick={() => setMapType('deliveries')}
                      className={`text-xs px-2 py-1 rounded ${
                        mapType === 'deliveries' ? 'bg-primary-500' : 'bg-dark-700'
                      }`}
                    >
                      Deliveries
                    </button>
                    <button
                      onClick={() => setMapType('riders')}
                      className={`text-xs px-2 py-1 rounded ${
                        mapType === 'riders' ? 'bg-primary-500' : 'bg-dark-700'
                      }`}
                    >
                      Riders
                    </button>
                    <button
                      onClick={() => setMapType('shops')}
                      className={`text-xs px-2 py-1 rounded ${
                        mapType === 'shops' ? 'bg-primary-500' : 'bg-dark-700'
                      }`}
                    >
                      Shops
                    </button>
                  </div>
                )}

                {/* Live Stats */}
                {showLiveData && (
                  <div className="mt-2 pt-2 border-t border-gray-600 space-y-1">
                    <p className="text-xs">
                      🚚 <span className="text-primary-400 font-semibold">{liveData.activeDeliveries.length}</span> active deliveries
                    </p>
                    <p className="text-xs">
                      🏍️ <span className="text-green-400 font-semibold">{liveData.activeRiders.length}</span> active riders
                    </p>
                    <p className="text-xs">
                      🏪 <span className="text-blue-400 font-semibold">{liveData.shops.length}</span> shops
                    </p>
                  </div>
                )}

                <p className="text-xs text-gray-300 mb-2 mt-2">Click zones to see details</p>
                {activeGeofences.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-gray-600">
                    <p className="text-xs font-semibold text-green-400 mb-1">
                      🟢 Inside {activeGeofences.length} zone{activeGeofences.length > 1 ? 's' : ''}
                    </p>
                    {activeGeofences.map((geofence) => (
                      <p key={geofence.id} className="text-xs text-gray-300">
                        • {geofence.name} ({Math.round(geofence.distance / 1000)}km)
                      </p>
                    ))}
                  </div>
                )}
                {currentPosition && (
                  <p className="text-xs text-blue-400 mt-2">
                    📍 Tracking enabled
                  </p>
                )}
              </div>

              {/* Geofence Alerts */}
              {geofenceAlerts.length > 0 && (
                <div className="absolute top-4 right-4 bg-dark-800/90 backdrop-blur-sm rounded-lg p-3 text-white text-xs z-10 max-w-xs">
                  <p className="font-semibold mb-2">🔔 Geofence Alerts</p>
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {geofenceAlerts.slice(0, 3).map((alert, index) => (
                      <div 
                        key={index}
                        className={`p-2 rounded ${
                          alert.type === 'enter' 
                            ? 'bg-green-500/20 border border-green-500/50' 
                            : 'bg-yellow-500/20 border border-yellow-500/50'
                        }`}
                      >
                        <p className="text-xs">
                          {alert.type === 'enter' ? '🟢' : '🟡'} {alert.message}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          {new Date(alert.timestamp).toLocaleTimeString()}
                        </p>
                      </div>
                    ))}
                  </div>
                  {geofenceAlerts.length > 3 && (
                    <button
                      onClick={() => setGeofenceAlerts([])}
                      className="text-xs text-primary-400 hover:text-primary-300 mt-2"
                    >
                      Clear all
                    </button>
                  )}
                </div>
              )}

              {/* Legend */}
              <div className="absolute bottom-4 right-4 bg-dark-800/90 backdrop-blur-sm rounded-lg p-3 text-white text-xs z-10">
                <p className="font-semibold mb-2">Legend</p>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                    <span>Inactive Zone</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    <span>Active Zone (Inside)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                    <span>Your Location</span>
                  </div>
                </div>
                <p className="text-gray-300 mt-2 pt-2 border-t border-gray-600">
                  {deliveryLocations.filter(l => l.active).length} active geofences
                </p>
              </div>
            </>
          )}
        </div>
      </LoadScript>
    );
  } catch (error) {
    console.error('Error rendering InteractiveMap:', error);
    return (
      <div className="bg-dark-700/50 rounded-lg h-96 flex items-center justify-center backdrop-blur-sm">
        <div className="text-center p-6">
          <div className="text-6xl mb-4">⚠️</div>
          <p className="text-gray-200 text-lg mb-2">Map Error</p>
          <p className="text-sm text-gray-300">Unable to load map. Please refresh the page.</p>
        </div>
      </div>
    );
  }
};

export default InteractiveMap;

