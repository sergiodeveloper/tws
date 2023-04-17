import { OperationMap, Schema, Server, createServer } from '../../src/index';
import { ValidationError } from '../../src/validation';

const ACCESS_CONTROL_HEADER = 'Access-Control-Allow-Origin';

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

  test('processServerRequest', async () => {
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

    const result = await Server.processServerRequest({
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      schema,
      body: JSON.stringify(body),
      logger,
      headers: { myHeader: 'test' },
    });

    expect(result).toEqual({
      data: {
        value: 'result',
      },
    });

    expect(Server.parseRequestBody).toHaveBeenCalledWith(JSON.stringify(body), logger);
    expect(schema.execute).toHaveBeenCalledWith(body.operation, body.input, {
      headers: { myHeader: 'test' },
    });
    expect(logger.error).not.toHaveBeenCalled();
  });

  test('processServerRequest with invalid body', async () => {
    const logger = { error: jest.fn() };

    jest.spyOn(Server, 'parseRequestBody').mockImplementation(() => {
      throw new ValidationError('validationError');
    });

    const result = await Server.processServerRequest({
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      schema: {},
      body: JSON.stringify({}),
      logger,
    });

    expect(result).toEqual({
      error: 'validationError',
    });

    expect(logger.error).toHaveBeenCalledWith(
      'Failed to parse request body: Error: validationError',
    );
  });

  test('processServerRequest with unknown error in body parsing', async () => {
    const logger = { error: jest.fn() };

    jest.spyOn(Server, 'parseRequestBody').mockImplementation(() => {
      throw new Error('Error message');
    });

    const result = await Server.processServerRequest({
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      schema: {},
      body: JSON.stringify({}),
      logger,
    });

    expect(result).toEqual({
      error: 'Failed to parse request body. Check the server logs for more details',
    });

    expect(logger.error).toHaveBeenCalledWith('Failed to parse request body: Error: Error message');
  });

  test('processServerRequest with schema validation error', async () => {
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
      execute: jest.fn().mockRejectedValue(new ValidationError('Validation error')),
    };

    const logger = { error: jest.fn() };

    const result = await Server.processServerRequest({
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      schema,
      body: JSON.stringify(body),
      logger,
      headers: { myHeader: 'test' },
    });

    expect(result).toEqual({
      error: 'Validation error',
    });

    expect(Server.parseRequestBody).toHaveBeenCalledWith(JSON.stringify(body), logger);
    expect(schema.execute).toHaveBeenCalledWith(body.operation, body.input, {
      headers: { myHeader: 'test' },
    });
    expect(logger.error).toHaveBeenCalledWith(
      'Failed to execute operation "hello": Error: Validation error',
    );
  });

  test('processServerRequest with schema unknown error', async () => {
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

    const result = await Server.processServerRequest({
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      schema,
      body: JSON.stringify(body),
      logger,
      headers: { myHeader: 'test' },
    });

    expect(result).toEqual({
      error: 'Failed to execute operation. Check the server logs for more details',
    });

    expect(Server.parseRequestBody).toHaveBeenCalledWith(JSON.stringify(body), logger);
    expect(schema.execute).toHaveBeenCalledWith(body.operation, body.input, {
      headers: { myHeader: 'test' },
    });
    expect(logger.error).toHaveBeenCalledWith(
      'Failed to execute operation "hello": Error: Error message',
    );
  });

  test('processPlaygroundRequest', async () => {
    const result = Server.processPlaygroundRequest({
      schemaPath: '/schema',
      serverPath: '/server',
    });

    expect(result).toMatch(
      /^<!DOCTYPE html>.+<title>TWS Playground<\/title>.+<body>.+<script.+<\/script>.+<\/body>.+<\/html>/s,
    );
  });

  test('processSchemaRequest', async () => {
    const schema: Schema<OperationMap> = {
      operations: {
        hello: {
          input: {},
          output: {
            type: 'string',
          },
          handler: jest.fn(),
        },
      },
      execute: jest.fn(),
    };

    const result = Server.processSchemaRequest({ schema });

    expect(result).toEqual(JSON.stringify(schema, null, 0));
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

  test('createExpressServerListener', async () => {
    const schema = {
      execute: jest.fn().mockResolvedValue({
        value: 'result',
      }),
    };

    const logger = { error: jest.fn() };

    const listener = Server.createExpressServerListener({
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      schema,
      maxRequestBodyBytes: 100,
      logger,
    });

    expect(listener).toBeInstanceOf(Function);
  });

  test('createExpressServerListener handler', async () => {
    const schema = {
      execute: jest.fn().mockResolvedValue({
        value: 'result',
      }),
    };

    const logger = { error: jest.fn() };

    const listener = Server.createExpressServerListener({
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      schema,
      maxRequestBodyBytes: 100,
      logger,
      allowedOrigin: '*',
    });

    jest.spyOn(Server, 'getRequestBody').mockResolvedValue('body');

    jest.spyOn(Server, 'processServerRequest').mockResolvedValue({
      data: {
        value: 'processed result',
      },
    });

    const req = {
      on: jest.fn().mockImplementation((event, cb) => {
        cb('body');
      }),
      headers: {
        myHeader: 'test',
        listHeader: ['test1', 'test2'],
      },
    };

    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      setHeader: jest.fn().mockReturnThis(),
    };

    await listener(req, res);

    expect(Server.getRequestBody).toHaveBeenCalledWith(req, 100);
    expect(Server.processServerRequest).toHaveBeenCalledWith({
      schema,
      body: 'body',
      logger,
      headers: { myHeader: 'test', listHeader: 'test1; test2' },
    });

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.setHeader).toHaveBeenCalledWith(ACCESS_CONTROL_HEADER, '*');
    expect(res.json).toHaveBeenCalledWith({
      data: {
        value: 'processed result',
      },
    });
  });

  test('createExpressServerListener handler with error', async () => {
    const schema = {
      execute: jest.fn().mockResolvedValue({
        value: 'result',
      }),
    };

    const logger = { error: jest.fn() };

    const listener = Server.createExpressServerListener({
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      schema,
      maxRequestBodyBytes: 100,
      logger,
      allowedOrigin: '*',
    });

    jest.spyOn(Server, 'getRequestBody').mockResolvedValue('body');

    jest.spyOn(Server, 'processServerRequest').mockResolvedValue({
      error: 'error message',
    });

    const req = {
      on: jest.fn().mockImplementation((event, cb) => {
        cb('body');
      }),
      headers: {
        myHeader: 'test',
      },
    };

    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      setHeader: jest.fn().mockReturnThis(),
    };

    await listener(req, res);

    expect(Server.getRequestBody).toHaveBeenCalledWith(req, 100);
    expect(Server.processServerRequest).toHaveBeenCalledWith({
      schema,
      body: 'body',
      logger,
      headers: { myHeader: 'test' },
    });

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.setHeader).toHaveBeenCalledWith(ACCESS_CONTROL_HEADER, '*');
    expect(res.json).toHaveBeenCalledWith({
      error: 'error message',
    });
  });

  test('createExpressPlaygroundListener', async () => {
    const listener = Server.createExpressPlaygroundListener({
      allowedOrigin: '*',
      schemaPath: '/schema',
      serverPath: '/server',
    });

    expect(listener).toBeInstanceOf(Function);
  });

  test('createExpressPlaygroundListener handler', async () => {
    jest.spyOn(Server, 'processPlaygroundRequest').mockReturnValue('testHtml');

    const listener = Server.createExpressPlaygroundListener({
      allowedOrigin: '*',
      schemaPath: '/schema',
      serverPath: '/server',
    });

    const req = {
      headers: {
        myHeader: 'test',
      },
    };

    const res = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
      setHeader: jest.fn().mockReturnThis(),
    };

    listener(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.setHeader).toHaveBeenCalledWith(ACCESS_CONTROL_HEADER, '*');
    expect(res.send).toHaveBeenCalledWith('testHtml');
  });

  test('createExpressSchemaListener', async () => {
    const schema: Schema<OperationMap> = {
      operations: {},
      execute: jest.fn(),
    };

    const listener = Server.createExpressSchemaListener({ schema, allowedOrigin: '*' });

    expect(listener).toBeInstanceOf(Function);
  });

  test('createExpressSchemaListener handler', async () => {
    jest.spyOn(Server, 'processSchemaRequest').mockReturnValue('testSchema');
    const schema: Schema<OperationMap> = {
      operations: {},
      execute: jest.fn(),
    };

    const listener = Server.createExpressSchemaListener({ schema, allowedOrigin: '*' });

    const req = {
      headers: {
        myHeader: 'test',
      },
    };

    const res = {
      status: jest.fn().mockReturnThis(),
      setHeader: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
    };

    listener(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.setHeader).toHaveBeenCalledWith(ACCESS_CONTROL_HEADER, '*');
    expect(res.send).toHaveBeenCalledWith('testSchema');

    expect(Server.processSchemaRequest).toHaveBeenCalledWith({
      schema,
    });
  });

  test('createExpressOptionsListener', async () => {
    const listener = Server.createExpressOptionsListener({ allowedOrigin: '*', maxAge: 100 });

    expect(listener).toBeInstanceOf(Function);
  });

  test('createExpressOptionsListener handler', async () => {
    const listener = Server.createExpressOptionsListener({ allowedOrigin: 'test', maxAge: 100 });

    const req = {};

    const res = {
      status: jest.fn(),
      setHeader: jest.fn(),
      send: jest.fn(),
    };

    listener(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.setHeader).toHaveBeenCalledWith(ACCESS_CONTROL_HEADER, 'test');
    expect(res.setHeader).toHaveBeenCalledWith('Access-Control-Max-Age', '100');
    expect(res.send).toHaveBeenCalledWith();
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
      get: jest.fn(),
      options: jest.fn(),
    };
    jest.spyOn(Server, 'createExpressServer').mockReturnValue(
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      fakeExpress,
    );

    const fakeListener = jest.fn();
    jest.spyOn(Server, 'createExpressServerListener').mockReturnValue(fakeListener);

    const fakeListenerPlayground = jest.fn();
    jest.spyOn(Server, 'createExpressPlaygroundListener').mockReturnValue(fakeListenerPlayground);

    const fakeListenerSchema = jest.fn();
    jest.spyOn(Server, 'createExpressSchemaListener').mockReturnValue(fakeListenerSchema);

    const fakeListenerOptions = jest.fn();
    jest.spyOn(Server, 'createExpressOptionsListener').mockReturnValue(fakeListenerOptions);

    const allowedOriginsString = 'test1,test2';

    const logger = { error: jest.fn() };

    const server = createServer({
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      schema,
      logger,
      maxRequestBodyBytes: 100,
      allowedOrigins: ['test1', 'test2'],
      accessControlMaxAgeSeconds: 300,
      path: '/path',
      enablePlayground: true,
      playgroundPath: '/test',
      schemaPath: '/schema',
    });

    expect(server).toBe(fakeExpress);

    expect(fakeExpress.post).toHaveBeenCalledWith('/path', fakeListener);
    expect(fakeExpress.get).toHaveBeenCalledTimes(2);
    expect(fakeExpress.get).toHaveBeenNthCalledWith(1, '/test', fakeListenerPlayground);
    expect(fakeExpress.get).toHaveBeenNthCalledWith(2, '/schema', fakeListenerSchema);
    expect(fakeExpress.options).toHaveBeenCalledTimes(1);
    expect(fakeExpress.options).toHaveBeenNthCalledWith(1, '*', fakeListenerOptions);

    expect(Server.createExpressServerListener).toHaveBeenCalledWith({
      schema,
      maxRequestBodyBytes: 100,
      logger,
      allowedOrigin: allowedOriginsString,
    });

    expect(logger.error).not.toHaveBeenCalled();
    expect(fakeListener).not.toHaveBeenCalled();
    expect(fakeListenerPlayground).not.toHaveBeenCalled();
    expect(fakeListenerSchema).not.toHaveBeenCalled();

    expect(Server.createExpressOptionsListener).toHaveBeenCalledWith({
      allowedOrigin: allowedOriginsString,
      maxAge: 300,
    });
    expect(Server.createExpressServerListener).toHaveBeenCalledWith({
      schema,
      maxRequestBodyBytes: 100,
      logger,
      allowedOrigin: allowedOriginsString,
    });
    expect(Server.createExpressPlaygroundListener).toHaveBeenCalledWith({
      allowedOrigin: allowedOriginsString,
      schemaPath: '/schema',
      serverPath: '/path',
    });
    expect(Server.createExpressSchemaListener).toHaveBeenCalledWith({
      schema,
      allowedOrigin: allowedOriginsString,
    });
  });

  test('createServer with default values', async () => {
    const schema = {
      execute: jest.fn().mockResolvedValue({
        value: 'result',
      }),
    };

    const fakeExpress = {
      post: jest.fn(),
      get: jest.fn(),
      options: jest.fn(),
    };
    jest.spyOn(Server, 'createExpressServer').mockReturnValue(
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      fakeExpress,
    );

    const fakeListener = jest.fn();
    jest.spyOn(Server, 'createExpressServerListener').mockReturnValue(fakeListener);

    const fakeListenerPlayground = jest.fn();
    jest.spyOn(Server, 'createExpressPlaygroundListener').mockReturnValue(fakeListenerPlayground);

    const fakeListenerSchema = jest.fn();
    jest.spyOn(Server, 'createExpressSchemaListener').mockReturnValue(fakeListenerSchema);

    const fakeListenerOptions = jest.fn();
    jest.spyOn(Server, 'createExpressOptionsListener').mockReturnValue(fakeListenerOptions);

    const logger = { error: jest.fn() };

    const server = createServer({
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      schema,
      logger,
      enablePlayground: true,
    });

    expect(server).toBe(fakeExpress);

    expect(fakeExpress.post).toHaveBeenCalledWith('/tws', fakeListener);
    expect(fakeExpress.get).toHaveBeenCalledTimes(2);
    expect(fakeExpress.get).toHaveBeenNthCalledWith(1, '/tws', fakeListenerPlayground);
    expect(fakeExpress.get).toHaveBeenNthCalledWith(2, '/tws/schema', fakeListenerSchema);
    expect(fakeExpress.options).toHaveBeenCalledTimes(1);
    expect(fakeExpress.options).toHaveBeenNthCalledWith(1, '*', fakeListenerOptions);

    expect(Server.createExpressServerListener).toHaveBeenCalledWith({
      schema,
      maxRequestBodyBytes: 1000000,
      logger,
      allowedOrigin: '*',
    });

    expect(logger.error).not.toHaveBeenCalled();
    expect(fakeListener).not.toHaveBeenCalled();
    expect(fakeListenerPlayground).not.toHaveBeenCalled();
    expect(fakeListenerSchema).not.toHaveBeenCalled();

    expect(Server.createExpressOptionsListener).toHaveBeenCalledWith({
      allowedOrigin: '*',
      maxAge: 604800,
    });
    expect(Server.createExpressServerListener).toHaveBeenCalledWith({
      schema,
      maxRequestBodyBytes: 1000000,
      logger,
      allowedOrigin: '*',
    });
    expect(Server.createExpressPlaygroundListener).toHaveBeenCalledWith({
      allowedOrigin: '*',
      schemaPath: '/tws/schema',
      serverPath: '/tws',
    });
    expect(Server.createExpressSchemaListener).toHaveBeenCalledWith({
      schema,
      allowedOrigin: '*',
    });
  });

  test('constructor', async () => {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    new Server();
  });
});
