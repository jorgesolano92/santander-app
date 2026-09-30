import type { IntercomConfig } from '@/components/IntercomConfigurationModal';
import { resolveRtspCameraFamily } from '@/utils/rtspCameraFamily';

/**
 * Grupo de codec de vídeo RTSP para concurrencia en tablet.
 * Mismo codec → pueden ir en paralelo. Codecs distintos → exclusivos.
 */
export type RtspVideoCodec = 'h264' | 'mpeg4' | 'hevc' | 'other';

/**
 * Resuelve el codec de vídeo usado en RTSP.
 * - Si `config.rtspVideoCodec` está definido (y no es auto), se respeta.
 * - Panphone por defecto: MPEG-4 (MP4V-ES).
 * - TVT / AXIS / resto: H.264.
 */
export function resolveRtspVideoCodec(config: IntercomConfig): RtspVideoCodec {
  const explicit = (config.rtspVideoCodec || '').trim().toLowerCase();
  if (explicit === 'h264' || explicit === 'avc') return 'h264';
  if (explicit === 'mpeg4' || explicit === 'mpeg-4' || explicit === 'mp4v') return 'mpeg4';
  if (explicit === 'hevc' || explicit === 'h265' || explicit === 'h.265') return 'hevc';
  if (explicit && explicit !== 'auto') return 'other';

  const family = resolveRtspCameraFamily(config);
  if (family === 'panphone') return 'mpeg4';
  if (family === 'axis' || family === 'tvt') return 'h264';
  return 'h264';
}

export function rtspCodecLabel(codec: RtspVideoCodec): string {
  switch (codec) {
    case 'h264':
      return 'H.264';
    case 'mpeg4':
      return 'MPEG-4';
    case 'hevc':
      return 'H.265';
    default:
      return 'vídeo';
  }
}
