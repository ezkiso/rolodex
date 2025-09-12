export interface ContactNote {
  text: string;
  date: string;
  created: string;
  type: 'note' | 'meeting';
  reminder?: boolean;
}

export interface ContactLink {
  type: 'email' | 'phone' | 'linkedin' | 'twitter' | 'website';
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