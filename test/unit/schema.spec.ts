import { Operation, Schema } from '../../src/index';
import { Validation } from '../../src/validation';

describe('Schema', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('operation constructor', async () => {
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

  test('execute schema', async () => {
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

  test('execute schema with missing operation', async () => {
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
    ).rejects.toThrowError('Operation "hello" not found');

    expect(Validation.validateRootObjectInput).not.toHaveBeenCalled();
  });

  test('execute schema with missing operation handler', async () => {
    jest
      .spyOn(Validation, 'validateRootObjectInput')
      .mockImplementation((args) => args as Record<string, unknown>);

    const schema = new Schema({
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      hello: {},
    });

    await expect(schema.execute('hello', {}, {})).rejects.toThrowError(
      'Operation "hello" does not have a handler',
    );

    expect(Validation.validateRootObjectInput).not.toHaveBeenCalled();
  });
});
