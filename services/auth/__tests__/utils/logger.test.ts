import { logger, LogLevel } from '../../src/utils/logger';

describe('logger', () => {
  let stdoutSpy: jest.SpyInstance;
  let stderrSpy: jest.SpyInstance;

  beforeEach(() => {
    stdoutSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    stderrSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('info() should write to stdout (console.log)', () => {
    logger.info('test message');

    expect(stdoutSpy).toHaveBeenCalledTimes(1);
    expect(stderrSpy).not.toHaveBeenCalled();
  });

  it('warn() should write to stdout (console.log)', () => {
    logger.warn('test warning');

    expect(stdoutSpy).toHaveBeenCalledTimes(1);
    expect(stderrSpy).not.toHaveBeenCalled();
  });

  it('debug() should write to stdout (console.log)', () => {
    logger.debug('test debug');

    expect(stdoutSpy).toHaveBeenCalledTimes(1);
    expect(stderrSpy).not.toHaveBeenCalled();
  });

  it('error() should write to stderr (console.error)', () => {
    logger.error('something broke');

    expect(stderrSpy).toHaveBeenCalledTimes(1);
    expect(stdoutSpy).not.toHaveBeenCalled();
  });

  it('should output valid JSON on every call', () => {
    logger.info('json check');

    const raw = stdoutSpy.mock.calls[0][0] as string;
    expect(() => JSON.parse(raw)).not.toThrow();
  });

  it('should include service, level, message, and timestamp fields', () => {
    logger.info('structure check');

    const payload = JSON.parse(stdoutSpy.mock.calls[0][0] as string);
    expect(payload).toMatchObject({
      service: expect.any(String),
      level: 'info',
      message: 'structure check',
      timestamp: expect.any(String),
    });
  });

  it('should embed the correct level for each log method', () => {
    const cases: Array<[keyof typeof logger, LogLevel]> = [
      ['info', 'info'],
      ['warn', 'warn'],
      ['debug', 'debug'],
    ];

    cases.forEach(([method, expectedLevel]) => {
      jest.clearAllMocks();
      logger[method]('level test');
      const payload = JSON.parse(stdoutSpy.mock.calls[0][0] as string);
      expect(payload.level).toBe(expectedLevel);
    });
  });

  it('error() should embed level "error" in the JSON payload', () => {
    logger.error('error level check');

    const payload = JSON.parse(stderrSpy.mock.calls[0][0] as string);
    expect(payload.level).toBe('error');
  });

  it('timestamp should be a valid ISO 8601 string', () => {
    logger.info('timestamp check');

    const payload = JSON.parse(stdoutSpy.mock.calls[0][0] as string);
    const date = new Date(payload.timestamp);
    expect(date.toISOString()).toBe(payload.timestamp);
  });

  it('should include meta in the payload when provided', () => {
    const meta = { userId: 'u-123', action: 'login' };
    logger.info('with meta', meta);

    const payload = JSON.parse(stdoutSpy.mock.calls[0][0] as string);
    expect(payload.meta).toEqual(meta);
  });

  it('should not include a meta field when none is provided', () => {
    logger.info('no meta');

    const payload = JSON.parse(stdoutSpy.mock.calls[0][0] as string);
    expect(payload).not.toHaveProperty('meta');
  });

  it('should handle meta containing nested objects', () => {
    const meta = { error: { code: 500, details: { reason: 'db timeout' } } };
    logger.error('nested meta', meta);

    const payload = JSON.parse(stderrSpy.mock.calls[0][0] as string);
    expect(payload.meta.error.details.reason).toBe('db timeout');
  });
});
