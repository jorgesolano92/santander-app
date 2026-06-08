# Script para ver logs específicos de la aplicación
# Uso: .\watch-logs-specific.ps1

$adbPath = "C:\Android\sdk\platform-tools\adb.exe"
$packageName = "com.cess07.puertassantander"

Write-Host "Monitoreando logs de: $packageName" -ForegroundColor Cyan
Write-Host "Filtrando: ERR_CERT, SSL, certificate, RNFetchBlob, SCATI, connection errors`n" -ForegroundColor Yellow

# Limpiar logs
& $adbPath logcat -c

# Ver logs filtrados con etiquetas relevantes
& $adbPath logcat ReactNativeJS:V ReactNative:V AndroidRuntime:E chromium:V *:S | Select-String -Pattern "ERR_CERT|SSL|certificate|RNFetchBlob|trusty|SCATI|sdio12|connection|DoorControl|tryDirectConnection|error" -CaseSensitive:$false

