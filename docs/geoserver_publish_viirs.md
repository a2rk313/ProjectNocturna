# GeoServer: Publish VIIRS Raster (Option A)

This guide publishes a **GeoTIFF VIIRS** raster as a WMS layer.

## Pre-reqs

- Services running: `docker-compose up -d`
- A GeoTIFF available under `data/rasters/...` (host), which appears in the GeoServer container at:
  - `/opt/nocturna_rasters`

## 1) Confirm the raster mount is visible in GeoServer container

```bash
docker exec -it nocturna-geoserver ls -la /opt/nocturna_rasters
```

## 2) Create workspace

In GeoServer UI (`http://localhost:8080/geoserver`):

- **Workspaces** → **Add new workspace**
  - **Name**: `nocturna`
  - **Namespace URI**: `http://nocturna.local/nocturna`

## 3) Add a GeoTIFF store

- **Stores** → **Add new Store**
- Choose **GeoTIFF**
- Workspace: `nocturna`
- Data Source:
  - **URL**: `file:/opt/nocturna_rasters/viirs/nightly_lights/2023/VIIRS_Night_Lights_2023.tif`

Save.

## 4) Publish layer

After saving the store, GeoServer will offer **Publish**.

- **Layer Name**: `VIIRS_Night_Lights_2023`
- Verify **SRS/CRS** is correct (often `EPSG:4326` or the raster’s native CRS)
- Compute bounding boxes if prompted

Save.

## 5) Verify WMS

- **Layer Preview** → select `nocturna:VIIRS_Night_Lights_2023` → OpenLayers preview

Or hit the WMS endpoint (browser):

- `http://localhost:8080/geoserver/nocturna/wms?service=WMS&request=GetCapabilities`

## 6) Apply SLD styling (radiance ramp)

You can upload the provided SLD to get a dark-to-bright ramp:

- File: `docs/sld/viirs_radiance.sld`

Steps:
- **Styles** → **Add a new style**
  - Name: `viirs_radiance_ramp`
  - Format: SLD
  - Upload the SLD file
- Save, then **Associate style** to the `VIIRS_Night_Lights_2023` layer and set it as **default**.

If your raster min/max differ, edit the ColorMapEntry quantities in the SLD to match your dataset.

## 7) Next (frontend consumption)

Once the layer is published, we can add:

- An **SLD** for scientifically meaningful symbology (radiance ramp)
- A Next.js map UI that consumes WMS tiles from:
  - `http://localhost:8080/geoserver/nocturna/wms`

