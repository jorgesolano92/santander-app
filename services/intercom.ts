import type { IntercomConfig } from '@/components/IntercomConfigurationModal';

import {
  isBridgeIntercomActive,
  startBridgeIntercom,
  stopBridgeIntercom,
} from '@/services/intercomBridge';
import {
  isSdkIntercomActive,
  startSdkIntercom,
  stopSdkIntercom,
} from '@/services/dvrSdkIntercom';

export function isIntercomActive(doorId?: string): boolean {
  return isBridgeIntercomActive(doorId) || isSdkIntercomActive(doorId);
}

export function usesBridgeMode(config: IntercomConfig): boolean {
  return config.intercomMode !== 'sdk';
}

/** Inicia intercom: puente Python por defecto; SDK nativo si intercomMode === 'sdk'. */
export async function startIntercom(doorId: string, config: IntercomConfig): Promise<boolean> {
  if (usesBridgeMode(config)) {
    return startBridgeIntercom(doorId, config);
  }
  return startSdkIntercom(doorId, config);
}

export async function stopIntercom(): Promise<void> {
  await stopBridgeIntercom();
  await stopSdkIntercom();
}
