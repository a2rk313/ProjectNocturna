#!/bin/bash

# ==============================================================================
#  PROJECT NOCTURNA - INFRASTRUCTURE STARTER
#  (Run this on your HOST machine, not inside Distrobox)
# ==============================================================================

echo "🚀 Starting Infrastructure Services..."

# 1. Load Credentials
if [ -f .env ]; then
    set -a; source .env; set +a
else
    echo "⚠️  Warning: .env file not found. Using default 'admin' credentials."
    POSTGRES_USER=admin
    POSTGRES_PASSWORD=password
    POSTGRES_DB=nocturna
fi

# 2. Create Network
podman network exists nocturna_net || podman network create nocturna_net

# --- SERVICE 1: DATABASE ---
if podman ps -a --format '{{.Names}}' | grep -q "^nocturna_db_dev$"; then
    echo "🔄 Restarting Database..."
    podman start nocturna_db_dev
else
    echo "🐘 Creating Database Container..."
    podman run -d \
      --name nocturna_db_dev \
      --network nocturna_net \
      -p 5433:5432 \
      -e POSTGRES_USER=$POSTGRES_USER \
      -e POSTGRES_PASSWORD=$POSTGRES_PASSWORD \
      -e POSTGRES_DB=$POSTGRES_DB \
      -v postgres_data_dev:/var/lib/postgresql/data:Z \
      docker.io/postgis/postgis:15-3.3
fi

# --- SERVICE 2: GEOSERVER ---
if podman ps -a --format '{{.Names}}' | grep -q "^nocturna_geoserver_dev$"; then
    echo "🔄 Restarting GeoServer..."
    podman start nocturna_geoserver_dev
else
    echo "🌍 Creating GeoServer Container..."
    # We map the local ./geoserver_data folder so your Python script results show up here
    podman run -d \
      --name nocturna_geoserver_dev \
      --network nocturna_net \
      -p 8080:8080 \
      -e CORS_ENABLED=true \
      -e GEOSERVER_ADMIN_PASSWORD=geoserver \
      -e GEOSERVER_ADMIN_USER=admin \
      -v $(pwd)/geoserver_data:/opt/geoserver/data_dir:Z \
      docker.io/kartoza/geoserver:2.24.1
fi

# --- SERVICE 3: n8n AUTOMATION ---
if podman ps -a --format '{{.Names}}' | grep -q "^nocturna_n8n_dev$"; then
    echo "🔄 Restarting n8n..."
    podman start nocturna_n8n_dev
else
    echo "🤖 Creating n8n Container..."
    podman run -d \
      --name nocturna_n8n_dev \
      --network nocturna_net \
      -p 5678:5678 \
      -e GENERIC_TIMEZONE=Asia/Karachi \
      -e TZ=Asia/Karachi \
      -e N8N_HOST=localhost \
      -e N8N_PORT=5678 \
      -e N8N_PROTOCOL=http \
      -e WEBHOOK_URL=http://localhost:5678/ \
      -e DB_TYPE=postgresdb \
      -e DB_POSTGRESDB_HOST=nocturna_db_dev \
      -e DB_POSTGRESDB_PORT=5432 \
      -e DB_POSTGRESDB_USER=$POSTGRES_USER \
      -e DB_POSTGRESDB_PASSWORD=$POSTGRES_PASSWORD \
      -e DB_POSTGRESDB_DATABASE=$POSTGRES_DB \
      -v n8n_data_dev:/home/node/.n8n:Z \
      docker.io/n8nio/n8n:latest
fi

echo ""
echo "✅ INFRASTRUCTURE ONLINE"
echo "   🗄️  Database:   localhost:5433"
echo "   🌍 GeoServer:  http://localhost:8080/geoserver"
echo "   ⚡ n8n:        http://localhost:5678"
echo ""
echo "👉 DEV TIP: Your Python script in Distrobox should save files to:"
echo "   $(pwd)/geoserver_data/data_layers"