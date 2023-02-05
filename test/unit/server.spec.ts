import { Server, createServer } from '../../src/index';

describe('Server', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('parseRequestBody', async () => {
    const logger = {
      error: jest.fn(),
    };

    const body = JSON.stringify({
      operation: 'hello',
      input: {
        name: 'world',
      },
    });

    const { operation, input } = Server.parseRequestBody(body, logger);

    expect(operation).toBe('hello');
    expect(input).toEqual({
      name: 'world',
    });
  });

  test('parseRequestBody with empty body', async () => {
    const logger = {
      error: jest.fn(),
    };

    const body = '';

    expect(() => Server.parseRequestBody(body, logger)).toThrowError('No request body provided');
  });

  test('parseRequestBody with invalid body', async () => {
    const logger = {
      error: jest.fn(),
    };

    const body = 'invalid';

    expect(() => Server.parseRequestBody(body, logger)).toThrowError(
      'Failed to parse request body, check if it is valid JSON',
    );
  });

  test('parseRequestBody with missing operation', async () => {
    const logger = {
      error: jest.fn(),
    };

    const body = JSON.stringify({
      input: {
        name: 'world',
      },
    });

    expect(() => Server.parseRequestBody(body, logger)).toThrowError('No operation provided');
  });

  test('parseRequestBody with missing input', async () => {
    const logger = {
      error: jest.fn(),
    };

    const body = JSON.stringify({
      operation: 'hello',
    });

    expect(() => Server.parseRequestBody(body, logger)).toThrowError('No input provided');
  });

  test('processPostRequest', async () => {
    const body = {
      operation: 'hello',
      input: {
        name: 'world',
      },
    };

    jest.spyOn(Server, 'parseRequestBody').mockImplementation(
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      () => body,
    );

    const schema = {
      execute: jest.fn().mockResolvedValue({
        value: 'result',
      }),
    };

    const logger = { error: jest.fn() };

    const result = await Server.processPostRequest({
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      schema,
      body: JSON.stringify(body),
      logger,
    });

    expect(result).toEqual({
      data: {
        value: 'result',
      },
    });

    expect(Server.parseRequestBody).toHaveBeenCalledWith(JSON.stringify(body), logger);
    expect(schema.execute).toHaveBeenCalledWith(body.operation, body.input);
    expect(logger.error).not.toHaveBeenCalled();
  });

  test('processPostRequest with invalid body', async () => {
    const logger = { error: jest.fn() };

    jest.spyOn(Server, 'parseRequestBody').mockImplementation(() => {
      throw new Error('Error message');
    });

    const result = await Server.processPostRequest({
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      schema: {},
      body: JSON.stringify({}),
      logger,
    });

    expect(result).toEqual({
      error: 'Failed to parse request body: Error: Error message',
    });

    expect(logger.error).not.toHaveBeenCalled();
  });

  test('processPostRequest with schema error', async () => {
    const body = {
      operation: 'hello',
      input: {
        name: 'world',
      },
    };

    jest.spyOn(Server, 'parseRequestBody').mockImplementation(
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      () => body,
    );

    const schema = {
      execute: jest.fn().mockRejectedValue(new Error('Error message')),
    };

    const logger = { error: jest.fn() };

    const result = await Server.processPostRequest({
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      schema,
      body: JSON.stringify(body),
      logger,
    });

    expect(result).toEqual({
      error: 'Failed to execute operation, please check your request body',
    });

    expect(Server.parseRequestBody).toHaveBeenCalledWith(JSON.stringify(body), logger);
    expect(schema.execute).toHaveBeenCalledWith(body.operation, body.input);
    expect(logger.error).toHaveBeenCalledWith(
      'Failed to execute operation "hello": Error: Error message',
    );
  });

  test('getRequestBody', async () => {
    const body = 'body';

    const req = {
      on: jest.fn().mockImplementation((event, cb) => {
        cb(body);
      }),
    };

    const result = await Server.getRequestBody(req, 100);

    expect(result).toBe(body);
  });

  test('getRequestBody with body too large', async () => {
    const req = {
      on: jest.fn().mockImplementation((event, cb) => {
        cb('body');
      }),
    };

    expect(() => Server.getRequestBody(req, 1)).rejects.toThrowError('Request body is too large');
  });

  test('createExpressEndpointListener', async () => {
    const schema = {
      execute: jest.fn().mockResolvedValue({
        value: 'result',
      }),
    };

    const logger = { error: jest.fn() };

    const listener = Server.createExpressEndpointListener({
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      schema,
      maxRequestBodyBytes: 100,
      logger,
    });

    expect(listener).toBeInstanceOf(Function);
  });

  test('createExpressEndpointListener handler', async () => {
    const schema = {
      execute: jest.fn().mockResolvedValue({
        value: 'result',
      }),
    };

    const logger = { error: jest.fn() };

    const listener = Server.createExpressEndpointListener({
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      schema,
      maxRequestBodyBytes: 100,
      logger,
    });

    jest.spyOn(Server, 'getRequestBody').mockResolvedValue('body');

    jest.spyOn(Server, 'processPostRequest').mockResolvedValue({
      data: {
        value: 'processed result',
      },
    });

    const req = {
      on: jest.fn().mockImplementation((event, cb) => {
        cb('body');
      }),
    };

    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    await listener(req, res);

    expect(Server.getRequestBody).toHaveBeenCalledWith(req, 100);
    expect(Server.processPostRequest).toHaveBeenCalledWith({
      schema,
      body: 'body',
      logger,
    });

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      data: {
        value: 'processed result',
      },
    });
  });

  test('createExpressEndpointListener handler with error', async () => {
    const schema = {
      execute: jest.fn().mockResolvedValue({
        value: 'result',
      }),
    };

    const logger = { error: jest.fn() };

    const listener = Server.createExpressEndpointListener({
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      schema,
      maxRequestBodyBytes: 100,
      logger,
    });

    jest.spyOn(Server, 'getRequestBody').mockResolvedValue('body');

    jest.spyOn(Server, 'processPostRequest').mockResolvedValue({
      error: 'error message',
    });

    const req = {
      on: jest.fn().mockImplementation((event, cb) => {
        cb('body');
      }),
    };

    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    await listener(req, res);

    expect(Server.getRequestBody).toHaveBeenCalledWith(req, 100);
    expect(Server.processPostRequest).toHaveBeenCalledWith({
      schema,
      body: 'body',
      logger,
    });

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: 'error message',
    });
  });

  test('createExpressServer', async () => {
    const app = Server.createExpressServer();

    expect(app).toBeInstanceOf(Function);
  });

  test('createServer', async () => {
    const schema = {
      execute: jest.fn().mockResolvedValue({
        value: 'result',
      }),
    };

    const fakeExpress = {
      post: jest.fn(),
    };
    jest.spyOn(Server, 'createExpressServer').mockReturnValue(
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      fakeExpress,
    );

    const fakeListener = jest.fn();
    jest.spyOn(Server, 'createExpressEndpointListener').mockReturnValue(fakeListener);

    const logger = { error: jest.fn() };

    const server = createServer({
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      schema,
      logger,
      maxRequestBodyBytes: 100,
      endpoint: '/endpoint',
    });

    expect(server).toBe(fakeExpress);

    expect(fakeExpress.post).toHaveBeenCalledWith('/endpoint', fakeListener);

    expect(Server.createExpressEndpointListener).toHaveBeenCalledWith({
      schema,
      maxRequestBodyBytes: 100,
      logger,
    });

    expect(logger.error).not.toHaveBeenCalled();
    expect(fakeListener).not.toHaveBeenCalled();
  });

  test('createServer with default values', async () => {
    const schema = {
      execute: jest.fn().mockResolvedValue({
        value: 'result',
      }),
    };

    const fakeExpress = {
      post: jest.fn(),
    };
    jest.spyOn(Server, 'createExpressServer').mockReturnValue(
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      fakeExpress,
    );

    const fakeListener = jest.fn();
    jest.spyOn(Server, 'createExpressEndpointListener').mockReturnValue(fakeListener);

    const logger = { error: jest.fn() };

    const server = createServer({
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      schema,
      logger,
    });

    expect(server).toBe(fakeExpress);

    expect(fakeExpress.post).toHaveBeenCalledWith('/tws', fakeListener);

    expect(Server.createExpressEndpointListener).toHaveBeenCalledWith({
      schema,
      maxRequestBodyBytes: 1000000,
      logger,
    });

    expect(logger.error).not.toHaveBeenCalled();
    expect(fakeListener).not.toHaveBeenCalled();
  });

  test('constructor', async () => {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    new Server();
  });
});
