# Script PowerShell para copiar las librerías del SDK DVR al proyecto Android
# Ejecutar desde la raíz del proyecto: .\scripts\setup-dvr-sdk.ps1

Write-Host "Configurando SDK DVR para Android..." -ForegroundColor Green

$sdkPath = "sdk\Android\demo\app\libs"
$targetJniLibsPath = "android\app\src\main\jniLibs"
$targetLibsPath = "android\app\libs"

# Verificar que existe el SDK
if (-not (Test-Path $sdkPath)) {
    Write-Host "ERROR: No se encontró el SDK en $sdkPath" -ForegroundColor Red
    exit 1
}

# Crear directorios si no existen
if (-not (Test-Path $targetJniLibsPath)) {
    New-Item -ItemType Directory -Path $targetJniLibsPath -Force | Out-Null
    Write-Host "Creado directorio: $targetJniLibsPath" -ForegroundColor Yellow
}

if (-not (Test-Path $targetLibsPath)) {
    New-Item -ItemType Directory -Path $targetLibsPath -Force | Out-Null
    Write-Host "Creado directorio: $targetLibsPath" -ForegroundColor Yellow
}

# Copiar librerías nativas (.so)
Write-Host "Copiando librerías nativas..." -ForegroundColor Cyan

$arm64Path = "$sdkPath\arm64-v8a"
$arm32Path = "$sdkPath\armeabi-v7a"

if (Test-Path $arm64Path) {
    $targetArm64 = "$targetJniLibsPath\arm64-v8a"
    if (-not (Test-Path $targetArm64)) {
        New-Item -ItemType Directory -Path $targetArm64 -Force | Out-Null
    }
    Copy-Item "$arm64Path\*.so" -Destination $targetArm64 -Force
    Write-Host "  ✓ Copiadas librerías arm64-v8a" -ForegroundColor Green
} else {
    Write-Host "  ⚠ No se encontró arm64-v8a" -ForegroundColor Yellow
}

if (Test-Path $arm32Path) {
    $targetArm32 = "$targetJniLibsPath\armeabi-v7a"
    if (-not (Test-Path $targetArm32)) {
        New-Item -ItemType Directory -Path $targetArm32 -Force | Out-Null
    }
    Copy-Item "$arm32Path\*.so" -Destination $targetArm32 -Force
    Write-Host "  ✓ Copiadas librerías armeabi-v7a" -ForegroundColor Green
} else {
    Write-Host "  ⚠ No se encontró armeabi-v7a" -ForegroundColor Yellow
}

# Copiar JAR
Write-Host "Copiando JAR del SDK..." -ForegroundColor Cyan
$jarPath = "$sdkPath\dvrsdk.jar"
if (Test-Path $jarPath) {
    Copy-Item $jarPath -Destination "$targetLibsPath\dvrsdk.jar" -Force
    Write-Host "  ✓ Copiado dvrsdk.jar" -ForegroundColor Green
} else {
    Write-Host "  ✗ ERROR: No se encontró dvrsdk.jar" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "✓ Configuración del SDK DVR completada!" -ForegroundColor Green
Write-Host ""
Write-Host "Próximos pasos:" -ForegroundColor Yellow
Write-Host "1. Verifica que android/app/build.gradle incluya: implementation files('libs/dvrsdk.jar')"
Write-Host "2. Limpia y reconstruye el proyecto: cd android && ./gradlew clean"
Write-Host "3. Ejecuta la app en un dispositivo físico Android"

