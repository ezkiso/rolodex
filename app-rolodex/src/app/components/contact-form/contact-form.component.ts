import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormArray } from '@angular/forms';
import { 
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonItem,
  IonLabel,
  IonInput,
  IonTextarea,
  IonButton,
  IonSelect,
  IonSelectOption,
  IonIcon,
  IonChip,
  IonGrid,
  IonRow,
  IonCol,
  IonList,
  AlertController,
  ToastController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { 
  save, 
  close, 
  add, 
  trash,
  mail,
  call,
  globe,
  logoLinkedin,
  logoTwitter
} from 'ionicons/icons';
import { Contact, ContactLink, ContactNote } from '../../models/contact.model';
import { ContactService } from '../../services/contact.service';

@Component({
  selector: 'app-contact-form',
  templateUrl: './contact-form.component.html',
  styleUrls: ['./contact-form.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    IonCard,
    IonCardContent,
    IonCardHeader,
    IonCardTitle,
    IonItem,
    IonLabel,
    IonInput,
    IonTextarea,
    IonButton,
    IonSelect,
    IonSelectOption,
    IonIcon,
    IonChip,
    IonGrid,
    IonRow,
    IonCol,
    IonList
  ]
})
export class ContactFormComponent implements OnInit {
  @Input() contact: Contact | null = null;
  @Input() isVisible: boolean = false;
  @Output() formClosed = new EventEmitter<void>();
  @Output() contactSaved = new EventEmitter<Contact>();

  contactForm: FormGroup;
  priorityOptions = [
    { value: 'low', label: 'Baja' },
    { value: 'medium', label: 'Media' },
    { value: 'high', label: 'Alta' }
  ];

  linkTypes = [
    { value: 'email', label: 'Email', icon: 'mail' },
    { value: 'phone', label: 'Teléfono', icon: 'call' },
    { value: 'linkedin', label: 'LinkedIn', icon: 'logo-linkedin' },
    { value: 'twitter', label: 'Twitter', icon: 'logo-twitter' },
    { value: 'website', label: 'Sitio Web', icon: 'globe' }
  ];

  constructor(
    private formBuilder: FormBuilder,
    private contactService: ContactService,
    private alertController: AlertController,
    private toastController: ToastController
  ) {
    // Registrar iconos
    addIcons({ 
      save, 
      close, 
      add, 
      trash,
      mail,
      call,
      globe,
      logoLinkedin,
      logoTwitter
    });

    this.contactForm = this.initializeForm();
  }

  ngOnInit() {
    if (this.contact) {
      this.loadContactData();
    }
  }
  
  getLinkLabel(type: string): string {
  const found = this.linkTypes.find(lt => lt.value === type);
  return found ? found.label : 'enlace';
  }

  private initializeForm(): FormGroup {
    return this.formBuilder.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      company: [''],
      position: [''],
      email: ['', [Validators.email]],
      phone: [''],
      priority: ['medium', Validators.required],
      tags: [''],
      links: this.formBuilder.array([]),
      notes: this.formBuilder.array([])
    });
  }

  private loadContactData() {
    if (this.contact) {
      this.contactForm.patchValue({
        name: this.contact.name,
        company: this.contact.company || '',
        position: this.contact.position || '',
        email: this.contact.email || '',
        phone: this.contact.phone || '',
        priority: this.contact.priority,
        tags: this.contact.tags.join(', ')
      });

      // Cargar enlaces
      this.contact.links.forEach(link => {
        this.addLink(link);
      });

      // Cargar notas
      this.contact.notes.forEach(note => {
        this.addNote(note);
      });
    }
  }

  // Getters para FormArrays
  get links() {
    return this.contactForm.get('links') as FormArray;
  }

  get notes() {
    return this.contactForm.get('notes') as FormArray;
  }

  // Funciones para manejar enlaces
  addLink(existingLink?: ContactLink) {
    const linkGroup = this.formBuilder.group({
      type: [existingLink?.type || 'email', Validators.required],
      value: [existingLink?.value || '', Validators.required],
      label: [existingLink?.label || '']
    });
    this.links.push(linkGroup);
  }

  removeLink(index: number) {
    this.links.removeAt(index);
  }

  // Funciones para manejar notas
  addNote(existingNote?: ContactNote) {
    const noteGroup = this.formBuilder.group({
      text: [existingNote?.text || '', Validators.required],
      type: [existingNote?.type || 'note', Validators.required],
      reminder: [existingNote?.reminder || false]
    });
    this.notes.push(noteGroup);
  }

  removeNote(index: number) {
    this.notes.removeAt(index);
  }

  // Validar enlaces según su tipo
  validateLink(type: string, value: string): boolean {
    switch (type) {
      case 'email':
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
      case 'phone':
        return /^[\+]?[1-9][\d]{0,15}$/.test(value.replace(/\s/g, ''));
      case 'linkedin':
        return value.includes('linkedin.com/');
      case 'twitter':
        return value.includes('twitter.com/') || value.includes('x.com/');
      case 'website':
        return /^https?:\/\//.test(value);
      default:
        return true;
    }
  }

  // Procesar tags (convertir string a array)
  private processTags(tagsString: string): string[] {
    if (!tagsString) return [];
    return tagsString
      .split(',')
      .map(tag => tag.trim())
      .filter(tag => tag.length > 0);
  }

  // Guardar contacto
  async saveContact() {
    if (this.contactForm.valid) {
      // Validar enlaces
      const linksValid = this.links.controls.every(linkControl => {
        const link = linkControl.value;
        return this.validateLink(link.type, link.value);
      });

      if (!linksValid) {
        const toast = await this.toastController.create({
          message: 'Por favor verifica que todos los enlaces tengan el formato correcto',
          duration: 3000,
          color: 'warning',
          position: 'top'
        });
        toast.present();
        return;
      }

      const formValue = this.contactForm.value;
      const contactData = {
        name: formValue.name,
        company: formValue.company || undefined,
        position: formValue.position || undefined,
        email: formValue.email || undefined,
        phone: formValue.phone || undefined,
        priority: formValue.priority,
        tags: this.processTags(formValue.tags),
        links: formValue.links || [],
        notes: formValue.notes.map((note: any) => ({
          ...note,
          date: new Date().toISOString(),
          created: new Date().toISOString()
        })) || [],
        lastInteraction: new Date().toISOString()
      };

      let savedContact: Contact;

      if (this.contact) {
        // Actualizar contacto existente
        this.contactService.updateContact(this.contact.id, contactData);
        savedContact = { ...this.contact, ...contactData };
      } else {
        // Crear nuevo contacto
        savedContact = this.contactService.addContact(contactData);
      }

      const toast = await this.toastController.create({
        message: this.contact ? 'Contacto actualizado exitosamente' : 'Contacto creado exitosamente',
        duration: 2000,
        color: 'success',
        position: 'top'
      });
      toast.present();

      this.contactSaved.emit(savedContact);
      this.closeForm();
    } else {
      const toast = await this.toastController.create({
        message: 'Por favor completa todos los campos requeridos',
        duration: 3000,
        color: 'warning',
        position: 'top'
      });
      toast.present();
    }
  }

  // Cerrar formulario
  closeForm() {
    this.contactForm.reset();
    this.links.clear();
    this.notes.clear();
    this.formClosed.emit();
  }

  // Confirmar cierre si hay cambios
  async confirmClose() {
    if (this.contactForm.dirty) {
      const alert = await this.alertController.create({
        header: 'Confirmar',
        message: '¿Estás seguro de que quieres cerrar? Se perderán los cambios no guardados.',
        buttons: [
          {
            text: 'Cancelar',
            role: 'cancel'
          },
          {
            text: 'Sí, cerrar',
            handler: () => this.closeForm()
          }
        ]
      });
      await alert.present();
    } else {
      this.closeForm();
    }
  }

  // Obtener icono para tipo de enlace
  getLinkIcon(type: string): string {
    const linkType = this.linkTypes.find(lt => lt.value === type);
    return linkType ? linkType.icon : 'globe';
  }
}