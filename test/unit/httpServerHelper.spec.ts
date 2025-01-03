import { EventMap, HTTPServerHelper, OperationMap, Schema, Server } from '../../src/index';

const ACCESS_CONTROL_HEADER = 'Access-Control-Allow-Origin';

describe('Server', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('getRequestBody successfully', async () => {
    const body = 'body';

    const req = {
      on: jest.fn().mockImplementation((event, cb) => {
        cb(body);
      }),
    };

    const result = await HTTPServerHelper.getRequestBody({
      request: req,
      maxBodyBytes: 100,
    });

    expect(result).toBe(body);
  });

  test('getRequestBody with body too large', async () => {
    const req = {
      on: jest.fn().mockImplementation((event, cb) => {
        cb('body');
      }),
    };

    await expect(
      HTTPServerHelper.getRequestBody({
        request: req,
        maxBodyBytes: 1,
      }),
    ).rejects.toThrowErrorMatchingInlineSnapshot('"Request body is too large"');
  });

  test('createExpressServerListener', async () => {
    const schema = {
      execute: jest.fn().mockResolvedValue({
        value: 'result',
      }),
    };

    const logger = { error: jest.fn() };

    const listener = HTTPServerHelper.createExpressServerListener({
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      schema,
      maxRequestBodyBytes: 100,
      logger,
      allowedOrigin: '*',
    });

    expect(listener).toBeInstanceOf(Function);
  });

  test('createExpressServerListener handler', async () => {
    const schema = {
      execute: jest.fn().mockResolvedValue({
        value: 'result',
      }),
      executeClientRequest: jest.fn().mockResolvedValue({
        data: {
          value: 'processed result',
        },
      }),
    };

    const logger = { error: jest.fn() };

    const listener = HTTPServerHelper.createExpressServerListener({
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      schema,
      maxRequestBodyBytes: 100,
      logger,
      allowedOrigin: '*',
    });

    jest.spyOn(HTTPServerHelper, 'getRequestBody').mockResolvedValue('body');

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

    expect(HTTPServerHelper.getRequestBody).toHaveBeenCalledWith({
      request: req,
      maxBodyBytes: 100,
    });
    expect(schema.executeClientRequest).toHaveBeenCalledWith({
      body: 'body',
      externalHeaders: { myHeader: 'test', listHeader: 'test1; test2' },
    });

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.setHeader).toHaveBeenCalledWith(ACCESS_CONTROL_HEADER, '*');
    expect(res.json).toHaveBeenCalledWith({
      data: {
        value: 'processed result',
      },
    });
  });

  test('createExpressServerListener handler with body too large', async () => {
    const schema = {
      execute: jest.fn().mockResolvedValue({
        value: 'result',
      }),
    };

    const logger = { error: jest.fn() };

    jest.spyOn(HTTPServerHelper, 'getRequestBody').mockRejectedValue(new Error('testError'));

    const listener = HTTPServerHelper.createExpressServerListener({
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      schema,
      maxRequestBodyBytes: 1,
      logger,
      allowedOrigin: '*',
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

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      errors: ['Failed to read request body', 'Error: testError'],
    });
  });

  test('createExpressServerListener handler with execution error', async () => {
    const schema = {
      execute: jest.fn().mockResolvedValue({
        value: 'result',
      }),
      executeClientRequest: jest.fn().mockResolvedValue({
        errors: ['error message'],
      }),
    };

    const logger = { error: jest.fn() };

    const listener = HTTPServerHelper.createExpressServerListener({
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      schema,
      maxRequestBodyBytes: 100,
      logger,
      allowedOrigin: '*',
    });

    jest.spyOn(HTTPServerHelper, 'getRequestBody').mockResolvedValue('body');

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

    expect(HTTPServerHelper.getRequestBody).toHaveBeenCalledWith({
      request: req,
      maxBodyBytes: 100,
    });
    expect(schema.executeClientRequest).toHaveBeenCalledWith({
      body: 'body',
      externalHeaders: { myHeader: 'test' },
    });

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.setHeader).toHaveBeenCalledWith(ACCESS_CONTROL_HEADER, '*');
    expect(res.json).toHaveBeenCalledWith({
      errors: ['error message'],
    });
  });

  test('createExpressPlaygroundListener successfully', async () => {
    const listener = HTTPServerHelper.createExpressPlaygroundListener({
      allowedOrigin: '*',
      schemaPath: '/schema',
      serverPath: '/server',
    });

    expect(listener).toBeInstanceOf(Function);
  });

  test('createExpressPlaygroundListener handler', async () => {
    jest.spyOn(Server, 'processPlaygroundRequest').mockReturnValue('testHtml');

    const listener = HTTPServerHelper.createExpressPlaygroundListener({
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

  test('createExpressSchemaListener successfully', async () => {
    const schema: Schema<OperationMap, EventMap> = {
      operations: {},
      execute: jest.fn(),
    } as never;

    const listener = HTTPServerHelper.createExpressSchemaListener({ schema, allowedOrigin: '*' });

    expect(listener).toBeInstanceOf(Function);
  });

  test('createExpressSchemaListener handler', async () => {
    jest.spyOn(Server, 'processSchemaRequest').mockReturnValue('testSchema');
    const schema: Schema<OperationMap, EventMap> = {
      operations: {},
      execute: jest.fn(),
    } as never;

    const listener = HTTPServerHelper.createExpressSchemaListener({ schema, allowedOrigin: '*' });

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

  test('createExpressOptionsListener successfully', async () => {
    const listener = HTTPServerHelper.createExpressOptionsListener({
      allowedOrigin: '*',
      maxAge: 100,
    });

    expect(listener).toBeInstanceOf(Function);
  });

  test('createExpressOptionsListener handler', async () => {
    const listener = HTTPServerHelper.createExpressOptionsListener({
      allowedOrigin: 'test',
      maxAge: 100,
    });

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

  test('createEmptyExpressServer', async () => {
    const app = HTTPServerHelper.createEmptyExpressServer();

    expect(app).toBeInstanceOf(Function);
  });

  test('create successfully', async () => {
    const schema = {
      execute: jest.fn().mockResolvedValue({
        value: 'result',
      }),
      enablePlayground: true,
      enableSchema: true,
    };

    const fakeServer = {
      on: jest.fn().mockImplementation((_, cb) => cb()),
    };

    const fakeExpress = {
      listen: jest.fn().mockReturnValue(fakeServer),
      post: jest.fn(),
      get: jest.fn(),
      options: jest.fn(),
    };
    jest.spyOn(HTTPServerHelper, 'createEmptyExpressServer').mockReturnValue(
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      fakeExpress,
    );

    const fakeListener = jest.fn();
    jest.spyOn(HTTPServerHelper, 'createExpressServerListener').mockReturnValue(fakeListener);

    const fakeListenerPlayground = jest.fn();
    jest
      .spyOn(HTTPServerHelper, 'createExpressPlaygroundListener')
      .mockReturnValue(fakeListenerPlayground);

    const fakeListenerSchema = jest.fn();
    jest.spyOn(HTTPServerHelper, 'createExpressSchemaListener').mockReturnValue(fakeListenerSchema);

    const fakeListenerOptions = jest.fn();
    jest
      .spyOn(HTTPServerHelper, 'createExpressOptionsListener')
      .mockReturnValue(fakeListenerOptions);

    const logger = { error: jest.fn() };

    const server = await HTTPServerHelper.create({
      port: 2345,
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      schema,
      logger,
      maxRequestBodyBytes: 100,
      allowedOrigin: 'test2',
      accessControlMaxAgeSeconds: 300,
      path: '/path',
      enablePlayground: true,
      playgroundPath: '/test',
      schemaPath: '/schema',
    });

    expect(server.url).toBe('http://localhost:2345');
    expect(server.app).toBe(fakeExpress);
    expect(server.server).toBe(fakeServer);
    expect(server.stop).toBeInstanceOf(Function);

    expect(fakeExpress.post).toHaveBeenCalledWith('/path', fakeListener);
    expect(fakeExpress.get).toHaveBeenCalledTimes(2);
    expect(fakeExpress.get).toHaveBeenNthCalledWith(1, '/test', fakeListenerPlayground);
    expect(fakeExpress.get).toHaveBeenNthCalledWith(2, '/schema', fakeListenerSchema);
    expect(fakeExpress.options).toHaveBeenCalledTimes(1);
    expect(fakeExpress.options).toHaveBeenNthCalledWith(1, '*', fakeListenerOptions);
    expect(fakeExpress.listen).toHaveBeenCalledWith(2345);

    expect(HTTPServerHelper.createExpressServerListener).toHaveBeenCalledWith({
      schema,
      maxRequestBodyBytes: 100,
      allowedOrigin: 'test2',
    });

    expect(logger.error).not.toHaveBeenCalled();
    expect(fakeListener).not.toHaveBeenCalled();
    expect(fakeListenerPlayground).not.toHaveBeenCalled();
    expect(fakeListenerSchema).not.toHaveBeenCalled();

    expect(HTTPServerHelper.createExpressOptionsListener).toHaveBeenCalledWith({
      allowedOrigin: 'test2',
      maxAge: 300,
    });
    expect(HTTPServerHelper.createExpressServerListener).toHaveBeenCalledWith({
      schema,
      maxRequestBodyBytes: 100,
      allowedOrigin: 'test2',
    });
    expect(HTTPServerHelper.createExpressPlaygroundListener).toHaveBeenCalledWith({
      allowedOrigin: 'test2',
      schemaPath: '/schema',
      serverPath: '/path',
    });
    expect(HTTPServerHelper.createExpressSchemaListener).toHaveBeenCalledWith({
      schema,
      allowedOrigin: 'test2',
    });
  });

  test('create with default values', async () => {
    const schema = {
      execute: jest.fn().mockResolvedValue({
        value: 'result',
      }),
      enablePlayground: true,
      enableSchema: true,
    };

    const fakeServer = {
      on: jest.fn().mockImplementation((_, cb) => cb()),
    };

    const fakeExpress = {
      listen: jest.fn().mockReturnValue(fakeServer),
      post: jest.fn(),
      get: jest.fn(),
      options: jest.fn(),
    };
    jest.spyOn(HTTPServerHelper, 'createEmptyExpressServer').mockReturnValue(
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      fakeExpress,
    );

    const fakeListener = jest.fn();
    jest.spyOn(HTTPServerHelper, 'createExpressServerListener').mockReturnValue(fakeListener);

    const fakeListenerPlayground = jest.fn();
    jest
      .spyOn(HTTPServerHelper, 'createExpressPlaygroundListener')
      .mockReturnValue(fakeListenerPlayground);

    const fakeListenerSchema = jest.fn();
    jest.spyOn(HTTPServerHelper, 'createExpressSchemaListener').mockReturnValue(fakeListenerSchema);

    const fakeListenerOptions = jest.fn();
    jest
      .spyOn(HTTPServerHelper, 'createExpressOptionsListener')
      .mockReturnValue(fakeListenerOptions);

    const logger = { error: jest.fn() };

    const server = await HTTPServerHelper.create({
      port: 2345,
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      schema,
      logger,
      enablePlayground: true,
    });

    expect(server.url).toBe('http://localhost:2345');
    expect(server.app).toBe(fakeExpress);
    expect(server.server).toBe(fakeServer);
    expect(server.stop).toBeInstanceOf(Function);

    expect(fakeExpress.post).toHaveBeenCalledWith('/tws', fakeListener);
    expect(fakeExpress.get).toHaveBeenCalledTimes(2);
    expect(fakeExpress.get).toHaveBeenNthCalledWith(1, '/tws', fakeListenerPlayground);
    expect(fakeExpress.get).toHaveBeenNthCalledWith(2, '/tws/schema', fakeListenerSchema);
    expect(fakeExpress.options).toHaveBeenCalledTimes(1);
    expect(fakeExpress.options).toHaveBeenNthCalledWith(1, '*', fakeListenerOptions);
    expect(fakeExpress.listen).toHaveBeenCalledWith(2345);
    expect(fakeServer.on).toHaveBeenCalledWith('listening', expect.any(Function));

    expect(HTTPServerHelper.createExpressServerListener).toHaveBeenCalledWith({
      schema,
      maxRequestBodyBytes: 1000000,
      allowedOrigin: '*',
    });

    expect(logger.error).not.toHaveBeenCalled();
    expect(fakeListener).not.toHaveBeenCalled();
    expect(fakeListenerPlayground).not.toHaveBeenCalled();
    expect(fakeListenerSchema).not.toHaveBeenCalled();

    expect(HTTPServerHelper.createExpressOptionsListener).toHaveBeenCalledWith({
      allowedOrigin: '*',
      maxAge: 604800,
    });
    expect(HTTPServerHelper.createExpressServerListener).toHaveBeenCalledWith({
      schema,
      maxRequestBodyBytes: 1000000,
      allowedOrigin: '*',
    });
    expect(HTTPServerHelper.createExpressPlaygroundListener).toHaveBeenCalledWith({
      allowedOrigin: '*',
      schemaPath: '/tws/schema',
      serverPath: '/tws',
    });
    expect(HTTPServerHelper.createExpressSchemaListener).toHaveBeenCalledWith({
      schema,
      allowedOrigin: '*',
    });
  });
});
