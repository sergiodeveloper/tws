import { Schema, Operation } from '../../src/index';

describe('Schema', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('handler with no arguments', async () => {
    const schema = new Schema({
      sayHello: new Operation({
        title: 'Say hello',
        description: 'Returns a string',
        input: {},
        output: {
          type: 'string',
        },
        handler: async () => 'Hello world!',
      }),
    });

    const result = await schema.execute('sayHello', {}, {});

    expect(result).toEqual('Hello world!');
  });

  test('handler with an optional argument', async () => {
    const schema = new Schema({
      sayHello: new Operation({
        description: 'Returns a string',
        input: {
          name: {
            type: 'string',
            description: 'Optional name',
            required: false,
          },
        },
        output: { type: 'string' },
        handler: async ({ name }) => `Hi ${name || 'everyone'}!`,
      }),
    });

    const result1 = await schema.execute('sayHello', { name: undefined }, {});
    expect(result1).toEqual('Hi everyone!');

    const result2 = await schema.execute('sayHello', { name: 'John' }, {});
    expect(result2).toEqual('Hi John!');
  });

  test('handler with a default value', async () => {
    const schema = new Schema({
      testDefaultValue: new Operation({
        description: 'Returns a value',
        input: {
          textual: {
            type: 'string',
            description: 'Always a string',
            required: false,
            defaultValue: 'abc',
          },
          numeric: {
            type: 'int',
            description: 'Always a number',
            required: false,
            defaultValue: 123,
          },
          overriden: {
            type: 'int',
            description: 'Always a number',
            required: false,
            defaultValue: 20,
          },
          textualButDefaultNumeric: {
            type: 'string',
            description: 'String or number',
            required: false,
            defaultValue: 456,
          },
        },
        output: {
          type: 'object',
          properties: {
            textual: { type: 'string' },
            numeric: { type: 'int' },
            overriden: { type: 'int' },
            textualButDefaultNumeric: { type: 'string' },
            enum: { type: 'enum', values: { a: {}, b: {} } },
          },
        },
        handler: async ({ textual, numeric, overriden, textualButDefaultNumeric }) => {
          return {
            textual,
            numeric,
            overriden,
            textualButDefaultNumeric:
              typeof textualButDefaultNumeric === 'number'
                ? (textualButDefaultNumeric + 10).toString()
                : textualButDefaultNumeric,
            enum: 'a' as const,
          };
        },
      }),
    });

    const result = await schema.execute(
      'testDefaultValue',
      {
        textual: undefined,
        numeric: undefined,
        overriden: 40,
        textualButDefaultNumeric: undefined,
      },
      {},
    );
    expect(result).toEqual({
      textual: 'abc',
      numeric: 123,
      overriden: 40,
      textualButDefaultNumeric: '466',
      enum: 'a',
    });
  });

  test('handler with a optional object', async () => {
    const schema = new Schema({
      testWithOptionalObject: new Operation({
        description: 'Returns a value',
        input: {
          optionalObject: {
            type: 'object',
            description: 'Optional object',
            required: false,
            properties: {
              name: {
                type: 'string',
                description: 'Name',
                required: true,
              },
            },
          },
        },
        output: {
          type: 'object',
          properties: {
            optionalObject: {
              type: 'object',
              required: false,
              properties: {
                name: { type: 'string' },
              },
            },
          },
        },
        handler: async ({ optionalObject }) => {
          return {
            optionalObject,
          };
        },
      }),
    });

    const result1 = await schema.execute(
      'testWithOptionalObject',
      {
        optionalObject: undefined,
      },
      {},
    );
    const result2 = await schema.execute(
      'testWithOptionalObject',
      {
        optionalObject: {
          name: 'John',
        },
      },
      {},
    );

    expect(result1).toEqual({
      optionalObject: undefined,
    });
    expect(result2).toEqual({
      optionalObject: {
        name: 'John',
      },
    });
  });

  test('handler with primitives as arguments', async () => {
    const schema = new Schema({
      sayHelloTo: new Operation({
        description: 'Returns a string with a name and value',
        input: {
          name: {
            type: 'string',
            description: 'Name to say hello to',
          },
          value: {
            type: 'float',
            description: 'Value to be sent with the message',
          },
        },
        output: {
          type: 'object',
          properties: {
            fullMessage: { type: 'string' },
            onlyName: { type: 'string' },
            onlyValue: { type: 'int' },
          },
        },
        handler: async ({ name, value }) => {
          return {
            fullMessage: `Hello ${name}! Value: ${value}`,
            onlyName: name,
            onlyValue: value,
          };
        },
      }),
    });

    const result = await schema.execute(
      'sayHelloTo',
      {
        name: 'John',
        value: 123,
      },
      {},
    );

    expect(result).toEqual({
      fullMessage: 'Hello John! Value: 123',
      onlyName: 'John',
      onlyValue: 123,
    });
  });

  test('handler with list of primitives as argument', async () => {
    const schema = new Schema({
      listNicknames: new Operation({
        description: 'Return formatted nicknames',
        input: {
          nicknames: {
            type: 'array',
            item: {
              type: 'string',
              description: 'Nicknames',
            },
          },
        },
        output: {
          type: 'object',
          properties: {
            nicknames: { type: 'array', item: { type: 'string' } },
            formattedNicknames: { type: 'string' },
            numberOfNicknames: { type: 'int' },
          },
        },
        handler: async ({ nicknames }) => {
          const formattedNicknames = nicknames.join(', ');

          return {
            nicknames,
            formattedNicknames,
            numberOfNicknames: nicknames.length,
          };
        },
      }),
    });

    const result = await schema.execute(
      'listNicknames',
      {
        nicknames: ['John', 'Joe', 'Jack'],
      },
      {},
    );

    expect(result).toEqual({
      nicknames: ['John', 'Joe', 'Jack'],
      formattedNicknames: 'John, Joe, Jack',
      numberOfNicknames: 3,
    });
  });

  test('handler with object as argument', async () => {
    const schema = new Schema({
      makeOrder: new Operation({
        description: 'Make an order',
        input: {
          product: {
            type: 'object',
            description: 'Product to order',
            properties: {
              id: {
                type: 'string',
                description: 'Product ID',
              },
              amount: {
                type: 'float',
                description: 'Amount of the product',
              },
              category: {
                type: 'enum',
                values: {
                  KITCHEN: { description: 'Item for the kitchen' },
                  BATHROOM: { description: 'Item for the bathroom' },
                },
              },
              address: {
                type: 'object',
                description: 'Address',
                properties: {
                  street: {
                    type: 'string',
                    description: 'Street',
                  },
                  number: {
                    type: 'int',
                    description: 'Number',
                  },
                },
              },
            },
          },
        },
        output: {
          type: 'object',
          properties: {
            orderId: { type: 'string' },
            product: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                amount: { type: 'float' },
              },
            },
          },
        },
        handler: async ({ product }) => {
          return {
            orderId: '1234',
            product,
          };
        },
      }),
    });

    const result = await schema.execute(
      'makeOrder',
      {
        product: {
          id: '123',
          amount: 2,
          address: {
            street: 'Main Street',
            number: 123,
          },
          category: 'KITCHEN',
        },
      },
      {},
    );

    expect(result).toEqual({
      orderId: '1234',
      product: {
        id: '123',
        amount: 2,
      },
    });
  });

  test('handler with list of objects as argument', async () => {
    const schema = new Schema({
      listCars: new Operation({
        description: 'Return formatted cars',
        input: {
          cars: {
            type: 'array',
            item: {
              type: 'object',
              description: 'Car',
              properties: {
                name: {
                  type: 'string',
                  description: 'Name of the card',
                },
                color: {
                  type: 'string',
                  description: 'Color of the car',
                },
                accessories: {
                  type: 'array',
                  item: {
                    type: 'string',
                    description: 'Accessories of the car',
                  },
                },
              },
            },
          },
        },
        output: {
          type: 'object',
          properties: {
            formattedCars: { type: 'string' },
            numberOfCars: { type: 'int' },
            cars: {
              type: 'array',
              item: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  color: { type: 'string' },
                },
              },
            },
          },
        },
        handler: async ({ cars }) => {
          const formattedCars = cars.map((car) => `${car.name} (${car.color})`).join(', ');

          return {
            formattedCars,
            numberOfCars: cars.length,
            cars,
          };
        },
      }),
    });

    const result = await schema.execute(
      'listCars',
      {
        cars: [
          {
            name: 'BMW',
            color: 'black',
            accessories: ['leather seats', 'sunroof'],
          },
          {
            name: 'Audi',
            color: 'white',
            accessories: ['keyless entry', 'heated seats'],
          },
        ],
      },
      {},
    );

    expect(result.cars).toHaveLength(2);

    expect(result).toEqual({
      formattedCars: 'BMW (black), Audi (white)',
      numberOfCars: 2,
      cars: [
        {
          name: 'BMW',
          color: 'black',
        },
        {
          name: 'Audi',
          color: 'white',
        },
      ],
    });
  });

  test('check if operation exists', async () => {
    const schema = new Schema({
      forbiddenOperation: new Operation({
        description: "Operation that won't be called",
        input: {},
        output: { type: 'boolean' },
        handler: async () => {
          throw new Error('This operation should not be called');
        },
      }),
    });

    try {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      await schema.execute('invalidOperation', {});
      throw new Error('Should not be called');
    } catch (e) {
      if (!(e instanceof Error)) {
        throw new Error('Wrong error type');
      }

      expect(e.message).toEqual('Operation "invalidOperation" not found');
    }
  });

  test('check if handler exists', async () => {
    const schema = new Schema({
      corruptedOperation: new Operation({
        description: "Operation that won't be called",
        input: {},
        output: { type: 'boolean' },
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        operation: undefined,
      }),
    });

    expect(() => schema.execute('corruptedOperation', {}, {})).rejects.toThrowError(
      'Operation "corruptedOperation" does not have a handler',
    );
  });
});
