#!/bin/bash

# Script to load real geographic datasets into PostGIS
# Usage: ./load_datasets.sh [options]

set -e  # Exit on any error

# Default database configuration
DB_HOST=${DB_HOST:-"localhost"}
DB_PORT=${DB_PORT:-"5432"}
DB_USER=${DB_USER:-"postgres"}
DB_PASSWORD=${DB_PASSWORD:-"postgres"}
DB_NAME=${DB_NAME:-"geodb"}

# Connection string for ogr2ogr
CONNECTION_STRING="PG:host=$DB_HOST port=$DB_PORT user=$DB_USER dbname=$DB_NAME password=$DB_PASSWORD"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo_red() { echo -e "${RED}$1${NC}"; }
echo_green() { echo -e "${GREEN}$1${NC}"; }
echo_yellow() { echo -e "${YELLOW}$1${NC}"; }

show_help() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -h, --help                     Show this help message"
    echo "  -f, --file FILE                Load a local file (shapefile, geojson, etc.)"
    echo "  -t, --table TABLE              Table name to load data into"
    echo "  -n, --natural-earth TYPE       Download and load Natural Earth data"
    echo "                                 Valid types: admin_0_countries, rivers_lake_centerlines, etc."
    echo "  -d, --database DB_NAME         Database name (default: $DB_NAME)"
    echo "  -u, --user USER                Database user (default: $DB_USER)"
    echo "  -p, --password PASSWORD        Database password (default: $DB_PASSWORD)"
    echo ""
    echo "Examples:"
    echo "  $0 -f data.shp -t countries"
    echo "  $0 -n admin_0_countries"
    echo "  $0 -f data.geojson -t my_layer -d mydb -u myuser"
}

# Function to load local file
load_local_file() {
    local file_path="$1"
    local table_name="$2"
    
    if [ ! -f "$file_path" ]; then
        echo_red "File does not exist: $file_path"
        exit 1
    fi
    
    echo_green "Loading file: $file_path into table: $table_name"
    
    # Determine file type and use appropriate ogr2ogr options
    case "$file_path" in
        *.shp)
            ogr2ogr -f "PostgreSQL" "$CONNECTION_STRING" \
                -append -progress -nln "$table_name" \
                -lco SPATIAL_INDEX=GIST -lco PRECISION=NO \
                "$file_path"
            ;;
        *.geojson|*.json)
            ogr2ogr -f "PostgreSQL" "$CONNECTION_STRING" \
                -append -progress -nln "$table_name" \
                -lco SPATIAL_INDEX=GIST -lco PRECISION=NO \
                "$file_path"
            ;;
        *.csv)
            ogr2ogr -f "PostgreSQL" "$CONNECTION_STRING" \
                -oo X_POSSIBLE_NAMES=longitude,lon,x \
                -oo Y_POSSIBLE_NAMES=latitude,lat,y \
                -append -progress -nln "$table_name" \
                -lco SPATIAL_INDEX=GIST -lco PRECISION=NO \
                "$file_path"
            ;;
        *)
            echo_red "Unsupported file format: $file_path"
            exit 1
            ;;
    esac
    
    if [ $? -eq 0 ]; then
        echo_green "Successfully loaded $file_path into $table_name"
    else
        echo_red "Failed to load $file_path into $table_name"
        exit 1
    fi
}

# Function to download and load Natural Earth data
load_natural_earth() {
    local category="$1"
    local scale="${2:-110m}"
    local dataset_type="${3:-cultural}"
    
    # Validate inputs
    if [[ ! "$scale" =~ ^(110m|50m|10m)$ ]]; then
        echo_red "Invalid scale. Valid scales: 110m, 50m, 10m"
        exit 1
    fi
    
    if [[ ! "$dataset_type" =~ ^(cultural|physical|raster)$ ]]; then
        echo_red "Invalid dataset type. Valid types: cultural, physical, raster"
        exit 1
    fi
    
    # Define the download URL based on category
    local base_url="https://www.naturalearthdata.com/http//www.naturalearthdata.com/download"
    local url="${base_url}/${scale}/${dataset_type}/ne_${scale}_${category}.zip"
    
    echo_green "Downloading Natural Earth data: $category ($scale) from $url"
    
    # Create temporary directory
    local temp_dir=$(mktemp -d)
    local zip_file="$temp_dir/ne_${scale}_${category}.zip"
    
    # Download the file
    if ! curl -L -o "$zip_file" "$url"; then
        echo_red "Failed to download from $url"
        rm -rf "$temp_dir"
        exit 1
    fi
    
    # Extract the zip file
    if ! unzip -o "$zip_file" -d "$temp_dir"; then
        echo_red "Failed to extract $zip_file"
        rm -rf "$temp_dir"
        exit 1
    fi
    
    # Find the shapefile in extracted content
    local shp_files=("$temp_dir"/*.shp)
    if [ ! -f "${shp_files[0]}" ]; then
        echo_red "No shapefiles found in downloaded archive"
        rm -rf "$temp_dir"
        exit 1
    fi
    
    # Load the shapefile
    local shp_file="${shp_files[0]}"
    local table_name="ne_${scale}_${category//./_}"
    
    echo_green "Loading shapefile: $(basename "$shp_file") into table: $table_name"
    
    ogr2ogr -f "PostgreSQL" "$CONNECTION_STRING" \
        -append -progress -nln "$table_name" \
        -lco SPATIAL_INDEX=GIST -lco PRECISION=NO \
        "$shp_file"
    
    if [ $? -eq 0 ]; then
        echo_green "Successfully loaded Natural Earth data into $table_name"
        
        # Show basic info about the loaded table
        echo_green "Table info:"
        psql "$CONNECTION_STRING" -c "SELECT COUNT(*) as feature_count FROM $table_name;"
    else
        echo_red "Failed to load Natural Earth data"
        rm -rf "$temp_dir"
        exit 1
    fi
    
    # Clean up
    rm -rf "$temp_dir"
}

# Parse command line arguments
FILE_PATH=""
TABLE_NAME=""
NATURAL_EARTH_CATEGORY=""
DATABASE_NAME=""
DB_USER_ARG=""
DB_PASSWORD_ARG=""

while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            show_help
            exit 0
            ;;
        -f|--file)
            FILE_PATH="$2"
            shift 2
            ;;
        -t|--table)
            TABLE_NAME="$2"
            shift 2
            ;;
        -n|--natural-earth)
            NATURAL_EARTH_CATEGORY="$2"
            shift 2
            ;;
        -d|--database)
            DATABASE_NAME="$2"
            shift 2
            ;;
        -u|--user)
            DB_USER_ARG="$2"
            shift 2
            ;;
        -p|--password)
            DB_PASSWORD_ARG="$2"
            shift 2
            ;;
        *)
            echo_red "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
done

# Update database config if provided
if [ -n "$DATABASE_NAME" ]; then
    DB_NAME="$DATABASE_NAME"
fi
if [ -n "$DB_USER_ARG" ]; then
    DB_USER="$DB_USER_ARG"
fi
if [ -n "$DB_PASSWORD_ARG" ]; then
    DB_PASSWORD="$DB_PASSWORD_ARG"
fi

# Validate requirements
if ! command -v ogr2ogr &> /dev/null; then
    echo_red "ogr2ogr is not installed. Please install GDAL tools first."
    echo_yellow "Ubuntu/Debian: sudo apt-get install gdal-bin"
    echo_yellow "macOS: brew install gdal"
    exit 1
fi

if ! command -v psql &> /dev/null; then
    echo_red "psql is not installed. Please install PostgreSQL client tools."
    exit 1
fi

# Check if we can connect to the database
if ! PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1;" > /dev/null 2>&1; then
    echo_red "Cannot connect to database. Please check your database configuration."
    exit 1
fi

echo_green "Database connection successful!"

# Execute based on provided options
if [ -n "$FILE_PATH" ] && [ -n "$TABLE_NAME" ]; then
    load_local_file "$FILE_PATH" "$TABLE_NAME"
elif [ -n "$NATURAL_EARTH_CATEGORY" ]; then
    load_natural_earth "$NATURAL_EARTH_CATEGORY" "110m" "cultural"
else
    echo_yellow "No operation specified. Use -h for help."
    show_help
    exit 1
fi

echo_green "Dataset loading completed successfully!"