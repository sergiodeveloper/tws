import { Schema } from '../../src';

import { ServerProvider, HELLO_SCHEMA, httpGet, JSON_HEADER } from './utils';

const servers = new ServerProvider();

describe('client requests schema', () => {
  afterEach(async () => {
    jest.restoreAllMocks();
    await servers.stop();
  });

  test('get schema from the default endpoint', async () => {
    const server = await servers.createTwsHttpServer({
      schema: HELLO_SCHEMA,
    });

    const response = await httpGet({
      url: `${server.url}/tws/schema`,
      headers: JSON_HEADER,
    });

    expect(response.status).toBe(200);
    expect(response.json).toEqual({
      operations: {
        hello: {
          description: 'hello',
          input: {
            name: {
              type: 'string',
            },
          },
          output: {
            type: 'string',
          },
          title: 'hello',
        },
      },
      events: {},
    });
  });

  test('get schema from a different endpoint', async () => {
    const server = await servers.createTwsHttpServer({
      schema: HELLO_SCHEMA,
      schemaPath: '/testpath',
    });

    const response = await httpGet({
      url: `${server.url}/testpath`,
      headers: JSON_HEADER,
    });

    expect(response.status).toBe(200);
    expect(response.json).toEqual({
      operations: {
        hello: {
          description: 'hello',
          input: {
            name: {
              type: 'string',
            },
          },
          output: {
            type: 'string',
          },
          title: 'hello',
        },
      },
      events: {},
    });

    const response2 = await httpGet({
      url: `${server.url}/tws/schema`,
      headers: JSON_HEADER,
    });
    expect(response2.status).toBe(404);
  });

  test('try to get the schema with it disabled', async () => {
    const server = await servers.createTwsHttpServer({
      schema: new Schema(
        {},
        {
          enableSchema: false,
          enablePlayground: false,
        },
      ),
    });

    const response = await httpGet({
      url: `${server.url}/tws/schema`,
      headers: JSON_HEADER,
    });

    expect(response.status).toBe(404);
  });

  test('get empty schema', async () => {
    const server = await servers.createTwsHttpServer({
      schema: new Schema({}),
    });

    const response = await httpGet({
      url: `${server.url}/tws/schema`,
      headers: JSON_HEADER,
    });

    expect(response.status).toBe(200);
    expect(response.json).toEqual({
      operations: {},
      events: {},
    });
  });
});
