#!/bin/bash

# ==============================================================================
#  PROJECT NOCTURNA - SHUTDOWN SEQUENCE
# ==============================================================================

echo "🛑 Stopping Project Nocturna..."

# 1. STOP & REMOVE CONTAINERS
# We use 'rm -f' to force stop and remove them immediately.
# We redirect errors (2>/dev/null) so it doesn't complain if they are already stopped.

echo "   - Removing Application containers..."
podman rm -f projectnocturna_app \
             projectnocturna_db \
             projectnocturna_geoserver \
             projectnocturna_n8n \
             2>/dev/null

# 2. REMOVE NETWORK
echo "   - Removing Network..."
podman network rm nocturna_net 2>/dev/null

echo "✅ Project Nocturna stopped successfully."
echo "   (Note: Data in 'postgres_data', 'geoserver_data', and 'n8n_data' is PRESERVED."
echo "    To wipe everything completely, run: podman volume prune)"