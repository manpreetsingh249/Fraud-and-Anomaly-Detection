# PACKAGING GUIDE — Fraud & Anomaly Detection Project
**Platform:** Windows 10/11  
**PowerShell:** 5.1 or newer required

---

## Why ZIP Compression Fails on This Project

The most common causes of ZIP failure for this project are:

| Cause | Description |
|---|---|
| **`node_modules/`** | Contains 70,000+ deeply nested files. Windows ZIP tools fail on paths > 260 characters. |
| **`__pycache__/`** | Byte-compiled `.pyc` files — unnecessary, can cause path issues. |
| `frontend/dist/` | Built output — can always be recreated with `npm run build`. |
| `.pytest_cache/` | Pytest cache — never needed in the archive. |
| `*.db` files | SQLite database — regenerated automatically at startup. |
| Large `.joblib` files | Model files are important and **must** be included. |

**Solution:** Always use the provided packaging script, which copies only required files to a clean staging folder before compression.

---

## Quick Start — Create the ZIP

### Step 1 — Open PowerShell

Right-click the Start menu → **Windows PowerShell** (or **Terminal**).

### Step 2 — Allow Script Execution (one-time)

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
```

### Step 3 — Navigate to the Project

```powershell
cd "d:\Fraud & Anomaly detection"
```

### Step 4 — Run the Packaging Script

```powershell
.\scripts\package_project.ps1
```

The script will:
1. Fail early if required application, dataset, or trained-model files are missing.
2. Copy application source and required assets to a temporary staging folder.
3. Exclude dependency/build/cache folders, database files, and private environment/credential files.
4. Include `frontend/package-lock.json` for repeatable frontend dependency installation.
5. Create a dated ZIP in a sibling output folder, outside the project.
6. Extract the ZIP to a temporary verification folder and confirm required files are present.
7. Remove the temporary staging and verification folders.

---

## Output Location

The ZIP is created **outside** the project directory to prevent self-referential compression:

```
d:\
├── Fraud & Anomaly detection\        ← your project
└── Fraud_Anomaly_Detection_Package_Output\
    └── Fraud_Anomaly_Detection_v<date>_<time>.zip     ← output here
```

---

## Custom Output Directory

```powershell
.\scripts\package_project.ps1 -OutputDir "C:\Users\HP\Desktop\Output"
```

---

## Custom ZIP Name

```powershell
.\scripts\package_project.ps1 -ZipName "FAD_Final_Submission.zip"
```

---

## What Is Included in the ZIP

| Path | Included? | Reason |
|---|---|---|
| `backend/` | ✅ Yes | All Python source code |
| `backend/requirements.txt` | ✅ Yes | Dependency list |
| `frontend/src/` | ✅ Yes | All React source files |
| `frontend/package.json` | ✅ Yes | Node dependency declarations |
| `frontend/package-lock.json` | ✅ Yes | Reproducible npm dependency versions |
| `frontend/vite.config.js` | ✅ Yes | Build configuration |
| `frontend/index.html` | ✅ Yes | HTML entry point |
| `models/*.joblib` | ✅ Yes | Trained ML model files |
| `data/sample_creditcard.csv` | ✅ Yes | Sample dataset |
| `scripts/` | ✅ Yes | This packaging script |
| `README.md` | ✅ Yes | Setup and run documentation |
| `PROJECT_AUDIT.md` | ✅ Yes | Architecture documentation |
| `UI_REDESIGN_REPORT.md` | ✅ Yes | UI design documentation |
| `TEST_REPORT.md` | ✅ Yes | Test history and coverage notes |
| `CONTINUATION_STATUS.md` | ✅ Yes | Current continuation checkpoint |
| `.env.example` | ✅ Yes | Configuration template |
| `.gitignore` | ✅ Yes | Source control rules |
| `frontend/node_modules/` | ❌ **Excluded** | 70,000+ files, regenerable via `npm install` |
| `frontend/dist/` | ❌ **Excluded** | Build output, regenerable via `npm run build` |
| `backend/__pycache__/` | ❌ **Excluded** | Byte-compiled Python, auto-regenerated |
| `.pytest_cache/` | ❌ **Excluded** | Test cache, auto-regenerated |
| `fraud_detection.db` | ❌ **Excluded** | SQLite database, auto-created at startup |
| `reports/` | ❌ **Excluded** | Generated reports, recreatable |
| `.env` | ❌ **Excluded** | Would contain secrets — never package |
| `*.pem`, `*.key`, `*.p12`, `*.pfx`, `secrets.*` | ❌ **Excluded** | Private credentials/certificates |

---

## Verify the ZIP After Creation

### Method 1 — PowerShell (recommended)

```powershell
# List all entries in the ZIP
Add-Type -AssemblyName System.IO.Compression.FileSystem
$zip = [System.IO.Compression.ZipFile]::OpenRead("D:\Fraud_Anomaly_Detection_Package_Output\Fraud_Anomaly_Detection_v2026-10-26_1800.zip")
$zip.Entries | Select-Object FullName | Sort-Object FullName | Format-Table -AutoSize
$zip.Dispose()
```

### Method 2 — Extract and Test

```powershell
Expand-Archive `
  -Path "D:\...\Fraud_Anomaly_Detection_v....zip" `
  -DestinationPath "D:\TestExtract"
```

Then follow the README.md setup steps inside `D:\TestExtract\`.

---

## Setting Up After Extracting the ZIP

Once you extract the ZIP on another machine, follow these steps:

### 1 — Install Python dependencies

```cmd
cd "path\to\extracted\folder"
pip install -r backend\requirements.txt
```

### 2 — Install Node dependencies

```cmd
cd frontend
npm ci
```

### 3 — Start the backend (Terminal 1)

```cmd
cd "path\to\extracted\folder"
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
```

### 4 — Start the frontend (Terminal 2)

```cmd
cd "path\to\extracted\folder\frontend"
npm run dev
```

### 5 — Open the application

Navigate to: **http://localhost:5173/**

---

## Troubleshooting

### "Execution of scripts is disabled"
```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
```

### "Access denied" on ZIP creation
Run PowerShell as Administrator, or change `-OutputDir` to a path you have write access to.

### "Insufficient disk space"
The script requires 500 MB free. Clear temporary files or use a different output drive.

### ZIP created but extraction fails
The ZIP may be corrupt. Delete it and re-run the script. If the issue persists:
```powershell
# Test ZIP integrity
$zip = [System.IO.Compression.ZipFile]::OpenRead("path\to\file.zip")
Write-Host "Entries: $($zip.Entries.Count)"
$zip.Dispose()
```

### Long path errors on Windows
Enable long path support (requires Admin):
```powershell
Set-ItemProperty `
  -Path "HKLM:\SYSTEM\CurrentControlSet\Control\FileSystem" `
  -Name "LongPathsEnabled" -Value 1
```

---

## File Size Reference

Approximate sizes for the clean package (excluding node_modules):

| Component | Approximate Size |
|---|---|
| Backend Python source | ~150 KB |
| Frontend React source | ~200 KB |
| ML model files (4 .joblib) | ~1.1 MB |
| Sample dataset | ~55 KB |
| Documentation | ~50 KB |
| **Total (compressed ZIP)** | **~800 KB – 1.5 MB** |

The package is smaller than the working folder because dependencies, build output, caches, the SQLite database, and generated reports are recreated as needed.
