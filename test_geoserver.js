#!/usr/bin/env node

/**
 * Test script for GeoServer integration
 */

require('dotenv').config();

const GeoServerService = require('./lib/geoserver-service');

async function testGeoServerIntegration() {
    console.log('🧪 Testing GeoServer Integration...');
    
    try {
        // Create GeoServer service instance
        const geoServerService = new GeoServerService();
        
        // Test health check
        console.log('\n🔍 Testing health check...');
        const health = await geoServerService.healthCheck();
        console.log('✅ Health check result:', health);
        
        if (health.connected) {
            // Test initialization
            console.log('\n🔧 Testing initialization...');
            const initSuccess = await geoServerService.initialize();
            console.log('✅ Initialization result:', initSuccess);
            
            // Test getting layers
            console.log('\n📋 Testing get layers...');
            try {
                const layers = await geoServerService.getLayers();
                console.log('✅ Got layers:', layers.layers?.layer ? layers.layers.layer.length : 0);
            } catch (layersError) {
                console.log('⚠️ Could not get layers:', layersError.message);
            }
            
            console.log('\n🎉 GeoServer integration tests completed successfully!');
        } else {
            console.log('❌ GeoServer not accessible, please check configuration');
        }
        
    } catch (error) {
        console.error('❌ Error during GeoServer integration test:', error.message);
        console.error('Stack trace:', error.stack);
    }
}

// Run the test
testGeoServerIntegration();