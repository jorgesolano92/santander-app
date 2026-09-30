import type { RtspVideoCodec } from '@/utils/rtspVideoCodec';

type SlotListener = (allowed: boolean) => void;

type Entry = {
  id: string;
  codec: RtspVideoCodec;
  onChange: SlotListener;
};

/**
 * Mismo codec (p. ej. 2× H.264) → varios RTSP a la vez.
 * Codecs distintos (MPEG-4 + H.264) → exclusivos: al activar uno se corta el otro.
 */
const SAME_CODEC_MAX = 4;

const players = new Map<string, Entry>();
let activeIds: string[] = [];
let waitQueue: string[] = [];

function isActive(id: string): boolean {
  return activeIds.includes(id);
}

function activeCodecs(): Set<RtspVideoCodec> {
  const set = new Set<RtspVideoCodec>();
  for (const id of activeIds) {
    const e = players.get(id);
    if (e) set.add(e.codec);
  }
  return set;
}

function notifyAll(): void {
  for (const [id, entry] of players) {
    entry.onChange(isActive(id));
  }
}

function evictOtherCodecs(keep: RtspVideoCodec): void {
  const stay: string[] = [];
  for (const id of activeIds) {
    const e = players.get(id);
    if (e && e.codec === keep) {
      stay.push(id);
    } else if (e && !waitQueue.includes(id)) {
      waitQueue.push(id);
    }
  }
  activeIds = stay;
}

function countCodec(codec: RtspVideoCodec): number {
  let n = 0;
  for (const id of activeIds) {
    if (players.get(id)?.codec === codec) n += 1;
  }
  return n;
}

function fillFromWaitQueue(): void {
  if (activeIds.length === 0 && waitQueue.length > 0) {
    const first = waitQueue.find((id) => players.has(id));
    if (!first) {
      waitQueue = [];
      return;
    }
    const codec = players.get(first)!.codec;
    waitQueue = waitQueue.filter((id) => id !== first);
    activeIds.push(first);
    const rest: string[] = [];
    for (const id of waitQueue) {
      const e = players.get(id);
      if (!e) continue;
      if (e.codec === codec && countCodec(codec) < SAME_CODEC_MAX) {
        activeIds.push(id);
      } else {
        rest.push(id);
      }
    }
    waitQueue = rest;
    return;
  }

  if (activeIds.length === 0) return;
  const codecs = activeCodecs();
  if (codecs.size !== 1) return;
  const codec = [...codecs][0];
  const rest: string[] = [];
  for (const id of waitQueue) {
    const e = players.get(id);
    if (!e) continue;
    if (e.codec === codec && countCodec(codec) < SAME_CODEC_MAX) {
      activeIds.push(id);
    } else {
      rest.push(id);
    }
  }
  waitQueue = rest;
}

/** Registra listener (sin reclamar). */
export function requestRtspPlayback(
  id: string,
  codec: RtspVideoCodec,
  onChange: SlotListener,
): boolean {
  players.set(id, { id, codec, onChange });
  const allowed = isActive(id);
  onChange(allowed);
  return allowed;
}

/**
 * Reclama sin echar otros codecs.
 * - Mismo codec y hay hueco → OK
 * - Otro codec activo → espera
 */
export function claimRtspPlayback(id: string, codec: RtspVideoCodec): boolean {
  const prev = players.get(id);
  players.set(id, {
    id,
    codec,
    onChange: prev?.onChange ?? (() => {}),
  });
  waitQueue = waitQueue.filter((x) => x !== id);

  if (isActive(id)) {
    notifyAll();
    return true;
  }

  const codecs = activeCodecs();
  const conflict = [...codecs].some((c) => c !== codec);
  if (conflict) {
    if (!waitQueue.includes(id)) waitQueue.push(id);
    notifyAll();
    return false;
  }

  if (countCodec(codec) >= SAME_CODEC_MAX) {
    if (!waitQueue.includes(id)) waitQueue.push(id);
    notifyAll();
    return false;
  }

  activeIds.push(id);
  notifyAll();
  return true;
}

/**
 * Activa este stream y corta cualquier codec distinto (p. ej. MPEG-4 ↔ H.264).
 */
export function promoteRtspPlayback(id: string, codec: RtspVideoCodec): boolean {
  const prev = players.get(id);
  players.set(id, {
    id,
    codec,
    onChange: prev?.onChange ?? (() => {}),
  });
  waitQueue = waitQueue.filter((x) => x !== id);
  evictOtherCodecs(codec);
  activeIds = activeIds.filter((x) => x !== id);
  activeIds.push(id);
  while (countCodec(codec) > SAME_CODEC_MAX) {
    const drop = activeIds.find((x) => x !== id && players.get(x)?.codec === codec);
    if (!drop) break;
    activeIds = activeIds.filter((x) => x !== drop);
    if (!waitQueue.includes(drop)) waitQueue.push(drop);
  }
  notifyAll();
  return true;
}

export function yieldRtspPlayback(id: string): void {
  activeIds = activeIds.filter((x) => x !== id);
  waitQueue = waitQueue.filter((x) => x !== id);
  fillFromWaitQueue();
  notifyAll();
}

export function releaseRtspPlayback(id: string): void {
  players.delete(id);
  activeIds = activeIds.filter((x) => x !== id);
  waitQueue = waitQueue.filter((x) => x !== id);
  fillFromWaitQueue();
  notifyAll();
}

/** @deprecated Prefer claim/promote with codec. */
export function setRtspMaxConcurrent(_n: number): void {
  // Codec rules replace the old global max=1 workaround.
}

export function getRtspMaxConcurrent(): number {
  return SAME_CODEC_MAX;
}
