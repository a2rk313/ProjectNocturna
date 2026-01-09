# Project Nocturna API Configuration Guide

## NASA API Key Setup

Project Nocturna uses NASA's Earth Observing System Data and Information System (EOSDIS) API to access VIIRS Nighttime Lights data.

### Getting Your Free NASA API Key

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

### API Endpoints Used

Project Nocturna accesses the following NASA data sources:

- **VIIRS Nighttime Lights**: `https://firms.modaps.eosdis.nasa.gov/api/area/csv/{API_KEY}/VIIRS_NOAA20_NTL/{params}`
- **FIRMS (Fire Information for Resource Management System)**: For light pollution analysis

### Troubleshooting

- **"Invalid API Key" Error**: Double-check that you've copied the API key correctly
- **Rate Limiting**: NASA APIs have rate limits; if you encounter 429 errors, wait before making more requests
- **Access Forbidden**: Ensure your NASA Earthdata account has access to the required datasets

### About NASA VIIRS Data

The VIIRS (Visible Infrared Imaging Radiometer Suite) Day/Night Band (DNB) provides global nighttime imagery that enables monitoring of artificial light sources, including light pollution. This data is crucial for scientific research on environmental and health impacts of artificial nighttime lighting.

### Data Citation

When using real NASA data through Project Nocturna, please cite:
- NASA EOSDIS FIRMS (Fire Information for Resource Management System). Available at https://firms.modaps.eosdis.nasa.gov/
- Elvidge, C.D., Baugh, K.E., Zhizhin, M., Hsu, F.C., Ghosh, T. (2013). A fifteen year record of global natural gas flaring derived from satellite data. Energies 6(11), 5946-5967.