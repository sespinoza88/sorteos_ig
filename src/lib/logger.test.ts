import { logger } from './logger';

describe('logger', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('redacts OAuth secrets from structured logs', () => {
    const info = jest.spyOn(console, 'info').mockImplementation(() => {});

    logger.info('auth.callback', {
      accessToken: 'access-secret',
      callbackUrl: 'https://app.example/auth?token=url-secret',
      errorMessage: 'exchange failed with code=code-secret',
    });

    const output = String(info.mock.calls[0][0]);
    expect(output).not.toContain('access-secret');
    expect(output).not.toContain('url-secret');
    expect(output).not.toContain('code-secret');
    expect(output).toContain('[redacted]');
  });
});
