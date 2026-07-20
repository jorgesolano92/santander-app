import { EventEmitter } from 'events';

import { doorControlService } from '@/services/DoorControlService';
import { wakeTabletForIncomingCall } from '@/services/tabletWake';

export type IncomingCallPayload = {
  callId: string;
  door: string;
  doorLabel: string;
  pulsador: string;
  mode: string;
  timeoutSeconds: number;
  remainingSeconds: number;
};

export type ModeChangedPayload = {
  currentMode: string | null;
};

export type ToggleRulesChangedPayload = {
  activeToggleRules: string[];
};

export type PanelLivePayload = {
  currentMode: string | null;
  activeToggleRules: string[];
};

export type ModeQueuedPayload = {
  pendingMode: string | null;
  blockedInputs: string[];
};

export type CoceNotificationPayload = {
  id: string;
  title: string;
  body: string;
  urgent: boolean;
  receivedAt: string;
};

export type CallAcceptedPayload = {
  callId: string;
  door: string;
  doorLabel: string;
};

type IntercomStatus = {
  busy: boolean;
  door?: string | null;
  holderUsername?: string | null;
};

const RECONNECT_MS = 4000;
const CLAIM_TIMEOUT_MS = 2500;

class TabletCallService extends EventEmitter {
  private ws: WebSocket | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private stopped = true;
  private clientId: string | null = null;
  private intercomStatus: IntercomStatus = { busy: false };
  private livePanelState: PanelLivePayload = {
    currentMode: null,
    activeToggleRules: [],
  };
  private pendingClaim:
    | { resolve: (ok: boolean) => void; timer: ReturnType<typeof setTimeout> }
    | null = null;

  async start(): Promise<void> {
    this.stopped = false;
    await this.connect();
  }

  stop(): void {
    this.stopped = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      try {
        this.ws.close();
      } catch {
        // ignore
      }
      this.ws = null;
    }
  }

  isIntercomBusyForOthers(): boolean {
    return this.intercomStatus.busy;
  }

  getIntercomHolderUsername(): string | null {
    return this.intercomStatus.holderUsername ?? null;
  }

  doorToAppId(door: string): string {
    const d = door.trim().toLowerCase();
    if (d === 'p1') return 'P1';
    if (d === 'p2') return 'P2';
    return door.toUpperCase();
  }

  async answerCall(callId: string): Promise<void> {
    console.log('[TabletCall] Contestar llamada', callId);
    this.send({ type: 'answer', call_id: callId });
  }

  rejectCall(callId: string): void {
    console.log('[TabletCall] Rechazar llamada', callId);
    this.send({ type: 'reject', call_id: callId });
  }

  async claimIntercomChannel(doorId: string): Promise<boolean> {
    const door = doorId.replace(/^P/i, 'p').toLowerCase();
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return !this.isIntercomBusyForOthers();
    }
    return new Promise((resolve) => {
      if (this.pendingClaim) {
        clearTimeout(this.pendingClaim.timer);
      }
      const timer = setTimeout(() => {
        this.pendingClaim = null;
        resolve(!this.isIntercomBusyForOthers());
      }, CLAIM_TIMEOUT_MS);
      this.pendingClaim = { resolve, timer };
      this.send({ type: 'intercom_claim', door });
    });
  }

  releaseIntercomChannel(): void {
    this.send({ type: 'intercom_release' });
  }

  private send(payload: Record<string, unknown>): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    try {
      this.ws.send(JSON.stringify(payload));
    } catch {
      // ignore
    }
  }

  private scheduleReconnect(): void {
    if (this.stopped || this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      void this.connect();
    }, RECONNECT_MS);
  }

  private async connect(): Promise<void> {
    if (this.stopped) return;
    const url = await doorControlService.buildCallsWebSocketUrl();
    if (!url) {
      this.scheduleReconnect();
      return;
    }
    if (this.ws) {
      try {
        this.ws.close();
      } catch {
        // ignore
      }
    }
    try {
      const ws = new WebSocket(url);
      this.ws = ws;
      ws.onopen = () => {
        console.log('[TabletCall] WebSocket conectado');
      };
      ws.onmessage = (ev) => {
        try {
          const data = JSON.parse(String(ev.data));
          this.handleMessage(data);
        } catch {
          // ignore
        }
      };
      ws.onclose = () => {
        if (this.ws === ws) this.ws = null;
        this.scheduleReconnect();
      };
      ws.onerror = () => {
        ws.close();
      };
    } catch {
      this.scheduleReconnect();
    }
  }

  private emitPanelLive(): void {
    this.emit('panel_live', { ...this.livePanelState } satisfies PanelLivePayload);
  }

  private handleMessage(data: Record<string, unknown>): void {
    const type = String(data.type || '');
    switch (type) {
      case 'registered':
        this.clientId = String(data.client_id || '');
        break;
      case 'incoming_call': {
        const remaining = Number(data.remaining_seconds ?? 0);
        if (remaining <= 0) {
          console.log('[TabletCall] Ignorar llamada expirada', data.call_id);
          break;
        }
        wakeTabletForIncomingCall();
        this.emit('incoming_call', {
          callId: String(data.call_id),
          door: String(data.door),
          doorLabel: String(data.door_label || data.door),
          pulsador: String(data.pulsador || ''),
          mode: String(data.mode || ''),
          timeoutSeconds: Number(data.timeout_seconds || 30),
          remainingSeconds: remaining,
        } satisfies IncomingCallPayload);
        break;
      }
      case 'call_accepted':
        this.emit('call_accepted', {
          callId: String(data.call_id),
          door: String(data.door),
          doorLabel: String(data.door_label || data.door),
        } satisfies CallAcceptedPayload);
        break;
      case 'call_taken':
      case 'call_cancelled':
      case 'call_dismissed':
      case 'call_error':
        this.emit('call_ended', {
          callId: String(data.call_id || ''),
          reason:
            type === 'call_taken'
              ? 'taken'
              : type === 'call_error'
                ? String(data.reason || 'error')
                : String(data.reason || type),
          answeredBy: data.answered_by ? String(data.answered_by) : undefined,
        });
        break;
      case 'intercom_status':
        this.intercomStatus = {
          busy: Boolean(data.busy),
          door: data.door ? String(data.door) : null,
          holderUsername: data.holder_username ? String(data.holder_username) : null,
        };
        this.emit('intercom_status', this.intercomStatus);
        break;
      case 'intercom_claimed':
        if (this.pendingClaim) {
          clearTimeout(this.pendingClaim.timer);
          this.pendingClaim.resolve(true);
          this.pendingClaim = null;
        }
        this.intercomStatus = { busy: true, door: String(data.door || ''), holderUsername: null };
        break;
      case 'intercom_busy':
        if (this.pendingClaim) {
          clearTimeout(this.pendingClaim.timer);
          this.pendingClaim.resolve(false);
          this.pendingClaim = null;
        }
        this.intercomStatus = {
          busy: true,
          door: data.door ? String(data.door) : null,
          holderUsername: data.holder_username ? String(data.holder_username) : null,
        };
        this.emit('intercom_busy', this.intercomStatus);
        break;
      case 'mode_changed': {
        const currentMode =
          data.current_mode === null || data.current_mode === undefined
            ? null
            : String(data.current_mode);
        console.log('[TabletCall] mode_changed WS', currentMode);
        this.livePanelState.currentMode = currentMode;
        this.emit('mode_changed', { currentMode } satisfies ModeChangedPayload);
        this.emitPanelLive();
        break;
      }
      case 'toggle_rules_changed': {
        const activeToggleRules = Array.isArray(data.active_toggle_rules)
          ? data.active_toggle_rules.map((k) => String(k))
          : [];
        console.log('[TabletCall] toggle_rules_changed WS', activeToggleRules);
        this.livePanelState.activeToggleRules = activeToggleRules;
        this.emit('toggle_rules_changed', {
          activeToggleRules,
        } satisfies ToggleRulesChangedPayload);
        this.emitPanelLive();
        break;
      }
      case 'mode_queued': {
        const pendingMode =
          data.pending_mode === null || data.pending_mode === undefined
            ? null
            : String(data.pending_mode);
        const blockedInputs = Array.isArray(data.blocked_inputs)
          ? data.blocked_inputs.map((c) => String(c))
          : [];
        console.log('[TabletCall] mode_queued WS', pendingMode);
        this.emit('mode_queued', { pendingMode, blockedInputs } satisfies ModeQueuedPayload);
        break;
      }
      case 'coce_notification': {
        const payload: CoceNotificationPayload = {
          id: String(data.id || ''),
          title: String(data.title || ''),
          body: String(data.body || ''),
          urgent: Boolean(data.urgent),
          receivedAt: String(data.received_at || new Date().toISOString()),
        };
        if (!payload.id || !payload.title) break;
        console.log('[TabletCall] coce_notification', payload.id, payload.urgent);
        this.emit('coce_notification', payload);
        break;
      }
      default:
        break;
    }
  }
}

export const tabletCallService = new TabletCallService();
