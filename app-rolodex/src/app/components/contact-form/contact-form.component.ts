import { NotificationService } from '../../services/notification.service';
import { Component, OnInit, Input, Output, EventEmitter, SimpleChanges, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormArray, FormControl } from '@angular/forms';
import { FormsModule } from '@angular/forms';
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
  IonGrid,
  IonRow,
  IonCol,
  AlertController,
  ToastController,
  IonDatetime,
  IonToggle
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
  logoFacebook,
  logoInstagram,
  closeCircle
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
    FormsModule,
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
    IonGrid,
    IonRow,
    IonCol,
    IonDatetime,
    IonToggle
  ]
})
export class ContactFormComponent implements OnInit, OnChanges {
  @Input() contact: Contact | null = null;
  @Input() isVisible: boolean = false;
  @Output() formClosed = new EventEmitter<void>();
  @Output() contactSaved = new EventEmitter<Contact>();

  contactForm: FormGroup;
  noteForm: FormGroup;
  priorityOptions = [
    { value: 'low', label: 'Baja' },
    { value: 'medium', label: 'Media' },
    { value: 'high', label: 'Alta' }
  ];

  linkTypes = [
    { value: 'email', label: 'Email', icon: 'mail' },
    { value: 'phone', label: 'Teléfono', icon: 'call' },
    { value: 'linkedin', label: 'LinkedIn', icon: 'logo-linkedin' },
    { value: 'facebook', label: 'Facebook', icon: 'logo-facebook' },
    { value: 'instagram', label: 'Instagram', icon: 'logo-instagram' },
    { value: 'website', label: 'Sitio Web', icon: 'globe' }
  ];

  today: string = new Date().toISOString();
  showReminderFields: boolean = false; // Controla si mostrar campos de recordatorio

  constructor(
    private notificationService: NotificationService,
    private formBuilder: FormBuilder,
    private contactService: ContactService,
    private alertController: AlertController,
    private toastController: ToastController
  ) {
    addIcons({ 
      save, 
      close, 
      add, 
      trash,
      mail,
      call,
      globe,
      logoLinkedin,
      logoFacebook,
      logoInstagram,
      closeCircle
    });

    this.contactForm = this.initializeForm();
    this.noteForm = this.initializeNoteForm();
  }

  ngOnInit() {
    this.contactForm = this.initializeForm();
    this.noteForm = this.initializeNoteForm();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['contact'] && changes['contact'].currentValue) {
      this.contactForm = this.initializeForm();

      const c = changes['contact'].currentValue;
      this.contactForm.patchValue({
        name: c.name,
        company: c.company,
        position: c.position,
        email: c.email,
        phone: c.phone,
        priority: c.priority,
        tags: c.tags ? c.tags.join(', ') : '',
      });

      if (c.links && c.links.length > 0) {
        const linksFG = c.links.map((link: ContactLink) =>
          this.formBuilder.group({
            type: [link.type],
            value: [link.value],
            label: [link.label || '']
          })
        );
        const linksFA = this.formBuilder.array(linksFG);
        this.contactForm.setControl('links', linksFA);
      }

      if (c.notes && c.notes.length > 0) {
        const notesFG = c.notes.map((note: ContactNote) =>
          this.formBuilder.group({
            type: [note.type],
            text: [note.text],
            reminder: [note.reminder || false],
            reminderDate: [note.reminderDate || ''],
            reminderSet: [note.reminderSet || false]
          })
        );
        const notesFA = this.formBuilder.array(notesFG);
        this.contactForm.setControl('notes', notesFA);
      }
    }
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

  private initializeNoteForm(): FormGroup {
    return this.formBuilder.group({
      type: ['note'],
      text: ['', Validators.required],
      enableReminder: [false], // Toggle para activar recordatorio
      reminderDate: [''],
      reminderTime: ['']
    });
  }

  // Getters para acceder a los controles de forma segura
  get noteTypeControl(): FormControl {
    return this.noteForm.get('type') as FormControl;
  }

  get noteTextControl(): FormControl {
    return this.noteForm.get('text') as FormControl;
  }

  get enableReminderControl(): FormControl {
    return this.noteForm.get('enableReminder') as FormControl;
  }

  get reminderDateControl(): FormControl {
    return this.noteForm.get('reminderDate') as FormControl;
  }

  get reminderTimeControl(): FormControl {
    return this.noteForm.get('reminderTime') as FormControl;
  }

  get links() {
    return this.contactForm.get('links') as FormArray;
  }

  get notes() {
    return this.contactForm.get('notes') as FormArray;
  }

  // Toggle para mostrar/ocultar campos de recordatorio
  toggleReminderFields() {
    this.showReminderFields = this.enableReminderControl.value;
    
    // Si se desactiva el recordatorio, limpiar los campos
    if (!this.showReminderFields) {
      this.reminderDateControl.reset();
      this.reminderTimeControl.reset();
    }
  }

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

  addNote(existingNote?: ContactNote) {
    const noteGroup = this.formBuilder.group({
      text: [existingNote?.text || '', Validators.required],
      type: [existingNote?.type || 'note', Validators.required],
      reminder: [existingNote?.reminder || false],
      reminderDate: [existingNote?.reminderDate || ''],
      reminderSet: [existingNote?.reminderSet || false]
    });
    this.notes.push(noteGroup);
  }

  removeNote(index: number) {
    this.notes.removeAt(index);
  }

  // Método público para usar en el template
  combineDateTimePublic(date: string, time: string): Date {
    if (!date || !time) return new Date();
    
    const dateObj = new Date(date);
    const timeObj = new Date(time);
    
    dateObj.setHours(timeObj.getHours());
    dateObj.setMinutes(timeObj.getMinutes());
    dateObj.setSeconds(0);
    
    return dateObj;
  }

  async addNewNote() {
    if (this.noteForm.invalid) {
      const toast = await this.toastController.create({
        message: 'Por favor escribe una nota primero',
        duration: 2000,
        color: 'warning'
      });
      toast.present();
      return;
    }

    const noteValue = this.noteForm.value;
    const noteId = Date.now().toString();
    let reminderDateTime = '';

    // Solo programar recordatorio si está activado y tiene fecha/hora
    const shouldSetReminder = noteValue.enableReminder && 
                             noteValue.reminderDate && 
                             noteValue.reminderTime;

    if (shouldSetReminder) {
      const reminderDate = this.combineDateTimePublic(noteValue.reminderDate, noteValue.reminderTime);
      
      if (reminderDate <= new Date()) {
        const toast = await this.toastController.create({
          message: 'Por favor selecciona una fecha y hora futura',
          duration: 3000,
          color: 'danger'
        });
        toast.present();
        return;
      }

      reminderDateTime = reminderDate.toISOString();

      const success = await this.notificationService.scheduleReunionReminder(
        this.contact?.name || 'Contacto',
        noteValue.text,
        reminderDate,
        noteId
      );

      if (!success) {
        const toast = await this.toastController.create({
          message: 'No se concedieron permisos para notificaciones',
          duration: 3000,
          color: 'warning'
        });
        toast.present();
      }
    }

    const newNote: ContactNote = {
      text: noteValue.text,
      date: new Date().toISOString(),
      created: noteId,
      type: noteValue.type,
      reminder: shouldSetReminder,
      reminderDate: reminderDateTime,
      reminderId: shouldSetReminder ? noteId : undefined,
      reminderSet: shouldSetReminder
    };

    const noteGroup = this.formBuilder.group({
      text: [newNote.text, Validators.required],
      type: [newNote.type, Validators.required],
      reminder: [newNote.reminder],
      reminderDate: [newNote.reminderDate],
      reminderSet: [newNote.reminderSet]
    });
    this.notes.push(noteGroup);

    // Resetear formulario de nota
    this.noteForm.reset({
      type: 'note',
      text: '',
      enableReminder: false,
      reminderDate: '',
      reminderTime: ''
    });
    this.showReminderFields = false;

    const toast = await this.toastController.create({
      message: 'Nota agregada correctamente' + (newNote.reminder ? ' con recordatorio' : ''),
      duration: 2000,
      color: 'success'
    });
    toast.present();
  }

  async cancelReminder(noteIndex: number) {
    const noteGroup = this.notes.at(noteIndex);
    const noteValue = noteGroup.value;
    
    if (noteValue.reminderId && noteValue.reminderSet) {
      await this.notificationService.cancelReunionReminder(noteValue.reminderId);
      
      noteGroup.patchValue({
        reminderSet: false,
        reminder: false,
        reminderDate: ''
      });

      const toast = await this.toastController.create({
        message: 'Recordatorio cancelado',
        duration: 2000,
        color: 'success'
      });
      toast.present();
    }
  }

  formatReminderDate(dateString: string): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleString('es-CL', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  validateLink(type: string, value: string): boolean {
    if (!value) return true;
    
    switch (type) {
      case 'email':
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
      case 'phone':
        return /^[\+]?[1-9][\d\s\-\(\)]{0,15}$/.test(value.replace(/\s/g, ''));
      case 'linkedin':
        return value.includes('linkedin.com/');
      case 'facebook':
        return value.includes('facebook.com/') || value.includes('fb.com/');
      case 'instagram':
        return value.includes('instagram.com/') || value.startsWith('@');
      case 'website':
        return /^https?:\/\//.test(value) || /^www\./.test(value);
      default:
        return true;
    }
  }

  getLinkLabel(type: string): string {
    const found = this.linkTypes.find(lt => lt.value === type);
    return found ? found.label : 'enlace';
  }

  private processTags(tagsString: string): string[] {
    if (!tagsString) return [];
    return tagsString
      .split(',')
      .map(tag => tag.trim())
      .filter(tag => tag.length > 0);
  }

  async saveContact() {
    if (this.contactForm.valid) {
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
        name: formValue.name || '',
        company: formValue.company || '',
        position: formValue.position || '',
        email: formValue.email || '',
        phone: formValue.phone || '',
        priority: formValue.priority || 'medium',
        tags: this.processTags(formValue.tags),
        links: formValue.links || [],
        notes: formValue.notes.map((note: any) => ({
          text: note.text || '',
          type: note.type || 'note',
          date: new Date().toISOString(),
          created: note.created || new Date().toISOString(),
          reminder: note.reminder || false,
          reminderDate: note.reminderDate || '',
          reminderSet: note.reminderSet || false,
          reminderId: note.reminderId || ''
        })),
        lastInteraction: new Date().toISOString()
      } as Omit<Contact, 'id' | 'dateCreated'>;

      let savedContact: Contact;

      if (this.contact) {
        this.contactService.updateContact(this.contact.id, contactData);
        savedContact = { ...this.contact, ...contactData } as Contact;
      } else {
        savedContact = await this.contactService.addContact(contactData);

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

  closeForm() {
    this.contactForm.reset();
    this.noteForm.reset({
      type: 'note',
      text: '',
      enableReminder: false,
      reminderDate: '',
      reminderTime: ''
    });
    this.showReminderFields = false;
    this.links.clear();
    this.notes.clear();
    this.formClosed.emit();
  }

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

  getLinkIcon(type: string): string {
    const linkType = this.linkTypes.find(lt => lt.value === type);
    return linkType ? linkType.icon : 'globe';
  }

  isMeetingWithReminder(note: any): boolean {
    return note.type === 'meeting' && note.reminderSet && note.reminderDate;
  }
}