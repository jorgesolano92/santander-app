import * as FileSystem from 'expo-file-system/legacy';
import * as MediaLibrary from 'expo-media-library';
import { encode as base64Encode } from 'base-64';

export interface DirectSnapshotConfig {
  ip: string;
  username?: string;
  password?: string;
  preferHttps?: boolean;
  snapshotPath?: string;
  /** Puerto HTTP (p. ej. Panphone web UI en 8090). */
  httpPort?: number;
}

export type SnapshotPreviewSource = {
  uri: string;
  headers?: Record<string, string>;
};

function normalizePath(path?: string): string | undefined {
  const p = path?.trim();
  if (!p) return undefined;
  return p.startsWith('/') ? p : `/${p}`;
}

function basicAuthHeader(
  user?: string,
  pass?: string,
): Record<string, string> | undefined {
  if (!user && !pass) return undefined;
  const b64 = base64Encode(`${user || ''}:${pass || ''}`);
  return { Authorization: `Basic ${b64}` };
}

/**
 * URL remota para preview ~1 fps (sin descargar a disco).
 * Panphone: :8090/camara.php sin auth.
 * Resto: snapshotPath o rutas típicas + Basic auth si hay user/pass.
 */
export function buildSnapshotPreviewSource(
  config: DirectSnapshotConfig,
): SnapshotPreviewSource | null {
  const ip = config.ip?.trim();
  if (!ip) return null;

  const path = normalizePath(config.snapshotPath);
  const isCamara = path ? /camara\.php/i.test(path) : false;
  const port =
    config.httpPort && config.httpPort !== 80 && config.httpPort !== 443
      ? config.httpPort
      : isCamara
        ? 8090
        : config.httpPort || 80;

  if (isCamara || (!path && port === 8090)) {
    return { uri: `http://${ip}:8090/camara.php` };
  }

  if (path) {
    const portSuffix = port !== 80 ? `:${port}` : '';
    const headers = basicAuthHeader(config.username, config.password);
    return {
      uri: `http://${ip}${portSuffix}${path}`,
      headers,
    };
  }

  // Fallback genérico TVT/ONVIF.
  const headers = basicAuthHeader(config.username, config.password);
  return {
    uri: `http://${ip}/cgi-bin/snapshot.cgi?channel=1`,
    headers,
  };
}

function buildCandidates(
  ip: string,
  preferHttps: boolean,
  explicitPath?: string,
  auth?: { user?: string; pass?: string },
  httpPort?: number,
): string[] {
  const authPrefix =
    auth && (auth.user || auth.pass)
      ? `${encodeURIComponent(auth.user || '')}:${encodeURIComponent(auth.pass || '')}@`
      : '';
  const port =
    httpPort && httpPort !== 80 && httpPort !== 443 ? `:${httpPort}` : '';
  const httpBase = `http://${authPrefix}${ip}${port}`;
  const httpsBase = `https://${authPrefix}${ip}${httpPort === 443 ? '' : port}`;
  const order = preferHttps ? [httpsBase, httpBase] : [httpBase, httpsBase];

  const paths = explicitPath
    ? [explicitPath.startsWith('/') ? explicitPath : `/${explicitPath}`]
    : [
        '/ISAPI/Streaming/channels/101/picture',
        '/Streaming/channels/101/picture',
        '/axis-cgi/jpg/image.cgi',
        '/cgi-bin/snapshot.cgi?channel=1',
        '/GetSnapshot/1',
        '/snapshot.jpg',
        '/jpeg/snap.jpg',
        '/camara.php',
      ];

  const urls: string[] = [];

  if (explicitPath && /camara\.php/i.test(explicitPath)) {
    const barePort = httpPort && httpPort !== 80 ? `:${httpPort}` : '';
    urls.push(`http://${ip}${barePort || ':8090'}/camara.php`);
  }

  for (const base of order) {
    for (const p of paths) {
      urls.push(`${base}${p}`);
    }
  }

  urls.push(`http://${ip}:8090/camara.php`);
  return urls;
}

const lastGoodPreviewUrl = new Map<string, string>();

/**
 * Snapshot a caché (galería / fallback). Usa API legacy de expo-file-system.
 */
export async function fetchCameraSnapshotPreview(
  config: DirectSnapshotConfig,
): Promise<string | null> {
  const { ip, username, password, preferHttps, snapshotPath, httpPort } = config;
  if (!ip?.trim()) return null;
  if (!FileSystem.cacheDirectory) return null;

  const trimmed = ip.trim();
  const cacheKey = `${trimmed}:${httpPort || 80}:${snapshotPath || ''}`;
  const urls = buildCandidates(
    trimmed,
    !!preferHttps,
    snapshotPath?.trim() || undefined,
    { user: username, pass: password },
    httpPort,
  );

  if (snapshotPath?.trim()) {
    for (const u of buildCandidates(
      trimmed,
      !!preferHttps,
      undefined,
      { user: username, pass: password },
      httpPort,
    )) {
      if (!urls.includes(u)) urls.push(u);
    }
  }

  const preferred = lastGoodPreviewUrl.get(cacheKey);
  if (preferred) {
    const idx = urls.indexOf(preferred);
    if (idx > 0) {
      urls.splice(idx, 1);
      urls.unshift(preferred);
    } else if (idx < 0) {
      urls.unshift(preferred);
    }
  }

  const safeIp = trimmed.replace(/[^\d.a-zA-Z-]/g, '_');
  const destUri = `${FileSystem.cacheDirectory}preview_${safeIp}.jpg`;

  for (const url of urls) {
    try {
      const bust = url.includes('?') ? `&_=${Date.now()}` : `?_=${Date.now()}`;
      const res = await FileSystem.downloadAsync(url + bust, destUri);
      const ctype = (
        res.headers?.['Content-Type'] ||
        res.headers?.['content-type'] ||
        ''
      ).toLowerCase();
      if (
        res.status === 200 &&
        (ctype.includes('image') ||
          ctype.includes('jpeg') ||
          ctype.includes('jpg') ||
          !ctype)
      ) {
        const info = await FileSystem.getInfoAsync(res.uri);
        if (info.exists && typeof info.size === 'number' && info.size > 800) {
          lastGoodPreviewUrl.set(cacheKey, url);
          return res.uri;
        }
      }
    } catch {
      // siguiente URL
    }
  }
  return null;
}

export async function downloadCameraSnapshotDirect(
  config: DirectSnapshotConfig,
): Promise<string | null> {
  const { ip, username, password, preferHttps, snapshotPath, httpPort } = config;
  const urls = buildCandidates(
    ip,
    !!preferHttps,
    snapshotPath,
    { user: username, pass: password },
    httpPort,
  );

  const permission = await MediaLibrary.requestPermissionsAsync();
  if (!permission.granted) {
    throw new Error('Permiso de galería denegado');
  }

  if (!FileSystem.cacheDirectory) {
    throw new Error('Caché de archivos no disponible');
  }

  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `snapshot_${ip}_${ts}.jpg`;
  const destUri = `${FileSystem.cacheDirectory}${filename}`;

  for (const url of urls) {
    try {
      const res = await FileSystem.downloadAsync(url, destUri);
      if (
        res.status === 200 &&
        res.headers &&
        (res.headers['Content-Type'] || res.headers['content-type'] || '').includes(
          'image',
        )
      ) {
        const asset = await MediaLibrary.createAssetAsync(res.uri);
        let album = await MediaLibrary.getAlbumAsync('Download');
        if (!album) {
          album = await MediaLibrary.createAlbumAsync('Download', asset, false);
        } else {
          await MediaLibrary.addAssetsToAlbumAsync([asset], album, false);
        }
        return res.uri;
      }
    } catch {
      // try next
    }
  }

  return null;
}
