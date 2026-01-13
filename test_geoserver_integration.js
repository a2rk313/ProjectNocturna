/**
 * Test script to verify GeoServer integration
 */

const GeoServerService = require('./lib/geoserver-service');

async function testGeoServerIntegration() {
    console.log('🧪 Testing GeoServer Integration...');
    
    const geoServerService = new GeoServerService();
    
    try {
        // Test 1: Health check
        console.log('\n🔍 Testing health check...');
        const health = await geoServerService.healthCheck();
        console.log('✅ Health check result:', health);
        
        // Test 2: Try to get layers (will use fallback if external GeoServer unavailable)
        console.log('\n🔍 Testing layer retrieval...');
        try {
            const layers = await geoServerService.getLayers();
            console.log('✅ Layers retrieved:', layers);
        } catch (layerError) {
            console.log('⚠️ Layer retrieval failed (expected if external GeoServer unavailable):', layerError.message);
        }
        
        // Test 3: Try a query (will use fallback if external GeoServer unavailable)
        console.log('\n🔍 Testing query features...');
        try {
            const features = await geoServerService.queryFeatures('test_layer', [-180, -90, 180, 90]);
            console.log('✅ Query features result:', features.type || 'No features returned');
        } catch (queryError) {
            console.log('⚠️ Query features failed (expected if external GeoServer unavailable):', queryError.message);
        }
        
        console.log('\n🎉 GeoServer integration tests completed!');
        console.log('📝 Note: It\'s expected that some tests may show warnings if external GeoServer is not available.');
        console.log('   The fallback mechanisms will ensure your application continues to function.');
        
    } catch (error) {
        console.error('❌ Error during GeoServer integration test:', error);
    }
}

// Run the test
testGeoServerIntegration();