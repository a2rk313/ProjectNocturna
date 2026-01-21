# Features → Implementation Map (Citizen + Scientific)

This document maps the requested features to concrete **UI surfaces**, **API endpoints**, and **datasets**.

## Citizen Mode (User-Facing)

### Dark Sky Discovery
- **UI**: `/citizen` → Discovery tab
- **API**: `GET /api/dark-sky-sites?lat=...&lon=...&radiusKm=...`
- **Datasets**:
  - IDA directory (certified dark sky sites) *(ingest next)*
  - Globe at Night (citizen observations) *(ingest next)*
  - SQM Network (ground brightness) *(ingest next)*
  - VIIRS VNP46A2 raster (GeoServer WMS) *(already supported)*

### Interactive Map (global light pollution)
- **UI**: Map on `/`, `/citizen`, `/science`
- **GeoServer**: WMS layer `nocturna:VIIRS_Night_Lights_2023` + style `viirs_radiance_ramp`
- **Datasets**:
  - VIIRS VNP46A2 (raster) via GeoTIFF → GeoServer
  - Black Marble (GIBS) *(optional V2, if you want direct GIBS tiles)*
  - World Atlas (Falchi 2016) *(baseline raster/vector to ingest)*

### Observation Planning
- **UI**: `/citizen` → Planning tab
- **API**: `POST /api/observations/score`
- **Datasets** (V2):
  - Weather services (cloud cover)
  - Astronomical (moon illumination/altitude)
  - VIIRS radiance sampling (from GeoServer/WCS or precomputed PostGIS summaries)

### Dark Sky Parks Directory
- **UI**: `/citizen` → Parks tab
- **Dataset**: International Dark-Sky Association directory *(to ingest into PostGIS)*

### Real-time Data Access
- **UI**: `/citizen` → Real-time tab
- **Dataset**: FIRMS active fires *(to distinguish temporary fires)*

## Scientific Mode (Researcher-Facing)

### VIIRS Nighttime Lights (VNP46A2)
- **UI**: `/science` → VIIRS tab
- **GeoServer**: WMS/WCS/WFS as appropriate

### Historical Trend Analysis + Predictive Analytics
- **UI**: `/science` → Trends tab
- **API**: `POST /api/science/trends`
- **Datasets**:
  - VIIRS VNP46A2 time series
  - DMSP-OLS historical time series
  - EOG VIIRS VNL (verified products)

### Statistical Analysis (reports)
- **Output**: JSON first; plotting layer next

### Ecological Impact Assessment
- **UI**: `/science` → Ecology tab
- **API**: `GET /api/science/ecology/impact` *(scaffold)*
- **Datasets** (V2):
  - IUCN ranges + GBIF occurrences (PostGIS)
  - Radiance exposure metrics from VIIRS

### Energy Waste Analysis
- **UI**: `/science` → Energy tab
- **API**: `GET /api/science/energy-waste` *(scaffold; calibrate next)*

### Spectral Signature Analysis
- **UI**: `/science` → Spectral tab
- **API**: `GET /api/science/spectral` *(scaffold; needs spectral sources or inventories)*

### Policy Impact Simulation
- **UI**: `/science` → Policy tab
- **API**: `POST /api/science/policy/simulate` (+ `GET` example)

