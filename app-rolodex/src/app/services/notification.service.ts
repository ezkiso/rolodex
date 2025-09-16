import { Injectable } from '@angular/core';
import { LocalNotifications } from '@capacitor/local-notifications';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {

  constructor() {}

  // Solicitar permisos para notificaciones
  async requestPermissions(): Promise<boolean> {
    try {
      const result = await LocalNotifications.requestPermissions();
      return result.display === 'granted';
    } catch (error) {
      console.error('Error solicitando permisos:', error);
      return false;
    }
  }

  // Programar un recordatorio de reunión
  async scheduleReunionReminder(contactName: string, noteText: string, reminderDate: Date, noteId: string): Promise<boolean> {
    try {
      // Verificar permisos
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        console.warn('Permisos de notificación no concedidos');
        return false;
      }

      // Programar la notificación (SIN la propiedad 'color' que causa el error)
      await LocalNotifications.schedule({
        notifications: [
          {
            id: this.generateNotificationId(noteId),
            title: `📅 Reunión con ${contactName}`,
            body: noteText,
            schedule: { at: reminderDate },
            // SOLO estas propiedades son válidas en LocalNotificationSchema:
            smallIcon: 'ic_stat_icon',
            largeIcon: 'ic_launcher',
            // 'color' NO es una propiedad válida - ELIMINADA
            extra: {
              contactName: contactName,
              noteText: noteText,
              noteId: noteId,
              type: 'meeting_reminder'
            }
          }
        ]
      });

      console.log('Recordatorio programado para:', reminderDate);
      return true;
    } catch (error) {
      console.error('Error programando notificación:', error);
      return false;
    }
  }

  // Cancelar un recordatorio
  async cancelReunionReminder(noteId: string): Promise<void> {
    try {
      const notificationId = this.generateNotificationId(noteId);
      await LocalNotifications.cancel({
        notifications: [{ id: notificationId }]
      });
      console.log('Recordatorio cancelado:', noteId);
    } catch (error) {
      console.error('Error cancelando notificación:', error);
    }
  }

  // Generar ID único para la notificación
  private generateNotificationId(noteId: string): number {
    // Crear un hash simple basado en el noteId
    let hash = 0;
    for (let i = 0; i < noteId.length; i++) {
      hash = ((hash << 5) - hash) + noteId.charCodeAt(i);
      hash = hash & hash; // Convertir a 32-bit integer
    }
    return Math.abs(hash) % 1000000; // Número entre 0-999999
  }

  // Verificar si hay permisos
  async checkPermissions(): Promise<boolean> {
    try {
      const result = await LocalNotifications.checkPermissions();
      return result.display === 'granted';
    } catch (error) {
      console.error('Error verificando permisos:', error);
      return false;
    }
  }

  // Obtener notificaciones pendientes
  async getPendingNotifications() {
    try {
      const pending = await LocalNotifications.getPending();
      return pending.notifications;
    } catch (error) {
      console.error('Error obteniendo notificaciones pendientes:', error);
      return [];
    }
  }
}