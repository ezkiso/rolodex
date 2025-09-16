import { Injectable } from '@angular/core';
import { Contacts, ContactPayload, PermissionStatus } from '@capacitor-community/contacts';
import { Contact, ContactLink } from '../models/contact.model';
import { ContactService } from './contact.service';
import { ToastController, AlertController, LoadingController } from '@ionic/angular/standalone';
import { firstValueFrom } from 'rxjs';

/**
 * Interfaz para mapear los contactos del dispositivo
 * sin extender ContactPayload directamente (para evitar errores de tipo)
 */
interface DeviceContactMapped {
  name?: { display?: string };
  emails?: { type?: string; address: string }[];
  phones?: { type?: 'mobile' | 'home' | 'work' | 'other'; number: string }[];
  urls?: { type?: string; url: string }[];
  organization?: { name?: string; role?: string };
}

@Injectable({
  providedIn: 'root'
})
export class ContactsSyncService {

  constructor(
    private contactService: ContactService,
    private toastController: ToastController,
    private alertController: AlertController,
    private loadingController: LoadingController
  ) {}

  /** Solicitar permisos de contactos */
  async requestContactsPermission(): Promise<boolean> {
    try {
      const permission = await Contacts.requestPermissions();
      return permission.contacts === 'granted';
    } catch (error) {
      console.error('Error solicitando permisos de contactos:', error);
      return false;
    }
  }

  /** Verificar permisos existentes */
  async checkContactsPermission(): Promise<boolean> {
    try {
      const permission = await Contacts.checkPermissions();
      return permission.contacts === 'granted';
    } catch (error) {
      console.error('Error verificando permisos de contactos:', error);
      return false;
    }
  }

  /** Sincronizar todos los contactos */
  async syncAllContacts(): Promise<void> {
    const hasPermission = await this.checkContactsPermission() || await this.requestContactsPermission();
    if (!hasPermission) {
      const toast = await this.toastController.create({
        message: 'Se necesitan permisos de contactos para la sincronización',
        duration: 3000,
        color: 'warning',
        position: 'top'
      });
      await toast.present();
      return;
    }

    const loading = await this.loadingController.create({
      message: 'Sincronizando contactos...',
      spinner: 'crescent'
    });
    await loading.present();

    try {
      const { contacts: deviceContacts } = await Contacts.getContacts({
        projection: { name: true, phones: true, emails: true, organization: true, urls: true }
      });

      const currentContacts = await firstValueFrom(this.contactService.getContacts());

      let syncedCount = 0;
      let updatedCount = 0;

      for (const deviceContact of deviceContacts as DeviceContactMapped[]) {
        const result = await this.importSingleContact(deviceContact, currentContacts);
        if (result.created) syncedCount++;
        if (result.updated) updatedCount++;
      }

      await loading.dismiss();

      const toast = await this.toastController.create({
        message: `Sincronización completa: ${syncedCount} nuevos, ${updatedCount} actualizados`,
        duration: 4000,
        color: 'success',
        position: 'top'
      });
      await toast.present();

    } catch (error) {
      await loading.dismiss();
      console.error('Error sincronizando contactos:', error);
      const toast = await this.toastController.create({
        message: 'Error al sincronizar contactos',
        duration: 3000,
        color: 'danger',
        position: 'top'
      });
      await toast.present();
    }
  }

  /** Importar un contacto individual */
  private async importSingleContact(
    deviceContact: DeviceContactMapped,
    currentContacts: Contact[]
  ): Promise<{ created: boolean; updated: boolean }> {
    if (!deviceContact.name?.display) return { created: false, updated: false };

    const rolodexContact = this.convertDeviceContactToRolodex(deviceContact);
    const existingContact = this.findExistingContact(rolodexContact, currentContacts);

    if (existingContact) {
      const updated = this.updateExistingContact(existingContact, rolodexContact);
      return { created: false, updated };
    } else {
      this.contactService.addContact(rolodexContact);
      return { created: true, updated: false };
    }
  }

  /** Convertir contacto del dispositivo a formato Rolodex */
  private convertDeviceContactToRolodex(deviceContact: DeviceContactMapped): Omit<Contact, 'id' | 'dateCreated'> {
    const links: ContactLink[] = [];

    deviceContact.emails?.forEach(email => {
      if (email.address) links.push({ type: 'email', value: email.address, label: 'Email' });
    });

    deviceContact.phones?.forEach(phone => {
      const phoneType = phone.type || 'mobile';
      links.push({ type: 'phone', value: phone.number, label: 'Teléfono' });
    });

    deviceContact.urls?.forEach(url => {
      if (url.url) links.push({ type: 'website', value: url.url, label: 'Website' });
    });

    return {
      name: deviceContact.name?.display || 'Contacto sin nombre',
      company: deviceContact.organization?.name || '',
      position: deviceContact.organization?.role || '',
      email: deviceContact.emails?.[0]?.address || '',
      phone: deviceContact.phones?.[0]?.number || '',
      links,
      notes: [{
        text: 'Contacto importado desde el dispositivo',
        date: new Date().toISOString(),
        created: new Date().toISOString(),
        type: 'note'
      }],
      tags: ['Importado'],
      lastInteraction: new Date().toISOString(),
      priority: 'medium'
    };
  }

  /** Buscar contacto existente por nombre o email */
  private findExistingContact(
    newContact: Omit<Contact, 'id' | 'dateCreated'>,
    currentContacts: Contact[]
  ): Contact | undefined {
    return currentContacts.find(contact =>
      contact.name.toLowerCase() === newContact.name.toLowerCase() ||
      (newContact.email && contact.email === newContact.email)
    );
  }

  /** Actualizar contacto existente */
  private updateExistingContact(existingContact: Contact, newContact: Omit<Contact, 'id' | 'dateCreated'>): boolean {
    let hasUpdates = false;
    const updates: Partial<Contact> = {};

    if (!existingContact.company && newContact.company) { updates.company = newContact.company; hasUpdates = true; }
    if (!existingContact.position && newContact.position) { updates.position = newContact.position; hasUpdates = true; }
    if (!existingContact.email && newContact.email) { updates.email = newContact.email; hasUpdates = true; }
    if (!existingContact.phone && newContact.phone) { updates.phone = newContact.phone; hasUpdates = true; }

    const existingValues = existingContact.links.map(l => l.value.toLowerCase());
    const newLinks = newContact.links.filter(l => !existingValues.includes(l.value.toLowerCase()));
    if (newLinks.length) { updates.links = [...existingContact.links, ...newLinks]; hasUpdates = true; }

    if (hasUpdates) this.contactService.updateContact(existingContact.id, updates);
    return hasUpdates;
  }

  /** Mostrar confirmación antes de sincronizar */
  async showSyncConfirmation(): Promise<void> {
    const alert = await this.alertController.create({
      header: 'Sincronizar Contactos',
      message: '¿Deseas importar todos los contactos de tu teléfono? Esta acción puede tardar unos minutos.',
      buttons: [
        { text: 'Cancelar', role: 'cancel', cssClass: 'secondary' },
        { text: 'Sí, sincronizar', handler: () => { this.syncAllContacts(); } }
      ]
    });
    await alert.present();
  }

  /** Verificar y pedir permisos al inicio */
  async checkAndRequestPermissionsOnStartup(): Promise<void> {
    const hasPermission = await this.checkContactsPermission();
    if (!hasPermission) {
      const alert = await this.alertController.create({
        header: 'Acceso a Contactos',
        message: 'Rolodex puede sincronizar con los contactos de tu teléfono para mayor comodidad. ¿Deseas permitir el acceso?',
        buttons: [
          { text: 'Más tarde', role: 'cancel' },
          {
            text: 'Permitir acceso',
            handler: async () => {
              const granted = await this.requestContactsPermission();
              if (granted) this.showSyncConfirmation();
            }
          }
        ]
      });
      await alert.present();
    }
  }
}
