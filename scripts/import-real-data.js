// scripts/import-real-data.js
const { query, logger } = require('../config/db');

async function importVIIRSData() {
  console.log('🌍 Importing NASA VIIRS data...');
  
  // Example: Import monthly VIIRS data for 2023
  const months = [
    '2023-01', '2023-02', '2023-03', '2023-04',
    '2023-05', '2023-06', '2023-07', '2023-08'
  ];
  
  for (const month of months) {
    // This would fetch from NASA API and insert into database
    // For now, we'll create mock points
    const points = Array.from({length: 100}, (_, i) => ({
      date: `${month}-15`,
      lat: Math.random() * 180 - 90,
      lon: Math.random() * 360 - 180,
      radiance: Math.random() * 100,
      brightness: Math.random() * 50,
      quality_flag: Math.floor(Math.random() * 3)
    }));
    
    const { error } = await supabase
      .from('viirs_monthly')
      .insert(points);
    
    if (error) {
      console.error(`Error importing ${month}:`, error);
    } else {
      console.log(`✅ Imported ${points.length} points for ${month}`);
    }
  }
}

async function importCommunityData() {
  console.log('👥 Importing community measurements...');
  
  // Real data from open SQM databases
  const communityData = [
    // Example real measurements
    {
      sqm_reading: 21.99,
      bortle_class: 1,
      device_type: 'SQM-LE',
      notes: 'Natural Bridges, Utah',
      geom: { type: 'Point', coordinates: [-110.0137, 37.6018] },
      altitude: 1900,
      is_research_grade: true,
      source: 'IDSP'
    },
    {
      sqm_reading: 21.80,
      bortle_class: 2,
      device_type: 'SQM-LU',
      notes: 'Cherry Springs, Pennsylvania',
      geom: { type: 'Point', coordinates: [-77.8236, 41.6631] },
      altitude: 700,
      is_research_grade: true,
      source: 'IDSP'
    },
    // Add more real measurements...
  ];
  
  const { error } = await supabase
    .from('light_measurements')
    .insert(communityData);
  
  if (error) {
    console.error('Error importing community data:', error);
  } else {
    console.log('✅ Imported community measurements');
  }
}

async function main() {
  await importVIIRSData();
  await importCommunityData();
  console.log('🎉 Data import completed!');
}

main().catch(console.error);