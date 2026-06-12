# Google Maps API Setup Guide

## How to Get a Google Maps API Key

1. **Go to Google Cloud Console**
   - Visit: https://console.cloud.google.com/
   - Sign in with your Google account

2. **Create a New Project** (or select existing)
   - Click on the project dropdown at the top
   - Click "New Project"
   - Name it "Njiani" or similar
   - Click "Create"

3. **Enable Required APIs**
   - Go to "APIs & Services" > "Library"
   - Search for and enable:
     - **Maps JavaScript API** (for the interactive map)
     - **Places API** (for address autocomplete)
     - **Geocoding API** (optional, for address conversion)

4. **Create API Key**
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "API Key"
   - Copy the generated API key

5. **Restrict the API Key (Recommended)**
   - Click on the API key you just created
   - Under "Application restrictions":
     - Select "HTTP referrers (web sites)"
     - Add your domains:
       - `http://localhost:5173/*` (for development)
       - `https://your-domain.com/*` (for production)
   - Under "API restrictions":
     - Select "Restrict key"
     - Choose: Maps JavaScript API, Places API, Geocoding API
   - Click "Save"

6. **Add to Your Project**
   - Create `frontend/.env` file (if it doesn't exist)
   - Add: `VITE_GOOGLE_MAPS_API_KEY=your_api_key_here`
   - Replace `your_api_key_here` with your actual API key

## Free Tier Limits

Google Maps offers a free tier with:
- $200 free credit per month
- This covers approximately:
  - 28,000 map loads per month
  - 40,000 address autocomplete requests per month

For most small to medium applications, this is sufficient.

## Testing Without API Key

If you don't have an API key yet, the map will show a loading message. The application will still work for other features, but the interactive map won't display.

## Troubleshooting

- **Map not loading**: Check that the API key is correct and the APIs are enabled
- **Autocomplete not working**: Ensure Places API is enabled
- **"This page can't load Google Maps correctly"**: Check API key restrictions and billing account setup

