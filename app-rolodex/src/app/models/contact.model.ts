export interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
  order: number;
}

export interface ContactNote {
  text: string;
  date: string;
  created: string;
  checklistItems?: ChecklistItem[];
  type: 'note' | 'meeting';
  reminder?: boolean;
  reminderDate?: string;       // Fecha y hora del recordatorio
  reminderId?: string;         // ID único para el recordatorio
  reminderSet?: boolean;       // Si el recordatorio está activo
}

export interface ContactLink {
  type: 'email' | 'phone' | 'linkedin' | 'facebook' | 'instagram' | 'website';
  value: string;
  label?: string;
}

export interface Contact {
  id: string;
  name: string;
  company?: string;
  position?: string;
  email?: string;
  phone?: string;
  links: ContactLink[];
  notes: ContactNote[];
  tags: string[];
  dateCreated: string;
  lastInteraction: string;
  priority: 'low' | 'medium' | 'high';
}