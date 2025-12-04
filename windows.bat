@echo off
setlocal EnableDelayedExpansion

:: ==========================================
:: CONFIGURATION SECTION
:: ==========================================
set "REPO_URL=https://github.com/a2rk313/ProjectNocturna"
set "BRANCH_NAME=a2rk"
set "PROJECT_FOLDER=ProjectNocturna"
:: ==========================================

echo [INFO] Starting setup script for branch: %BRANCH_NAME%...

:: ==========================================
:: 1. CHECK FOR GIT
:: ==========================================
:CheckGit
where git >nul 2>nul
if !errorlevel! equ 0 (
    echo [INFO] Git is already installed.
    goto :CheckNode
)

echo [WARN] Git is not detected. Checking for local MinGit...
if exist "%LOCALAPPDATA%\MinGit\cmd\git.exe" (
    echo [INFO] Found MinGit in LocalAppData. Adding to PATH...
    set "PATH=%LOCALAPPDATA%\MinGit\cmd;%PATH%"
    goto :CheckNode
)

echo [INFO] Git not found. Attempting to download MinGit (Portable)...
set "PS_SCRIPT=%TEMP%\download_mingit.ps1"

:: Create PowerShell download script
echo $ProgressPreference = 'SilentlyContinue' > "%PS_SCRIPT%"
echo [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12 >> "%PS_SCRIPT%"
echo try { >> "%PS_SCRIPT%"
echo     $api = Invoke-RestMethod 'https://api.github.com/repos/git-for-windows/git/releases/latest' >> "%PS_SCRIPT%"
echo     $url = $api.assets ^| Where-Object { $_.name -like 'MinGit*-64-bit.zip' } ^| Select-Object -First 1 ^| Select-Object -ExpandProperty browser_download_url >> "%PS_SCRIPT%"
echo     if ($url) { >> "%PS_SCRIPT%"
echo         Write-Host "Downloading from: $url" >> "%PS_SCRIPT%"
echo         Invoke-WebRequest -Uri $url -OutFile "$env:TEMP\mingit.zip" >> "%PS_SCRIPT%"
echo     } else { exit 1 } >> "%PS_SCRIPT%"
echo } catch { exit 1 } >> "%PS_SCRIPT%"

:: Run the script
powershell -ExecutionPolicy Bypass -File "%PS_SCRIPT%"
if !errorlevel! neq 0 (
    echo [ERROR] Git download failed. Please check your internet connection.
    del "%PS_SCRIPT%"
    pause
    exit /b 1
)
del "%PS_SCRIPT%"

:: Extract MinGit
if exist "%TEMP%\mingit.zip" (
    echo [INFO] Extracting MinGit...
    powershell -Command "Expand-Archive -Path \"$env:TEMP\mingit.zip\" -DestinationPath \"$env:LOCALAPPDATA\MinGit\" -Force"
    del "%TEMP%\mingit.zip"
    
    if exist "%LOCALAPPDATA%\MinGit\cmd\git.exe" (
        set "PATH=%LOCALAPPDATA%\MinGit\cmd;%PATH%"
        echo [INFO] MinGit installed temporarily for this session.
    ) else (
        echo [ERROR] Extraction failed.
        pause
        exit /b 1
    )
) else (
    echo [ERROR] Download file not found.
    pause
    exit /b 1
)

:: ==========================================
:: 2. CHECK FOR NODE.JS
:: ==========================================
:CheckNode
node -v >nul 2>nul
if !errorlevel! equ 0 (
    echo [INFO] Node.js is already installed.
    goto :CloneRepo
)

echo [WARN] Node.js is not detected. Attempting download...
set "PS_SCRIPT_NODE=%TEMP%\download_node.ps1"

:: Create PowerShell download script for Node
echo $ProgressPreference = 'SilentlyContinue' > "%PS_SCRIPT_NODE%"
echo try { >> "%PS_SCRIPT_NODE%"
echo     $json = Invoke-RestMethod 'https://nodejs.org/dist/index.json' >> "%PS_SCRIPT_NODE%"
echo     $latest = $json ^| Where-Object { $_.lts -ne $false } ^| Select-Object -First 1 >> "%PS_SCRIPT_NODE%"
echo     $ver = $latest.version >> "%PS_SCRIPT_NODE%"
echo     $url = "https://nodejs.org/dist/$ver/node-$ver-x64.msi" >> "%PS_SCRIPT_NODE%"
echo     Write-Host "Downloading Node.js $ver..." >> "%PS_SCRIPT_NODE%"
echo     Invoke-WebRequest -Uri $url -OutFile "$env:TEMP\node-lts.msi" >> "%PS_SCRIPT_NODE%"
echo } catch { exit 1 } >> "%PS_SCRIPT_NODE%"

powershell -ExecutionPolicy Bypass -File "%PS_SCRIPT_NODE%"
if !errorlevel! neq 0 (
    echo [ERROR] Node.js download failed.
    del "%PS_SCRIPT_NODE%"
    pause
    exit /b 1
)
del "%PS_SCRIPT_NODE%"

:: Install Node
if exist "%TEMP%\node-lts.msi" (
    echo [INFO] Installing Node.js...
    msiexec /i "%TEMP%\node-lts.msi" /qn /norestart
    del "%TEMP%\node-lts.msi"
    
    :: FIX: Manually add Node to PATH for the current session
    if exist "C:\Program Files\nodejs\node.exe" (
        echo [INFO] Node.js found in Program Files. Adding to PATH...
        set "PATH=C:\Program Files\nodejs;%PATH%"
    ) else if exist "C:\Program Files (x86)\nodejs\node.exe" (
        echo [INFO] Node.js found in Program Files (x86). Adding to PATH...
        set "PATH=C:\Program Files (x86)\nodejs;%PATH%"
    )
    
    :: Verify
    node -v >nul 2>nul
    if !errorlevel! neq 0 (
        echo [WARN] Node installed but still not detected. You may need to restart the script.
    ) else (
        echo [INFO] Node.js installed successfully.
    )
)

:: ==========================================
:: 3. CLONE REPOSITORY
:: ==========================================
:CloneRepo
echo.
if exist "%PROJECT_FOLDER%" (
    echo [WARN] Folder "%PROJECT_FOLDER%" exists. Checking content...
    cd "%PROJECT_FOLDER%"
    if exist ".git" (
        echo [INFO] Pulling latest changes for branch %BRANCH_NAME%...
        git checkout %BRANCH_NAME% 2>nul || git checkout -b %BRANCH_NAME%
        git pull origin %BRANCH_NAME%
    ) else (
        echo [ERROR] Folder exists but is not a git repository.
        pause
        exit /b 1
    )
) else (
    echo [INFO] Cloning branch "%BRANCH_NAME%"...
    git clone -b %BRANCH_NAME% "%REPO_URL%" "%PROJECT_FOLDER%"
    if !errorlevel! neq 0 (
        echo [ERROR] Failed to clone repository.
        pause
        exit /b 1
    )
    cd "%PROJECT_FOLDER%"
)

:: ==========================================
:: 4. INSTALL DEPENDENCIES
:: ==========================================
echo [INFO] Analyzing project structure...

if exist "yarn.lock" (
    echo [INFO] Yarn detected. Installing via Yarn...
    call npm install -g yarn >nul 2>nul
    call yarn install
    set "RUN_CMD=yarn"
) else if exist "pnpm-lock.yaml" (
    echo [INFO] PNPM detected. Installing via PNPM...
    call npm install -g pnpm >nul 2>nul
    call pnpm install
    set "RUN_CMD=pnpm"
) else (
    echo [INFO] NPM detected. Installing via NPM...
    call npm install
    set "RUN_CMD=npm"
)

:: ==========================================
:: 5. START PROJECT
:: ==========================================
echo [INFO] Determining start command...
findstr /C:"\"start\":" "package.json" >nul
if !errorlevel! equ 0 (
    echo [INFO] Running 'start' script...
    call %RUN_CMD% start
) else (
    findstr /C:"\"dev\":" "package.json" >nul
    if !errorlevel! equ 0 (
        echo [INFO] Running 'dev' script...
        call %RUN_CMD% run dev
    ) else (
        echo [WARN] No 'start' or 'dev' script found. Trying 'node index.js'...
        if exist "index.js" node index.js
    )
)

echo [INFO] Script finished.
pause