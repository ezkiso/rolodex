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
  closeCircle,
  addCircle,
  checkboxOutline
} from 'ionicons/icons';
import { Contact, ContactLink, ContactNote, ChecklistItem } from '../../models/contact.model';
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

  contactForm!: FormGroup;
  noteForm!: FormGroup;
  
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
  showReminderFields: boolean = false;

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
  }

  ngOnInit() {
    // Solo inicializar si no hay contacto (modo creación)
    if (!this.contact) {
      this.contactForm = this.initializeForm();
      this.noteForm = this.initializeNoteForm();
    }
  }

  ngOnChanges(changes: SimpleChanges) {
    // Este método se ejecuta cuando cambia el @Input() contact
    if (changes['contact']) {
      const currentContact = changes['contact'].currentValue;
      
      // Inicializar formulario vacío
      this.contactForm = this.initializeForm();
      this.noteForm = this.initializeNoteForm();
      
      // Si hay un contacto, cargar sus datos (modo edición)
      if (currentContact) {
        this.loadContactData(currentContact);
      }
    }
  }

  private loadContactData(c: Contact) {
    // Cargar datos básicos
    this.contactForm.patchValue({
      name: c.name || '',
      company: c.company || '',
      position: c.position || '',
      email: c.email || '',
      phone: c.phone || '',
      priority: c.priority || 'medium',
      tags: c.tags ? c.tags.join(', ') : '',
    });

    // Cargar enlaces
    if (c.links && c.links.length > 0) {
      const linksArray = this.contactForm.get('links') as FormArray;
      linksArray.clear(); // Limpiar primero
      
      c.links.forEach((link: ContactLink) => {
        const linkGroup = this.formBuilder.group({
          type: [link.type || 'email'],
          value: [link.value || ''],
          label: [link.label || '']
        });
        linksArray.push(linkGroup);
      });
    }

    // Cargar notas
    if (c.notes && c.notes.length > 0) {
      const notesArray = this.contactForm.get('notes') as FormArray;
      notesArray.clear(); // Limpiar primero
      
      c.notes.forEach((note: ContactNote) => {
        const noteGroup = this.formBuilder.group({
          type: [note.type || 'note'],
          text: [note.text || ''],
          reminder: [note.reminder || false],
          reminderDate: [note.reminderDate || ''],
          reminderSet: [note.reminderSet || false],
          reminderId: [note.reminderId || '']
        });
        notesArray.push(noteGroup);
      });
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
      enableReminder: [false],
      reminderDate: [''],
      reminderTime: [''],
      checklistItems: [[]]
    });
  }

  // Nuevo: estado para el input de checklist
  newChecklistItem: string = '';

  // Getters para acceder a los controles
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

  get checklistItemsControl(): FormControl {
    return this.noteForm.get('checklistItems') as FormControl;
  }

  get links() {
    return this.contactForm.get('links') as FormArray;
  }

  get notes() {
    return this.contactForm.get('notes') as FormArray;
  }

  toggleReminderFields() {
    this.showReminderFields = this.enableReminderControl.value;
    
    if (!this.showReminderFields) {
      this.reminderDateControl.reset();
      this.reminderTimeControl.reset();
    }
  }

  addChecklistItem() {
    const itemText = this.newChecklistItem.trim();
    if (itemText) {
      const currentItems = this.checklistItemsControl.value || [];
      const newItem = {
        id: Date.now().toString(),
        text: itemText,
        completed: false,
        order: currentItems.length
      };
      this.checklistItemsControl.setValue([...currentItems, newItem]);
      this.newChecklistItem = '';
    }
  }

  removeChecklistItem(itemId: string) {
    const currentItems = this.checklistItemsControl.value || [];
    this.checklistItemsControl.setValue(
      currentItems.filter((item: any) => item.id !== itemId)
    );
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
    
    // Validar que para checklist haya items
    if (noteValue.type === 'meeting-checklist' && (!noteValue.checklistItems || noteValue.checklistItems.length === 0)) {
      const toast = await this.toastController.create({
        message: 'Agrega al menos un item al checklist',
        duration: 2000,
        color: 'warning'
      });
      toast.present();
      return;
    }

    // Procesar texto para meeting-bullets
    let processedText = noteValue.text;
    if (noteValue.type === 'meeting-bullets' && processedText) {
      // Agregar guiones al inicio de cada línea si no los tiene
      const lines = processedText.split('\n');
      processedText = lines
        .map((line: string) => {
          const trimmed = line.trim();
          if (trimmed && !trimmed.startsWith('-')) {
            return '- ' + trimmed;
          }
          return trimmed;
        })
        .join('\n');
    }

    const noteId = Date.now().toString();
    let reminderDateTime = '';

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

    const newNote: any = {
      text: processedText,
      date: new Date().toISOString(),
      created: noteId,
      type: noteValue.type,
      reminder: shouldSetReminder,
      reminderDate: reminderDateTime,
      reminderId: shouldSetReminder ? noteId : undefined,
      reminderSet: shouldSetReminder
    };

    // Agregar checklist si es del tipo checklist
    if (noteValue.type === 'meeting-checklist') {
      newNote.checklistItems = noteValue.checklistItems || [];
    }

    const noteGroup = this.formBuilder.group({
      text: [newNote.text, Validators.required],
      type: [newNote.type, Validators.required],
      reminder: [newNote.reminder],
      reminderDate: [newNote.reminderDate],
      reminderSet: [newNote.reminderSet],
      checklistItems: [newNote.checklistItems || []]
    });
    this.notes.push(noteGroup);

    this.noteForm.reset({
      type: 'note',
      text: '',
      enableReminder: false,
      reminderDate: '',
      reminderTime: '',
      checklistItems: []
    });
    this.newChecklistItem = '';
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

      try {
        let savedContact: Contact;

        if (this.contact) {
          // updateContact devuelve boolean
          await this.contactService.updateContact(this.contact.id, contactData);
          // Construir el contacto actualizado manualmente
          savedContact = { 
            ...this.contact, 
            ...contactData 
          } as Contact;
        } else {
          // addContact devuelve Contact
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
      } catch (error) {
        console.error('Error al guardar contacto:', error);
        const toast = await this.toastController.create({
          message: 'Error al guardar el contacto. Por favor intenta nuevamente.',
          duration: 3000,
          color: 'danger',
          position: 'top'
        });
        toast.present();
      }
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