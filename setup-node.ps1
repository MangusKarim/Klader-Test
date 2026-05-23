# setup-node.ps1
# Setup script to download and extract portable Node.js for Windows

$NodeDir = Join-Path $PSScriptRoot ".node-portable"
$TempZip = Join-Path $PSScriptRoot "node-temp.zip"
$TempDir = Join-Path $PSScriptRoot "node-temp-extract"

# Force recreate NodeDir if it is the old version
if (Test-Path $NodeDir) {
    Remove-Item -Path $NodeDir -Recurse -Force -ErrorAction SilentlyContinue
}

Write-Host "Downloading portable Node.js (v22.12.0)..."
curl.exe -L -o $TempZip "https://nodejs.org/dist/v22.12.0/node-v22.12.0-win-x64.zip"

if (-not (Test-Path $TempZip)) {
    Write-Error "Failed to download Node.js zip file."
    exit 1
}

Write-Host "Extracting zip file..."
# Use tar -xf if available as it is much faster on Windows 10+
if (Get-Command tar -ErrorAction SilentlyContinue) {
    New-Item -ItemType Directory -Path $TempDir -Force | Out-Null
    tar -xf $TempZip -C $TempDir
} else {
    Expand-Archive -Path $TempZip -DestinationPath $TempDir -Force
}

# Find the extracted folder
$ExtractedFolder = Get-ChildItem -Path $TempDir | Select-Object -First 1

if ($ExtractedFolder) {
    Write-Host "Installing to $NodeDir..."
    Move-Item -Path $ExtractedFolder.FullName -Destination $NodeDir -Force
} else {
    Write-Error "Failed to locate extracted Node.js folder."
    exit 1
}

Write-Host "Cleaning up temp files..."
Remove-Item -Path $TempZip -Force -ErrorAction SilentlyContinue
Remove-Item -Path $TempDir -Recurse -Force -ErrorAction SilentlyContinue

Write-Host "Portable Node.js configured successfully!"
