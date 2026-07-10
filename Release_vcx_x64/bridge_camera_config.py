# -*- coding: utf-8 -*-
"""Perfiles de audio RX/TX por IP de cámara (bridge_cameras.json)."""

from __future__ import annotations

import json
import logging
from dataclasses import asdict, dataclass, fields
from pathlib import Path
from typing import Any

log = logging.getLogger("audio_bridge")


@dataclass
class CameraAudioProfile:
  """Parámetros de audio por sesión intercom (una cámara / IP)."""

  label: str = ""
  sdk_rx_vol: int = 3
  tx_gain: float = 1.0
  rx_gain: float = 0.82
  rx_limit: int = 15000
  rx_quiet_thresh: int = 3500
  rx_target_peak: int = 4800
  rx_max_boost: float = 2.2
  rx_loud_thresh: int = 6500
  rx_hot_thresh: int = 14000
  rx_hot_gain: float = 0.28
  rx_process: bool = True
  rx_hpf: bool = False
  rx_lpf: bool = True
  rx_lpf_hz: float = 2800.0
  rx_declick: bool = False
  rx_slew_max: int = 2800
  rx_gain_attack: float = 0.18
  rx_gain_release: float = 0.06
  rx_soft_limit: int = 8000

  def summary(self) -> str:
    return (
        f"sdkVol={self.sdk_rx_vol} gain={self.rx_gain} target={self.rx_target_peak} "
        f"boost<={self.rx_max_boost} loud>{self.rx_loud_thresh} hot>={self.rx_hot_thresh} "
        f"hotGain={self.rx_hot_gain} lpf={self.rx_lpf}@{self.rx_lpf_hz:.0f}Hz "
        f"declick={self.rx_declick} txGain={self.tx_gain}"
    )


_PROFILE_FIELDS = {f.name for f in fields(CameraAudioProfile)}


def _coerce_value(name: str, value: Any) -> Any:
  if value is None:
    return None
  if name == "label":
    return str(value).strip()
  if name in ("rx_process", "rx_hpf", "rx_lpf", "rx_declick"):
    if isinstance(value, bool):
      return value
    return str(value).lower() in ("1", "true", "yes", "on")
  if name in ("rx_gain", "rx_max_boost", "rx_hot_gain", "tx_gain",
              "rx_gain_attack", "rx_gain_release", "rx_lpf_hz"):
    return float(value)
  if name in ("sdk_rx_vol", "rx_limit", "rx_quiet_thresh", "rx_target_peak",
              "rx_loud_thresh", "rx_hot_thresh", "rx_slew_max", "rx_soft_limit"):
    return int(value)
  return value


def _merge_dict(base: dict[str, Any], overlay: dict[str, Any]) -> dict[str, Any]:
  out = dict(base)
  for key, value in overlay.items():
    if key not in _PROFILE_FIELDS or value is None:
      continue
    try:
      out[key] = _coerce_value(key, value)
    except (TypeError, ValueError) as ex:
      log.warning("Perfil cámara: ignorando %s=%r (%s)", key, value, ex)
  return out


def load_cameras_config_file(path: Path) -> dict[str, Any]:
  if not path.is_file():
    return {}
  try:
    data = json.loads(path.read_text(encoding="utf-8"))
  except (OSError, json.JSONDecodeError) as ex:
    log.warning("No se pudo leer %s: %s", path, ex)
    return {}
  if not isinstance(data, dict):
    log.warning("%s: raíz debe ser un objeto JSON", path)
    return {}
  return data


def resolve_camera_profile(
    camera_ip: str,
    config_path: Path,
    factory_defaults: CameraAudioProfile,
) -> CameraAudioProfile:
  """
  factory_defaults: valores base (env / código).
  Orden de merge: factory → json.default → json.cameras[ip].
  """
  ip = camera_ip.strip()
  merged = asdict(factory_defaults)
  file_data = load_cameras_config_file(config_path)

  default_block = file_data.get("default")
  if isinstance(default_block, dict):
    merged = _merge_dict(merged, default_block)

  cameras = file_data.get("cameras")
  if isinstance(cameras, dict):
    ip_block = cameras.get(ip)
    if isinstance(ip_block, dict):
      merged = _merge_dict(merged, ip_block)
    elif ip:
      log.debug("Sin entrada en cameras para IP %s — se usa default", ip)

  profile = CameraAudioProfile(**merged)
  if not profile.label:
    profile.label = ip or "default"
  return profile
