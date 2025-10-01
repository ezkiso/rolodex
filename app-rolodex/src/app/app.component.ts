
import { IonApp, IonRouterOutlet } from '@ionic/angular/standalone';
import { DatabaseService } from './services/database.service';
import { AppSettingsService } from './services/app-settings.service';
import { ContactsSyncService } from './services/contacts-sync.service';
import { Component, OnInit } from '@angular/core';
@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  imports: [IonApp, IonRouterOutlet],
})
export class AppComponent implements OnInit {
  constructor(
    private db: DatabaseService,
    private settings: AppSettingsService,
    private contactsSync: ContactsSyncService
  ) {}

  async ngOnInit() {
    try {
      // Inicializar la base de datos
      await this.db.open();
      console.log('Base de datos inicializada correctamente');
      
      // Verificar y solicitar permisos de contactos
      await this.contactsSync.checkAndRequestPermissionsOnStartup();
      
    } catch (error) {
      console.error('Error inicializando la aplicación:', error);
    }
  }
}