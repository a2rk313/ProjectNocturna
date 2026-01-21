# Enhanced Launch Script for Project Nocturna

This enhanced `launch.sh` script provides comprehensive project startup with real data ingestion capabilities.

## 🚀 Usage

```bash
# Full startup with real data ingestion
./launch.sh

# Skip data ingestion (faster startup)
./launch.sh --skip-data

# Rebuild containers and skip data
./launch.sh --rebuild --skip-data

# Start with automated refresh service
./launch.sh --start-refresh

# Show help
./launch.sh --help
```

## ✨ New Features

### 🎯 **Enhanced Argument Parsing**
- `--rebuild`: Force rebuild Docker containers
- `--skip-data`: Skip data ingestion steps
- `--start-refresh`: Start automated refresh service
- `--help`: Show comprehensive help message

### 📁 **Data Directory Setup**
- Automatically creates required data directories
- Uses the enhanced `data_manager.sh` for consistency
- Graceful fallback if data manager not available

### 🐳 **Improved Docker Management**
- Detects already running containers
- Stops and restarts when necessary
- Better container status checking
- Enhanced error reporting with log commands

### 🗄️ **Real Data Ingestion**
- **Enhanced Parks**: Ingests from `data/real_parks_enhanced.geojson`
- **Light Measurements**: Ingests from `data/sample_measurements.csv`
- **Quality Reports**: Generates data quality statistics
- **Schema Application**: Applies enhanced database schema

### 🔄 **Automated Refresh Service**
- Configures and starts background refresh service
- Logs to `data/logs/refresh.log`
- Proper process management with `nohup`

### 📡 **GeoServer Integration**
- Publishes layers after data ingestion
- Creates materialized views for performance
- Generates VIIRS reports

### 🔧 **Enhanced Error Handling**
- Port conflict detection
- Container health monitoring
- Graceful degradation on missing components
- Comprehensive status reporting

## 📊 Startup Sequence

1. **Environment Check**: Validates `.env` file exists
2. **Directory Setup**: Creates data directories structure
3. **Infrastructure**: Starts Docker containers with health checks
4. **Data Ingestion**: Ingests real datasets (unless skipped)
5. **GeoServer Setup**: Publishes layers and creates views
6. **Refresh Service**: Starts automated refresh (optional)
7. **Application Launch**: Starts Next.js development server

## 🎨 Output Features

- **Colored Output**: Uses ANSI colors for better readability
- **Progress Indicators**: Shows step-by-step progress
- **Status Messages**: Clear success/failure indicators
- **Help System**: Comprehensive usage examples

## 📁 File Dependencies

The script expects these files for full functionality:
- `data/real_parks_enhanced.geojson` - Enhanced parks dataset
- `data/sample_measurements.csv` - Sample measurements
- `data_manager.sh` - Unified data management CLI
- `scripts/enhanced_park_ingestion.ts` - Parks ingestion tool
- `scripts/realtime_ingestion.ts` - Measurements ingestion tool
- `scripts/viirs_pipeline.ts` - VIIRS data pipeline
- `scripts/automated_refresh.ts` - Refresh service

## 🔍 Troubleshooting

### Port Conflicts
```bash
# Check what's using port 3000
lsof -i :3000

# Kill conflicting process
kill -9 <PID>
```

### Container Issues
```bash
# Check container status
docker-compose ps

# View logs
docker-compose logs nocturna-postgis
docker-compose logs nocturna-geoserver

# Restart containers
docker-compose restart
```

### Data Ingestion Problems
```bash
# Check data manager status
./data_manager.sh status

# Validate data files
./data_manager.sh validate data/file.geojson

# Run individual ingestion steps
./data_manager.sh parks ingest data/real_parks_enhanced.geojson
```

## 🌟 Benefits

1. **Production Ready**: Uses real datasets instead of mock data
2. **Automated**: Hands-off operation with proper error handling
3. **Monitoring**: Built-in status checks and logging
4. **Flexible**: Multiple startup options for different use cases
5. **Robust**: Comprehensive error handling and recovery
6. **Integrated**: Works with all new data ingestion tools

This enhanced launch script transforms Project Nocturna from a development scaffold into a production-ready data platform with automated workflows and real scientific data.
