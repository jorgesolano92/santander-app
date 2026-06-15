# -*- coding: utf-8 -*-
"""
reproducir_audio_sdk.py
Reproduce un audio pregrabado por el ALTAVOZ del videoportero TVT.
Proyecto: Control de Accesos Santander - SAIMA Seguridad

Sentido PC -> dispositivo (al reves que test_audio_sdk.py).
Usa NET_SDK_StartVoiceCom_MR + NET_SDK_VoiceComSendData (envia PCM crudo).

PREPARACION DEL AUDIO (con ffmpeg, una sola vez):
  Convierte tu MP3/WAV al formato exacto del dispositivo (PCM 8kHz mono 16-bit):
      ffmpeg -i mensaje.mp3 -ar 8000 -ac 1 -f s16le mensaje.raw
  Si el audio sale rapido/lento, ajusta -ar (prueba 16000).

Ejecutar en el PC Industrial (Windows IoT) con todas las DLLs del SDK presentes.
"""

import ctypes
import time
import os
import sys

# Resolucion de temporizador a 1 ms en Windows (clave para que los sleep cortos
# sean precisos y no se acumule retardo). Se restaura al salir.
try:
    _winmm = ctypes.WinDLL("winmm")
    _winmm.timeBeginPeriod(1)
except Exception:
    _winmm = None

# ----------------------------------------------------------------------------
# CONFIGURACION
# ----------------------------------------------------------------------------
SDK_DIR   = r"C:\Users\Javier Iglesias\Desktop\prueba audio"
DLL_NAME  = "DVR_NET_SDK.dll"
DLL_PATH  = os.path.join(SDK_DIR, DLL_NAME)

DEV_IP    = b"192.168.221.210"
DEV_PORT  = 9008
USERNAME  = b"admin"
PASSWORD  = b"Santander@01"
CHANNEL   = -1

# Audio a reproducir: PCM crudo (s16le). Convierte antes con ffmpeg (ver cabecera).
AUDIO_RAW = "mensaje.raw"

# Parametros del PCM (deben coincidir con la conversion de ffmpeg y con el equipo)
SAMPLE_RATE   = 8000     # Hz
CHANNELS      = 1        # mono
BYTES_SAMPLE  = 2        # 16 bits = 2 bytes
FRAME_MS      = 20       # 20 ms = estandar VoIP (G.711). Optimo latencia/overhead.

# Tamano de frame en bytes y pausa entre frames (para enviar a ritmo real)
FRAME_BYTES = int(SAMPLE_RATE * CHANNELS * BYTES_SAMPLE * FRAME_MS / 1000)
FRAME_SLEEP = FRAME_MS / 1000.0

ERROR_MAP = {
    0: "SUCCESS", 1: "PASSWORD_ERROR (usuario/contrasena)", 3: "NOINIT",
    8: "NETWORK_FAIL_CONNECT (no conecta con el dispositivo)",
    34: "DVR_VOICEOPENED (intercom ocupado por otro cliente)",
    50: "USERNOTEXIST", 90: "DEVICE_OFFLINE",
}
def err_text(c): return ERROR_MAP.get(c, f"codigo {c} (ver NET_SDK_ERROR.html)")


# Callback obligatorio aunque solo enviemos (CONFIRMADO en TALK_DATA_CALLBACK.html)
TALK_DATA_CALLBACK = ctypes.CFUNCTYPE(
    None, ctypes.c_void_p, ctypes.c_char_p,
    ctypes.c_uint, ctypes.c_ubyte, ctypes.c_void_p,
)
def _cb_func(handle, buf, size, flag, puser):
    pass  # no usamos el audio entrante en esta prueba
_cb = TALK_DATA_CALLBACK(_cb_func)


def main():
    if not os.path.exists(DLL_PATH):
        print(f"[ERROR] No se encuentra la DLL: {DLL_PATH}"); sys.exit(1)
    if not os.path.exists(AUDIO_RAW):
        print(f"[ERROR] No se encuentra el audio: {AUDIO_RAW}")
        print("        Conviertelo con: ffmpeg -i tu_audio.mp3 -ar 8000 -ac 1 -f s16le mensaje.raw")
        sys.exit(1)

    try:
        os.add_dll_directory(SDK_DIR)
    except (AttributeError, OSError):
        pass
    os.environ["PATH"] = SDK_DIR + os.pathsep + os.environ.get("PATH", "")

    try:
        sdk = ctypes.WinDLL(DLL_PATH)
    except OSError as e:
        print(f"[ERROR] No se pudo cargar la DLL.\n        {e}"); sys.exit(1)
    print("[OK] DLL cargada")

    # 1. Init
    sdk.NET_SDK_Init.restype = ctypes.c_bool
    if not sdk.NET_SDK_Init():
        print(f"[ERROR] Init: {err_text(sdk.NET_SDK_GetLastError())}"); sys.exit(1)
    print("[OK] SDK inicializado")

    try:
        sdk.NET_SDK_SetConnectTime.argtypes = [ctypes.c_uint, ctypes.c_uint]
        sdk.NET_SDK_SetConnectTime(5000, 1)
    except Exception:
        pass

    # 2. Login
    sdk.NET_SDK_Login.restype = ctypes.c_long
    sdk.NET_SDK_Login.argtypes = [ctypes.c_char_p, ctypes.c_ushort,
                                  ctypes.c_char_p, ctypes.c_char_p, ctypes.c_void_p]
    dev_info = ctypes.create_string_buffer(1024)
    print(f"[..] Login en {DEV_IP.decode()}:{DEV_PORT} ...")
    uid = sdk.NET_SDK_Login(DEV_IP, DEV_PORT, USERNAME, PASSWORD, ctypes.byref(dev_info))
    if uid < 0:
        print(f"[ERROR] Login: {err_text(sdk.NET_SDK_GetLastError())}")
        sdk.NET_SDK_Cleanup(); sys.exit(1)
    print(f"[OK] Login correcto. userID={uid}")

    handle = None
    try:
        # 3. Abrir canal de forwarding (CONFIRMADO en NET_SDK_StartVoiceCom_MR.html)
        #    bNeedNoEncodeData=FALSE -> el audio que enviamos al equipo va sin codificar (PCM)
        sdk.NET_SDK_StartVoiceCom_MR.restype = ctypes.c_void_p
        sdk.NET_SDK_StartVoiceCom_MR.argtypes = [ctypes.c_long, ctypes.c_bool,
                                                 TALK_DATA_CALLBACK, ctypes.c_void_p, ctypes.c_long]
        handle = sdk.NET_SDK_StartVoiceCom_MR(uid, False, _cb, None, CHANNEL)
        if not handle or handle == -1:
            print(f"[ERROR] StartVoiceCom_MR: {err_text(sdk.NET_SDK_GetLastError())}")
            return
        print(f"[OK] Canal de voz abierto (handle={handle})")

        # 4. Enviar el PCM por frames, a ritmo real (CONFIRMADO en NET_SDK_VoiceComSendData.html)
        sdk.NET_SDK_VoiceComSendData.restype = ctypes.c_bool
        sdk.NET_SDK_VoiceComSendData.argtypes = [ctypes.c_void_p, ctypes.c_char_p, ctypes.c_uint]

        with open(AUDIO_RAW, "rb") as f:
            pcm = f.read()
        total = len(pcm)
        print(f"[..] Reproduciendo {total} bytes en frames de {FRAME_BYTES} bytes ({FRAME_MS} ms)...")

        # Pacing contra RELOJ ABSOLUTO: cada frame n se envia en t0 + n*FRAME_MS.
        # Asi el error de cada sleep NO se acumula (no crece el retardo).
        t0 = time.perf_counter()
        sent = 0
        n = 0
        atrasos = 0
        while sent < total:
            chunk = pcm[sent:sent + FRAME_BYTES]
            ok = sdk.NET_SDK_VoiceComSendData(handle, chunk, len(chunk))
            if not ok:
                print(f"[AVISO] Fallo enviando frame {n}: "
                      f"{err_text(sdk.NET_SDK_GetLastError())}")
            sent += len(chunk)
            n += 1

            # Instante objetivo del SIGUIENTE frame y espera solo lo que falte
            objetivo = t0 + n * FRAME_SLEEP
            margen = objetivo - time.perf_counter()
            if margen > 0:
                time.sleep(margen)
            else:
                atrasos += 1   # vamos por detras: no dormimos, recuperamos

        if atrasos:
            print(f"[INFO] {atrasos} frames enviados con retraso (recuperados sin acumular).")
        print("[OK] Audio reproducido completo")
        time.sleep(0.2)  # margen para vaciar el buffer del dispositivo

    finally:
        if handle and handle != -1:
            sdk.NET_SDK_StopVoiceCom.restype = ctypes.c_bool
            sdk.NET_SDK_StopVoiceCom.argtypes = [ctypes.c_void_p]
            sdk.NET_SDK_StopVoiceCom(handle)
            print("[OK] Canal cerrado")
        sdk.NET_SDK_Logout.argtypes = [ctypes.c_long]
        sdk.NET_SDK_Logout(uid)
        sdk.NET_SDK_Cleanup()
        print("[OK] Logout y cleanup completados")
        if _winmm:
            _winmm.timeEndPeriod(1)


if __name__ == "__main__":
    main()
