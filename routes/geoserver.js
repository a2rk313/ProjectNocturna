// routes/geoserver.js - GeoServer integration routes
const express = require('express');
const router = express.Router();
const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// GeoServer health check
router.get('/health', async (req, res) => {
  try {
    const geoserverUrl = process.env.GEOSERVER_URL || 'http://localhost:8080/geoserver';
    
    // Try to reach GeoServer's REST API
    const response = await axios.get(`${geoserverUrl}/rest/about/version.json`, {
      auth: {
        username: process.env.GEOSERVER_ADMIN_USER || 'admin',
        password: process.env.GEOSERVER_ADMIN_PASSWORD || 'geoserver'
      },
      timeout: 5000
    });
    
    res.json({
      status: 'healthy',
      geoserver_url: geoserverUrl,
      version_info: response.data,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ GeoServer Health Check Error:', error.message);
    
    // Return degraded status if GeoServer is not accessible
    res.status(200).json({
      status: 'degraded',
      message: 'GeoServer is not accessible',
      error: error.message,
      geoserver_url: process.env.GEOSERVER_URL || 'http://localhost:8080/geoserver',
      timestamp: new Date().toISOString(),
      fallback_available: true
    });
  }
});

// Initialize GeoServer workspace and datastore
router.post('/init', async (req, res) => {
  try {
    const geoserverUrl = process.env.GEOSERVER_URL || 'http://localhost:8080/geoserver';
    const workspace = process.env.GEOSERVER_WORKSPACE || 'nocturna';
    const datastore = process.env.GEOSERVER_DATASTORE || 'nocturna_datastore';
    
    // Check if workspace exists, if not create it
    let workspaceExists = false;
    try {
      await axios.get(`${geoserverUrl}/rest/workspaces/${workspace}`, {
        auth: {
          username: process.env.GEOSERVER_ADMIN_USER || 'admin',
          password: process.env.GEOSERVER_ADMIN_PASSWORD || 'geoserver'
        }
      });
      workspaceExists = true;
    } catch (workspaceCheckError) {
      // Workspace doesn't exist, we'll create it
    }
    
    if (!workspaceExists) {
      // Create workspace
      await axios.post(`${geoserverUrl}/rest/workspaces`, 
        `<workspace><name>${workspace}</name></workspace>`,
        {
          auth: {
            username: process.env.GEOSERVER_ADMIN_USER || 'admin',
            password: process.env.GEOSERVER_ADMIN_PASSWORD || 'geoserver'
          },
          headers: {
            'Content-Type': 'text/xml'
          }
        }
      );
    }
    
    // Check if datastore exists
    let datastoreExists = false;
    try {
      await axios.get(`${geoserverUrl}/rest/workspaces/${workspace}/datastores/${datastore}.json`, {
        auth: {
          username: process.env.GEOSERVER_ADMIN_USER || 'admin',
          password: process.env.GEOSERVER_ADMIN_PASSWORD || 'geoserver'
        }
      });
      datastoreExists = true;
    } catch (datastoreCheckError) {
      // Datastore doesn't exist, we'll create it
    }
    
    if (!datastoreExists) {
      // Create PostGIS datastore
      const datastoreConfig = {
        dataStore: {
          name: datastore,
          type: 'PostGIS',
          enabled: true,
          workspace: { name: workspace },
          connectionParameters: {
            entry: [
              { '@key': 'host', '$': process.env.POSTGRES_HOST || 'db' },
              { '@key': 'port', '$': process.env.POSTGRES_PORT || '5432' },
              { '@key': 'database', '$': process.env.POSTGRES_DB || 'project_nocturna' },
              { '@key': 'user', '$': process.env.POSTGRES_USER || 'postgres' },
              { '@key': 'passwd', '$': process.env.POSTGRES_PASSWORD || 'password' },
              { '@key': 'dbtype', '$': 'postgis' }
            ]
          }
        }
      };
      
      await axios.post(`${geoserverUrl}/rest/workspaces/${workspace}/datastores`, 
        datastoreConfig,
        {
          auth: {
            username: process.env.GEOSERVER_ADMIN_USER || 'admin',
            password: process.env.GEOSERVER_ADMIN_PASSWORD || 'geoserver'
          },
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
    }
    
    res.json({
      status: 'initialized',
      workspace: workspace,
      datastore: datastore,
      workspace_created: !workspaceExists,
      datastore_created: !datastoreExists,
      timestamp: new Date().toISOString(),
      geoserver_url: geoserverUrl
    });
  } catch (error) {
    console.error('❌ GeoServer Initialization Error:', error.message);
    res.status(500).json({
      error: 'Failed to initialize GeoServer',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Get available geospatial layers
router.get('/layers', async (req, res) => {
  try {
    const geoserverUrl = process.env.GEOSERVER_URL || 'http://localhost:8080/geoserver';
    const workspace = process.env.GEOSERVER_WORKSPACE || 'nocturna';
    
    // Try to get layers from GeoServer
    try {
      const response = await axios.get(`${geoserverUrl}/rest/workspaces/${workspace}/layers.json`, {
        auth: {
          username: process.env.GEOSERVER_ADMIN_USER || 'admin',
          password: process.env.GEOSERVER_ADMIN_PASSWORD || 'geoserver'
        }
      });
      
      res.json({
        source: 'GeoServer',
        workspace: workspace,
        count: response.data.layers.layer.length,
        layers: response.data.layers.layer,
        timestamp: new Date().toISOString()
      });
    } catch (geoServerError) {
      // If GeoServer is not available, return empty list with fallback info
      console.log('GeoServer not available, returning sample layers');
      
      res.json({
        source: 'GeoServer (Simulation)',
        workspace: workspace,
        count: 3,
        layers: [
          {
            name: 'light_pollution_2023',
            title: 'Light Pollution Data 2023',
            type: 'featureType',
            enabled: true,
            advertised: true
          },
          {
            name: 'dark_sky_parks',
            title: 'Dark Sky Parks',
            type: 'featureType',
            enabled: true,
            advertised: true
          },
          {
            name: 'viirs_ntl',
            title: 'VIIRS Nighttime Lights',
            type: 'featureType',
            enabled: true,
            advertised: true
          }
        ],
        timestamp: new Date().toISOString(),
        geoServerAvailable: false,
        fallback_layers: true
      });
    }
  } catch (error) {
    console.error('❌ GeoServer Layers Error:', error.message);
    res.status(500).json({
      error: 'Failed to get GeoServer layers',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Query geospatial features
router.post('/query', async (req, res) => {
  try {
    const { layerName, bbox, cqlFilter, maxFeatures } = req.body;
    const geoserverUrl = process.env.GEOSERVER_URL || 'http://localhost:8080/geoserver';
    const workspace = process.env.GEOSERVER_WORKSPACE || 'nocturna';
    
    // Build WFS query URL
    let wfsUrl = `${geoserverUrl}/wfs`;
    const params = new URLSearchParams({
      service: 'WFS',
      version: '1.1.0',
      request: 'GetFeature',
      typeName: `${workspace}:${layerName || 'light_pollution_2023'}`,
      outputFormat: 'application/json',
      maxFeatures: maxFeatures || 1000
    });
    
    // Add bounding box filter if provided
    if (bbox) {
      params.append('bbox', bbox); // Format: minX,minY,maxX,maxY[,srsName]
    }
    
    // Add CQL filter if provided
    if (cqlFilter) {
      params.append('cql_filter', cqlFilter);
    }
    
    wfsUrl += '?' + params.toString();
    
    try {
      // Try to query GeoServer
      const response = await axios.get(wfsUrl, {
        auth: {
          username: process.env.GEOSERVER_ADMIN_USER || 'admin',
          password: process.env.GEOSERVER_ADMIN_PASSWORD || 'geoserver'
        },
        timeout: 10000
      });
      
      res.json({
        source: 'GeoServer WFS',
        layer: layerName,
        count: response.data.features.length,
        features: response.data.features,
        query_params: Object.fromEntries(params.entries()),
        timestamp: new Date().toISOString()
      });
    } catch (wfsError) {
      console.log('WFS query failed, using fallback data:', wfsError.message);
      
      // Fallback: return sample data
      const sampleFeatures = [];
      const featureCount = Math.min(maxFeatures || 100, 100);
      
      for (let i = 0; i < featureCount; i++) {
        sampleFeatures.push({
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [
              bbox ? parseFloat(bbox.split(',')[0]) + Math.random() * (parseFloat(bbox.split(',')[2]) - parseFloat(bbox.split(',')[0])) : -100 + Math.random() * 40,
              bbox ? parseFloat(bbox.split(',')[1]) + Math.random() * (parseFloat(bbox.split(',')[3]) - parseFloat(bbox.split(',')[1])) : 30 + Math.random() * 30
            ]
          },
          properties: {
            id: i + 1,
            brightness_level: Math.floor(Math.random() * 5) + 1, // 1-5 scale
            sqm_value: 16 + Math.random() * 6, // 16-22 range
            timestamp: new Date(Date.now() - Math.floor(Math.random() * 365) * 24 * 60 * 60 * 1000).toISOString(),
            confidence: ['high', 'medium', 'low'][Math.floor(Math.random() * 3)],
            source: 'simulated'
          }
        });
      }
      
      res.json({
        source: 'GeoServer WFS (Simulation)',
        layer: layerName || 'light_pollution_2023',
        count: sampleFeatures.length,
        features: sampleFeatures,
        query_params: Object.fromEntries(params.entries()),
        timestamp: new Date().toISOString(),
        geoServerAvailable: false,
        fallback_data: true
      });
    }
  } catch (error) {
    console.error('❌ GeoServer Query Error:', error.message);
    res.status(500).json({
      error: 'Failed to query GeoServer',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Get WMS URL template for a layer
router.get('/wms-template/:layerName', (req, res) => {
  const { layerName } = req.params;
  const geoserverUrl = process.env.GEOSERVER_URL || 'http://localhost:8080/geoserver';
  const workspace = process.env.GEOSERVER_WORKSPACE || 'nocturna';
  
  const wmsTemplate = {
    baseUrl: `${geoserverUrl}/wms`,
    layer: `${workspace}:${layerName}`,
    params: {
      service: 'WMS',
      version: '1.1.1',
      request: 'GetMap',
      layers: `${workspace}:${layerName}`,
      styles: '',
      format: 'image/png',
      transparent: true,
      height: 512,
      width: 512,
      srs: 'EPSG:4326'
    },
    exampleUrl: `${geoserverUrl}/wms?service=WMS&version=1.1.1&request=GetMap&layers=${workspace}:${layerName}&styles=&format=image%2Fpng&transparent=true&height=512&width=512&srs=EPSG:4326&bbox=-180,-90,180,90`
  };
  
  res.json(wmsTemplate);
});

// Get WFS URL for a layer
router.get('/wfs-url/:layerName', (req, res) => {
  const { layerName } = req.params;
  const geoserverUrl = process.env.GEOSERVER_URL || 'http://localhost:8080/geoserver';
  const workspace = process.env.GEOSERVER_WORKSPACE || 'nocturna';
  
  const wfsUrl = `${geoserverUrl}/wfs?service=WFS&version=1.1.0&request=GetFeature&typeName=${workspace}:${layerName}&outputFormat=application/json`;
  
  res.json({
    wfsUrl: wfsUrl,
    workspace: workspace,
    layer: layerName,
    geoserverUrl: geoserverUrl
  });
});

module.exports = router;