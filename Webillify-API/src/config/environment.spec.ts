import { validateEnvironment } from './environment';

describe('validateEnvironment', () => {
  it('applies safe development defaults', () => {
    expect(validateEnvironment({})).toEqual({
      NODE_ENV: 'development',
      PORT: 3000,
      CORS_ORIGINS: 'http://localhost:4200',
      DATABASE_URL:
        'postgresql://webillify:webillify_local@localhost:5433/webillify?schema=public',
    });
  });

  it('rejects invalid ports and CORS origins', () => {
    expect(() => validateEnvironment({ PORT: '70000' })).toThrow('PORT');
    expect(() => validateEnvironment({ CORS_ORIGINS: '*' })).toThrow(
      'CORS_ORIGINS',
    );
    expect(() => validateEnvironment({ NODE_ENV: 'production' })).toThrow(
      'DATABASE_URL',
    );
  });
});
