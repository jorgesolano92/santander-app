import type { IncomingCallPayload } from '@/services/tabletCallService';

export type IncomingCallUiHandlers = {
  onAnswer: (call: IncomingCallPayload) => void;
  onReject: (call: IncomingCallPayload) => void;
  onExpired: (call: IncomingCallPayload) => void;
};

let handlers: IncomingCallUiHandlers | null = null;

export function registerIncomingCallUi(h: IncomingCallUiHandlers): void {
  handlers = h;
}

export function unregisterIncomingCallUi(): void {
  handlers = null;
}

export function invokeAnswer(call: IncomingCallPayload): void {
  handlers?.onAnswer(call);
}

export function invokeReject(call: IncomingCallPayload): void {
  handlers?.onReject(call);
}

export function invokeExpired(call: IncomingCallPayload): void {
  handlers?.onExpired(call);
}
