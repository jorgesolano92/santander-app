# API CSIP / SIP — integración (deshabilitada en UI)

> **Operación actual:** solo **puente PC** (`audio_bridge.py`).  
> SIP y SDK Android están ocultos. Para reactivarlos: `config/intercomFeatures.ts` → `INTERCOM_BRIDGE_ONLY = false`.

Documentación oficial CSIP: [CSIP V6 OpenAPI custom1](https://www.panphone.es/doc/csip/v6/api/custom1/)

La app soporta **tres modos de intercom** por puerta (cuando `INTERCOM_BRIDGE_ONLY` es `false`):

| Modo | Uso | Requisitos |
|------|-----|------------|
| **Puente PC** (`bridge`) | Tablet ↔ WebSocket ↔ `audio_bridge.py` ↔ SDK cámara TVT | PC industrial con `Release_vcx_x64`, ZeroTier/LAN |
| **SDK nativo** (`sdk`) | Tablet ↔ SDK Android ↔ cámara | APK compilada, micrófono |
| **SIP / CSIP** (`sip`) | Tablet SIP + API REST en tarjeta CSIP | Credenciales PBX y/o API CSIP (cuando estén disponibles) |

## Modo SIP — dos capas

1. **API CSIP custom1** (`services/csipApiClient.ts`): marcación remota y LEDs en la tarjeta Panphone.
   - Base: `{http|https}://{host}/api/custom1`
   - Auth: `X-API-KEY` o `Authorization: Bearer <token>`
   - Endpoints: `call_start.php`, `led_control.php`, `button_event.php`

2. **Cliente SIP en tablet** (`services/SipService.ts` con `sip.js` + `react-native-webrtc`): audio bidireccional cuando exista cuenta SIP en el PBX.

Puedes usar solo CSIP (marcación en hardware), solo SIP (audio en tablet) o ambos.

## Campos de configuración (por puerta)

### Cuenta SIP (tablet)
- `sipUri`, `sipUsername`, `sipPassword`, `sipDomain`
- `sipServer` — WebSocket del PBX (ej. `pbx.local:5066`)
- `sipCallDestination` — destino al marcar (opcional)

### API CSIP
- `csipApiHost` — ej. `192.168.1.50:8090`
- `csipApiUseHttps`
- `csipApiKey` o `csipBearerToken`
- `csipCallTargetType` — `default` | `number` | `ip`
- `csipCallTarget`, `csipCallUser`
- `csipButtonId` — `p1` o `p2` (mapeo Calle/Oficina)

## Activación cuando tengáis accesos

1. En configuración, modo **SIP / CSIP**.
2. Rellenar host CSIP + API key **o** cuenta SIP (o ambos).
3. En modo manual, pulsar **INTERCOM SIP** en la puerta.

Sin credenciales, la app avisa qué falta y sugiere seguir con el **puente PC**.

## Puente actual (sin cambios)

`audio_bridge.py` sigue igual. Con `intercomMode: bridge` no se usa SIP ni CSIP.

Ver también: `Release_vcx_x64/BRIDGE_ENV.md`
