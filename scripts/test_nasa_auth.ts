import { nasaAuth } from '../lib/nasa_auth';
import 'dotenv/config';

/**
 * Test script to verify NASA Earthdata authentication
 */

async function testNasaAuth() {
  console.log('🧪 Testing NASA Earthdata Authentication...');
  
  // Test authentication
  const isAuthenticated = await nasaAuth.authenticate();
  
  if (isAuthenticated) {
    console.log('✅ Authentication successful!');
    
    // Test fetching some data
    console.log('\n🔍 Testing data fetch...');
    try {
      const response = await nasaAuth.fetchWithAuth(
        'https://cmr.earthdata.nasa.gov/search/collections.json?short_name=VNP46A1&page_size=1'
      );
      
      if (response.ok) {
        console.log('✅ Successfully fetched collection metadata');
        const data = await response.json();
        console.log(`📊 Found ${data.feed.entry?.length || 0} collections`);
      } else {
        console.log(`❌ Failed to fetch data: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.error('❌ Error fetching data:', error);
    }
  } else {
    console.log('❌ Authentication failed. Please check your NASA_EARTHDATA_USERNAME and NASA_EARTHDATA_PASSWORD environment variables.');
  }
}

// Run the test
testNasaAuth().catch(console.error);