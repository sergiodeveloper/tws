import { Resolver, Schema } from '../../src/index';
import { Validation } from '../../src/validation';

describe('Schema', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('resolver constructor', async () => {
    const parameters = {
      description: 'desc',
      input: {
        name: {
          type: 'string' as const,
          description: 'desc',
          required: true,
        },
      },
      output: 'string' as const,
      resolver: jest.fn().mockReturnValue('world'),
    };

    const resolver = new Resolver(parameters);

    expect(resolver.description).toBe(parameters.description);
    expect(resolver.input).toBe(parameters.input);
    expect(resolver.output).toBe(parameters.output);
    expect(resolver.handler).toBe(parameters.resolver);
  });

  test('execute schema', async () => {
    jest.spyOn(Validation, 'validateRootObjectInput').mockImplementation((args) => args);

    const initialResolvers = {
      initial: {},
    };

    const schema = new Schema(
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      initialResolvers,
    );

    expect(
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      schema.resolvers,
    ).toEqual(initialResolvers);

    const resolvers = {
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
    schema.resolvers = resolvers;

    const args = { name: 'say hello' };

    const result = await schema.execute(
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      'hello',
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      args,
    );

    expect(result).toBe('world');
    expect(resolvers.hello.handler).toHaveBeenCalledWith(args);

    expect(Validation.validateRootObjectInput).toHaveBeenCalledWith(args, resolvers.hello.input);
  });

  test('execute schema with missing resolver', async () => {
    jest.spyOn(Validation, 'validateRootObjectInput').mockImplementation((args) => args);

    const schema = new Schema({});

    await expect(
      schema.execute(
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        'hello',
        {},
      ),
    ).rejects.toThrowError('Resolver "hello" does not exist');

    expect(Validation.validateRootObjectInput).not.toHaveBeenCalled();
  });

  test('execute schema with missing resolver handler', async () => {
    jest.spyOn(Validation, 'validateRootObjectInput').mockImplementation((args) => args);

    const schema = new Schema({
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      hello: {},
    });

    await expect(schema.execute('hello', {})).rejects.toThrowError(
      'Resolver "hello" does not have a handler',
    );

    expect(Validation.validateRootObjectInput).not.toHaveBeenCalled();
  });
});
