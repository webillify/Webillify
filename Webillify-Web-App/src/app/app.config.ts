import { ApplicationConfig, isDevMode, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideServiceWorker } from '@angular/service-worker';
import { environment } from '../environments/environment';

import { routes } from './app.routes';
import { provideDataAccess } from './core/data-access/provide-data-access';
import { apiSessionInterceptor } from './core/data-access/api/api-session.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(withInterceptors([apiSessionInterceptor])),
    provideDataAccess(environment),
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000',
    }),
  ],
};
