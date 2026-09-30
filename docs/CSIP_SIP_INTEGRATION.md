# API CSIP / SIP — integración (Asterisk listo)

> **Operación actual de vídeo/audio TVT:** puente PC (`audio_bridge.py`) o SDK.  
> **Audio Panphone:** cuando exista Asterisk, modo **SIP** + señalización **PBX / Asterisk**.  
> Flag: `config/intercomFeatures.ts` → `INTERCOM_BRIDGE_ONLY = false` (ya activo para poder elegir SIP).

Documentación oficial CSIP: [CSIP V6 OpenAPI custom1](https://www.panphone.es/doc/csip/v6/api/custom1/)

## Modos de intercom por puerta

| Modo | Uso | Requisitos |
|------|-----|------------|
| **Puente PC** (`bridge`) | Tablet ↔ WS ↔ `audio_bridge.py` ↔ cámara TVT | PC industrial |
| **SDK nativo** (`sdk`) | Tablet ↔ SDK Android ↔ cámara | APK, micrófono |
| **SIP / CSIP** (`sip`) | Panphone API + audio vía PBX | Asterisk + CSIP |

## Señalización SIP (`sipSignaling`)

| Valor | Uso |
|-------|-----|
| **`pbx`** (por defecto, recomendado) | Asterisk u otra centralita. Audio en tablet con `sip.js` (WebSocket). |
| **`p2p`** | Solo `call_start` IP (pruebas sin PBX). **Sin audio en la tablet.** |

Si Asterisk no se monta, alternativa futura: Linphone SDK / PJSIP (UDP nativo). Mientras tanto la app queda preparada para Asterisk.

## Checklist Asterisk (cuando esté en red)

1. Asterisk/FreePBX con IP fija (ej. `192.168.1.154`).
2. Extensiones (mapa actual sucursal):
   - `100` = Panphone Oficina `.70` (secret `Santander100`)
   - `101` = Panphone Calle `.80` (secret `Santander101`)
   - `201` = Tablet 1 WebRTC (secret `Santander201`)
   - `202` = Tablet 2 WebRTC (secret `Santander202`)
   - Ring group `200` = tablets `201`+`202` (destino de llamada desde Panphone)
3. **WebSocket SIP** habilitado (la tablet no usa UDP 5060):
   - típico: `ws://192.168.1.154:8088/ws` o `wss://…:8089/ws`
4. Panphone → Cuentas SIP → modo **PBX** → servidor = IP FreePBX; Calle=ext `101`, Oficina=ext `100`; destino llamada = `200`.
5. Tablet → modo **SIP** → señalización **PBX / Asterisk**:

| Campo tablet | Ejemplo |
|--------------|---------|
| Host CSIP Calle | `192.168.1.80:8090` |
| Host CSIP Oficina | `192.168.1.70:8090` |
| API Key | token Custom1 de la placa |
| SIP URI (tablet1) | `sip:201@192.168.1.154` |
| SIP URI (tablet2) | `sip:202@192.168.1.154` |
| Usuario / Password | `201`/`Santander201` o `202`/`Santander202` |
| Dominio | `192.168.1.154` |
| WS SIP | `192.168.1.154:8088/ws` |
| Destino Calle | `sip:101@192.168.1.154` |
| Destino Oficina | `sip:100@192.168.1.154` |
| TLS/WSS | On solo si usáis `wss` |

6. Backend (LEDs/notify), **N Panphones** (recomendado):

```env
CSIP_ENABLED=true
CSIP_DEVICES={"p1":{"base_url":"http://192.168.1.80:8090/api/custom1","token":"KEY","led":"p1"},"p2":{"base_url":"http://192.168.1.70:8090/api/custom1","token":"KEY","led":"p1"}}
CSIP_LED_BRIGHTNESS=5
```

Cada placa: `notification_url` → `http://192.168.1.155:8000/api/csip/notify` (base; la placa añade `/p1` o `/p2`).  
Legacy (1 placa): `CSIP_BASE_URL=http://192.168.1.70:8090/api/custom1`.

## Notas operación (mapa A listo en FreePBX)

- FreePBX ya tiene: `100`, `101`, `201`, `202` + ring group `200` (201+202). Apply hecho.
- Panel `.155` `PUT /api/config/tablet` y APK `defaultDoorAppConfig`: P1→`.80`/destino `101`, P2→`.70`/destino `100`; identidad fábrica tablet = `201`.
- **Tablet 2:** tras instalar APK, en Intercom SIP poner usuario `202` / pass `Santander202` (URI `sip:202@192.168.1.154`). La config de sucursal es global; no hay SIP por `android_id`.
- **Mañana `.80`:** registrar SIP como ext `101` (`Santander101`) en `192.168.1.154` cuando arreglen Custom1; destino de llamada Panphone = `200`. No tocar runtime CSIP hasta entonces.
- **`.70`:** confirmar registro SIP como `100`; destino llamada = `200` (suena ambas tablets).
- Prueba ya: tablet `201` → `sip:100@…` (Oficina). Tras runtime `.80`: tablet → `sip:101@…` + notify `p1`.

## Capas técnicas

1. **CSIP** (`csipApiClient.ts`): `call_start`, `led_control`, notify.
2. **SIP tablet** (`SipService.ts` + `sip.js` + WebRTC): audio con Asterisk por WebSocket.

## Puente TVT (sin cambios)

Con `intercomMode: bridge` no se usa SIP ni CSIP. Ver `Release_vcx_x64/BRIDGE_ENV.md`.
