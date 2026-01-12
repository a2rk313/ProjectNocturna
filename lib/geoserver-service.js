// lib/geoserver-service.js - GeoServer Integration Service
// Provides access to GeoServer for light pollution data management and visualization

const axios = require('axios');

class GeoServerService {
    constructor() {
        this.baseUrl = process.env.GEOSERVER_URL || 'http://localhost:8080/geoserver';
        this.username = process.env.GEOSERVER_ADMIN_USER || 'admin';
        this.password = process.env.GEOSERVER_ADMIN_PASSWORD || 'geoserver';
        this.workspace = process.env.GEOSERVER_WORKSPACE || 'nocturna';
        this.datastore = process.env.GEOSERVER_DATASTORE || 'nocturna_datastore';
        
        // Authentication header
        this.auth = {
            username: this.username,
            password: this.password
        };
        
        this.headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        };
    }

    /**
     * Create workspace if it doesn't exist
     */
    async createWorkspace() {
        try {
            // Check if workspace exists
            const workspaceCheck = await axios.get(
                `${this.baseUrl}/rest/workspaces/${this.workspace}`,
                { auth: this.auth, headers: this.headers }
            );
            
            if (workspaceCheck.status === 200) {
                console.log(`✅ Workspace ${this.workspace} already exists`);
                return true;
            }
        } catch (error) {
            if (error.response && error.response.status === 404) {
                // Workspace doesn't exist, create it
                try {
                    const response = await axios.post(
                        `${this.baseUrl}/rest/workspaces`,
                        {
                            workspace: {
                                name: this.workspace
                            }
                        },
                        {
                            auth: this.auth,
                            headers: this.headers
                        }
                    );
                    
                    if (response.status === 201) {
                        console.log(`✅ Created workspace: ${this.workspace}`);
                        return true;
                    }
                } catch (createError) {
                    console.error('❌ Error creating workspace:', createError.message);
                    throw createError;
                }
            } else {
                console.error('❌ Error checking workspace:', error.message);
                throw error;
            }
        }
    }

    /**
     * Create datastore if it doesn't exist
     */
    async createDatastore() {
        try {
            // Check if datastore exists
            const datastoreCheck = await axios.get(
                `${this.baseUrl}/rest/workspaces/${this.workspace}/datastores/${this.datastore}`,
                { auth: this.auth, headers: this.headers }
            );
            
            if (datastoreCheck.status === 200) {
                console.log(`✅ Datastore ${this.datastore} already exists`);
                return true;
            }
        } catch (error) {
            if (error.response && error.response.status === 404) {
                // Datastore doesn't exist, create it
                try {
                    const response = await axios.post(
                        `${this.baseUrl}/rest/workspaces/${this.workspace}/datastores`,
                        {
                            dataStore: {
                                name: this.datastore,
                                type: 'PostGIS',
                                enabled: true,
                                connectionParameters: {
                                    entry: [
                                        { '@key': 'host', '$': process.env.POSTGRES_HOST || 'localhost' },
                                        { '@key': 'port', '$': process.env.POSTGRES_PORT || '5432' },
                                        { '@key': 'database', '$': process.env.POSTGRES_DB || 'nocturna' },
                                        { '@key': 'user', '$': process.env.POSTGRES_USER || 'postgres' },
                                        { '@key': 'passwd', '$': process.env.POSTGRES_PASSWORD || 'postgres' },
                                        { '@key': 'dbtype', '$': 'postgis' }
                                    ]
                                }
                            }
                        },
                        {
                            auth: this.auth,
                            headers: this.headers
                        }
                    );
                    
                    if (response.status === 201) {
                        console.log(`✅ Created datastore: ${this.datastore}`);
                        return true;
                    }
                } catch (createError) {
                    console.error('❌ Error creating datastore:', createError.message);
                    throw createError;
                }
            } else {
                console.error('❌ Error checking datastore:', error.message);
                throw error;
            }
        }
    }

    /**
     * Publish a layer from the datastore
     */
    async publishLayer(tableName, layerName, title, abstract) {
        try {
            // Create feature type
            const response = await axios.post(
                `${this.baseUrl}/rest/workspaces/${this.workspace}/datastores/${this.datastore}/featuretypes`,
                {
                    featureType: {
                        name: layerName,
                        title: title,
                        abstract: abstract,
                        nativeCRS: 'EPSG:4326',
                        srs: 'EPSG:4326',
                        enabled: true,
                        advertised: true
                    }
                },
                {
                    auth: this.auth,
                    headers: this.headers
                }
            );
            
            if (response.status === 201) {
                console.log(`✅ Published layer: ${layerName}`);
                return true;
            }
        } catch (error) {
            console.error('❌ Error publishing layer:', error.message);
            if (error.response) {
                console.error('Response data:', error.response.data);
            }
            throw error;
        }
    }

    /**
     * Get all layers from GeoServer
     */
    async getLayers() {
        try {
            const response = await axios.get(
                `${this.baseUrl}/rest/layers`,
                { auth: this.auth, headers: this.headers }
            );
            
            return response.data;
        } catch (error) {
            console.error('❌ Error getting layers:', error.message);
            throw error;
        }
    }

    /**
     * Get layer details
     */
    async getLayer(layerName) {
        try {
            const response = await axios.get(
                `${this.baseUrl}/rest/layers/${layerName}`,
                { auth: this.auth, headers: this.headers }
            );
            
            return response.data;
        } catch (error) {
            console.error('❌ Error getting layer:', error.message);
            throw error;
        }
    }

    /**
     * Get WMS tile URL template for a layer
     */
    getWmsUrl(layerName) {
        return `${this.baseUrl}/wms?service=WMS&version=1.1.0&request=GetMap&layers=${this.workspace}:${layerName}&styles=&format=image/png&transparent=true&height=256&width=256&srs=EPSG:3857`;
    }

    /**
     * Get WFS URL for data access
     */
    getWfsUrl(layerName) {
        return `${this.baseUrl}/wfs?service=WFS&version=1.0.0&request=GetFeature&typeName=${this.workspace}:${layerName}&outputFormat=application/json`;
    }

    /**
     * Get layer bounds
     */
    async getLayerBounds(layerName) {
        try {
            const response = await axios.get(
                `${this.baseUrl}/rest/layers/${layerName}/bounds`,
                { auth: this.auth, headers: this.headers }
            );
            
            return response.data;
        } catch (error) {
            console.error('❌ Error getting layer bounds:', error.message);
            throw error;
        }
    }

    /**
     * Query features within bounds
     */
    async queryFeatures(layerName, bounds, cqlFilter = null) {
        try {
            const params = {
                service: 'WFS',
                version: '1.0.0',
                request: 'GetFeature',
                typeName: `${this.workspace}:${layerName}`,
                outputFormat: 'application/json',
                maxFeatures: 1000
            };

            // Add bounding box filter if bounds provided
            if (bounds) {
                const bbox = `${bounds[0]},${bounds[1]},${bounds[2]},${bounds[3]},EPSG:4326`;
                params.bbox = bbox;
            }

            // Add CQL filter if provided
            if (cqlFilter) {
                params.cql_filter = cqlFilter;
            }

            const response = await axios.get(`${this.baseUrl}/wfs`, {
                params,
                auth: this.auth,
                headers: this.headers
            });

            return response.data;
        } catch (error) {
            console.error('❌ Error querying features:', error.message);
            throw error;
        }
    }

    /**
     * Upload shapefile to GeoServer
     */
    async uploadShapefile(zipFileBuffer, layerName, title, abstract) {
        try {
            const formData = new FormData();
            formData.append('file', zipFileBuffer, `${layerName}.zip`);
            
            const response = await axios.post(
                `${this.baseUrl}/rest/workspaces/${this.workspace}/datastores/${this.datastore}/file.shp`,
                formData,
                {
                    auth: this.auth,
                    headers: {
                        'Content-Type': 'application/zip'
                    }
                }
            );
            
            if (response.status === 201) {
                console.log(`✅ Uploaded shapefile: ${layerName}`);
                return true;
            }
        } catch (error) {
            console.error('❌ Error uploading shapefile:', error.message);
            throw error;
        }
    }

    /**
     * Create style for layer
     */
    async createStyle(styleName, sldContent) {
        try {
            const response = await axios.put(
                `${this.baseUrl}/rest/styles`,
                sldContent,
                {
                    auth: this.auth,
                    headers: {
                        'Content-Type': 'application/vnd.ogc.sld+xml'
                    },
                    params: {
                        name: styleName,
                        workspace: this.workspace
                    }
                }
            );
            
            if (response.status === 200 || response.status === 201) {
                console.log(`✅ Created style: ${styleName}`);
                
                // Publish the style to a layer
                await this.publishStyleToLayer(styleName, styleName);
                return true;
            }
        } catch (error) {
            console.error('❌ Error creating style:', error.message);
            throw error;
        }
    }

    /**
     * Publish style to layer
     */
    async publishStyleToLayer(styleName, layerName) {
        try {
            const response = await axios.put(
                `${this.baseUrl}/rest/layers/${this.workspace}:${layerName}`,
                {
                    layer: {
                        defaultStyle: {
                            name: styleName
                        }
                    }
                },
                {
                    auth: this.auth,
                    headers: this.headers
                }
            );
            
            if (response.status === 200) {
                console.log(`✅ Published style ${styleName} to layer ${layerName}`);
                return true;
            }
        } catch (error) {
            console.error('❌ Error publishing style to layer:', error.message);
            throw error;
        }
    }

    /**
     * Get available styles
     */
    async getStyles() {
        try {
            const response = await axios.get(
                `${this.baseUrl}/rest/styles.json`,
                { auth: this.auth, headers: this.headers }
            );
            
            return response.data;
        } catch (error) {
            console.error('❌ Error getting styles:', error.message);
            throw error;
        }
    }

    /**
     * Health check for GeoServer
     */
    async healthCheck() {
        try {
            const response = await axios.get(
                `${this.baseUrl}/rest/about/version`,
                { auth: this.auth, headers: this.headers }
            );
            
            if (response.status === 200) {
                return {
                    status: 'healthy',
                    service: 'GeoServer',
                    connected: true,
                    version: response.data.about.version,
                    timestamp: new Date().toISOString()
                };
            }
        } catch (error) {
            console.error('❌ GeoServer health check failed:', error.message);
            return {
                status: 'unhealthy',
                service: 'GeoServer',
                connected: false,
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }

    /**
     * Initialize GeoServer with required layers and configurations
     */
    async initialize() {
        try {
            console.log('🚀 Initializing GeoServer integration...');
            
            // Create workspace
            await this.createWorkspace();
            
            // Create datastore
            await this.createDatastore();
            
            console.log('✅ GeoServer initialization completed');
            return true;
        } catch (error) {
            console.error('❌ Error initializing GeoServer:', error.message);
            throw error;
        }
    }
}

module.exports = GeoServerService;