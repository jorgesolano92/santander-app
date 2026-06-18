import type { IntercomConfig } from '@/components/IntercomConfigurationModal';
import { INTERCOM_BRIDGE_ONLY } from '@/config/intercomFeatures';
import { Alert } from 'react-native';

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
import { tabletCallService } from '@/services/tabletCallService';

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
  if (tabletCallService.isIntercomBusyForOthers()) {
    const holder = tabletCallService.getIntercomHolderUsername();
    Alert.alert(
      'Intercom en uso',
      holder
        ? `El canal bidireccional ya está en uso por ${holder}.`
        : 'El canal bidireccional ya está en uso en otra tablet.',
    );
    return false;
  }

  const claimed = await tabletCallService.claimIntercomChannel(doorId);
  if (!claimed) {
    const holder = tabletCallService.getIntercomHolderUsername();
    Alert.alert(
      'Intercom en uso',
      holder
        ? `El canal bidireccional ya está en uso por ${holder}.`
        : 'El canal bidireccional ya está en uso en otra tablet.',
    );
    return false;
  }

  const mode = resolveIntercomMode(config);
  let ok = false;
  if (mode === 'sip') {
    ok = await startSipIntercom(doorId, config);
  } else if (mode === 'sdk') {
    ok = await startSdkIntercom(doorId, config);
  } else {
    ok = await startBridgeIntercom(doorId, config);
  }

  if (!ok) {
    tabletCallService.releaseIntercomChannel();
  }
  return ok;
}

export async function stopIntercom(config?: IntercomConfig): Promise<void> {
  await stopBridgeIntercom();
  await stopSdkIntercom();
  await stopSipIntercom(config);
  tabletCallService.releaseIntercomChannel();
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
