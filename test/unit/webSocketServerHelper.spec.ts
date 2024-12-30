import { Schema } from '../../src';
import { WebSocketServerHelper } from '../../src/webSocketServerHelper';

describe('webSocketServerHelper', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('getWebSocketServerClass', () => {
    expect(WebSocketServerHelper.getWebSocketServerClass()).toBeDefined();
  });

  test('create successfully', async () => {
    const serverConstructorSpy = jest.fn();
    const serverOnSpy = jest.fn();

    const fakeWebSocketServer = function (...args: unknown[]) {
      serverConstructorSpy(...args);
    };
    fakeWebSocketServer.prototype.on = serverOnSpy;
    jest
      .spyOn(WebSocketServerHelper, 'getWebSocketServerClass')
      .mockReturnValue(fakeWebSocketServer as never);

    const onClientConnected = jest.fn();
    const onClientDisconnected = jest.fn();

    const schema = new Schema({});

    jest.spyOn(schema, 'executeClientRequest').mockResolvedValue({
      data: {
        test: 'testResult',
      } as never,
    });

    const result = WebSocketServerHelper.create({
      port: 3000,
      schema,
      onClientConnected,
      onClientDisconnected,
    });

    expect(result.url).toBe('ws://localhost:3000');
    expect(serverConstructorSpy).toHaveBeenCalledWith({ port: 3000 });
    expect(serverOnSpy).toHaveBeenCalledWith('connection', expect.any(Function));

    const fakeConnection = {
      on: jest.fn(),
      send: jest.fn(),
    };

    const serverOnConnectionEvent = serverOnSpy.mock.calls[0][0];
    expect(serverOnConnectionEvent).toBe('connection');
    const serverOnConnection = serverOnSpy.mock.calls[0][1];
    serverOnConnection(fakeConnection as never);
    expect(onClientConnected).toHaveBeenCalledWith(expect.stringMatching(/.{10}/), fakeConnection);

    const connectionOnCloseEvent = fakeConnection.on.mock.calls[0][0];
    expect(connectionOnCloseEvent).toBe('close');
    const connectionOnClose = fakeConnection.on.mock.calls[0][1];
    await connectionOnClose();
    expect(onClientDisconnected).toHaveBeenCalledWith(
      expect.stringMatching(/.{10}/),
      fakeConnection,
    );

    const connectionOnMessageEvent = fakeConnection.on.mock.calls[1][0];
    expect(connectionOnMessageEvent).toBe('message');
    const connectionOnMessage = fakeConnection.on.mock.calls[1][1];
    await connectionOnMessage('message');
    expect(fakeConnection.send).toHaveBeenCalledWith('{"data":{"test":"testResult"}}');
  });
});
