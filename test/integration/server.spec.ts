import { Resolver, Schema, Server, createServer } from '../../src/index';

const PARSE_BODY_JSON_ERROR = 'Failed to parse request body, check if it is valid JSON';

function fakeExpressRequest(data: string, chunkSize: number) {
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
  };
}

function fakeExpressResponse() {
  return {
    status: jest.fn(),
    json: jest.fn(),
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
      sayHello: new Resolver({
        description: 'Say hello',
        input: {
          name: {
            type: 'string',
            description: 'Name of the person',
          },
        },
        output: 'string',
        resolver: async ({ name }) => {
          return `Hello ${name}`;
        },
      }),
    });

    const errorLogger = jest.fn();
    const result = await Server.processPostRequest({
      schema,
      body: JSON.stringify({
        operation: 'sayHello',
        input: {
          name: 'John',
        },
      }),
      logger: {
        error: errorLogger,
      },
    });

    expect(result).toEqual({
      data: 'Hello John',
    });

    expect(errorLogger).not.toHaveBeenCalled();
  });

  test('process post request with invalid body', async () => {
    const schema = new Schema({
      getBoolean: new Resolver({
        description: 'Get a boolean',
        input: {},
        output: 'boolean',
        resolver: async () => true,
      }),
    });

    const errorLogger = jest.fn();
    const result = await Server.processPostRequest({
      schema,
      body: 'invalid body',
      logger: {
        error: errorLogger,
      },
    });

    expect(result).toEqual({
      error: 'Failed to parse request body: Error: ' + PARSE_BODY_JSON_ERROR,
    });

    expect(errorLogger).toHaveBeenCalledTimes(1);
    expect(errorLogger.mock.calls[0][0]).toMatch(/^Failed to parse request body: /);
  });

  test('process post request failing to resolve', async () => {
    const schema = new Schema({
      getBoolean: new Resolver({
        description: 'Get a boolean',
        input: {},
        output: 'boolean',
        resolver: async () => {
          throw new Error('Failed to get boolean');
        },
      }),
    });

    const errorLogger = jest.fn();
    const result = await Server.processPostRequest({
      schema,
      body: JSON.stringify({
        operation: 'getBoolean',
        input: {},
      }),
      logger: {
        error: errorLogger,
      },
    });

    expect(result).toEqual({
      error: 'Failed to execute operation, please check your request body',
    });

    expect(errorLogger).toHaveBeenCalledTimes(1);
    expect(errorLogger.mock.calls[0][0]).toMatch(/^Failed to execute operation "getBoolean": /);
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

  test('call express endpoint listener', async () => {
    const schema = new Schema({
      getNumber: new Resolver({
        description: 'Number',
        input: {},
        output: 'number',
        resolver: async () => 5,
      }),
    });

    const listener = Server.createExpressEndpointListener({
      schema,
      maxRequestBodyBytes: 100,
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

  test('call express endpoint listener with invalid body', async () => {
    const schema = new Schema({
      getString: new Resolver({
        description: 'Get a string',
        input: {},
        output: 'string',
        resolver: async () => 'test',
      }),
    });

    const errorLogger = jest.fn();
    const listener = Server.createExpressEndpointListener({
      schema,
      maxRequestBodyBytes: 100,
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
      error: 'Failed to parse request body: Error: ' + PARSE_BODY_JSON_ERROR,
    });

    expect(errorLogger).toHaveBeenCalledTimes(1);
    expect(errorLogger.mock.calls[0][0]).toMatch(/^Failed to parse request body: /);
  });

  test('create an express server', async () => {
    const schema = new Schema({
      getNumber: new Resolver({
        description: 'Get a number',
        input: {},
        output: 'number',
        resolver: async () => 5,
      }),
    });

    const server = createServer({
      schema,
      logger: {
        error: jest.fn(),
      },
    });

    expect(typeof server).toEqual('function');
    expect(typeof server.get).toEqual('function');
    expect(typeof server.post).toEqual('function');
    expect(typeof server.use).toEqual('function');
    expect(typeof server.listen).toEqual('function');
  });

  test('create an express server with custom attributes', async () => {
    const schema = new Schema({
      getNumber: new Resolver({
        description: 'Get a number',
        input: {},
        output: 'number',
        resolver: async () => 5,
      }),
    });

    const server = createServer({
      schema,
      logger: {
        error: jest.fn(),
      },
      endpoint: '/custom',
      maxRequestBodyBytes: 100,
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
