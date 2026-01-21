import { getPostGISPool } from '../lib/database';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

interface LightMeasurement {
  id?: string;
  station_id: string;
  latitude: number;
  longitude: number;
  mpsas: number;
  cloud_cover: number;
  temperature?: number;
  humidity?: number;
  equipment?: string;
  observer?: string;
  measured_at: Date;
  source: string;
  quality_score?: number;
}

class DataQualityController {
  static validateMeasurement(measurement: any): LightMeasurement | null {
    const required = ['station_id', 'latitude', 'longitude', 'mpsas', 'measured_at'];

    for (const field of required) {
      if (measurement[field] === undefined || measurement[field] === null) {
        console.warn(`Missing required field: ${field}`);
        return null;
      }
    }

    // Validate coordinate ranges
    if (measurement.latitude < -90 || measurement.latitude > 90) {
      console.warn(`Invalid latitude: ${measurement.latitude}`);
      return null;
    }

    if (measurement.longitude < -180 || measurement.longitude > 180) {
      console.warn(`Invalid longitude: ${measurement.longitude}`);
      return null;
    }

    // Validate SQM ranges (typical: 1-25 mag/arcsec²)
    if (measurement.mpsas < 1 || measurement.mpsas > 25) {
      console.warn(`Suspicious SQM value: ${measurement.mpsas}`);
    }

    // Validate cloud cover (0-100%)
    if (measurement.cloud_cover < 0 || measurement.cloud_cover > 100) {
      console.warn(`Invalid cloud cover: ${measurement.cloud_cover}`);
      return null;
    }

    // Validate temperature range if provided (-50°C to 50°C)
    if (measurement.temperature !== undefined && (measurement.temperature < -50 || measurement.temperature > 50)) {
      console.warn(`Suspicious temperature value: ${measurement.temperature}°C`);
    }

    // Validate humidity range if provided (0-100%)
    if (measurement.humidity !== undefined && (measurement.humidity < 0 || measurement.humidity > 100)) {
      console.warn(`Invalid humidity value: ${measurement.humidity}%`);
      return null;
    }

    return {
      id: measurement.id,
      station_id: measurement.station_id,
      latitude: Number(measurement.latitude),
      longitude: Number(measurement.longitude),
      mpsas: Number(measurement.mpsas),
      cloud_cover: Number(measurement.cloud_cover),
      temperature: measurement.temperature !== undefined ? Number(measurement.temperature) : undefined,
      humidity: measurement.humidity !== undefined ? Number(measurement.humidity) : undefined,
      equipment: measurement.equipment,
      observer: measurement.observer,
      measured_at: new Date(measurement.measured_at),
      source: measurement.source || 'unknown'
    };
  }

  /**
   * Performs enhanced quality validation using multiple criteria
   */
  static validateEnhanced(measurement: LightMeasurement): { isValid: boolean; qualityScore: number; issues: string[] } {
    const issues: string[] = [];
    let score = 100;

    // Check for temporal consistency
    const now = new Date();
    const measurementTime = new Date(measurement.measured_at);
    const timeDiff = Math.abs(now.getTime() - measurementTime.getTime());
    const daysDiff = timeDiff / (1000 * 60 * 60 * 24);

    if (daysDiff > 365) {
      issues.push('Measurement older than 1 year');
      score -= 20;
    } else if (daysDiff > 30) {
      issues.push('Measurement older than 1 month');
      score -= 10;
    }

    // Check for spatial consistency with known light pollution patterns
    const expectedMPSAS = this.estimateExpectedMPSAS(measurement.latitude, measurement.longitude);
    const deviation = Math.abs(measurement.mpsas - expectedMPSAS);

    if (deviation > 5) {
      issues.push(`SQM value deviates significantly from expected (${expectedMPSAS.toFixed(2)})`);
      score -= 15;
    } else if (deviation > 3) {
      issues.push(`SQM value moderately deviates from expected (${expectedMPSAS.toFixed(2)})`);
      score -= 5;
    }

    // Check for equipment consistency
    if (!measurement.equipment) {
      issues.push('Equipment information missing');
      score -= 10;
    }

    // Check for observer consistency
    if (!measurement.observer) {
      issues.push('Observer information missing');
      score -= 5;
    }

    // Check for cloud cover impact on measurement
    if (measurement.cloud_cover > 50 && measurement.mpsas > 18) {
      issues.push('High cloud cover but bright sky measurement (possible error)');
      score -= 15;
    }

    // Check for temperature impact on sensor
    if (measurement.temperature !== undefined && (measurement.temperature < -20 || measurement.temperature > 40)) {
      issues.push('Temperature extremes may affect sensor accuracy');
      score -= 10;
    }

    // Check for humidity impact on sensor
    if (measurement.humidity !== undefined && measurement.humidity > 90) {
      issues.push('High humidity may affect sensor accuracy');
      score -= 5;
    }

    // Final validation
    score = Math.max(0, Math.min(100, score));
    const isValid = score >= 50; // Require at least 50% quality score

    return {
      isValid,
      qualityScore: score,
      issues
    };
  }

  /**
   * Estimates expected MPSAS based on location using known light pollution maps
   * This is a simplified estimation - in reality, would use VIIRS data or light pollution atlas
   */
  static estimateExpectedMPSAS(lat: number, lon: number): number {
    // Simplified model based on urban/rural classification
    // In a real implementation, this would query a light pollution model or database
    if (lat > 45 && lat < 55 && lon > -10 && lon < 10) {
      // Roughly European urban areas
      return 16.5; // Urban areas typically have lower SQM values
    } else if (lat > 35 && lat < 45 && lon > -120 && lon < -70) {
      // Roughly US urban areas
      return 17.0;
    } else {
      // Rural/remote areas
      return 20.0; // Darker skies in rural areas
    }
  }

  static calculateQualityScore(measurement: LightMeasurement): number {
    // Use the enhanced validation method
    const result = this.validateEnhanced(measurement);
    return result.qualityScore;
  }
}

class RealTimeDataIngestion {
  public pool = getPostGISPool();

  async createMeasurementSchema(): Promise<void> {
    const schema = `
      CREATE TABLE IF NOT EXISTS public.sqm_readings_enhanced (
          id BIGSERIAL PRIMARY KEY,
          external_id TEXT UNIQUE,
          station_id TEXT NOT NULL,
          mpsas NUMERIC NOT NULL CHECK (mpsas >= 1 AND mpsas <= 25),
          cloud_cover NUMERIC CHECK (cloud_cover >= 0 AND cloud_cover <= 100),
          temperature NUMERIC,
          humidity NUMERIC,
          equipment TEXT,
          observer TEXT,
          source TEXT DEFAULT 'manual',
          quality_score INTEGER CHECK (quality_score >= 0 AND quality_score <= 100),
          location GEOMETRY(Point, 4326) NOT NULL,
          measured_at TIMESTAMPTZ NOT NULL,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
      );
      
      CREATE INDEX IF NOT EXISTS idx_sqm_readings_enhanced_location 
        ON public.sqm_readings_enhanced USING GIST (location);
      CREATE INDEX IF NOT EXISTS idx_sqm_readings_enhanced_time 
        ON public.sqm_readings_enhanced (measured_at);
      CREATE INDEX IF NOT EXISTS idx_sqm_readings_enhanced_station 
        ON public.sqm_readings_enhanced (station_id);
      CREATE INDEX IF NOT EXISTS idx_sqm_readings_enhanced_quality 
        ON public.sqm_readings_enhanced (quality_score);
    `;

    await this.pool.query(schema);
    console.log('Enhanced SQM readings schema created');
  }

  async ingestMeasurements(
    measurements: any[],
    options: {
      source?: string;
      validateOnly?: boolean;
    } = {}
  ): Promise<{ accepted: number; rejected: number }> {
    const { source = 'api', validateOnly = false } = options;

    console.log(`Processing ${measurements.length} measurements from source: ${source}`);

    // Validate measurements with enhanced validation
    const validationResults = measurements.map(m => {
      const basicValidation = DataQualityController.validateMeasurement(m);
      if (!basicValidation) return null;

      const enhancedValidation = DataQualityController.validateEnhanced(basicValidation);
      return {
        measurement: basicValidation,
        isValid: enhancedValidation.isValid,
        qualityScore: enhancedValidation.qualityScore,
        issues: enhancedValidation.issues
      };
    }).filter(Boolean) as Array<{ measurement: LightMeasurement; isValid: boolean; qualityScore: number; issues: string[] }>;

    const validMeasurements = validationResults
      .filter(result => result.isValid)
      .map(result => result.measurement);

    const rejectedCount = validationResults.filter(result => !result.isValid).length;

    console.log(`Valid measurements: ${validMeasurements.length}/${measurements.length} (Rejected: ${rejectedCount})`);

    // Log quality issues for rejected measurements
    if (rejectedCount > 0) {
      const allIssues = validationResults
        .filter(result => !result.isValid)
        .flatMap(result => result.issues);

      console.log(`Quality issues detected:`, allIssues.slice(0, 5)); // Show first 5 issues
    }

    if (validateOnly) {
      return {
        accepted: validMeasurements.length,
        rejected: rejectedCount
      };
    }

    await this.createMeasurementSchema();

    // Calculate quality scores using enhanced validation
    const measurementsWithScore = validMeasurements.map(m => {
      const validation = DataQualityController.validateEnhanced(m);
      return {
        ...m,
        quality_score: validation.qualityScore
      };
    });

    // Simple batch insert
    let inserted = 0;

    for (const measurement of measurementsWithScore) {
      const query = `
        INSERT INTO public.sqm_readings_enhanced
          (external_id, station_id, mpsas, cloud_cover, temperature, humidity,
           equipment, observer, source, quality_score, location, measured_at)
        VALUES
          ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, ST_SetSRID(ST_MakePoint($11, $12), 4326), $13)
        ON CONFLICT (external_id) DO UPDATE SET
          station_id = EXCLUDED.station_id,
          mpsas = EXCLUDED.mpsas,
          cloud_cover = EXCLUDED.cloud_cover,
          temperature = EXCLUDED.temperature,
          humidity = EXCLUDED.humidity,
          equipment = EXCLUDED.equipment,
          observer = EXCLUDED.observer,
          source = EXCLUDED.source,
          quality_score = EXCLUDED.quality_score,
          location = EXCLUDED.location,
          measured_at = EXCLUDED.measured_at,
          updated_at = NOW()
      `;

      try {
        await this.pool.query(query, [
          measurement.id || `${source}_${Date.now()}_${inserted}`,
          measurement.station_id,
          measurement.mpsas,
          measurement.cloud_cover,
          measurement.temperature,
          measurement.humidity,
          measurement.equipment,
          measurement.observer,
          source,
          measurement.quality_score,
          measurement.longitude,
          measurement.latitude,
          measurement.measured_at.toISOString()
        ]);
        inserted++;
      } catch (error) {
        console.error(`Error inserting measurement:`, error);
      }
    }

    return {
      accepted: inserted,
      rejected: measurements.length - validMeasurements.length
    };
  }

  async ingestFromCSV(filePath: string, options: any = {}): Promise<void> {
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    const csvData = fs.readFileSync(filePath, 'utf-8');
    const lines = csvData.split('\n').filter(line => line.trim());

    if (lines.length < 2) {
      throw new Error('CSV file must have header and at least one data row');
    }

    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    const measurements = lines.slice(1).filter(line => line.trim()).map(line => {
      const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
      const obj: any = {};

      headers.forEach((header, index) => {
        obj[header] = values[index] || undefined;
      });

      return obj;
    });

    const result = await this.ingestMeasurements(measurements, { ...options, source: 'csv' });

    console.log('\nCSV Ingestion Summary:');
    console.log(`Accepted: ${result.accepted}`);
    console.log(`Rejected: ${result.rejected}`);
  }

  async ingestFromJSON(filePath: string, options: any = {}): Promise<void> {
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    const rawData = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(rawData);

    const measurements = Array.isArray(data) ? data : data.measurements || [];

    const result = await this.ingestMeasurements(measurements, { ...options, source: 'json' });

    console.log('\nJSON Ingestion Summary:');
    console.log(`Accepted: ${result.accepted}`);
    console.log(`Rejected: ${result.rejected}`);
  }

  async generateQualityReport(): Promise<void> {
    const query = `
      SELECT 
        COUNT(*) as total_readings,
        COUNT(DISTINCT station_id) as stations,
        AVG(mpsas) as avg_mpsas,
        AVG(quality_score) as avg_quality,
        COUNT(CASE WHEN quality_score >= 80 THEN 1 END) as high_quality,
        COUNT(CASE WHEN quality_score < 50 THEN 1 END) as low_quality,
        DATE_TRUNC('day', measured_at) as measurement_day
      FROM public.sqm_readings_enhanced
      WHERE measured_at >= NOW() - INTERVAL '30 days'
      GROUP BY DATE_TRUNC('day', measured_at)
      ORDER BY measurement_day DESC
      LIMIT 30
    `;

    const result = await this.pool.query(query);

    console.log('\n=== 30-Day Quality Report ===');
    console.log('Date       | Total | Stations | Avg SQM | Avg Quality | High Q | Low Q');
    console.log('-----------|-------|----------|----------|-------------|---------|--------');

    result.rows.forEach((row: any) => {
      const date = new Date(row.measurement_day).toISOString().split('T')[0];
      console.log(`${date} | ${row.total_readings.toString().padStart(5)} | ${row.stations.toString().padStart(8)} | ${row.avg_mpsas?.toFixed(2).padStart(8)} | ${row.avg_quality?.toFixed(1).padStart(11)} | ${row.high_quality.toString().padStart(6)} | ${row.low_quality.toString().padStart(5)}`);
    });
    console.log('=============================\n');
  }
}

// CLI interface
async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.length < 1) {
    console.log('Usage: bun run scripts/realtime_ingestion.ts <command> [options]');
    console.log('\nCommands:');
    console.log('  csv <file>         Ingest measurements from CSV file');
    console.log('  json <file>        Ingest measurements from JSON file');
    console.log('  validate <file>     Validate file without ingesting');
    console.log('  report              Generate quality report');
    console.log('  latest <lat> <lon>  Get latest measurements for location');
    console.log('\nOptions:');
    console.log('  --source <name>    Set source identifier');
    process.exit(1);
  }

  const command = args[0];
  const options: any = {};

  // Parse options
  for (let i = 1; i < args.length; i++) {
    if (args[i] === '--source' && i + 1 < args.length) {
      options.source = args[i + 1];
    }
  }

  const ingestion = new RealTimeDataIngestion();

  try {
    switch (command) {
      case 'csv':
        if (args.length < 2) {
          console.error('Error: CSV file path required');
          process.exit(1);
        }
        await ingestion.ingestFromCSV(args[1], options);
        break;

      case 'json':
        if (args.length < 2) {
          console.error('Error: JSON file path required');
          process.exit(1);
        }
        await ingestion.ingestFromJSON(args[1], options);
        break;

      case 'validate':
        if (args.length < 2) {
          console.error('Error: File path required for validation');
          process.exit(1);
        }
        const filePath = args[1];
        if (filePath.endsWith('.csv')) {
          await ingestion.ingestFromCSV(filePath, { ...options, validateOnly: true });
        } else if (filePath.endsWith('.json')) {
          await ingestion.ingestFromJSON(filePath, { ...options, validateOnly: true });
        } else {
          console.error('Error: Unsupported file format for validation');
          process.exit(1);
        }
        break;

      case 'report':
        await ingestion.generateQualityReport();
        break;

      case 'latest':
        if (args.length < 3) {
          console.error('Error: Latitude and longitude required');
          process.exit(1);
        }
        const lat = parseFloat(args[1]);
        const lon = parseFloat(args[2]);
        const radius = args.includes('--radius') ? parseFloat(args[args.indexOf('--radius') + 1]) : 10;
        const limit = args.includes('--limit') ? parseInt(args[args.indexOf('--limit') + 1]) : 50;

        const query = `
          SELECT 
            external_id, station_id, mpsas, cloud_cover, temperature, humidity,
            equipment, observer, source, quality_score,
            ST_Y(location::geometry) as lat,
            ST_X(location::geometry) as lon,
            measured_at
          FROM public.sqm_readings_enhanced
          WHERE ST_DWithin(
            location::geography, 
            ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography, 
            $3 * 1000
          )
          ORDER BY measured_at DESC
          LIMIT $4
        `;

        const result = await ingestion.pool.query(query, [lon, lat, radius, limit]);

        console.log(`\nLatest ${result.rows.length} measurements for ${lat}, ${lon}:`);
        result.rows.forEach((m: any) => {
          console.log(`${m.measured_at}: ${m.mpsas} SQM (Quality: ${m.quality_score})`);
        });
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

export { RealTimeDataIngestion, DataQualityController, type LightMeasurement };
