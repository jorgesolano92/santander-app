import type { IntercomConfig } from '@/components/IntercomConfigurationModal';
import { INTERCOM_BRIDGE_ONLY } from '@/config/intercomFeatures';

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
import {
  isSipIntercomActive,
  startSipIntercom,
  stopSipIntercom,
} from '@/services/intercomSip';

export type IntercomMode = 'bridge' | 'sdk' | 'sip';

export function resolveIntercomMode(config: IntercomConfig): IntercomMode {
  if (INTERCOM_BRIDGE_ONLY) {
    return 'bridge';
  }
  if (config.intercomMode === 'sdk' || config.intercomMode === 'sip') {
    return config.intercomMode;
  }
  return 'bridge';
}

export function isIntercomActive(doorId?: string): boolean {
  return (
    isBridgeIntercomActive(doorId) ||
    isSdkIntercomActive(doorId) ||
    isSipIntercomActive(doorId)
  );
}

export function usesBridgeMode(config: IntercomConfig): boolean {
  return resolveIntercomMode(config) === 'bridge';
}

export function usesSipMode(config: IntercomConfig): boolean {
  return resolveIntercomMode(config) === 'sip';
}

/** Inicia intercom según intercomMode: bridge (PC), sdk (nativo) o sip (CSIP + sip.js). */
export async function startIntercom(doorId: string, config: IntercomConfig): Promise<boolean> {
  const mode = resolveIntercomMode(config);
  if (mode === 'sip') {
    return startSipIntercom(doorId, config);
  }
  if (mode === 'sdk') {
    return startSdkIntercom(doorId, config);
  }
  return startBridgeIntercom(doorId, config);
}

export async function stopIntercom(config?: IntercomConfig): Promise<void> {
  await stopBridgeIntercom();
  await stopSdkIntercom();
  await stopSipIntercom(config);
}

export function getIntercomModeLabel(mode: IntercomMode): string {
  switch (mode) {
    case 'sip':
      return 'INTERCOM SIP';
    case 'sdk':
      return 'INTERCOM SDK';
    default:
      return 'INTERCOM PUENTE';
  }
}
