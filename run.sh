#!/bin/bash

# 1. Cleanup old containers (to ensure a fresh test)
echo "🧹 Cleaning up old containers..."
podman rm -f projectnocturna_app projectnocturna_db projectnocturna_geoserver 2>/dev/null
podman network rm nocturna_net 2>/dev/null

# 2. Create the Network
echo "🌐 Creating network..."
podman network create nocturna_net

# 3. Start Database (PostGIS)
echo "🐘 Starting Database..."
podman run -d \
  --name projectnocturna_db \
  --network nocturna_net \
  --restart always \
  -p 5433:5432 \
  -e POSTGRES_USER=nocturna_user \
  -e POSTGRES_PASSWORD=nocturna_password \
  -e POSTGRES_DB=nocturna_db \
  -v $(pwd)/database_setup.sql:/docker-entrypoint-initdb.d/init.sql:Z \
  docker.io/postgis/postgis:15-3.3

# 4. Start GeoServer (Optional - Comment out if not needed yet)
echo "🌍 Starting GeoServer..."
podman run -d \
  --name projectnocturna_geoserver \
  --network nocturna_net \
  -p 8080:8080 \
  -e GEOSERVER_ADMIN_USER=admin \
  -e GEOSERVER_ADMIN_PASSWORD=geoserver \
  -e CORS_ENABLED=true \
  -e CORS_ALLOWED_ORIGINS=* \
  docker.io/kartoza/geoserver:2.24.1

# 5. Build and Start the App
echo "🚀 Building and Starting App..."
# Build the image from your Dockerfile
podman build -t projectnocturna_app -f Dockerfile .

# Run the app
podman run -d \
  --name projectnocturna_app \
  --network nocturna_net \
  -p 3000:3000 \
  -e DB_HOST=projectnocturna_db \
  -e DB_PORT=5432 \
  -e DB_USER=nocturna_user \
  -e DB_PASSWORD=nocturna_password \
  -e DB_NAME=nocturna_db \
  -e NODE_ENV=production \
  -e ADMIN_SECRET=secret \
  localhost/projectnocturna_app

# 6. Start n8n (with Auto-Import)
echo "🤖 Starting n8n Automation (Importing ActionBot)..."
podman run -d \
  --name projectnocturna_n8n \
  --network nocturna_net \
  --restart always \
  -p 5678:5678 \
  -e GENERIC_TIMEZONE=Asia/Karachi \
  -e TZ=Asia/Karachi \
  -v n8n_data:/home/node/.n8n \
  -v $(pwd)/WebGIS_ActionBot_Final_Fixed.json:/tmp/workflow.json:Z \
  docker.io/n8nio/n8n:latest \
  /bin/sh -c "n8n import:workflow --input=/tmp/workflow.json && n8n start"

echo "✅ Done! App should be running on http://localhost:3000"
echo "   Database is on localhost:5433"
