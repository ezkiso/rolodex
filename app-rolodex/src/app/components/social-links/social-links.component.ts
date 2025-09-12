import { Component, Input } from '@angular/core';
import { ContactLink } from '../../models/contact.model';
import { CommonModule } from '@angular/common';
import { IonButton, IonIcon } from '@ionic/angular/standalone';

@Component({
  selector: 'app-social-links',
  templateUrl: './social-links.component.html',
  styleUrls: ['./social-links.component.scss'],
  standalone: true,
  imports: [
    CommonModule,      
    IonButton,         
    IonIcon            
  ]
})
export class SocialLinksComponent {
  @Input() links: ContactLink[] = [];

  getIcon(type: string): string {
    switch (type) {
      case 'facebook': return 'logo-facebook';
      case 'instagram': return 'logo-instagram';
      case 'linkedin': return 'logo-linkedin';
      case 'email': return 'mail';
      case 'phone': return 'call';
      case 'website': return 'globe';
      default: return 'link';
    }
  }

  getLabel(type: string): string {
  const found = [
    { value: 'email', label: 'Email' },
    { value: 'phone', label: 'Teléfono' },
    { value: 'linkedin', label: 'LinkedIn' },
    { value: 'facebook', label: 'Facebook' },
    { value: 'instagram', label: 'Instagram' },
    { value: 'website', label: 'Sitio Web' }
  ].find(l => l.value === type);
  return found ? found.label : type;
  }

  getUrl(link: ContactLink): string {
    switch (link.type) {
      case 'facebook':
      case 'instagram':
      case 'linkedin':
      case 'website':
        return link.value;
      case 'email':
        return `mailto:${link.value}`;
      case 'phone':
        return `tel:${link.value}`;
      default:
        return link.value;
    }
  }
}