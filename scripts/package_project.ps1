#Requires -Version 5.1
<#
.SYNOPSIS
    Safe project packaging script for "Fraud & Anomaly Detection" academic project.
    Creates a clean ZIP archive excluding generated folders and non-essential files.

.DESCRIPTION
    This script:
    1. Validates the source project directory exists
    2. Creates a temporary clean staging directory
    3. Copies all required source code, configuration, models, and data
    4. Excludes node_modules, __pycache__, dist/, .pytest_cache/, *.db, and temp files
    5. Creates a versioned ZIP in a sibling output folder (not inside the project)
    6. Verifies the ZIP is valid and lists its top-level contents

.USAGE
    Open PowerShell in the project directory and run:
    
        Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
        .\scripts\package_project.ps1

    Or with custom output directory:
        .\scripts\package_project.ps1 -OutputDir "D:\MyOutputs"

.NOTES
    Author: Packaging Script - Fraud & Anomaly Detection Project
    Requires: PowerShell 5.1+
#>

param(
    [string]$OutputDir = "",
    [string]$ZipName = ""
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

# ------------------------------------------------------------------------------
# 0. Configuration
# ------------------------------------------------------------------------------
$ProjectRoot = Split-Path -Parent $PSScriptRoot
$ProjectName = "Fraud_Anomaly_Detection"
$Version     = (Get-Date -Format "yyyy-MM-dd_HHmm")

if (-not $OutputDir) {
    $OutputDir = Join-Path (Split-Path -Parent $ProjectRoot) "${ProjectName}_Package_Output"
}

if (-not $ZipName) {
    $ZipName = "${ProjectName}_v${Version}.zip"
}

$ProjectRoot = [System.IO.Path]::GetFullPath($ProjectRoot).TrimEnd('\')
$OutputDir = [System.IO.Path]::GetFullPath($OutputDir)
if ([System.IO.Path]::GetFileName($ZipName) -ne $ZipName -or
    [System.IO.Path]::GetExtension($ZipName) -ne ".zip") {
    throw "ZipName must be a file name ending in .zip; paths are not allowed."
}

$StagingDir = Join-Path $env:TEMP "FAD_staging_$([System.IO.Path]::GetRandomFileName().Replace('.',''))"
$ZipOutput  = Join-Path $OutputDir $ZipName

# ------------------------------------------------------------------------------
# Helper functions
# ------------------------------------------------------------------------------
function Write-Section($title) {
    Write-Host ""
    Write-Host ("-" * 60) -ForegroundColor Cyan
    Write-Host "  $title" -ForegroundColor Cyan
    Write-Host ("-" * 60) -ForegroundColor Cyan
}

function Write-OK($msg)   { Write-Host "  [OK]  $msg" -ForegroundColor Green }
function Write-WARN($msg) { Write-Host "  [WARN] $msg" -ForegroundColor Yellow }
function Write-ERR($msg)  { Write-Host "  [ERR] $msg" -ForegroundColor Red }
function Write-INFO($msg) { Write-Host "  [INFO] $msg" -ForegroundColor Gray }

# ------------------------------------------------------------------------------
# 1. Pre-flight checks
# ------------------------------------------------------------------------------
Write-Section "Pre-flight Checks"

# Verify project root
if (-not (Test-Path $ProjectRoot)) {
    Write-ERR "Project root not found: $ProjectRoot"
    exit 1
}
Write-OK "Project root found: $ProjectRoot"

# Check required directories
@("backend", "frontend", "models", "data") | ForEach-Object {
    $d = Join-Path $ProjectRoot $_
    if (Test-Path $d) { Write-OK "Required directory: $_ (found)" }
    else              { throw "Required directory is missing: $d" }
}

# Check critical files
@(
    "backend\main.py",
    "backend\requirements.txt",
    "frontend\package.json",
    "frontend\package-lock.json",
    "frontend\vite.config.js",
    "frontend\index.html",
    "data\sample_creditcard.csv",
    "models\preprocessor.joblib",
    "models\logistic_regression.joblib",
    "models\random_forest.joblib",
    "models\isolation_forest.joblib"
) | ForEach-Object {
    $f = Join-Path $ProjectRoot $_
    if (Test-Path $f) { Write-OK "Critical file: $_ (found)" }
    else              { throw "Critical file missing: $f" }
}

# Check output directory is NOT inside project (avoid compressing ZIP into itself)
if ($OutputDir.TrimEnd('\').Equals($ProjectRoot, [System.StringComparison]::OrdinalIgnoreCase) -or
    $OutputDir.StartsWith("$ProjectRoot\", [System.StringComparison]::OrdinalIgnoreCase)) {
    Write-ERR "Output directory cannot be inside the project directory!"
    Write-ERR "  Project root: $ProjectRoot"
    Write-ERR "  Output dir:   $OutputDir"
    Write-ERR "Change -OutputDir to a path outside the project folder."
    exit 1
}

Write-OK "Output directory is safely outside the project root."

# ------------------------------------------------------------------------------
# 2. Free disk space check (require at least 500MB)
# ------------------------------------------------------------------------------
$drive    = Split-Path -Qualifier $OutputDir
$diskInfo = Get-PSDrive -Name ($drive.TrimEnd(':'))
if ($diskInfo.Free -lt 500MB) {
    Write-ERR "Insufficient disk space on drive $drive. Need at least 500 MB, have $([Math]::Round($diskInfo.Free / 1MB)) MB."
    exit 1
}
Write-OK "Disk space OK ($([Math]::Round($diskInfo.Free / 1MB)) MB free on $drive)"

# ------------------------------------------------------------------------------
# 3. Create output & staging directories
# ------------------------------------------------------------------------------
Write-Section "Setting Up Staging Directory"

if (-not (Test-Path $OutputDir)) {
    New-Item -ItemType Directory -Path $OutputDir -Force | Out-Null
    Write-OK "Created output directory: $OutputDir"
} else {
    Write-OK "Output directory exists: $OutputDir"
}

if (Test-Path $StagingDir) {
    Remove-Item $StagingDir -Recurse -Force
}
New-Item -ItemType Directory -Path $StagingDir -Force | Out-Null
Write-OK "Created staging directory: $StagingDir"

# ------------------------------------------------------------------------------
# 4. Define what to INCLUDE and EXCLUDE
# ------------------------------------------------------------------------------
Write-Section "Copying Project Files"

# Directories to copy recursively (relative to ProjectRoot)
$IncludeDirs = @(
    "backend",
    "data",
    "models",
    "scripts",
    "frontend\src"
)

# Individual files to copy (relative to ProjectRoot)
$IncludeFiles = @(
    "frontend\package.json",
    "frontend\package-lock.json",
    "frontend\vite.config.js",
    "frontend\index.html",
    ".env.example",
    ".gitignore",
    "README.md",
    "PROJECT_AUDIT.md",
    "UI_REDESIGN_REPORT.md",
    "TEST_REPORT.md",
    "CONTINUATION_STATUS.md",
    "PACKAGING_GUIDE.md"
)

# Exclusion patterns - applied per directory/file name
$ExcludeNames = @(
    "__pycache__",
    ".pytest_cache",
    "node_modules",
    "dist",
    ".venv",
    "venv",
    "env",
    "*.db",
    "*.sqlite3",
    "*.pyc",
    "*.pyo",
    "*.log",
    ".env",
    ".env.*",
    "*.pem",
    "*.key",
    "*.p12",
    "*.pfx",
    "secrets.*",
    ".DS_Store",
    "Thumbs.db",
    "*.egg-info"
)

function Should-Exclude($path) {
    $segments = $path.Split([char[]]@('\', '/'), [System.StringSplitOptions]::RemoveEmptyEntries)
    foreach ($segment in $segments) {
        if ($segment -eq ".env.example") { continue }
        foreach ($pattern in $ExcludeNames) {
            if ($segment -like $pattern) { return $true }
        }
    }
    return $false
}

function Copy-WithFilter($source, $destination) {
    if (-not (Test-Path $source)) {
        Write-WARN "Source not found, skipping: $source"
        return
    }

    $item = Get-Item $source
    if ($item.PSIsContainer) {
        # Directory - copy recursively with filter
        $files = Get-ChildItem -Path $source -Recurse -File -Force
        $count = 0
        foreach ($file in $files) {
            if (Should-Exclude $file.FullName) { continue }

            $relativePath = $file.FullName.Substring($source.Length).TrimStart('\')
            $destFile     = Join-Path $destination $relativePath
            $destFolder   = Split-Path $destFile -Parent

            if (-not (Test-Path $destFolder)) {
                New-Item -ItemType Directory -Path $destFolder -Force | Out-Null
            }
            Copy-Item -Path $file.FullName -Destination $destFile -Force
            $count++
        }
        Write-OK "Copied $($item.Name)/ ($count files)"
    } else {
        # Single file
        $destFolder = Split-Path $destination -Parent
        if (-not (Test-Path $destFolder)) {
            New-Item -ItemType Directory -Path $destFolder -Force | Out-Null
        }
        Copy-Item -Path $source -Destination $destination -Force
        Write-OK "Copied $($item.Name)"
    }
}

# Copy directories
foreach ($dir in $IncludeDirs) {
    $src  = Join-Path $ProjectRoot $dir
    $dest = Join-Path $StagingDir  $dir
    Copy-WithFilter $src $dest
}

# Copy individual root-level files
foreach ($file in $IncludeFiles) {
    $src  = Join-Path $ProjectRoot $file
    $dest = Join-Path $StagingDir  $file
    Copy-WithFilter $src $dest
}

# ------------------------------------------------------------------------------
# 5. Verify staged content
# ------------------------------------------------------------------------------
Write-Section "Verifying Staged Content"

$stagedFiles = Get-ChildItem -Recurse -File $StagingDir
Write-OK "Total files staged: $($stagedFiles.Count)"

$criticalStaged = @(
    "backend\main.py",
    "backend\requirements.txt",
    "frontend\package.json",
    "frontend\package-lock.json",
    "frontend\src\App.jsx",
    "frontend\src\index.css",
    "data\sample_creditcard.csv",
    "models\preprocessor.joblib",
    "models\logistic_regression.joblib",
    "models\random_forest.joblib",
    "models\isolation_forest.joblib",
    "CONTINUATION_STATUS.md"
)

foreach ($cf in $criticalStaged) {
    $fp = Join-Path $StagingDir $cf
    if (Test-Path $fp) { Write-OK "Present: $cf" }
    else {
        Remove-Item $StagingDir -Recurse -Force
        throw "Required file was not staged: $cf"
    }
}

# Check if models are present
$modelFiles = Get-ChildItem -Path (Join-Path $StagingDir "models") -Filter "*.joblib" -ErrorAction SilentlyContinue
Write-OK "Model files staged: $($modelFiles.Count) .joblib files"

# ------------------------------------------------------------------------------
# 6. Create ZIP from staging directory
# ------------------------------------------------------------------------------
Write-Section "Creating ZIP Archive"

if (Test-Path $ZipOutput) {
    Write-WARN "Removing existing ZIP: $ZipName"
    Remove-Item $ZipOutput -Force
}

Write-INFO "Compressing $($stagedFiles.Count) files to: $ZipOutput"

try {
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    [System.IO.Compression.ZipFile]::CreateFromDirectory(
        $StagingDir,
        $ZipOutput,
        [System.IO.Compression.CompressionLevel]::Optimal,
        $false  # do NOT include base directory name
    )
    Write-OK "ZIP created successfully."
} catch {
    Write-ERR "ZIP creation failed: $_"
    Write-ERR "Try running PowerShell as Administrator if you have permission issues."
    Remove-Item $StagingDir -Recurse -Force -ErrorAction SilentlyContinue
    exit 1
}

# ------------------------------------------------------------------------------
# 7. Verify ZIP integrity
# ------------------------------------------------------------------------------
Write-Section "Verifying ZIP Integrity"

$verificationDir = $null
try {
    $zip = [System.IO.Compression.ZipFile]::OpenRead($ZipOutput)
    $entryNames = @($zip.Entries | ForEach-Object { $_.FullName })
    $entryCount = $entryNames.Count
    $zip.Dispose()

    $verificationDir = Join-Path $env:TEMP "FAD_verify_$([System.IO.Path]::GetRandomFileName().Replace('.',''))"
    Expand-Archive -LiteralPath $ZipOutput -DestinationPath $verificationDir
    foreach ($cf in $criticalStaged) {
        if (-not (Test-Path (Join-Path $verificationDir $cf))) {
            throw "ZIP verification failed; required entry is missing: $cf"
        }
    }
    $unsafeEntries = @($entryNames | Where-Object {
        $_ -match '(^|/)(\.env(?:\.[^/]*)?|node_modules|__pycache__|\.pytest_cache|dist|\.venv|venv)(/|$)' -and
        $_ -notmatch '(^|/)\.env\.example$'
    })
    if ($unsafeEntries.Count -gt 0) {
        throw "ZIP contains excluded or private files: $($unsafeEntries -join ', ')"
    }
    Remove-Item $verificationDir -Recurse -Force
    Write-OK "ZIP extracted and verified. Contains $entryCount entries and all required files."
} catch {
    Write-ERR "ZIP integrity check failed: $_"
    if ($verificationDir -and (Test-Path $verificationDir)) {
        Remove-Item $verificationDir -Recurse -Force -ErrorAction SilentlyContinue
    }
    if (Test-Path $StagingDir) {
        Remove-Item $StagingDir -Recurse -Force -ErrorAction SilentlyContinue
    }
    if (Test-Path $ZipOutput) {
        Remove-Item $ZipOutput -Force -ErrorAction SilentlyContinue
    }
    exit 1
}

# Display ZIP file info
$zipItem = Get-Item $ZipOutput
Write-OK "ZIP file: $($zipItem.Name)"
Write-OK "ZIP size: $([Math]::Round($zipItem.Length / 1MB, 2)) MB"
Write-OK "ZIP path: $ZipOutput"

# ------------------------------------------------------------------------------
# 8. Cleanup staging directory
# ------------------------------------------------------------------------------
Write-Section "Cleanup"
Remove-Item $StagingDir -Recurse -Force
Write-OK "Staging directory removed."

# ------------------------------------------------------------------------------
# 9. Final summary
# ------------------------------------------------------------------------------
Write-Section "Packaging Complete"
Write-Host ""
Write-Host "  Output ZIP : $ZipOutput" -ForegroundColor Green
Write-Host "  Size       : $([Math]::Round($zipItem.Length / 1MB, 2)) MB" -ForegroundColor Green
Write-Host "  Entries    : $entryCount files" -ForegroundColor Green
Write-Host ""
Write-Host "  To verify the ZIP manually:" -ForegroundColor Cyan
Write-Host "    Expand-Archive -Path `"$ZipOutput`" -DestinationPath `"$OutputDir\verify_test`"" -ForegroundColor White
Write-Host ""
Write-Host "  Packaging complete at $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Cyan
