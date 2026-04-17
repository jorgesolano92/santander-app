# Script para revisar logs de la aplicación Android
# Uso: .\debug-logs.ps1

$adbPath = "C:\Android\sdk\platform-tools\adb.exe"

Write-Host "Verificando dispositivo..." -ForegroundColor Cyan
$devices = & $adbPath devices
Write-Host $devices

if ($devices -match "device$") {
    Write-Host "`nDispositivo conectado. Capturando logs..." -ForegroundColor Green
    Write-Host "Presiona Ctrl+C para detener`n" -ForegroundColor Yellow
    
    # Limpiar logs anteriores
    & $adbPath logcat -c
    
    # Filtrar logs relevantes
    & $adbPath logcat | Select-String -Pattern "ERR_CERT|SSL|certificate|RNFetchBlob|trusty|SCATI|sdio12|connection|error|DoorControl|tryDirectConnection|ReactNativeJS" -Context 2,2
} else {
    Write-Host "`nERROR: No hay dispositivos conectados o autorizados." -ForegroundColor Red
    Write-Host "Asegúrate de:" -ForegroundColor Yellow
    Write-Host "1. Conectar el dispositivo USB"
    Write-Host "2. Habilitar Depuración USB en el dispositivo"
    Write-Host "3. Autorizar la conexión cuando aparezca el diálogo"
}

