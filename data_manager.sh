#!/bin/bash

# Project Nocturna - Data Management CLI
# Comprehensive data ingestion and management tool

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Data directory structure
DATA_DIR="data"
SCRIPTS_DIR="scripts"

show_help() {
    echo -e "${BLUE}Project Nocturna - Data Management CLI${NC}"
    echo ""
    echo "Usage: $0 <command> [options]"
    echo ""
    echo "Commands:"
    echo "  parks <action> [file]     Manage dark sky parks data"
    echo "  measurements <action> [file]  Manage light measurements"
    echo "  viirs <action> [options]    Manage VIIRS satellite data"
    echo "  refresh <action> [options]   Manage automated data refresh"
    echo "  validate <file>           Validate data files"
    echo "  status                    Show system status"
    echo "  setup                     Initialize data directories"
    echo ""
    echo "Actions:"
    echo "  parks: ingest, export, stats, validate"
    echo "  measurements: ingest, validate, report, cleanup"
    echo "  viirs: download, process, ingest, report"
    echo "  refresh: start, stop, status, configure"
    echo ""
    echo "Examples:"
    echo "  $0 parks ingest data/real_parks_enhanced.geojson"
    echo "  $0 measurements ingest data/sample_measurements.csv"
    echo "  $0 viirs download nightly 2023"
    echo "  $0 refresh start"
}

setup_directories() {
    echo -e "${BLUE}Setting up data directories...${NC}"
    
    mkdir -p "$DATA_DIR"/{rasters/viirs,temp,exports,logs}
    mkdir -p "$DATA_DIR"/rasters/viirs/{nightly,monthly,annual}
    
    echo -e "${GREEN}✓ Data directories created${NC}"
}

validate_file() {
    local file="$1"
    local type="$2"
    
    if [ ! -f "$file" ]; then
        echo -e "${RED}Error: File not found: $file${NC}"
        return 1
    fi
    
    case "$type" in
        "geojson")
            if command -v jq >/dev/null 2>&1; then
                if jq empty "$file" >/dev/null 2>&1; then
                    echo -e "${GREEN}✓ Valid GeoJSON file${NC}"
                else
                    echo -e "${RED}✗ Invalid GeoJSON file${NC}"
                    return 1
                fi
            else
                echo -e "${YELLOW}Warning: jq not found, skipping JSON validation${NC}"
            fi
            ;;
        "csv")
            if [ -r "$file" ] && [ -s "$file" ]; then
                local lines=$(wc -l < "$file")
                local headers=$(head -n 1 "$file" | tr ',' '\n' | wc -l)
                echo -e "${GREEN}✓ Valid CSV file ($lines lines, $headers columns)${NC}"
            else
                echo -e "${RED}✗ Invalid CSV file${NC}"
                return 1
            fi
            ;;
    esac
}

manage_parks() {
    local action="$1"
    local file="$2"
    
    case "$action" in
        "ingest")
            echo -e "${BLUE}Ingesting dark sky parks...${NC}"
            if [ -z "$file" ]; then
                file="$DATA_DIR/real_parks_enhanced.geojson"
            fi
            
            validate_file "$file" "geojson" || exit 1
            bun run "$SCRIPTS_DIR/enhanced_park_ingestion.ts" ingest "$file"
            ;;
        "export")
            echo -e "${BLUE}Exporting dark sky parks...${NC}"
            local output="${file:-$DATA_DIR/exports/parks_export.geojson}"
            bun run "$SCRIPTS_DIR/enhanced_park_ingestion.ts" export "$output"
            ;;
        "stats")
            echo -e "${BLUE}Generating parks statistics...${NC}"
            bun run "$SCRIPTS_DIR/enhanced_park_ingestion.ts" stats
            ;;
        "validate")
            echo -e "${BLUE}Validating parks data...${NC}"
            validate_file "$file" "geojson"
            bun run "$SCRIPTS_DIR/enhanced_park_ingestion.ts" validate "$file"
            ;;
        *)
            echo -e "${RED}Unknown parks action: $action${NC}"
            return 1
            ;;
    esac
}

manage_measurements() {
    local action="$1"
    local file="$2"
    
    case "$action" in
        "ingest")
            echo -e "${BLUE}Ingesting light measurements...${NC}"
            if [ -z "$file" ]; then
                file="$DATA_DIR/sample_measurements.csv"
            fi
            
            validate_file "$file" "csv" || exit 1
            bun run "$SCRIPTS_DIR/realtime_ingestion.ts" csv "$file"
            ;;
        "validate")
            echo -e "${BLUE}Validating measurements data...${NC}"
            validate_file "$file" "csv"
            bun run "$SCRIPTS_DIR/realtime_ingestion.ts" validate "$file"
            ;;
        "report")
            echo -e "${BLUE}Generating quality report...${NC}"
            bun run "$SCRIPTS_DIR/realtime_ingestion.ts" report
            ;;
        "cleanup")
            echo -e "${BLUE}Cleaning up old measurements...${NC}"
            bun run "$SCRIPTS_DIR/realtime_ingestion.ts" cleanup
            ;;
        *)
            echo -e "${RED}Unknown measurements action: $action${NC}"
            return 1
            ;;
    esac
}

manage_viirs() {
    local action="$1"
    local product="$2"
    local year="$3"
    
    case "$action" in
        "download")
            echo -e "${BLUE}Downloading VIIRS data...${NC}"
            if [ -z "$product" ] || [ -z "$year" ]; then
                echo -e "${RED}Error: product and year required${NC}"
                return 1
            fi
            bun run "$SCRIPTS_DIR/viirs_pipeline.ts" download "$product" "$year"
            ;;
        "process")
            echo -e "${BLUE}Processing VIIRS data...${NC}"
            bun run "$SCRIPTS_DIR/viirs_pipeline.ts" process
            ;;
        "ingest")
            echo -e "${BLUE}Ingesting VIIRS data...${NC}"
            bun run "$SCRIPTS_DIR/viirs_pipeline.ts" ingest
            ;;
        "pipeline")
            echo -e "${BLUE}Running VIIRS pipeline...${NC}"
            local products="${product:-nightly,monthly}"
            local years="${year:-2023,2024}"
            bun run "$SCRIPTS_DIR/viirs_pipeline.ts" pipeline "$products" "$years"
            ;;
        "report")
            echo -e "${BLUE}Generating VIIRS report...${NC}"
            bun run "$SCRIPTS_DIR/viirs_pipeline.ts" report
            ;;
        *)
            echo -e "${RED}Unknown VIIRS action: $action${NC}"
            return 1
            ;;
    esac
}

manage_refresh() {
    local action="$1"
    local option="$2"
    
    case "$action" in
        "start")
            echo -e "${BLUE}Starting automated refresh service...${NC}"
            bun run "$SCRIPTS_DIR/automated_refresh.ts" start
            ;;
        "stop")
            echo -e "${BLUE}Stopping automated refresh service...${NC}"
            bun run "$SCRIPTS_DIR/automated_refresh.ts" stop
            ;;
        "status")
            echo -e "${BLUE}Refresh service status:${NC}"
            bun run "$SCRIPTS_DIR/automated_refresh.ts" status
            ;;
        "configure")
            echo -e "${BLUE}Configuring refresh service...${NC}"
            if [ -z "$option" ]; then
                echo -e "${YELLOW}Creating default configuration...${NC}"
                cat > "$DATA_DIR/refresh_config.json" << 'EOF'
{
  "enabled": true,
  "interval": {
    "hours": 24,
    "minutes": 0
  },
  "sources": {
    "viirs": true,
    "measurements": true,
    "parks": false
  },
  "notifications": {
    "webhook": "http://localhost:3000/api/webhook/refresh"
  }
}
EOF
            else
                echo -e "${GREEN}✓ Configuration saved to $DATA_DIR/refresh_config.json${NC}"
            fi
            ;;
        *)
            echo -e "${RED}Unknown refresh action: $action${NC}"
            return 1
            ;;
    esac
}

show_status() {
    echo -e "${BLUE}System Status:${NC}"
    echo ""
    
    # Check database connection
    if bun run "$SCRIPTS_DIR/check_schema.ts" >/dev/null 2>&1; then
        echo -e "Database: ${GREEN}Connected${NC}"
    else
        echo -e "Database: ${RED}Disconnected${NC}"
    fi
    
    # Check data directories
    echo -e "Data directories:"
    for dir in "$DATA_DIR"/{rasters,exports,temp,logs}; do
        if [ -d "$dir" ]; then
            echo -e "  $dir: ${GREEN}Exists${NC}"
        else
            echo -e "  $dir: ${RED}Missing${NC}"
        fi
    done
    
    # Check recent files
    echo -e "\nRecent data files:"
    find "$DATA_DIR" -type f -mtime -7 -exec ls -lh {} \; | head -10
    
    # Check refresh service
    if [ -f "$DATA_DIR/refresh_tasks.json" ]; then
        echo -e "\nRefresh service: ${GREEN}Configured${NC}"
        bun run "$SCRIPTS_DIR/automated_refresh.ts" status
    else
        echo -e "\nRefresh service: ${YELLOW}Not configured${NC}"
    fi
}

# Main command router
case "$1" in
    "parks")
        manage_parks "$2" "$3"
        ;;
    "measurements")
        manage_measurements "$2" "$3"
        ;;
    "viirs")
        manage_viirs "$2" "$3" "$4"
        ;;
    "refresh")
        manage_refresh "$2" "$3"
        ;;
    "validate")
        if [ -z "$2" ]; then
            echo -e "${RED}Error: file required for validation${NC}"
            exit 1
        fi
        validate_file "$2" "auto"
        ;;
    "status")
        show_status
        ;;
    "setup")
        setup_directories
        ;;
    "help"|"-h"|"--help")
        show_help
        ;;
    *)
        echo -e "${RED}Unknown command: $1${NC}"
        show_help
        exit 1
        ;;
esac
