import { Operation, RemoteControl, Schema } from '../../src/index';
import { SafeError, Validation } from '../../src/validation';

describe('Schema', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('Operation constructor', async () => {
    const parameters = {
      title: 'title',
      description: 'desc',
      input: {
        name: {
          type: 'string' as const,
          description: 'desc',
          required: true,
        },
      },
      output: {
        type: 'string' as const,
      },
      handler: jest.fn().mockReturnValue('world'),
    };

    const operation = new Operation(parameters);

    expect(operation.title).toBe(parameters.title);
    expect(operation.description).toBe(parameters.description);
    expect(operation.input).toBe(parameters.input);
    expect(operation.output).toBe(parameters.output);
    expect(operation.handler).toBe(parameters.handler);
  });

  test('Schema.constructor successfully', async () => {
    const operations = {
      hello: {
        handler: jest.fn().mockReturnValue('world'),
        input: {
          name: {
            type: 'string' as const,
            description: 'desc',
            required: true,
          },
        },
        output: {
          type: 'string' as const,
        },
      },
    };

    const schema = new Schema(operations);

    expect(schema.operations).toEqual(operations);
    expect(schema.enablePlayground).toBe(true);
    expect(schema.enableSchema).toBe(true);
  });

  test('Schema.execute successfully', async () => {
    jest
      .spyOn(Validation, 'validateRootObjectInput')
      .mockImplementation((args) => args as Record<string, unknown>);

    jest.spyOn(Validation, 'validateAndCleanOutput').mockImplementation((_, value) => value);

    const initialOperations = {
      initial: {
        handler: jest.fn(),
        input: {},
        output: {
          type: 'object' as const,
          properties: {},
        },
      },
    };

    const schema = new Schema(initialOperations);

    expect(schema.operations).toEqual(initialOperations);

    const operations = {
      hello: {
        handler: jest.fn().mockReturnValue('world'),
        input: {
          name: {
            type: 'string' as const,
            description: 'desc',
            required: true,
          },
        },
      },
    };

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    schema.operations = operations;

    const args = { name: 'say hello' };
    const metadata = {};

    const result = await schema.execute(
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      'hello',
      args,
      metadata,
    );

    expect(result).toBe('world');
    expect(operations.hello.handler).toHaveBeenCalledWith(args, { headers: {} });

    expect(Validation.validateRootObjectInput).toHaveBeenCalledWith(args, operations.hello.input);
  });

  test('Schema.execute with missing operation', async () => {
    jest
      .spyOn(Validation, 'validateRootObjectInput')
      .mockImplementation((args) => args as Record<string, unknown>);

    const schema = new Schema({});

    await expect(
      schema.execute(
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        'hello',
        {},
        {},
      ),
    ).rejects.toThrowErrorMatchingInlineSnapshot('"Operation "hello" not found"');

    expect(Validation.validateRootObjectInput).not.toHaveBeenCalled();
  });

  test('Schema.execute with missing operation handler', async () => {
    jest
      .spyOn(Validation, 'validateRootObjectInput')
      .mockImplementation((args) => args as Record<string, unknown>);

    const schema = new Schema({
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      hello: {},
    });

    await expect(schema.execute('hello', {}, {})).rejects.toThrowErrorMatchingInlineSnapshot(
      '"Operation "hello" does not have a handler"',
    );

    expect(Validation.validateRootObjectInput).not.toHaveBeenCalled();
  });

  test('Schema.parseClientMessage successfully', async () => {
    const schema = new Schema({});

    const rawMessage = JSON.stringify({
      operation: 'hello',
      input: {
        testInput: 'testInputValue',
      },
      headers: {
        testHeader: 'testInternalHeader',
      },
    });

    // @ts-expect-error private method
    const result = schema.parseClientMessage({
      rawMessage,
    });

    expect(result).toEqual({
      operation: 'hello',
      headers: {
        testHeader: 'testInternalHeader',
      },
      input: {
        testInput: 'testInputValue',
      },
    });
  });

  test('Schema.parseClientMessage with error on JSON parse', () => {
    const schema = new Schema({});
    const rawMessage = 'invalid json';

    expect(() =>
      // @ts-expect-error private method
      schema.parseClientMessage({
        rawMessage,
      }),
    ).toThrow('Failed to parse client message, check if it is a valid JSON');
  });

  test('Schema.parseClientMessage with missing operation', () => {
    const schema = new Schema({});
    const rawMessage = JSON.stringify({
      input: {
        testInput: 'testInputValue',
      },
    });

    expect(() =>
      // @ts-expect-error private method
      schema.parseClientMessage({
        rawMessage,
      }),
    ).toThrow('No operation provided in client message');
  });

  test('Schema.parseClientMessage with external headers', () => {
    const schema = new Schema({});
    const rawMessage = JSON.stringify({
      operation: 'hello',
      input: {
        testInput: 'testInputValue',
      },
    });

    // @ts-expect-error private method
    const result = schema.parseClientMessage({
      rawMessage,
      externalHeaders: {
        testHeader: 'testExternalHeader',
      },
    });

    expect(result).toEqual({
      operation: 'hello',
      headers: {
        testHeader: 'testExternalHeader',
      },
      input: {
        testInput: 'testInputValue',
      },
    });
  });

  test('Schema.parseClientMessage with missing headers', () => {
    const schema = new Schema({});
    const rawMessage = JSON.stringify({
      operation: 'hello',
      input: {
        testInput: 'testInputValue',
      },
    });

    // @ts-expect-error private method
    const result = schema.parseClientMessage({
      rawMessage,
    });

    expect(result).toEqual({
      operation: 'hello',
      headers: {},
      input: {
        testInput: 'testInputValue',
      },
    });
  });

  test('Schema.parseClientMessage with missing transactionId', () => {
    const schema = new Schema({});
    const rawMessage = JSON.stringify({
      operation: 'hello',
      input: {
        testInput: 'testInputValue',
      },
    });

    expect(() => {
      // @ts-expect-error private method
      schema.parseClientMessage({
        rawMessage,
        requireTransactionId: true,
      });
    }).toThrow('No transactionId provided in client message. Expected a string');
  });

  test('Schema.executeClientRequest successfully', async () => {
    const mockThis = {
      execute: jest.fn().mockResolvedValue({
        value: 'result',
      }),
      parseClientMessage: jest.fn().mockReturnValue({
        operation: 'hello',
        input: {
          testInput: 'testInputValue',
        },
        headers: {
          testHeader: 'testInternalHeader',
        },
      }),
    };

    const result = await Schema.prototype.executeClientRequest.call(mockThis, {
      body: JSON.stringify({
        operation: 'hello',
        input: {
          testInput: 'testInputValue',
        },
        headers: {
          testHeader: 'testInternalHeader',
        },
      }),
    });

    expect(result).toEqual({
      data: {
        value: 'result',
      },
    });

    expect(mockThis.execute).toHaveBeenCalledWith(
      'hello',
      {
        testInput: 'testInputValue',
      },
      {
        headers: {
          testHeader: 'testInternalHeader',
        },
      },
    );

    expect(mockThis.parseClientMessage).toHaveBeenCalledWith({
      rawMessage: JSON.stringify({
        operation: 'hello',
        input: {
          testInput: 'testInputValue',
        },
        headers: {
          testHeader: 'testInternalHeader',
        },
      }),
      externalHeaders: undefined,
    });
  });

  test('Schema.executeClientRequest with external headers', async () => {
    const mockThis = {
      execute: jest.fn().mockResolvedValue({
        value: 'result',
      }),
      parseClientMessage: jest.fn().mockReturnValue({
        operation: 'hello',
        input: {
          testInput: 'testInputValue',
        },
        headers: {
          testHeader: 'testExternalHeader',
        },
      }),
    };

    const result = await Schema.prototype.executeClientRequest.call(mockThis, {
      body: JSON.stringify({
        operation: 'hello',
        input: {
          testInput: 'testInputValue',
        },
      }),
      externalHeaders: {
        testHeader: 'testExternalHeader',
      },
    });

    expect(result).toEqual({
      data: {
        value: 'result',
      },
    });

    expect(mockThis.execute).toHaveBeenCalledWith(
      'hello',
      {
        testInput: 'testInputValue',
      },
      {
        headers: {
          testHeader: 'testExternalHeader',
        },
      },
    );
  });

  test('Schema.executeClientRequest with error on parse client message', async () => {
    const mockThis = {
      execute: jest.fn().mockResolvedValue({
        value: 'result',
      }),
      parseClientMessage: jest.fn().mockImplementation(() => {
        throw new SafeError('testError');
      }),
    };

    const result = await Schema.prototype.executeClientRequest.call(mockThis, {
      body: JSON.stringify({
        operation: 'hello',
        input: {
          testInput: 'testInputValue',
        },
        headers: {
          testHeader: 'testInternalHeader',
        },
      }),
    });

    expect(result).toEqual({
      data: undefined,
      errors: ['testError'],
    });

    expect(mockThis.execute).not.toHaveBeenCalled();
  });

  test('Schema.executeClientRequest with error on execute', async () => {
    const mockThis = {
      execute: jest.fn().mockRejectedValue(new SafeError('testError')),
      parseClientMessage: jest.fn().mockReturnValue({
        operation: 'hello',
        input: {
          testInput: 'testInputValue',
        },
        headers: {
          testHeader: 'testInternalHeader',
        },
      }),
    };

    const result = await Schema.prototype.executeClientRequest.call(mockThis, {
      body: JSON.stringify({
        operation: 'hello',
        input: {
          testInput: 'testInputValue',
        },
        headers: {
          testHeader: 'testInternalHeader',
        },
      }),
    });

    expect(result).toEqual({
      data: undefined,
      errors: ['Failed to execute operation "hello"', 'testError'],
    });

    expect(mockThis.execute).toHaveBeenCalledWith(
      'hello',
      {
        testInput: 'testInputValue',
      },
      {
        headers: {
          testHeader: 'testInternalHeader',
        },
      },
    );
  });

  test('RemoteControl.constructor successfully', async () => {
    const remoteControl = new RemoteControl({
      events: {
        testEvent: {
          input: {
            testInput: {
              type: 'string',
            },
          },
        },
      },
      eventSender: jest.fn(),
    });

    expect(remoteControl).toBeInstanceOf(RemoteControl);

    expect(remoteControl.events).toEqual({
      testEvent: {
        input: {
          testInput: {
            type: 'string',
          },
        },
      },
    });

    expect(remoteControl.eventSender).toBeInstanceOf(Function);
  });

  test('RemoteControl.sendEvent successfully', async () => {
    const remoteControl = new RemoteControl({
      events: {
        testEvent: {
          input: {
            testInput: {
              type: 'string',
            },
          },
        },
      },
      eventSender: jest.fn(),
    });

    const result = await remoteControl.sendEvent('testEvent', {
      clientIds: ['testClientId'],
      data: {
        testInput: 'testInputValue',
      },
    });

    expect(result).toBeUndefined();

    expect(remoteControl.eventSender).toHaveBeenCalledWith({
      event: 'testEvent',
      clientIds: ['testClientId'],
      payload: JSON.stringify({
        event: 'testEvent',
        data: {
          testInput: 'testInputValue',
        },
      }),
    });
  });
});
