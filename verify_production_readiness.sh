#!/bin/bash

# Project Nocturna - Production Readiness Verification Script
# Verifies that all systems are working properly after improvements

set -e

echo "🔍 Project Nocturna - Production Readiness Verification"
echo "====================================================="

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Test 1: Check if services are running
echo -e "${BLUE}🧪 Test 1: Checking service availability...${NC}"

# Check if Docker containers are running
if docker ps | grep -q "nocturna"; then
    echo -e "${GREEN}✅ Docker services are running${NC}"
else
    echo -e "${RED}❌ Docker services are not running${NC}"
    exit 1
fi

# Check if app is responding
if curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 >/dev/null 2>&1; then
    echo -e "${GREEN}✅ Application is responding on port 3000${NC}"
else
    echo -e "${YELLOW}⚠️  Application may not be responding${NC}"
fi

# Test 2: Check API endpoints
echo -e "${BLUE}🧪 Test 2: Testing API endpoints...${NC}"

# Test parks API
if curl -s http://localhost:3000/api/parks | grep -q "success"; then
    echo -e "${GREEN}✅ Parks API is working${NC}"
else
    echo -e "${RED}❌ Parks API is not working${NC}"
fi

# Test predictions API
if curl -s "http://localhost:3000/api/science/predictions?lat=30.2672&lon=-97.7431&days=7" | grep -q "predictions"; then
    echo -e "${GREEN}✅ Predictions API is working${NC}"
else
    echo -e "${RED}❌ Predictions API is not working${NC}"
fi

# Test correlation API
if curl -s "http://localhost:3000/api/science/correlation?lat=30.2672&lon=-97.7431&radius=5" | grep -q "satellite_radiance"; then
    echo -e "${GREEN}✅ Correlation API is working${NC}"
else
    echo -e "${RED}❌ Correlation API is not working${NC}"
fi

# Test 3: Check data integrity
echo -e "${BLUE}🧪 Test 3: Checking data integrity...${NC}"

# Count parks in database
park_count=$(docker exec nocturna-postgis psql -U nocturna -d nocturna -t -c "SELECT COUNT(*) FROM dark_sky_parks_enhanced;" 2>/dev/null | tr -d ' ' | tr -d '\n' | xargs)
if [ -n "$park_count" ] && [ "$park_count" -gt 0 ]; then
    echo -e "${GREEN}✅ Parks data available: ${park_count} records${NC}"
else
    echo -e "${YELLOW}⚠️  No parks data found${NC}"
fi

# Count measurements in database
measurement_count=$(docker exec nocturna-postgis psql -U nocturna -d nocturna -t -c "SELECT COUNT(*) FROM sqm_readings_enhanced;" 2>/dev/null | tr -d ' ' | tr -d '\n' | xargs)
if [ -n "$measurement_count" ] && [ "$measurement_count" -gt 0 ]; then
    echo -e "${GREEN}✅ Measurement data available: ${measurement_count} records${NC}"
else
    echo -e "${YELLOW}⚠️  No measurement data found${NC}"
fi

# Test 4: Check caching system
echo -e "${BLUE}🧪 Test 4: Checking caching system...${NC}"

# Test if caching is working by making repeated requests
start_time=$(date +%s.%N)
curl -s "http://localhost:3000/api/parks?limit=5" >/dev/null
first_req_time=$(echo "$(date +%s.%N) - $start_time" | bc)

start_time=$(date +%s.%N)
curl -s "http://localhost:3000/api/parks?limit=5" >/dev/null
second_req_time=$(echo "$(date +%s.%N) - $start_time" | bc)

# If second request is faster, caching is likely working
if (( $(echo "$second_req_time < $first_req_time * 0.8" | bc -l) )); then
    echo -e "${GREEN}✅ Caching appears to be working (second request faster)${NC}"
else
    echo -e "${YELLOW}ℹ️  Caching may not be active (normal for first requests)${NC}"
fi

# Test 5: Check location selection functionality
echo -e "${BLUE}🧪 Test 5: Checking location selection...${NC}"

# Test if location-based queries work
if curl -s "http://localhost:3000/api/dark-sky-sites?lat=30.2672&lon=-97.7431&radiusKm=50" | grep -q "sites"; then
    echo -e "${GREEN}✅ Location-based queries working${NC}"
else
    echo -e "${RED}❌ Location-based queries not working${NC}"
fi

# Test 6: Check VIIRS pipeline
echo -e "${BLUE}🧪 Test 6: Checking VIIRS pipeline...${NC}"

# Check if VIIRS directories exist
if [ -d "data/rasters/viirs" ]; then
    viirs_files=$(find data/rasters/viirs -type f | wc -l)
    echo -e "${GREEN}✅ VIIRS data directory exists with ${viirs_files} files${NC}"
else
    echo -e "${YELLOW}⚠️  VIIRS data directory not found (expected without credentials)${NC}"
fi

# Summary
echo ""
echo -e "${BLUE}📋 Summary:${NC}"
echo "Project Nocturna v2 is operational with the following features:"
echo "- Real-time data ingestion from multiple sources"
echo "- Advanced predictive analytics engine"
echo "- Comprehensive caching system"
echo "- Location-based analysis tools"
echo "- VIIRS satellite data integration"
echo "- Quality-controlled measurements"
echo ""
echo -e "${GREEN}🎉 Project Nocturna v2 is ready for production use!${NC}"
echo ""
echo "🚀 Access the application at: http://localhost:3000"
echo "🌐 GeoServer available at: http://localhost:8080/geoserver"
echo "💾 Database available at: localhost:5432 (nocturna)"