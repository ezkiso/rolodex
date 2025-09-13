// src/app/home/home.page.ts
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
  ToastController,
  ActionSheetController
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
  createOutline,
  trashOutline,
  mailOutline,
  callOutline,
  documentTextOutline,
  imageOutline,
  checkmarkCircle
} from 'ionicons/icons';
import { Observable } from 'rxjs';
import { Contact } from '../models/contact.model';
import { ContactService } from '../services/contact.service';
import { ContactFormComponent } from '../components/contact-form/contact-form.component';

// Para poder usar html2canvas y jsPDF
declare const html2canvas: any;
declare const jsPDF: any;

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
    private actionSheetController: ActionSheetController
  ) {
    // Registrar los iconos que vamos a usar
    addIcons({ 
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
      createOutline,
      trashOutline,
      mailOutline,
      callOutline,
      documentTextOutline,
      imageOutline,
      checkmarkCircle
    });
    
    this.contacts$ = this.contactService.getContacts();
    
    // Cargar librerías necesarias para exportar
    this.loadExportLibraries();
  }

  ngOnInit() {
    // Suscribirse a los cambios en los contactos
    this.contacts$.subscribe(contacts => {
      this.filteredContacts = contacts;
    });
  }

  // Cargar librerías de exportación
  private loadExportLibraries() {
    // Cargar html2canvas
    if (!document.querySelector('script[src*="html2canvas"]')) {
      const html2canvasScript = document.createElement('script');
      html2canvasScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
      document.head.appendChild(html2canvasScript);
    }

    // Cargar jsPDF
    if (!document.querySelector('script[src*="jspdf"]')) {
      const jsPDFScript = document.createElement('script');
      jsPDFScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
      document.head.appendChild(jsPDFScript);
    }
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

  // Función para exportar contacto como JPG
  async exportContactAsJPG(contact: Contact, cardElement: HTMLElement) {
    try {
      const toast = await this.toastController.create({
        message: 'Generando imagen...',
        duration: 1000,
        color: 'primary',
        position: 'top'
      });
      await toast.present();

      // Esperar un poco para que se carguen las librerías si es necesario
      await new Promise(resolve => setTimeout(resolve, 500));

      if (typeof html2canvas === 'undefined') {
        throw new Error('html2canvas no está disponible');
      }

      // Capturar el elemento de la tarjeta
      const canvas = await html2canvas(cardElement, {
        scale: 2,
        useCORS: true,
        allowTaint: false,
        backgroundColor: '#ffffff',
        width: cardElement.offsetWidth,
        height: cardElement.offsetHeight
      });

      // Convertir a JPG y descargar
      canvas.toBlob((blob: Blob | null) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `${contact.name.replace(/\s+/g, '_')}_contacto.jpg`;
          
          // Agregar al DOM temporalmente para hacer click
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          
          // Limpiar URL
          setTimeout(() => URL.revokeObjectURL(url), 100);

          this.showSuccessToast('Contacto exportado como JPG');
        }
      }, 'image/jpeg', 0.9);

    } catch (error) {
      console.error('Error al exportar como JPG:', error);
      this.showErrorToast('Error al exportar como JPG');
    }
  }

  // Función para exportar contacto como PDF
  async exportContactAsPDF(contact: Contact, cardElement: HTMLElement) {
    try {
      const toast = await this.toastController.create({
        message: 'Generando PDF...',
        duration: 1000,
        color: 'primary',
        position: 'top'
      });
      await toast.present();

      // Capturar el elemento de la tarjeta
      const canvas = await html2canvas(cardElement, {
        scale: 2,
        useCORS: true,
        allowTaint: false,
        backgroundColor: '#ffffff',
        width: cardElement.offsetWidth,
        height: cardElement.offsetHeight
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.9);
      
      // Crear PDF
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      // Calcular dimensiones para el PDF
      const pdfWidth = 210; // A4 width in mm
      const pdfHeight = 297; // A4 height in mm
      const imgWidth = pdfWidth - 20; // margin
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      // Centrar la imagen
      const x = 10;
      const y = Math.max(10, (pdfHeight - imgHeight) / 2);
      
      pdf.addImage(imgData, 'JPEG', x, y, imgWidth, imgHeight);
      
      // Generar el PDF y descargarlo
      pdf.save(`${contact.name.replace(/\s+/g, '_')}_contacto.pdf`);
      
      this.showSuccessToast('Contacto exportado como PDF');

    } catch (error) {
      console.error('Error al exportar como PDF:', error);
      this.showErrorToast('Error al exportar como PDF');
    }
  }

  // Función para mostrar opciones de exportación con ActionSheet
  async showExportOptions(contact: Contact, event: Event) {
    // Encontrar el elemento ion-card más cercano
    const target = event.target as HTMLElement;
    const cardElement = target.closest('ion-card') as HTMLElement;
    
    if (!cardElement) {
      this.showErrorToast('Error al obtener la tarjeta del contacto');
      return;
    }

    const actionSheet = await this.actionSheetController.create({
      header: `Compartir ${contact.name}`,
      buttons: [
        {
          text: 'Descargar como JPG',
          icon: 'image-outline',
          handler: () => {
            this.exportContactAsJPG(contact, cardElement);
          }
        },
        {
          text: 'Descargar como PDF',
          icon: 'document-text-outline',
          handler: () => {
            this.exportContactAsPDF(contact, cardElement);
          }
        },
        {
          text: 'Cancelar',
          icon: 'close',
          role: 'cancel'
        }
      ]
    });

    await actionSheet.present();
  }

  // Funciones auxiliares para mostrar toasts
  private async showSuccessToast(message: string) {
    const toast = await this.toastController.create({
      message,
      duration: 2000,
      color: 'success',
      position: 'top',
      icon: 'checkmark-circle'
    });
    await toast.present();
  }

  private async showErrorToast(message: string) {
    const toast = await this.toastController.create({
      message,
      duration: 3000,
      color: 'danger',
      position: 'top'
    });
    await toast.present();
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