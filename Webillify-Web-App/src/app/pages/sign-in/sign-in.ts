import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthStore } from '../../core/auth/auth.store';
import { Icon } from '../../shared/icon';

@Component({
  selector: 'app-sign-in-page',
  imports: [ReactiveFormsModule, RouterLink, Icon],
  templateUrl: './sign-in.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SignInPage {
  private readonly auth = inject(AuthStore);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly passwordVisible = signal(false);
  readonly authState = this.auth.state;
  readonly form = new FormGroup({
    email: new FormControl('owner@webillify.demo', {
      nonNullable: true,
      validators: [Validators.required, Validators.email],
    }),
    password: new FormControl('webillify', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(6)],
    }),
    remember: new FormControl(true, { nonNullable: true }),
  });

  async submit(): Promise<void> {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;
    const signedIn = await this.auth.signIn(this.form.getRawValue());
    if (!signedIn) return;
    const redirect = this.route.snapshot.queryParamMap.get('redirect');
    await this.router.navigateByUrl(
      redirect?.startsWith('/') && !redirect.startsWith('//') ? redirect : '/dashboard',
    );
  }
}
