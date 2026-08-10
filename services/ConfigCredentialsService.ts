import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'config_login_credentials_v1';

export type ConfigLoginCredentials = {
  ordinal: string;
  password: string;
  /** Revisión aplicada desde el panel (seed/reset remoto). */
  panelRevision?: string | null;
};

export const DEFAULT_CONFIG_LOGIN: ConfigLoginCredentials = {
  ordinal: 'admin',
  password: '123456',
  panelRevision: null,
};

class ConfigCredentialsService {
  private cached: ConfigLoginCredentials | null = null;

  async get(): Promise<ConfigLoginCredentials> {
    if (this.cached) return { ...this.cached };
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (!raw) {
        this.cached = { ...DEFAULT_CONFIG_LOGIN };
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(this.cached));
        return { ...this.cached };
      }
      const parsed = JSON.parse(raw);
      this.cached = {
        ordinal: String(parsed.ordinal || DEFAULT_CONFIG_LOGIN.ordinal),
        password: String(parsed.password || DEFAULT_CONFIG_LOGIN.password),
        panelRevision: parsed.panelRevision ? String(parsed.panelRevision) : null,
      };
      return { ...this.cached };
    } catch {
      this.cached = { ...DEFAULT_CONFIG_LOGIN };
      return { ...this.cached };
    }
  }

  async set(next: ConfigLoginCredentials): Promise<void> {
    this.cached = {
      ordinal: String(next.ordinal || '').trim() || DEFAULT_CONFIG_LOGIN.ordinal,
      password: String(next.password || ''),
      panelRevision: next.panelRevision ?? null,
    };
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(this.cached));
  }

  async validate(ordinal: string, password: string): Promise<boolean> {
    const creds = await this.get();
    return (
      ordinal.trim() === creds.ordinal.trim() &&
      password === creds.password
    );
  }

  async changeLocal(ordinal: string, password: string): Promise<void> {
    const current = await this.get();
    await this.set({
      ordinal: ordinal.trim(),
      password,
      panelRevision: current.panelRevision,
    });
  }

  /**
   * Aplica seed/reset del panel si la revisión remota es más nueva.
   * Formato panel: configLogin: { ordinal, password, revision }
   */
  async applyPanelSeed(configLogin: unknown): Promise<boolean> {
    if (!configLogin || typeof configLogin !== 'object') return false;
    const raw = configLogin as Record<string, unknown>;
    const revision = String(raw.revision || '').trim();
    if (!revision) return false;
    const current = await this.get();
    if (current.panelRevision === revision) return false;
    const ordinal = String(raw.ordinal || DEFAULT_CONFIG_LOGIN.ordinal).trim();
    const password = String(raw.password ?? DEFAULT_CONFIG_LOGIN.password);
    await this.set({ ordinal, password, panelRevision: revision });
    return true;
  }

  async resetToFactory(): Promise<void> {
    await this.set({ ...DEFAULT_CONFIG_LOGIN });
  }
}

export const configCredentialsService = new ConfigCredentialsService();
