import { HELLO_SCHEMA, ServerProvider, waitFor } from './utils';

const servers = new ServerProvider();

describe('client runs operation with websocket', () => {
  afterEach(async () => {
    jest.restoreAllMocks();
    await servers.stop();
  });

  test('client runs an operation connected through websocket', async () => {
    const onClientConnected = jest.fn();

    const schemaHandlerSpy = jest.spyOn(HELLO_SCHEMA.operations.hello, 'handler' as never);

    const server = await servers.createTwsWebSocketServer({
      onClientConnected,
      onClientDisconnected: jest.fn(),
      schema: HELLO_SCHEMA,
    });

    const clientReceiveMessageSpy = jest.fn();

    const clientConnection = await servers.createWebSocketConnection({
      serverUrl: server.url,
      onMessage: (message) => clientReceiveMessageSpy(message),
    });

    await waitFor(() => onClientConnected.mock.calls.length > 0);

    await clientConnection.send({
      operation: 'hello',
      transactionId: 'testTransactionId',
      input: {
        name: 'world',
      },
      headers: {
        myHeader: 'testHeader',
      },
    });

    await waitFor(() => clientReceiveMessageSpy.mock.calls.length > 0);

    expect(clientReceiveMessageSpy).toHaveBeenCalledWith(
      JSON.stringify({
        data: 'Hello world!',
        transactionId: 'testTransactionId',
      }),
    );

    expect(schemaHandlerSpy).toHaveBeenCalledTimes(1);
    expect(schemaHandlerSpy).toHaveBeenCalledWith(
      { name: 'world' },
      { headers: { myHeader: 'testHeader' } },
    );
  });

  test('client runs an operation through websocket with missing transactionId', async () => {
    const onClientConnected = jest.fn();

    const server = await servers.createTwsWebSocketServer({
      onClientConnected,
      onClientDisconnected: jest.fn(),
      schema: HELLO_SCHEMA,
    });

    const clientReceiveMessageSpy = jest.fn();

    const clientConnection = await servers.createWebSocketConnection({
      serverUrl: server.url,
      onMessage: (message) => clientReceiveMessageSpy(message),
    });

    await waitFor(() => onClientConnected.mock.calls.length > 0);

    await clientConnection.send({
      operation: 'hello',
      input: {
        name: 'world',
      },
      headers: {
        myHeader: 'testHeader',
      },
    });

    await waitFor(() => clientReceiveMessageSpy.mock.calls.length > 0);

    expect(clientReceiveMessageSpy).toHaveBeenCalledWith(
      JSON.stringify({
        errors: ['No transactionId provided in client message. Expected a string'],
      }),
    );
  });
});
