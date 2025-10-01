// src/app/components/contact-detail/contact-detail.component.ts
import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButton,
  IonButtons,
  IonIcon,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonChip,
  IonItem,
  IonLabel,
  IonList,
  IonBadge,
  ModalController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  close,
  mail,
  call,
  business,
  person,
  calendar,
  time,
  createOutline,
  locationOutline,
  chatbubbleOutline,
  alarmOutline,
  checkmarkCircle,
  globe,
  pricetags
} from 'ionicons/icons';
import { Contact } from '../../models/contact.model';
import { SocialLinksComponent } from '../social-links/social-links.component';

@Component({
  selector: 'app-contact-detail',
  templateUrl: './contact-detail.component.html',
  styleUrls: ['./contact-detail.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonButton,
    IonButtons,
    IonIcon,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonChip,
    IonItem,
    IonLabel,
    IonList,
    IonBadge,
    SocialLinksComponent
  ]
})
export class ContactDetailComponent implements OnInit {
  @Input() contact!: Contact;

  constructor(private modalController: ModalController) {
    addIcons({
      close,
      mail,
      call,
      business,
      person,
      calendar,
      time,
      createOutline,
      locationOutline,
      chatbubbleOutline,
      alarmOutline,
      checkmarkCircle,
      globe,
      pricetags
    });
  }

  ngOnInit() {
    console.log('ContactDetailComponent - ngOnInit', this.contact);
    if (!this.contact) {
      console.error('No se proporcionó un contacto al componente de detalle');
      this.closeModal();
    }
  }

  closeModal() {
    this.modalController.dismiss();
  }

  getPriorityColor(priority: string): string {
    switch (priority) {
      case 'high': return 'danger';
      case 'medium': return 'warning';
      case 'low': return 'success';
      default: return 'medium';
    }
  }

  getPriorityText(priority: string): string {
    switch (priority) {
      case 'high': return 'Alta';
      case 'medium': return 'Media';
      case 'low': return 'Baja';
      default: return 'Sin definir';
    }
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-CL', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  formatDateTime(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleString('es-CL', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getInitials(name: string): string {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }

  getNoteIcon(type: string): string {
    switch (type) {
      case 'meeting': return 'calendar';
      case 'note': return 'chatbubble-outline';
      default: return 'create-outline';
    }
  }

  getNoteTypeLabel(type: string): string {
    switch (type) {
      case 'meeting': return 'Reunión';
      case 'note': return 'Nota';
      default: return 'Información';
    }
  }

  hasReminder(note: any): boolean {
    return note.reminderSet && note.reminderDate;
  }

  isUpcomingReminder(reminderDate: string): boolean {
    return new Date(reminderDate) > new Date();
  }
}