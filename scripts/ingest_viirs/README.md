# VIIRS Raster Ingestion (Option A)

This folder is the ingestion scaffold for **VIIRS Nighttime Lights** as raster products.

## Output contract

Ingestion should write GeoTIFFs into:

- `data/rasters/viirs/nightly_lights/<YEAR>/...tif`

GeoServer reads those rasters from inside the container at:

- `/opt/nocturna_rasters/viirs/nightly_lights/<YEAR>/...tif`

## Scientific expectations (V1)

- Preserve/record **CRS**, **pixel size**, **units**, and **source metadata**
- Provide a **reproducible** step list (download → preprocess → publish)
- Keep raw downloads separate from processed outputs (optional V2)

