#!/bin/bash

# Project Nocturna - Enhanced Orchestration Script
# Purpose: Initialize infra, setup data directories, ingest real data, and start development environment.

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}🔭 Project Nocturna: Enhanced Scientific Ecosystem${NC}"

# 1. Parse Arguments
REBUILD=""
SKIP_DATA=false
START_REFRESH=false
HELP=false

for arg in "$@"; do
    case "$arg" in
        "--rebuild")
            REBUILD="--build"
            ;;
        "--skip-data")
            SKIP_DATA=true
            ;;
        "--start-refresh")
            START_REFRESH=true
            ;;
        "--help"|"-h")
            HELP=true
            ;;
    esac
done

if [ "$HELP" = true ]; then
    echo "Usage: $0 [options]"
    echo ""
    echo "Options:"
    echo "  --rebuild          Rebuild Docker containers"
    echo "  --skip-data        Skip data ingestion steps"
    echo "  --start-refresh    Start automated refresh service"
    echo "  --help, -h        Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0                           # Full startup with data ingestion"
    echo "  $0 --skip-data             # Startup without data ingestion"
    echo "  $0 --start-refresh          # Startup with refresh service"
    echo "  $0 --rebuild --skip-data   # Rebuild containers, skip data"
    exit 0
fi

# 2. Check for .env
if [ ! -f .env ]; then
    echo -e "${RED}❌ Error: .env file not found.${NC}"
    echo -e "${YELLOW}Please copy .env.example to .env and configure your credentials.${NC}"
    echo -e "${YELLOW}You can also run: cp .env.example .env${NC}"
    exit 1
fi

# 3. Setup Data Directories
echo -e "${BLUE}📁 Setting up data directories...${NC}"
if [ "$SKIP_DATA" = false ]; then
    if [ -x ./data_manager.sh ]; then
        ./data_manager.sh setup
    else
        echo -e "${YELLOW}Warning: data_manager.sh not found, creating basic directories...${NC}"
        mkdir -p data/{rasters,exports,temp,logs}
    fi
fi

# Check for Docker Compose command (prioritizing v2 format)
if command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
    DOCKER_CMD="docker compose"
    echo -e "${YELLOW}Using docker compose v2.x${NC}"
elif command -v docker-compose >/dev/null 2>&1; then
    # Test if docker-compose needs sudo
    if docker-compose ps >/dev/null 2>&1; then
        DOCKER_CMD="docker-compose"
        echo -e "${YELLOW}Using docker-compose v1.x${NC}"
    else
        # Try with sudo
        if sudo -n docker-compose ps >/dev/null 2>&1; then
            DOCKER_CMD="sudo docker-compose"
            echo -e "${YELLOW}Using docker-compose v1.x with sudo${NC}"
        else
            echo -e "${RED}Error: docker-compose permission denied${NC}"
            echo -e "${YELLOW}Try adding user to docker group or use sudo${NC}"
            exit 1
        fi
    fi
else
    echo -e "${RED}Error: Neither 'docker compose' nor 'docker-compose' found${NC}"
    echo -e "${YELLOW}Please install Docker with Compose plugin${NC}"
    exit 1
fi

echo -e "${YELLOW}Using command: $DOCKER_CMD${NC}"

# 4. Start Infrastructure
echo -e "${BLUE}🐳 Starting Docker Infrastructure...${NC}"

# Check if containers are already running
if $DOCKER_CMD ps -q | grep -q "nocturna"; then
    echo -e "${YELLOW}⚠️  Nocturna containers already running. Stopping first...${NC}"
    $DOCKER_CMD down
    sleep 2
fi

# Try to start the infrastructure with error handling
if ! $DOCKER_CMD up -d $REBUILD 2>/dev/null; then
    echo -e "${RED}❌ Docker Compose failed to start. This may be due to a compatibility issue.${NC}"
    echo -e "${YELLOW}Attempting to resolve Docker Compose ContainerConfig issue...${NC}"

    # Try to clean up any corrupted containers
    $DOCKER_CMD down -v --remove-orphans 2>/dev/null || true

    # Try to pull fresh images
    $DOCKER_CMD pull postgis/postgis:15-3.3 2>/dev/null || true
    $DOCKER_CMD pull docker.osgeo.org/geoserver:2.24.2 2>/dev/null || true

    # Retry starting the infrastructure
    if ! $DOCKER_CMD up -d $REBUILD 2>/dev/null; then
        echo -e "${RED}❌ Failed to start Docker infrastructure after cleanup.${NC}"
        echo -e "${YELLOW}Please try running: docker system prune -f && docker-compose down && docker-compose up -d${NC}"
        exit 1
    fi
fi

echo -e "${GREEN}✅ Docker infrastructure started${NC}"

# 5. Wait for PostGIS to be healthy
echo -e "${YELLOW}⏳ Waiting for PostGIS to be healthy...${NC}"
RETRIES=30
HEALTHY=false

while [ $RETRIES -gt 0 ]; do
    # Check if the postgis service is running and healthy
    if $DOCKER_CMD ps 2>/dev/null | grep "postgis" | grep -q "healthy"; then
        echo -e "${GREEN}✅ PostGIS is healthy!${NC}"
        HEALTHY=true
        break
    fi
    echo -n "."
    sleep 2
    RETRIES=$((RETRIES-1))
done

if [ "$HEALTHY" = false ]; then
    echo -e "${RED}❌ Error: PostGIS failed to become healthy in time.${NC}"
    echo -e "${YELLOW}Check logs with: $DOCKER_CMD logs nocturna-postgis${NC}"

    # Try to get more information about the issue
    if $DOCKER_CMD ps 2>/dev/null | grep "postgis"; then
        echo -e "${YELLOW}PostGIS container status:${NC}"
        $DOCKER_CMD ps | grep "postgis"
        echo -e "${YELLOW}PostGIS logs:${NC}"
        $DOCKER_CMD logs nocturna-postgis 2>/dev/null | tail -10
    fi

    exit 1
fi

# 6. Prepare Database and Ingest Real Data
if [ "$SKIP_DATA" = false ]; then
    echo -e "${BLUE}🗄️ Initializing Database & Extensions...${NC}"

    # Check if PostGIS is accessible before applying schema
    if ! timeout 10 bash -c "echo > /dev/tcp/localhost/5432" 2>/dev/null; then
        echo -e "${YELLOW}⚠️  PostGIS port not accessible yet, waiting...${NC}"
        sleep 10
    fi

    # The improved apply_schema.ts handles extensions (postgis_raster) and all SQL files
    if ! bun run scripts/apply_schema.ts; then
        echo -e "${RED}❌ Error: Failed to apply database schema.${NC}"
        echo -e "${YELLOW}Check that PostGIS is running and accessible.${NC}"
        exit 1
    fi

    echo -e "${BLUE}🌱 Ingesting Real Scientific Data...${NC}"

    # Ingest enhanced parks data if available
    if [ -f data/real_parks_enhanced.geojson ]; then
        echo -e "${BLUE}🏞️ Ingesting Enhanced Dark Sky Parks...${NC}"
        # Point directly to the enhanced script for reliability
        bun run scripts/enhanced_park_ingestion.ts ingest data/real_parks_enhanced.geojson
    fi

    # Ingest sample measurements if available
    if [ -f data/sample_measurements.csv ]; then
        echo -e "${BLUE}📊 Ingesting Light Measurements...${NC}"
        # Point directly to the enhanced script for reliability
        bun run scripts/realtime_ingestion.ts csv data/sample_measurements.csv
    fi

    # Create VIIRS data directories
    echo -e "${BLUE}📁 Creating VIIRS data directories...${NC}"
    mkdir -p data/rasters/viirs data/temp/viirs data/logs

    # Check for NASA Earthdata credentials
    if [ -z "$NASA_EARTHDATA_USERNAME" ] || [ -z "$NASA_EARTHDATA_PASSWORD" ]; then
        echo -e "${YELLOW}⚠️  NASA Earthdata credentials not found in environment.${NC}"
        echo -e "${YELLOW}   Set NASA_EARTHDATA_USERNAME and NASA_EARTHDATA_PASSWORD to download real VIIRS data.${NC}"
        echo -e "${YELLOW}   Using mock data for now...${NC}"

        # Create mock VIIRS data directory structure
        echo '{"product": "VNP46A2", "year": 2023, "satellite": "Suomi-NPP", "version": "v1.1"}' > data/rasters/viirs/mock_metadata.json
    else
        # Download and ingest VIIRS data
        echo -e "${BLUE}🛰️ Downloading and Ingesting VIIRS Nighttime Lights Data...${NC}"
        if command -v bun >/dev/null 2>&1; then
            # Run the VIIRS pipeline to download and ingest data
            bun run scripts/viirs_pipeline.ts pipeline "nightly,monthly" "2023,2024"
        else
            echo -e "${YELLOW}Warning: bun not found, skipping VIIRS data ingestion${NC}"
        fi
    fi

    # Also run the VIIRS download script directly to ensure data is downloaded
    echo -e "${BLUE}📥 Running additional VIIRS data download...${NC}"
    if [ -f "scripts/download_viirs.ts" ]; then
        bun run scripts/download_viirs.ts || echo -e "${YELLOW}Note: VIIRS download script not found or failed${NC}"
    elif [ -f "scripts/viirs_downloader.ts" ]; then
        bun run scripts/viirs_downloader.ts || echo -e "${YELLOW}Note: VIIRS downloader script not found or failed${NC}"
    else
        echo -e "${YELLOW}Note: No dedicated VIIRS download script found${NC}"
    fi

    # Generate quality reports
    echo -e "${BLUE}📈 Generating Quality Reports...${NC}"
    bun run scripts/realtime_ingestion.ts report || echo -e "${YELLOW}Warning: Quality report generation failed${NC}"
else
    echo -e "${YELLOW}⏭️  Skipping data ingestion steps${NC}"
    echo -e "${BLUE}🗄️ Applying Basic Extensions & Schema...${NC}"
    bun run scripts/apply_schema.ts
fi

# 7. Setup GeoServer Layers
echo -e "${BLUE}📡 Publishing GeoServer Layers...${NC}"

# Check if GeoServer is accessible before publishing layers
GEOSERVER_RETRIES=30
GEOSERVER_HEALTHY=false

while [ $GEOSERVER_RETRIES -gt 0 ]; do
    if curl -sf http://localhost:8080/geoserver/web/ > /dev/null 2>&1; then
        echo -e "${GREEN}✅ GeoServer is accessible!${NC}"
        GEOSERVER_HEALTHY=true
        break
    fi
    echo -n "."
    sleep 2
    GEOSERVER_RETRIES=$((GEOSERVER_RETRIES-1))
done

if [ "$GEOSERVER_HEALTHY" = true ]; then
    if ! bun run scripts/publish_layer.ts; then
        echo -e "${YELLOW}⚠️  Warning: Failed to publish GeoServer layers.${NC}"
        echo -e "${YELLOW}   This may be due to GeoServer still initializing.${NC}"
        echo -e "${YELLOW}   Layers will be published on next application restart.${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  Warning: GeoServer not accessible, skipping layer publishing.${NC}"
    echo -e "${YELLOW}   Layers will need to be published manually later.${NC}"
fi

echo -e "${BLUE}🗺️ Creating Raster Views...${NC}"
if [ -x ./data_manager.sh ]; then
    ./data_manager.sh viirs report || echo -e "${YELLOW}Warning: VIIRS report generation failed${NC}"
fi

# 8. Start Automated Refresh Service (optional)
if [ "$START_REFRESH" = true ]; then
    echo -e "${BLUE}🔄 Starting Automated Data Refresh Service...${NC}"
    if [ -x ./data_manager.sh ]; then
        # Configure refresh service first
        ./data_manager.sh refresh configure
        # Start the service in background
        nohup ./data_manager.sh refresh start > data/logs/refresh.log 2>&1 &
        echo -e "${GREEN}✅ Refresh service started in background${NC}"
        echo -e "${YELLOW}Check status with: ./data_manager.sh refresh status${NC}"
    else
        echo -e "${YELLOW}Warning: data_manager.sh not found, skipping refresh service${NC}"
    fi
    
    # Give it a moment to start
    sleep 2
fi

# 9. Launch Application
echo -e "${GREEN}🚀 Launching Project Nocturna Development Server...${NC}"
echo -e "${BLUE}📊 Available Data Management Commands:${NC}"
echo -e "${YELLOW}  ./data_manager.sh status     # Show system status${NC}"
echo -e "${YELLOW}  ./data_manager.sh parks ingest <file>   # Ingest parks data${NC}"
echo -e "${YELLOW}  ./data_manager.sh measurements ingest <file>   # Ingest measurements${NC}"
echo -e "${YELLOW}  ./data_manager.sh viirs download <product> <year>   # Download VIIRS data${NC}"
echo -e "${YELLOW}  ./data_manager.sh refresh start   # Start refresh service${NC}"
echo -e "${YELLOW}  ./data_manager.sh --help   # Show all commands${NC}"
echo ""
echo -e "${BLUE}🌐 Application will be available at: http://localhost:3000${NC}"
echo -e "${BLUE}🔧 GeoServer available at: http://localhost:8080/geoserver${NC}"
echo -e "${GREEN}✨ Project Nocturna is ready!${NC}"
echo ""

# Check if port 3001 is already in use
if lsof -i :3001 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  Warning: Port 3001 is already in use${NC}"
    echo -e "${YELLOW}  The application may fail to start. Check with: lsof -i :3001${NC}"
fi

echo -e "${BLUE}🔄 Starting development server...${NC}"

# Start the development server with error handling
if ! bun run dev; then
    echo -e "${RED}❌ Failed to start development server.${NC}"
    echo -e "${YELLOW}Possible causes:${NC}"
    echo -e "${YELLOW}  - Port 3001 is in use${NC}"
    echo -e "${YELLOW}  - Insufficient system resources${NC}"
    echo -e "${YELLOW}  - Dependency issues${NC}"
    echo -e "${YELLOW}Try running: pkill -f 'bun.*dev' && bun run dev${NC}"
    exit 1
fi
