import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { AuthRepository } from '../data-access/repositories';
import { RequestState, requestState } from '../data-access/request-state';
import { AuthSession, Permission, SignInCredentials } from '../domain/auth.models';

@Injectable({ providedIn: 'root' })
export class AuthStore {
  private readonly repository = inject(AuthRepository);
  private initialization: Promise<void> | null = null;

  readonly state = signal<RequestState<AuthSession | null>>(requestState.idle());
  readonly session = computed(() => this.state().data);
  readonly user = computed(() => this.session()?.user ?? null);
  readonly authenticated = computed(() => this.user() !== null);
  readonly initials = computed(() =>
    (this.user()?.displayName ?? 'Guest')
      .split(/\s+/)
      .map((part) => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase(),
  );

  initialize(): Promise<void> {
    if (this.initialization) return this.initialization;
    this.state.set(requestState.loading());
    this.initialization = firstValueFrom(this.repository.getSession())
      .then((session) => this.state.set(requestState.success(session)))
      .catch((error: unknown) => this.state.set(requestState.error(error)));
    return this.initialization;
  }

  async signIn(credentials: SignInCredentials): Promise<boolean> {
    this.state.set(requestState.loading());
    try {
      const session = await firstValueFrom(this.repository.signIn(credentials));
      this.state.set(requestState.success(session));
      return true;
    } catch (error: unknown) {
      this.state.set(requestState.error(error));
      return false;
    }
  }

  async signOut(): Promise<void> {
    await firstValueFrom(this.repository.signOut());
    this.initialization = null;
    this.state.set(requestState.success(null));
  }

  hasPermission(permission: Permission): boolean {
    return this.user()?.permissions.includes(permission) ?? false;
  }
}
