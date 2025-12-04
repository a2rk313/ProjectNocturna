#!/bin/bash

# ==========================================
# CONFIGURATION SECTION
# ==========================================
# PASTE YOUR REPO URL BELOW (Leave empty as requested)
REPO_URL=""

# Set the name of the folder the repo creates
PROJECT_FOLDER="my-project-name"
# ==========================================

echo "[INFO] Starting setup script..."

# Function to check for command existence
exists() {
  command -v "$1" >/dev/null 2>&1
}

# 1. DETECT PACKAGE MANAGER
PM=""
INSTALL_CMD=""

if exists apt-get; then
    PM="apt"
    INSTALL_CMD="apt-get install -y"
    UPDATE_CMD="apt-get update"
elif exists dnf; then
    PM="dnf"
    INSTALL_CMD="dnf install -y"
elif exists yum; then
    PM="yum"
    INSTALL_CMD="yum install -y"
elif exists pacman; then
    PM="pacman"
    INSTALL_CMD="pacman -S --noconfirm"
    UPDATE_CMD="pacman -Sy"
elif exists apk; then
    PM="apk"
    INSTALL_CMD="apk add"
elif exists zypper; then
    PM="zypper"
    INSTALL_CMD="zypper install -y"
fi

# Helper to run with sudo if needed
run_install() {
    if [ "$EUID" -ne 0 ]; then
        if exists sudo; then
            sudo $1
        else
            echo "[ERROR] This script requires root permissions to install packages."
            echo "Please run as root or install sudo."
            exit 1
        fi
    else
        $1
    fi
}

# 2. CHECK FOR GIT
if ! exists git; then
    echo "[WARN] Git is not detected."
    
    if [ -z "$PM" ]; then
        echo "[ERROR] No supported package manager found. Please install Git manually."
        exit 1
    fi

    echo "[INFO] Detected package manager: $PM. Installing Git..."
    
    # Run update if needed (mostly for apt/pacman)
    if [ ! -z "$UPDATE_CMD" ]; then
        run_install "$UPDATE_CMD"
    fi
    
    run_install "$INSTALL_CMD git"

    if ! exists git; then
        echo "[ERROR] Failed to install Git."
        exit 1
    fi
    echo "[INFO] Git installed successfully."
else
    echo "[INFO] Git is already installed."
fi

# 3. CHECK FOR NODE.JS / NPM
if ! exists node || ! exists npm; then
    echo "[WARN] Node.js or NPM is not detected."

    if [ -z "$PM" ]; then
        echo "[ERROR] No supported package manager found. Please install Node.js manually."
        exit 1
    fi

    echo "[INFO] Attempting to install Node.js and NPM via $PM..."

    # Specific handling for Debian/Ubuntu which splits nodejs and npm, and often needs curl for setup
    if [ "$PM" = "apt" ]; then
        echo "[INFO] Note: On Debian/Ubuntu, installing 'npm' usually pulls in 'nodejs'..."
        run_install "$INSTALL_CMD npm"
    else
        # RHEL/Fedora/Arch usually package them together or as 'nodejs'
        run_install "$INSTALL_CMD nodejs npm"
    fi
    
    # Fallback check
    if ! exists node; then
         # Sometimes binary is named 'nodejs' instead of 'node' on legacy Debian
         if exists nodejs; then
            echo "[INFO] Found 'nodejs' binary but not 'node'. Creating symlink..."
             run_install "ln -s /usr/bin/nodejs /usr/bin/node"
         fi
    fi

    if ! exists node; then
        echo "[ERROR] Failed to install Node.js."
        echo "Try installing manually from https://nodejs.org/"
        exit 1
    fi
    echo "[INFO] Node.js installed successfully."
else
    echo "[INFO] Node.js is already installed."
fi

# 4. CLONE REPOSITORY
if [ -z "$REPO_URL" ]; then
    echo "[ERROR] REPO_URL variable is empty!"
    echo "Please edit this script and add your repository URL in the configuration section."
    exit 1
fi

if [ -d "$PROJECT_FOLDER" ]; then
    echo "[WARN] Folder '$PROJECT_FOLDER' already exists. Skipping clone..."
else
    echo "[INFO] Cloning repository..."
    git clone "$REPO_URL" "$PROJECT_FOLDER"
    if [ $? -ne 0 ]; then
        echo "[ERROR] Failed to clone repository."
        exit 1
    fi
fi

# 5. ENTER DIRECTORY
cd "$PROJECT_FOLDER" || { echo "[ERROR] Could not enter directory '$PROJECT_FOLDER'"; exit 1; }

# 6. BRANCH SELECTION
echo ""
echo "[INFO] Fetching latest branches..."
git fetch --all --prune >/dev/null 2>&1

echo ""
echo "=========================================="
echo "AVAILABLE REMOTE BRANCHES:"
echo "=========================================="
git branch -r | grep -v '\->'
echo "=========================================="
echo "Note: You can typically type the name without 'origin/' (e.g., 'develop')"
echo ""

read -p "Enter branch name to checkout (Leave empty for default): " TARGET_BRANCH

if [ ! -z "$TARGET_BRANCH" ]; then
    echo "[INFO] Switching to branch '$TARGET_BRANCH'..."
    git checkout "$TARGET_BRANCH"
    if [ $? -ne 0 ]; then
        echo "[WARN] Could not checkout '$TARGET_BRANCH'. Staying on current branch."
    else
        echo "[INFO] Successfully on branch '$TARGET_BRANCH'."
    fi
fi

if [ ! -f "package.json" ]; then
    echo "[ERROR] No package.json found in the repository root."
    exit 1
fi

# 7. INSTALL & RUN
echo "[INFO] Installing NPM dependencies..."
npm install

echo "[INFO] Starting the project..."
npm start