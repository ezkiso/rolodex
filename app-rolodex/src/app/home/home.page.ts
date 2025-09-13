import { SocialLinksComponent } from '../components/social-links/social-links.component';
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { 
  IonContent, 
  IonHeader, 
  IonTitle, 
  IonToolbar,
  IonSearchbar,
  IonList,
  IonItem,
  IonLabel,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonCardSubtitle,
  IonChip,
  IonIcon,
  IonFab,
  IonFabButton,
  IonButton,
  IonButtons,
  AlertController,
  ToastController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { 
  add, 
  person, 
  mail, 
  call, 
  business, 
  search,
  star,
  starOutline,
  create,
  trash,
  download,
  share, shareOutline, createOutline, trashOutline, mailOutline, callOutline } from 'ionicons/icons';
import { Observable } from 'rxjs';
import { Contact } from '../models/contact.model';
import { ContactService } from '../services/contact.service';
import { ContactFormComponent } from '../components/contact-form/contact-form.component';

// ✅ Importar jsPDF desde el paquete instalado por npm
import jsPDF from 'jspdf';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonContent,
    IonHeader,
    IonTitle,
    IonToolbar,
    IonSearchbar,
    IonCard,
    IonCardContent,
    IonCardHeader,
    IonCardTitle,
    IonCardSubtitle,
    IonChip,
    IonIcon,
    IonFab,
    IonFabButton,
    IonButton,
    ContactFormComponent,
    SocialLinksComponent
  ],
})
export class HomePage implements OnInit {
  contacts$: Observable<Contact[]>;
  filteredContacts: Contact[] = [];
  searchTerm: string = '';
  showForm: boolean = false;
  selectedContact: Contact | null = null;

  constructor(
    private contactService: ContactService,
    private alertController: AlertController,
    private toastController: ToastController
  ) {
    // Registrar los iconos que vamos a usar
    addIcons({person,shareOutline,createOutline,trashOutline,mailOutline,callOutline,add,mail,call,business,search,star,starOutline,create,trash,download,share});
    
    this.contacts$ = this.contactService.getContacts();
  }

  ngOnInit() {
    // Suscribirse a los cambios en los contactos
    this.contacts$.subscribe(contacts => {
      this.filteredContacts = contacts;
    });
  }

  // Función para buscar contactos
  onSearchChange(event: any) {
    this.searchTerm = event.detail.value;
    if (this.searchTerm.trim() === '') {
      // Si no hay término de búsqueda, mostrar todos los contactos
      this.contacts$.subscribe(contacts => {
        this.filteredContacts = contacts;
      });
    } else {
      // Filtrar contactos basado en el término de búsqueda
      this.filteredContacts = this.contactService.searchContacts(this.searchTerm);
    }
  }

  // Función para obtener el color del chip de prioridad
  getPriorityColor(priority: string): string {
    switch (priority) {
      case 'high': return 'danger';
      case 'medium': return 'warning';
      case 'low': return 'success';
      default: return 'medium';
    }
  }

  // Función para obtener el texto de la prioridad
  getPriorityText(priority: string): string {
    switch (priority) {
      case 'high': return 'Alta';
      case 'medium': return 'Media';
      case 'low': return 'Baja';
      default: return 'Sin definir';
    }
  }

  // Función para alternar el formulario flotante (nuevo contacto)
  toggleForm() {
    this.selectedContact = null; // Limpiar selección para nuevo contacto
    this.showForm = !this.showForm;
  }

  // Función para editar contacto
  editContact(contact: Contact) {
    this.selectedContact = contact;
    this.showForm = true;
  }
  

  // Función para eliminar contacto
  async deleteContact(contact: Contact) {
    const alert = await this.alertController.create({
      header: 'Confirmar eliminación',
      message: `¿Estás seguro de que quieres eliminar a ${contact.name}? Esta acción no se puede deshacer.`,
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel',
          cssClass: 'secondary'
        },
        {
          text: 'Eliminar',
          cssClass: 'danger',
          handler: async () => {
            const success = this.contactService.deleteContact(contact.id);
            if (success) {
              const toast = await this.toastController.create({
                message: `${contact.name} ha sido eliminado`,
                duration: 2000,
                color: 'success',
                position: 'top'
              });
              toast.present();
            }
          }
        }
      ]
    });

    await alert.present();
  }

  // Función para exportar contacto como imagen
  async exportContactAsImage(contact: Contact) {
    try {
      // Crear un canvas HTML para generar la imagen
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        throw new Error('No se pudo crear el contexto del canvas');
      }

      // Configurar el tamaño del canvas
      canvas.width = 400;
      canvas.height = 600;

      // Fondo blanco
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Configurar fuente
      ctx.fillStyle = '#000000';
      ctx.font = 'bold 24px Arial';
      
      // Título
      ctx.fillText('ROLODEX - CONTACTO', 20, 40);
      
      // Línea separadora
      ctx.beginPath();
      ctx.moveTo(20, 60);
      ctx.lineTo(380, 60);
      ctx.strokeStyle = '#cccccc';
      ctx.stroke();

      // Información del contacto
      let yPosition = 100;
      const lineHeight = 30;
      
      ctx.font = 'bold 20px Arial';
      ctx.fillText(contact.name, 20, yPosition);
      yPosition += lineHeight + 10;

      ctx.font = '16px Arial';
      if (contact.company) {
        ctx.fillText(`Empresa: ${contact.company}`, 20, yPosition);
        yPosition += lineHeight;
      }
      
      if (contact.position) {
        ctx.fillText(`Cargo: ${contact.position}`, 20, yPosition);
        yPosition += lineHeight;
      }
      
      if (contact.email) {
        ctx.fillText(`Email: ${contact.email}`, 20, yPosition);
        yPosition += lineHeight;
      }
      
      if (contact.phone) {
        ctx.fillText(`Teléfono: ${contact.phone}`, 20, yPosition);
        yPosition += lineHeight;
      }

      ctx.fillText(`Prioridad: ${this.getPriorityText(contact.priority)}`, 20, yPosition);
      yPosition += lineHeight + 10;

      if (contact.tags.length > 0) {
        ctx.fillText(`Tags: ${contact.tags.join(', ')}`, 20, yPosition);
        yPosition += lineHeight + 10;
      }

      // Fecha de creación
      ctx.font = '12px Arial';
      ctx.fillStyle = '#666666';
      ctx.fillText(`Creado: ${this.formatDate(contact.dateCreated)}`, 20, yPosition);

      // Convertir canvas a imagen y descargar
      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `${contact.name.replace(/\s+/g, '_')}_contacto.png`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
        }
      }, 'image/png');

      const toast = await this.toastController.create({
        message: 'Contacto exportado como imagen',
        duration: 2000,
        color: 'success',
        position: 'top'
      });
      toast.present();

    } catch (error) {
      console.error('Error al exportar como imagen:', error);
      const toast = await this.toastController.create({
        message: 'Error al exportar contacto como imagen',
        duration: 2000,
        color: 'danger',
        position: 'top'
      });
      toast.present();
    }
  }
  
  private toStringSafe(value: any): string {
    return value === undefined || value === null ? '' : String(value);
  }

  async exportContactAsPDF(contact: Contact) {
    try {
      const doc = new jsPDF();

      let yPosition = 40;
      const lineHeight = 8;

      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text(contact.name ?? '', 20, yPosition);
      yPosition += lineHeight + 5;

      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');

      if (contact.company) {
        doc.text(contact.company ?? '', 20, yPosition);
        yPosition += lineHeight;
      }
      if (contact.position) {
        doc.text(`Cargo: ${contact.position ?? ''}`, 20, yPosition);
        yPosition += lineHeight;
      }
      if (contact.email) {
        doc.text(`Email: ${contact.email ?? ''}`, 20, yPosition);
        yPosition += lineHeight;
      }
      if (contact.phone) {
        doc.text(`Teléfono: ${contact.phone ?? ''}`, 20, yPosition);
        yPosition += lineHeight;
      }

      // Esta función ya devuelve string siempre
      doc.text(`Prioridad: ${this.getPriorityText(contact.priority)}`, 20, yPosition);
      yPosition += lineHeight + 5;

      if (contact.tags.length > 0) {
        doc.text(`Tags: ${contact.tags.join(', ')}`, 20, yPosition);
        yPosition += lineHeight + 5;
      }

      if (contact.links && contact.links.length > 0) {
        doc.setFont('helvetica', 'bold');
        doc.text('Enlaces adicionales:', 20, yPosition);
        yPosition += lineHeight;
        doc.setFont('helvetica', 'normal');

        contact.links.forEach(link => {
          const label = link.label ?? link.type;
          const value = link.value ?? '';
          doc.text(`• ${label}: ${value}`, 25, yPosition);
          yPosition += lineHeight;
        });
        yPosition += 5;
      }

      if (contact.notes && contact.notes.length > 0) {
        doc.setFont('helvetica', 'bold');
        doc.text('Notas:', 20, yPosition);
        yPosition += lineHeight;
        doc.setFont('helvetica', 'normal');

        contact.notes.forEach(note => {
          const type = note.type ?? 'Nota';
          const text = note.text ?? '';
          const splitText = doc.splitTextToSize(`• ${type}: ${text}`, 170);
          doc.text(splitText, 25, yPosition);
          yPosition += lineHeight * splitText.length;
        });
      }


      // Fechas
      const dateCreatedStr = this.toStringSafe(this.formatDate(contact.dateCreated));
      const lastInteractionStr = this.toStringSafe(this.formatDate(contact.lastInteraction));
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(`Creado: ${dateCreatedStr}`, 20, yPosition);
      yPosition += lineHeight;
      doc.text(`Última interacción: ${lastInteractionStr}`, 20, yPosition);

      const fileName = `${this.toStringSafe(contact.name ?? 'contacto').replace(/\s+/g, '_')}_contacto.pdf`;
      doc.save(fileName);

      const toast = await this.toastController.create({
        message: 'Contacto exportado como PDF',
        duration: 2000,
        color: 'success',
        position: 'top'
      });
      toast.present();
    } catch (err) {
      console.error('Error al exportar como PDF:', err);
      const toast = await this.toastController.create({
        message: 'Error al exportar como PDF. Verifica los datos del contacto.',
        duration: 3000,
        color: 'danger',
        position: 'top'
      });
      toast.present();
    }
  }

  // Función para mostrar opciones de exportación
  async showExportOptions(contact: Contact) {
    const alert = await this.alertController.create({
      header: 'Exportar Contacto',
      message: `¿Cómo quieres exportar a ${contact.name}?`,
      buttons: [
        {
          text: 'Como Imagen (PNG)',
          handler: () => this.exportContactAsImage(contact)
        },
        {
          text: 'Como PDF',
          handler: () => this.exportContactAsPDF(contact)
        },
        {
          text: 'Cancelar',
          role: 'cancel'
        }
      ]
    });

    await alert.present();
  }

  // Función para formatear la fecha
  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-CL', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  // Función para obtener las iniciales del nombre
  getInitials(name: string): string {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }

  // Función para manejar el cierre del formulario
  onFormClosed() {
    this.showForm = false;
    this.selectedContact = null;
  }

  // Función para manejar el guardado de contacto
  onContactSaved(contact: Contact) {
    this.showForm = false;
    this.selectedContact = null;
    // Los contactos se actualizan automáticamente a través del Observable
  }
}