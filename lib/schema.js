import { pgTable, serial, uuid, varchar, decimal, integer, timestamp, boolean, jsonb, date, text, real, pgEnum } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// Enums
export const userRoles = pgEnum('user_roles', ['citizen_scientist', 'researcher', 'admin']);
export const expertiseLevels = pgEnum('expertise_levels', ['novice', 'experienced', 'expert']);
export const validationStatuses = pgEnum('validation_statuses', ['pending', 'validated', 'rejected']);
export const lightSourceTypes = pgEnum('light_source_types', ['street_light', 'commercial', 'industrial', 'residential']);
export const urbanRuralClassifications = pgEnum('urban_rural_classifications', ['urban', 'suburban', 'rural', 'remote']);
export const reportTypes = pgEnum('report_types', ['trend_analysis', 'comparison', 'event_based']);

// Users table
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uuid: uuid('uuid').defaultRandom().notNull().unique(),
  username: varchar('username', { length: 50 }).notNull().unique(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  role: userRoles('role').default('citizen_scientist'),
  expertiseLevel: expertiseLevels('expertise_level').default('novice'),
  organizationAffiliation: varchar('organization_affiliation', { length: 255 }),
  profileImageUrl: varchar('profile_image_url', { length: 255 }),
  location: sql`geography(Point, 4326)`.as('location'), // PostGIS geography type
  latitude: decimal('latitude', { precision: 8, scale: 6 }),
  longitude: decimal('longitude', { precision: 8, scale: 6 }),
  bio: text('bio'),
  isActive: boolean('is_active').default(true),
  lastLogin: timestamp('last_login', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// Sensors table
export const sensors = pgTable('sensors', {
  id: serial('id').primaryKey(),
  uuid: uuid('uuid').defaultRandom().notNull().unique(),
  sensorName: varchar('sensor_name', { length: 100 }).notNull(),
  sensorModel: varchar('sensor_model', { length: 100 }),
  manufacturer: varchar('manufacturer', { length: 100 }),
  calibrationDate: date('calibration_date'),
  calibrationExpirationDate: date('calibration_expiration_date'),
  sensitivity: decimal('sensitivity', { precision: 8, scale: 6 }), // Sensitivity in appropriate units
  fieldOfView: decimal('field_of_view', { precision: 5, scale: 2 }), // Field of view in degrees
  spectralResponse: jsonb('spectral_response'), // Spectral response curve
  ownerUserId: uuid('owner_user_id'),
  status: varchar('status', { length: 20 }).default('active'), // active, inactive, retired
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// Citizen scientist light pollution measurements
export const lightMeasurements = pgTable('light_measurements', {
  id: serial('id').primaryKey(),
  uuid: uuid('uuid').defaultRandom().notNull().unique(),
  measurementDatetime: timestamp('measurement_datetime', { withTimezone: true }).defaultNow().notNull(),
  location: sql`geography(Point, 4326)`.as('location'), // PostGIS geography type
  latitude: decimal('latitude', { precision: 8, scale: 6 }).notNull(),
  longitude: decimal('longitude', { precision: 8, scale: 6 }).notNull(),
  skyBrightnessMagArcsec2: decimal('sky_brightness_mag_arcsec2', { precision: 5, scale: 2 }), // Sky brightness in magnitudes per square arcsecond
  cloudCoverPercentage: integer('cloud_cover_percentage').check(sql`cloud_cover_percentage BETWEEN 0 AND 100`),
  weatherConditions: text('weather_conditions'),
  moonPhase: decimal('moon_phase', { precision: 3, scale: 2 }), // Moon phase factor (0-1)
  moonAltitude: decimal('moon_altitude', { precision: 4, scale: 2 }), // Moon altitude in degrees
  sensorType: varchar('sensor_type', { length: 50 }), // Type of sensor/device used
  observationNotes: text('observation_notes'),
  imageUrl: varchar('image_url', { length: 255 }), // URL to uploaded image
  measurementQualityScore: decimal('measurement_quality_score', { precision: 3, scale: 2 }), // Quality score (0-1)
  submittedByUserId: uuid('submitted_by_user_id'),
  validationStatus: validationStatuses('validation_status').default('pending'), // pending, validated, rejected
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// Scientific measurements (professional grade)
export const scientificMeasurements = pgTable('scientific_measurements', {
  id: serial('id').primaryKey(),
  uuid: uuid('uuid').defaultRandom().notNull().unique(),
  measurementDatetime: timestamp('measurement_datetime', { withTimezone: true }).notNull(),
  location: sql`geography(Point, 4326)`.as('location'), // PostGIS geography type
  latitude: decimal('latitude', { precision: 8, scale: 6 }).notNull(),
  longitude: decimal('longitude', { precision: 8, scale: 6 }).notNull(),
  skyBrightnessMagArcsec2: decimal('sky_brightness_mag_arcsec2', { precision: 5, scale: 2 }),
  calibratedSkyBrightnessMagArcsec2: decimal('calibrated_sky_brightness_mag_arcsec2', { precision: 5, scale: 2 }),
  spectralData: jsonb('spectral_data'), // Spectral information if available
  sensorCalibrationFactor: decimal('sensor_calibration_factor', { precision: 5, scale: 4 }),
  atmosphericConditions: jsonb('atmospheric_conditions'), // Temperature, humidity, pressure
  equipmentDetails: jsonb('equipment_details'), // Detailed equipment info
  observerExpertiseLevel: expertiseLevels('observer_expertise_level'), // novice, experienced, expert
  qualityControlNotes: text('quality_control_notes'),
  dataValidatedByUserId: uuid('data_validated_by_user_id'),
  validationTimestamp: timestamp('validation_timestamp', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// Satellite light pollution data
export const satelliteLightData = pgTable('satellite_light_data', {
  id: serial('id').primaryKey(),
  uuid: uuid('uuid').defaultRandom().notNull().unique(),
  acquisitionDate: date('acquisition_date').notNull(),
  location: sql`geography(Point, 4326)`.as('location'), // PostGIS geography type
  latitude: decimal('latitude', { precision: 8, scale: 6 }).notNull(),
  longitude: decimal('longitude', { precision: 8, scale: 6 }).notNull(),
  radianceValue: decimal('radiance_value', { precision: 10, scale: 6 }), // Radiance value from satellite
  satelliteSource: varchar('satellite_source', { length: 50 }), // VIIRS, DMSP, etc.
  cloudCoveragePercentage: integer('cloud_coverage_percentage').check(sql`cloud_coverage_percentage BETWEEN 0 AND 100`),
  processingAlgorithm: varchar('processing_algorithm', { length: 100 }),
  dataQualityFlag: integer('data_quality_flag'), // Quality assessment
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// Environmental context
export const environmentalContext = pgTable('environmental_context', {
  id: serial('id').primaryKey(),
  uuid: uuid('uuid').defaultRandom().notNull().unique(),
  location: sql`geography(Point, 4326)`.as('location'), // PostGIS geography type
  latitude: decimal('latitude', { precision: 8, scale: 6 }).notNull(),
  longitude: decimal('longitude', { precision: 8, scale: 6 }).notNull(),
  timestamp: timestamp('timestamp', { withTimezone: true }).defaultNow().notNull(),
  temperatureCelsius: decimal('temperature_celsius', { precision: 5, scale: 2 }),
  humidityPercentage: integer('humidity_percentage').check(sql`humidity_percentage BETWEEN 0 AND 100`),
  atmosphericPressureHpa: decimal('atmospheric_pressure_hpa', { precision: 7, scale: 2 }),
  windSpeedMs: decimal('wind_speed_ms', { precision: 5, scale: 2 }),
  visibilityKm: decimal('visibility_km', { precision: 5, scale: 2 }),
  cloudCoverPercentage: integer('cloud_cover_percentage').check(sql`cloud_cover_percentage BETWEEN 0 AND 100`),
  atmosphericExtinctionCoefficient: decimal('atmospheric_extinction_coefficient', { precision: 5, scale: 4 }),
  airQualityIndex: integer('air_quality_index'),
  nearbyLightSources: jsonb('nearby_light_sources'), // List of nearby light sources
  urbanRuralClassification: urbanRuralClassifications('urban_rural_classification'), // urban, suburban, rural, remote
  zenithVisibilityConditions: text('zenith_visibility_conditions'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// Quality control
export const qualityControl = pgTable('quality_control', {
  id: serial('id').primaryKey(),
  uuid: uuid('uuid').defaultRandom().notNull().unique(),
  measurementId: integer('measurement_id').notNull(),
  measurementTable: varchar('measurement_table', { length: 30 }).check(sql`measurement_table IN ('light_measurements', 'scientific_measurements')`), // Table name where measurement is stored
  validatorUserId: uuid('validator_user_id'), // References users table
  qualityScore: decimal('quality_score', { precision: 3, scale: 2 }).check(sql`quality_score BETWEEN 0 AND 1`), // 0-1 scale
  validationMethod: varchar('validation_method', { length: 50 }), // visual_inspection, cross_reference, algorithm
  validationNotes: text('validation_notes'),
  isValid: boolean('is_valid'),
  validationTimestamp: timestamp('validation_timestamp', { withTimezone: true }).defaultNow().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// Light source mapping
export const lightSources = pgTable('light_sources', {
  id: serial('id').primaryKey(),
  uuid: uuid('uuid').defaultRandom().notNull().unique(),
  location: sql`geography(Point, 4326)`.as('location'), // PostGIS geography type
  latitude: decimal('latitude', { precision: 8, scale: 6 }).notNull(),
  longitude: decimal('longitude', { precision: 8, scale: 6 }).notNull(),
  sourceType: lightSourceTypes('source_type'), // street_light, commercial, industrial, residential
  intensityLumens: integer('intensity_lumens'), // Intensity in lumens
  colorTemperatureKelvin: integer('color_temperature_kelvin'), // Color temperature in Kelvin
  heightMeters: decimal('height_meters', { precision: 6, scale: 2 }), // Height in meters
  azimuthAngle: decimal('azimuth_angle', { precision: 5, scale: 2 }), // Direction angle
  tiltAngle: decimal('tilt_angle', { precision: 5, scale: 2 }), // Tilt from vertical
  shielded: boolean('shielded').default(false),
  contributedByUserId: uuid('contributed_by_user_id'), // References users table
  verificationStatus: varchar('verification_status', { length: 20 }).default('unverified'), // unverified, verified, disputed
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// Analysis reports
export const analysisReports = pgTable('analysis_reports', {
  id: serial('id').primaryKey(),
  uuid: uuid('uuid').defaultRandom().notNull().unique(),
  title: varchar('title', { length: 255 }).notNull(),
  reportType: reportTypes('report_type'), // trend_analysis, comparison, event_based
  authorUserId: uuid('author_user_id'), // References users table
  generatedDatetime: timestamp('generated_datetime', { withTimezone: true }).defaultNow().notNull(),
  parametersUsed: jsonb('parameters_used'), // Parameters used for the analysis
  methodology: text('methodology'),
  summaryStatistics: jsonb('summary_statistics'), // Statistical summary
  findings: text('findings'),
  recommendations: text('recommendations'),
  dataVisualizations: jsonb('data_visualizations'), // Links or references to visualizations
  reportFileUrl: varchar('report_file_url', { length: 255 }), // Link to downloadable report
  isPublic: boolean('is_public').default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// Export all schemas for Drizzle
export const schema = {
  users,
  sensors,
  lightMeasurements,
  scientificMeasurements,
  satelliteLightData,
  environmentalContext,
  qualityControl,
  lightSources,
  analysisReports,
  userRoles,
  expertiseLevels,
  validationStatuses,
  lightSourceTypes,
  urbanRuralClassifications,
  reportTypes
};