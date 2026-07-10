# Variables de entorno — `audio_bridge.py`

Puente WebSocket en el PC industrial (Windows). La tablet se conecta por ZeroTier/LAN;
el Python mantiene la sesión SDK con la cámara TVT.

## Arranque básico

```powershell
cd Release_vcx_x64
pip install -r bridge_requirements.txt
python audio_bridge.py
```

## Despliegue en el PC industrial

Copia **toda** la carpeta `Release_vcx_x64`, no solo `audio_bridge.py`:

- `DVR_NET_SDK.dll` y el resto de `.dll` del SDK (p. ej. `Play.dll`, …)
- `audio_bridge.py`, `bridge_camera_config.py`, `bridge_cameras.json`, `bridge_requirements.txt`, `test_audio_1.py`

Si falta alguna DLL dependiente, Windows muestra:

`FileNotFoundError: Could not find module '...\DVR_NET_SDK.dll' (or one of its dependencies)`

**Comprobación rápida** en el PC industrial:

```powershell
cd C:\Users\Administrator\Desktop\Release_vcx_x64
dir *.dll
python test_audio_1.py
```

Si `test_audio_1.py` falla igual, el problema es la carpeta del SDK (incompleta o bits incorrectos), no el puente.

**Diagnóstico detallado** (muestra qué DLL concreta falla):

```powershell
python check_sdk_dll.py
```

Si las 10 DLL están en la carpeta pero falla la carga, suele faltar **Visual C++ Redistributable 2015-2022 x64**:

https://aka.ms/vs/17/release/vc_redist.x64.exe

También prueba **Python 3.11 o 3.12** si usas 3.14 (muy reciente). Comprueba que `SDKDEMO_x64.exe` arranca en esa carpeta.

Python **64 bits** + carpeta `Release_vcx_x64` (DLL 64 bits). Opcional: `set SDK_DIR=C:\ruta\a\la\carpeta` si las DLL están en otro sitio.

**Varias cámaras a la vez:** el puente admite **un cliente WebSocket por cámara** (p. ej. tablet A → `.200`, tablet B → `.210`). Cada una abre su propio login SDK. Si la misma cámara ya tiene intercom activo, el segundo cliente recibe *Intercom ocupado en IP*. Copia el `audio_bridge.py` actualizado al PC industrial y reinicia el servicio.

## Variables del servidor (PC)

| Variable | Valores | Por defecto | Descripción |
|----------|---------|-------------|-------------|
| `SDK_DIR` | ruta carpeta | carpeta del script | Donde está `DVR_NET_SDK.dll` y dependencias |
| `BRIDGE_HOST` | IP | `0.0.0.0` | Interfaz de escucha WebSocket |
| `BRIDGE_PORT` | número | `8765` | Puerto WebSocket |
| `BRIDGE_RECORD` | `0` / `1` | `1` | Graba `recordings/mic_tx_*.wav`, `cam_rx_*.wav`, `sdk_tx_*.bin` |
| `BRIDGE_RECORD_DIR` | ruta | `recordings/` | Carpeta de grabaciones debug |
| `BRIDGE_SDK_MIC` | `0` / `1` | `0` | `1` = duplex como `test_audio_1.py` (mic/altavoz del **PC**, sin TX desde tablet) |
| `BRIDGE_TX_FORMAT` | `auto` / `g711` / `pcm` | `auto` | Fuerza formato hacia la cámara vía `VoiceComSendData` |
| `BRIDGE_G711_CODEC` | `alaw` / `ulaw` | `alaw` | Códec G711 en **TX** hacia cámara |
| `BRIDGE_RX_CODEC` | `alaw` / `ulaw` | `alaw` | Códec G711 RX. **TD-E3110 usa A-law** (μ-law empeora) |
| `BRIDGE_PREFER_RX_PCM` | `0` / `1` | `0` | `1` = MR(enc=True). Suele dar solo ruido en TD-E3110 |
| `BRIDGE_RX_GAIN` | número | `0.82` | Ganancia base |
| `BRIDGE_RX_QUIET_THRESH` | número | `3500` | Por debajo: sube volumen (cámara .200) |
| `BRIDGE_RX_TARGET_PEAK` | número | `4800` | Nivel objetivo tras boost/limit |
| `BRIDGE_RX_MAX_BOOST` | número | `2.2` | Máximo amplificador en señal baja |
| `BRIDGE_RX_LOUD_THRESH` | número | `6500` | Por encima: baja volumen (hablar cerca del mic) |
| `BRIDGE_RX_HOT_THRESH` | número | `14000` | Señal ya saturada en G711 → atenuar fuerte |
| `BRIDGE_RX_HOT_GAIN` | número | `0.28` | Ganancia en señal saturada (evita distorsión) |
| `BRIDGE_RX_LIMIT` | número | `15000` | Techo PCM final (soft limit tras AGC) |
| `BRIDGE_RX_HPF` | `0` / `1` | `0` | Filtro paso-alto (off = menos agudo/distorsionado) |
| `BRIDGE_RX_LPF` | `0` / `1` | `1` | Filtro paso-bajo suave (reduce grano/carraspeo G711) |
| `BRIDGE_RX_LPF_HZ` | número | `2800` | Corte del LPF en Hz (@ 8 kHz) |
| `BRIDGE_RX_DECLICK` | `0` / `1` | `0` | Slew limit anti-pico (off = menos textura áspera en voz) |
| `BRIDGE_RX_GAIN_RELEASE` | número | `0.06` | AGC: bajada de ganancia más lenta (menos bombeo) |
| `BRIDGE_RX_PROCESS` | `0` / `1` | `1` | Post-proceso RX (ganancia/limit). En TD-E3110 suele ir mejor en `1` |
| `BRIDGE_SDK_RX_VOL` | `1`–`15` | `3` | Volumen recepción SDK (`SetVoiceComClientVolume`) |
| `BRIDGE_RX_ENABLE` | `0` / `1` | `1` | Solo depuración PC: `0` = no reenviar RX a tablet |
| `BRIDGE_TX_GAIN` | número | `1.0` | Atenúa mic tablet→cámara (bajar si hay feedback en .210) |
| `BRIDGE_CAMERAS_CONFIG` | ruta | `bridge_cameras.json` | Perfiles de audio **por IP** (ver abajo) |

### Perfiles por cámara (`bridge_cameras.json`)

Cada IP puede tener su propio AGC, volumen SDK y TX. El JSON **sustituye** los `BRIDGE_RX_*` / `BRIDGE_SDK_RX_VOL` / `BRIDGE_TX_GAIN` **por sesión** según la IP del `start` WebSocket.

Orden de prioridad: variables `BRIDGE_*` en env (plantilla base) → bloque `"default"` del JSON → `"cameras":{"IP":{...}}`.

Copia junto al script:

- `bridge_cameras.json` — valores por IP
- `bridge_camera_config.py` — cargador (requerido)

Al conectar la tablet verás en log:

`Perfil audio 192.168.1.210 — Cámara .210 — RX alto | sdkVol=3 gain=0.82 ...`

Ejemplo (incluido en el repo; ver notas por montaje físico):

- **`.200` destapada** — perfil equilibrado; ligero LPF y compresión al hablar cerca (ruido).
- **`.210` en caparazón 3D + amplificador** — mucho más ganancia RX (el micrófono llega débil al SDK).

```json
{
  "default": { "label": "fallback", "sdk_rx_vol": 3, ... },
  "cameras": {
    "192.168.1.200": { "label": ".200 destapada", "rx_lpf_hz": 2600, ... },
    "192.168.1.210": { "label": ".210 caparazón+amp", "sdk_rx_vol": 7, "rx_max_boost": 3.0, ... }
  }
}
```

Si una cámara suena bajo: sube `sdk_rx_vol` y `rx_max_boost`. Si distorsiona al hablar cerca: baja `rx_loud_thresh` o `sdk_rx_vol`. Graba con `BRIDGE_RECORD=1` y compara `cam_rx_decoded` vs `cam_rx`.

Claves admitidas (todas opcionales en cada bloque): `label`, `sdk_rx_vol`, `tx_gain`, `rx_gain`, `rx_limit`, `rx_quiet_thresh`, `rx_target_peak`, `rx_max_boost`, `rx_loud_thresh`, `rx_hot_thresh`, `rx_hot_gain`, `rx_process`, `rx_hpf`, `rx_lpf`, `rx_lpf_hz`, `rx_declick`, `rx_slew_max`, `rx_gain_attack`, `rx_gain_release`, `rx_soft_limit`.

Edita el JSON y **reinicia la sesión intercom** (o el servicio); no hace falta tocar `.env` ni recompilar la APK.


Son **canales distintos** en la cámara:

| | RTSP (vídeo en vivo) | Intercom SDK (`StartVoiceCom_MR`) |
|--|----------------------|-----------------------------------|
| Uso | Audio ambiente del stream | Voz bidireccional dedicada |
| Códec típico TD-E3110 | **AAC** (perfil main) u otro del encoder de vídeo | **G711 A-law 8 kHz** |
| Ancho de banda | Mayor (más natural) | Telefonía (más estrecho) |
| Decodificación | ExoPlayer en tablet | Python G711→PCM → WebSocket → tablet |

El RTSP **no indica** que debamos “capar” el RX del intercom: sirve de referencia de que el micrófono de la cámara capta bien. El objetivo es **mejorar el RX G711** en el puente (volumen SDK + decodificación + post-proceso suave).

### Intercom sin abrir cámara (solo voz)

**Sí está disponible.** En modo manual:

1. **No pulses** `INICIAR VÍDEO` (el RTSP queda detenido).
2. Pulsa **`INTERCOM SDK`** → duplex voz tablet ↔ cámara vía puente (WebSocket + SDK).
3. El audio RX llega al altavoz de la tablet por el puente, no por RTSP.

Vídeo e intercom son independientes: puedes usar uno, otro, o ambos.

### Ajuste RX (bajo / distorsionado / feedback)

Cámara **.200** suele mandar RX muy bajo; **.210** muy alto (amplificador interno). El puente adapta por trama.

Por defecto: nivel RX más bajo (gain 0.82, SDK vol=3), boost moderado en señal baja,
atenuación temprana si hablan cerca del mic, sin filtro HPF.

```cmd
python audio_bridge.py

REM .200 aún muy baja:
set BRIDGE_RX_MAX_BOOST=3.5
set BRIDGE_SDK_RX_VOL=10
python audio_bridge.py

REM Aún alto para el cliente:
set BRIDGE_SDK_RX_VOL=2
set BRIDGE_RX_GAIN=0.7
set BRIDGE_RX_TARGET_PEAK=4000
python audio_bridge.py

REM Lejos queda demasiado bajo:
set BRIDGE_RX_MAX_BOOST=2.5
set BRIDGE_SDK_RX_VOL=4
python audio_bridge.py

REM Probar sin post-proceso (solo G711 decode + vol SDK):
set BRIDGE_RX_PROCESS=0
python audio_bridge.py
```

### Ejemplos (PowerShell)

```powershell
# Solo escuchar en LAN local
$env:BRIDGE_HOST="0.0.0.0"
$env:BRIDGE_PORT="8765"

# Sin grabar WAV
$env:BRIDGE_RECORD="0"
```
$env:BRIDGE_TX_FORMAT="pcm"
python audio_bridge.py

# Forzar G711 simétrico
$env:BRIDGE_TX_FORMAT="g711"
python audio_bridge.py

# Modo test en el PC (sin tablet): igual que test_audio_1.py
$env:BRIDGE_SDK_MIC="1"
python audio_bridge.py
```

### Combinaciones útiles para mañana

| Objetivo | PC (`audio_bridge.py`) | Tablet |
|----------|------------------------|--------|
| **Normal (actual)** | sin variables extra | Modo puente, mic *Voz (AGC)* |
| Solo intercom (sin vídeo) | sin cambios | No pulsar *Iniciar vídeo*; pulsar *Intercom SDK* |
| .200 RX muy bajo | `BRIDGE_RX_MAX_BOOST=3.5` `BRIDGE_SDK_RX_VOL=8` | — |
| Cerca del mic distorsiona | `BRIDGE_SDK_RX_VOL=2` `BRIDGE_RX_LOUD_THRESH=5500` | — |
| RX global muy alto | `BRIDGE_RX_GAIN=0.7` `BRIDGE_SDK_RX_VOL=2` | — |
| Probar RX crudo (sin AGC puente) | `BRIDGE_RX_PROCESS=0` | — |
| Probar μ-law en altavoz cámara | `BRIDGE_G711_CODEC=ulaw` | cualquiera |
| Depurar TX sin grabar | `BRIDGE_RECORD=0` | cualquiera |

## Configuración en la tablet (app Android)

No usa variables de entorno; se guarda en la configuración de cada puerta
(**Modo intercom → Puente PC**):

| Campo | Valores | Por defecto | Equivalente Android |
|-------|---------|-------------|---------------------|
| `bridgeMicSource` | `voice_communication` / `mic` | `voice_communication` | `AudioSource.VOICE_COMMUNICATION` vs `AudioSource.MIC` |

- **Voz (AGC / anti-eco)**: optimizado para llamadas; puede comprimir o filtrar más.
- **Mic crudo**: menos procesado; a veces suena más natural hacia la cámara.

**Requiere reinstalar la APK** si cambias el código nativo; cambiar solo variables en el PC **no** requiere nueva APK.

## Perfiles SDK (automáticos)

El puente elige solo (salvo `BRIDGE_SDK_MIC=1`):

1. `StartVoiceCom_MR(enc=False)` + TX G711 simétrico — RX G711→PCM (**el que usas ahora**)
2. `StartVoiceCom_MR(enc=True)` + TX PCM 3200 B — fallback
3. `StartVoiceCom` RX-only — último recurso

En el log busca: `Perfil activo:` y `TX #1 pcm=... payload=... fmt=...`

## Archivos de depuración (`BRIDGE_RECORD=1`)

| Archivo | Contenido |
|---------|-----------|
| `mic_tx_*.wav` | PCM del micrófono tablet **antes** del SDK (debe sonar bien) |
| `sdk_tx_*.bin` | Bytes exactos enviados a `VoiceComSendData` |
| `cam_rx_decoded_*.wav` | PCM decodificado **antes** del post-proceso (referencia G711 puro) |
| `cam_rx_*.wav` | PCM **después** del post-proceso (lo que oye la tablet) |

Si `cam_rx` suena áspero pero `cam_rx_decoded` solo tiene grano leve, el post-proceso es el culpable.
Si `cam_rx_decoded` ya suena saturado/recortado, el origen es G711/cámara (bajar `BRIDGE_SDK_RX_VOL`).
Si `mic_tx` suena bien pero el altavoz de la cámara no, el problema está en TX/códec, no en el micrófono de la tablet.

REM Carraspeo / grano en voz:
set BRIDGE_RX_LPF=1
set BRIDGE_RX_LPF_HZ=2800
set BRIDGE_RX_DECLICK=0
python audio_bridge.py
