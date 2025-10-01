import { SocialLinksComponent } from '../components/social-links/social-links.component';
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ContactDetailComponent } from '../components/contact-detail/contact-detail.component';
import { 
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
  AlertController,
  ToastController,
  ModalController,
  LoadingController,
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
  share, 
  shareOutline,
  sync,
  phonePortrait,
  createOutline, 
  trashOutline, 
  mailOutline, 
  callOutline,
  globe,
  logoLinkedin,
  logoFacebook,
  logoInstagram,
  close
} from 'ionicons/icons';
import { Observable } from 'rxjs';
import { Contact } from '../models/contact.model';
import { ContactService } from '../services/contact.service';
import { ContactFormComponent } from '../components/contact-form/contact-form.component';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { ContactsSyncService } from '../services/contacts-sync.service'; 
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
    private toastController: ToastController,
    private modalController: ModalController,
    private contactsSyncService: ContactsSyncService,
    private loadingController: LoadingController
  ) {
    // Registrar los iconos que vamos a usar
    addIcons({
      person, shareOutline, createOutline, trashOutline, mailOutline, 
      callOutline, add, mail, call, business, search, star, starOutline, 
      create, trash, download, share, globe, logoLinkedin, logoFacebook, 
      logoInstagram, sync, phonePortrait, close
    });
    
    this.contacts$ = this.contactService.getContacts();
  }

  async ngOnInit() {
    // Suscribirse a los cambios en los contactos
    this.contacts$.subscribe(contacts => {
      this.filteredContacts = contacts;
    });

    // Verificar permisos de contactos al iniciar
    setTimeout(() => {
      this.contactsSyncService.checkAndRequestPermissionsOnStartup();
    }, 2000); // Esperar 2 segundos para que la app cargue completamente
  }

  // Función para buscar contactos
  async onSearchChange(event: any) {
    this.searchTerm = event.detail.value;
    if (this.searchTerm.trim() === '') {
      // Si no hay término de búsqueda, mostrar todos los contactos
      this.contacts$.subscribe(contacts => {
        this.filteredContacts = contacts;
      });
    } else {
      // Filtrar contactos basado en el término de búsqueda
      this.filteredContacts = await this.contactService.searchContacts(this.searchTerm);
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

    // Función para abrir el detalle del contacto en modal
  async openContactDetail(contact: Contact) {
    const modal = await this.modalController.create({
      component: ContactDetailComponent,
      componentProps: {
        contact: contact
      },
      cssClass: 'contact-detail-modal'
    });

    await modal.present();
  }


  // Función para alternar el formulario flotante (nuevo contacto)
  toggleForm() {
    this.selectedContact = null; // Limpiar selección para nuevo contacto
    this.showForm = !this.showForm;
  }

  // Función para editar contacto
  editContact(contact: Contact, event: Event) {
    if(event){
    event.stopPropagation();
    } // Evitar que el clic se propague al card
    this.selectedContact = contact;
    this.showForm = true;
  }

  // Función para eliminar contacto
  async deleteContact(contact: Contact, event: Event) {
    if (event){
    event.stopPropagation(); // Evitar que el clic se propague al card
    }
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
            const success = await this.contactService.deleteContact(contact.id);
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

  // Helper para convertir Blob a base64
  private blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result as string;
        resolve(dataUrl);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  // Función para guardar imagen en el dispositivo
  async saveImageToDevice(imageBlob: Blob, contactName: string) {
    try {
      const base64Data = await this.blobToBase64(imageBlob);
      const cleanBase64 = base64Data.split(',')[1] || base64Data;
      const fileName = `rolodex_${contactName.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.png`;
      
      const result = await Filesystem.writeFile({
        path: fileName,
        data: cleanBase64,
        directory: Directory.Documents,
      });

      console.log('Imagen guardada en:', result.uri);

      await Share.share({
        title: 'Exportar Contacto',
        text: `Contacto exportado: ${contactName}`,
        url: result.uri,
        dialogTitle: 'Abrir o compartir imagen',
      });

    } catch (error) {
      console.error('Error al guardar imagen:', error);
      throw error;
    }
  }

  // Función para guardar PDF en el dispositivo
  async savePdfToDevice(pdfBlob: Blob, contactName: string) {
    try {
      const base64Data = await this.blobToBase64(pdfBlob);
      const cleanBase64 = base64Data.split(',')[1] || base64Data;
      const fileName = `rolodex_${contactName.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.pdf`;
      
      const result = await Filesystem.writeFile({
        path: fileName,
        data: cleanBase64,
        directory: Directory.Documents,
      });

      console.log('PDF guardado en:', result.uri);

      await Share.share({
        title: 'Exportar Contacto',
        text: `Contacto exportado: ${contactName}`,
        url: result.uri,
        dialogTitle: 'Abrir o compartir PDF',
      });

    } catch (error) {
      console.error('Error al guardar PDF:', error);
      throw error;
    }
  }

  // Función para exportar contacto como imagen
  async exportContactAsImage(contact: Contact) {
    const loading = await this.loadingController.create({
      message: 'Generando imagen...',
    });
    await loading.present();

    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        throw new Error('No se pudo crear el contexto del canvas');
      }

      canvas.width = 400;
      canvas.height = 600;

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#000000';
      ctx.font = 'bold 24px Arial';
      ctx.fillText('ROLODEX - CONTACTO', 20, 40);
      
      ctx.beginPath();
      ctx.moveTo(20, 60);
      ctx.lineTo(380, 60);
      ctx.strokeStyle = '#cccccc';
      ctx.stroke();

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

      ctx.font = '12px Arial';
      ctx.fillStyle = '#666666';
      ctx.fillText(`Creado: ${this.formatDate(contact.dateCreated)}`, 20, yPosition);

      return new Promise<void>((resolve, reject) => {
        canvas.toBlob(async (blob) => {
          if (blob) {
            try {
              await this.saveImageToDevice(blob, contact.name);
              
              const toast = await this.toastController.create({
                message: 'Contacto exportado como imagen',
                duration: 2000,
                color: 'success',
                position: 'top'
              });
              toast.present();
              resolve();
            } catch (error) {
              console.error('Error al guardar imagen:', error);
              reject(error);
            } finally {
              await loading.dismiss();
            }
          } else {
            reject(new Error('No se pudo generar el blob de imagen'));
            await loading.dismiss();
          }
        }, 'image/png');
      });

    } catch (error) {
      console.error('Error al exportar como imagen:', error);
      await loading.dismiss();
      const toast = await this.toastController.create({
        message: 'Error al exportar contacto como imagen',
        duration: 2000,
        color: 'danger',
        position: 'top'
      });
      toast.present();
    }
  }

  async exportContactAsPDF(contact: Contact) {
    const loading = await this.loadingController.create({
      message: 'Generando PDF...',
    });
    await loading.present();

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

      const dateCreatedStr = this.toStringSafe(this.formatDate(contact.dateCreated));
      const lastInteractionStr = this.toStringSafe(this.formatDate(contact.lastInteraction));
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(`Creado: ${dateCreatedStr}`, 20, yPosition);
      yPosition += lineHeight;
      doc.text(`Última interacción: ${lastInteractionStr}`, 20, yPosition);

      const pdfBlob = doc.output('blob');
      await this.savePdfToDevice(pdfBlob, contact.name);

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
    } finally {
      await loading.dismiss();
    }
  }

  private toStringSafe(value: any): string {
    return value === undefined || value === null ? '' : String(value);
  }

  // Función para mostrar opciones de exportación
  async showExportOptions(contact: Contact, event: Event) {
    if(event){
    event.stopPropagation(); // Evitar que el clic se propague al card
    }
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
  }

  // ========================================
  // NUEVAS FUNCIONES DE SINCRONIZACIÓN:
  // ========================================

  // Sincronizar contactos del dispositivo
  async syncDeviceContacts() {
    await this.contactsSyncService.showSyncConfirmation();
  }

  // Abrir menú de opciones
  async openOptionsMenu() {
    const alert = await this.alertController.create({
      header: 'Opciones',
      buttons: [
        {
          text: '📱 Sincronizar con contactos del teléfono',
          handler: () => this.syncDeviceContacts()
        },
        {
          text: '📊 Exportar todos los contactos',
          handler: () => this.exportAllContacts()
        },
        {
          text: '📈 Estadísticas',
          handler: () => this.showStatistics()
        },
        {
          text: 'Cancelar',
          role: 'cancel'
        }
      ]
    });

    await alert.present();
  }

  // Exportar todos los contactos
  async exportAllContacts() {
    const contacts = this.filteredContacts;
    
    if (contacts.length === 0) {
      const toast = await this.toastController.create({
        message: 'No hay contactos para exportar',
        duration: 2000,
        color: 'warning',
        position: 'top'
      });
      toast.present();
      return;
    }

    const loading = await this.loadingController.create({
      message: 'Exportando contactos...',
      spinner: 'crescent'
    });
    await loading.present();

    try {
      const contactsData = contacts.map(contact => ({
        Nombre: contact.name,
        Empresa: contact.company || '',
        Cargo: contact.position || '',
        Email: contact.email || '',
        Teléfono: contact.phone || '',
        Prioridad: this.getPriorityText(contact.priority),
        Tags: contact.tags.join(', '),
        'Fecha Creación': this.formatDate(contact.dateCreated),
        'Última Interacción': this.formatDate(contact.lastInteraction)
      }));

      const csvContent = this.convertToCSV(contactsData);
      this.downloadFile(csvContent, `rolodex_contactos_${new Date().toISOString().split('T')[0]}.csv`, 'text/csv');

      await loading.dismiss();
      
      const toast = await this.toastController.create({
        message: `${contacts.length} contactos exportados exitosamente`,
        duration: 3000,
        color: 'success',
        position: 'top'
      });
      toast.present();
    } catch (error) {
      await loading.dismiss();
      const toast = await this.toastController.create({
        message: 'Error al exportar contactos',
        duration: 2000,
        color: 'danger',
        position: 'top'
      });
      toast.present();
    }
  }

  // Mostrar estadísticas
  async showStatistics() {
    const contacts = this.filteredContacts;
    const highPriority = contacts.filter(c => c.priority === 'high').length;
    const mediumPriority = contacts.filter(c => c.priority === 'medium').length;
    const lowPriority = contacts.filter(c => c.priority === 'low').length;
    const withCompany = contacts.filter(c => c.company?.trim()).length;
    const withEmail = contacts.filter(c => c.email?.trim()).length;
    const withPhone = contacts.filter(c => c.phone?.trim()).length;
    const withNotes = contacts.filter(c => c.notes.length > 0).length;

    const alert = await this.alertController.create({
      header: 'Estadísticas de Contactos',
      message: `
        <div style="text-align: left;">
          <strong>Total de contactos:</strong> ${contacts.length}<br><br>
          
          <strong>Por prioridad:</strong><br>
          🔴 Alta: ${highPriority}<br>
          🟡 Media: ${mediumPriority}<br>
          🟢 Baja: ${lowPriority}<br><br>
          
          <strong>Información completada:</strong><br>
          🏢 Con empresa: ${withCompany}<br>
          ✉️ Con email: ${withEmail}<br>
          📞 Con teléfono: ${withPhone}<br>
          📝 Con notas: ${withNotes}
        </div>
      `,
      buttons: ['Cerrar']
    });

    await alert.present();
  }

  // Funciones auxiliares para exportación
  private convertToCSV(data: any[]): string {
    if (data.length === 0) return '';
    
    const headers = Object.keys(data[0]).join(',');
    const rows = data.map(row => 
      Object.values(row).map(value => 
        `"${String(value).replace(/"/g, '""')}"`
      ).join(',')
    );
    
    return [headers, ...rows].join('\n');
  }

  private downloadFile(content: string, fileName: string, contentType: string): void {
    const blob = new Blob([content], { type: contentType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}