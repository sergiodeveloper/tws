import { EventMap, OperationMap, Schema, Server } from '../../src/index';

describe('Server', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('parseRequestBody successfully', async () => {
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

    expect(() => Server.parseRequestBody(body, logger)).toThrow('No request body provided');
  });

  test('parseRequestBody with invalid body', async () => {
    const logger = {
      error: jest.fn(),
    };

    const body = 'invalid';

    expect(() => Server.parseRequestBody(body, logger)).toThrow(
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

    expect(() => Server.parseRequestBody(body, logger)).toThrow('No operation provided');
  });

  test('parseRequestBody with missing input', async () => {
    const logger = {
      error: jest.fn(),
    };

    const body = JSON.stringify({
      operation: 'hello',
    });

    expect(() => Server.parseRequestBody(body, logger)).toThrow('No input provided');
  });

  test('processPlaygroundRequest', async () => {
    const result = Server.processPlaygroundRequest({
      schemaPath: '/schema',
      serverPath: '/server',
    });

    expect(result).toMatch(
      new RegExp(
        '^<!doctype html>.+<title>TWS Playground</title>.+<body>.+<div.+<\\/div>' +
          '.+<\\/body>.+<\\/html>',
        's',
      ),
    );
  });

  test('processSchemaRequest', async () => {
    const schema: Schema<OperationMap, EventMap> = {
      operations: {
        hello: {
          input: {},
          output: {
            type: 'string',
          },
          handler: jest.fn(),
        },
        clientHello: {
          input: {},
          output: {
            type: 'string',
          },
          handler: jest.fn(),
        },
      },
      execute: jest.fn(),
      enablePlayground: true,
      enableSchema: true,
      executeClientRequest: jest.fn(),
      parseClientMessage: jest.fn(),
    } as never;

    const result = Server.processSchemaRequest({ schema });

    expect(result).toEqual(JSON.stringify(schema, null, 0));
  });
});
