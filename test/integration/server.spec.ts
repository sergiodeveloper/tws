import { Operation, Schema, Server, createServer } from '../../src/index';

const PARSE_BODY_JSON_ERROR = 'Failed to parse request body, check if it is valid JSON';

function fakeExpressRequest(
  data: string,
  chunkSize: number,
  headers: Record<string, string | string[]> = {},
) {
  let onDataCallback: (data: string) => void;
  let onEndCallback: () => void;

  return {
    on: jest.fn((event, cb) => {
      if (event === 'data') {
        onDataCallback = cb;
      } else if (event === 'end') {
        onEndCallback = cb;

        setTimeout(() => {
          const chunks = data.match(new RegExp(`.{1,${chunkSize}}`, 'g'));
          if (chunks) {
            chunks.forEach((chunk) => {
              onDataCallback(chunk);
            });
          }

          onEndCallback();
        }, 0);
      } else {
        throw new Error(`Unexpected event: ${event}`);
      }
    }),
    headers,
  };
}

function fakeExpressResponse() {
  return {
    status: jest.fn(),
    json: jest.fn(),
    setHeader: jest.fn(),
    send: jest.fn(),
  };
}

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
    expect(() => Server.parseRequestBody('', { error: errorLogger })).toThrowError(
      'No request body provided',
    );

    expect(errorLogger).toHaveBeenCalledTimes(1);
    expect(errorLogger.mock.calls[0][0]).toEqual('No request body provided');
  });

  test('not parse invalid body', async () => {
    const errorLogger = jest.fn();
    expect(() => Server.parseRequestBody('invalid', { error: errorLogger })).toThrowError(
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
    expect(() => Server.parseRequestBody(body, { error: errorLogger })).toThrowError(
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
    expect(() => Server.parseRequestBody(body, { error: errorLogger })).toThrowError(
      'No input provided',
    );

    expect(errorLogger).toHaveBeenCalledTimes(1);
    expect(errorLogger.mock.calls[0][0]).toEqual('No input provided in request body');
  });

  test('process post request', async () => {
    const schema = new Schema({
      sayHello: new Operation({
        description: 'Say hello',
        input: {
          name: {
            type: 'string',
            description: 'Name of the person',
          },
          active: {
            type: 'boolean',
          },
          type: {
            type: 'enum',
            values: { admin: {}, member: {} },
          },
        },
        output: { type: 'string' },
        handler: async ({ name }) => {
          return `Hello ${name}`;
        },
      }),
    });

    const errorLogger = jest.fn();
    const result = await Server.processServerRequest({
      schema,
      body: JSON.stringify({
        operation: 'sayHello',
        input: {
          name: 'John',
          active: true,
          type: 'admin',
        },
      }),
      logger: {
        error: errorLogger,
      },
      headers: {},
    });

    expect(result).toEqual({
      data: 'Hello John',
    });

    expect(errorLogger).not.toHaveBeenCalled();
  });

  test('process post request with invalid body', async () => {
    const schema = new Schema({
      getBoolean: new Operation({
        description: 'Get boolean',
        input: {},
        output: { type: 'boolean' },
        handler: async () => true,
      }),
    });

    const errorLogger = jest.fn();
    const result = await Server.processServerRequest({
      schema,
      body: 'invalidBody',
      logger: {
        error: errorLogger,
      },
      headers: {},
    });

    expect(result).toEqual({
      error: PARSE_BODY_JSON_ERROR,
    });

    expect(errorLogger).toHaveBeenCalledTimes(2);
    expect(errorLogger).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('Failed to parse request body: SyntaxError: Unexpected token'),
    );
    expect(errorLogger).toHaveBeenNthCalledWith(
      2,
      'Failed to parse request body: Error: Failed to parse request body, check if it is valid JSON',
    );
  });

  test('process post request with unexpected error on parse body', async () => {
    jest.spyOn(Server, 'parseRequestBody').mockImplementation(() => {
      throw new Error('TestError');
    });

    const schema = new Schema({
      getBoolean: new Operation({
        description: 'Get a boolean',
        input: {},
        output: { type: 'boolean' },
        handler: async () => true,
      }),
    });

    const errorLogger = jest.fn();
    const result = await Server.processServerRequest({
      schema,
      body: 'invalid body',
      logger: {
        error: errorLogger,
      },
      headers: {},
    });

    expect(result).toEqual({
      error: 'Failed to parse request body. Check the server logs for more details',
    });

    expect(errorLogger).toHaveBeenCalledTimes(1);
    expect(errorLogger).toHaveBeenNthCalledWith(
      1,
      'Failed to parse request body: Error: TestError',
    );
  });

  test('process post request with inexistent operation', async () => {
    const schema = new Schema({
      getBoolean: new Operation({
        input: {},
        output: { type: 'boolean' },
        handler: () => true,
      }),
    });

    const errorLogger = jest.fn();
    const result = await Server.processServerRequest({
      schema,
      body: JSON.stringify({
        operation: 'inexistentOperation',
        input: {},
      }),
      logger: {
        error: errorLogger,
      },
      headers: {},
    });

    expect(result).toEqual({
      error: 'Operation "inexistentOperation" not found',
    });

    expect(errorLogger).toHaveBeenCalledTimes(1);
    expect(errorLogger).toHaveBeenNthCalledWith(
      1,
      'Failed to execute operation "inexistentOperation": Error: Operation "inexistentOperation" not found',
    );
  });

  test('process post request failing to resolve', async () => {
    const schema = new Schema({
      getBoolean: new Operation({
        description: 'Get a boolean',
        input: {},
        output: { type: 'boolean' },
        handler: async () => {
          throw new Error('Failed to get boolean');
        },
      }),
    });

    const errorLogger = jest.fn();
    const result = await Server.processServerRequest({
      schema,
      body: JSON.stringify({
        operation: 'getBoolean',
        input: {},
      }),
      logger: {
        error: errorLogger,
      },
      headers: {},
    });

    expect(result).toEqual({
      error: 'Failed to execute operation. Check the server logs for more details',
    });

    expect(errorLogger).toHaveBeenCalledTimes(1);
    expect(errorLogger).toHaveBeenNthCalledWith(
      1,
      'Failed to execute operation "getBoolean": Error: Failed to get boolean',
    );
  });

  test('get request body from express request', async () => {
    const data = 'a'.repeat(100);

    const req = fakeExpressRequest(data, 2);

    const result = await Server.getRequestBody(req, 100);

    expect(result).toEqual(data);
  });

  test('get request body with content too large', async () => {
    const data = 'a'.repeat(101);

    const req = fakeExpressRequest(data, 2);

    await expect(Server.getRequestBody(req, 100)).rejects.toThrowError('Request body is too large');
  });

  test('call express server listener', async () => {
    const schema = new Schema({
      getNumber: new Operation({
        description: 'Number',
        input: {},
        output: { type: 'int' },
        handler: async () => 5,
      }),
    });

    const listener = Server.createExpressServerListener({
      schema,
      maxRequestBodyBytes: 100,
      allowedOrigin: '*',
      logger: {
        error: jest.fn(),
      },
    });

    const req = fakeExpressRequest(
      JSON.stringify({
        operation: 'getNumber',
        input: {},
      }),
      2,
      { 'content-type': 'application/json', 'set-cookie': ['a=1', 'b=2'] },
    );

    const res = fakeExpressResponse();

    await listener(req, res);

    expect(res.status).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledTimes(1);
    expect(res.json).toHaveBeenCalledWith({
      data: 5,
    });
  });

  test('call express server listener with invalid body', async () => {
    const schema = new Schema({
      getString: new Operation({
        description: 'Get a string',
        input: {},
        output: { type: 'string' },
        handler: async () => 'test',
      }),
    });

    const errorLogger = jest.fn();
    const listener = Server.createExpressServerListener({
      schema,
      maxRequestBodyBytes: 100,
      allowedOrigin: '*',
      logger: {
        error: errorLogger,
      },
    });

    const req = fakeExpressRequest('invalid body', 2);

    const res = fakeExpressResponse();

    await listener(req, res);

    expect(res.status).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledTimes(1);
    expect(res.json).toHaveBeenCalledWith({
      error: PARSE_BODY_JSON_ERROR,
    });

    expect(errorLogger).toHaveBeenCalledTimes(2);
    expect(errorLogger).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('Failed to parse request body: SyntaxError: Unexpected token'),
    );
    expect(errorLogger).toHaveBeenNthCalledWith(
      2,
      'Failed to parse request body: Error: Failed to parse request body, check if it is valid JSON',
    );
  });

  test('call express playground listener', async () => {
    const listener = Server.createExpressPlaygroundListener({
      allowedOrigin: '*',
      serverPath: '/server',
      schemaPath: '/schema',
    });

    const req = fakeExpressRequest('', 10);

    const res = fakeExpressResponse();

    listener(req, res);

    expect(res.status).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledTimes(0);
    expect(res.send).toHaveBeenCalledTimes(1);
    expect(res.send).toHaveBeenCalledWith(
      expect.stringMatching(
        /^<!doctype html>.+<title>TWS Playground<\/title>.+<body>.+<div.+<\/div>.+<\/body>.+<\/html>/s,
      ),
    );
  });

  test('call express schema listener', async () => {
    const schema = new Schema({
      getNumber: new Operation({
        description: 'Get float',
        input: {},
        output: { type: 'float' },
        handler: async () => 5,
      }),
    });

    const listener = Server.createExpressSchemaListener({ schema, allowedOrigin: '*' });

    const req = fakeExpressRequest('', 10);

    const res = fakeExpressResponse();

    listener(req, res);

    expect(res.status).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledTimes(0);
    expect(res.send).toHaveBeenCalledTimes(1);
    expect(res.send).toHaveBeenCalledWith(
      JSON.stringify({
        operations: {
          getNumber: {
            description: 'Get float',
            input: {},
            output: {
              type: 'float',
            },
          },
        },
      }),
    );
  });

  test('call express options listener', async () => {
    const listener = Server.createExpressOptionsListener({ allowedOrigin: '*', maxAge: 1000 });

    const req = fakeExpressRequest('', 10);

    const res = fakeExpressResponse();

    listener(req, res);

    expect(res.status).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.setHeader).toHaveBeenCalledTimes(4);
    expect(res.send).toHaveBeenCalledTimes(1);
    expect(res.send).toHaveBeenCalledWith();
  });

  test('create an express server', async () => {
    const schema = new Schema({
      getNumber: new Operation({
        description: 'Get a number',
        input: {},
        output: { type: 'float' },
        handler: async () => 5,
      }),
    });

    const server = createServer({
      schema,
      logger: {
        error: jest.fn(),
      },
      enablePlayground: true,
    });

    expect(typeof server).toEqual('function');
    expect(typeof server.get).toEqual('function');
    expect(typeof server.post).toEqual('function');
    expect(typeof server.use).toEqual('function');
    expect(typeof server.listen).toEqual('function');
  });

  test('create an express server with custom attributes', async () => {
    const schema = new Schema({
      getNumber: new Operation({
        description: 'Get a number',
        input: {},
        output: { type: 'int' },
        handler: async () => 5,
      }),
    });

    const server = createServer({
      schema,
      logger: {
        error: jest.fn(),
      },
      path: '/custom',
      allowedOrigins: ['test1', 'test2'],
      maxRequestBodyBytes: 100,
      accessControlMaxAgeSeconds: 30,
      enablePlayground: true,
      playgroundPath: '/custom-playground',
      schemaPath: '/custom-schema',
    });

    expect(typeof server).toEqual('function');
    expect(typeof server.get).toEqual('function');
    expect(typeof server.post).toEqual('function');
    expect(typeof server.use).toEqual('function');
    expect(typeof server.listen).toEqual('function');
  });

  test('constructor', async () => {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    new Server();
  });
});
