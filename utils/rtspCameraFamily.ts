import type { IntercomConfig } from '@/components/IntercomConfigurationModal';

/**
 * Familia de stack RTSP (snapshot URLs, heurísticas de dispositivo).
 * La concurrencia de reproducción ya no usa familia: ver `rtspVideoCodec`.
 */
export type RtspCameraFamily = 'panphone' | 'tvt' | 'axis' | 'other';

export function resolveRtspCameraFamily(config: IntercomConfig): RtspCameraFamily {
  const path = (config.rtspPath || '').trim().replace(/^\//, '').toLowerCase();
  const name = `${config.name || ''} ${config.cameraIP || ''}`.toLowerCase();
  const user = (config.onvifUsername || '').toLowerCase();
  const pass = (config.onvifPassword || '').toLowerCase();

  if (
    path.startsWith('video') ||
    pass === 'panphone' ||
    name.includes('panphone') ||
    (Boolean(config.csipApiHost?.trim()) && config.intercomMode === 'sip' && path.includes('video'))
  ) {
    return 'panphone';
  }

  if (path.includes('axis-media') || name.includes('axis') || user.includes('root')) {
    return 'axis';
  }

  if (
    !path ||
    path === 'profile1' ||
    path === 'profile2' ||
    path.startsWith('profile') ||
    config.intercomMode === 'bridge' ||
    config.intercomMode === 'sdk' ||
    name.includes('tvt') ||
    name.includes('safire')
  ) {
    return 'tvt';
  }

  return 'other';
}

export function rtspFamilyLabel(family: RtspCameraFamily): string {
  switch (family) {
    case 'panphone':
      return 'Panphone';
    case 'tvt':
      return 'TVT';
    case 'axis':
      return 'AXIS';
    default:
      return 'cámara';
  }
}
