export type RuntimeEnvironment = 'development' | 'test' | 'production';

export interface ApiEnvironment {
  readonly NODE_ENV: RuntimeEnvironment;
  readonly PORT: number;
  readonly CORS_ORIGINS: string;
  readonly DATABASE_URL: string;
}

export function validateEnvironment(
  input: Record<string, unknown>,
): ApiEnvironment {
  const nodeEnvironment = readString(input, 'NODE_ENV', 'development');
  if (!['development', 'test', 'production'].includes(nodeEnvironment)) {
    throw new Error('NODE_ENV must be development, test or production.');
  }

  const port = Number(input['PORT'] ?? 3000);
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error('PORT must be an integer between 1 and 65535.');
  }

  const corsOrigins = readString(
    input,
    'CORS_ORIGINS',
    'http://localhost:4200',
  );
  const origins = corsOrigins
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  if (!origins.length || origins.some((origin) => !isHttpOrigin(origin))) {
    throw new Error(
      'CORS_ORIGINS must contain comma-separated HTTP(S) origins.',
    );
  }
  const databaseUrl = readString(
    input,
    'DATABASE_URL',
    nodeEnvironment === 'production'
      ? ''
      : 'postgresql://webillify:webillify_local@localhost:5433/webillify?schema=public',
  );
  if (!databaseUrl.startsWith('postgresql://')) {
    throw new Error(
      'DATABASE_URL must be an explicit PostgreSQL connection URL.',
    );
  }

  return {
    NODE_ENV: nodeEnvironment as RuntimeEnvironment,
    PORT: port,
    CORS_ORIGINS: origins.join(','),
    DATABASE_URL: databaseUrl,
  };
}

function readString(
  input: Record<string, unknown>,
  key: string,
  fallback: string,
): string {
  const value = input[key];
  if (value === undefined) return fallback;
  if (typeof value !== 'string') throw new Error(`${key} must be a string.`);
  return value;
}

function isHttpOrigin(value: string): boolean {
  try {
    const url = new URL(value);
    return (
      (url.protocol === 'http:' || url.protocol === 'https:') &&
      url.origin === value
    );
  } catch {
    return false;
  }
}
