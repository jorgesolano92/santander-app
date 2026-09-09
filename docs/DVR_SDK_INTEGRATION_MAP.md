# Mapa de Integracion DVR SDK (Expo/Android)

## Objetivo

Dejar camino funcional para pruebas de:
- video en vivo (LivePlay),
- intercomunicacion de voz (VoiceCom),
- captura JPEG como validacion auxiliar.

## Archivos clave del SDK y rol real

- `sdk/Doc/code/preview.cpp`: referencia principal para video en vivo (`NET_SDK_LivePlay`).
- `sdk/Doc/code/ptz.cpp`: confirma flujo de live + control de camara.
- `sdk/Doc/code/voice_intercom/voice_intercom.cpp`: arranque/parada de voz.
- `sdk/Doc/code/voice_intercom/voice_forward.cpp`: envio de PCM (`NET_SDK_VoiceComSendData`).
- `sdk/Doc/code/video_capture/capture_data.cpp`: snapshot JPEG en memoria (auxiliar).
- `sdk/Doc/code/video_capture/capture_file.cpp`: snapshot JPEG a archivo (auxiliar).

## Estado implementado en la app

### Bridge nativo Android

- `android/app/src/main/java/com/puertas/santander/dvrsdk/DvrSdkManager.java`
  - Login/Logout
  - `startLivePreview(channel, streamType)`
  - `stopLivePreview()`
  - `startVoiceIntercom(channel)`
  - `sendVoiceData(byte[])`
  - `stopVoiceIntercom()`
  - Implementacion con reflexion para tolerar diferencias de version en `dvrsdk.jar`.

- `android/app/src/main/java/com/puertas/santander/dvrsdk/DvrSdkModule.java`
  - Expuesto a React Native:
    - `startLivePreview(channel, streamType)`
    - `stopLivePreview()`
    - `startVoiceIntercom(channel)`
    - `sendVoiceData(base64Pcm)`
    - `stopVoiceIntercom()`

### Capa TypeScript

- `services/DvrSdkService.ts`
  - Nuevos metodos:
    - `startLivePreview`
    - `stopLivePreview`
    - `startVoiceIntercom`
    - `sendVoiceData`
    - `stopVoiceIntercom`

### UI de prueba integrada

- `components/DoorVideoStream.tsx`
  - Botones para:
    - conectar SDK,
    - iniciar/detener live,
    - iniciar/detener intercom.
  - Muestra handles de live/voice para validar ciclo de vida.

## Flujo de pruebas recomendado

1. Abrir modal manual y conectar a camara.
2. `CONECTAR SDK`:
   - esperado: login OK y datos de dispositivo.
3. `INICIAR LIVE`:
   - esperado: handle > 0.
4. `DETENER LIVE`:
   - esperado: cierre sin error.
5. `INICIAR INTERCOM`:
   - esperado: handle > 0.
6. `DETENER INTERCOM`:
   - esperado: cierre sin error.

## Gaps pendientes para produccion

- Render de video nativo en pantalla RN (SurfaceView/TextureView o pipeline de callbacks).
- Captura de microfono en Android y envio continuo PCM a `sendVoiceData`.
- Reproduccion robusta de audio remoto (callbacks de audio + decoder/audio track).
- Mapeo de errores SDK a mensajes funcionales para soporte.

## Criterio de exito de esta fase

Se considera completa esta fase cuando, en dispositivo Android real:
- login/logout funcionan en ciclo repetido,
- live preview inicia y se detiene sin crash,
- intercom inicia y se detiene sin crash,
- los metodos quedan expuestos para conectar capture/reproduccion de audio en la siguiente iteracion.
