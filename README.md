<div align="center">

[![Nocturna Logo](https://raw.githubusercontent.com/a2rk313/ProjectNocturna/refs/heads/a2rk/images/logo.png)](https://github.com/a2rk313/ProjectNocturna)


# **Project Nocturna**

</div>

A WebGIS platform that enables everyday users to discover prime astronomical observation sites while empowering scientists and researchers to conduct light pollution data analysis.

## Architecture

This project implements a modern WebGIS architecture with:

- **PostGIS Database**: Stores spatial measurement data
- **GeoServer**: Serves spatial data as WMS layers
- **Node.js Backend**: API and data processing layer
- **Leaflet Frontend**: Interactive mapping interface

The system stores data in PostGIS and serves at least one layer (ground measurements) via GeoServer WMS, providing efficient visualization of large datasets.

## Features

- Dual user modes (Citizen Science and Scientific Analysis)
- Interactive drawing tools for area selection
- Multiple data layers (ground measurements, VIIRS nighttime lights, dark sky parks)
- Location comparison functionality
- Real-time data access from PostGIS database

## Setup

1. Copy `.env.example` to `.env` and adjust settings
2. Run `docker compose up -d`
3. Follow GeoServer configuration instructions in `GEOSERVER_SETUP.md`
