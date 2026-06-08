import { Alert } from 'react-native';
import type { IntercomConfig } from '@/components/IntercomConfigurationModal';
import DvrSdkService from '@/services/DvrSdkService';
import { getSdkCredentials } from '@/services/dvrSdkCredentials';

import { getSdkErrorLabel } from '@/services/sdkErrorLabels';

function parseErrorCode(e: unknown): number {
  const msg = String((e as any)?.message || e || '');
  const m = msg.match(/c[oó]digo de error:\s*(\d+)/i) || msg.match(/error:\s*(\d+)/i);
  return m ? parseInt(m[1], 10) : -1;
}

/** Prueba login Net SDK (TCP) contra la cámara configurada. */
export async function testDvrSdkLogin(intercomConfig: IntercomConfig): Promise<void> {
  if (!DvrSdkService.isAvailable()) {
    Alert.alert('SDK', 'Solo disponible en la app Android compilada (no Expo Go web).');
    return;
  }

  const creds = getSdkCredentials(intercomConfig);
  if (!creds.server) {
    Alert.alert('SDK', 'No hay IP de cámara configurada.');
    return;
  }

  if (!creds.password) {
    Alert.alert(
      'SDK',
      `Falta la contraseña SDK.\n\nUsuario: ${creds.username}\nConfigúrala en Intercom → Contraseña SDK (p. ej. la del panel, no la ONVIF).`
    );
    return;
  }

  console.log(
    `[SDK] Login TCP ${creds.server}:${creds.port} user=${creds.username} (${creds.source})`
  );

  try {
    await DvrSdkService.initialize();
    const result = await DvrSdkService.login({
      server: creds.server,
      port: creds.port,
      username: creds.username,
      password: creds.password,
      loginType: 0,
    });

    let infoText = '';
    try {
      const info = await DvrSdkService.getDeviceInfo();
      infoText = `\n\nDispositivo: ${info.deviceName || '—'}\nFirmware: ${info.firmwareVersion || '—'}`;
    } catch {
      // ignore
    }

    console.log(`[SDK] OK userId=${result.userId}`);
    Alert.alert(
      'SDK OK',
      `${creds.server}:${creds.port}\nUsuario: ${creds.username}\nuserId: ${result.userId}${infoText}`
    );

    // Liberar sesión diferida para no bloquear el canal de voz en la cámara.
    setTimeout(() => {
      void DvrSdkService.logout().catch((e) => console.warn('[SDK] liberar sesión tras prueba:', e));
    }, 1000);
  } catch (e: any) {
    let code = parseErrorCode(e);
    if (code < 0) {
      code = await DvrSdkService.getLastError();
    }
    const label = getSdkErrorLabel(code);
    console.error('[SDK] Login falló', { code, label, message: e?.message, user: creds.username });

    const hint =
      code === 1 || code === 2
        ? '\n\nRevisa Usuario/Contraseña SDK en configuración (suele ser admin + clave del panel, no ONVIF).'
        : code === 8
          ? '\n\nLa tablet debe estar en la misma red que 192.168.1.200 (Wi‑Fi LAN, no solo ZeroTier en PC).'
          : '';

    Alert.alert(
      'SDK falló',
      `${creds.server}:${creds.port}\nUsuario: ${creds.username} (${creds.source})\nCódigo ${code}: ${label}${hint}\n\n${e?.message || ''}`
    );
  }
}
