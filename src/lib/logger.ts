type LogContext = Record<string, unknown>;

const SECRET_KEYS = /token|secret|password|authorization|access.?token|code|state/i;
let currentPlatform = 'unknown';

function sanitize(value: unknown, key = ''): unknown {
  if (SECRET_KEYS.test(key)) return '[redacted]';
  if (value instanceof Error) {
    return {
      name: value.name,
      message: sanitize(value.message),
      stack: value.stack ? sanitize(value.stack) : undefined,
    };
  }
  if (typeof value === 'string') {
    const redacted = value.replace(
      /([?&\s](?:access_token|refresh_token|client_secret|token|code|state|authorization)=)[^&\s]*/gi,
      '$1[redacted]',
    );
    try {
      const url = new URL(redacted);
      if (url.search || url.hash) {
        url.search = '';
        url.hash = '';
        return url.toString();
      }
    } catch {
      return redacted;
    }
    return redacted;
  }
  if (Array.isArray(value)) return value.map((item) => sanitize(item));
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([entryKey, entryValue]) => [entryKey, sanitize(entryValue, entryKey)]),
    );
  }
  return value;
}

function write(level: 'info' | 'warn' | 'error', event: string, context: LogContext = {}) {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    event,
    platform: currentPlatform,
    context: sanitize(context),
  };
  const output = JSON.stringify(entry);
  if (level === 'error') console.error(output);
  else if (level === 'warn') console.warn(output);
  else console.info(output);
}

export const logger = {
  info: (event: string, context?: LogContext) => write('info', event, context),
  warn: (event: string, context?: LogContext) => write('warn', event, context),
  error: (event: string, context?: LogContext) => write('error', event, context),
};

export function setLogPlatform(platform: string): void {
  currentPlatform = platform;
}

export function errorContext(error: unknown): LogContext {
  if (error instanceof Error) {
    return { errorName: error.name, errorMessage: error.message, stack: error.stack };
  }
  return { error };
}
