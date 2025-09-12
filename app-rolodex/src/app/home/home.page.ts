
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
  IonButtons
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
  starOutline
} from 'ionicons/icons';
import { Observable } from 'rxjs';
import { Contact } from '../models/contact.model';
import { ContactService } from '../services/contact.service';
import { ContactFormComponent } from '../components/contact-form/contact-form.component';

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
    ContactFormComponent
  ],
})
export class HomePage implements OnInit {
  contacts$: Observable<Contact[]>;
  filteredContacts: Contact[] = [];
  searchTerm: string = '';
  showForm: boolean = false;

  constructor(private contactService: ContactService) {
    // Registrar los iconos que vamos a usar
    addIcons({ 
      add, 
      person, 
      mail, 
      call, 
      business, 
      search,
      star,
      starOutline
    });
    
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

  // Función para alternar el formulario flotante
  toggleForm() {
    this.showForm = !this.showForm;
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
  // Método para cerrar el formulario flotante
  onFormClosed() {
    this.showForm = false;
  }

  // Método para manejar el guardado de contacto
  onContactSaved(contact: Contact) {
    this.showForm = false;
    // Opcional: puedes actualizar la lista de contactos aquí si lo necesitas
    this.contacts$ = this.contactService.getContacts();
  }
}
