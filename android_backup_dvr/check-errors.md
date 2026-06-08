# Guía para revisar errores en el APK con ADB

## Pasos:

1. **Conectar y autorizar el dispositivo:**
   - Conecta el dispositivo Android por USB
   - Habilita "Depuración USB" en el dispositivo
   - Autoriza la conexión cuando aparezca el diálogo

2. **Verificar que el dispositivo esté conectado:**
   ```powershell
   & "C:\Android\sdk\platform-tools\adb.exe" devices
   ```
   Debe mostrar: `R9WT9076VMN    device` (no "unauthorized")

3. **Ver logs en tiempo real:**

   **Opción simple:**
   ```powershell
   .\watch-logs-specific.ps1
   ```

   **Opción manual:**
   ```powershell
   # Limpiar logs anteriores
   & "C:\Android\sdk\platform-tools\adb.exe" logcat -c
   
   # Ver logs filtrados
   & "C:\Android\sdk\platform-tools\adb.exe" logcat ReactNativeJS:V ReactNative:V AndroidRuntime:E *:S | Select-String -Pattern "ERR_CERT|SSL|certificate|RNFetchBlob|trusty|SCATI|sdio12|connection|DoorControl|tryDirectConnection|error"
   ```

4. **Probar la funcionalidad:**
   - Abre la app en el dispositivo
   - Intenta cambiar el modo o conectar al servidor SCATI
   - Observa los logs en tiempo real

## Qué buscar en los logs:

### Errores de certificado SSL:
- `ERR_CERT_AUTHORITY_INVALID`
- `SSL handshake failed`
- `Certificate validation failed`

### Errores de RNFetchBlob:
- `RNFetchBlob`
- `trusty`
- Mensajes sobre configuración SSL

### Errores de conexión:
- `connection failed`
- `unable to connect`
- `timeout`
- Errores de red

### Logs de nuestra app:
- `DoorControlService`
- `tryDirectConnection`
- `SCATI`
- `sdio12`

### Errores generales:
- `AndroidRuntime:E` - Errores fatales
- `ReactNativeJS:V` - Logs de JavaScript

## Si encuentras errores de certificado SSL:

El error original `ERR_CERT_AUTHORITY_INVALID` debería estar resuelto con:
1. `RNFetchBlob` configurado con `trusty: true` en el código
2. `network_security_config.xml` configurado correctamente

Si aún aparece, puede ser que:
- El código no esté usando RNFetchBlob (verifica los logs)
- Haya un problema con la versión de RNFetchBlob
- Necesitemos agregar más configuración

