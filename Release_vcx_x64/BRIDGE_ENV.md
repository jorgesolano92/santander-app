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
- `audio_bridge.py`, `bridge_requirements.txt`, `test_audio_1.py`

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
| `BRIDGE_RX_GAIN` | número | `1.0` | Ganancia base |
| `BRIDGE_RX_QUIET_THRESH` | número | `3500` | Por debajo: sube volumen (cámara .200) |
| `BRIDGE_RX_TARGET_PEAK` | número | `7500` | Nivel objetivo tras boost/limit |
| `BRIDGE_RX_MAX_BOOST` | número | `2.8` | Máximo amplificador en señal baja |
| `BRIDGE_RX_LOUD_THRESH` | número | `11000` | Por encima: baja volumen (cámara .210) |
| `BRIDGE_RX_HOT_THRESH` | número | `25000` | Señal ya saturada en G711 → atenuar fuerte |
| `BRIDGE_RX_HOT_GAIN` | número | `0.5` | Ganancia en señal saturada (evita distorsión) |
| `BRIDGE_RX_LIMIT` | número | `24000` | Techo PCM |
| `BRIDGE_RX_HPF` | `0` / `1` | `0` | Filtro paso-alto (off = menos agudo/distorsionado) |
| `BRIDGE_RX_PROCESS` | `0` / `1` | `1` | Post-proceso RX (ganancia/limit). En TD-E3110 suele ir mejor en `1` |
| `BRIDGE_SDK_RX_VOL` | `1`–`15` | `8` | Volumen recepción SDK (`SetVoiceComClientVolume`) |
| `BRIDGE_RX_ENABLE` | `0` / `1` | `1` | Solo depuración PC: `0` = no reenviar RX a tablet |
| `BRIDGE_TX_GAIN` | número | `1.0` | Atenúa mic tablet→cámara (bajar si hay feedback en .210) |

### RTSP vs intercom SDK (por qué suenan distinto)

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

Por defecto: boost en señal baja, atenuación en picos/saturación, SDK vol=8, sin filtro HPF.

```cmd
python audio_bridge.py

REM .200 aún muy baja:
set BRIDGE_RX_MAX_BOOST=3.5
set BRIDGE_SDK_RX_VOL=10
python audio_bridge.py

REM .210 distorsiona o feedback al hablar:
set BRIDGE_RX_HOT_GAIN=0.4
set BRIDGE_RX_LOUD_THRESH=9000
set BRIDGE_SDK_RX_VOL=6
set BRIDGE_TX_GAIN=0.7
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
| .200 RX muy bajo | `BRIDGE_RX_MAX_BOOST=3.5` `BRIDGE_SDK_RX_VOL=10` | — |
| .210 RX alto / feedback | `BRIDGE_RX_HOT_GAIN=0.4` `BRIDGE_TX_GAIN=0.7` | — |
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
| `cam_rx_*.wav` | PCM decodificado hacia la tablet |

Si `mic_tx` suena bien pero el altavoz de la cámara no, el problema está en TX/códec, no en el micrófono de la tablet.
