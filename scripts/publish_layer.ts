// Bun automatically loads .env files

const GEOSERVER_URL = process.env.GEOSERVER_URL || 'http://localhost:8080/geoserver';
const AUTH = Buffer.from(`${process.env.GEOSERVER_ADMIN_USER || 'admin'}:${process.env.GEOSERVER_ADMIN_PASSWORD || 'geoserver'}`).toString('base64');
const HEADERS = {
    'Authorization': `Basic ${AUTH}`,
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'Accept-Encoding': 'identity'
};


const WORKSPACE = 'nocturna';
const STORE = 'nocturna_postgis';
const LAYERS = [
    { name: 'light_measurements', title: 'Light Measurements' },
    { name: 'dark_sky_parks', title: 'Dark Sky Parks' }
];

// PostGIS connection params (internal to Docker network)
const DB_HOST = 'nocturna-postgis';
const DB_PORT = '5432';
const DB_NAME = process.env.POSTGRES_DB || 'nocturna';
const DB_USER = process.env.POSTGRES_USER || 'nocturna';
const DB_PASS = process.env.POSTGRES_PASSWORD || 'nocturna_dev_password_change_me';

async function publishLayer(name: string, title: string) {
    console.log(`Publishing layer '${name}'...`);
    const layerPayload = {
        featureType: {
            name: name,
            nativeName: name,
            title: title,
            srs: 'EPSG:4326'
        }
    };
    const res = await fetch(`${GEOSERVER_URL}/rest/workspaces/${WORKSPACE}/datastores/${STORE}/featuretypes`, {
        method: 'POST',
        headers: HEADERS,
        body: JSON.stringify(layerPayload)
    });

    if (res.status === 201) {
        console.log(`  Success: Layer '${name}' created.`);
    } else if (res.status === 409) {
        console.log(`  Layer '${name}' already exists.`);
    } else if (!res.ok) {
        console.error(`  Failed to publish '${name}':`, await res.text());
    }
}

async function publishLayerMain() {
    console.log(`Target GeoServer: ${GEOSERVER_URL}`);

    // 1. Create Workspace
    console.log(`Creating workspace '${WORKSPACE}'...`);
    let res = await fetch(`${GEOSERVER_URL}/rest/workspaces`, {
        method: 'POST',
        headers: HEADERS,
        body: JSON.stringify({ workspace: { name: WORKSPACE } })
    });
    if (res.status === 409) console.log('  Workspace already exists.');
    else if (res.status === 201) console.log('  Workspace created successfully.');
    else if (!res.ok) console.error('  Failed to create workspace:', await res.text());

    // 2. Create DataStore
    console.log(`Creating data store '${STORE}'...`);
    const storePayload = {
        dataStore: {
            name: STORE,
            connectionParameters: {
                host: DB_HOST,
                port: DB_PORT,
                database: DB_NAME,
                user: DB_USER,
                passwd: DB_PASS,
                dbtype: 'postgis',
                schema: 'public'
            }
        }
    };
    res = await fetch(`${GEOSERVER_URL}/rest/workspaces/${WORKSPACE}/datastores`, {
        method: 'POST',
        headers: HEADERS,
        body: JSON.stringify(storePayload)
    });
    if (res.status === 409) console.log('  Data store already exists.');
    else if (res.status === 201) console.log('  Data store created successfully.');
    else if (!res.ok) console.error('  Failed to create data store:', await res.text());

    // 3. Publish Layers
    for (const layer of LAYERS) {
        await publishLayer(layer.name, layer.title);
    }

    console.log('Done.');
}

publishLayerMain().catch(console.error);
