// src/app/services/contact.service.ts
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Contact } from '../models/contact.model';
import { DatabaseService } from './database.service';

@Injectable({
  providedIn: 'root'
})
export class ContactService {
  private contactsSubject = new BehaviorSubject<Contact[]>([]);
  public contacts$ = this.contactsSubject.asObservable();

  constructor(private db: DatabaseService) {
    this.initializeContacts();
  }

  // Inicializar contactos (con migración desde localStorage si es necesario)
  private async initializeContacts(): Promise<void> {
    try {
      // Primero intentar cargar desde IndexedDB
      const contacts = await this.db.getAllContacts();
      
      if (contacts.length > 0) {
        this.contactsSubject.next(contacts);
      } else {
        // Si no hay contactos en IndexedDB, verificar localStorage y migrar
        await this.migrateFromLocalStorage();
      }
    } catch (error) {
      console.error('Error inicializando contactos desde IndexedDB:', error);
      // Fallback a localStorage
      this.loadFromLocalStorage();
    }
  }

  // Migrar contactos desde localStorage a IndexedDB
  private async migrateFromLocalStorage(): Promise<void> {
    const savedContacts = localStorage.getItem('rolodex_contacts');
    if (savedContacts) {
      try {
        const contacts: Contact[] = JSON.parse(savedContacts);
        if (contacts.length > 0) {
          // Guardar en IndexedDB
          await this.db.addContactsBatch(contacts);
          this.contactsSubject.next(contacts);
          console.log(`Migrados ${contacts.length} contactos desde localStorage a IndexedDB`);
          return;
        }
      } catch (error) {
        console.error('Error migrando contactos desde localStorage:', error);
      }
    }
    
    // Si no hay contactos en localStorage, crear ejemplos
    const sampleContacts = this.createSampleContacts();
    await this.db.addContactsBatch(sampleContacts);
    this.contactsSubject.next(sampleContacts);
  }

  // Cargar contactos desde localStorage (fallback)
  private loadFromLocalStorage(): void {
    const savedContacts = localStorage.getItem('rolodex_contacts');
    if (savedContacts) {
      try {
        this.contactsSubject.next(JSON.parse(savedContacts));
      } catch (error) {
        console.error('Error cargando desde localStorage:', error);
        this.contactsSubject.next(this.createSampleContacts());
      }
    } else {
      this.contactsSubject.next(this.createSampleContacts());
    }
  }

  // Actualizar ambos almacenamientos (IndexedDB y localStorage como backup)
  private async updateStorages(contacts: Contact[]): Promise<void> {
    try {
      // Actualizar IndexedDB
      await this.db.clearContacts();
      await this.db.addContactsBatch(contacts);
    } catch (error) {
      console.error('Error actualizando IndexedDB:', error);
    }
    
    // Siempre mantener localStorage como backup
    localStorage.setItem('rolodex_contacts', JSON.stringify(contacts));
    this.contactsSubject.next([...contacts]);
  }

  // Obtener todos los contactos
  getContacts(): Observable<Contact[]> {
    return this.contacts$;
  }

  // Obtener un contacto por ID
  async getContactById(id: string): Promise<Contact | undefined> {
    try {
      return await this.db.getContact(id);
    } catch (error) {
      console.error('Error obteniendo contacto por ID desde IndexedDB:', error);
      // Fallback a memoria
      const contacts = this.contactsSubject.value;
      return contacts.find(contact => contact.id === id);
    }
  }

  // Agregar nuevo contacto
  async addContact(contactData: Omit<Contact, 'id' | 'dateCreated'>): Promise<Contact> {
    const newContact: Contact = {
      ...contactData,
      id: this.generateId(),
      dateCreated: new Date().toISOString()
    };
    
    const currentContacts = this.contactsSubject.value;
    const updatedContacts = [newContact, ...currentContacts];
    
    await this.updateStorages(updatedContacts);
    return newContact;
  }

  // Actualizar contacto existente
  async updateContact(id: string, updatedContact: Partial<Contact>): Promise<boolean> {
    const currentContacts = this.contactsSubject.value;
    const index = currentContacts.findIndex(contact => contact.id === id);
    
    if (index !== -1) {
      const updatedContacts = [...currentContacts];
      updatedContacts[index] = { 
        ...updatedContacts[index], 
        ...updatedContact,
        lastInteraction: new Date().toISOString()
      };
      
      await this.updateStorages(updatedContacts);
      return true;
    }
    
    return false;
  }

  // Eliminar contacto
  async deleteContact(id: string): Promise<boolean> {
    const currentContacts = this.contactsSubject.value;
    const updatedContacts = currentContacts.filter(contact => contact.id !== id);
    
    if (updatedContacts.length < currentContacts.length) {
      await this.updateStorages(updatedContacts);
      return true;
    }
    
    return false;
  }

  // Agregar múltiples contactos (para sincronización) - IMPLEMENTACIÓN REQUERIDA
  async addContactsBatch(contacts: Contact[]): Promise<void> {
    const currentContacts = this.contactsSubject.value;
    const updatedContacts = [...contacts, ...currentContacts];
    await this.updateStorages(updatedContacts);
  }

  // Sincronizar contactos (reemplazar todos)
  async syncContacts(contacts: Contact[]): Promise<void> {
    await this.updateStorages(contacts);
  }

  // Buscar contactos
  async searchContacts(query: string): Promise<Contact[]> {
    try {
      return await this.db.searchContacts(query);
    } catch (error) {
      console.error('Error buscando en IndexedDB, usando búsqueda en memoria:', error);
      
      // Fallback a búsqueda en memoria
      const searchTerm = query.toLowerCase();
      const contacts = this.contactsSubject.value;
      
      return contacts.filter(contact =>
        contact.name.toLowerCase().includes(searchTerm) ||
        (contact.company && contact.company.toLowerCase().includes(searchTerm)) ||
        (contact.email && contact.email.toLowerCase().includes(searchTerm)) ||
        (contact.phone && contact.phone.toLowerCase().includes(searchTerm)) ||
        contact.tags.some(tag => tag.toLowerCase().includes(searchTerm))
      );
    }
  }

  // Eliminar todos los contactos
  async deleteAllContacts(): Promise<void> {
    try {
      await this.db.clearContacts();
    } catch (error) {
      console.error('Error limpiando IndexedDB:', error);
    }
    
    localStorage.removeItem('rolodex_contacts');
    this.contactsSubject.next([]);
  }

  // Generar ID único
  private generateId(): string {
    return 'contact_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  // Crear contactos de ejemplo
  private createSampleContacts(): Contact[] {
    return [
      {
        id: this.generateId(),
        name: 'Ana García',
        company: 'Tech Solutions',
        position: 'Gerente de Ventas',
        email: 'ana.garcia@techsol.com',
        phone: '+56 9 1234 5678',
        links: [
          { type: 'email', value: 'ana.garcia@techsol.com', label: 'Trabajo' },
          { type: 'linkedin', value: 'https://linkedin.com/in/ana-garcia', label: 'LinkedIn' }
        ],
        notes: [{
          text: 'Muy interesada en nuestros servicios. Programar reunión la próxima semana.',
          date: new Date().toISOString(),
          created: new Date().toISOString(),
          type: 'note'
        }],
        tags: ['Cliente Potencial', 'Tecnología'],
        dateCreated: new Date().toISOString(),
        lastInteraction: new Date().toISOString(),
        priority: 'high'
      },
      {
        id: this.generateId(),
        name: 'Carlos Mendez',
        company: 'StartupXYZ',
        position: 'CEO',
        email: 'carlos@startupxyz.com',
        phone: '+56 9 8765 4321',
        links: [
          { type: 'email', value: 'carlos@startupxyz.com', label: 'Trabajo' },
          { type: 'website', value: 'https://startupxyz.com', label: 'Empresa' }
        ],
        notes: [{
          text: 'Reunión programada para el viernes a las 15:00',
          date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
          created: new Date().toISOString(),
          type: 'meeting',
          reminder: true
        }],
        tags: ['Startup', 'Emprendedor'],
        dateCreated: new Date().toISOString(),
        lastInteraction: new Date().toISOString(),
        priority: 'medium'
      }
    ];
  }
}