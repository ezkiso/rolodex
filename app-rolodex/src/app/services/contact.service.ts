import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Contact, ContactNote } from '../models/contact.model';
import { jsPDF } from 'jspdf';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

@Injectable({
  providedIn: 'root'
})
export class ContactService {
  private contacts: Contact[] = [];
  private contactsSubject = new BehaviorSubject<Contact[]>([]);
  public contacts$ = this.contactsSubject.asObservable();

  constructor() {
    this.loadContacts();
  }

  // Cargar contactos del localStorage
  private loadContacts(): void {
    const savedContacts = localStorage.getItem('rolodex_contacts');
    if (savedContacts) {
      this.contacts = JSON.parse(savedContacts);
    } else {
      // Crear algunos contactos de ejemplo para empezar
      this.contacts = this.createSampleContacts();
      this.saveContacts();
    }
    this.contactsSubject.next([...this.contacts]);
  }

  // Guardar contactos en localStorage
  private saveContacts(): void {
    localStorage.setItem('rolodex_contacts', JSON.stringify(this.contacts));
    this.contactsSubject.next([...this.contacts]);
  }

  // Obtener todos los contactos
  getContacts(): Observable<Contact[]> {
    return this.contacts$;
  }

  // Obtener un contacto por ID
  getContactById(id: string): Contact | undefined {
    return this.contacts.find(contact => contact.id === id);
  }

  // Agregar nuevo contacto
  addContact(contact: Omit<Contact, 'id' | 'dateCreated'>): Contact {
    const newContact: Contact = {
      ...contact,
      id: this.generateId(),
      dateCreated: new Date().toISOString()
    };
    
    this.contacts.unshift(newContact); // Agregar al inicio
    this.saveContacts();
    return newContact;
  }

  // Actualizar contacto existente
  updateContact(id: string, updatedContact: Partial<Contact>): boolean {
    const index = this.contacts.findIndex(contact => contact.id === id);
    if (index !== -1) {
      this.contacts[index] = { 
        ...this.contacts[index], 
        ...updatedContact,
        lastInteraction: new Date().toISOString()
      };
      this.saveContacts();
      return true;
    }
    return false;
  }

  // Eliminar contacto
  deleteContact(id: string): boolean {
    const index = this.contacts.findIndex(contact => contact.id === id);
    if (index !== -1) {
      this.contacts.splice(index, 1);
      this.saveContacts();
      return true;
    }
    return false;
  }

  // Buscar contactos
  searchContacts(query: string): Contact[] {
    if (!query.trim()) {
      return this.contacts;
    }
    
    const searchTerm = query.toLowerCase();
    return this.contacts.filter(contact =>
      contact.name.toLowerCase().includes(searchTerm) ||
      contact.company?.toLowerCase().includes(searchTerm) ||
      contact.email?.toLowerCase().includes(searchTerm) ||
      contact.tags.some(tag => tag.toLowerCase().includes(searchTerm))
    );
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
  async exportContactAsPDF(contact: Contact): Promise<void> {
    const doc = new jsPDF();

    // Título
    doc.setFontSize(18);
    doc.text('Contacto', 10, 15);

    // Datos básicos
    doc.setFontSize(12);
    doc.text(`Nombre: ${contact.name}`, 10, 30);
    doc.text(`Empresa: ${contact.company || ''}`, 10, 40);
    doc.text(`Cargo: ${contact.position || ''}`, 10, 50);
    doc.text(`Email: ${contact.email || ''}`, 10, 60);
    doc.text(`Teléfono: ${contact.phone || ''}`, 10, 70);
    doc.text(`Prioridad: ${contact.priority || ''}`, 10, 80);
    doc.text(`Tags: ${contact.tags?.join(', ') || ''}`, 10, 90);

    // Enlaces
    if (contact.links && contact.links.length > 0) {
      doc.text('Enlaces:', 10, 100);
      contact.links.forEach((link, i) => {
        doc.text(`- ${link.type}: ${link.value}`, 15, 110 + i * 10);
      });
    }

    // Notas
    if (contact.notes && contact.notes.length > 0) {
      doc.text('Notas:', 10, 120 + (contact.links?.length || 0) * 10);
      contact.notes.forEach((note, i) => {
        doc.text(`- ${note.type}: ${note.text}`, 15, 130 + (contact.links?.length || 0) * 10 + i * 10);
      });
    }

    // Exportar PDF como base64
    const pdfOutput = doc.output('datauristring');
    const base64 = pdfOutput.split(',')[1];

    // Guardar el archivo en el dispositivo
    const fileName = `contacto_${contact.name.replace(/\s+/g, '_')}.pdf`;
    const result = await Filesystem.writeFile({
      path: fileName,
      data: base64,
      directory: Directory.Documents
    });

    // Compartir el archivo (opcional)
    await Share.share({
      title: 'Exportar contacto',
      text: `Contacto: ${contact.name}`,
      url: result.uri,
      dialogTitle: 'Compartir PDF'
    });
  }
} 