<div align="center">

[![Nocturna Logo](https://raw.githubusercontent.com/a2rk313/ProjectNocturna/refs/heads/a2rk/images/logo.png)](https://github.com/a2rk313/ProjectNocturna)

# **Project Nocturna**

**Real-time Light Pollution Monitoring & Analysis Platform**

</div>

Project Nocturna is a comprehensive WebGIS platform that enables everyday users to discover prime astronomical observation sites while empowering scientists and researchers to conduct detailed light pollution data analysis. The platform integrates multiple NASA datasets, including VIIRS Nighttime Lights and the World Atlas of Artificial Night Sky Brightness, to provide accurate and scientifically valid light pollution assessments.

## 🌟 Features

### For Users
- **Dark Sky Discovery**: Find the best stargazing locations near you
- **Interactive Map**: Visualize light pollution levels across the globe
- **Observation Planning**: Plan astronomy sessions based on sky quality
- **Dark Sky Parks**: Locate and explore certified dark sky preserves
- **Real-time Data**: Access current light pollution conditions

### For Researchers
- **VIIRS Nighttime Lights**: Access NASA's VIIRS DNB data for scientific analysis
- **Historical Trends**: Analyze light pollution changes over time
- **Statistical Analysis**: Generate comprehensive reports and statistics
- **Ecological Impact**: Assess environmental effects of light pollution
- **Energy Waste Analysis**: Calculate economic and environmental costs
- **Predictive Analytics**: Advanced forecasting models for trend analysis
- **API Access**: Programmatic access to all data and analysis tools

## 🚀 Quick Start

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn package manager
- Git

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/a2rk313/ProjectNocturna.git
   cd ProjectNocturna
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file in the root directory with your configuration:
   ```env
   # Supabase Configuration (optional, for persistent data)
   SUPABASE_URL=your_supabase_url
   SUPABASE_ANON_KEY=your_supabase_anon_key
   
   # NASA API Configuration (required for real data)
   NASA_API_KEY=your_nasa_api_key
   EARTHDATA_USERNAME=your_earthdata_username
   EARTHDATA_PASSWORD=your_earthdata_password
   
   # Map Configuration
   MAPBOX_TOKEN=your_mapbox_token
   
   # Server Configuration
   PORT=3000
   NODE_ENV=development
   ```

4. Run the development server:
   ```bash
   npm run dev
   ```

5. Visit `http://localhost:3000` in your browser.

## 🌍 Data Sources

Project Nocturna integrates multiple authoritative data sources:

- **NASA VIIRS Nighttime Lights**: High-resolution nighttime imagery from the Suomi NPP satellite
- **World Atlas of Artificial Night Sky Brightness**: Comprehensive light pollution mapping (Falchi et al., 2016)
- **FIRMS (Fire Information for Resource Management System)**: Real-time satellite data
- **Global SQM Network**: Ground-based sky quality measurements
- **International Dark-Sky Association**: Certified dark sky places database

## 🔬 Research Capabilities

### Ecological Impact Assessment
Analyze how light pollution affects:
- Avian migration patterns
- Insect populations
- Plant physiology
- Sea turtle nesting
- Bat foraging behavior

### Energy Waste Analysis
Calculate economic and environmental costs:
- Energy consumption from excessive lighting
- CO2 emissions from light pollution
- Potential savings from lighting improvements
- Cost-benefit analysis of mitigation measures

### Predictive Analytics
Advanced forecasting models:
- Multi-model ensemble predictions
- Trend analysis with uncertainty quantification
- Seasonal decomposition
- Machine learning algorithms

## 📊 API Endpoints

### Data Access Endpoints
- `GET /api/viirs/:year` - VIIRS nighttime lights data for a year
- `GET /api/viirs/:year/:month` - VIIRS data for specific year/month
- `GET /api/world-atlas/:region?` - World Atlas light pollution data
- `GET /api/sqm-network` - Real-time SQM network data
- `GET /api/dark-sky-parks` - Certified dark sky places

### Analysis Endpoints
- `POST /api/statistics/region` - Regional statistical analysis
- `POST /api/ecology/impact` - Ecological impact assessment
- `POST /api/energy/waste` - Energy waste calculations
- `POST /api/predictions/advanced` - Advanced predictive analytics
- `GET /api/trends/:lat/:lng` - Historical trend analysis

### Measurement Endpoints
- `GET /api/measurement?lat={lat}&lng={lng}` - Get measurement at coordinates
- `POST /api/measurements` - Submit new measurement
- `GET /api/stations` - Get measurement stations

## 📚 Documentation

For detailed information about data sources, API configuration, and research methodologies:

- [API Configuration Guide](API_SETUP.md) - Complete setup instructions for NASA APIs
- [Dataset Information](DATASET_INFO.md) - Scientific background on data sources
- [Real Data API Guide](REAL_DATA_API_GUIDE.md) - Comprehensive guide to real data handling and GIBS integration
- [Light Pollution Research Guide](LIGHT_POLLUTION_RESEARCH.md) - Scientific methodology and citations for researchers

## 🧪 Scientific Validity

Project Nocturna maintains scientific rigor through:
- Integration with peer-reviewed datasets
- Proper data transformation from radiance to sky quality
- Uncertainty quantification in predictions
- Validation against ground-based measurements
- Proper citation of data sources

## 🤝 Contributing

We welcome contributions from the astronomy, environmental science, and open-source communities. Please see our [Contributing Guidelines](CONTRIBUTING.md) for more information.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 📚 Citations

When using Project Nocturna in research, please cite:

- Falchi, F., et al. (2016). The new world atlas of artificial night sky brightness. *Science Advances*, 2(6), e1600377.
- Elvidge, C.D., et al. (2013). A fifteen year record of global natural gas flaring derived from satellite data. *Energies*, 6(11), 5946-5967.
- Kyba, C.C.M., et al. (2017). Artificially lit surface of Earth at night increasing in radiance and extent. *Science Advances*, 3(11), e1701528.

## 🚀 Deployment

Project Nocturna is designed for easy deployment on platforms like Vercel, Heroku, or any Node.js hosting service:

```bash
npm run vercel-deploy
```

## 💬 Support

For questions, issues, or feature requests, please open an issue in the GitHub repository or contact the development team.

---

*Project Nocturna: Empowering both casual stargazers and serious researchers with accurate light pollution data and analysis tools.*
