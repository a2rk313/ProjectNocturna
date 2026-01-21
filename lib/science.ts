import { getPostGISPool } from './database';
import { PredictiveEngine } from './predictive';
import cacheManager from './cache';

// Types corresponding to our new schema
export interface ViirsStats {
    year: number;
    mean_radiance: number;
    max_radiance: number;
    lit_pixels_pct: number;
}

export interface ImpactAssessment {
    impactLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    affectedSpecies: string[];
    threats: string[];
    nearbyHotspots: { name: string; distance_km: number }[];
}

export class ScienceEngine {

    /**
     * Correlates satellite VIIRS data with ground-based SQM readings
     * to check for discrepancies (e.g., satellite blind spots or calibration issues).
     */
    static async correlateSatelliteAndGround(lat: number, lon: number, radiusKm: number = 5) {
        const pool = getPostGISPool();

        // 1. Get average SQM within radius
        const sqmQuery = `
            SELECT AVG(mpsas) as avg_mpsas, MIN(mpsas) as worst_mpsas, COUNT(*) as count
            FROM sqm_readings_enhanced
            WHERE ST_DWithin(location, ST_SetSRID(ST_Point($1, $2), 4326)::geography, $3)
        `;

        // 2. Get VIIRS current radiance (with caching)
        const viirsVal = await this.getLatestViirsPixel(lat, lon);
        const estimatedMpsas = this.radianceToMpsas(viirsVal);

        // Use cache for SQM query results
        const cacheKey = `sqm_stats:${lat.toFixed(4)}:${lon.toFixed(4)}:${radiusKm}`;
        const cachedSqmStats = await cacheManager.get<any>(cacheKey);

        let sqmStats;
        try {
            if (cachedSqmStats) {
                sqmStats = cachedSqmStats;
            } else {
                const sqmRes = await pool.query(sqmQuery, [lon, lat, radiusKm * 1000]);
                sqmStats = sqmRes.rows[0];
                // Cache for 30 minutes
                await cacheManager.set(cacheKey, sqmStats, 1800);
            }
        } catch (e) {
            console.warn('DB Query failed, using mock data for SQM stats');
            // Mock fallback
            sqmStats = { avg_mpsas: 20.5, count: 5 };
        }

        const groundMpsas = parseFloat(sqmStats?.avg_mpsas || 0);

        return {
            lat, lon,
            satellite_radiance_nw: viirsVal.toFixed(3),
            estimated_mpsas_from_satellite: estimatedMpsas.toFixed(2),
            ground_avg_mpsas: groundMpsas > 0 ? groundMpsas.toFixed(2) : 'N/A',
            ground_sample_count: parseInt(sqmStats?.count || 0),
            correlation_status: this.assessCorrelation(viirsVal, groundMpsas)
        };
    }

    /**
     * Converts VIIRS radiance (nW/cm2/sr) to ground-level Sky Quality (MPSAS).
     * This is a statistical approximation for night-sky brightness.
     */
    static radianceToMpsas(radiance: number): number {
        if (radiance <= 0) return 22.0; // Perfect dark sky reference

        // Empirical formula: MPSAS = 22 - 2.5 * log10(radiance) if units were different,
        // for VIIRS nW units we use a tuned logarithmic scaling.
        const logRad = Math.log10(radiance + 0.01);
        const mpsas = 21.5 - 1.5 * logRad;

        return Math.max(16.0, Math.min(22.0, mpsas));
    }

    /**
     * Assesses ecological impact by intersecting a point with biodiversity hotspots.
     */
    static async assessEcologicalImpact(lat: number, lon: number): Promise<ImpactAssessment> {
        // Create cache key for this location
        const cacheKey = `eco_impact:${lat.toFixed(4)}:${lon.toFixed(4)}`;

        // Try to get from cache first
        const cachedResult = await cacheManager.get<ImpactAssessment>(cacheKey);
        if (cachedResult) {
            return cachedResult;
        }

        const pool = getPostGISPool();
        let rows = [];

        try {
            // Find hotspots within 10km
            const query = `
                SELECT name, species_list, threat_level,
                    ST_Distance(geom::geography, ST_SetSRID(ST_Point($1, $2), 4326)::geography) / 1000.0 as dist_km
                FROM biodiversity_hotspots
                WHERE ST_DWithin(geom::geography, ST_SetSRID(ST_Point($1, $2), 4326)::geography, 10000)
                ORDER BY dist_km ASC
            `;

            const res = await pool.query(query, [lon, lat]);
            rows = res.rows;
        } catch (e) {
             console.warn('DB Query failed, using mock data for Biodiversity');
             // Mock fallback
             rows = [
                 { name: 'Simulated Wetland', species_list: ['Fireflies', 'Bats'], threat_level: 'Vulnerable', dist_km: 2.5 }
             ];
        }

        let impactLevel: ImpactAssessment['impactLevel'] = 'LOW';
        const affectedSpecies: string[] = [];
        const threats: string[] = [];
        const nearbyHotspots: { name: string; distance_km: number }[] = [];

        for (const row of rows) {
            nearbyHotspots.push({ name: row.name, distance_km: row.dist_km });
            if (row.species_list) affectedSpecies.push(...row.species_list);

            // Logic: Closer + Higher Threat = Higher Impact
            if (row.dist_km < 1 && (row.threat_level === 'Critically Endangered')) {
                impactLevel = 'CRITICAL';
                threats.push(`Critical habitat for ${row.name} within 1km`);
            } else if (row.dist_km < 5 && impactLevel !== 'CRITICAL') {
                impactLevel = 'HIGH';
                threats.push(`Proximity to ${row.name}`);
            }
        }

        // Deduplicate species
        const uniqueSpecies = Array.from(new Set(affectedSpecies));

        const result = { impactLevel, affectedSpecies: uniqueSpecies, threats, nearbyHotspots };

        // Cache for 2 hours
        await cacheManager.set(cacheKey, result, 7200);

        return result;
    }

    /**
     * Detects if current brightness is anomalously high compared to historical mean
     */
    static async detectAnomalies(lat: number, lon: number) {
        // Create cache key for this location
        const cacheKey = `anomaly:${lat.toFixed(4)}:${lon.toFixed(4)}`;

        // Try to get from cache first
        const cachedResult = await cacheManager.get<any>(cacheKey);
        if (cachedResult) {
            return cachedResult;
        }

        const pool = getPostGISPool();

        // 1. Get current radiance
        const currentRad = await this.getLatestViirsPixel(lat, lon);

        // 2. Get historical stats (Z-score calculation)
        const statsQuery = `
            SELECT mean_radiance
            FROM viirs_annual_stats
            WHERE ST_Contains(region_geom, ST_SetSRID(ST_Point($1, $2), 4326))
            LIMIT 10
        `;

        // Use cache for historical stats
        const statsCacheKey = `hist_stats:${lat.toFixed(4)}:${lon.toFixed(4)}`;
        let historicalVals: number[] = [];
        const cachedStats = await cacheManager.get<number[]>(statsCacheKey);

        if (cachedStats) {
            historicalVals = cachedStats;
        } else {
            try {
                const statsRes = await pool.query(statsQuery, [lon, lat]);
                historicalVals = statsRes.rows.map((r: { mean_radiance: number | null }) => r.mean_radiance).filter((v: number | null) => v !== null) as number[];
                // Cache for 6 hours
                await cacheManager.set(statsCacheKey, historicalVals, 21600);
            } catch (e) {
                console.warn('DB Query failed, using mock history');
                historicalVals = [10, 11, 10.5, 12, 11, 15]; // Simulated with jump
            }
        }

        let isAnomaly = false;
        let zScore = 0;
        let cause = 'Normal';

        if (historicalVals.length >= 3) {
            const mean = historicalVals.reduce((a: number, b: number) => a + b, 0) / historicalVals.length;
            const sqDiffs = historicalVals.map((v: number) => Math.pow(v - mean, 2));
            const stdDev = Math.sqrt(sqDiffs.reduce((a: number, b: number) => a + b, 0) / historicalVals.length);

            if (stdDev > 0) {
                zScore = (currentRad - mean) / stdDev;
                if (zScore > 2.0) {
                    isAnomaly = true;
                    cause = 'Significant Brightness Increase';
                }
            }
        }

        // 3. Check for specific known causes (Fires)
        const fireQuery = `
            SELECT satellite, confidence
            FROM fire_points
            WHERE ST_DWithin(location::geography, ST_SetSRID(ST_Point($1, $2), 4326)::geography, 2000)
            AND acquired_at > NOW() - INTERVAL '48 hours'
        `;

        // Use cache for fire data (since it changes frequently, cache for only 15 minutes)
        const fireCacheKey = `fire_check:${lat.toFixed(4)}:${lon.toFixed(4)}`;
        const cachedFireData = await cacheManager.get<any[]>(fireCacheKey);

        let fireRes: any;
        try {
            if (cachedFireData) {
                fireRes = { rows: cachedFireData };
            } else {
                fireRes = await pool.query(fireQuery, [lon, lat]);
                // Cache for 15 minutes
                await cacheManager.set(fireCacheKey, fireRes.rows, 900);
            }
        } catch (e) {
            console.warn('DB Query failed, using mock data for Fires');
            fireRes = { rows: [] };
        }

        const activeFire = fireRes.rows.length > 0;

        if (activeFire && isAnomaly) {
            cause = 'Active Fire Detected';
        } else if (isAnomaly && cause === 'Normal') {
            cause = 'Unknown / Anthropogenic';
        }

        const result = {
            is_anomaly: isAnomaly,
            z_score: zScore.toFixed(2),
            cause: cause,
            current_value: currentRad.toFixed(2),
            history_count: historicalVals.length,
            fire_confidence: activeFire ? fireRes.rows[0].confidence : 0
        };

        // Cache for 1 hour
        await cacheManager.set(cacheKey, result, 3600);

        return result;
    }

    // --- Helpers ---

    private static async getLatestViirsPixel(lat: number, lon: number): Promise<number> {
        // Create cache key for this location
        const cacheKey = `viirs_pixel:${lat.toFixed(4)}:${lon.toFixed(4)}`;

        // Try to get from cache first
        const cachedValue = await cacheManager.get<number>(cacheKey);
        if (cachedValue !== null) {
            return cachedValue;
        }

        const pool = getPostGISPool();
        // Extract value from the latest raster.
        // Note: 'viirs_latest_raster' must exist in PostGIS (created via raster2pgsql or similar)
        const query = `
            SELECT ST_Value(rast, ST_SetSRID(ST_Point($1, $2), 4326)) as rad
            FROM viirs_latest_raster
            WHERE ST_Intersects(rast, ST_SetSRID(ST_Point($1, $2), 4326))
            LIMIT 1
        `;
        try {
            const res = await pool.query(query, [lon, lat]);
            if (res.rows.length > 0 && res.rows[0].rad !== null) {
                const value = parseFloat(res.rows[0].rad);
                // Cache for 1 hour
                await cacheManager.set(cacheKey, value, 3600);
                return value;
            }
        } catch (e) {
            console.error('Raster query failed:', e);
        }

        // Fallback for demo or regions with missing raster coverage
        const fallbackValue = 0.0;
        // Cache fallback value for 15 minutes to prevent repeated failed queries
        await cacheManager.set(cacheKey, fallbackValue, 900);
        return fallbackValue;
    }

    private static assessCorrelation(rad: number, mpsas: number): string {
        if (!mpsas || isNaN(mpsas) || mpsas === 0) return 'NO_GROUND_DATA';

        const estimated = this.radianceToMpsas(rad);
        const diff = Math.abs(estimated - mpsas);

        if (diff > 1.5) return 'HIGH_DISCREPANCY';
        if (diff > 0.5) return 'MODERATE_DISCREPANCY';
        return 'MATCH';
    }

    /**
     * Estimates energy waste from light pollution
     */
    static async estimateEnergyWaste(lat: number, lon: number): Promise<EnergyWasteEstimate> {
      const pool = getPostGISPool();

      // Get average radiance in the area
      const radianceQuery = `
        SELECT AVG(radiance) as avg_radiance
        FROM viirs_rasters
        WHERE ST_Intersects(raster, ST_SetSRID(ST_Point($1, $2), 4326))
        LIMIT 1
      `;

      try {
        const radianceRes = await pool.query(radianceQuery, [lon, lat]);
        const avgRadiance = parseFloat(radianceRes.rows[0]?.avg_radiance) || 0;

        // Convert radiance to estimated energy waste (simplified model)
        // Higher radiance correlates with more light pollution and energy waste
        const waste_kwh = avgRadiance * 500; // Simplified conversion factor
        const cost = waste_kwh * 0.12; // Assuming $0.12 per kWh
        const co2 = waste_kwh * 0.475; // kg CO2 per kWh (US average)

        return {
          waste_kwh,
          cost,
          co2,
          potentialSavings: 35 // Percentage of energy that could be saved with better lighting
        };
      } catch (error) {
        console.error('Energy waste estimation error:', error);
        // Return default values in case of error
        return {
          waste_kwh: 7500,
          cost: 900,
          co2: 3562,
          potentialSavings: 35
        };
      }
    }
  }

  interface EnergyWasteEstimate {
    waste_kwh: number;
    cost: number;
    co2: number;
    potentialSavings: number;
  }
