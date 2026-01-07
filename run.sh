#!/bin/bash

# ==============================================================================
#  PROJECT NOCTURNA - STREAMLINED DEPLOYMENT
# ==============================================================================

# 1. PRINT BANNER
# We use 'cat' with a quoted "EOF" to safely print the complex graphic data
cat << "EOF"
[?80l[?8452lP0;1;0q"1;1;189;180#0;2;100;100;100#1;2;0;0;0#0!10?__ooWWW!149KWWWooo_!16?$#1!14?___!149o___-#0!4?_o{MMBB@!159?@@BFM[w_$#1!7?oo{{}!159~}}{wo_-#0?_{~F@!20?_!42?KKC!105?@B^{_$#1!4?w}!20~^!42~rrz!105~}{_-#0?~~!22?BBB!152?~~$#1???!22~{{{!152~-#0?~~!141?oo!34?~~$#1???!141~NN!34~-#0?~~!88?!53_``!34?~~$#1???!88~!53^]]!34~-#0?~~!35?}}}{{wwoo__!22?_!18?!56~!34?}~$#1???!35~@@@BBFFNN^^!22~^!18~!56?!34~@-#0?~~!21?ww!12?!13~}}{{wwoo__!9?BBB!17?!56~!34?}~$#1???!21~FF!12~!13?@@BBFFNN^^!9~{{{!17~!56?!34~@-#0?~~!35?!25~}}{{wwoo__!17?@!38BF!16~!34?}~$#1???!35~!25?@@BBFFNN^^!17~}!38{w!16?!34~@-#0?~~!35?!37~}}{{wwoo__!45?!16~!34?n~g$#1???!35~!37?@@BBFFNN^^!45~!16?!34~O?O-#0?~~!35?!17~FBBFFNN^^!23~}}{{wwooo__!32?!16~!34?^~O$#1???!35~!17?w{{wwoo__!23?@@BBFFNNN^^!32~!16?!34~_?C-#0?~~!35?!17~!11?@@BBFFNNN^^!23~}}{{wwoo__!20?!16~!34?n~_$#1???!35~!17?!11~}}{{wwooo__!23?@@BBFFNN^^!20~!16?!34~O?S-#0?~~!35?!17~!24?@@BBFFNN^^!23~}}{{wwoo!10?!16~!34?y~c$#1???!35~!17?!24~}}{{wwoo__!23?@@BBFFNN!10~!16?!34~D?G-#0?~~!13?EEA!19?!17~!36?@@BBFFNN^^!19~!10?!16~!34?{~Z$#1???!13~xx|!19~!17?!36~}}{{wwoo__!19?!10~!16?!34~B?c-#0?~~!35?!17~!9?oo__!35?@@BBFFNN^^!7~!10?!16~!34?~~D$#1???!35~!17?!9~NN^^!35~}}{{wwoo__!7?!10~!16?!34~-#0?~~!35?!17~!9?!7~}{{{wooo__!34?@@BBF!10?!16~!18?EE!14?~~$#1???!35~!17?!9~!7?@BBBFNNN^^!34~}}{{w!10~!16?!18~xx!14~??O-#0?~~!35?!17~!9?!19~}}{{wwoo__!37?!16~!34?n~c$#1???!35~!17?!9~!19?@@BBFFNN^^!37~!16?!34~O-#0?~~!35?!17~!9?BBFFNN^^!23~}}{{wwoo__!25?!16~!34?n~c$#1???!35~!17?!9~{{wwoo__!23?@@BBFFNN^^!25~!16?!34~O?O-#0?~~!35?!17~!19?@@BBFFNN^^!23~}}{{wwoo__!13?!16~!34?n~^$#1???!35~!17?!19~}}{{wwoo__!23?@@BBFFNN^^!13~!16?!34~O?_-#0?~~!35?!17~!31?@@BBFFNN^^!23~}}{{ww!4ow!16~!34?~~O$#1???!35~!17?!31~}}{{wwoo__!23?@@BBFF!4NF!16?!34~??G-#0?~~!9?_o_!23?!17~!43?@@BBFFNN^^!38~!34?z~A$#1???!9~^N^!23~!17?!43~}}{{wwoo__!38?!34~C-#0?~~!10?@@!23?!17~o!34_a___??E!10{wwwppbbFFNN^^!26~!34?v~s$#1???!10~}}!23~!17?N!34^\^^^~~x!10BFFFMM[[wwoo__!26?!34~G-#0?~~!35?!56~???!19~}}{{wwppbbFFNN^^!14~!9?@BB!22?j~A$#1???!35~!56?~~~!19?@@BBFFMM[[wwoo__!14?!9~}{{!22~S?@-#0?~~!35?!56~???!31~}}{{wwppbbFFNN^^~~!34?M~K$#1???!35~!56?~~~!31?@@BBFFMM[[wwoo__??!34~p-#0?~~!25?__ooww{woo!56poow!43~}}{{wwoww~}}{{wo__!22?~~u$#1???!25~^^NNFFBFNN!56MNNF!43?@@BBFFNFF?@@BBFN^^!22~??H-#0?~~!18?_oow{}}!131~}{{wo_!15?~~q$#1???!18~^NNFB@@!131?@BBFN^!15~??K-#0?~~!12?_ow{}}!146~{wwo!9?~~G$#1???!12~^NFB@@!146?BFFN!9~??P-#0?~~!6?_w{{!160~}ww_???~~$#1???!6~^FBB!160?@FF^~~~-#0??F~{w}}!170~}~~`_$#1!4?BF@@!170?@-#0!189?\ ____            _           _     _   _            _                          
|  _ \ _ __ ___ (_) ___  ___| |_  | \ | | ___   ___| |_ _   _ _ __ _ __   __ _ 
| |_) | '__/ _ \| |/ _ \/ __| __| |  \| |/ _ \ / __| __| | | | '__| '_ \ / _` |
|  __/| | | (_) | |  __/ (__| |_  | |\  | (_) | (__| |_| |_| | |  | | | | (_| |
|_|   |_|  \___// |\___|\___|\__| |_| \_|\___/ \___|\__|\__,_|_|  |_| |_|\__,_|
              |__/                                                             
EOF











# 2. CREDENTIALS
if [ -f .env ]; then
    echo "🔐 Loading credentials..."
    set -a; source .env; set +a
else
    echo "❌ Error: .env file missing."
    exit 1
fi

# 3. CLEANUP
echo "🧹 Cleaning up..."
podman rm -f projectnocturna_downloader projectnocturna_app projectnocturna_db projectnocturna_geoserver projectnocturna_n8n 2>/dev/null
podman network rm nocturna_net 2>/dev/null

# 4. INFRASTRUCTURE
echo "🏗️  Setting up Network..."
podman network create nocturna_net 2>/dev/null
podman volume exists nocturna_geodata_shared || podman volume create nocturna_geodata_shared

# 5. STEP A: REAL DATA PROCESSING
echo "🛰️  [Step A] Starting Research Pipeline..."
# FIX: Switched to 'ubuntu-full-latest' to ensure HDF5 driver support
echo "    Using Image: ghcr.io/osgeo/gdal:ubuntu-full-latest (Guaranteed HDF5 Support)"

podman run --rm \
  --name projectnocturna_downloader \
  --env-file .env \
  -w /app \
  -v $(pwd)/etl_main.py:/app/etl_main.py:Z \
  -v nocturna_geodata_shared:/app/geoserver_data/data_layers:Z \
  ghcr.io/osgeo/gdal:ubuntu-full-latest \
  /bin/sh -c "apt-get update && apt-get install -y python3-pip && python3 -m pip install --break-system-packages earthaccess requests python-dotenv numpy && python3 etl_main.py"

# Check exit code of the Python script explicitly
if [ $? -eq 0 ]; then
    echo "✅ Pipeline Success."
else
    echo "❌ Pipeline Failed. Stopping deployment."
    exit 1
fi

# 6. STEP B: START APP STACK
echo "🐳 [Step B] Launching Services..."

# Database
podman run -d --name projectnocturna_db --network nocturna_net --env-file .env \
  -p 5433:5432 \
  -v postgres_data:/var/lib/postgresql/data:Z \
  -v $(pwd)/database_setup.sql:/docker-entrypoint-initdb.d/init.sql:Z \
  docker.io/postgis/postgis:15-3.3

# GeoServer
podman run -d --name projectnocturna_geoserver --network nocturna_net --env-file .env \
  -p 8080:8080 -e CORS_ENABLED=true \
  -v nocturna_geodata_shared:/opt/geoserver/data_dir/data_layers:Z \
  -v $(pwd)/geoserver_data:/opt/geoserver/data_dir:Z \
  docker.io/kartoza/geoserver:2.24.1

# App (With Data Mount)
podman build -t projectnocturna_app .
podman run -d --name projectnocturna_app --network nocturna_net --env-file .env \
  -p 3000:3000 -e DB_HOST=projectnocturna_db -e DB_NAME=$POSTGRES_DB \
  -e DB_USER=$POSTGRES_USER -e DB_PASS=$POSTGRES_PASSWORD \
  -v nocturna_geodata_shared:/usr/src/app/geoserver_data/data_layers:Z \
  localhost/projectnocturna_app:latest

# n8n
podman run -d --name projectnocturna_n8n --network nocturna_net --restart always --env-file .env \
  -p 5678:5678 -e GENERIC_TIMEZONE=Asia/Karachi -e TZ=Asia/Karachi \
  -e N8N_HOST=localhost -e N8N_PORT=5678 -e N8N_PROTOCOL=http -e WEBHOOK_URL=http://localhost:5678/ \
  -v n8n_data:/home/node/.n8n:Z \
  -v $(pwd)/WebGIS_ActionBot_Final_Fixed.json:/tmp/workflow.json:Z \
  docker.io/n8nio/n8n:latest \
  /bin/sh -c "n8n import:workflow --input=/tmp/workflow.json && n8n start"





























# 7. FINAL CHECK
echo ""
echo "✅ Deployment Complete!"
echo "   -------------------------------------------------"
echo "   - Web App:   http://localhost:3000"
echo "   - GeoServer: http://localhost:8080/geoserver"
echo "   - n8n:       http://localhost:5678"
echo "   -------------------------------------------------"