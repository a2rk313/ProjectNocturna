# Project Nocturna (v2)

An AI-native WebGIS concept + implementation scaffold for discovering dark sky sites and analyzing light pollution trends using NASA datasets.

## What's in this repo

- **Next.js 14+ App Router** application (TypeScript, Tailwind, React-Leaflet)
- **PostGIS + GeoServer** infrastructure (Docker Compose)
- **Chatbot component** (Lumina - context-aware cosmic guide)
- **API routes** for PostGIS queries and chatbot interactions
- `docs/PROJECT_NOCTURNA_REPORT.md`: Architecture & compliance report

## Quick start

### 1. Infrastructure (PostGIS + GeoServer)

```bash
# Copy environment template
cp env.example .env

# Start Docker services
docker-compose up -d
```

Verify services:
- GeoServer UI: `http://localhost:8080/geoserver` (admin/geoserver_dev_password_change_me)
- PostGIS: `localhost:5432` (credentials in `.env`)

### 2. Next.js Application

```bash
# Install dependencies
npm install

# Run development server
npm run dev
```

Open `http://localhost:3000` to see the map interface.

### 3. Publish VIIRS Layer (Option A)

See `docs/geoserver_publish_viirs.md` for step-by-step instructions to publish a GeoTIFF as a WMS layer.

## If Docker says “permission denied” (Linux)

If you see an error about `/var/run/docker.sock`, run:

```bash
sudo usermod -aG docker "$USER"
newgrp docker
```

Then retry `docker-compose up -d`.

## Verify the PostGIS compliance table

After `docker-compose up -d`:

```bash
docker exec -it nocturna-postgis psql -U nocturna -d nocturna -c "\\d+ public.light_measurements"
```

## Docs

- See `docs/PROJECT_NOCTURNA_REPORT.md` for architecture, features, and compliance mapping.
- See `docs/geoserver_publish_viirs.md` to publish a VIIRS GeoTIFF as a WMS layer (Option A).

