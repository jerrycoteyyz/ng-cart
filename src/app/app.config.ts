import { ApplicationConfig } from '@angular/core';
import {
  provideRouter,
  withPreloading,
  PreloadAllModules,
  withComponentInputBinding,  // lets router params bind directly to @Input
} from '@angular/router';
import {
  provideHttpClient,
  withInterceptors,
  withFetch,                  // use Fetch API instead of XmlHttpRequest (Angular 17+)
} from '@angular/common/http';
import { routes } from './app.routes';
import { authInterceptor } from './core/auth.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(
      routes,
      // PreloadAllModules: after the app loads, silently fetch all lazy chunks
      // in the background. Users get fast initial load AND fast subsequent navs.
      withPreloading(PreloadAllModules),
      withComponentInputBinding(),
    ),
    provideHttpClient(
      withFetch(),
      withInterceptors([authInterceptor]),
    ),
    // Add other app-wide providers here:
    // provideAnimations(),
    // { provide: API_BASE_URL, useValue: environment.apiUrl },
  ],
};