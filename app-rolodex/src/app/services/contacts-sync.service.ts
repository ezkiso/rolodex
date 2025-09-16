// src/app/services/contacts-sync.service.ts
import { Injectable } from '@angular/core';
import { Contacts, Contact as DeviceContact, ContactPayload } from '@capacitor-community/contacts';
import { Contact, ContactLink } from '../models/contact.model';
import { ContactService } from './contact.service';
import { ToastController, AlertController, LoadingController } from '@ionic/angular/standalone';

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

  /**
   * Solicitar permisos de contactos
   */
  async requestContactsPermission(): Promise<boolean> {
    try {
      const permission = await Contacts.requestPermissions();
      return permission.contacts === 'granted';
    } catch (error) {
      console.error('Error solicitando permisos de contactos:', error);
      return false;
    }
  }

  /**
   * Verificar si ya tenemos permisos
   */
  async checkContactsPermission(): Promise<boolean> {
    try {
      const permission = await Contacts.checkPermissions();
      return permission.contacts === 'granted';
    } catch (error) {
      console.error('Error verificando permisos de contactos:', error);
      return false;
    }
  }

  /**
   * Sincronizar todos los contactos del dispositivo
   */
  async syncAllContacts(): Promise<void> {
    // Verificar permisos primero
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

    // Mostrar loading
    const loading = await this.loadingController.create({
      message: 'Sincronizando contactos...',
      spinner: 'crescent'
    });
    await loading.present();

    try {
      // Obtener contactos del dispositivo
      const result = await Contacts.getContacts({
        projection: {
          name: true,
          phones: true,
          emails: true,
          organization: true,
          birthday: true,
          urls: true
        }
      });

      const deviceContacts = result.contacts;
      let syncedCount = 0;
      let updatedCount = 0;

      for (const deviceContact of deviceContacts) {
        const success = await this.importSingleContact(deviceContact);
        if (success.created) {
          syncedCount++;
        } else if (success.updated) {
          updatedCount++;
        }
      }

      await loading.dismiss();

      // Mostrar resultado
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

  /**
   * Importar un contacto individual del dispositivo
   */
  private async importSingleContact(deviceContact: DeviceContact): Promise<{created: boolean, updated: boolean}> {
    try {
      // Saltar si no tiene nombre
      if (!deviceContact.name?.display) {
        return {created: false, updated: false};
      }

      // Convertir contacto del dispositivo a nuestro formato
      const rolodexContact = this.convertDeviceContactToRolodex(deviceContact);
      
      // Verificar si el contacto ya existe (por nombre o email)
      const existingContact = this.findExistingContact(rolodexContact);
      
      if (existingContact) {
        // Actualizar contacto existente con nueva información
        const updated = this.updateExistingContact(existingContact, rolodexContact);
        return {created: false, updated: updated};
      } else {
        // Crear nuevo contacto
        this.contactService.addContact(rolodexContact);
        return {created: true, updated: false};
      }
      
    } catch (error) {
      console.error('Error importando contacto individual:', error);
      return {created: false, updated: false};
    }
  }

  /**
   * Convertir contacto del dispositivo a formato Rolodex
   */
  private convertDeviceContactToRolodex(deviceContact: DeviceContact): Omit<Contact, 'id' | 'dateCreated'> {
    const links: ContactLink[] = [];
    
    // Agregar emails
    if (deviceContact.emails && deviceContact.emails.length > 0) {
      deviceContact.emails.forEach(email => {
        if (email.address) {
          links.push({
            type: 'email',
            value: email.address,
            label: email.label || 'Email'
          });
        }
      });
    }

    // Agregar teléfonos
    if (deviceContact.phones && deviceContact.phones.length > 0) {
      deviceContact.phones.forEach(phone => {
        if (phone.number) {
          links.push({
            type: 'phone',
            value: phone.number,
            label: phone.label || 'Teléfono'
          });
        }
      });
    }

    // Agregar URLs/websites
    if (deviceContact.urls && deviceContact.urls.length > 0) {
      deviceContact.urls.forEach(url => {
        if (url.url) {
          links.push({
            type: 'website',
            value: url.url,
            label: url.label || 'Website'
          });
        }
      });
    }

    return {
      name: deviceContact.name?.display || 'Contacto sin nombre',
      company: deviceContact.organizationName || '',
      position: deviceContact.organizationRole || '',
      email: deviceContact.emails?.[0]?.address || '',
      phone: deviceContact.phones?.[0]?.number || '',
      links: links,
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

  /**
   * Buscar contacto existente por nombre o email
   */
  private findExistingContact(newContact: Omit<Contact, 'id' | 'dateCreated'>): Contact | undefined {
    const currentContacts = this.contactService.getContacts();
    let existingContact: Contact | undefined;

    // Buscar por nombre exacto
    currentContacts.subscribe(contacts => {
      existingContact = contacts.find(contact => 
        contact.name.toLowerCase() === newContact.name.toLowerCase() ||
        (newContact.email && contact.email === newContact.email)
      );
    }).unsubscribe();

    return existingContact;
  }

  /**
   * Actualizar contacto existente con nueva información
   */
  private updateExistingContact(existingContact: Contact, newContact: Omit<Contact, 'id' | 'dateCreated'>): boolean {
    let hasUpdates = false;
    const updates: Partial<Contact> = {};

    // Actualizar company si no existe
    if (!existingContact.company && newContact.company) {
      updates.company = newContact.company;
      hasUpdates = true;
    }

    // Actualizar position si no existe
    if (!existingContact.position && newContact.position) {
      updates.position = newContact.position;
      hasUpdates = true;
    }

    // Actualizar email si no existe
    if (!existingContact.email && newContact.email) {
      updates.email = newContact.email;
      hasUpdates = true;
    }

    // Actualizar phone si no existe
    if (!existingContact.phone && newContact.phone) {
      updates.phone = newContact.phone;
      hasUpdates = true;
    }

    // Fusionar enlaces sin duplicar
    const existingLinkValues = existingContact.links.map(link => link.value.toLowerCase());
    const newLinks = newContact.links.filter(newLink => 
      !existingLinkValues.includes(newLink.value.toLowerCase())
    );

    if (newLinks.length > 0) {
      updates.links = [...existingContact.links, ...newLinks];
      hasUpdates = true;
    }

    // Aplicar actualizaciones si las hay
    if (hasUpdates) {
      this.contactService.updateContact(existingContact.id, updates);
    }

    return hasUpdates;
  }

  /**
   * Mostrar dialog de confirmación antes de sincronizar
   */
  async showSyncConfirmation(): Promise<void> {
    const alert = await this.alertController.create({
      header: 'Sincronizar Contactos',
      message: '¿Deseas importar todos los contactos de tu teléfono? Esta acción puede tardar unos minutos.',
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel',
          cssClass: 'secondary'
        },
        {
          text: 'Sí, sincronizar',
          handler: () => {
            this.syncAllContacts();
          }
        }
      ]
    });

    await alert.present();
  }

  /**
   * Verificar y pedir permisos al inicio de la app
   */
  async checkAndRequestPermissionsOnStartup(): Promise<void> {
    const hasPermission = await this.checkContactsPermission();
    
    if (!hasPermission) {
      const alert = await this.alertController.create({
        header: 'Acceso a Contactos',
        message: 'Rolodex puede sincronizar con los contactos de tu teléfono para mayor comodidad. ¿Deseas permitir el acceso?',
        buttons: [
          {
            text: 'Más tarde',
            role: 'cancel'
          },
          {
            text: 'Permitir acceso',
            handler: async () => {
              const granted = await this.requestContactsPermission();
              if (granted) {
                this.showSyncConfirmation();
              }
            }
          }
        ]
      });

      await alert.present();
    }
  }
}