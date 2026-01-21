# Architecture V2: Multi-Dataset Ingestion & Mode Separation

## Goal Description
Expand Project Nocturna to ingest a comprehensive suite of datasets and strictly separate functionality into **Citizen Mode** and **Scientific Mode**.

## User Review Required
- **Storage Strategy**: Confirm using GeoServer ImageMosaic for time-series rasters (VIIRS) vs static layers (World Atlas).
- **External APIs**: Confirm usage of live APIs for Weather/Astro data vs ingesting historical archives.

## 1. Datasets & Ingestion Strategy

### A. Satellite & Earth Observation (Scientific Mode)
| Dataset | Source | Format | Ingestion Target | Update Frequency |
| :--- | :--- | :--- | :--- | :--- |
| **VIIRS Nighttime Lights** | NASA/EOG (VNP46A2) | HDF5/GeoTIFF | GeoServer (ImageMosaic) | Daily/Monthly |
| **World Atlas 2016** | Falchi et al. | GeoTIFF | GeoServer (Static Layer) | Once |
| **NASA Black Marble** | NASA GIBS | WMTS/GeoTIFF | GeoServer or Proxy | Annual/Static |
| **DMSP-OLS** | NOAA | GeoTIFF | GeoServer (ImageMosaic) | Historical (Once) |
| **FIRMS** | NASA LANCE | GeoJSON/API | PostGIS (`fire_points`) | Live/Daily |

### B. Ground-Based Measurements (Citizen/Sci Modes)
| Dataset | Source | Format | Ingestion Target |
| :--- | :--- | :--- | :--- |
| **Global SQM Network** | Unihedron/Community | CSV/API | PostGIS (`sqm_readings`) |
| **Globe at Night** | GaN Database | CSV | PostGIS (`gan_observations`) |

### C. Ecological & Environmental (Scientific Mode)
| Dataset | Source | Format | Ingestion Target |
| :--- | :--- | :--- | :--- |
| **IUCN Red List / GBIF** | GBIF API | DarwinCore/JSON | PostGIS (`biodiversity_hotspots`) |
| **Weather** | OpenWeatherMap/Meteor | API | Live Query (Client-side) |
| **Astro Data** | SunCalc/AstronomyEngine | Library | Live Calc (Client-side) |

### D. Reference (Both Modes)
| Dataset | Source | Format | Ingestion Target |
| :--- | :--- | :--- | :--- |
| **Dark Sky Parks** | IDA/ArcGIS | GeoJSON/Shp | PostGIS (`dark_sky_parks`) |
| **EOG Verified VNL** | EOG | GeoTIFF | GeoServer |

## 2. Infrastructure Updates

### Database Schema (`db/init/002_extended_schema.sql`)
- `sqm_readings`: Station ID, location, magnitude, time.
- `gan_observations`: Observer loc, limiting mag, cloud cover.
- `fire_points`: Location, brightness, confidence, acquisition time.
- `biodiversity_hotspots`: Geometry, species_list, threat_level.

### GeoServer Workspaces
- Workspace `nocturna_sat`: For huge raster stores.
- Workspace `nocturna_ref`: For static vector overlays (Parks).

## 3. Interface Modes

### Citizen Mode (`/citizen`)
**Goal**: Education, Observation, Awareness.
- **Layers**: Light Pollution Map (World Atlas), Dark Sky Parks (Points), User Observations (Heatmap).
- **Tools**:
  - *Discovery*: Find nearest Dark Sky Park.
  - *Planning*: "Is tonight clear?" (Weather+Astro).
  - *Contribute*: Submit SQM/Visual reading (writes to `light_measurements` or `gan_observations`).

### Scientific Mode (`/science`)
**Goal**: Analysis, Trend Monitoring, Impact Assessment.
- **Layers**: VIIRS Time-Series (slider), DMSP-OLS (historical), FIRMS active fires, Biodiversity overlays.
- **Tools**:
  - *Trend Analysis*: Plot radiance over time for a selected polygon (uses PostGIS raster stats or API).
  - *Impact Assessment*: Correlate light levels with `biodiversity_hotspots`.
  - *Correlation*: Compare Satellite vs Ground (SQM) readings.

## Implementation Steps
1.  **Schema**: Create `002_extended_schema.sql`.
2.  **Ingest Scripts**:
    - `scripts/ingest_firms.ts` (Live fire data).
    - `scripts/ingest_sqm.ts` (Ground station bulk load).
3.  **GeoServer Config**:
    - Update `scripts/publish_layer.ts` to handle raster stores if possible, or document manual raster setup.
4.  **UI Updates**:
    - `SciencePanel`: Add Layer Control for new rasters.
    - `CitizenPanel`: Enhance Discovery with real Parks data.