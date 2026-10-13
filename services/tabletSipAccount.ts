import type { IntercomConfig } from '@/components/IntercomConfigurationModal';

/** Cuenta SIP de la tablet en la centralita: una por tablet, común a todos los intercomunicadores. */
export interface TabletSipAccount {
  /** Extensión de la tablet (usuario SIP), p. ej. 201. */
  extension: string;
  password: string;
  /** Dominio / IP de la centralita, p. ej. 192.168.1.154. */
  domain: string;
  /** WebSocket SIP, p. ej. 192.168.1.154:8088/ws (o wss://…:8089/ws). */
  server: string;
  enableTLS: boolean;
}

export const EMPTY_TABLET_SIP_ACCOUNT: TabletSipAccount = {
  extension: '',
  password: '',
  domain: '',
  server: '',
  enableTLS: false,
};

let activeAccount: TabletSipAccount | null = null;

export function setActiveTabletSipAccount(account: TabletSipAccount | null): void {
  activeAccount = account && account.extension.trim() ? account : null;
}

export function getActiveTabletSipAccount(): TabletSipAccount | null {
  return activeAccount;
}

function userFromSipUri(uri?: string): string {
  const m = /^sips?:([^@]+)@/i.exec((uri || '').trim());
  return m ? m[1] : '';
}

/**
 * Cuenta global de la configuración; si una configuración antigua no la tiene,
 * se toma de la primera puerta SIP (antes se repetía en cada intercomunicador).
 */
export function resolveTabletSipAccount(config: {
  sip?: Partial<TabletSipAccount> | null;
  doors?: { intercom?: Partial<IntercomConfig> }[];
}): TabletSipAccount {
  if (config.sip && String(config.sip.extension || '').trim()) {
    return { ...EMPTY_TABLET_SIP_ACCOUNT, ...config.sip } as TabletSipAccount;
  }
  const legacy = (config.doors || [])
    .map((d) => d.intercom)
    .find((ic) => ic && (ic.sipUsername?.trim() || userFromSipUri(ic.sipUri)));
  if (!legacy) return { ...EMPTY_TABLET_SIP_ACCOUNT, ...(config.sip || {}) };
  return {
    extension: legacy.sipUsername?.trim() || userFromSipUri(legacy.sipUri),
    password: legacy.sipPassword || '',
    domain: legacy.sipDomain?.trim() || '',
    server: legacy.sipServer?.trim() || '',
    enableTLS: Boolean(legacy.enableTLS),
  };
}

/** Extensión del intercomunicador → URI SIP completa (acepta "101" o "sip:101@host"). */
export function intercomDestinationUri(destination: string | undefined, domain: string): string {
  const raw = (destination || '').trim();
  if (!raw) return '';
  if (/^sips?:/i.test(raw)) return raw;
  if (raw.includes('@')) return `sip:${raw}`;
  return domain ? `sip:${raw}@${domain}` : raw;
}

/** Extensión corta para mostrar/editar a partir de un destino guardado. */
export function intercomDestinationExtension(destination: string | undefined): string {
  const raw = (destination || '').trim();
  return userFromSipUri(raw) || raw;
}

/** Intercom con la cuenta SIP global aplicada (si existe). */
export function withTabletSipAccount(
  intercom: IntercomConfig,
  account: TabletSipAccount | null = activeAccount,
): IntercomConfig {
  if (!account || !account.extension.trim()) return intercom;
  const domain = account.domain.trim();
  return {
    ...intercom,
    sipUri: domain ? `sip:${account.extension.trim()}@${domain}` : intercom.sipUri,
    sipUsername: account.extension.trim(),
    sipPassword: account.password,
    sipDomain: domain,
    sipServer: account.server.trim(),
    enableTLS: account.enableTLS,
    sipCallDestination: intercomDestinationUri(intercom.sipCallDestination, domain),
  };
}
