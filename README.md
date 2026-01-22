<div align="center">

[![Nocturna Logo](https://raw.githubusercontent.com/a2rk313/ProjectNocturna/refs/heads/a2rk/images/logo.png)](https://github.com/a2rk313/ProjectNocturna)


# **Project Nocturna**

</div>

A WebGIS platform that enables everyday users to discover prime astronomical observation sites while empowering scientists and researchers to conduct light pollution data analysis.

## Setup & Running

### Prerequisites
- Docker & Docker Compose (or Podman)
- Node.js (for local scripts)

### Quick Start

1. **Start Services**
   ```bash
   docker-compose up -d
   ```
   *This starts Postgres (DB), GeoServer, and the App.*

2. **Configure GeoServer**
   Wait for GeoServer to start (approx 1 min), then run:
   ```bash
   npm run setup:geoserver
   ```
   *This automatically provisions the workspace and layers.*

3. **Access App**
   Open [http://localhost:3000](http://localhost:3000)

### Environment Variables
Copy `.env.example` to `.env` to configure secrets and database credentials.

### Google Earth Engine Setup
To use dynamic VIIRS datasets and advanced analysis (replacing static NASA tiles), set up a Google Cloud Service Account:
1. Create a project in Google Cloud Console.
2. Enable the **Google Earth Engine API**.
3. Register your service account with Earth Engine at [signup.earthengine.google.com](https://signup.earthengine.google.com).
4. Create a **Service Account Key** (JSON) and save it.
5. Set the path in `.env`:
   ```bash
   GOOGLE_APPLICATION_CREDENTIALS="./service-account-key.json"
   ```
   *Note: If not configured, the app falls back to static NASA 2012 tiles.*
