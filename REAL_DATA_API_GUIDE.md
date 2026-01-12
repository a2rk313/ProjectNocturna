# Project Nocturna - Real Data API Handling and GIBS Integration Guide

## Table of Contents
1. [Introduction](#introduction)
2. [NASA API Key Setup](#nasa-api-key-setup)
3. [GIBS (Global Imagery Browse Services) Integration](#gibs-integration)
4. [VIIRS and FIRMS Data Access](#viirs-and-firms-data-access)
5. [CMR (Common Metadata Repository)](#cmr-common-metadata-repository)
6. [Configuration Best Practices](#configuration-best-practices)
7. [Troubleshooting](#troubleshooting)
8. [Scientific Validity](#scientific-validity)
9. [API Endpoints Reference](#api-endpoints-reference)
10. [Data Processing Pipeline](#data-processing-pipeline)

## Introduction

Project Nocturna leverages multiple NASA data sources to provide accurate light pollution measurements and analysis. This guide details how the application handles real data from NASA's Earth Observing System, with a focus on GIBS (Global Imagery Browse Services) integration for enhanced visualization and analysis capabilities.

## NASA API Key Setup

### Getting Your Free NASA API Key

Project Nocturna uses NASA's Earth Observing System Data and Information System (EOSDIS) API to access VIIRS Nighttime Lights data.

1. **Visit the NASA Earthdata Login Page**
   - Go to: https://urs.earthdata.nasa.gov/
   - Click "Register for an account" if you don't have one
   - Log in if you already have an account

2. **Generate Your API Key**
   - After logging in, go to your profile page
   - Look for "Generate Token" or "API Keys" section
   - Generate a new token/key
   - Copy the generated key

3. **Configure Your Environment**
   - Open the `.env` file in the project root
   - Replace `DEMO_KEY` with your actual NASA API key:

   ```
   NASA_API_KEY=your_actual_nasa_api_key_here
   ```

4. **Restart the Application**
   - Restart your development server to apply the changes

### Alternative: Continue with Demo Data

If you don't want to register for a NASA API key right now, the application will continue to work with sample data. You'll see a notice indicating that demo data is being used instead of real NASA data.

## GIBS Integration

### Overview of GIBS

The Global Imagery Browse Services (GIBS) provides a standardized way to access NASA's imagery and visualization data. For Project Nocturna, GIBS integration enables:

- Real-time visualization of light pollution data
- Historical imagery comparison
- Enhanced spatial analysis capabilities
- Integration with other NASA datasets

### GIBS Endpoints Used

Project Nocturna accesses GIBS through the following endpoints:

- **VIIRS Day/Night Band**: `https://gibs.earthdata.nasa.gov/wmts/epsg4326/best/VIIRS_NOAA20_DNB_At_Night/default/{Time}/{TileMatrixSet}/{TileMatrix}/{TileRow}/{TileCol}.png`
- **Black Marble Nighttime Lights**: `https://gibs.earthdata.nasa.gov/wmts/epsg4326/best/BlackMarble_2016/default/{Time}/{TileMatrixSet}/{TileMatrix}/{TileRow}/{TileCol}.png`
- **MODIS Corrected Reflectance**: For atmospheric correction in light pollution analysis

### GIBS Configuration

To enable GIBS integration:

1. **Set up your NASA Earthdata credentials** in the `.env` file:
   ```
   EARTHDATA_USERNAME=your_username
   EARTHDATA_PASSWORD=your_password
   NASA_API_KEY=your_api_key
   ```

2. **Configure GIBS tile layers** in `js/webgis.js`:
   ```javascript
   const gibsLayers = {
     viirs_nighttime: {
       url: 'https://gibs.earthdata.nasa.gov/wmts/epsg4326/best/VIIRS_NOAA20_DNB_At_Night/default/{Time}/{TileMatrixSet}/{TileMatrix}/{TileRow}/{TileCol}.png',
       attribution: 'NASA EOSDIS GIBS',
       tileSize: 512,
       maxZoom: 8
     },
     black_marble: {
       url: 'https://gibs.earthdata.nasa.gov/wmts/epsg4326/best/BlackMarble_2016/default/{Time}/{TileMatrixSet}/{TileMatrix}/{TileRow}/{TileCol}.png',
       attribution: 'NASA Earth Observatory',
       tileSize: 512,
       maxZoom: 8
     }
   };
   ```

## VIIRS and FIRMS Data Access

### VIIRS (Visible Infrared Imaging Radiometer Suite)

The VIIRS Day/Night Band (DNB) provides global nighttime imagery that enables monitoring of artificial light sources, including light pollution.

#### VIIRS Data Endpoints

- **Primary Endpoint**: `https://firms.modaps.eosdis.nasa.gov/api/area/csv/{API_KEY}/VIIRS_NOAA20_NTL/{bbox}/{days}`
- **NTL stands for** "Nighttime Lights" - the specific product for artificial light detection
- **Provides**: brightness temperature, fire radiative power, and confidence values

#### Data Processing Pipeline for VIIRS

1. **Request**: Client sends coordinates and date range
2. **Validation**: Server validates coordinates and parameters
3. **API Call**: Server makes request to NASA FIRMS API
4. **Response Processing**: CSV response is parsed and normalized
5. **Transformation**: Raw brightness values are converted to SQM (Sky Quality Meter) equivalents
6. **Analysis**: Statistical analysis is performed on the data
7. **Response**: Processed data is returned to client

### FIRMS (Fire Information for Resource Management System)

While primarily focused on fire detection, FIRMS also provides VIIRS DNB data valuable for light pollution research.

#### FIRMS Integration Benefits

- High temporal resolution (daily data)
- Global coverage
- Consistent data collection methodology
- Quality flags and confidence metrics

## CMR (Common Metadata Repository)

### Overview

The Common Metadata Repository (CMR) is NASA's metadata system that enables search and access to Earth science data. For Project Nocturna, CMR integration allows:

- Advanced dataset discovery
- Metadata access for quality assessment
- Cross-referencing with other NASA datasets
- Historical data access

### CMR Search Parameters

Project Nocturna uses CMR to discover relevant datasets:

- **Collection**: C1475825580-LANCEMODIS
- **Temporal Range**: Configurable date ranges
- **Spatial Bounds**: Bounding box coordinates
- **Variables**: Nighttime lights, radiance values

### CMR Integration Implementation

```javascript
// Example CMR search implementation
const searchCMR = async (params) => {
  const { bbox, temporal, shortName } = params;
  
  const url = `https://cmr.earthdata.nasa.gov/search/granules.json?short_name=${shortName}&bounding_box=${bbox}&temporal=${temporal}`;
  
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${process.env.NASA_API_KEY}`
    }
  });
  
  return response.json();
};
```

## Configuration Best Practices

### Environment Variables

Ensure your `.env` file includes:

```env
# NASA Configuration
NASA_API_KEY=your_nasa_api_key
EARTHDATA_USERNAME=your_username
EARTHDATA_PASSWORD=your_password

# Supabase Configuration
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key

# API Keys
LIGHT_POLLUTION_API_KEY=your_light_pollution_api_key
MAPBOX_TOKEN=your_mapbox_token

# Server Configuration
PORT=3000
NODE_ENV=development
```

### API Rate Limiting

Project Nocturna implements rate limiting to respect NASA's API usage policies:

- 100 requests per 15-minute window per IP
- Automatic fallback to cached or sample data when rate limits are hit
- Retry mechanisms with exponential backoff

### Error Handling

The application implements comprehensive error handling:

- NASA API key validation
- Network timeout handling
- Fallback to sample data when APIs are unavailable
- Detailed error logging for debugging

## Troubleshooting

### Common Issues

#### "Invalid API Key" Error
- **Solution**: Double-check that you've copied the API key correctly
- **Check**: Ensure there are no extra spaces or characters in the API key

#### Rate Limiting (HTTP 429)
- **Solution**: Wait before making more requests or implement caching
- **Note**: NASA APIs have rate limits; the application has built-in rate limiting to help

#### Access Forbidden (HTTP 403)
- **Solution**: Ensure your NASA Earthdata account has access to the required datasets
- **Check**: Verify account permissions in the Earthdata portal

#### Data Not Loading
- **Solution**: Check network connectivity and API key configuration
- **Verify**: The application will fall back to sample data if real data is unavailable

### Debugging Steps

1. **Check Environment Variables**: Verify all required API keys are set
2. **Review Server Logs**: Look for specific error messages
3. **Test API Endpoints**: Use tools like curl or Postman to test direct API calls
4. **Validate Credentials**: Ensure your NASA Earthdata account is active and verified

## Scientific Validity

### Data Quality Considerations

- **Cloud Cover**: VIIRS data quality can be affected by cloud cover, which may limit data availability in some regions
- **Moonlight**: Lunar illumination can affect nighttime light measurements, though this is typically filtered in analysis
- **Atmospheric Conditions**: Aerosols and other atmospheric conditions can affect radiance measurements

### Validation Methods

Project Nocturna includes quality flags and confidence metrics to help users understand data reliability in their specific area of interest:

- Confidence levels based on data density
- Quality flags from NASA processing
- Comparison with ground-based measurements when available
- Statistical validation against known dark sky and light polluted locations

### Scientific Citations

When using real NASA data through Project Nocturna, please cite:

- NASA EOSDIS FIRMS (Fire Information for Resource Management System). Available at https://firms.modaps.eosdis.nasa.gov/
- Elvidge, C.D., Baugh, K.E., Zhizhin, M., Hsu, F.C., Ghosh, T. (2013). A fifteen year record of global natural gas flaring derived from satellite data. Energies 6(11), 5946-5967.
- Falchi, F. et al. (2016). The new world atlas of artificial night sky brightness. *Science Advances*, 2(6), e1600377.
- Kyba, C.C.M. et al. (2017). Artificially lit surface of Earth at night increasing in radiance and extent. *Science Advances*, 3(11), e1701528.

## API Endpoints Reference

### VIIRS Data Endpoints

- `GET /api/viirs/:year` - Get VIIRS data for a specific year
- `GET /api/viirs/:year/:month` - Get VIIRS data for a specific year and month
- `GET /api/viirs/:year1/compare/:year2` - Compare VIIRS data between two years

### World Atlas of Artificial Night Sky Brightness

- `GET /api/world-atlas/:region?` - Get light pollution data from the World Atlas

### SQM Network Data

- `GET /api/sqm-network` - Get real-time SQM-LE network data

### Dark Sky Parks

- `GET /api/dark-sky-parks` - Get information about certified dark sky parks

### Statistical Analysis

- `POST /api/statistics/region` - Get statistical analysis for a specific region
- `POST /api/ecology/impact` - Get ecological impact assessment
- `POST /api/energy/waste` - Get energy waste calculations

### Predictive Analytics

- `POST /api/predictions/advanced` - Get advanced predictive analytics for light pollution trends

## Data Processing Pipeline

### Request Flow

1. **Client Request**: User requests data for specific coordinates and time period
2. **Validation**: Server validates input parameters and coordinates
3. **Database Check**: Check for existing processed data in database
4. **NASA API Call**: If not cached, call NASA APIs to get raw data
5. **Data Processing**: Convert raw NASA data to standardized formats
6. **Quality Assessment**: Apply quality flags and confidence metrics
7. **Response**: Return processed data with metadata to client
8. **Caching**: Store processed data in database for future requests

### Data Transformation

Raw NASA VIIRS data is transformed to be more useful for light pollution research:

- **Brightness Values**: Raw radiance values converted to SQM equivalents
- **Bortle Scale**: SQM values converted to Bortle classification
- **Geographic Patterns**: Apply geographic patterns based on location characteristics
- **Temporal Trends**: Apply trend analysis for time-series data

### Fallback Mechanisms

The system implements multiple fallback levels:

1. **Database Cache**: Use previously processed data from database
2. **Enhanced Dataset**: Use our enhanced light pollution dataset
3. **Sample Data**: Use scientifically valid sample data based on location
4. **Error Response**: Provide helpful error messages and guidance

---

This guide provides comprehensive information for implementing and using real data APIs in Project Nocturna, with special attention to GIBS integration for enhanced visualization and analysis capabilities.