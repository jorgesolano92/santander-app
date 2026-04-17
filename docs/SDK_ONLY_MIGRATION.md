# Migración a modo SOLO SDK (cámaras)

Objetivo: dejar la app enfocada a la integración nativa del SDK DVR para video/intercom, sin servidor proxy ni stacks legacy Safire/Axis en la app.

## Rama

`feat/sdk-only-camera-cleanup` (no modifica `main` hasta merge explícito).

## Hecho en esta fase

- **Proxy eliminado**: carpeta `proxy/` y toda la rama de `AppMode` (ya no hay toggle ni URL de proxy en la UI).
- **`DoorControlService`**: API2 y SDIO12 solo por HTTPS directo (RNFetchBlob en Android, `fetch` en web).
- **UI de configuración**: sin bloques “usar proxy / URL proxy” en `NewConfigurationModal` y `ConfigurationModal`.
- **`IntercomConfigurationModal`**: sin pruebas ISAPI vía proxy, sin modal de descubrimiento Safire; nota orientada a SDK nativo.
- **Componentes/servicios eliminados**: `AxisTestModal`, `AxisAudioControl`, `AxisIntercomTestModal`, `Safire*`, `AxisSIPService`, `Safire*`, `CameraStream`, `AppMode`, script `scripts/test-safire-audio.js`, documentación `docs/SAFIRE_*.md`.
- **`app/index.tsx`**: sin `AxisTestModal`.
- **`ManualModeModal`**: comentario actualizado (intercom por SDK).

## Pendiente técnico

- Preview de vídeo nativo en `DoorVideoStream` (SurfaceView/TextureView vía módulo Android).
- Intercom/audio según API del SDK expuesta en `DvrSdkService`.

## Validación recomendada

1. `npx expo run:android` (o el flujo de build habitual).
2. Comprobar `DvrSdkService.isAvailable()` en dispositivo.
3. Probar cambio de modo y SDIO12 contra consola real (certificados / `trusty`).

## Notas

- La consola SCATI y API2 siguen siendo el backend de puertas/modos; solo se quitó el intermediario HTTP proxy en el cliente.
