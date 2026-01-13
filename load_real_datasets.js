const { exec } = require('child_process');
const fs = require('fs').promises;
const path = require('path');

/**
 * Utility functions to load real datasets into PostGIS
 * This script provides methods to download and import various geographic datasets
 */

class DatasetLoader {
  constructor(dbConfig) {
    this.dbConfig = dbConfig;
    // Connection string for ogr2ogr
    this.connectionString = `PG:"host=${dbConfig.host} port=${dbConfig.port} user=${dbConfig.user} dbname=${dbConfig.database} password=${dbConfig.password}"`;
  }

  /**
   * Load shapefile into PostGIS
   */
  async loadShapefile(shapefilePath, tableName) {
    const command = `ogr2ogr -f "PostgreSQL" ${this.connectionString} -append -progress -nln ${tableName} -lco SPATIAL_INDEX=GIST -lco PRECISION=NO "${shapefilePath}"`;
    
    console.log(`Loading shapefile: ${shapefilePath} into table: ${tableName}`);
    
    return new Promise((resolve, reject) => {
      exec(command, (error, stdout, stderr) => {
        if (error) {
          console.error(`Error loading shapefile: ${error.message}`);
          reject(error);
          return;
        }
        
        if (stderr) {
          console.warn(`Warning: ${stderr}`);
        }
        
        console.log(`Successfully loaded ${shapefilePath} into ${tableName}`);
        resolve(stdout);
      });
    });
  }

  /**
   * Load GeoJSON into PostGIS
   */
  async loadGeoJSON(geojsonPath, tableName) {
    const command = `ogr2ogr -f "PostgreSQL" ${this.connectionString} -append -progress -nln ${tableName} -lco SPATIAL_INDEX=GIST -lco PRECISION=NO "${geojsonPath}"`;
    
    console.log(`Loading GeoJSON: ${geojsonPath} into table: ${tableName}`);
    
    return new Promise((resolve, reject) => {
      exec(command, (error, stdout, stderr) => {
        if (error) {
          console.error(`Error loading GeoJSON: ${error.message}`);
          reject(error);
          return;
        }
        
        if (stderr) {
          console.warn(`Warning: ${stderr}`);
        }
        
        console.log(`Successfully loaded ${geojsonPath} into ${tableName}`);
        resolve(stdout);
      });
    });
  }

  /**
   * Download Natural Earth dataset and load into PostGIS
   */
  async downloadAndLoadNaturalEarth(datasetType = 'cultural', scale = '110m', category = 'admin_0_countries') {
    // Validate inputs
    const validTypes = ['cultural', 'physical', 'raster'];
    const validScales = ['110m', '50m', '10m'];
    
    if (!validTypes.includes(datasetType)) {
      throw new Error(`Invalid dataset type. Valid types: ${validTypes.join(', ')}`);
    }
    
    if (!validScales.includes(scale)) {
      throw new Error(`Invalid scale. Valid scales: ${validScales.join(', ')}`);
    }

    // Construct download URL
    const baseUrl = 'https://www.naturalearthdata.com/http//www.naturalearthdata.com/download';
    const url = `${baseUrl}/${scale}/${datasetType}/ne_${scale}_${category}.zip`;
    
    console.log(`Downloading Natural Earth data from: ${url}`);
    
    // Create temporary directory
    const tempDir = path.join(__dirname, 'temp_naturalearth');
    await fs.mkdir(tempDir, { recursive: true });
    
    try {
      // Download the file
      const zipPath = path.join(tempDir, `ne_${scale}_${category}.zip`);
      
      // Using curl to download
      const downloadCmd = `curl -L -o "${zipPath}" "${url}"`;
      await this.executeCommand(downloadCmd);
      
      // Extract the zip file
      const extractCmd = `unzip -o "${zipPath}" -d "${tempDir}"`;
      await this.executeCommand(extractCmd);
      
      // Find the shapefile in extracted content
      const shpFiles = await this.findShapefilesInDir(tempDir);
      if (shpFiles.length === 0) {
        throw new Error('No shapefiles found in downloaded archive');
      }
      
      // Load the first shapefile found
      const shpFile = shpFiles[0];
      const tableName = `ne_${scale}_${category}`.replace(/\./g, '_').toLowerCase();
      
      await this.loadShapefile(shpFile, tableName);
      
      // Clean up temporary files
      await this.executeCommand(`rm -rf "${tempDir}"`);
      
      return tableName;
    } catch (error) {
      // Clean up on error
      await this.executeCommand(`rm -rf "${tempDir}"`);
      throw error;
    }
  }

  /**
   * Execute a command and return a promise
   */
  executeCommand(command) {
    return new Promise((resolve, reject) => {
      exec(command, (error, stdout, stderr) => {
        if (error) {
          reject(error);
          return;
        }
        
        if (stderr) {
          console.warn(stderr);
        }
        
        resolve(stdout);
      });
    });
  }

  /**
   * Find all shapefiles in a directory
   */
  async findShapefilesInDir(dir) {
    const files = await fs.readdir(dir);
    const shpFiles = [];
    
    for (const file of files) {
      if (file.toLowerCase().endsWith('.shp')) {
        shpFiles.push(path.join(dir, file));
      }
    }
    
    return shpFiles;
  }

  /**
   * List tables in PostGIS database
   */
  async listTables() {
    const command = `psql ${this.connectionString} -t -c "SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE';"`;
    
    return new Promise((resolve, reject) => {
      exec(command, (error, stdout, stderr) => {
        if (error) {
          console.error(`Error listing tables: ${error.message}`);
          reject(error);
          return;
        }
        
        if (stderr) {
          console.warn(`Warning: ${stderr}`);
        }
        
        // Parse the output to get table names
        const tables = stdout
          .split('\n')
          .map(line => line.trim())
          .filter(line => line.length > 0);
        
        resolve(tables);
      });
    });
  }

  /**
   * Get information about a specific table
   */
  async getTableInfo(tableName) {
    const commands = {
      count: `psql ${this.connectionString} -t -c "SELECT COUNT(*) FROM ${tableName};"`,
      extent: `psql ${this.connectionString} -t -c "SELECT ST_AsText(ST_Extent(geom)) FROM (SELECT wkb_geometry AS geom FROM ${tableName} UNION SELECT geometry AS geom FROM ${tableName}) AS t;"`,
      srid: `psql ${this.connectionString} -t -c "SELECT ST_SRID(wkb_geometry) FROM ${tableName} LIMIT 1;"`
    };

    try {
      const [countResult, extentResult, sridResult] = await Promise.all([
        this.executeCommand(commands.count),
        this.executeCommand(commands.extent),
        this.executeCommand(commands.srid)
      ]);

      return {
        tableName,
        featureCount: parseInt(countResult.trim()),
        extent: extentResult.trim(),
        srid: parseInt(sridResult.trim()) || 'Unknown'
      };
    } catch (error) {
      console.error(`Error getting table info: ${error.message}`);
      throw error;
    }
  }
}

// Example usage
async function exampleUsage() {
  // Database configuration - update these values for your setup
  const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || '5432',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'geodb'
  };

  const loader = new DatasetLoader(dbConfig);

  try {
    // Example 1: Download and load Natural Earth countries dataset
    console.log('Loading Natural Earth countries dataset...');
    const tableName = await loader.downloadAndLoadNaturalEarth(
      'cultural',    // dataset type
      '110m',        // scale (110m, 50m, 10m)
      'admin_0_countries'  // category
    );
    
    console.log(`Loaded data into table: ${tableName}`);
    
    // Get information about the loaded table
    const tableInfo = await loader.getTableInfo(tableName);
    console.log('Table info:', tableInfo);
    
    // Example 2: List all tables in the database
    console.log('All tables in database:');
    const allTables = await loader.listTables();
    console.log(allTables);
    
  } catch (error) {
    console.error('Error in example usage:', error.message);
  }
}

module.exports = DatasetLoader;

// Run example if this file is executed directly
if (require.main === module) {
  exampleUsage();
}