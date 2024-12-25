import { createServer } from 'net';

import { WebSocketServer } from 'ws';
import { WebSocket as WebSocketClient } from 'isomorphic-ws';

import { EventMap, HTTPServer, Operation, OperationMap, Schema } from '../../src';

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

async function freePortInRange(start: number, end: number): Promise<number> {
  const randomPort = Math.floor(Math.random() * (end - start)) + start;

  const isAvailable = await new Promise((resolve) => {
    const server = createServer();
    server.unref();

    server.on('error', () => resolve(false));

    server.listen(randomPort, () => server.close(() => resolve(true)));
  });

  return isAvailable ? randomPort : freePortInRange(start, end);
}

export class ServerProvider {
  private servers: { stop: () => Promise<void> }[] = [];

  async createTwsHttpServer<T extends OperationMap, U extends EventMap>(
    options: Parameters<typeof HTTPServer.create<T, U>>[0],
  ) {
    const expressServer = HTTPServer.create(options);

    const port = await freePortInRange(4000, 45000);

    const netServer = expressServer.listen(port);

    await new Promise((resolve) => netServer.on('listening', resolve));

    const server = {
      stop: async () => {
        await new Promise((resolve) => netServer.close(resolve));
      },
      url: `http://localhost:${port}`,
    };

    this.servers.push(server);
    return server;
  }

  async createSimpleWebSocketServer(options: {
    onClientConnected: (clientId: string, ws: import('ws').WebSocket) => void;
    onClientDisconnected: (clientId: string, ws: import('ws').WebSocket) => void;
  }) {
    const port = await freePortInRange(4000, 45000);

    const wss = new WebSocketServer({ port });

    const server = {
      url: `ws://localhost:${port}`,
      stop: async () => wss.clients.forEach((client) => client.terminate()),
    };

    wss.on('connection', (ws) => {
      const randomId = Array(8)
        .fill(0)
        .map(() => Math.random().toString(36).substring(2))
        .join('')
        .substring(0, 10);

      options.onClientConnected(randomId, ws);

      ws.on('close', () => {
        options.onClientDisconnected(randomId, ws);
      });
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

export async function waitFor(callback: () => boolean, interval = 50, timeout = 5000) {
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
