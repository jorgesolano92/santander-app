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

1. Asterisk con IP fija (ej. `192.168.1.50`).
2. Extensiones, ej. `100` = Panphone, `201` = tablet.
3. **WebSocket SIP** habilitado (la tablet no usa UDP 5060):
   - típico: `ws://192.168.1.50:8088/ws` o `wss://…:8089/ws`
4. Panphone → Cuentas SIP → modo **PBX** → servidor = IP Asterisk, ext. `100`.
5. Tablet → modo **SIP** → señalización **PBX / Asterisk**:

| Campo tablet | Ejemplo |
|--------------|---------|
| Host CSIP | `192.168.1.70:8090` |
| API Key | token Custom1 de la placa |
| SIP URI | `sip:201@192.168.1.50` |
| Usuario / Password | `201` / clave Asterisk |
| Dominio | `192.168.1.50` |
| WS SIP | `192.168.1.50:8088/ws` |
| Destino | `sip:100@192.168.1.50` (Panphone) |
| TLS/WSS | On solo si usáis `wss` |

6. Backend (LEDs/notify): `CSIP_BASE_URL=http://192.168.1.70:8090/api/custom1`, etc.

## Capas técnicas

1. **CSIP** (`csipApiClient.ts`): `call_start`, `led_control`, notify.
2. **SIP tablet** (`SipService.ts` + `sip.js` + WebRTC): audio con Asterisk por WebSocket.

## Puente TVT (sin cambios)

Con `intercomMode: bridge` no se usa SIP ni CSIP. Ver `Release_vcx_x64/BRIDGE_ENV.md`.
