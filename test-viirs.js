/**
 * Test script to verify VIIRS data integration
 */

const axios = require('axios');

async function testVIIRSIntegration() {
    console.log('🧪 Testing VIIRS Integration...');
    
    try {
        // Test the VIIRS data endpoint
        console.log('\n1. Testing VIIRS data endpoint...');
        const viirsResponse = await axios.get('http://localhost:3000/api/viirs-data?lat=40.7128&lng=-74.0060');
        console.log('✅ VIIRS data endpoint:', viirsResponse.status);
        console.log('📊 VIIRS data count:', viirsResponse.data.length);
        if (viirsResponse.data.length > 0) {
            console.log('📍 Sample VIIRS data:', viirsResponse.data[0]);
        }
        
        // Test the VIIRS stats endpoint
        console.log('\n2. Testing VIIRS stats endpoint...');
        const geometry = {
            type: "Polygon",
            coordinates: [[
                [-74.2557, 40.4951],  // SW corner of NYC area
                [-73.7002, 40.4951],  // SE corner
                [-73.7002, 40.9156],  // NE corner
                [-74.2557, 40.9156],  // NW corner
                [-74.2557, 40.4951]   // Close the polygon
            ]]
        };
        
        const statsResponse = await axios.post('http://localhost:3000/api/viirs-stats', {
            geometry: geometry
        });
        console.log('✅ VIIRS stats endpoint:', statsResponse.status);
        console.log('📈 VIIRS stats:', statsResponse.data);
        
        console.log('\n🎉 VIIRS integration tests passed!');
    } catch (error) {
        console.error('❌ VIIRS integration test failed:', error.message);
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', error.response.data);
        }
    }
}

// Run the test
testVIIRSIntegration();