# Script para solucionar problemas de conexión ADB
# Uso: .\fix-adb-connection.ps1

$adbPath = "C:\Android\sdk\platform-tools\adb.exe"

Write-Host "=== Solucionando conexión ADB ===" -ForegroundColor Cyan
Write-Host ""

# 1. Matar y reiniciar el servidor ADB
Write-Host "1. Reiniciando servidor ADB..." -ForegroundColor Yellow
& $adbPath kill-server
Start-Sleep -Seconds 2
& $adbPath start-server
Start-Sleep -Seconds 2

# 2. Verificar dispositivos
Write-Host "`n2. Verificando dispositivos conectados..." -ForegroundColor Yellow
$devices = & $adbPath devices
Write-Host $devices

# 3. Verificar estado
if ($devices -match "unauthorized") {
    Write-Host "`n⚠️  DISPOSITIVO NO AUTORIZADO" -ForegroundColor Red
    Write-Host ""
    Write-Host "Por favor, en tu dispositivo Android:" -ForegroundColor Yellow
    Write-Host "1. Ve a: Configuración > Opciones de desarrollador" -ForegroundColor White
    Write-Host "2. Busca: 'Revocar autorizaciones de depuración USB'" -ForegroundColor White
    Write-Host "3. Tócalo para revocar todas las autorizaciones" -ForegroundColor White
    Write-Host "4. Desconecta y vuelve a conectar el cable USB" -ForegroundColor White
    Write-Host "5. Cuando aparezca el diálogo, autoriza la conexión" -ForegroundColor White
    Write-Host ""
    Write-Host "Luego ejecuta: adb devices" -ForegroundColor Cyan
} elseif ($devices -match "device\s*$") {
    Write-Host "`n✅ Dispositivo conectado y autorizado correctamente!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Puedes ver los logs con:" -ForegroundColor Cyan
    Write-Host "  .\watch-logs-specific.ps1" -ForegroundColor Green
} else {
    Write-Host "`n⚠️  No se detectaron dispositivos" -ForegroundColor Red
    Write-Host ""
    Write-Host "Asegúrate de:" -ForegroundColor Yellow
    Write-Host "1. Conectar el dispositivo por USB" -ForegroundColor White
    Write-Host "2. Habilitar 'Depuración USB' en Opciones de desarrollador" -ForegroundColor White
    Write-Host "3. Verificar que el cable USB funcione (prueba otro cable)" -ForegroundColor White
}

Write-Host ""

