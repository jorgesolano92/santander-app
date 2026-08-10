import { EventEmitter } from 'events';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { doorControlService } from '@/services/DoorControlService';

export type CoceMessage = {
  id: string;
  title: string;
  body: string;
  urgent: boolean;
  receivedAt: string;
  seenAt?: string | null;
};

const STORAGE_KEY = 'coce_messages_history_v1';

class CoceMessageService extends EventEmitter {
  private messages: CoceMessage[] = [];
  private loaded = false;

  async start(): Promise<void> {
    if (!this.loaded) {
      await this.loadFromStorage();
      this.loaded = true;
    }
    await this.syncFromPanel();
  }

  getMessages(): CoceMessage[] {
    return [...this.messages];
  }

  getUnreadCount(): number {
    return this.messages.filter((m) => !m.seenAt).length;
  }

  async markAllSeen(): Promise<void> {
    const now = new Date().toISOString();
    const unreadIds: string[] = [];
    this.messages = this.messages.map((m) => {
      if (m.seenAt) return m;
      unreadIds.push(m.id);
      return { ...m, seenAt: now };
    });
    if (unreadIds.length) {
      await this.persist();
      this.emit('updated');
      try {
        await doorControlService.ackCoceMessages(unreadIds);
      } catch {
        // ignore ack errors
      }
    }
  }

  async ingestFromWs(payload: {
    id?: string;
    title?: string;
    body?: string;
    urgent?: boolean;
    received_at?: string;
  }): Promise<CoceMessage | null> {
    const id = String(payload.id || '').trim();
    const title = String(payload.title || '').trim();
    const body = String(payload.body || '').trim();
    if (!id || !title) return null;
    const incoming: CoceMessage = {
      id,
      title,
      body,
      urgent: Boolean(payload.urgent),
      receivedAt: String(payload.received_at || new Date().toISOString()),
    };
    const idx = this.messages.findIndex((m) => m.id === id);
    if (idx >= 0) {
      const prev = this.messages[idx];
      this.messages[idx] = { ...incoming, seenAt: prev.seenAt ?? null };
    } else {
      this.messages.unshift(incoming);
    }
    this.messages.sort(
      (a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime(),
    );
    this.messages = this.messages.slice(0, 200);
    await this.persist();
    this.emit('updated');
    this.emit('toast', incoming);
    return incoming;
  }

  private async syncFromPanel(): Promise<void> {
    try {
      const remote = await doorControlService.fetchCoceMessages(100);
      if (!remote.length) return;
      const byId = new Map(this.messages.map((m) => [m.id, m]));
      for (const row of remote) {
        if (!row.id) continue;
        const prev = byId.get(row.id);
        byId.set(row.id, {
          id: row.id,
          title: row.title,
          body: row.body,
          urgent: row.urgent,
          receivedAt: row.received_at,
          seenAt: prev?.seenAt ?? row.seen_at ?? null,
        });
      }
      this.messages = Array.from(byId.values()).sort(
        (a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime(),
      );
      await this.persist();
      this.emit('updated');
    } catch {
      // ignore sync errors
    }
  }

  private async loadFromStorage(): Promise<void> {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return;
      this.messages = parsed
        .map((row) => ({
          id: String(row.id || ''),
          title: String(row.title || ''),
          body: String(row.body || ''),
          urgent: Boolean(row.urgent),
          receivedAt: String(row.receivedAt || row.received_at || ''),
          seenAt: row.seenAt ? String(row.seenAt) : null,
        }))
        .filter((m) => m.id && m.title);
    } catch {
      this.messages = [];
    }
  }

  private async persist(): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(this.messages));
  }
}

export const coceMessageService = new CoceMessageService();
