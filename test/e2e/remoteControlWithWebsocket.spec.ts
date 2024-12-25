import { RemoteControl } from '../../src';

import { ServerProvider, waitFor } from './utils';

const servers = new ServerProvider();

describe('remote control with websocket', () => {
  afterEach(async () => {
    jest.restoreAllMocks();
    await servers.stop();
  });

  test('send a message to a client using Remote Control through websocket', async () => {
    const connectedClients = new Map<string, import('ws').WebSocket>();

    const remoteControl = new RemoteControl({
      events: {
        receivedMessage: {
          title: 'You have a new message',
          description: 'Emitted when a new message is received',
          input: {
            messageContent: {
              type: 'string',
              description: 'The message that was received',
            },
          },
        },
      },

      eventSender: ({ clientIds, payload }) => {
        clientIds.forEach((clientId) => {
          if (connectedClients.has(clientId)) {
            connectedClients.get(clientId)?.send(payload);
          }
        });
      },
    });

    const clientConnectSpy = jest.fn();
    const clientDisconnectSpy = jest.fn();

    const server = await servers.createSimpleWebSocketServer({
      onClientConnected: (clientId, ws) => {
        clientConnectSpy();
        connectedClients.set(clientId, ws);
      },
      onClientDisconnected: (clientId) => {
        clientDisconnectSpy();
        connectedClients.delete(clientId);
      },
    });

    expect(clientConnectSpy).not.toHaveBeenCalled();

    const onMessageSpy = jest.fn();

    await servers.createWebSocketConnection({
      serverUrl: server.url,
      onMessage: (message) => onMessageSpy(message),
    });

    expect(clientConnectSpy).toHaveBeenCalledTimes(1);

    await remoteControl.sendEvent('receivedMessage', {
      clientIds: [...connectedClients.keys()],
      data: { messageContent: 'Hello, world!' },
    });

    expect(clientDisconnectSpy).not.toHaveBeenCalled();

    await waitFor(() => onMessageSpy.mock.calls.length > 0);

    expect(onMessageSpy).toHaveBeenCalledTimes(1);
    expect(onMessageSpy).toHaveBeenCalledWith(
      JSON.stringify({
        event: 'receivedMessage',
        data: { messageContent: 'Hello, world!' },
      }),
    );
  });
});
