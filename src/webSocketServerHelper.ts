import { WebSocketServer } from 'ws';

import { EventMap, OperationMap, Schema } from './schema';

/**
 * Utilities for creating an websocket server that can execute operations from a schema
 */
export abstract class WebSocketServerHelper {
  static getWebSocketServerClass() {
    return WebSocketServer;
  }

  static create<T extends OperationMap, U extends EventMap>(options: {
    port: number;
    schema: Schema<T, U>;
    onClientConnected: (clientId: string, ws: import('ws').WebSocket) => void;
    onClientDisconnected: (clientId: string, ws: import('ws').WebSocket) => void;
  }) {
    const WebSocketServer = WebSocketServerHelper.getWebSocketServerClass();

    const wss = new WebSocketServer({ port: options.port });

    wss.on('connection', (ws) => {
      const randomId = Array(8)
        .fill(0)
        .map(() => Math.random().toString(36).substring(2))
        .join('')
        .substring(0, 10);

      options.onClientConnected(randomId, ws);

      ws.on('close', () => options.onClientDisconnected(randomId, ws));

      ws.on('message', async (message: unknown) => {
        const stringMessage = Buffer.isBuffer(message) ? message.toString('utf8') : `${message}`;

        const result = await options.schema.executeClientRequest({
          body: stringMessage,
          requireTransactionId: true,
        });

        ws.send(JSON.stringify(result));
      });
    });

    return {
      url: `ws://localhost:${options.port}`,
      server: wss,
      stop: async () => wss.clients.forEach((client) => client.terminate()),
    };
  }
}
