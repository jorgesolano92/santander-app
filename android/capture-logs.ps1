# Script para capturar logs específicos después de probar la app
# Uso: Ejecuta este script DESPUÉS de intentar cambiar el modo o conectar

$adbPath = "C:\Android\sdk\platform-tools\adb.exe"

Write-Host "=== Capturando logs relevantes ===" -ForegroundColor Cyan
Write-Host ""

# Capturar logs del buffer actual
Write-Host "Logs capturados:" -ForegroundColor Yellow
& $adbPath logcat -d | Select-String -Pattern "ERR_CERT|SSL|certificate|RNFetchBlob|trusty|SCATI|sdio12|connection|DoorControl|tryDirectConnection|error|ReactNativeJS|AndroidRuntime|failed|exception" -CaseSensitive:$false | Select-Object -Last 200

Write-Host "`n=== Fin de logs ===" -ForegroundColor Cyan
Write-Host "`nSi no ves logs relevantes, ejecuta en tiempo real:" -ForegroundColor Yellow
Write-Host "  .\watch-logs-specific.ps1" -ForegroundColor Green

