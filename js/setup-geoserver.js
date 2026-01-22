const axios = require('axios');

const GEOSERVER_URL = process.env.GEOSERVER_URL || 'http://localhost:8080/geoserver';
const AUTH = {
    username: process.env.GEOSERVER_ADMIN_USER || 'admin',
    password: process.env.GEOSERVER_ADMIN_PASSWORD || 'geoserver'
};

const WORKSPACE = 'nocturna';
const DATASTORE = 'postgis_store';
const LAYER = 'measurements';

// DB Config (Internal to Docker network, used by GeoServer to connect to DB)
const DB_CONFIG = {
    host: process.env.DB_HOST || 'db',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'nocturna',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    schema: 'public'
};

async function checkGeoServer() {
    try {
        await axios.get(`${GEOSERVER_URL}/rest/about/version`, { auth: AUTH });
        console.log("✅ GeoServer is online.");
        return true;
    } catch (e) {
        console.error("❌ GeoServer is not reachable. Is it running?");
        return false;
    }
}

async function createWorkspace() {
    try {
        await axios.get(`${GEOSERVER_URL}/rest/workspaces/${WORKSPACE}`, { auth: AUTH });
        console.log(`ℹ️ Workspace '${WORKSPACE}' already exists.`);
    } catch (e) {
        if (e.response && e.response.status === 404) {
            console.log(`Creating workspace '${WORKSPACE}'...`);
            await axios.post(`${GEOSERVER_URL}/rest/workspaces`,
                { workspace: { name: WORKSPACE } },
                { auth: AUTH, headers: { 'Content-Type': 'application/json' } }
            );
            console.log("✅ Workspace created.");
        } else {
            throw e;
        }
    }
}

async function createDataStore() {
    const storeXml = `<dataStore>
  <name>${DATASTORE}</name>
  <connectionParameters>
    <entry key="host">${DB_CONFIG.host}</entry>
    <entry key="port">${DB_CONFIG.port}</entry>
    <entry key="database">${DB_CONFIG.database}</entry>
    <entry key="user">${DB_CONFIG.user}</entry>
    <entry key="passwd">${DB_CONFIG.password}</entry>
    <entry key="dbtype">postgis</entry>
    <entry key="schema">${DB_CONFIG.schema}</entry>
    <entry key="Expose primary keys">true</entry>
  </connectionParameters>
</dataStore>`;

    try {
        await axios.get(`${GEOSERVER_URL}/rest/workspaces/${WORKSPACE}/datastores/${DATASTORE}`, { auth: AUTH });
        console.log(`ℹ️ DataStore '${DATASTORE}' already exists.`);
    } catch (e) {
        if (e.response && e.response.status === 404) {
            console.log(`Creating DataStore '${DATASTORE}'...`);
            await axios.post(`${GEOSERVER_URL}/rest/workspaces/${WORKSPACE}/datastores`,
                storeXml,
                { auth: AUTH, headers: { 'Content-Type': 'application/xml' } }
            );
            console.log("✅ DataStore created.");
        } else {
            throw e;
        }
    }
}

async function publishLayer() {
    const layerXml = `<featureType>
  <name>${LAYER}</name>
  <nativeName>${LAYER}</nativeName>
  <title>Light Pollution Measurements</title>
  <srs>EPSG:4326</srs>
  <nativeBoundingBox>
    <minx>-180.0</minx>
    <maxx>180.0</maxx>
    <miny>-90.0</miny>
    <maxy>90.0</maxy>
    <crs>EPSG:4326</crs>
  </nativeBoundingBox>
  <latLonBoundingBox>
    <minx>-180.0</minx>
    <maxx>180.0</maxx>
    <miny>-90.0</miny>
    <maxy>90.0</maxy>
    <crs>EPSG:4326</crs>
  </latLonBoundingBox>
  <enabled>true</enabled>
</featureType>`;

    try {
        await axios.get(`${GEOSERVER_URL}/rest/workspaces/${WORKSPACE}/datastores/${DATASTORE}/featuretypes/${LAYER}`, { auth: AUTH });
        console.log(`ℹ️ Layer '${LAYER}' already published.`);
    } catch (e) {
        if (e.response && e.response.status === 404) {
            console.log(`Publishing Layer '${LAYER}'...`);
            await axios.post(`${GEOSERVER_URL}/rest/workspaces/${WORKSPACE}/datastores/${DATASTORE}/featuretypes`,
                layerXml,
                { auth: AUTH, headers: { 'Content-Type': 'application/xml' } }
            );
            console.log("✅ Layer published.");
        } else {
            throw e;
        }
    }
}

async function main() {
    if (!await checkGeoServer()) process.exit(1);
    try {
        await createWorkspace();
        await createDataStore();
        await publishLayer();
        console.log("🎉 GeoServer setup complete!");
    } catch (e) {
        console.error("💥 Setup failed:", e.message);
        if (e.response) console.error("Response:", e.response.data);
    }
}

main();
