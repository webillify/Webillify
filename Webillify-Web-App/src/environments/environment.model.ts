export type DataMode = 'mock' | 'api';

export interface AppEnvironment {
  readonly production: boolean;
  readonly dataMode: DataMode;
  readonly apiBaseUrl: string;
}
