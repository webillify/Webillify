import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { APP_ENVIRONMENT } from '../provide-data-access';
import { ApiSessionStore } from './api-session';

export const apiSessionInterceptor: HttpInterceptorFn = (request, next) => {
  const environment = inject(APP_ENVIRONMENT);
  const session = inject(ApiSessionStore);
  if (!request.url.startsWith(environment.apiBaseUrl)) return next(request);

  const headers: Record<string, string> = {};
  if (session.accessToken) headers['Authorization'] = `Bearer ${session.accessToken}`;
  if (session.organizationId) headers['X-Organization-Id'] = session.organizationId;
  return next(request.clone({ setHeaders: headers, withCredentials: true }));
};
