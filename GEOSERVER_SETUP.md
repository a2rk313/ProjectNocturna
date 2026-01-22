# GeoServer Configuration Instructions

## Prerequisites
- The application stack is running (use `docker compose up`)
- GeoServer is accessible at http://localhost:8080/geoserver
- PostGIS database is populated with measurements table

## Step 1: Access GeoServer Admin Panel
1. Navigate to http://localhost:8080/geoserver
2. Login with credentials (defined in your .env file):
   - Username: admin
   - Password: geoserver

## Step 2: Create Workspace
1. Go to "Workspaces" in the left sidebar
2. Click "Add new workspace"
3. Fill in:
   - Name: `nocturna`
   - Namespace URI: `http://nocturna.project`

## Step 3: Create Data Store
1. Go to "Stores" in the left sidebar
2. Click "Add new Store"
3. Select "PostGIS" under Vector Data Sources
4. Fill in the connection parameters:
   - Workspace: `nocturna`
   - Data Source Name: `measurements-db`
   - Description: `PostgreSQL/PostGIS database for measurements`
   - Connection Parameters:
     - host: `db`
     - port: `5432`
     - database: `projectnocturna` (or your DB name)
     - schema: `public`
     - user: `postgres` (or your DB user)
     - password: `postgres` (or your DB password)
     - validate connections: `true`
     - max connections: `10`
     - min connections: `1`

## Step 4: Publish Layer
1. After creating the store, you'll be taken to the "New Layer" page
2. Select `measurements` from the table list
3. Click "Publish"
4. Configure the layer:
   - Change the Name to `measurements`
   - Set SRS (EPSG) to `EPSG:4326`
   - Set bounds as needed
   - Save the layer

## Step 5: Test Layer
1. Go to "Layer Preview" in the left sidebar
2. Find the `nocturna:measurements` layer
3. Click "OpenLayers" to preview the layer
4. You should see your measurement points displayed on the map

## Using the WMS Service
Once configured, the layer will be accessible via WMS at:
`http://localhost:8080/geoserver/nocturna/wms?service=WMS&version=1.1.0&request=GetMap&...`

The JavaScript code in webgis.js is already configured to use this endpoint.

## Troubleshooting
- If you get connection errors, ensure the `db` container name matches the host in the connection parameters
- Check the database logs: `docker compose logs db`
- Check the geoserver logs: `docker compose logs geoserver`
- Make sure the measurements table exists and has data (check with `npm run seed`)