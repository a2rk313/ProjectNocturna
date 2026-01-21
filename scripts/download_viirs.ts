import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import 'dotenv/config';

/**
 * VIIRS Data Downloader
 * Downloads VIIRS data from NASA Earthdata system
 */

async function downloadVIIRSData() {
  console.log('🚀 Starting VIIRS data download process...');
  
  // Create necessary directories
  const viirsDir = path.join(process.cwd(), 'data', 'rasters', 'viirs');
  const tempDir = path.join(process.cwd(), 'data', 'temp', 'viirs');
  
  if (!fs.existsSync(viirsDir)) {
    fs.mkdirSync(viirsDir, { recursive: true });
    console.log('📁 Created VIIRS data directory');
  }
  
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
    console.log('📁 Created VIIRS temp directory');
  }
  
  // Check if NASA credentials are available
  const username = process.env.NASA_EARTHDATA_USERNAME;
  const password = process.env.NASA_EARTHDATA_PASSWORD;
  
  if (!username || !password) {
    console.log('⚠️  NASA Earthdata credentials not found in environment');
    console.log('   Set NASA_EARTHDATA_USERNAME and NASA_EARTHDATA_PASSWORD to download real VIIRS data');
    console.log('   Creating placeholder files for development...');
    
    // Create placeholder files
    const placeholderFile = path.join(viirsDir, 'VNP46A2_PLACEHOLDER.tif');
    fs.writeFileSync(placeholderFile, 'PLACEHOLDER FOR VIIRS DATA');
    
    const placeholderMetadata = path.join(viirsDir, 'VNP46A2_PLACEHOLDER.tif.metadata.json');
    fs.writeFileSync(placeholderMetadata, JSON.stringify({
      product: 'VNP46A2',
      year: 2023,
      month: 12,
      date: '2023-12-01',
      satellite: 'Suomi-NPP',
      version: 'v1.1',
      processing_level: 'L3',
      units: 'nW/cm²/sr',
      pixel_size: '500m',
      coordinate_system: 'EPSG:4326',
      source_url: 'N/A - Placeholder',
      download_date: new Date().toISOString(),
      file_size: 0,
      checksum: 'placeholder'
    }, null, 2));
    
    console.log('✅ Created placeholder VIIRS files');
    return;
  }
  
  console.log('🌍 Connecting to NASA Earthdata system...');
  
  try {
    // Use the VIIRS pipeline to download real data
    console.log('📡 Using VIIRS pipeline to download real data...');
    const { VIIRSIngestionPipeline } = await import('./viirs_pipeline');
    const pipeline = new VIIRSIngestionPipeline();
    
    // Download recent data (last 2 years)
    await pipeline.runFullPipeline(
      ['nightly', 'monthly'], 
      [2023, 2024],
      { download: true, process: true, ingest: false } // Just download and process, don't ingest to DB yet
    );
    
    console.log('✅ VIIRS data download completed successfully');
  } catch (error) {
    console.error('❌ Error downloading VIIRS data:', error);
    console.log('   Creating placeholder files as fallback...');
    
    // Create placeholder files as fallback
    const placeholderFile = path.join(viirsDir, 'VNP46A2_PLACEHOLDER.tif');
    if (!fs.existsSync(placeholderFile)) {
      fs.writeFileSync(placeholderFile, 'PLACEHOLDER FOR VIIRS DATA');
    }
    
    const placeholderMetadata = path.join(viirsDir, 'VNP46A2_PLACEHOLDER.tif.metadata.json');
    if (!fs.existsSync(placeholderMetadata)) {
      fs.writeFileSync(placeholderMetadata, JSON.stringify({
        product: 'VNP46A2',
        year: 2023,
        month: 12,
        date: '2023-12-01',
        satellite: 'Suomi-NPP',
        version: 'v1.1',
        processing_level: 'L3',
        units: 'nW/cm²/sr',
        pixel_size: '500m',
        coordinate_system: 'EPSG:4326',
        source_url: 'N/A - Placeholder',
        download_date: new Date().toISOString(),
        file_size: 0,
        checksum: 'placeholder'
      }, null, 2));
    }
    
    console.log('✅ Created fallback placeholder VIIRS files');
  }
}

// Run the download process
downloadVIIRSData().catch(console.error);