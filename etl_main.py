from dotenv import load_dotenv
load_dotenv()

import earthaccess
import os
import json
import numpy as np
import sys
import psycopg2
from osgeo import gdal

# ==========================================
# 🔧 CONFIGURATION
# ==========================================

# 1. GLOBAL TARGETS: The script will analyze these cities one by one
TARGET_CITIES = [
    {"name": "Lahore", "bbox": (73.5, 31.0, 75.0, 32.0)},
    {"name": "New York", "bbox": (-74.3, 40.5, -73.5, 41.0)},
    {"name": "London", "bbox": (-0.5, 51.3, 0.3, 51.7)},
    {"name": "Tokyo", "bbox": (139.3, 35.5, 140.0, 35.9)}
]

OUTPUT_DIR = "./geoserver_data/data_layers"
DB_URL = os.getenv("DATABASE_URL")

if not os.path.exists(OUTPUT_DIR):
    os.makedirs(OUTPUT_DIR)

# ==========================================
# 1. DOWNLOAD REAL SATELLITE DATA
# ==========================================
def download_real_viirs(city):
    print(f"\n🛰️ [1/3] Downloading NASA Black Marble for {city['name']}...")
    
    auth = earthaccess.login(strategy="environment")
    if not auth.authenticated:
        auth = earthaccess.login(strategy="interactive")
        if not auth.authenticated:
            print("❌ Authentication Failed.")
            sys.exit(1)

    # Compare Jan 2022 vs Jan 2023 for Trends
    dates = ["2022-01-15", "2023-01-15"]
    final_paths = []

    for date in dates:
        print(f"   🔍 Querying {date}...")
        results = earthaccess.search_data(
            short_name="VNP46A2",
            bounding_box=city['bbox'],
            temporal=(date, date),
            count=1
        )
        
        if not results:
            print(f"      ⚠️ No data for {date}")
            continue

        try:
            downloaded = earthaccess.download(results, OUTPUT_DIR)
            if downloaded:
                path = str(downloaded[0])
                if os.path.getsize(path) < 1000:
                    print(f"      ❌ Corrupt file: {path}")
                    continue
                final_paths.append(path)
        except Exception as e:
            print(f"      ❌ Download Error: {e}")

    return final_paths

# ==========================================
# 2. REAL PIXEL ANALYSIS (GDAL)
# ==========================================
def analyze_change(files):
    print("\n📉 [2/3] Analyzing Change...")
    if len(files) < 2: return None, None, None

    layer_name = "Gap_Filled_DNB_BRDF-Corrected_NTL"
    
    try:
        # Open 2022 (Baseline)
        ds_old = gdal.Open(files[0])
        sub_old = [x[0] for x in ds_old.GetSubDatasets() if layer_name in x[0]][0]
        data_old = gdal.Open(sub_old).ReadAsArray()

        # Open 2023 (Current)
        ds_new = gdal.Open(files[1])
        sub_new = [x[0] for x in ds_new.GetSubDatasets() if layer_name in x[0]][0]
        data_new = gdal.Open(sub_new).ReadAsArray()

        # Calculate Growth (2023 - 2022)
        diff = data_new.astype(float) - data_old.astype(float)
        
        # Threshold: Only show pixels where light increased by > 5 units
        hotspot_indices = np.where(diff > 5)
        
        gt = gdal.Open(sub_new).GetGeoTransform()
        
        print(f"   ✅ Found {len(hotspot_indices[0])} growth hotspots.")
        return hotspot_indices, gt, diff

    except Exception as e:
        print(f"   ❌ GDAL Error: {e}")
        return None, None, None

# ==========================================
# 3. EXPORT RESULTS TO CLOUD (Supabase)
# ==========================================
def export_to_cloud(city_name, indices, gt, diff_data):
    print(f"\n☁️ [3/3] Uploading {city_name} data to Supabase...")
    
    if not DB_URL:
        print("   ⚠️ Skipping Upload: DATABASE_URL not set.")
        return

    try:
        conn = psycopg2.connect(DB_URL)
        cursor = conn.cursor()
        
        # Optional: Clean old data for this city to prevent duplicates
        # cursor.execute("DELETE FROM analysis_grid WHERE cell_id LIKE %s", (f"{city_name}%",))
        
        count = 0
        limit = 500  # Cap per city to keep database light
        
        for i in range(len(indices[0])):
            if count >= limit: break
            
            y, x = indices[0][i], indices[1][i]
            val = float(diff_data[y, x])
            
            # Pixel to Lat/Lon
            lon = gt[0] + x * gt[1] + y * gt[2]
            lat = gt[3] + x * gt[4] + y * gt[5]
            
            # Create Polygon WKT
            poly = f"POLYGON(({lon} {lat}, {lon+0.01} {lat}, {lon+0.01} {lat-0.01}, {lon} {lat-0.01}, {lon} {lat}))"
            
            cursor.execute("""
                INSERT INTO analysis_grid (cell_id, mean_radiance_2024, trend_slope, risk_level, geom)
                VALUES (%s, %s, %s, 'Critical', ST_GeomFromText(%s, 4326))
            """, (f"{city_name}_{count}", val, val, poly))
            
            count += 1
            
        conn.commit()
        conn.close()
        print(f"   ✅ Success! Uploaded {count} hotspots for {city_name}.")

    except Exception as e:
        print(f"   ❌ Database Upload Failed: {e}")

# ==========================================
# MAIN LOOP
# ==========================================
if __name__ == "__main__":
    print("🚀 STARTING GLOBAL MONITORING PIPELINE")
    
    for city in TARGET_CITIES:
        try:
            # Step 1: Download
            files = download_real_viirs(city)
            
            # Step 2: Analyze
            if len(files) >= 2:
                indices, gt, diff = analyze_change(files)
                
                # Step 3: Upload
                if indices is not None:
                    export_to_cloud(city['name'], indices, gt, diff)
            else:
                print(f"   ⚠️ Skipping {city['name']} (Insufficient data)")
                
        except Exception as e:
            print(f"   ❌ Critical Error processing {city['name']}: {e}")

    print("\n✅ Global Cycle Complete.")