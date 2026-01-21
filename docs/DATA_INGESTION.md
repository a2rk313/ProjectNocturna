# Data Ingestion Guide

This guide explains how to insert data into the Project Nocturna PostGIS database and publish it via GeoServer.

## Prerequisites

Ensure your database and GeoServer are running via Docker:

```bash
docker-compose up -d
```

## 1. Seeding PostGIS with Sample Data

We have provided a script to insert sample light measurement data into the PostGIS database.

**Script:** `scripts/seed_db.ts`

**Usage:**

```bash
# Run using Bun
bun run scripts/seed_db.ts

# Or using TS-Node if installed
# npx ts-node scripts/seed_db.ts
```

This script connects to the database using credentials from your `.env` file (or defaults matched to `docker-compose.yml`) and inserts sample points for London, New York, and Tokyo into the `light_measurements` table.

### Verifying Ingestion

You can verify the data was inserted by querying the database:

```bash
# Connect to the database container
docker exec -it nocturna-postgis psql -U nocturna -d nocturna

# Run query
SELECT * FROM light_measurements;
```

## 2. Ingesting VIIRS Raster Data

For massive raster datasets (VIIRS), we use a python script scaffold located at `scripts/ingest_viirs/ingest.py`.

See [scripts/ingest_viirs/README.md](../scripts/ingest_viirs/README.md) for details on the output structure.

## 3. Manual Data Ingestion (Shapefiles/GeoJSON)

### Ingesting Dark Sky Parks
To ingest Dark Sky Parks data:

1.  **Prepare Data**: Obtain a GeoJSON file of the parks (e.g., download from ArcGIS or use our sample).
2.  **Run Script**:
    ```bash
    bun run scripts/ingest_parks.ts path/to/your_file.geojson
    ```
    *Note: If no path is provided, it defaults to `data/sample_parks.geojson`.*

3.  **Publish in GeoServer**:
    - Go to GeoServer Web UI.
    - Create a new Layer from the `dark_sky_parks` table in the `nocturna_postgis` store.
    - Publish as WMS/WFS.

### Other Datasets (CLI Method)
If you have PostGIS tools installed locally:

```bash
shp2pgsql -I -s 4326 path/to/your_file.shp public.your_table_name | psql -h localhost -U nocturna -d nocturna
```

## 4. Publishing in GeoServer

### Option A: Automated Script (Recommended)
We provide a script to automatically create the Workspace, Store, and Layer in GeoServer via the REST API.

```bash
bun run scripts/publish_layer.ts
```

This will publish the `light_measurements` table as `nocturna:light_measurements`.

### Option B: Manual (Web UI)
1.  Log in to GeoServer at `http://localhost:8080/geoserver` (Default: `admin` / `geoserver`).
2.  **Stores**: Create a new Store > PostGIS. Connect to the `nocturna` database within the docker network (host: `nocturna-postgis`).
3.  **Layers**: Go to "Layers" > "Add a new layer". Select your PostGIS store.
4.  **Publish**: Click "Publish" next to the table (e.g., `light_measurements`).
5.  **Compute Bounds**: In the layer settings, click "Compute from data" and "Compute from native bounds".
6.  **Save**: Click Save.

Your layer is now available via WMS/WFS!
