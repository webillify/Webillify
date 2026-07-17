import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export type IconName =
  | 'dashboard'
  | 'pos'
  | 'box'
  | 'users'
  | 'cart'
  | 'chart'
  | 'settings'
  | 'search'
  | 'bell'
  | 'menu'
  | 'close'
  | 'plus'
  | 'minus'
  | 'trash'
  | 'sparkles'
  | 'arrow'
  | 'calendar'
  | 'store'
  | 'rupee'
  | 'receipt'
  | 'warning'
  | 'check'
  | 'logout'
  | 'chevron';

@Component({
  selector: 'app-icon',
  template: `
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.8"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      @switch (name()) {
        @case ('dashboard') {
          <path d="M4 13h6V4H4v9Zm0 7h6v-4H4v4Zm10 0h6v-9h-6v9Zm0-16v4h6V4h-6Z" />
        }
        @case ('pos') {
          <path d="M4 4h16v12H4zM7 20h10M9 16v4M15 16v4M8 8h5M8 12h2" />
        }
        @case ('box') {
          <path d="m21 8-9 5-9-5 9-5 9 5ZM3 8v8l9 5 9-5V8M12 13v8" />
        }
        @case ('users') {
          <path
            d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"
          />
        }
        @case ('cart') {
          <path
            d="M3 3h2l2.4 11.2a2 2 0 0 0 2 1.6h7.9a2 2 0 0 0 2-1.6L21 7H6M10 21a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM19 21a1 1 0 1 1-2 0 1 1 0 0 1 2 0Z"
          />
        }
        @case ('chart') {
          <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
        }
        @case ('settings') {
          <circle cx="12" cy="12" r="3" />
          <path
            d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1a1.7 1.7 0 0 0 1.9.3A1.7 1.7 0 0 0 10 3v-.2h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9A1.7 1.7 0 0 0 21 10h.2v4H21a1.7 1.7 0 0 0-1.6 1Z"
          />
        }
        @case ('search') {
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-4-4" />
        }
        @case ('bell') {
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9ZM10 21h4" />
        }
        @case ('menu') {
          <path d="M4 6h16M4 12h16M4 18h16" />
        }
        @case ('close') {
          <path d="m6 6 12 12M18 6 6 18" />
        }
        @case ('plus') {
          <path d="M12 5v14M5 12h14" />
        }
        @case ('minus') {
          <path d="M5 12h14" />
        }
        @case ('trash') {
          <path d="M3 6h18M8 6V4h8v2M19 6l-1 15H6L5 6M10 11v6M14 11v6" />
        }
        @case ('sparkles') {
          <path
            d="m12 3 1.2 3.8L17 8l-3.8 1.2L12 13l-1.2-3.8L7 8l3.8-1.2L12 3ZM19 14l.7 2.3L22 17l-2.3.7L19 20l-.7-2.3L16 17l2.3-.7L19 14ZM5 13l.8 2.2L8 16l-2.2.8L5 19l-.8-2.2L2 16l2.2-.8L5 13Z"
          />
        }
        @case ('arrow') {
          <path d="M5 12h14M13 6l6 6-6 6" />
        }
        @case ('calendar') {
          <rect x="3" y="5" width="18" height="16" rx="2" />
          <path d="M16 3v4M8 3v4M3 10h18" />
        }
        @case ('store') {
          <path d="M3 10h18l-2-6H5l-2 6ZM5 10v10h14V10M9 20v-6h6v6" />
        }
        @case ('rupee') {
          <path d="M7 5h10M7 9h10M8 5c6 0 6 8 0 8h-1l9 7" />
        }
        @case ('receipt') {
          <path d="M5 3h14v19l-3-2-2 2-2-2-2 2-2-2-3 2V3ZM8 8h8M8 12h8M8 16h5" />
        }
        @case ('warning') {
          <path d="M12 3 2 21h20L12 3ZM12 9v5M12 18h.01" />
        }
        @case ('check') {
          <path d="m5 12 4 4L19 6" />
        }
        @case ('logout') {
          <path d="M10 17l5-5-5-5M15 12H3M14 4h5a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-5" />
        }
        @case ('chevron') {
          <path d="m9 18 6-6-6-6" />
        }
      }
    </svg>
  `,
  host: { class: 'icon' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Icon {
  readonly name = input.required<IconName>();
}
