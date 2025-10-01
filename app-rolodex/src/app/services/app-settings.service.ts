import { Injectable } from '@angular/core';
import { DatabaseService } from './database.service';

@Injectable({
  providedIn: 'root'
})
export class AppSettingsService {
  private readonly LAST_SYNC_KEY = 'last_sync_time';
  private readonly SYNC_ENABLED_KEY = 'sync_enabled';
  private readonly THEME_KEY = 'app_theme';

  constructor(private db: DatabaseService) {}

  // Métodos para la última sincronización
  async getLastSyncTime(): Promise<Date | null> {
    const time = await this.db.getSetting<string>(this.LAST_SYNC_KEY, '');
    return time ? new Date(time) : null;
  }

  async setLastSyncTime(time: Date): Promise<void> {
    await this.db.setSetting(this.LAST_SYNC_KEY, time.toISOString());
  }

  // Métodos para configuración de sincronización
  async isSyncEnabled(): Promise<boolean> {
    return await this.db.getSetting<boolean>(this.SYNC_ENABLED_KEY, true);
  }

  async setSyncEnabled(enabled: boolean): Promise<void> {
    await this.db.setSetting(this.SYNC_ENABLED_KEY, enabled);
  }

  // Métodos para el tema de la app
  async getTheme(): Promise<'light' | 'dark' | 'auto'> {
    return await this.db.getSetting<'light' | 'dark' | 'auto'>(this.THEME_KEY, 'auto');
  }

  async setTheme(theme: 'light' | 'dark' | 'auto'): Promise<void> {
    await this.db.setSetting(this.THEME_KEY, theme);
  }

  // Método para obtener todas las configuraciones
  async exportSettings(): Promise<Record<string, any>> {
    return {
      lastSync: await this.getLastSyncTime(),
      syncEnabled: await this.isSyncEnabled(),
      theme: await this.getTheme()
    };
  }
}