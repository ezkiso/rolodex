import { Injectable } from '@angular/core';
import Dexie from 'dexie';
import { Contact } from '../models/contact.model';

export interface AppSettings {
  id: string;
  value: any;
  lastUpdated: string;
}

@Injectable({
  providedIn: 'root'
})
export class DatabaseService extends Dexie {
  contacts!: Dexie.Table<Contact, string>;
  settings!: Dexie.Table<AppSettings, string>;

  constructor() {
    super('RolodexDB');
    
    this.version(1).stores({
      contacts: 'id, name, email, phone, company, tags, lastInteraction, priority',
      settings: 'id, value, lastUpdated'
    });

    this.version(2).upgrade(trans => {
      return trans.table('contacts').toCollection().modify(contact => {
        // Migración: asegurar que todos los contactos tengan campo dateCreated
        if (!contact.dateCreated) {
          contact.dateCreated = new Date().toISOString();
        }
      });
    });
  }

  // Métodos para contactos
  async getAllContacts(): Promise<Contact[]> {
    return await this.contacts.toArray();
  }

  async getContact(id: string): Promise<Contact | undefined> {
    return await this.contacts.get(id);
  }

  async addContact(contact: Contact): Promise<string> {
    return await this.contacts.add(contact);
  }

  async addContactsBatch(contacts: Contact[]): Promise<void> {
    await this.contacts.bulkAdd(contacts);
  }

  async updateContact(id: string, changes: Partial<Contact>): Promise<number> {
    return await this.contacts.update(id, changes);
  }

  async deleteContact(id: string): Promise<void> {
    await this.contacts.delete(id);
  }

  async clearContacts(): Promise<void> {
    await this.contacts.clear();
  }

  // Métodos para configuración de la app
  async getSetting<T>(id: string, defaultValue: T): Promise<T> {
    const setting = await this.settings.get(id);
    return setting ? setting.value : defaultValue;
  }

  async setSetting<T>(id: string, value: T): Promise<void> {
    await this.settings.put({
      id,
      value,
      lastUpdated: new Date().toISOString()
    });
  }

  // Métodos de utilidad
  async getContactsCount(): Promise<number> {
    return await this.contacts.count();
  }

async searchContacts(query: string): Promise<Contact[]> {
  const lowerQuery = query.toLowerCase();
  
  // Búsquedas individuales por campo (más eficiente)
  const [byName, byEmail, byPhone, byCompany] = await Promise.all([
    this.contacts.where('name').startsWithIgnoreCase(lowerQuery).toArray(),
    this.contacts.where('email').startsWithIgnoreCase(lowerQuery).toArray(),
    this.contacts.where('phone').startsWithIgnoreCase(lowerQuery).toArray(),
    this.contacts.where('company').startsWithIgnoreCase(lowerQuery).toArray()
  ]);
  
  // Combinar y eliminar duplicados
  const allResults = [...byName, ...byEmail, ...byPhone, ...byCompany];
  const uniqueResults = allResults.filter((contact, index, array) => 
    array.findIndex(c => c.id === contact.id) === index
  );
  
  return uniqueResults;
}
}