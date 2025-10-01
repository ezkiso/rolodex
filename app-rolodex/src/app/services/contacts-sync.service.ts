import { Injectable } from '@angular/core';
import { Contacts } from '@capacitor-community/contacts';
import { Contact, ContactLink } from '../models/contact.model';
import { ContactService } from './contact.service';
import { ToastController, AlertController, LoadingController } from '@ionic/angular/standalone';
import { firstValueFrom } from 'rxjs';

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
  private isSyncing = false;

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

  /** Sincronizar todos los contactos - VERSIÓN OPTIMIZADA */
  async syncAllContacts(): Promise<void> {
    if (this.isSyncing) {
      const toast = await this.toastController.create({
        message: 'La sincronización ya está en proceso',
        duration: 2000,
        color: 'warning',
        position: 'top'
      });
      await toast.present();
      return;
    }

    this.isSyncing = true;
    const hasPermission = await this.checkContactsPermission() || await this.requestContactsPermission();
    
    if (!hasPermission) {
      this.isSyncing = false;
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
      // 1. Obtener contactos del dispositivo
      const { contacts: deviceContacts } = await Contacts.getContacts({
        projection: { name: true, phones: true, emails: true, organization: true, urls: true }
      });

      // 2. Obtener contactos actuales de la base de datos
      const currentContacts = await firstValueFrom(this.contactService.getContacts());

      // 3. Procesamiento por lotes para mejor rendimiento
      const batchSize = 50;
      let syncedCount = 0;
      let updatedCount = 0;
      let currentBatch: Contact[] = [];

      for (let i = 0; i < deviceContacts.length; i++) {
        const deviceContact = deviceContacts[i] as DeviceContactMapped;
        
        if (!deviceContact.name?.display) continue;

        const rolodexContact = this.convertDeviceContactToRolodex(deviceContact);
        const existingContact = this.findExistingContact(rolodexContact, currentContacts);

        if (existingContact) {
          const updated = this.updateExistingContact(existingContact, rolodexContact);
          if (updated) updatedCount++;
        } else {
          // Crear contacto con ID temporal (se asignará ID real al guardar)
          const newContact: Contact = {
            ...rolodexContact,
            id: `temp-${Date.now()}-${i}`,
            dateCreated: new Date().toISOString()
          };
          currentBatch.push(newContact);
          syncedCount++;
        }

        // Guardar por lotes para mejorar rendimiento
        if (currentBatch.length >= batchSize || i === deviceContacts.length - 1) {
          if (currentBatch.length > 0) {
            await this.contactService.addContactsBatch(currentBatch);
            currentBatch = [];
          }
          
          // Actualizar mensaje de carga periódicamente
          if (i % 100 === 0) {
            loading.message = `Procesando ${i + 1} de ${deviceContacts.length} contactos...`;
          }
        }
      }

      await loading.dismiss();
      this.isSyncing = false;

      const toast = await this.toastController.create({
        message: `Sincronización completa: ${syncedCount} nuevos, ${updatedCount} actualizados`,
        duration: 4000,
        color: 'success',
        position: 'top'
      });
      await toast.present();

    } catch (error) {
      await loading.dismiss();
      this.isSyncing = false;
      console.error('Error sincronizando contactos:', error);
      
      const toast = await this.toastController.create({
        message: 'Error al sincronizar contactos: ' + (error instanceof Error ? error.message : 'Error desconocido'),
        duration: 4000,
        color: 'danger',
        position: 'top'
      });
      await toast.present();
    }
  }

  /** Convertir contacto del dispositivo a formato Rolodex - OPTIMIZADO */
  private convertDeviceContactToRolodex(deviceContact: DeviceContactMapped): Omit<Contact, 'id' | 'dateCreated'> {
    const links: ContactLink[] = [];

    // Procesar emails
    if (deviceContact.emails) {
      for (const email of deviceContact.emails) {
        if (email.address) {
          links.push({ type: 'email', value: email.address, label: 'Email' });
        }
      }
    }

    // Procesar teléfonos
    if (deviceContact.phones) {
      for (const phone of deviceContact.phones) {
        links.push({ type: 'phone', value: phone.number, label: 'Teléfono' });
      }
    }

    // Procesar URLs
    if (deviceContact.urls) {
      for (const url of deviceContact.urls) {
        if (url.url) {
          links.push({ type: 'website', value: url.url, label: 'Website' });
        }
      }
    }

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

  /** Buscar contacto existente por nombre o email - OPTIMIZADO Y CORREGIDO */
  private findExistingContact(
    newContact: Omit<Contact, 'id' | 'dateCreated'>,
    currentContacts: Contact[]
  ): Contact | undefined {
    const nameToFind = newContact.name.toLowerCase();
    
    for (const contact of currentContacts) {
      // Comparar por nombre (siempre existe)
      if (contact.name.toLowerCase() === nameToFind) {
        return contact;
      }
      
      // Comparar por email (solo si ambos tienen email)
      if (newContact.email && contact.email && 
          contact.email.toLowerCase() === newContact.email.toLowerCase()) {
        return contact;
      }
    }
    
    return undefined;
  }

  /** Actualizar contacto existente - OPTIMIZADO Y CORREGIDO */
  private updateExistingContact(existingContact: Contact, newContact: Omit<Contact, 'id' | 'dateCreated'>): boolean {
    let hasUpdates = false;
    const updates: Partial<Contact> = {};

    if (!existingContact.company && newContact.company) {
      updates.company = newContact.company;
      hasUpdates = true;
    }
    
    if (!existingContact.position && newContact.position) {
      updates.position = newContact.position;
      hasUpdates = true;
    }
    
    if (!existingContact.email && newContact.email) {
      updates.email = newContact.email;
      hasUpdates = true;
    }
    
    if (!existingContact.phone && newContact.phone) {
      updates.phone = newContact.phone;
      hasUpdates = true;
    }

    // Verificar enlaces nuevos
    if (newContact.links.length > 0) {
      const existingValues = new Set(existingContact.links.map(l => l.value.toLowerCase()));
      const newLinks = newContact.links.filter(l => !existingValues.has(l.value.toLowerCase()));
      
      if (newLinks.length > 0) {
        updates.links = [...existingContact.links, ...newLinks];
        hasUpdates = true;
      }
    }

    if (hasUpdates) {
      this.contactService.updateContact(existingContact.id, updates);
    }
    
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