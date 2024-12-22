import { HTTPServer, Operation, Schema, Server } from '../../src/index';

const PARSE_BODY_JSON_ERROR = 'Failed to parse client message, check if it is a valid JSON';

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

    const handler = HTTPServer.createExpressServerListener({
      schema,
      maxRequestBodyBytes: 1024,
      allowedOrigin: 'testOrigin',
    });

    const fakeResponse = fakeExpressResponse();

    await handler(
      fakeExpressRequest(
        JSON.stringify({
          operation: 'sayHello',
          input: {
            name: 'John',
            active: true,
            type: 'admin',
          },
        }),
        1024,
      ),
      fakeResponse,
    );

    expect(fakeResponse.status).toHaveBeenCalledTimes(1);
    expect(fakeResponse.status).toHaveBeenCalledWith(200);
    expect(fakeResponse.json).toHaveBeenCalledTimes(1);
    expect(fakeResponse.json).toHaveBeenCalledWith({
      data: 'Hello John',
    });

    expect(errorLogger).not.toHaveBeenCalled();
  });

  test('process post request with invalid body', async () => {
    const schema = new Schema(
      {
        getBoolean: new Operation({
          description: 'Get boolean',
          input: {},
          output: { type: 'boolean' },
          handler: async () => true,
        }),
      },
      {
        logger: {
          error: jest.fn(),
        },
      },
    );

    const handler = HTTPServer.createExpressServerListener({
      schema,
      maxRequestBodyBytes: 1024,
      allowedOrigin: 'testOrigin',
    });

    const fakeResponse = fakeExpressResponse();

    await handler(fakeExpressRequest('invalidBody', 1024), fakeResponse);

    expect(fakeResponse.status).toHaveBeenCalledTimes(1);
    expect(fakeResponse.status).toHaveBeenCalledWith(400);
    expect(fakeResponse.json).toHaveBeenCalledTimes(1);

    expect(fakeResponse.json).toHaveBeenCalledWith({
      data: undefined,
      errors: [PARSE_BODY_JSON_ERROR],
    });

    expect(schema.logger?.error).toHaveBeenCalledTimes(1);
    expect(schema.logger?.error).toHaveBeenNthCalledWith(
      1,
      'Failed to parse client message: Failed to parse client message, ' +
        'check if it is a valid JSON',
    );
  });

  test('process post request with unexpected error on parse body', async () => {
    jest.spyOn(Server, 'parseRequestBody').mockImplementation(() => {
      throw new Error('TestError');
    });

    const schema = new Schema(
      {
        getBoolean: new Operation({
          description: 'Get a boolean',
          input: {},
          output: { type: 'boolean' },
          handler: async () => true,
        }),
      },
      {
        logger: {
          error: jest.fn(),
        },
      },
    );

    const handler = HTTPServer.createExpressServerListener({
      schema,
      maxRequestBodyBytes: 1024,
      allowedOrigin: 'testOrigin',
    });

    const fakeResponse = fakeExpressResponse();

    await handler(fakeExpressRequest('invalidBody', 1024), fakeResponse);

    expect(fakeResponse.status).toHaveBeenCalledTimes(1);
    expect(fakeResponse.status).toHaveBeenCalledWith(400);
    expect(fakeResponse.json).toHaveBeenCalledTimes(1);
    expect(fakeResponse.json).toHaveBeenCalledWith({
      data: undefined,
      errors: ['Failed to parse client message, check if it is a valid JSON'],
    });

    expect(schema.logger?.error).toHaveBeenCalledTimes(1);
    expect(schema.logger?.error).toHaveBeenNthCalledWith(
      1,
      'Failed to parse client message: Failed to parse client message, check if it is a valid JSON',
    );
  });

  test('process post request with inexistent operation', async () => {
    const schema = new Schema(
      {
        getBoolean: new Operation({
          input: {},
          output: { type: 'boolean' },
          handler: () => true,
        }),
      },
      {
        logger: {
          error: jest.fn(),
        },
      },
    );

    const handler = HTTPServer.createExpressServerListener({
      schema,
      maxRequestBodyBytes: 1024,
      allowedOrigin: 'testOrigin',
    });

    const fakeResponse = fakeExpressResponse();

    await handler(
      fakeExpressRequest(
        JSON.stringify({
          operation: 'inexistentOperation',
          input: {},
        }),
        1024,
      ),
      fakeResponse,
    );

    expect(fakeResponse.status).toHaveBeenCalledTimes(1);
    expect(fakeResponse.status).toHaveBeenCalledWith(400);
    expect(fakeResponse.json).toHaveBeenCalledTimes(1);

    expect(fakeResponse.json).toHaveBeenCalledWith({
      data: undefined,
      errors: [
        'Failed to execute operation "inexistentOperation"',
        'Operation "inexistentOperation" not found',
      ],
    });

    expect(schema.logger?.error).toHaveBeenCalledTimes(1);
    expect(schema.logger?.error).toHaveBeenNthCalledWith(
      1,
      'Failed to execute operation "inexistentOperation": Operation ' +
        '"inexistentOperation" not found',
    );
  });

  test('process post request failing to resolve', async () => {
    const schema = new Schema(
      {
        getBoolean: new Operation({
          description: 'Get a boolean',
          input: {},
          output: { type: 'boolean' },
          handler: async () => {
            throw new Error('Failed to get boolean');
          },
        }),
      },
      {
        logger: {
          error: jest.fn(),
        },
      },
    );

    const handler = HTTPServer.createExpressServerListener({
      schema,
      maxRequestBodyBytes: 1024,
      allowedOrigin: 'testOrigin',
    });

    const fakeResponse = fakeExpressResponse();

    await handler(
      fakeExpressRequest(
        JSON.stringify({
          operation: 'getBoolean',
          input: {},
        }),
        1024,
      ),
      fakeResponse,
    );

    expect(fakeResponse.status).toHaveBeenCalledTimes(1);
    expect(fakeResponse.status).toHaveBeenCalledWith(400);
    expect(fakeResponse.json).toHaveBeenCalledTimes(1);
    expect(fakeResponse.json).toHaveBeenCalledWith({
      data: undefined,
      errors: ['Failed to execute operation "getBoolean"'],
    });

    expect(schema.logger?.error).toHaveBeenCalledTimes(1);
    expect(schema.logger?.error).toHaveBeenNthCalledWith(
      1,
      'Failed to execute operation "getBoolean": Error: Failed to get boolean',
    );
  });

  test('get request body from express request', async () => {
    const data = 'a'.repeat(100);

    const req = fakeExpressRequest(data, 2);

    const result = await HTTPServer.getRequestBody({
      request: req,
      maxBodyBytes: 100,
    });

    expect(result).toEqual(data);
  });

  test('get request body with content too large', async () => {
    const data = 'a'.repeat(101);

    const req = fakeExpressRequest(data, 2);

    await expect(
      HTTPServer.getRequestBody({
        request: req,
        maxBodyBytes: 100,
      }),
    ).rejects.toThrow('Request body is too large');
  });

  test('call express server listener', async () => {
    const schema = new Schema(
      {
        getNumber: new Operation({
          description: 'Number',
          input: {},
          output: { type: 'int' },
          handler: async () => 5,
        }),
      },
      {
        logger: {
          error: jest.fn(),
        },
      },
    );

    const handler = HTTPServer.createExpressServerListener({
      schema,
      maxRequestBodyBytes: 100,
      allowedOrigin: '*',
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

    await handler(req, res);

    expect(res.status).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledTimes(1);
    expect(res.json).toHaveBeenCalledWith({
      data: 5,
    });
  });

  test('call express server listener with invalid body', async () => {
    const schema = new Schema(
      {
        getString: new Operation({
          description: 'Get a string',
          input: {},
          output: { type: 'string' },
          handler: async () => 'test',
        }),
      },
      {
        logger: {
          error: jest.fn(),
        },
      },
    );

    const handler = HTTPServer.createExpressServerListener({
      schema,
      maxRequestBodyBytes: 100,
      allowedOrigin: '*',
    });

    const req = fakeExpressRequest('invalid body', 2);

    const res = fakeExpressResponse();

    await handler(req, res);

    expect(res.status).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledTimes(1);
    expect(res.json).toHaveBeenCalledWith({
      data: undefined,
      errors: [PARSE_BODY_JSON_ERROR],
    });

    expect(schema.logger?.error).toHaveBeenCalledTimes(1);
    expect(schema.logger?.error).toHaveBeenNthCalledWith(
      1,
      'Failed to parse client message: Failed to parse client message, check if it is a valid JSON',
    );
  });

  test('call express playground listener', async () => {
    const httpServer = HTTPServer.createExpressPlaygroundListener({
      allowedOrigin: '*',
      serverPath: '/server',
      schemaPath: '/schema',
    });

    const req = fakeExpressRequest('', 10);

    const res = fakeExpressResponse();

    httpServer(req, res);

    expect(res.status).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledTimes(0);
    expect(res.send).toHaveBeenCalledTimes(1);
    expect(res.send).toHaveBeenCalledWith(
      expect.stringMatching(
        new RegExp(
          '^<!doctype html>.+<title>TWS Playground</title>.+<body>.+' +
            '<div.+<\\/div>.+<\\/body>.+<\\/html>',
          's',
        ),
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

    const handler = HTTPServer.createExpressSchemaListener({ schema, allowedOrigin: '*' });

    const req = fakeExpressRequest('', 10);

    const res = fakeExpressResponse();

    handler(req, res);

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
        enablePlayground: true,
        enableSchema: true,
      }),
    );
  });

  test('call express options listener', async () => {
    const handler = HTTPServer.createExpressOptionsListener({
      allowedOrigin: '*',
      maxAge: 1000,
    });

    const req = fakeExpressRequest('', 10);

    const res = fakeExpressResponse();

    handler(req, res);

    expect(res.status).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.setHeader).toHaveBeenCalledTimes(4);
    expect(res.send).toHaveBeenCalledTimes(1);
    expect(res.send).toHaveBeenCalledWith();
  });

  test('create an express server', async () => {
    const schema = new Schema(
      {
        getNumber: new Operation({
          description: 'Get a number',
          input: {},
          output: { type: 'float' },
          handler: async () => 5,
        }),
      },
      {
        logger: {
          error: jest.fn(),
        },
        enablePlayground: true,
      },
    );

    const server = HTTPServer.create({
      schema,
    });

    expect(typeof server).toEqual('function');
    expect(typeof server.get).toEqual('function');
    expect(typeof server.post).toEqual('function');
    expect(typeof server.use).toEqual('function');
    expect(typeof server.listen).toEqual('function');
  });

  test('create an express server with custom attributes', async () => {
    const schema = new Schema(
      {
        getNumber: new Operation({
          description: 'Get a number',
          input: {},
          output: { type: 'int' },
          handler: async () => 5,
        }),
      },
      {
        logger: {
          error: jest.fn(),
        },
        enablePlayground: true,
      },
    );

    const server = HTTPServer.create({
      schema,
      path: '/custom',
      allowedOrigin: 'test1',
      maxRequestBodyBytes: 100,
      accessControlMaxAgeSeconds: 30,
      playgroundPath: '/custom-playground',
      schemaPath: '/custom-schema',
    });

    expect(typeof server).toEqual('function');
    expect(typeof server.get).toEqual('function');
    expect(typeof server.post).toEqual('function');
    expect(typeof server.use).toEqual('function');
    expect(typeof server.listen).toEqual('function');
  });
});
