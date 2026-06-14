# -*- coding: utf-8 -*-
"""
test_audio.py — Prueba RX intercom TVT con grabaciones comparables al puente.

Guarda en recordings/ (misma convención que audio_bridge.py):
  cam_rx_{stamp}.wav       PCM reproducible (SDK decode o G711→PCM)
  cam_rx_raw_{stamp}.bin   Bytes exactos del callback SDK (antes de post-proceso)
  sdk_tx_{stamp}.bin       Payload enviado con VoiceComSendData (solo modo MR + probe)

Modos (TEST_VOICE_MODE):
  voicecom  — StartVoiceCom(enc=False), igual que antes. RX=PCM del SDK.
  mr_g711   — StartVoiceCom_MR(enc=False), igual que puente tablet. RX=G711→decode.
  mr_pcm    — StartVoiceCom_MR(enc=True). RX=PCM del SDK.

Variables de entorno opcionales:
  TEST_VOICE_MODE, TEST_RX_CODEC (alaw|ulaw), TEST_SECONDS, TEST_RECORD_DIR,
  TEST_SDK_RX_VOL, TEST_PROBE_TX (0|1, envía silencio y graba sdk_tx en MR)

Ejemplo:
  python test_audio.py
  set TEST_VOICE_MODE=mr_g711
  set TEST_SECONDS=15
  python test_audio.py
"""

from __future__ import annotations

import ctypes
import os
import struct
import sys
import time
import wave
from datetime import datetime
from pathlib import Path

# ----------------------------------------------------------------------------
# Conexión (editar o usar variables de entorno)
# ----------------------------------------------------------------------------
SCRIPT_DIR = Path(__file__).resolve().parent
SDK_DIR = os.environ.get("SDK_DIR", str(SCRIPT_DIR))
DLL_NAME = "DVR_NET_SDK.dll"
DLL_PATH = os.path.join(SDK_DIR, DLL_NAME)

DEV_IP = os.environ.get("TEST_DEV_IP", "192.168.1.200").encode("ascii")
DEV_PORT = int(os.environ.get("TEST_DEV_PORT", "9008"))
USERNAME = os.environ.get("TEST_USERNAME", "admin").encode("utf-8")
PASSWORD = os.environ.get("TEST_PASSWORD", "Santander@01").encode("utf-8")
CHANNEL = int(os.environ.get("TEST_CHANNEL", "-1"))

TEST_SECONDS = int(os.environ.get("TEST_SECONDS", "10"))
RECORD_DIR = Path(os.environ.get("TEST_RECORD_DIR", str(SCRIPT_DIR / "recordings")))
VOICE_MODE = os.environ.get("TEST_VOICE_MODE", "voicecom").strip().lower()
_rx_codec = os.environ.get("TEST_RX_CODEC", "alaw").strip().lower()
RX_CODEC = "ulaw" if _rx_codec in ("ulaw", "mu", "mulaw", "g711u", "u") else "alaw"
SDK_RX_VOL = int(os.environ.get("TEST_SDK_RX_VOL", "8"))
PROBE_TX = os.environ.get("TEST_PROBE_TX", "1").lower() in ("1", "true", "yes", "on")

SAMPLE_RATE = 8000
G711_FRAME = 320
PCM_CHUNK = 640

ERROR_MAP = {
    0: "SUCCESS",
    1: "PASSWORD_ERROR",
    8: "NETWORK_FAIL_CONNECT",
    34: "DVR_VOICEOPENED",
    90: "DEVICE_OFFLINE",
}


def err_text(code: int) -> str:
    return ERROR_MAP.get(code, f"codigo {code}")


# ----------------------------------------------------------------------------
# Grabadores (misma idea que audio_bridge.py)
# ----------------------------------------------------------------------------
class RawRecorder:
    def __init__(self, path: Path) -> None:
        self.path = path
        self._bytes = 0
        path.parent.mkdir(parents=True, exist_ok=True)
        self._fh = open(path, "wb")

    def write(self, data: bytes) -> None:
        if data:
            self._fh.write(data)
            self._bytes += len(data)

    def close(self) -> int:
        self._fh.close()
        return self._bytes


class PcmWavRecorder:
    def __init__(self, path: Path, sample_rate: int = SAMPLE_RATE) -> None:
        self.path = path
        self._bytes = 0
        path.parent.mkdir(parents=True, exist_ok=True)
        self._wav = wave.open(str(path), "wb")
        self._wav.setnchannels(1)
        self._wav.setsampwidth(2)
        self._wav.setframerate(sample_rate)

    def write(self, pcm: bytes) -> None:
        if pcm and self._wav:
            self._wav.writeframes(pcm)
            self._bytes += len(pcm)

    def close(self) -> int:
        if self._wav:
            self._wav.close()
            self._wav = None
        return self._bytes


# ----------------------------------------------------------------------------
# G711 decode (mínimo, igual que puente)
# ----------------------------------------------------------------------------
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


def decode_g711_to_pcm(data: bytes, codec: str) -> bytes:
    out = bytearray(len(data) * 2)
    if codec == "ulaw":
        conv = _ulaw_to_linear
    else:
        conv = _alaw_to_linear
    for i, b in enumerate(data):
        sample = conv(b)
        out[i * 2] = sample & 0xFF
        out[i * 2 + 1] = (sample >> 8) & 0xFF
    return bytes(out)


def pcm_peak(pcm: bytes) -> int:
    if len(pcm) < 2:
        return 0
    samples = struct.unpack(f"<{len(pcm) // 2}h", pcm)
    return max(abs(s) for s in samples) if samples else 0


# ----------------------------------------------------------------------------
# Callback SDK
# ----------------------------------------------------------------------------
TALK_DATA_CALLBACK = ctypes.CFUNCTYPE(
    None,
    ctypes.c_void_p,
    ctypes.c_char_p,
    ctypes.c_uint,
    ctypes.c_ubyte,
    ctypes.c_void_p,
)


class VoiceCapture:
    def __init__(self, mode: str, rec_raw: RawRecorder, rec_wav: PcmWavRecorder) -> None:
        self.mode = mode
        self.rec_raw = rec_raw
        self.rec_wav = rec_wav
        self._g711_buf = bytearray()
        self.total_raw = 0
        self.total_pcm = 0
        self.peak = 0
        self.frames = 0

    def on_data(self, handle, buf, size, flag, puser) -> None:
        if size <= 0 or not buf:
            return
        raw = ctypes.string_at(buf, size)
        self.rec_raw.write(raw)
        self.total_raw += len(raw)
        self.frames += 1

        if self.mode == "mr_g711":
            self._g711_buf.extend(raw)
            while len(self._g711_buf) >= G711_FRAME:
                frame = bytes(self._g711_buf[:G711_FRAME])
                del self._g711_buf[:G711_FRAME]
                pcm = decode_g711_to_pcm(frame, RX_CODEC)
                self._write_pcm(pcm)
        else:
            self._write_pcm(raw)

    def _write_pcm(self, pcm: bytes) -> None:
        if not pcm:
            return
        self.rec_wav.write(pcm)
        self.total_pcm += len(pcm)
        pk = pcm_peak(pcm)
        if pk > self.peak:
            self.peak = pk


def setup_dll_path(sdk_dir: str) -> None:
    try:
        os.add_dll_directory(sdk_dir)
    except (AttributeError, OSError):
        pass
    os.environ["PATH"] = sdk_dir + os.pathsep + os.environ.get("PATH", "")


def open_voice_session(sdk, user_id: int, channel: int, mode: str, cb_ref):
    if mode == "voicecom":
        sdk.NET_SDK_StartVoiceCom.restype = ctypes.c_void_p
        sdk.NET_SDK_StartVoiceCom.argtypes = [
            ctypes.c_long, ctypes.c_bool,
            TALK_DATA_CALLBACK, ctypes.c_void_p, ctypes.c_long,
        ]
        handle = sdk.NET_SDK_StartVoiceCom(user_id, False, cb_ref, None, channel)
        label = "StartVoiceCom(enc=False) RX=PCM SDK"
    else:
        sdk.NET_SDK_StartVoiceCom_MR.restype = ctypes.c_void_p
        sdk.NET_SDK_StartVoiceCom_MR.argtypes = [
            ctypes.c_long, ctypes.c_bool,
            TALK_DATA_CALLBACK, ctypes.c_void_p, ctypes.c_long,
        ]
        enc = mode == "mr_pcm"
        handle = sdk.NET_SDK_StartVoiceCom_MR(user_id, enc, cb_ref, None, channel)
        if enc:
            label = "StartVoiceCom_MR(enc=True) RX=PCM SDK"
        else:
            label = f"StartVoiceCom_MR(enc=False) RX=G711→PCM({RX_CODEC})"
    return handle, label


def probe_tx_mr(sdk, voice_handle, rec_sdk_tx: RawRecorder) -> int:
    """Envía un frame G711 de silencio vía VoiceComSendData (como probe del puente)."""
    sdk.NET_SDK_VoiceComSendData.restype = ctypes.c_bool
    sdk.NET_SDK_VoiceComSendData.argtypes = [
        ctypes.c_void_p, ctypes.c_char_p, ctypes.c_uint,
    ]
    silence_pcm = bytes(G711_FRAME * 2)
    payload = encode_pcm_to_g711a(silence_pcm)
    if len(payload) > G711_FRAME:
        payload = payload[:G711_FRAME]
    sent = 0
    if sdk.NET_SDK_VoiceComSendData(voice_handle, payload, len(payload)):
        rec_sdk_tx.write(payload)
        sent = len(payload)
    return sent


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
    sample_count = len(pcm_data) // 2
    out = bytearray(sample_count)
    for i in range(sample_count):
        sample = int.from_bytes(pcm_data[i * 2: i * 2 + 2], "little", signed=True)
        out[i] = _linear_to_alaw(sample)
    return bytes(out)


def main() -> None:
    if VOICE_MODE not in ("voicecom", "mr_g711", "mr_pcm"):
        print(f"[ERROR] TEST_VOICE_MODE inválido: {VOICE_MODE}")
        print("        Valores: voicecom | mr_g711 | mr_pcm")
        sys.exit(1)

    if not os.path.exists(DLL_PATH):
        print(f"[ERROR] No se encuentra: {DLL_PATH}")
        sys.exit(1)

    setup_dll_path(SDK_DIR)
    try:
        sdk = ctypes.WinDLL(DLL_PATH)
    except OSError as e:
        print(f"[ERROR] No se pudo cargar DLL: {e}")
        sys.exit(1)
    print("[OK] DLL cargada")

    sdk.NET_SDK_Init.restype = ctypes.c_bool
    if not sdk.NET_SDK_Init():
        print(f"[ERROR] NET_SDK_Init: {err_text(sdk.NET_SDK_GetLastError())}")
        sys.exit(1)
    print("[OK] SDK init")

    try:
        sdk.NET_SDK_SetConnectTime.argtypes = [ctypes.c_uint, ctypes.c_uint]
        sdk.NET_SDK_SetConnectTime(5000, 1)
    except Exception:
        pass

    sdk.NET_SDK_Login.restype = ctypes.c_long
    sdk.NET_SDK_Login.argtypes = [
        ctypes.c_char_p, ctypes.c_ushort,
        ctypes.c_char_p, ctypes.c_char_p, ctypes.c_void_p,
    ]
    dev_info = ctypes.create_string_buffer(1024)
    user_id = sdk.NET_SDK_Login(DEV_IP, DEV_PORT, USERNAME, PASSWORD, ctypes.byref(dev_info))
    if user_id < 0:
        print(f"[ERROR] Login: {err_text(sdk.NET_SDK_GetLastError())}")
        sdk.NET_SDK_Cleanup()
        sys.exit(1)
    print(f"[OK] Login userId={user_id} → {DEV_IP.decode()}:{DEV_PORT}")

    stamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    path_rx_wav = RECORD_DIR / f"cam_rx_{stamp}.wav"
    path_rx_raw = RECORD_DIR / f"cam_rx_raw_{stamp}.bin"
    path_sdk_tx = RECORD_DIR / f"sdk_tx_{stamp}.bin"
    path_session = RECORD_DIR / f"test_session_{stamp}.txt"

    rec_raw = RawRecorder(path_rx_raw)
    rec_wav = PcmWavRecorder(path_rx_wav)
    rec_sdk_tx = RawRecorder(path_sdk_tx)

    capture = VoiceCapture(VOICE_MODE, rec_raw, rec_wav)

    @TALK_DATA_CALLBACK
    def _cb(handle, buf, size, flag, puser):
        capture.on_data(handle, buf, size, flag, puser)

    voice_handle = None
    mode_label = ""
    sdk_tx_bytes = 0
    try:
        voice_handle, mode_label = open_voice_session(sdk, user_id, CHANNEL, VOICE_MODE, _cb)
        if not voice_handle or voice_handle == -1:
            print(f"[ERROR] Voz no abrió: {err_text(sdk.NET_SDK_GetLastError())}")
            sys.exit(1)

        print(f"[OK] {mode_label} handle={voice_handle}")
        print(f"[OK] Grabando {TEST_SECONDS}s → {RECORD_DIR}")
        print(f"     cam_rx:     {path_rx_wav.name}")
        print(f"     cam_rx_raw: {path_rx_raw.name}")
        print(f"     sdk_tx:     {path_sdk_tx.name}")

        try:
            sdk.NET_SDK_SetVoiceComClientVolume.restype = ctypes.c_bool
            sdk.NET_SDK_SetVoiceComClientVolume.argtypes = [ctypes.c_void_p, ctypes.c_int]
            if sdk.NET_SDK_SetVoiceComClientVolume(voice_handle, SDK_RX_VOL):
                print(f"[OK] SetVoiceComClientVolume={SDK_RX_VOL}")
            else:
                print(f"[AVISO] SetVoiceComClientVolume falló vol={SDK_RX_VOL}")
        except Exception as ex:
            print(f"[AVISO] SetVoiceComClientVolume: {ex}")

        if PROBE_TX and VOICE_MODE in ("mr_g711", "mr_pcm"):
            time.sleep(0.5)
            sdk_tx_bytes = probe_tx_mr(sdk, voice_handle, rec_sdk_tx)
            if sdk_tx_bytes:
                print(f"[OK] Probe TX VoiceComSendData: {sdk_tx_bytes} B → sdk_tx")
            else:
                print("[AVISO] Probe TX falló (sdk_tx vacío)")
        elif VOICE_MODE == "voicecom":
            print("[INFO] voicecom: TX vía micrófono del PC (SDK); sdk_tx no aplica")

        for i in range(TEST_SECONDS):
            time.sleep(1)
            secs_pcm = capture.total_pcm / (SAMPLE_RATE * 2) if capture.total_pcm else 0
            print(
                f"   ...{i + 1}s  raw={capture.total_raw}B  pcm={capture.total_pcm}B "
                f"({secs_pcm:.1f}s) peak={capture.peak} frames={capture.frames}",
            )

    finally:
        if voice_handle and voice_handle != -1:
            sdk.NET_SDK_StopVoiceCom.restype = ctypes.c_bool
            sdk.NET_SDK_StopVoiceCom.argtypes = [ctypes.c_void_p]
            sdk.NET_SDK_StopVoiceCom(voice_handle)
            print("[OK] Voz cerrada")

        raw_n = rec_raw.close()
        wav_n = rec_wav.close()
        sdk_n = rec_sdk_tx.close()

        session_lines = [
            f"stamp={stamp}",
            f"mode={VOICE_MODE}",
            f"mode_label={mode_label}",
            f"device={DEV_IP.decode()}:{DEV_PORT}",
            f"channel={CHANNEL}",
            f"rx_codec={RX_CODEC}",
            f"sdk_rx_vol={SDK_RX_VOL}",
            f"raw_bytes={raw_n}",
            f"pcm_bytes={wav_n}",
            f"pcm_seconds={wav_n / (SAMPLE_RATE * 2):.2f}" if wav_n else "pcm_seconds=0",
            f"pcm_peak={capture.peak}",
            f"callback_frames={capture.frames}",
            f"sdk_tx_bytes={sdk_n}",
            f"cam_rx_wav={path_rx_wav.name}",
            f"cam_rx_raw={path_rx_raw.name}",
            f"sdk_tx={path_sdk_tx.name}",
        ]
        RECORD_DIR.mkdir(parents=True, exist_ok=True)
        path_session.write_text("\n".join(session_lines), encoding="utf-8")

        sdk.NET_SDK_Logout.argtypes = [ctypes.c_long]
        sdk.NET_SDK_Logout(user_id)
        sdk.NET_SDK_Cleanup()

        print("\n--- Resumen (comparar con audio_bridge recordings/) ---")
        print(f"  cam_rx_*.wav      {wav_n:>8} B  ({wav_n / (SAMPLE_RATE * 2):.1f} s @ 8 kHz)")
        print(f"  cam_rx_raw_*.bin  {raw_n:>8} B  (callback SDK tal cual)")
        print(f"  sdk_tx_*.bin      {sdk_n:>8} B  (VoiceComSendData probe)")
        print(f"  test_session      {path_session.name}")
        print(f"  PCM peak={capture.peak}  mode={VOICE_MODE}")

        if wav_n == 0:
            print("\n[AVISO] 0 bytes PCM. Prueba otro TEST_VOICE_MODE:")
            print("  set TEST_VOICE_MODE=mr_g711")
            print("  set TEST_VOICE_MODE=mr_pcm")


if __name__ == "__main__":
    main()
