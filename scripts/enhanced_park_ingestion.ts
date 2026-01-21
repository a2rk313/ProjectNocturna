import pg from 'pg';
const { Client } = pg;
import fs from 'fs';
import path from 'path';
import { getPostGISPool } from '../lib/database';

type PoolClient = InstanceType<typeof Client>;

interface DarkSkyPark {
  name: string;
  designation: string;
  country: string;
  sqm?: number;
  bortle?: number;
  coordinates: [number, number];
  id?: string;
  url?: string;
  established?: string;
  area?: number;
}

interface ProcessedGeoJSON {
  type: 'FeatureCollection';
  features: Array<{
    type: 'Feature';
    properties: DarkSkyPark;
    geometry: {
      type: 'Point';
      coordinates: [number, number];
    };
  }>;
}

class DataValidator {
  static validatePark(park: any): DarkSkyPark | null {
    if (!park || typeof park !== 'object') return null;

    const required = ['name', 'coordinates'];
    for (const field of required) {
      if (!park[field]) {
        console.warn(`Missing required field: ${field}`);
        return null;
      }
    }

    const coords = park.coordinates;
    if (!Array.isArray(coords) || coords.length !== 2 ||
      typeof coords[0] !== 'number' || typeof coords[1] !== 'number') {
      console.warn(`Invalid coordinates for ${park.name}:`, coords);
      return null;
    }

    // Validate coordinate ranges
    const [lon, lat] = coords;
    if (lon < -180 || lon > 180 || lat < -90 || lat > 90) {
      console.warn(`Coordinates out of range for ${park.name}:`, coords);
      return null;
    }

    return {
      name: park.name,
      designation: park.designation || 'Unknown',
      country: park.country || 'Unknown',
      sqm: park.sqm ? Number(park.sqm) : undefined,
      bortle: park.bortle ? Number(park.bortle) : undefined,
      coordinates: [lon, lat],
      id: park.id,
      url: park.url,
      established: park.established,
      area: park.area
    };
  }

  static validateGeoJSON(data: any): ProcessedGeoJSON | null {
    if (!data || data.type !== 'FeatureCollection') {
      console.error('Invalid GeoJSON: Must be a FeatureCollection');
      return null;
    }

    if (!Array.isArray(data.features)) {
      console.error('Invalid GeoJSON: features must be an array');
      return null;
    }

    const validFeatures = data.features
      .map((feature: any) => {
        if (!feature.geometry || feature.geometry.type !== 'Point') {
          console.warn('Skipping non-point feature');
          return null;
        }

        const park = this.validatePark({
          ...feature.properties,
          coordinates: feature.geometry.coordinates
        });

        if (!park) return null;

        return {
          type: 'Feature',
          properties: park,
          geometry: {
            type: 'Point',
            coordinates: park.coordinates
          }
        };
      })
      .filter(Boolean);

    console.log(`Validated ${validFeatures.length}/${data.features.length} features`);

    return {
      type: 'FeatureCollection',
      features: validFeatures
    };
  }
}

class ParksIngestionEngine {
  private pool: PoolClient;

  constructor() {
    this.pool = getPostGISPool() as PoolClient;
  }

  async createEnhancedSchema(): Promise<void> {
    const schema = `
      CREATE TABLE IF NOT EXISTS public.dark_sky_parks_enhanced (
          id SERIAL PRIMARY KEY,
          external_id TEXT UNIQUE,
          name TEXT NOT NULL,
          designation TEXT,
          country TEXT,
          sqm NUMERIC CHECK (sqm >= 1 AND sqm <= 25),
          bortle INTEGER CHECK (bortle >= 1 AND bortle <= 9),
          area_km2 NUMERIC,
          established DATE,
          url TEXT,
          location GEOMETRY(Point, 4326) NOT NULL,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
      );
      
      CREATE INDEX IF NOT EXISTS idx_dark_sky_parks_enhanced_location 
        ON public.dark_sky_parks_enhanced USING GIST (location);
      CREATE INDEX IF NOT EXISTS idx_dark_sky_parks_enhanced_country 
        ON public.dark_sky_parks_enhanced (country);
      CREATE INDEX IF NOT EXISTS idx_dark_sky_parks_enhanced_designation 
        ON public.dark_sky_parks_enhanced (designation);
    `;

    await this.pool.query(schema);
    console.log('Enhanced dark sky parks schema created');
  }

  async ingestParks(filePath: string, options: {
    clearExisting?: boolean;
    batchSize?: number;
    source?: string;
  } = {}): Promise<void> {
    const { clearExisting = true, batchSize = 100, source = 'unknown' } = options;

    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    console.log(`Starting ingestion from ${path.basename(filePath)}...`);

    const rawData = fs.readFileSync(filePath, 'utf-8');
    const geojson = JSON.parse(rawData);

    const validatedData = DataValidator.validateGeoJSON(geojson);
    if (!validatedData) {
      throw new Error('Invalid GeoJSON data');
    }

    await this.createEnhancedSchema();

    if (clearExisting) {
      console.log('Clearing existing dark sky parks data...');
      await this.pool.query('TRUNCATE public.dark_sky_parks_enhanced;');
    }

    // Batch insert for better performance
    const insertQuery = `
      INSERT INTO public.dark_sky_parks_enhanced 
        (external_id, name, designation, country, sqm, bortle, area_km2, established, url, location)
      VALUES 
        ${validatedData.features.map((_, i) =>
      `($${i * 11 + 1}, $${i * 11 + 2}, $${i * 11 + 3}, $${i * 11 + 4}, $${i * 11 + 5}, $${i * 11 + 6}, $${i * 11 + 7}, $${i * 11 + 8}, $${i * 11 + 9}, ST_SetSRID(ST_MakePoint($${i * 11 + 10}, $${i * 11 + 11}), 4326))`
    ).join(', ')}
      ON CONFLICT (external_id) DO UPDATE SET
        name = EXCLUDED.name,
        designation = EXCLUDED.designation,
        country = EXCLUDED.country,
        sqm = EXCLUDED.sqm,
        bortle = EXCLUDED.bortle,
        area_km2 = EXCLUDED.area_km2,
        established = EXCLUDED.established,
        url = EXCLUDED.url,
        location = EXCLUDED.location,
        updated_at = NOW()
    `;

    let inserted = 0;
    for (let i = 0; i < validatedData.features.length; i += batchSize) {
      const batch = validatedData.features.slice(i, i + batchSize);

      const values = batch.flatMap(feature => {
        const props = feature.properties;
        const [lon, lat] = feature.geometry.coordinates;
        return [
          props.id || `${source}_${i}`,
          props.name,
          props.designation,
          props.country,
          props.sqm,
          props.bortle,
          props.area,
          props.established,
          props.url,
          lon,
          lat
        ];
      });

      try {
        await this.pool.query(insertQuery, values);
        inserted += batch.length;
        console.log(`Batch ${Math.floor(i / batchSize) + 1}: Inserted ${batch.length} parks (total: ${inserted})`);
      } catch (error) {
        console.error(`Error inserting batch ${Math.floor(i / batchSize) + 1}:`, error);
      }
    }

    console.log(`Successfully ingested ${inserted} dark sky parks from ${path.basename(filePath)}`);

    // Generate statistics
    await this.generateIngestionStats();
  }

  async generateIngestionStats(): Promise<void> {
    const statsQuery = `
      SELECT 
        COUNT(*) as total_parks,
        COUNT(DISTINCT country) as countries,
        COUNT(DISTINCT designation) as designations,
        AVG(sqm) as avg_sqm,
        AVG(bortle) as avg_bortle
      FROM public.dark_sky_parks_enhanced
      WHERE sqm IS NOT NULL AND bortle IS NOT NULL
    `;

    const result = await this.pool.query(statsQuery);
    const stats = result.rows[0] as any;

    console.log('\\n=== Ingestion Statistics ===');
    console.log(`Total Parks: ${stats.total_parks}`);
    console.log(`Countries: ${stats.countries}`);
    console.log(`Designations: ${stats.designations}`);
    console.log(`Average SQM: ${stats.avg_sqm ? Number(stats.avg_sqm).toFixed(2) : 'N/A'}`);
    console.log(`Average Bortle: ${stats.avg_bortle ? Number(stats.avg_bortle).toFixed(2) : 'N/A'}`);
    console.log('========================\\n');
  }

  async exportParks(outputPath: string, format: 'geojson' | 'csv' = 'geojson'): Promise<void> {
    const query = `
      SELECT 
        external_id, name, designation, country, sqm, bortle, 
        area_km2, established, url,
        ST_Y(location::geometry) as lat,
        ST_X(location::geometry) as lon
      FROM public.dark_sky_parks_enhanced
      ORDER BY name
    `;

    const result = await this.pool.query(query);

    if (format === 'geojson') {
      const geojson = {
        type: 'FeatureCollection',
        features: result.rows.map((row: any) => ({
          type: 'Feature',
          properties: {
            id: row.external_id,
            name: row.name,
            designation: row.designation,
            country: row.country,
            sqm: row.sqm,
            bortle: row.bortle,
            area_km2: row.area_km2,
            established: row.established,
            url: row.url
          },
          geometry: {
            type: 'Point',
            coordinates: [row.lon, row.lat]
          }
        }))
      };

      fs.writeFileSync(outputPath, JSON.stringify(geojson, null, 2));
    } else if (format === 'csv') {
      const headers = ['id', 'name', 'designation', 'country', 'sqm', 'bortle', 'area_km2', 'established', 'url', 'lat', 'lon'];
      const csvData = [
        headers.join(','),
        ...result.rows.map((row: any) => [
          row.external_id, row.name, row.designation, row.country,
          row.sqm, row.bortle, row.area_km2, row.established, row.url,
          row.lat, row.lon
        ].map(field => `"${field || ''}"`).join(','))
      ].join('\\n');

      fs.writeFileSync(outputPath, csvData);
    }

    console.log(`Exported ${result.rows.length} parks to ${path.basename(outputPath)}`);
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);

  if (args.length < 1) {
    console.log('Usage: bun run scripts/enhanced_park_ingestion.ts <command> [options]');
    console.log('\\nCommands:');
    console.log('  ingest <file>     Ingest parks from GeoJSON file');
    console.log('  export <file>     Export parks to GeoJSON or CSV');
    console.log('  stats              Show ingestion statistics');
    console.log('\\nOptions:');
    console.log('  --format <geojson|csv>  Export format (default: geojson)');
    console.log('  --no-clear            Keep existing data (default: clear)');
    console.log('  --batch-size <n>      Batch size for inserts (default: 100)');
    process.exit(1);
  }

  const command = args[0];
  const engine = new ParksIngestionEngine();

  try {
    switch (command) {
      case 'ingest':
        const filePath = args[1];
        const options = {
          clearExisting: !args.includes('--no-clear'),
          batchSize: parseInt(args.find(arg => arg.startsWith('--batch-size='))?.split('=')[1] || '100'),
          source: 'enhanced_ingestion'
        };
        await engine.ingestParks(filePath, options);
        break;

      case 'export':
        const outputPath = args[1];
        const format = args.find(arg => arg.startsWith('--format='))?.split('=')[1] as 'geojson' | 'csv' || 'geojson';
        await engine.exportParks(outputPath, format);
        break;

      case 'stats':
        await engine.generateIngestionStats();
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

export { ParksIngestionEngine, DataValidator, type DarkSkyPark };
