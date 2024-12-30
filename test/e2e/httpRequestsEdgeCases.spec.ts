import { Operation, Schema } from '../../src';

import { HELLO_SCHEMA, httpOptions, httpPost, JSON_HEADER, ServerProvider } from './utils';

const servers = new ServerProvider();

describe('http requests edge cases', () => {
  afterEach(async () => {
    jest.restoreAllMocks();
    await servers.stop();
  });

  test('run a post request with a large body', async () => {
    const body = 'a'.repeat(1001000);

    const server = await servers.createTwsHttpServer({
      schema: HELLO_SCHEMA,
    });

    const response = await httpPost({
      url: `${server.url}/tws`,
      headers: JSON_HEADER,
      body,
    });

    expect(response.status).toBe(400);
    expect(response.json).toEqual({
      errors: ['Failed to read request body', 'Request body is too large'],
    });
  });

  test('run a post request with array header', async () => {
    const server = await servers.createTwsHttpServer({
      schema: new Schema({
        helloHeaders: new Operation({
          input: {},
          output: {
            type: 'array',
            item: {
              type: 'string',
            },
          },
          handler: (_, metadata) =>
            Object.entries(metadata.headers).map(([key, value]) => `${key}: ${value}`),
        }),
      }),
    });

    const response = await httpPost({
      url: `${server.url}/tws`,
      headers: {
        'Content-Type': 'application/json',
        'set-cookie': 'test=ok', // received by the server as an array
      },
      body: JSON.stringify({
        operation: 'helloHeaders',
        input: {},
      }),
    });

    expect(response.status).toBe(200);
    expect(response.json).toEqual({
      data: expect.arrayContaining(['content-type: application/json', 'set-cookie: test=ok']),
    });
  });

  test('request server options', async () => {
    const server = await servers.createTwsHttpServer({
      schema: HELLO_SCHEMA,
    });

    const response = await httpOptions({
      url: `${server.url}/tws`,
      headers: JSON_HEADER,
    });

    expect(response.status).toBe(200);
    expect(response.headers).toMatchObject(
      expect.objectContaining({
        'access-control-allow-methods': 'OPTIONS, GET, POST',
        'access-control-allow-headers': '*',
        'access-control-allow-origin': '*',
        'access-control-max-age': '60',
      }),
    );
  });
});
