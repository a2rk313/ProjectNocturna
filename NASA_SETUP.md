# NASA API Setup Guide

## Getting Started with NASA Earthdata API Access

To properly use the NASA VIIRS Nighttime Lights data through the API, you'll need to set up your Earthdata account and obtain the necessary credentials.

## Step 1: Register for NASA Earthdata Login

1. Go to https://urs.earthdata.nasa.gov/
2. Click "Register" to create a new account
3. Fill out the registration form with your information
4. Verify your email address

## Step 2: Access NASA Earthdata APIs

Once registered, you can access NASA's Earthdata APIs using your credentials.

### Required Environment Variables

Update your `.env` file with the following:

```env
# NASA Earthdata Configuration (for real VIIRS data)
NASA_API_KEY=your_nasa_api_key_here
NASA_EARTHDATA_TOKEN=your_nasa_token_here
EARTHDATA_USERNAME=your_username_here
EARTHDATA_PASSWORD=your_password_here
```

## Step 3: Accessing VIIRS Data

The application uses the NASA Common Metadata Repository (CMR) API to search for VIIRS Day/Night Band (DNB) data:

- **Dataset**: VIIRS/NPP Nighttime Lights (`VNP46A2`)
- **Temporal Coverage**: From 2012-present
- **Spatial Resolution**: 500m gridded data

## API Endpoints Used

The application integrates with these NASA services:

1. **CMR (Common Metadata Repository)**: `https://cmr.earthdata.nasa.gov/search/`
   - Used to search for available VIIRS granules
   - Supports spatial and temporal filtering

2. **Earthdata Cloud**: For data download (when processed)

## Data Processing

When valid NASA credentials are provided, the system will:

1. Query the CMR API for available VIIRS granules
2. Match granules to the requested geographic area
3. Generate synthetic data based on actual satellite overpass times
4. Fall back to enhanced dataset if real data is unavailable

## Troubleshooting

If the NASA API is not working:

1. Verify your credentials are correct
2. Check that your Earthdata account has the necessary permissions
3. Ensure you're using the correct API endpoints
4. Check NASA's service status at https://status.earthdata.nasa.gov/

## Additional Resources

- [NASA Earthdata Login](https://urs.earthdata.nasa.gov/)
- [CMR Search API Documentation](https://cmr.earthdata.nasa.gov/search/site/docs/search/api.html)
- [VIIRS User Guide](https://earthdata.nasa.gov/faq/viirs-user-guide)
- [Black Marble Nighttime Lights Product](https://blackmarble.gsfc.nasa.gov/)