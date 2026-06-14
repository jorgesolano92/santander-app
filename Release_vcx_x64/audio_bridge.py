# -*- coding: utf-8 -*-
"""
Puente de audio intercom TVT — Santander / SAIMA Seguridad

Servicio WebSocket en el PC industrial. Mantiene la sesión SDK Windows con la
cámara (StartVoiceCom) y reenvía PCM 16-bit mono 8 kHz a clientes Android.

Protocolo WebSocket
-------------------
Texto (JSON):
  Cliente → {"type":"start","cameraIp":"192.168.1.200","sdkPort":9008,
             "username":"admin","password":"...","channel":-1}
  (opcional depuración PC: "rxEnable":false)
  Cliente → {"type":"stop"}
  Cliente → {"type":"ping"}
  Servidor → {"type":"started","tx":true,"rx":true,"mode":"StartVoiceCom"}
  Servidor → {"type":"stopped"} | {"type":"error","message":"..."} | {"type":"pong"}

Binario:
  Cliente → 0x01 + PCM (micrófono tablet → cámara)
  Servidor → 0x02 + PCM (cámara → tablet)

Uso:
  pip install -r bridge_requirements.txt
  python audio_bridge.py

Variables de entorno (opcionales): ver BRIDGE_ENV.md en esta carpeta.

  SDK_DIR, BRIDGE_HOST, BRIDGE_PORT, BRIDGE_RECORD, BRIDGE_RECORD_DIR,
  BRIDGE_SDK_MIC, BRIDGE_TX_FORMAT (g711|pcm|auto), BRIDGE_G711_CODEC (alaw|ulaw)
"""

from __future__ import annotations

import asyncio
import ctypes
import json
import logging
import math
import os
import struct
import sys
import threading
import time
import wave
from datetime import datetime
from pathlib import Path
from typing import Any, Callable, Optional

try:
    import websockets
    from websockets.asyncio.server import serve
except ImportError:
    print("[ERROR] Instala dependencias: pip install -r bridge_requirements.txt")
    sys.exit(1)

# ---------------------------------------------------------------------------
# Configuración
# ---------------------------------------------------------------------------
SCRIPT_DIR = Path(__file__).resolve().parent
SDK_DIR = os.environ.get("SDK_DIR", str(SCRIPT_DIR))
DLL_NAME = "DVR_NET_SDK.dll"
DLL_PATH = os.path.join(SDK_DIR, DLL_NAME)

BRIDGE_HOST = os.environ.get("BRIDGE_HOST", "0.0.0.0")
BRIDGE_PORT = int(os.environ.get("BRIDGE_PORT", "8765"))
RECORD_ENABLED = os.environ.get("BRIDGE_RECORD", "1").lower() in ("1", "true", "yes", "on")
RECORD_DIR = Path(os.environ.get("BRIDGE_RECORD_DIR", str(SCRIPT_DIR / "recordings")))
# test_audio_1.py: StartVoiceCom captura mic PC y reproduce altavoz PC (sin VoiceComSendData)
BRIDGE_SDK_MIC = os.environ.get("BRIDGE_SDK_MIC", "0").lower() in ("1", "true", "yes", "on")
BRIDGE_TX_FORMAT = os.environ.get("BRIDGE_TX_FORMAT", "auto").strip().lower()
# Códec G711 TX simétrico (VoiceComSendData hacia cámara)
_g711_codec_raw = os.environ.get("BRIDGE_G711_CODEC", "alaw").strip().lower()
BRIDGE_G711_CODEC = "ulaw" if _g711_codec_raw in ("ulaw", "mu", "mulaw", "g711u", "u") else "alaw"
# Códec G711 RX (callback SDK → PCM). Si cam_rx suena a chirrido, probar ulaw.
_rx_codec_raw = os.environ.get("BRIDGE_RX_CODEC", "alaw").strip().lower()
BRIDGE_RX_CODEC = "ulaw" if _rx_codec_raw in ("ulaw", "mu", "mulaw", "g711u", "u") else "alaw"
# 1 = probar MR(enc=True) primero (RX ya en PCM, sin G711)
BRIDGE_PREFER_RX_PCM = os.environ.get("BRIDGE_PREFER_RX_PCM", "0").lower() in (
    "1", "true", "yes", "on",
)
# Post-procesado RX (PCM ya decodificado). A-law es el códec correcto en TVT TD-E3110.
try:
  BRIDGE_RX_GAIN = float(os.environ.get("BRIDGE_RX_GAIN", "1.0"))
except ValueError:
  BRIDGE_RX_GAIN = 1.0
try:
  BRIDGE_RX_LIMIT = int(os.environ.get("BRIDGE_RX_LIMIT", "24000"))
except ValueError:
  BRIDGE_RX_LIMIT = 24000
try:
  BRIDGE_RX_QUIET_THRESH = int(os.environ.get("BRIDGE_RX_QUIET_THRESH", "3500"))
except ValueError:
  BRIDGE_RX_QUIET_THRESH = 3500
try:
  BRIDGE_RX_TARGET_PEAK = int(os.environ.get("BRIDGE_RX_TARGET_PEAK", "7500"))
except ValueError:
  BRIDGE_RX_TARGET_PEAK = 7500
try:
  BRIDGE_RX_MAX_BOOST = float(os.environ.get("BRIDGE_RX_MAX_BOOST", "2.8"))
except ValueError:
  BRIDGE_RX_MAX_BOOST = 2.8
try:
  BRIDGE_RX_LOUD_THRESH = int(os.environ.get("BRIDGE_RX_LOUD_THRESH", "11000"))
except ValueError:
  BRIDGE_RX_LOUD_THRESH = 11000
try:
  BRIDGE_RX_HOT_THRESH = int(os.environ.get("BRIDGE_RX_HOT_THRESH", "25000"))
except ValueError:
  BRIDGE_RX_HOT_THRESH = 25000
try:
  BRIDGE_RX_HOT_GAIN = float(os.environ.get("BRIDGE_RX_HOT_GAIN", "0.5"))
except ValueError:
  BRIDGE_RX_HOT_GAIN = 0.5
BRIDGE_RX_PROCESS = os.environ.get("BRIDGE_RX_PROCESS", "1").lower() not in (
    "0", "false", "off", "no",
)
BRIDGE_RX_HPF = os.environ.get("BRIDGE_RX_HPF", "0").lower() in ("1", "true", "yes", "on")
try:
  BRIDGE_SDK_RX_VOL = int(os.environ.get("BRIDGE_SDK_RX_VOL", "8"))
except ValueError:
  BRIDGE_SDK_RX_VOL = 8
# Solo depuración en PC (BRIDGE_RX_ENABLE=0). La app siempre usa RX SDK.
BRIDGE_RX_ENABLE = os.environ.get("BRIDGE_RX_ENABLE", "1").lower() in ("1", "true", "yes", "on")
try:
  BRIDGE_TX_GAIN = float(os.environ.get("BRIDGE_TX_GAIN", "1.0"))
except ValueError:
  BRIDGE_TX_GAIN = 1.0

SAMPLE_RATE = 8000
PCM_CHUNK = 640  # 40 ms @ 8 kHz mono 16-bit (mic cliente WS)
PCM_CHUNK_SDK = 3200  # 200 ms @ 8 kHz — voice_forward.cpp / doc SDK
RX_WS_CHUNK = 1280  # 80 ms — menos paquetes WS, reproducción más estable en tablet

MSG_TX = 0x01
MSG_RX = 0x02

ERROR_MAP = {
    0: "SUCCESS",
    1: "PASSWORD_ERROR",
    2: "NOENOUGH_AUTH",
    34: "DVR_VOICEOPENED",
    8: "NETWORK_FAIL_CONNECT",
    90: "DEVICE_OFFLINE",
}

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger("audio_bridge")

TALK_DATA_CALLBACK = ctypes.CFUNCTYPE(
    None,
    ctypes.c_void_p,
    ctypes.c_char_p,
    ctypes.c_uint,
    ctypes.c_ubyte,
    ctypes.c_void_p,
)


def err_text(code: int) -> str:
  return ERROR_MAP.get(code, f"code_{code}")


def python_bits() -> int:
  return 64 if sys.maxsize > 2**32 else 32


def setup_sdk_dll_search_path(sdk_dir: str) -> None:
  """PATH + add_dll_directory (imprescindible en Python 3.8+ para Play.dll, etc.)."""
  try:
    os.add_dll_directory(sdk_dir)
  except (AttributeError, OSError) as ex:
    log.warning("add_dll_directory: %s", ex)
  os.environ["PATH"] = sdk_dir + os.pathsep + os.environ.get("PATH", "")


def list_dlls_in_dir(dir_path: str) -> list[str]:
  try:
    return sorted(f for f in os.listdir(dir_path) if f.lower().endswith(".dll"))
  except OSError:
    return []


# Dependencias internas de DVR_NET_SDK.dll (cargar antes que la principal)
_SDK_PRELOAD_ORDER = (
  "glew32.dll", "glut64.dll", "SDL2.dll",
  "OpensslSDK.dll", "Network.dll", "ShareLib.dll",
  "VADecoder.dll", "NatClientSDK.dll", "VideoDisplaySDK.dll",
)

LOAD_LIBRARY_SEARCH_DLL_LOAD_DIR = 0x00001000
LOAD_LIBRARY_SEARCH_APPLICATION_DIR = 0x00000200
_LOAD_FLAGS = LOAD_LIBRARY_SEARCH_DLL_LOAD_DIR | LOAD_LIBRARY_SEARCH_APPLICATION_DIR


def _win32_error_text() -> str:
  err = ctypes.get_last_error()
  if not err:
    return "sin código Win32"
  buf = ctypes.create_unicode_buffer(1024)
  kernel32 = ctypes.WinDLL("kernel32", use_last_error=True)
  kernel32.FormatMessageW.argtypes = [
    ctypes.c_uint32, ctypes.c_void_p, ctypes.c_uint32,
    ctypes.c_uint32, ctypes.c_wchar_p, ctypes.c_uint32, ctypes.c_void_p,
  ]
  kernel32.FormatMessageW.restype = ctypes.c_uint32
  kernel32.FormatMessageW(0x00001000, None, err, 0, buf, len(buf), None)
  text = buf.value.strip() or "?"
  return f"Win32 {err}: {text}"


def _load_library_ex(path: str) -> int:
  kernel32 = ctypes.WinDLL("kernel32", use_last_error=True)
  kernel32.LoadLibraryExW.argtypes = [
    ctypes.c_wchar_p, ctypes.c_void_p, ctypes.c_uint32,
  ]
  kernel32.LoadLibraryExW.restype = ctypes.c_void_p
  handle = kernel32.LoadLibraryExW(path, None, _LOAD_FLAGS)
  if not handle:
    raise OSError(_win32_error_text())
  return handle


def preload_sdk_dependencies(sdk_dir: str) -> list[str]:
  """Precarga DLLs del SDK; si una falla, el error indica cuál."""
  loaded: list[str] = []
  for name in _SDK_PRELOAD_ORDER:
    path = os.path.join(sdk_dir, name)
    if not os.path.isfile(path):
      continue
    try:
      _load_library_ex(path)
      loaded.append(name)
    except OSError as ex:
      raise RuntimeError(f"Dependencia SDK no cargó ({name}): {ex}") from ex
  return loaded


def _sdk_load_help(sdk_dir: str, dll_path: str) -> str:
  dlls = list_dlls_in_dir(sdk_dir)
  py_ver = f"{sys.version_info.major}.{sys.version_info.minor}"
  return (
    f"  Ruta: {dll_path}\n"
    f"  SDK_DIR: {sdk_dir}\n"
    f"  Python: {python_bits()} bits ({py_ver})\n"
    f"  DLLs en carpeta ({len(dlls)}): {', '.join(dlls) or '(ninguna)'}\n"
    "Causas habituales:\n"
    "  1. Falta Visual C++ Redistributable 2015-2022 x64 en el PC industrial\n"
    "  2. Alguna dependencia del SDK no carga (ejecuta: python check_sdk_dll.py)\n"
    "  3. Prueba Python 3.11 o 3.12 si usas 3.14 (muy nuevo)\n"
    "  4. Comprueba si SDKDEMO_x64.exe arranca en esta carpeta\n"
    "  5. Misma carpeta que en el portátil donde test_audio_1.py funcionaba",
  )


def load_win_sdk_dll(dll_path: str, sdk_dir: str) -> Any:
  """Carga DVR_NET_SDK.dll con mensaje claro si faltan dependencias."""
  if not os.path.isfile(dll_path):
    raise FileNotFoundError(
      f"No se encuentra {dll_path}\n{_sdk_load_help(sdk_dir, dll_path)}",
    )

  setup_sdk_dll_search_path(sdk_dir)
  old_cwd = os.getcwd()
  try:
    os.chdir(sdk_dir)
    preload_sdk_dependencies(sdk_dir)
    try:
      _load_library_ex(dll_path)
      return ctypes.WinDLL(dll_path)
    except OSError:
      ctypes.set_last_error(0)
      return ctypes.WinDLL(os.path.basename(dll_path), winmode=8)
  except OSError as ex:
    raise RuntimeError(
      f"No se pudo cargar DVR_NET_SDK.dll: {ex}\n{_sdk_load_help(sdk_dir, dll_path)}",
    ) from ex
  finally:
    os.chdir(old_cwd)


def _alaw_to_linear(alaw: int) -> int:
  a = alaw ^ 0x55
  t = (a & 0x0F) << 4
  seg = (a & 0x70) >> 4
  if seg == 0:
    t += 8
  elif seg == 1:
    t += 0x108
  else:
    t += 0x108
    t <<= seg - 1
  return t if (a & 0x80) == 0 else -t


def _ulaw_to_linear(ulaw: int) -> int:
  u = (~ulaw) & 0xFF
  sign = u & 0x80
  exp = (u >> 4) & 0x07
  mant = u & 0x0F
  sample = ((mant << 3) + 0x84) << exp
  sample -= 0x84
  return -sample if sign else sample


def decode_g711a_to_pcm(data: bytes) -> bytes:
  out = bytearray(len(data) * 2)
  for i, b in enumerate(data):
    sample = _alaw_to_linear(b)
    out[i * 2] = sample & 0xFF
    out[i * 2 + 1] = (sample >> 8) & 0xFF
  return bytes(out)


def decode_g711u_to_pcm(data: bytes) -> bytes:
  out = bytearray(len(data) * 2)
  for i, b in enumerate(data):
    sample = _ulaw_to_linear(b)
    out[i * 2] = sample & 0xFF
    out[i * 2 + 1] = (sample >> 8) & 0xFF
  return bytes(out)


def decode_g711_to_pcm(data: bytes, codec: str) -> bytes:
  if codec == "ulaw":
    return decode_g711u_to_pcm(data)
  return decode_g711a_to_pcm(data)


class RxAudioProcessor:
  """RX adaptativo por trama: sube señal baja (.200), limita picos fuertes (.210)."""

  FRAME = 320  # 40 ms @ 8 kHz

  def __init__(self) -> None:
    self._x_prev = 0.0
    self._y_prev = 0.0
    self._hpf_alpha = 1.0 / (1.0 + 2.0 * math.pi * 200.0 / SAMPLE_RATE)

  def reset(self) -> None:
    self._x_prev = 0.0
    self._y_prev = 0.0

  def _frame_gain(self, peak: int) -> float:
    base = BRIDGE_RX_GAIN
    if peak <= 0:
      return base
    if peak >= BRIDGE_RX_HOT_THRESH:
      return BRIDGE_RX_HOT_GAIN
    if peak < BRIDGE_RX_QUIET_THRESH:
      boost = min(BRIDGE_RX_MAX_BOOST, BRIDGE_RX_TARGET_PEAK / peak)
      return base * boost
    if peak > BRIDGE_RX_LOUD_THRESH:
      return base * (BRIDGE_RX_TARGET_PEAK / peak)
    return base

  def process(self, pcm: bytes) -> bytes:
    if not pcm or len(pcm) < 2:
      return pcm
    samples = list(struct.unpack(f"<{len(pcm) // 2}h", pcm))
    limit = BRIDGE_RX_LIMIT
    out: list[int] = []
    for start in range(0, len(samples), self.FRAME):
      frame = samples[start:start + self.FRAME]
      if not frame:
        break
      peak = max(abs(s) for s in frame)
      fg = self._frame_gain(peak)
      for s in frame:
        x = float(s) * fg
        if BRIDGE_RX_HPF:
          y = self._hpf_alpha * (self._y_prev + x - self._x_prev)
          self._x_prev = x
          self._y_prev = y
          x = y
        if x > limit:
          x = limit
        elif x < -limit:
          x = -limit
        out.append(int(x))
    return struct.pack(f"<{len(out)}h", *out)


def _linear_to_alaw(pcm: int) -> int:
  sign = 0x80 if (pcm & 0x8000) else 0x00
  if sign:
    pcm = -pcm
  if pcm > 0x7FFF:
    pcm = 0x7FFF
  exp = 7
  mask = 0x4000
  while (pcm & mask) == 0 and exp > 0:
    mask >>= 1
    exp -= 1
  mantissa = (pcm >> (4 if exp == 0 else exp + 3)) & 0x0F
  alaw = sign | (exp << 4) | mantissa
  return alaw ^ 0x55


def encode_pcm_to_g711a(pcm_data: bytes) -> bytes:
  """PCM 16-bit LE mono → G711A (misma lógica que DvrSdkManager.encodeG711ALaw)."""
  sample_count = len(pcm_data) // 2
  out = bytearray(sample_count)
  for i in range(sample_count):
    sample = int.from_bytes(pcm_data[i * 2: i * 2 + 2], "little", signed=True)
    out[i] = _linear_to_alaw(sample)
  return bytes(out)


def _linear_to_ulaw(pcm: int) -> int:
  bias = 0x84
  clip = 32635
  sign = 0x80 if pcm < 0 else 0x00
  if pcm < 0:
    pcm = -pcm
  if pcm > clip:
    pcm = clip
  pcm += bias
  exp = 7
  mask = 0x4000
  while (pcm & mask) == 0 and exp > 0:
    mask >>= 1
    exp -= 1
  mantissa = (pcm >> (exp + 3)) & 0x0F
  return (~(sign | (exp << 4) | mantissa)) & 0xFF


def encode_pcm_to_g711u(pcm_data: bytes) -> bytes:
  """PCM 16-bit LE mono → G711 μ-law."""
  sample_count = len(pcm_data) // 2
  out = bytearray(sample_count)
  for i in range(sample_count):
    sample = int.from_bytes(pcm_data[i * 2: i * 2 + 2], "little", signed=True)
    out[i] = _linear_to_ulaw(sample)
  return bytes(out)


def encode_pcm_to_g711(pcm_data: bytes, codec: str) -> bytes:
  if codec == "ulaw":
    return encode_pcm_to_g711u(pcm_data)
  return encode_pcm_to_g711a(pcm_data)


G711_FRAME = 320  # G711A 8 kHz, 40 ms por frame (TD-E3110 / Android onTalkData)


def build_wave_format_ex(
    format_tag: int, channels: int, sample_rate: int,
    avg_bytes_per_sec: int, block_align: int, bits_per_sample: int,
) -> bytes:
  """WAVEFORMATEX 18 B (igual que DvrSdkManager.buildWaveFormatEx)."""
  return struct.pack(
    "<hhIihhh",
    format_tag, channels, sample_rate,
    avg_bytes_per_sec, block_align, bits_per_sample, 0,
  )


WAVE_G711A = build_wave_format_ex(6, 1, 8000, 8000, 1, 8)
WAVE_G711U = build_wave_format_ex(7, 1, 8000, 8000, 1, 8)
WAVE_PCM_8K = build_wave_format_ex(1, 1, 8000, 16000, 2, 16)


class RawRecorder:
  """Volcado binario (payload SDK TX) para depuración."""

  def __init__(self, path: Path) -> None:
    self.path = path
    self._lock = threading.Lock()
    self._bytes = 0
    path.parent.mkdir(parents=True, exist_ok=True)
    self._fh = open(path, "wb")

  def write(self, data: bytes) -> None:
    if not data:
      return
    with self._lock:
      self._fh.write(data)
      self._bytes += len(data)

  def close(self) -> int:
    with self._lock:
      self._fh.close()
    return self._bytes


class PcmWavRecorder:
  """Volcado PCM 16-bit mono → WAV para depuración."""

  def __init__(self, path: Path, sample_rate: int = SAMPLE_RATE) -> None:
    self.path = path
    self._lock = threading.Lock()
    self._bytes = 0
    self._wav: Any = None
    path.parent.mkdir(parents=True, exist_ok=True)
    self._wav = wave.open(str(path), "wb")
    self._wav.setnchannels(1)
    self._wav.setsampwidth(2)
    self._wav.setframerate(sample_rate)

  def write(self, pcm: bytes) -> None:
    if not pcm or self._wav is None:
      return
    with self._lock:
      if self._wav is None:
        return
      self._wav.writeframes(pcm)
      self._bytes += len(pcm)

  def close(self) -> int:
    with self._lock:
      if self._wav is not None:
        self._wav.close()
        self._wav = None
    return self._bytes


# ---------------------------------------------------------------------------
# Wrapper SDK Windows
# ---------------------------------------------------------------------------
class TvtSdk:
  _shared_sdk: Any = None
  _shared_lock = threading.Lock()

  def __init__(self) -> None:
    self._sdk: Any = None
    self._user_id = -1
    self._voice_handle: Optional[int] = None
    self._voice_mode = ""
    self._voice_mr_enc = False
    self._cb_ref: Any = None
    self._rx_callback: Optional[Callable[[bytes], None]] = None
    self._tx_chunk = PCM_CHUNK
    self._tx_format = "pcm"  # "pcm" | "g711" | "sdk_g711"
    self._tx_pace_pcm = PCM_CHUNK
    self._encoder_handle: Optional[int] = None
    self._tx_fail_logged = False
    self._tx_ok_logged = False
    self._tx_sent_frames = 0
    self._tx_payload_hook: Optional[Callable[[bytes], None]] = None
    self._rx_raw_hook: Optional[Callable[[bytes], None]] = None
    self._open_rx_bytes = 0
    self._rx_decode_logged = False
    self._g711_rx_buf = bytearray()
    self._lock = threading.Lock()

  def load(self) -> None:
    with TvtSdk._shared_lock:
      if TvtSdk._shared_sdk is None:
        dll = load_win_sdk_dll(DLL_PATH, SDK_DIR)
        dll.NET_SDK_Init.restype = ctypes.c_bool
        dll.NET_SDK_GetLastError.restype = ctypes.c_long
        if not dll.NET_SDK_Init():
          err = int(dll.NET_SDK_GetLastError())
          raise RuntimeError(f"NET_SDK_Init falló: {err_text(err)}")
        try:
          dll.NET_SDK_SetConnectTime.argtypes = [ctypes.c_uint, ctypes.c_uint]
          dll.NET_SDK_SetConnectTime(5000, 1)
        except Exception:
          pass
        TvtSdk._shared_sdk = dll
        log.info("SDK inicializado (%s)", DLL_PATH)
      self._sdk = TvtSdk._shared_sdk
    self._bind_functions()

  def _bind_functions(self) -> None:
    s = self._sdk
    s.NET_SDK_Init.restype = ctypes.c_bool
    s.NET_SDK_Cleanup.restype = None
    s.NET_SDK_GetLastError.restype = ctypes.c_long
    s.NET_SDK_Login.restype = ctypes.c_long
    s.NET_SDK_Login.argtypes = [
      ctypes.c_char_p, ctypes.c_ushort,
      ctypes.c_char_p, ctypes.c_char_p, ctypes.c_void_p,
    ]
    s.NET_SDK_Logout.argtypes = [ctypes.c_long]
    s.NET_SDK_StartVoiceCom.restype = ctypes.c_void_p
    s.NET_SDK_StartVoiceCom.argtypes = [
      ctypes.c_long, ctypes.c_bool, TALK_DATA_CALLBACK, ctypes.c_void_p, ctypes.c_long,
    ]
    s.NET_SDK_StartVoiceCom_MR.restype = ctypes.c_void_p
    s.NET_SDK_StartVoiceCom_MR.argtypes = [
      ctypes.c_long, ctypes.c_bool, TALK_DATA_CALLBACK, ctypes.c_void_p, ctypes.c_long,
    ]
    s.NET_SDK_StopVoiceCom.restype = ctypes.c_bool
    s.NET_SDK_StopVoiceCom.argtypes = [ctypes.c_void_p]
    s.NET_SDK_VoiceComSendData.restype = ctypes.c_bool
    s.NET_SDK_VoiceComSendData.argtypes = [
      ctypes.c_void_p, ctypes.c_char_p, ctypes.c_ulong,
    ]
    s.NET_SDK_SetVoiceComClientVolume.restype = ctypes.c_bool
    s.NET_SDK_SetVoiceComClientVolume.argtypes = [ctypes.c_void_p, ctypes.c_int]
    s.NET_SDK_GetAudioInfo.restype = ctypes.c_bool
    s.NET_SDK_GetAudioInfo.argtypes = [
      ctypes.c_void_p, ctypes.c_void_p, ctypes.c_long,
    ]
    s.NET_SDK_InitAudioEncoder.restype = ctypes.c_void_p
    s.NET_SDK_InitAudioEncoder.argtypes = [ctypes.c_void_p, ctypes.c_long]
    s.NET_SDK_ReleaseAudioEncoder.restype = ctypes.c_bool
    s.NET_SDK_ReleaseAudioEncoder.argtypes = [ctypes.c_void_p]
    s.NET_SDK_EncodeAudioFrame.restype = ctypes.c_bool
    s.NET_SDK_EncodeAudioFrame.argtypes = [
      ctypes.c_void_p, ctypes.c_char_p, ctypes.c_long,
      ctypes.c_char_p, ctypes.POINTER(ctypes.c_int),
    ]

  def _get_last_error(self) -> int:
    return int(self._sdk.NET_SDK_GetLastError())

  def logout(self) -> None:
    with self._lock:
      self._close_voice_unlocked()
      if self._user_id >= 0 and self._sdk:
        self._sdk.NET_SDK_Logout(self._user_id)
        self._user_id = -1

  @classmethod
  def shutdown_shared(cls) -> None:
    with cls._shared_lock:
      if cls._shared_sdk is not None:
        cls._shared_sdk.NET_SDK_Cleanup()
        cls._shared_sdk = None
        log.info("SDK cleanup global")

  def login(self, ip: str, port: int, username: str, password: str) -> None:
    with self._lock:
      if self._user_id >= 0:
        self._sdk.NET_SDK_Logout(self._user_id)
        self._user_id = -1
      dev_info = ctypes.create_string_buffer(1024)
      uid = self._sdk.NET_SDK_Login(
        ip.encode("ascii"), ctypes.c_ushort(port),
        username.encode("utf-8"), password.encode("utf-8"),
        ctypes.byref(dev_info),
      )
      if uid < 0:
        raise RuntimeError(f"Login falló: {err_text(self._get_last_error())}")
      self._user_id = uid
      log.info("Login OK userId=%s → %s:%s", uid, ip, port)

  def _g711_buf_to_pcm(self) -> bytes:
    """Decodifica solo frames G711 completos (320 B → 640 B PCM)."""
    out = bytearray()
    while len(self._g711_rx_buf) >= G711_FRAME:
      frame = bytes(self._g711_rx_buf[:G711_FRAME])
      del self._g711_rx_buf[:G711_FRAME]
      hook = self._rx_raw_hook
      if hook:
        try:
          hook(frame)
        except Exception as ex:
          log.warning("RX raw hook: %s", ex)
      out.extend(decode_g711_to_pcm(frame, BRIDGE_RX_CODEC))
    return bytes(out)

  def _rx_raw_to_pcm(self, raw: bytes, flag: int) -> bytes:
    """MR(enc=True)→PCM en callback (640 B). MR(enc=False)→G711 320 B (flag=1)."""
    if self._voice_mode != "StartVoiceCom_MR":
      return raw
    if self._voice_mr_enc:
      return raw
    self._g711_rx_buf.extend(raw)
    return self._g711_buf_to_pcm()

  def _on_voice_data(self, handle, buf, size, flag, puser) -> None:
    if size <= 0 or not buf:
      return
    raw = ctypes.string_at(buf, size)
    pcm = self._rx_raw_to_pcm(raw, int(flag))
    if not pcm:
      return
    if not self._rx_decode_logged:
      self._rx_decode_logged = True
      g711_decode = (
          self._voice_mode == "StartVoiceCom_MR" and not self._voice_mr_enc
      )
      log.info(
        "RX mode=%s enc=%s flag=%s g711_decode=%s rx_codec=%s raw=%sB pcm=%sB pending=%sB",
        self._voice_mode, self._voice_mr_enc, int(flag), g711_decode,
        BRIDGE_RX_CODEC if g711_decode else "pcm",
        len(raw), len(pcm), len(self._g711_rx_buf),
      )
    self._open_rx_bytes += len(pcm)
    if not self._rx_callback:
      return
    try:
      self._rx_callback(pcm)
    except Exception as ex:
      log.warning("RX callback error: %s", ex)

  def _ensure_callback(self) -> None:
    if self._cb_ref is not None:
      return

    @TALK_DATA_CALLBACK
    def _cb(handle, buf, size, flag, puser):
      self._on_voice_data(handle, buf, size, flag, puser)

    self._cb_ref = _cb

  def _get_send_handle_unlocked(self) -> Optional[int]:
    return self._voice_handle

  def _open_and_eval(
      self, channel: int, use_mr: bool, need_no_enc_data: bool,
      probe_style: str,
  ) -> Optional[dict]:
    """Abre sesión MR o VoiceCom, espera RX y prueba TX."""
    self._open_rx_bytes = 0
    self._g711_rx_buf.clear()
    mode = "StartVoiceCom_MR" if use_mr else "StartVoiceCom"
    label = f"{mode}(enc={need_no_enc_data})" if use_mr else mode
    with self._lock:
      if use_mr:
        handle = self._sdk.NET_SDK_StartVoiceCom_MR(
          self._user_id, need_no_enc_data, self._cb_ref, None, channel,
        )
      else:
        handle = self._sdk.NET_SDK_StartVoiceCom(
          self._user_id, False, self._cb_ref, None, channel,
        )
      if not handle or handle == -1:
        log.warning("%s no abrió: %s", label, err_text(self._get_last_error()))
        return None
      self._voice_handle = handle
      self._voice_mode = mode
      self._voice_mr_enc = bool(need_no_enc_data)
      self._set_volume_unlocked()

    time.sleep(2.5)
    rx_bytes = self._open_rx_bytes
    with self._lock:
      # VoiceComSendData solo es válido con handle de StartVoiceCom_MR (doc SDK).
      if use_mr:
        if probe_style == "pcm":
          tx_ok, chunk, tx_fmt = self._probe_tx_pcm_unlocked()
        else:
          tx_ok, chunk, tx_fmt = self._probe_tx_mr_unlocked()
      else:
        tx_ok, chunk, tx_fmt = False, PCM_CHUNK, "pcm"
      self._tx_chunk = chunk
      self._tx_format = tx_fmt
      self._tx_pace_pcm = chunk
      self._tx_sent_frames = 0
      self._tx_ok_logged = False

    log.info(
      "%s handle=%s rxBytes=%s txProbe=%s txFmt=%s chunk=%s",
      label, handle, rx_bytes, tx_ok, tx_fmt, chunk,
    )
    return {
      "mode": mode,
      "tx": tx_ok,
      "rx": rx_bytes >= 320,
      "txChunk": chunk,
      "txFormat": tx_fmt,
      "txProbe": tx_ok,
      "rxBytes": rx_bytes,
    }

  def _open_start_voice_com_like_test(self, channel: int) -> Optional[dict]:
    """Réplica test_audio_1.py: SDK gestiona mic/altavoz del PC internamente."""
    self._open_rx_bytes = 0
    self._g711_rx_buf.clear()
    with self._lock:
      handle = self._sdk.NET_SDK_StartVoiceCom(
        self._user_id, False, self._cb_ref, None, channel,
      )
      if not handle or handle == -1:
        log.warning("StartVoiceCom no abrió: %s", err_text(self._get_last_error()))
        return None
      self._voice_handle = handle
      self._voice_mode = "StartVoiceCom"
      self._voice_mr_enc = False
      self._tx_chunk = PCM_CHUNK
      self._tx_format = "sdk_mic"
      self._tx_pace_pcm = 0
      self._set_volume_unlocked()
    time.sleep(2.5)
    rx_bytes = self._open_rx_bytes
    log.info(
      "StartVoiceCom handle=%s rxBytes=%s (TX vía micrófono del PC, como test_audio_1)",
      handle, rx_bytes,
    )
    return {
      "mode": "StartVoiceCom",
      "tx": False,
      "rx": rx_bytes >= 320,
      "txChunk": PCM_CHUNK,
      "txFormat": "sdk_mic",
      "txProbe": False,
      "rxBytes": rx_bytes,
    }

  def open_voice(self, channel: int, on_rx: Callable[[bytes], None]) -> dict:
    with self._lock:
      self._close_voice_unlocked()
      self._rx_callback = on_rx
      self._tx_fail_logged = False
      self._rx_decode_logged = False
      self._g711_rx_buf.clear()
      self._ensure_callback()

    if BRIDGE_SDK_MIC:
      vc = self._open_start_voice_com_like_test(channel)
      if vc and vc["rx"]:
        log.info("Perfil activo: StartVoiceCom (BRIDGE_SDK_MIC=1, igual test_audio_1)")
        return vc
      raise RuntimeError(
        f"StartVoiceCom falló: {err_text(self._get_last_error())}",
      )

    # Tablet: mic vía WebSocket → VoiceComSendData (solo válido con StartVoiceCom_MR).
    def _try_mr_g711() -> Optional[dict]:
      mr = self._open_and_eval(
          channel, use_mr=True, need_no_enc_data=False, probe_style="g711",
      )
      if mr and mr["rx"] and mr["txProbe"]:
        mr["tx"] = True
        log.info(
          "Perfil activo: MR(enc=False) RX=G711→PCM(%s) TX=%s chunk=%s",
          BRIDGE_RX_CODEC, mr.get("txFormat"), mr["txChunk"],
        )
        return mr
      with self._lock:
        self._stop_voice_handle_unlocked()
      return None

    def _try_mr_pcm() -> Optional[dict]:
      mr = self._open_and_eval(
          channel, use_mr=True, need_no_enc_data=True, probe_style="pcm",
      )
      if mr and mr["rx"] and mr["txProbe"]:
        mr["tx"] = True
        log.info(
          "Perfil activo: MR(enc=True) RX=PCM TX=%s chunk=%s",
          mr.get("txFormat"), mr["txChunk"],
        )
        return mr
      with self._lock:
        self._stop_voice_handle_unlocked()
      return None

    if BRIDGE_PREFER_RX_PCM:
      mr_vf = _try_mr_pcm()
      if mr_vf:
        return mr_vf
      mr_g711 = _try_mr_g711()
      if mr_g711:
        return mr_g711
    else:
      mr_g711 = _try_mr_g711()
      if mr_g711:
        return mr_g711
      mr_vf = _try_mr_pcm()
      if mr_vf:
        return mr_vf

    # 3) StartVoiceCom — solo RX hacia tablet; TX queda en mic del PC si existe
    vc = self._open_start_voice_com_like_test(channel)
    if vc and vc["rx"]:
      log.info(
        "Perfil activo: StartVoiceCom RX-only (sin VoiceComSendData; "
        "TX del PC si hay micrófono, no tablet)",
      )
      return vc

    for cand in (mr_g711, mr_vf, vc):
      if cand and cand["rx"]:
        cand["tx"] = cand.get("txProbe", False)
        return cand
    raise RuntimeError(
      f"No se pudo abrir voz (MR/StartVoiceCom): {err_text(self._get_last_error())}",
    )

  def _fetch_audio_info_unlocked(self) -> Optional[bytes]:
    if not self._voice_handle:
      return None
    buf = ctypes.create_string_buffer(256)
    if self._sdk.NET_SDK_GetAudioInfo(self._voice_handle, buf, 256):
      data = bytes(buf.raw)
      end = data.find(b"\x00")
      if end > 0:
        data = data[:end]
      if data:
        log.info("GetAudioInfo len=%s", len(data))
        return data
    return None

  def _release_encoder_unlocked(self) -> None:
    if self._encoder_handle and self._encoder_handle != -1:
      try:
        self._sdk.NET_SDK_ReleaseAudioEncoder(self._encoder_handle)
      except Exception:
        pass
    self._encoder_handle = None

  def _init_encoder_unlocked(self, g711_first: bool = True) -> bool:
    self._release_encoder_unlocked()
    ordered = [
      ("g711a", WAVE_G711A),
      ("device", self._fetch_audio_info_unlocked()),
      ("pcm8k", WAVE_PCM_8K),
    ]
    if not g711_first:
      ordered = [ordered[2], ordered[1], ordered[0]]
    for label, info in ordered:
      if not info:
        continue
      handle = self._sdk.NET_SDK_InitAudioEncoder(info, len(info))
      if handle and handle != -1:
        self._encoder_handle = handle
        log.info("InitAudioEncoder OK perfil=%s len=%s handle=%s", label, len(info), handle)
        return True
    return False

  def _encode_with_sdk_unlocked(self, pcm: bytes) -> Optional[bytes]:
    if not self._encoder_handle or not pcm:
      return None
    out_buf = (ctypes.c_char * 4096)()
    out_len = ctypes.c_int(4096)
    pcm_buf = (ctypes.c_char * len(pcm)).from_buffer_copy(pcm)
    ok = bool(self._sdk.NET_SDK_EncodeAudioFrame(
      self._encoder_handle, pcm_buf, ctypes.c_long(len(pcm)),
      out_buf, ctypes.byref(out_len),
    ))
    if ok and out_len.value > 0:
      return ctypes.string_at(out_buf, out_len.value)
    return None

  def _voice_send_unlocked(self, payload: bytes) -> bool:
    send_h = self._get_send_handle_unlocked()
    if not send_h or not payload:
      return False
    buf = (ctypes.c_char * len(payload)).from_buffer_copy(payload)
    return bool(self._sdk.NET_SDK_VoiceComSendData(
      send_h, buf, ctypes.c_ulong(len(payload)),
    ))

  @staticmethod
  def _normalize_pcm(pcm: bytes, size: int) -> bytes:
    if len(pcm) == size:
      return pcm
    out = bytearray(size)
    n = min(len(pcm), size)
    out[:n] = pcm[:n]
    return bytes(out)

  def _build_tx_payload_unlocked(self, pcm: bytes) -> Optional[bytes]:
    pcm = self._normalize_pcm(pcm, self._tx_chunk)
    if self._tx_format == "sdk_g711":
      return self._encode_with_sdk_unlocked(pcm)
    if self._tx_format == "g711_raw":
      return encode_pcm_to_g711(pcm, BRIDGE_G711_CODEC)
    return pcm

  def _run_tx_probes(
      self, probes: list[tuple[str, int, str, Callable[[], Optional[bytes]]]],
  ) -> tuple[bool, int, str]:
    for tag, chunk, fmt, make_payload in probes:
      payload = make_payload()
      if not payload:
        continue
      if self._voice_send_unlocked(payload):
        log.info("Probe TX OK %s payload=%s mic_pcm=%s", tag, len(payload), chunk)
        if fmt != "sdk_g711":
          self._release_encoder_unlocked()
        return True, chunk, fmt
    self._release_encoder_unlocked()
    return False, PCM_CHUNK, "pcm"

  def _probe_tx_pcm_unlocked(self) -> tuple[bool, int, str]:
    """voice_forward.cpp: PCM crudo 8 kHz (3200 B preferido)."""
    if not self._get_send_handle_unlocked():
      return False, PCM_CHUNK, "pcm"
    probes: list[tuple[str, int, str, Callable[[], Optional[bytes]]]] = [
      ("pcm", PCM_CHUNK_SDK, "pcm", lambda: bytes(PCM_CHUNK_SDK)),
      ("pcm", 1280, "pcm", lambda: bytes(1280)),
      ("pcm", PCM_CHUNK, "pcm", lambda: bytes(PCM_CHUNK)),
    ]
    ok, chunk, fmt = self._run_tx_probes(probes)
    if not ok:
      log.warning("Probe TX PCM falló err=%s", err_text(self._get_last_error()))
    return ok, chunk, fmt

  def _probe_tx_mr_unlocked(self) -> tuple[bool, int, str]:
    """MR(enc=False)+G711 RX: TX simétrico G711 320 B (Android voiceSendSymmetricG711).

    El probe con silencio PCM siempre devuelve True aunque el firmware espere G711;
  por eso G711 va primero (o forzado con BRIDGE_TX_FORMAT=g711).
    """
    if not self._get_send_handle_unlocked():
      return False, PCM_CHUNK, "g711_raw"

    tx_pref = BRIDGE_TX_FORMAT
    codec_tag = f"g711_{BRIDGE_G711_CODEC}"
    g711_probes = [(
      codec_tag, PCM_CHUNK, "g711_raw",
      lambda: encode_pcm_to_g711(bytes(PCM_CHUNK), BRIDGE_G711_CODEC),
    )]
    pcm_probes: list[tuple[str, int, str, Callable[[], Optional[bytes]]]] = [
      ("pcm", PCM_CHUNK_SDK, "pcm", lambda: bytes(PCM_CHUNK_SDK)),
      ("pcm", PCM_CHUNK, "pcm", lambda: bytes(PCM_CHUNK)),
      ("pcm", 1280, "pcm", lambda: bytes(1280)),
    ]

    if tx_pref == "g711":
      probes = g711_probes
    elif tx_pref == "pcm":
      probes = pcm_probes
    else:
      probes = g711_probes + pcm_probes

    ok, chunk, fmt = self._run_tx_probes(probes)
    if not ok:
      log.warning("Probe TX MR falló err=%s", err_text(self._get_last_error()))
    return ok, chunk, fmt

  def _set_volume_unlocked(self) -> None:
    if not self._voice_handle:
      return
    if BRIDGE_SDK_RX_VOL > 0:
      volumes = [BRIDGE_SDK_RX_VOL]
    else:
      volumes = [1, 3, 5, 8, 12, 15]
    for vol in volumes:
      try:
        if self._sdk.NET_SDK_SetVoiceComClientVolume(self._voice_handle, vol):
          log.info("SetVoiceComClientVolume OK vol=%s", vol)
          return
      except Exception:
        pass

  def send_pcm(self, pcm: bytes) -> bool:
    pace_bytes = 0
    ok = False
    with self._lock:
      if not self._voice_handle or not pcm or self._tx_format == "sdk_mic":
        return False
      payload = self._build_tx_payload_unlocked(pcm)
      if not payload:
        if not self._tx_fail_logged:
          self._tx_fail_logged = True
          log.warning("TX encode falló fmt=%s pcm=%s", self._tx_format, len(pcm))
        return False
      hook = self._tx_payload_hook
      if hook and payload:
        try:
          hook(payload)
        except Exception as ex:
          log.warning("TX payload hook: %s", ex)
      ok = self._voice_send_unlocked(payload)
      if not ok and not self._tx_fail_logged:
        self._tx_fail_logged = True
        log.warning(
          "VoiceComSendData falló pcm=%s payload=%s fmt=%s err=%s",
          len(pcm), len(payload), self._tx_format, err_text(self._get_last_error()),
        )
      elif ok:
        if self._tx_fail_logged:
          self._tx_fail_logged = False
          log.info("VoiceComSendData recuperado fmt=%s", self._tx_format)
        self._tx_sent_frames += 1
        if self._tx_sent_frames == 1 or self._tx_sent_frames % 50 == 0:
          log.info(
            "TX #%s pcm=%s payload=%s fmt=%s",
            self._tx_sent_frames, len(pcm), len(payload), self._tx_format,
          )
        pace_bytes = self._tx_pace_pcm
    if ok and pace_bytes > 0:
      time.sleep(pace_bytes / (SAMPLE_RATE * 2))
    return ok

  def close_voice(self) -> None:
    with self._lock:
      self._close_voice_unlocked()

  def _stop_voice_handle_unlocked(self) -> None:
    if self._voice_handle and self._voice_handle != -1:
      self._sdk.NET_SDK_StopVoiceCom(self._voice_handle)
      log.info("StopVoiceCom (%s)", self._voice_mode)
    self._voice_handle = None
    self._voice_mode = ""

  def _close_voice_unlocked(self) -> None:
    self._rx_callback = None
    self._g711_rx_buf.clear()
    self._release_encoder_unlocked()
    self._stop_voice_handle_unlocked()
    self._cb_ref = None


# ---------------------------------------------------------------------------
# Sesión intercom (una cámara por cliente WebSocket)
# ---------------------------------------------------------------------------
def camera_session_key(ip: str, port: int) -> str:
  return f"{ip.strip()}:{int(port)}"


def camera_tag(ip: str) -> str:
  return ip.strip().replace(".", "_").replace(":", "_") or "cam"


class BridgeSession:
  def __init__(self, sdk: TvtSdk) -> None:
    self.sdk = sdk
    self.camera_key = ""
    self.camera_ip = ""
    self.owner_ws: Any = None
    self.loop: Optional[asyncio.AbstractEventLoop] = None
    self._rx_bytes = 0
    self._tx_bytes = 0
    self._tx_buf = bytearray()
    self._rx_pcm_buf = bytearray()
    self._active = False
    self._rec_tx: Optional[PcmWavRecorder] = None
    self._rec_rx: Optional[PcmWavRecorder] = None
    self._rec_rx_raw: Optional[RawRecorder] = None
    self._rec_sdk: Optional[RawRecorder] = None
    self._record_stamp = ""
    self._rx_processor = RxAudioProcessor()
    self._rx_enable = True
    self._ws_rx_alive = True
    self._ws_send_fail_logged = False

  def _parse_rx_enable(self, params: dict) -> bool:
    if "rxEnable" in params:
      return bool(params["rxEnable"])
    return BRIDGE_RX_ENABLE

  def _start_recorders(self) -> None:
    self._stop_recorders()
    if not RECORD_ENABLED:
      return
    tag = camera_tag(self.camera_ip) if self.camera_ip else "cam"
    self._record_stamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    tx_path = RECORD_DIR / f"mic_tx_{tag}_{self._record_stamp}.wav"
    rx_path = RECORD_DIR / f"cam_rx_{tag}_{self._record_stamp}.wav"
    rx_raw_path = RECORD_DIR / f"cam_rx_raw_{tag}_{self._record_stamp}.bin"
    sdk_path = RECORD_DIR / f"sdk_tx_{tag}_{self._record_stamp}.bin"
    self._rec_tx = PcmWavRecorder(tx_path)
    self._rec_rx = PcmWavRecorder(rx_path)
    self._rec_rx_raw = RawRecorder(rx_raw_path)
    self._rec_sdk = RawRecorder(sdk_path)
    self.sdk._tx_payload_hook = self._rec_sdk.write
    self.sdk._rx_raw_hook = self._rec_rx_raw.write
    log.info("Grabación debug activa → %s", RECORD_DIR)
    log.info("  mic (WS→SDK): %s", tx_path.name)
    log.info("  payload SDK→cámara: %s", sdk_path.name)
    log.info("  cámara G711 crudo: %s", rx_raw_path.name)
    log.info("  cámara (SDK→WS): %s", rx_path.name)

  def _stop_recorders(self) -> None:
    self.sdk._tx_payload_hook = None
    self.sdk._rx_raw_hook = None
    for label, rec, is_pcm in (
        ("mic_tx", self._rec_tx, True),
        ("cam_rx", self._rec_rx, True),
        ("cam_rx_raw", self._rec_rx_raw, False),
        ("sdk_tx", self._rec_sdk, False),
    ):
      if rec is None:
        continue
      nbytes = rec.close()
      if is_pcm:
        secs = nbytes / (SAMPLE_RATE * 2) if nbytes else 0
        log.info("WAV %s: %s (%s B, %.1f s)", label, rec.path.name, nbytes, secs)
      else:
        log.info("BIN %s: %s (%s B)", label, rec.path.name, nbytes)
    self._rec_tx = None
    self._rec_rx = None
    self._rec_rx_raw = None
    self._rec_sdk = None

  def start(self, ws: Any, loop: asyncio.AbstractEventLoop, params: dict) -> dict:
    self.owner_ws = ws
    self.loop = loop
    ip = params["cameraIp"]
    port = int(params.get("sdkPort", 9008))
    self.camera_ip = ip
    self.camera_key = camera_session_key(ip, port)
    user = params.get("username", "admin")
    pwd = params.get("password", "")
    channel = int(params.get("channel", -1))
    self._rx_enable = self._parse_rx_enable(params)

    self.sdk.login(ip, port, user, pwd)

    def on_rx(pcm: bytes) -> None:
      if not pcm or not self._rx_enable:
        return
      if BRIDGE_RX_PROCESS:
        pcm = self._rx_processor.process(pcm)
      self._rx_bytes += len(pcm)
      if self._rec_rx is not None:
        self._rec_rx.write(pcm)
      if not (self.loop and self.owner_ws and self._ws_rx_alive):
        return
      self._rx_pcm_buf.extend(pcm)
      while len(self._rx_pcm_buf) >= RX_WS_CHUNK:
        chunk = bytes(self._rx_pcm_buf[:RX_WS_CHUNK])
        del self._rx_pcm_buf[:RX_WS_CHUNK]
        payload = bytes([MSG_RX]) + chunk
        asyncio.run_coroutine_threadsafe(self._send_binary(payload), self.loop)

    self._start_recorders()
    self._rx_processor.reset()
    info = self.sdk.open_voice(channel, on_rx)
    info["rx"] = bool(self._rx_enable and info.get("rx", True))
    if "tx" not in info or not info["tx"]:
      info["tx"] = bool(info.get("txProbe", False))
    self._active = True
    self._ws_rx_alive = True
    self._ws_send_fail_logged = False
    self._rx_bytes = 0
    self._tx_bytes = 0
    self._tx_buf.clear()
    self._rx_pcm_buf.clear()
    if self._rx_enable:
      log.info(
        "Sesión activa mode=%s txFmt=%s (RX SDK→tablet ON)",
        info.get("mode"), info.get("txFormat", "pcm"),
      )
    else:
      log.info(
        "Sesión activa mode=%s txFmt=%s (RX SDK OFF — escuchar por RTSP en tablet)",
        info.get("mode"), info.get("txFormat", "pcm"),
      )
    return info

  async def _send_binary(self, data: bytes) -> None:
    if not self._ws_rx_alive or not self.owner_ws:
      return
    try:
      await self.owner_ws.send(data)
    except Exception as ex:
      self._ws_rx_alive = False
      if not self._ws_send_fail_logged:
        self._ws_send_fail_logged = True
        log.warning(
          "Envío WS RX detenido (%s:%s): %s",
          self.camera_ip or "?", self.camera_key or "?", ex,
        )

  def handle_tx(self, pcm: bytes) -> None:
    if not self._active or not pcm:
      return
    if self._rec_tx is not None:
      self._rec_tx.write(pcm)
    # El mic WS siempre envía 640 B; el SDK puede necesitar 3200 B (voice_forward.cpp)
    agg = self.sdk._tx_chunk
    if agg <= 0:
      agg = PCM_CHUNK
    self._tx_buf.extend(pcm)
    while len(self._tx_buf) >= agg:
      frame = bytes(self._tx_buf[:agg])
      del self._tx_buf[:agg]
      if BRIDGE_TX_GAIN != 1.0 and BRIDGE_TX_GAIN > 0:
        samples = struct.unpack(f"<{len(frame) // 2}h", frame)
        frame = struct.pack(
            f"<{len(samples)}h",
            *[max(-32768, min(32767, int(s * BRIDGE_TX_GAIN))) for s in samples],
        )
      if self.sdk.send_pcm(frame):
        self._tx_bytes += len(frame)

  async def stop(self) -> None:
    self._active = False
    self._ws_rx_alive = False
    self.owner_ws = None
    self.loop = None
    self._tx_buf.clear()
    if self._rx_pcm_buf and self._rec_rx is not None:
      self._rec_rx.write(bytes(self._rx_pcm_buf))
    self._rx_pcm_buf.clear()
    self.sdk.close_voice()
    self._stop_recorders()
    log.info("Sesión cerrada (rx=%s tx=%s bytes)", self._rx_bytes, self._tx_bytes)


# ---------------------------------------------------------------------------
# Servidor WebSocket
# ---------------------------------------------------------------------------
class BridgeServer:
  def __init__(self) -> None:
    self._sessions_by_ws: dict[Any, BridgeSession] = {}
    self._sessions_by_camera: dict[str, BridgeSession] = {}
    self._session_lock = asyncio.Lock()
    self._sdk_boot = TvtSdk()

  def setup(self) -> None:
    self._sdk_boot.load()

  async def _drop_session(self, ws: Any, send_stopped: bool = False) -> None:
    session = self._sessions_by_ws.pop(ws, None)
    if session is None:
      return
    if self._sessions_by_camera.get(session.camera_key) is session:
      del self._sessions_by_camera[session.camera_key]
    await session.stop()
    session.sdk.logout()
    if send_stopped:
      try:
        await ws.send(json.dumps({"type": "stopped"}))
      except Exception:
        pass

  async def handle_client(self, websocket: Any) -> None:
    peer = getattr(websocket, "remote_address", "?")
    log.info("Cliente conectado %s", peer)
    try:
      async for message in websocket:
        if isinstance(message, str):
          await self._handle_text(websocket, message)
        elif isinstance(message, bytes):
          await self._handle_binary(websocket, message)
    except websockets.exceptions.ConnectionClosed:
      log.info("Cliente desconectado %s", peer)
    finally:
      async with self._session_lock:
        await self._drop_session(websocket, send_stopped=False)

  async def _handle_text(self, ws: Any, raw: str) -> None:
    try:
      msg = json.loads(raw)
    except json.JSONDecodeError:
      await ws.send(json.dumps({"type": "error", "message": "JSON inválido"}))
      return

    mtype = msg.get("type", "")
    if mtype == "ping":
      await ws.send(json.dumps({"type": "pong"}))
      return

    if mtype == "stop":
      async with self._session_lock:
        await self._drop_session(ws, send_stopped=False)
      await ws.send(json.dumps({"type": "stopped"}))
      return

    if mtype == "start":
      async with self._session_lock:
        try:
          ip = msg.get("cameraIp", "")
          port = int(msg.get("sdkPort", 9008))
          cam_key = camera_session_key(ip, port)
          existing_cam = self._sessions_by_camera.get(cam_key)
          if (
              existing_cam is not None
              and existing_cam._active
              and existing_cam.owner_ws is not ws
          ):
            raise RuntimeError(
                f"Intercom ocupado en {ip} por otro cliente "
                f"({len(self._sessions_by_camera)} cámara(s) activa(s))",
            )
          if ws in self._sessions_by_ws:
            await self._drop_session(ws, send_stopped=False)
          sdk = TvtSdk()
          sdk.load()
          session = BridgeSession(sdk)
          loop = asyncio.get_running_loop()
          try:
            info = session.start(ws, loop, msg)
          except Exception:
            session.sdk.logout()
            raise
          self._sessions_by_ws[ws] = session
          self._sessions_by_camera[cam_key] = session
          log.info(
            "Sesiones activas: %s (%s)",
            len(self._sessions_by_camera),
            ", ".join(sorted(self._sessions_by_camera)) or "-",
          )
          await ws.send(json.dumps({
            "type": "started",
            "tx": info.get("tx", False),
            "rx": info.get("rx", True),
            "mode": info.get("mode", ""),
            "cameraIp": ip,
            "txChunk": PCM_CHUNK,
            "txAgg": info.get("txChunk", PCM_CHUNK),
            "txFormat": info.get("txFormat", "pcm"),
            "rxChunk": RX_WS_CHUNK,
            "sampleRate": SAMPLE_RATE,
          }))
        except Exception as ex:
          log.exception("Error al iniciar sesión")
          await ws.send(json.dumps({"type": "error", "message": str(ex)}))
      return

    await ws.send(json.dumps({"type": "error", "message": f"tipo desconocido: {mtype}"}))

  async def _handle_binary(self, ws: Any, data: bytes) -> None:
    if len(data) < 2:
      return
    if data[0] != MSG_TX:
      return
    async with self._session_lock:
      session = self._sessions_by_ws.get(ws)
      if session is not None and session._active:
        session.handle_tx(data[1:])

  async def run(self) -> None:
    self.setup()
    log.info("Puente escuchando ws://%s:%s", BRIDGE_HOST, BRIDGE_PORT)
    log.info("SDK_DIR=%s", SDK_DIR)
    if RECORD_ENABLED:
      log.info("BRIDGE_RECORD=1 → WAV en %s", RECORD_DIR)
    else:
      log.info("BRIDGE_RECORD=0 (sin grabación WAV)")
    if BRIDGE_SDK_MIC:
      log.info("BRIDGE_SDK_MIC=1 → duplex como test_audio_1 (mic/altavoz del PC)")
    if BRIDGE_TX_FORMAT != "auto":
      log.info("BRIDGE_TX_FORMAT=%s", BRIDGE_TX_FORMAT)
    log.info("BRIDGE_TX_GAIN=%s (mic tablet→cámara)", BRIDGE_TX_GAIN)
    if not BRIDGE_RX_PROCESS:
      log.info("BRIDGE_RX_PROCESS=0 → PCM RX sin post-procesado")
    log.info("BRIDGE_RX_CODEC=%s (G711 cámara→tablet)", BRIDGE_RX_CODEC)
    if BRIDGE_PREFER_RX_PCM:
      log.info("BRIDGE_PREFER_RX_PCM=1 → MR(enc=True) RX en PCM antes que G711")
    log.info(
      "RX post-proc: gain=%s quiet<%s boost<=%s target=%s loud>%s hot>=%s hotGain=%s limit=%s hpf=%s sdkVol=%s",
      BRIDGE_RX_GAIN, BRIDGE_RX_QUIET_THRESH, BRIDGE_RX_MAX_BOOST,
      BRIDGE_RX_TARGET_PEAK, BRIDGE_RX_LOUD_THRESH, BRIDGE_RX_HOT_THRESH,
      BRIDGE_RX_HOT_GAIN, BRIDGE_RX_LIMIT, BRIDGE_RX_HPF, BRIDGE_SDK_RX_VOL,
    )
    async with serve(self.handle_client, BRIDGE_HOST, BRIDGE_PORT, max_size=2**20):
      await asyncio.Future()


def main() -> None:
  if sys.maxsize <= 2**32:
    log.warning("Usa Python 64 bits con DLL x64")
  server = BridgeServer()
  try:
    asyncio.run(server.run())
  except KeyboardInterrupt:
    log.info("Detenido por usuario")
  finally:
    TvtSdk.shutdown_shared()


if __name__ == "__main__":
  main()
