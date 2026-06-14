# -*- coding: utf-8 -*-
"""Diagnóstico de carga del SDK TVT en Windows (PC industrial).

Ejecutar en la misma carpeta que DVR_NET_SDK.dll:
  python check_sdk_dll.py
"""
from __future__ import annotations

import ctypes
import os
import sys

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
SDK_DIR = os.environ.get("SDK_DIR", SCRIPT_DIR)
MAIN_DLL = "DVR_NET_SDK.dll"

PRELOAD = (
  "glew32.dll", "glut64.dll", "SDL2.dll",
  "OpensslSDK.dll", "Network.dll", "ShareLib.dll",
  "VADecoder.dll", "NatClientSDK.dll", "VideoDisplaySDK.dll",
  MAIN_DLL,
)

LOAD_FLAGS = 0x00001000 | 0x00000200  # DLL_LOAD_DIR | APPLICATION_DIR


def win32_err() -> str:
  err = ctypes.get_last_error()
  if not err:
    return "?"
  buf = ctypes.create_unicode_buffer(1024)
  k32 = ctypes.WinDLL("kernel32", use_last_error=True)
  k32.FormatMessageW(0x00001000, None, err, 0, buf, len(buf), None)
  return f"{err} ({buf.value.strip()})"


def try_load(name: str) -> bool:
  path = os.path.join(SDK_DIR, name)
  if not os.path.isfile(path):
    print(f"  [SKIP] {name} — no está en la carpeta")
    return True
  k32 = ctypes.WinDLL("kernel32", use_last_error=True)
  k32.LoadLibraryExW.argtypes = [ctypes.c_wchar_p, ctypes.c_void_p, ctypes.c_uint32]
  k32.LoadLibraryExW.restype = ctypes.c_void_p
  h = k32.LoadLibraryExW(path, None, LOAD_FLAGS)
  if h:
    print(f"  [OK]   {name}")
    return True
  print(f"  [FAIL] {name} — {win32_err()}")
  return False


def check_vcredist() -> list[str]:
  """DLLs del runtime MSVC que suelen faltar en PCs industriales (error 126)."""
  sys32 = os.path.join(os.environ.get("SystemRoot", r"C:\Windows"), "System32")
  needed = ("vcruntime140.dll", "vcruntime140_1.dll", "msvcp140.dll")
  return [d for d in needed if not os.path.isfile(os.path.join(sys32, d))]


def main() -> int:
  print(f"SDK_DIR: {SDK_DIR}")
  print(f"Python:  {sys.version}")
  print(f"Bits:    {64 if sys.maxsize > 2**32 else 32}")
  dlls = [f for f in os.listdir(SDK_DIR) if f.lower().endswith(".dll")]
  print(f"DLLs:    {len(dlls)} → {', '.join(sorted(dlls))}")

  missing_rt = check_vcredist()
  if missing_rt:
    print(f"VC++:    FALTAN en System32 → {', '.join(missing_rt)}")
    print("          Instala: https://aka.ms/vs/17/release/vc_redist.x64.exe")
  else:
    print("VC++:    vcruntime140 / msvcp140 presentes en System32")
  print()

  try:
    os.add_dll_directory(SDK_DIR)
  except (AttributeError, OSError):
    pass
  os.environ["PATH"] = SDK_DIR + os.pathsep + os.environ.get("PATH", "")

  ok = True
  old = os.getcwd()
  try:
    os.chdir(SDK_DIR)
    for name in PRELOAD:
      if not try_load(name):
        ok = False
        break
  finally:
    os.chdir(old)

  print()
  if ok:
    print("Todas las DLL cargaron. Prueba: python test_audio_1.py")
    return 0

  print("Alguna DLL falló.")
  if missing_rt:
    print("  → Casi seguro: instala VC++ Redistributable 2015-2022 x64 y reinicia:")
    print("    https://aka.ms/vs/17/release/vc_redist.x64.exe")
  else:
    print("  → VC++ parece instalado; prueba SDKDEMO_x64.exe o Python 3.12")
  print("  → Luego: python check_sdk_dll.py de nuevo")
  return 1


if __name__ == "__main__":
  raise SystemExit(main())
