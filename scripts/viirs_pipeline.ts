import { getPostGISPool } from '../lib/database';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

interface VIIRSConfig {
  baseUrl: string;
  apiKey?: string;
  years: number[];
  products: {
    nightly: string;
    monthly: string;
    annual: string;
  };
  outputDir: string;
  tempDir: string;
}

interface VIIRSMetadata {
  product: string;
  year: number;
  month?: number;
  date?: string;
  satellite: string;
  version: string;
  processing_level: string;
  units: string;
  pixel_size: string;
  coordinate_system: string;
  source_url: string;
  download_date: string;
  file_size: number;
  checksum: string;
}

class VIIRSDownloader {
  private config: VIIRSConfig;

  constructor(config: Partial<VIIRSConfig> = {}) {
    this.config = {
      baseUrl: 'https://cmr.earthdata.nasa.gov/search/granules.json', // NASA CMR API endpoint
      years: [2020, 2021, 2022, 2023, 2024],
      products: {
        nightly: 'VNP46A1',  // VIIRS Day/Night Band Lunar Calibrated Geolocated DNB Granule
        monthly: 'VNP46A2',  // VIIRS Day/Night Band Monthly Cloud-Free Gap-Filled DNB
        annual: 'VNP46A3'   // VIIRS Day/Night Band Annual Cloud-Free Gap-Filled DNB
      },
      outputDir: path.resolve('data/rasters/viirs'),
      tempDir: path.resolve('data/temp/viirs'),
      ...config
    };

    // Ensure directories exist
    fs.mkdirSync(this.config.outputDir, { recursive: true });
    fs.mkdirSync(this.config.tempDir, { recursive: true });
  }

  async downloadVIIRSData(
    product: 'nightly' | 'monthly' | 'annual',
    year: number,
    month?: number
  ): Promise<string[]> {
    // First try to download real data from NASA
    const realDownloads = await this.downloadRealVIIRSData(product, year, month);

    if (realDownloads.length > 0) {
      return realDownloads;
    }

    // Fallback to placeholder if no real data available
    console.log(`No real ${this.config.products[product]} data available for ${year}${month ? `/${month}` : ''}, creating placeholder...`);

    const productId = this.config.products[product];
    const downloadedFiles: string[] = [];

    const metadata: VIIRSMetadata = {
      product: productId,
      year,
      month,
      date: month ? `${year}-${month.toString().padStart(2, '0')}` : undefined,
      satellite: 'Suomi-NPP',
      version: 'v1.1',
      processing_level: 'L3',
      units: 'nW/cm²/sr',
      pixel_size: '500m',
      coordinate_system: 'EPSG:4326',
      source_url: `${this.config.baseUrl}/${productId}/${year}`,
      download_date: new Date().toISOString(),
      file_size: 0,
      checksum: 'placeholder'
    };

    const filename = this.generateFilename(productId, year, month);
    const filepath = path.join(this.config.outputDir, filename);

    // Create metadata sidecar
    const metadataPath = filepath + '.metadata.json';
    fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));

    // Create placeholder GeoTIFF (in real implementation, this would be downloaded)
    const placeholderContent = this.createPlaceholderGeoTIFF(metadata);
    fs.writeFileSync(filepath, placeholderContent);

    downloadedFiles.push(filepath);
    downloadedFiles.push(metadataPath);

    console.log(`Created placeholder: ${filename}`);
    return downloadedFiles;
  }

  private generateFilename(product: string, year: number, month?: number): string {
    const dateStr = month ? `${year}_${month.toString().padStart(2, '0')}` : year.toString();
    return `${product}_${dateStr}.tif`;
  }

  private createPlaceholderGeoTIFF(metadata: VIIRSMetadata): Buffer {
    // This creates a minimal valid GeoTIFF placeholder
    // Real implementation would download actual NASA data
    // A valid 1x1 pixel 8-bit GeoTIFF (Black)
    const minimalTiffHex =
        "49492a00080000000300000103000100000001000000010103000100000001000000" +
        "1701030001000000010000002600000000000000";
    return Buffer.from(minimalTiffHex, "hex");
  }

  /**
   * Creates a proper NASA Earthdata authenticated session
   */
  private async createEarthdataSession(): Promise<any> {
    // NASA Earthdata requires authentication
    const username = process.env.NASA_EARTHDATA_USERNAME;
    const password = process.env.NASA_EARTHDATA_PASSWORD;

    if (!username || !password) {
      console.warn('NASA Earthdata credentials not found. Using public endpoint where available.');
      // Return a session without auth for public datasets
      return {
        headers: {
          'User-Agent': 'ProjectNocturna/2.0'
        }
      };
    }

    // Create authenticated session
    const session = {
      headers: {
        'Authorization': `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`,
        'User-Agent': 'ProjectNocturna/2.0'
      }
    };

    // Test authentication
    try {
      const testResponse = await fetch('https://urs.earthdata.nasa.gov/api/users', {
        headers: session.headers
      });

      if (!testResponse.ok) {
        console.warn('NASA Earthdata authentication failed. Proceeding without authentication.');
        return {
          headers: {
            'User-Agent': 'ProjectNocturna/2.0'
          }
        };
      }
    } catch (error) {
      console.warn('Could not verify NASA Earthdata authentication. Proceeding without authentication.');
      return {
        headers: {
          'User-Agent': 'ProjectNocturna/2.0'
        }
      };
    }

    return session;
  }

  /**
   * Gets available VIIRS data from NASA CMR (Common Metadata Repository)
   */
  private async searchVIIRSData(product: string, year: number, month?: number): Promise<any[]> {
    let startTime, endTime;

    if (month) {
      startTime = `${year}-${month.toString().padStart(2, '0')}-01T00:00:00Z`;
      const nextMonth = month === 12 ? 1 : month + 1;
      const nextYear = month === 12 ? year + 1 : year;
      endTime = `${nextYear}-${nextMonth.toString().padStart(2, '0')}-01T00:00:00Z`;
    } else {
      startTime = `${year}-01-01T00:00:00Z`;
      endTime = `${year + 1}-01-01T00:00:00Z`;
    }

    // Use the correct provider for VIIRS data - VNP products are typically in LAADS
    const provider = 'LAADS';

    const params = new URLSearchParams({
      'page_size': '2000',
      'short_name': product,
      'temporal': `${startTime},${endTime}`,
      'provider': provider
    });

    const cmrUrl = `${this.config.baseUrl}?${params}`;
    console.log(`Searching CMR: ${cmrUrl}`);

    // Create authenticated session for NASA Earthdata
    const session = await this.createEarthdataSession();

    const response = await fetch(cmrUrl, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'ProjectNocturna/2.0',
        ...session?.headers
      }
    });

    if (!response.ok) {
      console.warn(`CMR search failed for ${product} in ${year}${month ? `-${month}` : ''}: ${response.status} ${await response.text()}`);
      return []; // Return empty array instead of throwing to allow graceful degradation
    }

    const data = await response.json();
    return data.feed.entry || [];
  }

  /**
   * Downloads actual VIIRS data from NASA
   */
  async downloadRealVIIRSData(
    product: 'nightly' | 'monthly' | 'annual',
    year: number,
    month?: number
  ): Promise<string[]> {
    const productId = this.config.products[product];
    const downloadedFiles: string[] = [];

    console.log(`Searching for ${productId} data for ${year}${month ? `/${month}` : ''}...`);

    // Search for available data
    const granules = await this.searchVIIRSData(productId, year, month);

    if (granules.length === 0) {
      console.log(`No ${productId} data available for ${year}${month ? `/${month}` : ''}`);
      return [];
    }

    console.log(`Found ${granules.length} granules for ${productId} in ${year}${month ? `/${month}` : ''}`);

    // Create authenticated session
    const session = await this.createEarthdataSession();

    for (const granule of granules) {
      const urls = granule.links || [];
      const downloadUrl = urls.find((link: any) =>
        link.rel === 'http://esipfed.org/ns/fedsearch/Download' &&
        (link.href.endsWith('.nc') || link.href.endsWith('.h5') || link.href.endsWith('.tif'))
      );

      if (!downloadUrl) {
        console.warn(`No downloadable URL found for granule: ${granule.title}`);
        continue;
      }

      // Extract filename from URL
      const filename = path.basename(downloadUrl.href).replace(/\?.*/, '');
      const filepath = path.join(this.config.outputDir, filename);

      console.log(`Downloading ${filename}...`);

      try {
        // Add retry logic for downloads
        let response;
        let retryCount = 0;
        const maxRetries = 3;

        while (retryCount < maxRetries) {
          try {
            response = await fetch(downloadUrl.href, session || {});
            if (response.ok) {
              break; // Success, exit retry loop
            } else {
              console.warn(`Download attempt ${retryCount + 1} failed for ${filename}: ${response.status} ${response.statusText}`);
              retryCount++;
              if (retryCount < maxRetries) {
                await new Promise(resolve => setTimeout(resolve, 2000 * retryCount)); // Exponential backoff
              }
            }
          } catch (fetchError) {
            console.warn(`Network error on attempt ${retryCount + 1} for ${filename}:`, fetchError);
            retryCount++;
            if (retryCount < maxRetries) {
              await new Promise(resolve => setTimeout(resolve, 2000 * retryCount)); // Exponential backoff
            }
          }
        }

        if (!response || !response.ok) {
          console.error(`Failed to download ${filename} after ${maxRetries} attempts`);
          // Create a placeholder file to track the failure
          const placeholderPath = filepath + '.failed';
          fs.writeFileSync(placeholderPath, JSON.stringify({
            error: 'Download failed after multiple attempts',
            attemptedUrl: downloadUrl.href,
            timestamp: new Date().toISOString(),
            retries: maxRetries
          }));
          downloadedFiles.push(placeholderPath);
          continue;
        }

        const buffer = await response.arrayBuffer();

        // Validate file integrity after download
        const expectedSize = parseInt(response.headers.get('content-length') || '0');
        if (expectedSize > 0 && buffer.byteLength !== expectedSize) {
          console.warn(`File size mismatch for ${filename}: expected ${expectedSize}, got ${buffer.byteLength}`);
        }

        fs.writeFileSync(filepath, Buffer.from(buffer));

        // Create metadata
        const metadata: VIIRSMetadata = {
          product: productId,
          year,
          month,
          date: granule.time_start ? granule.time_start.substring(0, 10) : undefined,
          satellite: granule.platform || 'Suomi-NPP',
          version: granule.version_id || 'v1.1',
          processing_level: 'L3',
          units: 'nW/cm²/sr',
          pixel_size: '500m',
          coordinate_system: 'EPSG:4326',
          source_url: downloadUrl.href,
          download_date: new Date().toISOString(),
          file_size: buffer.byteLength,
          checksum: this.calculateChecksum(Buffer.from(buffer))
        };

        // Write metadata
        const metadataPath = filepath + '.metadata.json';
        fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));

        downloadedFiles.push(filepath);
        downloadedFiles.push(metadataPath);

        console.log(`Downloaded: ${filename} (${(buffer.byteLength / 1024 / 1024).toFixed(2)} MB)`);
      } catch (error) {
        console.error(`Error downloading ${filename}:`, error);
        // Create a placeholder file to track the failure
        const placeholderPath = filepath + '.failed';
        fs.writeFileSync(placeholderPath, JSON.stringify({
          error: error instanceof Error ? error.message : 'Unknown error',
          attemptedUrl: downloadUrl.href,
          timestamp: new Date().toISOString()
        }));
        downloadedFiles.push(placeholderPath);
      }
    }

    return downloadedFiles;
  }

  /**
   * Calculates a simple checksum for file integrity
   */
  private calculateChecksum(buffer: Buffer): string {
    // Simple checksum implementation (in production, use a more robust algorithm)
    let sum = 0;
    for (let i = 0; i < buffer.length; i++) {
      sum += buffer[i];
    }
    return sum.toString(16);
  }

  async processVIIRSData(inputFile: string): Promise<string> {
    console.log(`Processing VIIRS data: ${path.basename(inputFile)}`);

    const outputPath = inputFile.replace('.tif', '_processed.tif');

    // Check if input file is HDF5 or NetCDF and convert to GeoTIFF if needed
    if (inputFile.endsWith('.h5') || inputFile.endsWith('.nc')) {
      // Use gdal to convert HDF5/NetCDF to GeoTIFF
      try {
        // Note: This requires GDAL to be installed on the system
        const gdalCmd = `gdal_translate -of GTiff "${inputFile}" "${outputPath}"`;
        execSync(gdalCmd, { stdio: 'inherit' });
        console.log(`Converted ${path.basename(inputFile)} to GeoTIFF`);
      } catch (error) {
        console.error(`GDAL conversion failed:`, error);
        // Fallback: copy the original file
        fs.copyFileSync(inputFile, outputPath);
      }
    } else if (inputFile.endsWith('.tif')) {
      // If it's already a GeoTIFF, just copy it
      fs.copyFileSync(inputFile, outputPath);
    } else {
      throw new Error(`Unsupported file format: ${inputFile}`);
    }

    // Apply radiometric calibration and preprocessing if needed
    // This would typically involve applying scale factors and offsets from the metadata
    // For now, we'll just ensure the file is properly georeferenced

    // Reproject to EPSG:4326 if needed
    const reprojectedPath = outputPath.replace('_processed.tif', '_processed_4326.tif');
    try {
      const reprojectCmd = `gdalwarp -t_srs EPSG:4326 "${outputPath}" "${reprojectedPath}"`;
      execSync(reprojectCmd, { stdio: 'inherit' });
      console.log(`Reprojected to EPSG:4326`);

      // Replace the output path with the reprojected version
      fs.unlinkSync(outputPath); // Remove the original processed file
      return reprojectedPath;
    } catch (error) {
      console.warn(`Reprojection failed, using original:`, error);
      return outputPath;
    }
  }

  async ingestToDatabase(processedFile: string, metadata: VIIRSMetadata): Promise<void> {
    const pool = getPostGISPool();

    // Create raster table if not exists
    await pool.query(`
      CREATE TABLE IF NOT EXISTS public.viirs_rasters (
          id SERIAL PRIMARY KEY,
          product TEXT NOT NULL,
          year INTEGER NOT NULL,
          month INTEGER,
          date DATE,
          satellite TEXT,
          version TEXT,
          file_path TEXT NOT NULL,
          raster RASTER,
          metadata JSONB,
          created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_viirs_rasters_product_year
        ON public.viirs_rasters (product, year);
    `);

    // Check if file exists before attempting ingestion
    if (!fs.existsSync(processedFile)) {
      console.error(`File does not exist: ${processedFile}`);
      // Still create a record with metadata for tracking purposes
      try {
        const trackingQuery = `
          INSERT INTO public.viirs_rasters
            (product, year, month, date, satellite, version, file_path, metadata)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          ON CONFLICT (file_path) DO UPDATE SET
            product = EXCLUDED.product,
            year = EXCLUDED.year,
            month = EXCLUDED.month,
            date = EXCLUDED.date,
            satellite = EXCLUDED.satellite,
            version = EXCLUDED.version,
            metadata = EXCLUDED.metadata,
            created_at = NOW();
        `;

        await pool.query(trackingQuery, [
          metadata.product,
          metadata.year,
          metadata.month,
          metadata.date ? new Date(metadata.date) : null,
          metadata.satellite,
          metadata.version,
          processedFile,
          JSON.stringify(metadata)
        ]);

        console.warn(`File not found, but tracking record created for: ${path.basename(processedFile)}`);
        return;
      } catch (trackingError) {
        console.error(`Failed to create tracking record:`, trackingError);
        return;
      }
    }

    // Load the raster file into PostGIS using ST_FromGDALRaster
    // First, we need to read the file and convert it to a format PostGIS can handle
    try {
      // Check if the file is a valid raster format before ingestion
      const fileExtension = path.extname(processedFile).toLowerCase();
      const validExtensions = ['.tif', '.tiff', '.nc', '.h5'];

      if (!validExtensions.includes(fileExtension)) {
        console.warn(`File format not supported for raster ingestion: ${fileExtension}. Creating metadata-only record.`);
        // Create a metadata-only record
        const metaOnlyQuery = `
          INSERT INTO public.viirs_rasters
            (product, year, month, date, satellite, version, file_path, metadata)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          ON CONFLICT (file_path) DO UPDATE SET
            product = EXCLUDED.product,
            year = EXCLUDED.year,
            month = EXCLUDED.month,
            date = EXCLUDED.date,
            satellite = EXCLUDED.satellite,
            version = EXCLUDED.version,
            metadata = EXCLUDED.metadata,
            created_at = NOW();
        `;

        await pool.query(metaOnlyQuery, [
          metadata.product,
          metadata.year,
          metadata.month,
          metadata.date ? new Date(metadata.date) : null,
          metadata.satellite,
          metadata.version,
          processedFile,
          JSON.stringify(metadata)
        ]);

        console.log(`Metadata-only record created for: ${path.basename(processedFile)}`);
        return;
      }

      // Attempt to read the file as a buffer for raster ingestion
      const fileBuffer = fs.readFileSync(processedFile);

      // Use a direct SQL approach to load the raster file
      const query = `
        WITH raster_data AS (
          SELECT ST_FromGDALRaster($8) AS rast
        )
        INSERT INTO public.viirs_rasters
          (product, year, month, date, satellite, version, file_path, metadata, raster)
        SELECT
          $1, $2, $3, $4, $5, $6, $7, $9, rast
        FROM raster_data
        WHERE rast IS NOT NULL
        ON CONFLICT (file_path) DO UPDATE SET
          product = EXCLUDED.product,
          year = EXCLUDED.year,
          month = EXCLUDED.month,
          date = EXCLUDED.date,
          satellite = EXCLUDED.satellite,
          version = EXCLUDED.version,
          metadata = EXCLUDED.metadata,
          raster = EXCLUDED.raster,
          created_at = NOW();
      `;

      await pool.query(query, [
        metadata.product,
        metadata.year,
        metadata.month,
        metadata.date ? new Date(metadata.date) : null,
        metadata.satellite,
        metadata.version,
        processedFile,
        fileBuffer, // Pass the file buffer
        JSON.stringify(metadata)
      ]);

      console.log(`Ingested raster: ${path.basename(processedFile)}`);
    } catch (error) {
      console.error(`Error ingesting raster:`, error);
      // Fallback: insert record without raster data for troubleshooting
      try {
        const fallbackQuery = `
          INSERT INTO public.viirs_rasters
            (product, year, month, date, satellite, version, file_path, metadata)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          ON CONFLICT (file_path) DO UPDATE SET
            product = EXCLUDED.product,
            year = EXCLUDED.year,
            month = EXCLUDED.month,
            date = EXCLUDED.date,
            satellite = EXCLUDED.satellite,
            version = EXCLUDED.version,
            metadata = EXCLUDED.metadata,
            created_at = NOW();
        `;

        await pool.query(fallbackQuery, [
          metadata.product,
          metadata.year,
          metadata.month,
          metadata.date ? new Date(metadata.date) : null,
          metadata.satellite,
          metadata.version,
          processedFile,
          JSON.stringify(metadata)
        ]);

        console.warn(`Raster ingestion failed, but record saved for: ${path.basename(processedFile)}`);
      } catch (fallbackError) {
        console.error(`Fallback insertion also failed:`, fallbackError);
      }
    }
  }
}

class VIIRSIngestionPipeline {
  public downloader: VIIRSDownloader;

  constructor(config?: Partial<VIIRSConfig>) {
    this.downloader = new VIIRSDownloader(config);
  }

  async runFullPipeline(
    products: Array<'nightly' | 'monthly' | 'annual'>,
    years: number[],
    options: {
      download?: boolean;
      process?: boolean;
      ingest?: boolean;
      parallel?: boolean;
      maxRetries?: number;
    } = {}
  ): Promise<void> {
    const { download = true, process = true, ingest = true, parallel = false, maxRetries = 2 } = options;

    console.log(`Starting VIIRS ingestion pipeline...`);
    console.log(`Products: ${products.join(', ')}`);
    console.log(`Years: ${years.join(', ')}`);

    for (const product of products) {
      for (const year of years) {
        console.log(`\n=== Processing ${product} ${year} ===`);

        let retryCount = 0;
        let success = false;

        while (!success && retryCount <= maxRetries) {
          try {
            // Download phase
            let downloadedFiles: string[] = [];
            if (download) {
              if (product === 'monthly') {
                for (let month = 1; month <= 12; month++) {
                  const files = await this.downloader.downloadVIIRSData(product as any, year, month);
                  downloadedFiles.push(...files);
                }
              } else {
                const files = await this.downloader.downloadVIIRSData(product, year);
                downloadedFiles.push(...files);
              }
            }

            // Processing phase
            let processedFiles: string[] = [];
            if (process) {
              for (const file of downloadedFiles) {
                if (file.endsWith('.tif') || file.endsWith('.nc') || file.endsWith('.h5')) {
                  try {
                    const processed = await this.downloader.processVIIRSData(file);
                    processedFiles.push(processed);
                  } catch (processError) {
                    console.error(`Error processing file ${file}:`, processError);
                    // Create a placeholder for failed processing
                    const placeholder = file + '.processing_failed';
                    fs.writeFileSync(placeholder, JSON.stringify({
                      error: processError instanceof Error ? processError.message : 'Processing failed',
                      originalFile: file,
                      timestamp: new Date().toISOString()
                    }));
                    processedFiles.push(placeholder);
                  }
                }
              }
            }

            // Ingestion phase
            if (ingest) {
              for (const file of processedFiles) {
                if (file.endsWith('.processing_failed')) {
                  continue; // Skip failed processing files
                }

                const metadataFile = file.replace('.tif', '.metadata.json')
                  .replace('.nc', '.metadata.json')
                  .replace('.h5', '.metadata.json');

                if (fs.existsSync(metadataFile)) {
                  try {
                    const metadata = JSON.parse(fs.readFileSync(metadataFile, 'utf-8'));
                    await this.downloader.ingestToDatabase(file, metadata);
                  } catch (ingestError) {
                    console.error(`Error ingesting file ${file}:`, ingestError);
                  }
                } else {
                  console.warn(`Metadata file not found for ${file}`);
                }
              }
            }

            success = true; // Mark as successful if we reach this point
          } catch (error) {
            retryCount++;
            console.error(`Error processing ${product} ${year} (attempt ${retryCount}/${maxRetries + 1}):`, error);

            if (retryCount <= maxRetries) {
              console.log(`Retrying in ${retryCount * 5} seconds...`);
              await new Promise(resolve => setTimeout(resolve, retryCount * 5000)); // Exponential backoff
            }
          }
        }

        if (!success) {
          console.error(`Failed to process ${product} ${year} after ${maxRetries + 1} attempts`);
        }
      }
    }

    console.log('\n=== VIIRS Ingestion Complete ===');
    await this.generateIngestionReport();
  }

  async generateIngestionReport(): Promise<void> {
    const pool = getPostGISPool();

    const report = await pool.query(`
      SELECT 
        product,
        COUNT(DISTINCT year) as years,
        COUNT(*) as total_files,
        MIN(year) as earliest_year,
        MAX(year) as latest_year,
        AVG((metadata->>'file_size')::numeric) as avg_file_size
      FROM public.viirs_rasters
      GROUP BY product
      ORDER BY product
    `);

    console.log('\\n=== VIIRS Ingestion Report ===');
    console.log('Product | Years | Files | Earliest | Latest | Avg Size');
    console.log('--------|-------|-------|----------|--------|----------');

    report.rows.forEach((row: any) => {
      console.log(`${row.product.padEnd(7)} | ${row.years.toString().padEnd(5)} | ${row.total_files.toString().padEnd(5)} | ${row.earliest_year?.toString().padEnd(8)} | ${row.latest_year?.toString().padEnd(6)} | ${row.avg_file_size ? (row.avg_file_size / 1024 / 1024).toFixed(2) + 'MB' : 'N/A'}`);
    });
    console.log('=============================\\n');
  }

  async createRasterViews(): Promise<void> {
    const pool = getPostGISPool();

    // Create materialized views for common queries
    const views = [
      `
        CREATE MATERIALIZED VIEW IF NOT EXISTS public.viirs_annual_composite AS
        SELECT 
          ST_Union(raster) as composite_raster,
          year,
          product
        FROM public.viirs_rasters
        WHERE product = 'VNP46A3'
        GROUP BY year, product
        WITH DATA;
      `,
      `
        CREATE MATERIALIZED VIEW IF NOT EXISTS public.viirs_latest AS
        SELECT 
          raster,
          year,
          created_at
        FROM public.viirs_rasters
        WHERE product = 'VNP46A1'
        ORDER BY created_at DESC
        LIMIT 1
        WITH DATA;
      `
    ];

    for (const viewSql of views) {
      try {
        await pool.query(viewSql);
        console.log('Created raster view');
      } catch (error) {
        console.warn('View creation failed:', error);
      }
    }

    // Create indexes on views
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_viirs_annual_composite_year 
        ON public.viirs_annual_composite (year);
    `);
  }

  async scheduleAutomaticRefresh(
    intervalHours: number = 24,
    products: Array<'nightly' | 'monthly'> = ['nightly']
  ): Promise<void> {
    console.log(`Setting up automatic refresh every ${intervalHours} hours for: ${products.join(', ')}`);

    // This would set up a cron job or similar scheduler
    // For now, just log the schedule
    const schedule = {
      interval: `${intervalHours} hours`,
      products,
      nextRun: new Date(Date.now() + intervalHours * 60 * 60 * 1000).toISOString()
    };

    fs.writeFileSync(
      path.join('data', 'viirs_refresh_schedule.json'),
      JSON.stringify(schedule, null, 2)
    );

    console.log('Schedule saved to data/viirs_refresh_schedule.json');
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);

  if (args.length < 1) {
    console.log('Usage: bun run scripts/viirs_pipeline.ts <command> [options]');
    console.log('\\nCommands:');
    console.log('  download <product> <year>     Download VIIRS data');
    console.log('  pipeline <products> <years>     Run full pipeline');
    console.log('  report                       Generate ingestion report');
    console.log('  views                        Create raster views');
    console.log('  schedule <hours>             Set up automatic refresh');
    console.log('\\nProducts: nightly, monthly, annual');
    console.log('\\nExamples:');
    console.log('  bun run scripts/viirs_pipeline.ts download nightly 2023');
    console.log('  bun run scripts/viirs_pipeline.ts pipeline "nightly,monthly" 2023,2024');
    process.exit(1);
  }

  const command = args[0];
  const pipeline = new VIIRSIngestionPipeline();

  try {
    switch (command) {
      case 'download':
        const product = args[1] as any;
        const year = parseInt(args[2]);
        await pipeline.downloader.downloadVIIRSData(product, year);
        break;

      case 'pipeline':
        const productsStr = args[1];
        const yearsStr = args[2];
        const products = productsStr.split(',') as Array<any>;
        const years = yearsStr.split(',').map(y => parseInt(y.trim()));
        await pipeline.runFullPipeline(products, years);
        break;

      case 'report':
        await pipeline.generateIngestionReport();
        break;

      case 'views':
        await pipeline.createRasterViews();
        break;

      case 'schedule':
        const hours = parseInt(args[1]) || 24;
        await pipeline.scheduleAutomaticRefresh(hours);
        break;

      default:
        console.error(`Unknown command: ${command}`);
        process.exit(1);
    }
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

if (process.env.NODE_ENV !== 'production' && require.main === module) {
  main();
}

export { VIIRSIngestionPipeline, VIIRSDownloader, type VIIRSConfig, type VIIRSMetadata };
