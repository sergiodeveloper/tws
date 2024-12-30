import { EventMap, OperationMap, Schema, Server } from '../../src/index';

describe('Server', () => {
  afterEach(() => {
    jest.restoreAllMocks();
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
      executeClientRequest: jest.fn(),
      parseClientMessage: jest.fn(),
    } as never;

    const result = Server.processSchemaRequest({ schema });

    expect(result).toEqual(
      JSON.stringify(
        {
          ...schema,
          events: {},
        },
        null,
        0,
      ),
    );
  });
});
