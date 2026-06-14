# -*- coding: utf-8 -*-
"""
test_audio_sdk.py
Prueba de audio (voice intercom) contra videoportero TVT mediante DVR_NET_SDK.dll
Proyecto: Control de Accesos Santander - SAIMA Seguridad

Ejecutar en el PC Industrial (Windows IoT) con la DLL del SDK en la misma carpeta.

IMPORTANTE - arquitectura de bits:
  Si DVR_NET_SDK.dll es de 32 bits -> usa Python 32 bits.
  Si es de 64 bits -> usa Python 64 bits.
  Un desajuste aqui da "WinError 193" / "not a valid Win32 application".
"""

import ctypes
import time
import os
import sys

# ----------------------------------------------------------------------------
# PARAMETROS DE CONEXION (los que pasaste)
# ----------------------------------------------------------------------------
# Carpeta donde estan TODAS las DLLs del SDK (DVR_NET_SDK.dll + sus dependencias).
# Apunta a la carpeta 'lib' del SDK, NO copies solo DVR_NET_SDK.dll suelta.
# Ejemplos:
#   SDK_DIR = r"C:\Users\Javier Iglesias\Desktop\prueba audio"
#   SDK_DIR = r"C:\SDK_TVT\lib"
SDK_DIR   = r"C:\Users\Administrator\Desktop\prueba audio"
DLL_NAME  = "DVR_NET_SDK.dll"
DLL_PATH  = os.path.join(SDK_DIR, DLL_NAME)

DEV_IP    = b"192.168.1.200"          # Service
DEV_PORT  = 9008                        # Data Port (puerto SDK)
USERNAME  = b"admin"
PASSWORD  = b"Santander@01"
CHANNEL   = -1                          # -1 = el propio dispositivo (IPC/videoportero)
TEST_SECONDS = 10                       # cuanto tiempo mantener abierto el canal de voz
SAVE_RAW  = "audio_recibido.raw"        # vuelca el audio recibido del dispositivo

# ----------------------------------------------------------------------------
# Tabla de codigos de error (extraida de NET_SDK_ERROR.html del SDK)
# ----------------------------------------------------------------------------
ERROR_MAP = {
    0:  "SUCCESS (sin error)",
    1:  "PASSWORD_ERROR (usuario o contrasena incorrectos)",
    2:  "NOENOUGH_AUTH (permisos insuficientes)",
    3:  "NOINIT (SDK no inicializado)",
    5:  "OVER_MAXLINK (numero maximo de clientes conectados superado)",
    6:  "LOGIN_REFUSED (login SDK denegado)",
    7:  "VERSION_NOMATCH (version SDK no coincide)",
    8:  "NETWORK_FAIL_CONNECT (fallo al conectar con el dispositivo)",
    9:  "NETWORK_NOT_CONNECT (servidor no conectado)",
    12: "NETWORK_RECV_TIMEOUT (timeout recibiendo del servidor)",
    34: "DVR_VOICEOPENED (el intercom de voz esta ocupado)",
    50: "USERNOTEXIST (el usuario no existe)",
    90: "DEVICE_OFFLINE (equipo offline)",
}


def err_text(code):
    return ERROR_MAP.get(code, f"codigo {code} (consultar NET_SDK_ERROR.html)")


# ----------------------------------------------------------------------------
# Prototipo del callback de datos de voz. (CONFIRMADO en TALK_DATA_CALLBACK.html)
#  void TALK_DATA_CALLBACK(POINTERHANDLE lVoiceComHandle, char* pRecvDataBuffer,
#                          DWORD dwBufSize, BYTE byAudioFlag, void* pUser)
#  - pRecvDataBuffer: datos PCM SIN codificar (audio crudo reproducible).
#  - byAudioFlag: solo vale 1 = datos de intercom enviados DESDE el dispositivo.
# ----------------------------------------------------------------------------
TALK_DATA_CALLBACK = ctypes.CFUNCTYPE(
    None,                    # void return
    ctypes.c_void_p,         # lVoiceComHandle (POINTERHANDLE)
    ctypes.c_char_p,         # pRecvDataBuffer (PCM crudo)
    ctypes.c_uint,           # dwBufSize
    ctypes.c_ubyte,          # byAudioFlag (siempre 1 = audio del dispositivo)
    ctypes.c_void_p,         # pUser
)

_raw_file = None
_total_bytes = 0


def _voice_callback(handle, buf, size, flag, puser):
    """Se invoca cada vez que llega un frame de audio (PCM crudo) del dispositivo.
    flag siempre vale 1 = audio enviado desde el videoportero."""
    global _raw_file, _total_bytes
    if size > 0 and buf:
        data = ctypes.string_at(buf, size)
        _total_bytes += size
        if _raw_file:
            _raw_file.write(data)
    # No imprimimos en cada frame para no saturar; resumen al final.


# Mantener una referencia global para que el GC no libere el callback
_cb = TALK_DATA_CALLBACK(_voice_callback)


def main():
    global _raw_file, _total_bytes

    if not os.path.exists(DLL_PATH):
        print(f"[ERROR] No se encuentra la DLL: {DLL_PATH}")
        print("        Revisa SDK_DIR y que DVR_NET_SDK.dll este ahi.")
        sys.exit(1)

    # Registrar la carpeta del SDK para que se encuentren las DLLs dependientes
    # (Play.dll, etc.). Imprescindible en Python 3.8+ en Windows.
    try:
        os.add_dll_directory(SDK_DIR)
    except (AttributeError, OSError):
        pass
    # Como red de seguridad adicional, anadir tambien al PATH del proceso.
    os.environ["PATH"] = SDK_DIR + os.pathsep + os.environ.get("PATH", "")

    # Cargar la DLL por ruta absoluta
    try:
        sdk = ctypes.WinDLL(DLL_PATH)
    except OSError as e:
        print(f"[ERROR] No se pudo cargar la DLL.\n        {e}\n")
        print("Causas habituales:")
        print("  1. Faltan DLLs dependientes: copia la carpeta 'lib' COMPLETA del")
        print("     SDK (todas las .dll), no solo DVR_NET_SDK.dll.")
        print("  2. Arquitectura: Python 64 bits necesita DLL 64 bits (y 32 con 32).")
        print(f"     Tu Python actual es de {64 if sys.maxsize > 2**32 else 32} bits.")
        sys.exit(1)
    print("[OK] DLL cargada correctamente")

    # ------------------------------------------------------------------
    # 1. Init
    # ------------------------------------------------------------------
    sdk.NET_SDK_Init.restype = ctypes.c_bool
    if not sdk.NET_SDK_Init():
        last = sdk.NET_SDK_GetLastError()
        print(f"[ERROR] NET_SDK_Init fallo: {err_text(last)}")
        sys.exit(1)
    print("[OK] SDK inicializado")

    # Fijar timeout de conexion para no quedarse colgado si el dispositivo
    # no responde (tiempo en ms, reintentos). Si no existe la funcion, se ignora.
    try:
        sdk.NET_SDK_SetConnectTime.argtypes = [ctypes.c_uint, ctypes.c_uint]
        sdk.NET_SDK_SetConnectTime(5000, 1)   # 5 s, 1 intento
        print("[OK] Timeout de conexion fijado en 5s")
    except Exception:
        pass

    print(f"[..] Intentando login en {DEV_IP.decode()}:{DEV_PORT} ...")

    # ------------------------------------------------------------------
    # 2. Login  (CONFIRMADO en NET_SDK_Login.html)
    #  LONG NET_SDK_Login(char* sDVRIP, WORD wDVRPort, char* sUserName,
    #                     char* sPassword, LPNET_SDK_DEVICEINFO lpDeviceInfo)
    #  lpDeviceInfo es parametro de SALIDA: el SDK rellena el buffer.
    #  Devuelve el userID (-1 = fallo). Ese ID es unico y se usa en todo lo demas.
    # ------------------------------------------------------------------
    sdk.NET_SDK_Login.restype = ctypes.c_long
    sdk.NET_SDK_Login.argtypes = [
        ctypes.c_char_p, ctypes.c_ushort,
        ctypes.c_char_p, ctypes.c_char_p,
        ctypes.c_void_p,
    ]
    dev_info = ctypes.create_string_buffer(1024)  # buffer DEVICEINFO

    user_id = sdk.NET_SDK_Login(DEV_IP, DEV_PORT, USERNAME, PASSWORD,
                                ctypes.byref(dev_info))
    if user_id < 0:
        last = sdk.NET_SDK_GetLastError()
        print(f"[ERROR] Login fallo (userID={user_id}): {err_text(last)}")
        sdk.NET_SDK_Cleanup()
        sys.exit(1)
    print(f"[OK] Login correcto. userID={user_id}")

    voice_handle = None
    try:
        # --------------------------------------------------------------
        # 3. Abrir canal de voz (CONFIRMADO en NET_SDK_StartVoiceCom.html)
        #  POINTERHANDLE NET_SDK_StartVoiceCom(LONG lUserID, BOOL bNeedCBNoEncData,
        #     TALK_DATA_CALLBACK cb, void* pUser, LONG lChannel = -1)
        #  bNeedCBNoEncData = FALSE -> el stream del dispositivo se DECODIFICA
        #     antes del callback (mas comodo para escuchar/volcar).
        # --------------------------------------------------------------
        sdk.NET_SDK_StartVoiceCom.restype = ctypes.c_void_p
        sdk.NET_SDK_StartVoiceCom.argtypes = [
            ctypes.c_long, ctypes.c_bool,
            TALK_DATA_CALLBACK, ctypes.c_void_p, ctypes.c_long,
        ]

        _raw_file = open(SAVE_RAW, "wb")
        voice_handle = sdk.NET_SDK_StartVoiceCom(
            user_id, False, _cb, None, CHANNEL
        )

        if not voice_handle or voice_handle == -1:
            last = sdk.NET_SDK_GetLastError()
            print(f"[ERROR] StartVoiceCom fallo: {err_text(last)}")
        else:
            print(f"[OK] Canal de voz abierto (handle={voice_handle}). "
                  f"Capturando {TEST_SECONDS}s de audio del dispositivo...")

            # ----------------------------------------------------------
            # 4. (Opcional) Leer info de audio (CONFIRMADO en NET_SDK_GetAudioInfo.html)
            # ----------------------------------------------------------
            sdk.NET_SDK_GetAudioInfo.restype = ctypes.c_bool
            sdk.NET_SDK_GetAudioInfo.argtypes = [
                ctypes.c_void_p, ctypes.c_void_p, ctypes.c_long,
            ]
            audio_info = ctypes.create_string_buffer(256)
            if sdk.NET_SDK_GetAudioInfo(voice_handle, audio_info, 256):
                print("[OK] Info de audio leida (revisar struct para decodificar el formato).")

            # ----------------------------------------------------------
            # 4b. Subir el volumen al maximo.
            #  *** FIRMA ESTANDAR - verificar contra
            #      NET_SDK_SetVoiceComClientVolume.html ***
            #  La escala suele ser 0-15 o 0-100 segun el equipo.
            #  Probamos varios valores tipicos de "maximo".
            # ----------------------------------------------------------
            VOLUMEN_MAX = 1   # cambia a 15 si tu escala es 0-15
            try:
                sdk.NET_SDK_SetVoiceComClientVolume.restype = ctypes.c_bool
                sdk.NET_SDK_SetVoiceComClientVolume.argtypes = [
                    ctypes.c_void_p, ctypes.c_int,
                ]
                if sdk.NET_SDK_SetVoiceComClientVolume(voice_handle, VOLUMEN_MAX):
                    print(f"[OK] Volumen ajustado a {VOLUMEN_MAX}")
                else:
                    last = sdk.NET_SDK_GetLastError()
                    print(f"[AVISO] No se pudo fijar el volumen: {err_text(last)}")
                    print("        Prueba con VOLUMEN_MAX = 15 (escala 0-15).")
            except Exception as ex:
                print(f"[AVISO] Error llamando a SetVoiceComClientVolume: {ex}")

            # Mantener el canal abierto recibiendo audio
            for i in range(TEST_SECONDS):
                time.sleep(1)
                print(f"   ...{i+1}s  bytes recibidos: {_total_bytes}")

    finally:
        # ------------------------------------------------------------------
        # 5. Cerrar todo limpiamente
        # ------------------------------------------------------------------
        if voice_handle and voice_handle != -1:
            sdk.NET_SDK_StopVoiceCom.restype = ctypes.c_bool
            sdk.NET_SDK_StopVoiceCom.argtypes = [ctypes.c_void_p]
            sdk.NET_SDK_StopVoiceCom(voice_handle)
            print("[OK] Canal de voz cerrado")

        if _raw_file:
            _raw_file.close()

        sdk.NET_SDK_Logout.argtypes = [ctypes.c_long]
        sdk.NET_SDK_Logout(user_id)
        sdk.NET_SDK_Cleanup()
        print("[OK] Logout y cleanup completados")

        print(f"\nResumen: {_total_bytes} bytes de audio guardados en '{SAVE_RAW}'.")
        if _total_bytes == 0:
            print("  Si son 0 bytes: el canal abrio pero el dispositivo no envia audio,")
            print("  o el formato no se decodifica con bNeedCBNoEncData=FALSE. Prueba con TRUE.")


if __name__ == "__main__":
    main()
