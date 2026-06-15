/**
 * Cliente REST para API custom1 de CSIP V6 (Panphone / Ciser System).
 * Especificación: https://www.panphone.es/doc/csip/v6/api/custom1/
 *
 * Base URL: {scheme}://{host}/api/custom1
 * Auth: Bearer token o header X-API-KEY.
 */

export type CsipCallTargetType = 'number' | 'ip' | 'default';
export type CsipButtonId = 'p1' | 'p2';
export type CsipLedId = 'p1' | 'p2' | 'A' | 'B' | 'ALL';
export type CsipLedState =
  | 'libre'
  | 'ocupado'
  | 'abriendo'
  | 'apagado'
  | 'green'
  | 'red'
  | 'orange';

export interface CsipApiConfig {
  host: string;
  useHttps?: boolean;
  apiKey?: string;
  bearerToken?: string;
}

export interface CsipCallStartRequest {
  target_type: CsipCallTargetType;
  target?: string;
  user?: string;
  recording?: boolean;
}

export interface CsipCallStartResponse {
  status?: string;
  method?: string;
  target_type?: string;
  direction?: string;
}

export interface CsipLedControlRequest {
  cmd?: string;
  led?: CsipLedId;
  estado?: CsipLedState;
}

export interface CsipLedControlResponse {
  success?: boolean;
  results?: Record<string, unknown>[];
  led_state?: { p1?: string; p2?: string };
}

export interface CsipButtonEvent {
  button_id: CsipButtonId;
  meta?: Record<string, unknown>;
  led_state?: { p1?: string; p2?: string };
}

function normalizeHost(host: string): string {
  return host.trim().replace(/^https?:\/\//i, '').replace(/\/+$/, '');
}

function buildBaseUrl(config: CsipApiConfig): string {
  const host = normalizeHost(config.host);
  if (!host) {
    throw new Error('Host CSIP no configurado (ej. 192.168.1.50:8090).');
  }
  const scheme = config.useHttps ? 'https' : 'http';
  return `${scheme}://${host}/api/custom1`;
}

function buildAuthHeaders(config: CsipApiConfig): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
  if (config.bearerToken?.trim()) {
    headers.Authorization = `Bearer ${config.bearerToken.trim()}`;
  } else if (config.apiKey?.trim()) {
    headers['X-API-KEY'] = config.apiKey.trim();
  }
  return headers;
}

async function postJson<T>(
  config: CsipApiConfig,
  endpoint: string,
  body: unknown,
): Promise<T> {
  const url = `${buildBaseUrl(config)}${endpoint}`;
  const headers = buildAuthHeaders(config);

  if (!headers.Authorization && !headers['X-API-KEY']) {
    throw new Error(
      'Falta autenticación CSIP: configure csipApiKey o csipBearerToken.',
    );
  }

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  const text = await response.text();
  let data: T | null = null;
  if (text) {
    try {
      data = JSON.parse(text) as T;
    } catch {
      throw new Error(`Respuesta CSIP no JSON (${response.status}): ${text.slice(0, 200)}`);
    }
  }

  if (!response.ok) {
    const detail =
      data && typeof data === 'object' && 'message' in (data as object)
        ? String((data as { message?: string }).message)
        : text.slice(0, 200) || response.statusText;
    throw new Error(`CSIP ${endpoint} falló (${response.status}): ${detail}`);
  }

  return (data ?? ({} as T));
}

export function isCsipApiConfigured(config: {
  csipApiHost?: string;
  csipApiKey?: string;
  csipBearerToken?: string;
}): boolean {
  return Boolean(
    config.csipApiHost?.trim() &&
      (config.csipApiKey?.trim() || config.csipBearerToken?.trim()),
  );
}

export function buildCsipApiConfig(config: {
  csipApiHost?: string;
  csipApiUseHttps?: boolean;
  csipApiKey?: string;
  csipBearerToken?: string;
}): CsipApiConfig {
  return {
    host: config.csipApiHost ?? '',
    useHttps: config.csipApiUseHttps ?? false,
    apiKey: config.csipApiKey,
    bearerToken: config.csipBearerToken,
  };
}

export async function csipStartCall(
  config: CsipApiConfig,
  request: CsipCallStartRequest,
): Promise<CsipCallStartResponse> {
  return postJson<CsipCallStartResponse>(config, '/call_start.php', request);
}

export async function csipControlLed(
  config: CsipApiConfig,
  request: CsipLedControlRequest,
): Promise<CsipLedControlResponse> {
  return postJson<CsipLedControlResponse>(config, '/led_control.php', request);
}

export async function csipSendButtonEvent(
  config: CsipApiConfig,
  event: CsipButtonEvent,
): Promise<{ success?: boolean }> {
  return postJson<{ success?: boolean }>(config, '/button_event.php', event);
}

/** Mapea P1/P2 de la app al identificador CSIP p1/p2. */
export function doorIdToCsipButton(doorId: string): CsipButtonId {
  return doorId.toUpperCase() === 'P2' ? 'p2' : 'p1';
}
