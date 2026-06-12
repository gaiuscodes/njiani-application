import { useRef, useState, useEffect } from 'react';
import { LoadScript, Autocomplete } from '@react-google-maps/api';

const AddressAutocomplete = ({ onPlaceSelect, placeholder, defaultValue = '' }) => {
  const autocompleteRef = useRef(null);
  const inputRef = useRef(null);
  const [inputMode, setInputMode] = useState('autocomplete'); // 'autocomplete' or 'manual'
  const [manualAddress, setManualAddress] = useState(defaultValue || '');

  // Update manualAddress when defaultValue changes
  useEffect(() => {
    if (defaultValue) {
      setManualAddress(defaultValue);
    }
  }, [defaultValue]);

  const onLoad = (autocomplete) => {
    autocompleteRef.current = autocomplete;
  };

  const onPlaceChanged = () => {
    if (autocompleteRef.current && inputMode === 'autocomplete') {
      const place = autocompleteRef.current.getPlace();
      if (place.geometry) {
        const address = place.formatted_address;
        setManualAddress(address);
        onPlaceSelect({
          address: address,
          location: {
            lat: place.geometry.location.lat(),
            lng: place.geometry.location.lng()
          }
        });
      }
    }
  };

  // Handle manual input
  const handleManualInput = (e) => {
    const value = e.target.value;
    setManualAddress(value);
    
    if (inputMode === 'manual') {
      // In manual mode, update immediately
      onPlaceSelect({
        address: value,
        location: null
      });
    } else if (inputMode === 'autocomplete') {
      // In autocomplete mode, update on every keystroke
      // This allows users to type freely even with autocomplete enabled
      // If they select from autocomplete, onPlaceChanged will override this
      onPlaceSelect({
        address: value,
        location: null
      });
    }
  };

  // When switching modes, preserve the current address value
  const handleModeSwitch = (newMode) => {
    setInputMode(newMode);
    // Update with current manual address value
    if (manualAddress) {
      onPlaceSelect({
        address: manualAddress,
        location: null
      });
    }
  };

  // If no API key, always use manual mode
  if (!import.meta.env.VITE_GOOGLE_MAPS_API_KEY) {
    return (
      <div>
        <input
          type="text"
          placeholder={placeholder || "Enter delivery address manually"}
          value={manualAddress}
          onChange={(e) => {
            const value = e.target.value;
            setManualAddress(value);
            onPlaceSelect({
              address: value,
              location: null
            });
          }}
          className="input-field"
          required
        />
        <p className="text-xs text-yellow-500 mt-1">
          ⚠️ Google Maps API key not configured. Enter address manually.
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Mode Toggle */}
      <div className="flex gap-2 mb-2">
        <button
          type="button"
          onClick={() => handleModeSwitch('autocomplete')}
          className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
            inputMode === 'autocomplete'
              ? 'bg-primary-600 text-white'
              : 'bg-dark-700 text-gray-300 hover:bg-dark-600'
          }`}
        >
          🔍 Search Address
        </button>
        <button
          type="button"
          onClick={() => handleModeSwitch('manual')}
          className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
            inputMode === 'manual'
              ? 'bg-primary-600 text-white'
              : 'bg-dark-700 text-gray-300 hover:bg-dark-600'
          }`}
        >
          ✏️ Enter Manually
        </button>
      </div>

      {inputMode === 'autocomplete' ? (
        <LoadScript
          googleMapsApiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY}
          libraries={['places']}
        >
          <Autocomplete
            onLoad={onLoad}
            onPlaceChanged={onPlaceChanged}
            options={{
              componentRestrictions: { country: 'ke' }, // Restrict to Kenya
              types: ['address', 'establishment']
            }}
          >
            <input
              ref={inputRef}
              type="text"
              placeholder={placeholder || "Search for address or enter manually"}
              defaultValue={manualAddress}
              onChange={handleManualInput}
              className="input-field"
              required
            />
          </Autocomplete>
        </LoadScript>
      ) : (
        <div>
          <textarea
            type="text"
            placeholder={placeholder || "Enter delivery address manually"}
            value={manualAddress}
            onChange={handleManualInput}
            className="input-field"
            rows="3"
            required
          />
          <p className="text-xs text-gray-400 mt-1">
            💡 Enter the complete delivery address including street, area, and any landmarks
          </p>
        </div>
      )}
    </div>
  );
};

export default AddressAutocomplete;

