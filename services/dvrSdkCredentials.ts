import type { IntercomConfig } from '@/components/IntercomConfigurationModal';

export function getSdkCredentials(config: IntercomConfig) {
  const sdkUser = (config.sdkUsername || '').trim();
  const useSdkAccount = sdkUser.length > 0;

  return {
    server: (config.cameraIP || '').trim(),
    port: String(config.sdkPort ?? 9008),
    username: useSdkAccount ? sdkUser : (config.onvifUsername || 'admin').trim(),
    password: useSdkAccount
      ? (config.sdkPassword ?? '')
      : (config.onvifPassword ?? ''),
    source: useSdkAccount ? 'SDK' : 'ONVIF',
  };
}
