# Project Nocturna - Global Light Pollution Tracker

## Overview
Project Nocturna is a comprehensive WebGIS platform for tracking and analyzing global light pollution. It provides both citizen science tools for casual users and advanced scientific analysis capabilities for researchers.

## Features
- **Citizen Mode**: Stargazing tools, dark sky park finder, astro forecasts
- **Scientific Mode**: Advanced analytical suite with spectral analysis, scotobiology impact assessment, energy economics calculations, and policy simulation tools
- **Interactive Mapping**: Draw tools for area selection and analysis
- **Real-time Data Integration**: Satellite and ground-based measurements
- **Hybrid Deployment**: Runs locally or on Vercel

## Hybrid Setup
The application is designed to run in a hybrid environment:
- **Local Development**: Full-featured local server with mock data
- **Vercel Deployment**: Cloud-based production environment with real data sources

## Fixed Issues
- **Cyclic Object Value Error**: Fixed in area analysis by cleaning geometry objects before JSON serialization
- **JSON Parse Errors**: Added proper content-type checking and error handling for API responses
- **Research Tool Initialization**: Added advanced scientific tools (spectral analysis, scotobiology impact, energy economics, etc.)
- **API Endpoints**: Implemented missing endpoints for comprehensive analysis

## API Endpoints
- `/api/stations` - Ground-based measurement stations
- `/api/measurements` - Submit new measurements
- `/api/stats` - Statistical analysis of selected areas
- `/api/history` - Historical trend data
- `/api/analyze-area` - Area analysis (fixed cyclic object issue)
- `/api/spectral-analysis` - Spectral signature analysis
- `/api/scotobiology-analysis` - Ecological impact assessment
- `/api/energy-economics` - Economic impact calculations
- `/api/multi-spectral` - Multi-spectral satellite analysis

## Data Sources
- **VIIRS Day/Night Band (NOAA-20)**: Satellite radiance measurements
- **GaN2024 Database**: Ground-based measurements
- **Open-Meteo API**: Weather data integration

## Installation

### Prerequisites
- Node.js v16+
- PostgreSQL database (for production)
- Vercel CLI (for deployment)

### Local Development
```bash
npm install
npm run dev
```

### Environment Variables
Create a `.env` file with:
```
DATABASE_URL=your_postgres_connection_string
```

## Usage
1. Launch the application and choose between Citizen Mode or Scientific Mode
2. Use draw tools to select areas of interest
3. Apply various analytical tools to assess light pollution impacts
4. Export data for further research

## Architecture
- **Frontend**: JavaScript/HTML/CSS with Leaflet mapping library
- **Backend**: Express.js API server
- **Database**: PostgreSQL with PostGIS extension
- **Deployment**: Vercel for cloud, local server for development

## Research Applications
The platform supports advanced research applications including:
- Spectral analysis of light pollution sources
- Scotobiology impact assessments on wildlife
- Temporal dynamics of light pollution
- Energy economics and policy simulation
- Multi-spectral satellite analysis
- Expert data export for academic research

## Contributing
Contributions to enhance the platform's capabilities are welcome. Focus areas include:
- Additional data source integrations
- Enhanced analytical algorithms
- Improved visualization tools
- Mobile responsiveness
