import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ConfirmationOutlet } from './shared/feedback/confirmation';
import { ToastOutlet } from './shared/feedback/toast';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ToastOutlet, ConfirmationOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {}
