import { TestBed } from '@angular/core/testing';
import { AuthRepository } from '../data-access/repositories';
import { MockAuthRepository } from '../data-access/mock/mock.repositories';
import { AuthStore } from './auth.store';

describe('AuthStore', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [AuthStore, { provide: AuthRepository, useClass: MockAuthRepository }],
    });
  });

  afterEach(() => {
    localStorage.clear();
    TestBed.resetTestingModule();
  });

  it('initializes unauthenticated and denies permissions by default', async () => {
    const store = TestBed.inject(AuthStore);
    await store.initialize();

    expect(store.authenticated()).toBe(false);
    expect(store.hasPermission('dashboard.read')).toBe(false);
  });

  it('signs in, exposes typed permissions, persists, and signs out', async () => {
    const store = TestBed.inject(AuthStore);
    const signedIn = await store.signIn({
      email: 'owner@webillify.demo',
      password: 'webillify',
      remember: true,
    });

    expect(signedIn).toBe(true);
    expect(store.authenticated()).toBe(true);
    expect(store.hasPermission('settings.manage')).toBe(true);
    expect(localStorage.getItem('webillify.demo.session')).toBeTruthy();

    await store.signOut();
    expect(store.authenticated()).toBe(false);
    expect(localStorage.getItem('webillify.demo.session')).toBeNull();
  });

  it('keeps the user unauthenticated after invalid credentials', async () => {
    const store = TestBed.inject(AuthStore);
    const signedIn = await store.signIn({
      email: 'owner@webillify.demo',
      password: 'incorrect',
      remember: false,
    });

    expect(signedIn).toBe(false);
    expect(store.state().status).toBe('error');
    expect(store.authenticated()).toBe(false);
  });
});
