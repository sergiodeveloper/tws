import { Schema } from '../../src';

import { ServerProvider, HELLO_SCHEMA, httpGet, JSON_HEADER } from './utils';

const SCHEMA_HTML_PATTERN = '^<!doctype html>.+<title>TWS Playground</title>.+<body>.+';

const servers = new ServerProvider();

describe('client requests playground', () => {
  afterEach(async () => {
    jest.restoreAllMocks();
    await servers.stop();
  });

  test('get playground from the default endpoint', async () => {
    const server = await servers.createTwsHttpServer({
      schema: HELLO_SCHEMA,
    });

    const response = await httpGet({
      url: `${server.url}/tws`,
      headers: JSON_HEADER,
    });

    expect(response.status).toBe(200);
    expect(response.text).toEqual(expect.stringMatching(new RegExp(SCHEMA_HTML_PATTERN, 's')));

    expect(response.text).toContain("TWS_SCHEMA_PATH = '/tws/schema'");
    expect(response.text).toContain("TWS_SERVER_PATH = '/tws'");
  });

  test('get playground from a different endpoint', async () => {
    const server = await servers.createTwsHttpServer({
      schema: HELLO_SCHEMA,
      playgroundPath: '/testpath',
    });

    const response = await httpGet({
      url: `${server.url}/testpath`,
      headers: JSON_HEADER,
    });

    expect(response.status).toBe(200);
    expect(response.text).toEqual(expect.stringMatching(new RegExp(SCHEMA_HTML_PATTERN, 's')));

    expect(response.text).toContain("TWS_SCHEMA_PATH = '/tws/schema'");
    expect(response.text).toContain("TWS_SERVER_PATH = '/tws'");
  });

  test('get playground with a custom server and schema path', async () => {
    const server = await servers.createTwsHttpServer({
      schema: HELLO_SCHEMA,
      path: '/custom-server',
      schemaPath: '/custom-schema',
    });

    const response = await httpGet({
      url: `${server.url}/tws`,
      headers: JSON_HEADER,
    });

    expect(response.status).toBe(200);
    expect(response.text).toEqual(expect.stringMatching(new RegExp(SCHEMA_HTML_PATTERN, 's')));

    expect(response.text).toContain("TWS_SCHEMA_PATH = '/custom-schema'");
    expect(response.text).toContain("TWS_SERVER_PATH = '/custom-server'");
  });

  test('try to get the playground with it disabled', async () => {
    const server = await servers.createTwsHttpServer({
      schema: new Schema(
        {},
        {
          enablePlayground: false,
        },
      ),
    });

    const response = await httpGet({
      url: `${server.url}/tws`,
      headers: JSON_HEADER,
    });

    expect(response.status).toBe(404);
  });
});
