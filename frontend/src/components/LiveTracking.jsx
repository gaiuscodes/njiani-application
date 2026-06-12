import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import { GoogleMap, LoadScript, Marker, Polyline, InfoWindow } from '@react-google-maps/api';

const LiveTracking = ({ orderId }) => {
  const [order, setOrder] = useState(null);
  const [socket, setSocket] = useState(null);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [selectedMarker, setSelectedMarker] = useState(null);
  const mapRef = useRef(null);

  const mapContainerStyle = {
    width: '100%',
    height: '500px',
    borderRadius: '8px'
  };

  // Default center: Nairobi, Kenya
  const defaultCenter = {
    lat: -1.2921,
    lng: 36.8219
  };

  useEffect(() => {
    if (orderId) {
      loadOrder();
      initializeSocket();
    }

    return () => {
      if (socket) socket.disconnect();
    };
  }, [orderId]);

  const loadOrder = async () => {
    try {
      const response = await axios.get(`/api/orders/${orderId}/tracking`);
      setOrder(response.data.order);
      if (response.data.order.trackingHistory?.length > 0) {
        const lastLocation = response.data.order.trackingHistory[response.data.order.trackingHistory.length - 1];
        setCurrentLocation({ lat: lastLocation.lat, lng: lastLocation.lng });
      }
    } catch (error) {
      console.error('Error loading order:', error);
    }
  };

  const initializeSocket = () => {
    if (socket) return; // Prevent multiple socket connections
    
    const socketUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';
    const newSocket = io(socketUrl, {
      withCredentials: true
    });

    newSocket.on('connect', () => {
      newSocket.emit('join_order', orderId);
    });

    newSocket.on('location_update', (data) => {
      const newLocation = { lat: data.lat, lng: data.lng };
      setCurrentLocation(newLocation);
      // Pan map to rider location if map is loaded
      if (mapRef.current) {
        mapRef.current.panTo(newLocation);
        mapRef.current.setZoom(17); // Zoom in closer when tracking
      }
      loadOrder();
    });

    setSocket(newSocket);
  };

  const onMapLoad = useCallback((map) => {
    mapRef.current = map;
  }, []);

  const onMapUnmount = useCallback(() => {
    mapRef.current = null;
  }, []);

  // Update map center when current location changes
  useEffect(() => {
    if (currentLocation && mapRef.current) {
      mapRef.current.panTo(currentLocation);
    }
  }, [currentLocation]);

  if (!order) return <div className="text-gray-400">Loading tracking...</div>;

  // Get map center - use current location if available, otherwise use pickup location
  const mapCenter = currentLocation || 
                    (order.pickupLocation ? { lat: order.pickupLocation.lat, lng: order.pickupLocation.lng } : defaultCenter);

  // Prepare path for polyline (tracking history)
  const path = order.trackingHistory?.map(point => ({
    lat: point.lat,
    lng: point.lng
  })) || [];

  // Add current location to path if it exists
  if (currentLocation && path.length > 0) {
    const lastPoint = path[path.length - 1];
    if (lastPoint.lat !== currentLocation.lat || lastPoint.lng !== currentLocation.lng) {
      path.push(currentLocation);
    }
  } else if (currentLocation && path.length === 0) {
    path.push(currentLocation);
  }

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-white">Live Tracking Map - Kenya</h3>
      <p className="text-sm text-gray-400">Zoom in to see detailed locations like Jevanjee Gardens</p>
      
      {import.meta.env.VITE_GOOGLE_MAPS_API_KEY ? (
        <LoadScript
          googleMapsApiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY}
          libraries={['places']}
          loadingElement={<div className="h-96 bg-dark-700 rounded-lg flex items-center justify-center text-gray-400">Loading Kenyan map...</div>}
        >
        <GoogleMap
          mapContainerStyle={mapContainerStyle}
          center={mapCenter}
          zoom={mapCenter === defaultCenter ? 12 : 16}
          onLoad={onMapLoad}
          onUnmount={onMapUnmount}
          options={{
            zoomControl: true,
            streetViewControl: true,
            mapTypeControl: true,
            fullscreenControl: true,
            minZoom: 5, // Allow zooming out to see all of Kenya
            maxZoom: 20, // Allow very detailed zoom (like Jevanjee Gardens)
            restriction: {
              latLngBounds: {
                north: 5.5, // Northern border of Kenya
                south: -4.7, // Southern border of Kenya
                west: 33.9, // Western border of Kenya
                east: 41.9  // Eastern border of Kenya
              },
              strictBounds: false
            },
            styles: [
              {
                featureType: 'poi',
                elementType: 'labels',
                stylers: [{ visibility: 'on' }]
              }
            ]
          }}
        >
          {/* Pickup Location Marker */}
          {order.pickupLocation && (
            <Marker
              position={{ lat: order.pickupLocation.lat, lng: order.pickupLocation.lng }}
              icon={{
                url: 'http://maps.google.com/mapfiles/ms/icons/green-dot.png',
                scaledSize: new window.google.maps.Size(40, 40)
              }}
              onClick={() => setSelectedMarker('pickup')}
            />
          )}

          {/* Delivery Location Marker */}
          {order.deliveryLocation && (
            <Marker
              position={{ lat: order.deliveryLocation.lat, lng: order.deliveryLocation.lng }}
              icon={{
                url: 'http://maps.google.com/mapfiles/ms/icons/red-dot.png',
                scaledSize: new window.google.maps.Size(40, 40)
              }}
              onClick={() => setSelectedMarker('delivery')}
            />
          )}

          {/* Current Rider Location Marker */}
          {currentLocation && (
            <Marker
              position={currentLocation}
              icon={{
                url: 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png',
                scaledSize: new window.google.maps.Size(50, 50)
              }}
              onClick={() => setSelectedMarker('rider')}
              animation={window.google?.maps?.Animation?.BOUNCE}
            />
          )}

          {/* Tracking Path Polyline */}
          {path.length > 1 && (
            <Polyline
              path={path}
              options={{
                strokeColor: '#f97316',
                strokeOpacity: 0.8,
                strokeWeight: 4,
                icons: [{
                  icon: {
                    path: window.google?.maps?.SymbolPath?.FORWARD_CLOSED_ARROW,
                    scale: 4,
                    strokeColor: '#f97316'
                  },
                  offset: '100%',
                  repeat: '50px'
                }]
              }}
            />
          )}

          {/* Info Windows */}
          {selectedMarker === 'pickup' && order.pickupLocation && (
            <InfoWindow
              position={{ lat: order.pickupLocation.lat, lng: order.pickupLocation.lng }}
              onCloseClick={() => setSelectedMarker(null)}
            >
              <div className="text-dark-900">
                <p className="font-semibold">📍 Pickup Location</p>
                <p className="text-sm">{order.pickupAddress}</p>
              </div>
            </InfoWindow>
          )}

          {selectedMarker === 'delivery' && order.deliveryLocation && (
            <InfoWindow
              position={{ lat: order.deliveryLocation.lat, lng: order.deliveryLocation.lng }}
              onCloseClick={() => setSelectedMarker(null)}
            >
              <div className="text-dark-900">
                <p className="font-semibold">🎯 Delivery Location</p>
                <p className="text-sm">{order.deliveryAddress}</p>
              </div>
            </InfoWindow>
          )}

          {selectedMarker === 'rider' && currentLocation && (
            <InfoWindow
              position={currentLocation}
              onCloseClick={() => setSelectedMarker(null)}
            >
              <div className="text-dark-900">
                <p className="font-semibold">🏍️ Rider Location</p>
                <p className="text-sm">Live tracking active</p>
                <p className="text-xs text-gray-600">
                  {new Date().toLocaleTimeString()}
                </p>
              </div>
            </InfoWindow>
          )}
        </GoogleMap>
      </LoadScript>
      ) : (
        <div className="bg-dark-700 rounded-lg h-96 flex flex-col items-center justify-center text-gray-400 p-8">
          <div className="text-6xl mb-4">🗺️</div>
          <p className="text-lg mb-2">Google Maps API Key Required</p>
          <p className="text-sm text-center mb-4">
            To enable the interactive Kenyan map with detailed zoom, please add your Google Maps API key.
          </p>
          <div className="bg-dark-800 p-4 rounded-lg text-left text-xs max-w-md">
            <p className="text-white mb-2"><strong>Quick Setup:</strong></p>
            <ol className="list-decimal list-inside space-y-1 text-gray-300">
              <li>Get API key from <a href="https://console.cloud.google.com/" target="_blank" rel="noopener noreferrer" className="text-primary-500 hover:underline">Google Cloud Console</a></li>
              <li>Enable "Maps JavaScript API" and "Places API"</li>
              <li>Add to <code className="bg-dark-900 px-1 rounded">frontend/.env</code>:<br/>
                <code className="bg-dark-900 px-2 py-1 rounded block mt-1">VITE_GOOGLE_MAPS_API_KEY=your_key_here</code>
              </li>
              <li>Restart the dev server</li>
            </ol>
            <p className="text-primary-500 mt-3">
              <a href="https://developers.google.com/maps/documentation/javascript/get-api-key" target="_blank" rel="noopener noreferrer" className="hover:underline">
                View detailed setup guide →
              </a>
            </p>
          </div>
          <div className="mt-4 text-xs text-gray-500">
            <p>Current location: {currentLocation ? `${currentLocation.lat.toFixed(6)}, ${currentLocation.lng.toFixed(6)}` : 'Waiting for updates...'}</p>
            <a
              href={currentLocation ? `https://www.google.com/maps?q=${currentLocation.lat},${currentLocation.lng}` : '#'}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary-500 hover:underline mt-2 inline-block"
            >
              View on Google Maps
            </a>
          </div>
        </div>
      )}

      <div className="bg-dark-700 rounded-lg p-4">
        <div className="grid grid-cols-3 gap-4 text-sm mb-3">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span className="text-gray-300">Pickup</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
            <span className="text-gray-300">Delivery</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
            <span className="text-gray-300">Rider</span>
          </div>
        </div>
        <div className="text-xs text-gray-400">
          <p><strong>Pickup:</strong> {order.pickupAddress}</p>
          <p><strong>Delivery:</strong> {order.deliveryAddress}</p>
          {currentLocation && (
            <p><strong>Rider Location:</strong> {currentLocation.lat.toFixed(6)}, {currentLocation.lng.toFixed(6)}</p>
          )}
          <p className="mt-2">
            <strong>Tracking Points:</strong> {order.trackingHistory?.length || 0} location updates
          </p>
        </div>
      </div>
    </div>
  );
};

export default LiveTracking;
