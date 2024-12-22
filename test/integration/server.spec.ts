import { Server } from '../../src/index';

const PARSE_BODY_JSON_ERROR = 'Failed to parse request body, check if it is valid JSON';

describe('Server', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('parse request body', async () => {
    const body = JSON.stringify({
      operation: 'test',
      input: {
        foo: 'bar',
      },
    });

    const errorLogger = jest.fn();

    const result = Server.parseRequestBody(body, { error: errorLogger });

    expect(result).toEqual({
      operation: 'test',
      input: {
        foo: 'bar',
      },
    });

    expect(errorLogger).not.toHaveBeenCalled();
  });

  test('not parse empty body', async () => {
    const errorLogger = jest.fn();
    expect(() => Server.parseRequestBody('', { error: errorLogger })).toThrow(
      'No request body provided',
    );

    expect(errorLogger).toHaveBeenCalledTimes(1);
    expect(errorLogger.mock.calls[0][0]).toEqual('No request body provided');
  });

  test('not parse invalid body', async () => {
    const errorLogger = jest.fn();
    expect(() => Server.parseRequestBody('invalid', { error: errorLogger })).toThrow(
      PARSE_BODY_JSON_ERROR,
    );

    expect(errorLogger).toHaveBeenCalledTimes(1);
    expect(errorLogger.mock.calls[0][0]).toMatch(/^Failed to parse request body: /);
  });

  test('not parse body without operation', async () => {
    const body = JSON.stringify({
      input: {
        foo: 'bar',
      },
    });

    const errorLogger = jest.fn();
    expect(() => Server.parseRequestBody(body, { error: errorLogger })).toThrow(
      'No operation provided',
    );

    expect(errorLogger).toHaveBeenCalledTimes(1);
    expect(errorLogger.mock.calls[0][0]).toEqual('No operation provided in request body');
  });

  test('not parse body without input', async () => {
    const body = JSON.stringify({
      operation: 'test',
    });

    const errorLogger = jest.fn();
    expect(() => Server.parseRequestBody(body, { error: errorLogger })).toThrow(
      'No input provided',
    );

    expect(errorLogger).toHaveBeenCalledTimes(1);
    expect(errorLogger.mock.calls[0][0]).toEqual('No input provided in request body');
  });

  test('constructor', async () => {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    new Server();
  });
});
