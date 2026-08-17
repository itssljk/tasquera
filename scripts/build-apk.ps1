$ErrorActionPreference = "Stop"

$projectRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$keystoreProps = Join-Path $projectRoot "android\keystore.properties"
$keystoreFile = Join-Path $projectRoot "android\tasquera-release.keystore"

Write-Host "==> [1/4] Checking Release Signing Keystore..." -ForegroundColor Cyan
if (-not (Test-Path $keystoreProps) -or -not (Test-Path $keystoreFile)) {
    Write-Host ""
    Write-Host "[ERROR] Release signing keystore not found." -ForegroundColor Red
    Write-Host ""
    Write-Host "The release APK must be signed with a keystore only you control." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "  1. Generate the keystore:" -ForegroundColor Yellow
    Write-Host '     keytool -genkeypair -v -keystore android\tasquera-release.keystore -alias tasquera -keyalg RSA -keysize 2048 -validity 10000'
    Write-Host ""
    Write-Host "  2. Create android\keystore.properties with:" -ForegroundColor Yellow
    Write-Host "     storeFile=tasquera-release.keystore"
    Write-Host "     storePassword=<your password>"
    Write-Host "     keyAlias=tasquera"
    Write-Host "     keyPassword=<your password>"
    Write-Host ""
    Write-Host "Both files are gitignored. Back them up - losing the keystore" -ForegroundColor Yellow
    Write-Host "means existing installs can never be updated with the same signature." -ForegroundColor Yellow
    Write-Host ""
    exit 1
}
Write-Host "Keystore found: android\tasquera-release.keystore" -ForegroundColor Green

Write-Host "`n==> [2/4] Building Web Assets..." -ForegroundColor Cyan
npm run build
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "`n==> [3/4] Syncing Capacitor Android Project..." -ForegroundColor Cyan
npx cap sync android
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "`n==> [4/4] Compiling Signed Release APK (assembleRelease)..." -ForegroundColor Cyan
# Prefer an existing JAVA_HOME / ANDROID_HOME; fall back to common defaults.
if (-not $env:JAVA_HOME) {
    $env:JAVA_HOME = "C:\Program Files\Microsoft\jdk-21.0.12.8-hotspot"
}
if (-not $env:ANDROID_HOME) {
    $env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
}
$env:Path = "$env:JAVA_HOME\bin;$env:ANDROID_HOME\platform-tools;$env:Path"

# Keep the Android version in sync with package.json (e.g. 1.0.0).
$appVersion = (Get-Content (Join-Path $projectRoot "package.json") | ConvertFrom-Json).version
Write-Host "Version: v$appVersion" -ForegroundColor DarkGray

Push-Location android
try {
    # Build the argument first: PowerShell 5.1 passes a bare `-P...=$var`
    # token literally (the $var is NOT expanded), but expands it fine when
    # the token comes from a variable.
    $versionArg = "-PappVersionName=$appVersion"
    .\gradlew.bat assembleRelease $versionArg
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
} finally {
    Pop-Location
}

$apkPath = "android\app\build\outputs\apk\release\app-release.apk"
if (Test-Path $apkPath) {
    $apkItem = Get-Item $apkPath
    $sizeMB = [Math]::Round($apkItem.Length / 1MB, 2)

    # Emit the self-update manifest (checked by the Android app). Upload it to
    # the GitHub Release alongside the APK.
    $verParts = ($appVersion -replace '^v', '') -split '\.'
    $major = [int]$verParts[0]
    $minor = if ($verParts.Length -gt 1) { [int]$verParts[1] } else { 0 }
    $patch = if ($verParts.Length -gt 2) { [int]$verParts[2] } else { 0 }
    $versionCode = $major * 10000 + $minor * 100 + $patch
    $sha256 = (Get-FileHash -Algorithm SHA256 -Path $apkPath).Hash.ToLower()
    $releaseDir = Split-Path -Parent $apkPath
    $updateJson = @{
        versionCode  = [int]$versionCode
        versionName  = $appVersion
        sha256       = $sha256
        releaseNotes = ""
        apkUrl       = "https://github.com/itssljk/tasquera/releases/latest/download/app-release.apk"
    } | ConvertTo-Json
    [System.IO.File]::WriteAllText(
        (Join-Path $releaseDir "update.json"),
        $updateJson,
        (New-Object System.Text.UTF8Encoding $false)
    )

    Write-Host "`n[SUCCESS] Signed Release APK Build Complete! ($sizeMB MB)" -ForegroundColor Green
    Write-Host "Location: $apkPath" -ForegroundColor Green
    Write-Host "Manifest: $(Join-Path $releaseDir 'update.json')" -ForegroundColor Green
}
