import { createServer } from 'net';

import { WebSocket as WebSocketClient } from 'isomorphic-ws';

import {
  EventMap,
  HTTPServerHelper,
  Operation,
  OperationMap,
  Schema,
  WebSocketServerHelper,
} from '../../src';

export const JSON_HEADER = {
  'Content-Type': 'application/json',
};

export const HELLO_SCHEMA = new Schema({
  hello: new Operation({
    title: 'hello',
    description: 'hello',
    input: {
      name: {
        type: 'string',
      },
    },
    output: {
      type: 'string',
    },
    handler: async ({ name }) => `Hello ${name}!`,
  }),
});

export const INT_MULTIPLY_SCHEMA = new Schema({
  multiply: new Operation({
    title: 'multiply',
    description: 'multiply',
    input: {
      a: {
        type: 'int',
      },
      b: {
        type: 'int',
      },
    },
    output: {
      type: 'int',
    },
    handler: async ({ a, b }) => a * b,
  }),
});

export const FLOAT_SUM_SCHEMA = new Schema({
  sum: new Operation({
    title: 'sum',
    description: 'sum',
    input: {
      a: {
        type: 'float',
      },
      b: {
        type: 'float',
      },
    },
    output: {
      type: 'float',
    },
    handler: async ({ a, b }) => a + b,
  }),
});

export const BOOLEAN_NEGATE_SCHEMA = new Schema({
  negate: new Operation({
    title: 'negate',
    description: 'negate',
    input: {
      a: {
        type: 'boolean',
      },
    },
    output: {
      type: 'boolean',
    },
    handler: async ({ a }) => !a,
  }),
});

async function getFreePort(start = 4000, end = 45000): Promise<number> {
  const randomPort = Math.floor(Math.random() * (end - start)) + start;

  const isAvailable = await new Promise((resolve) => {
    const server = createServer();
    server.unref();

    server.on('error', () => resolve(false));

    server.listen(randomPort, () => server.close(() => resolve(true)));
  });

  return isAvailable ? randomPort : getFreePort(start, end);
}

export class ServerProvider {
  private servers: { stop: () => Promise<void> }[] = [];

  async createTwsHttpServer<T extends OperationMap, U extends EventMap>(
    options: Omit<Parameters<typeof HTTPServerHelper.create<T, U>>[0], 'port'>,
  ) {
    const server = await HTTPServerHelper.create({
      ...options,
      port: await getFreePort(),
    });

    this.servers.push(server);
    return server;
  }

  async createTwsWebSocketServer<T extends OperationMap, U extends EventMap>(options: {
    schema: Schema<T, U>;
    onClientConnected: (clientId: string, ws: import('ws').WebSocket) => void;
    onClientDisconnected: (clientId: string, ws: import('ws').WebSocket) => void;
  }) {
    const server = WebSocketServerHelper.create({
      port: await getFreePort(),
      schema: options.schema,
      onClientConnected: options.onClientConnected,
      onClientDisconnected: options.onClientDisconnected,
    });

    this.servers.push(server);
    return server;
  }

  async createWebSocketConnection(options: {
    serverUrl: string;
    onMessage: (message: unknown) => void;
  }) {
    const ws = new WebSocketClient(options.serverUrl);

    ws.on('message', (message: unknown) =>
      options.onMessage(Buffer.isBuffer(message) ? message.toString('utf8') : message),
    );

    await new Promise((resolve) => ws.on('open', resolve));

    const helper = {
      send: (message: unknown) => ws.send(JSON.stringify(message)),
      stop: async () => ws.close(),
    };

    this.servers.push(helper);

    return helper;
  }

  async stop() {
    await Promise.all(
      this.servers.map(async (server) => {
        await server.stop();
      }),
    );
    this.servers = [];
  }
}

export async function httpPost<T>(options: {
  url: string;
  headers: Record<string, string>;
  body: string;
}) {
  const response = await fetch(options.url, {
    method: 'POST',
    headers: options.headers,
    body: options.body,
  });

  const text = await response.text();

  let json;
  try {
    json = JSON.parse(text);
  } catch (e) {
    json = null;
  }

  return {
    status: response.status,
    text,
    json: <T | null>json,
  };
}

export async function httpGet<T>(options: { url: string; headers: Record<string, string> }) {
  const response = await fetch(options.url, {
    method: 'GET',
    headers: options.headers,
  });

  const text = await response.text();

  let json;
  try {
    json = JSON.parse(text);
  } catch (e) {
    json = null;
  }

  return {
    status: response.status,
    text,
    json: <T | null>json,
  };
}

export async function httpOptions(options: { url: string; headers: Record<string, string> }) {
  const response = await fetch(options.url, {
    method: 'OPTIONS',
    headers: options.headers,
  });

  return {
    status: response.status,
    headers: response.headers,
  };
}

export async function waitFor(callback: () => boolean, interval = 5, timeout = 100) {
  return new Promise((resolve, reject) => {
    const start = Date.now();

    const checkCondition = () => {
      if (callback()) {
        resolve(0);
      } else if (Date.now() - start > timeout) {
        reject(new Error('Timed out waiting for condition'));
      } else {
        setTimeout(checkCondition, interval); // Retry after a short delay
      }
    };

    checkCondition();
  });
}
