import { Schema, Resolver } from '../../src/index';

describe('Schema', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('handler with no arguments', async () => {
    const schema = new Schema({
      sayHello: new Resolver({
        description: 'Returns a string',
        input: {},
        output: 'string',
        resolver: async () => 'Hello world!',
      }),
    });

    const result = await schema.execute('sayHello', {});

    expect(result).toEqual('Hello world!');
  });

  test('handler with an optional argument', async () => {
    const schema = new Schema({
      sayHello: new Resolver({
        description: 'Returns a string',
        input: {
          name: {
            type: 'string',
            description: 'Optional name',
            required: false,
          },
        },
        output: 'string',
        resolver: async ({ name }) => `Hi ${name || 'everyone'}!`,
      }),
    });

    const result1 = await schema.execute('sayHello', { name: undefined });
    expect(result1).toEqual('Hi everyone!');

    const result2 = await schema.execute('sayHello', { name: 'John' });
    expect(result2).toEqual('Hi John!');
  });

  test('handler with a default value', async () => {
    const schema = new Schema({
      testDefaultValue: new Resolver({
        description: 'Returns a value',
        input: {
          textual: {
            type: 'string',
            description: 'Always a string',
            required: false,
            defaultValue: 'abc',
          },
          numeric: {
            type: 'number',
            description: 'Always a number',
            required: false,
            defaultValue: 123,
          },
          overriden: {
            type: 'number',
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
          textual: 'string',
          numeric: 'number',
          overriden: 'number',
          textualButDefaultNumeric: 'string',
        },
        resolver: async ({ textual, numeric, overriden, textualButDefaultNumeric }) => {
          return {
            textual,
            numeric,
            overriden,
            textualButDefaultNumeric:
              typeof textualButDefaultNumeric === 'number'
                ? (textualButDefaultNumeric + 10).toString()
                : textualButDefaultNumeric,
          };
        },
      }),
    });

    const result = await schema.execute('testDefaultValue', {
      textual: undefined,
      numeric: undefined,
      overriden: 40,
      textualButDefaultNumeric: undefined,
    });
    expect(result).toEqual({
      textual: 'abc',
      numeric: 123,
      overriden: 40,
      textualButDefaultNumeric: '466',
    });
  });

  test('handler with a optional object', async () => {
    const schema = new Schema({
      testWithOptionalObject: new Resolver({
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
          optionalObject: {
            name: 'string',
          },
        },
        resolver: async ({ optionalObject }) => {
          return {
            optionalObject,
          };
        },
      }),
    });

    const result1 = await schema.execute('testWithOptionalObject', {
      optionalObject: undefined,
    });
    const result2 = await schema.execute('testWithOptionalObject', {
      optionalObject: {
        name: 'John',
      },
    });

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
      sayHelloTo: new Resolver({
        description: 'Returns a string with a name and value',
        input: {
          name: {
            type: 'string',
            description: 'Name to say hello to',
          },
          value: {
            type: 'number',
            description: 'Value to be sent with the message',
          },
        },
        output: {
          fullMessage: 'string',
          onlyName: 'string',
          onlyValue: 'number',
        },
        resolver: async ({ name, value }) => {
          return {
            fullMessage: `Hello ${name}! Value: ${value}`,
            onlyName: name,
            onlyValue: value,
          };
        },
      }),
    });

    const result = await schema.execute('sayHelloTo', {
      name: 'John',
      value: 123,
    });

    expect(result).toEqual({
      fullMessage: 'Hello John! Value: 123',
      onlyName: 'John',
      onlyValue: 123,
    });
  });

  test('handler with list of primitives as argument', async () => {
    const schema = new Schema({
      listNicknames: new Resolver({
        description: 'Return formatted nicknames',
        input: {
          nicknames: [
            {
              type: 'string',
              description: 'Nicknames',
            },
          ],
        },
        output: {
          nicknames: ['string'],
          formattedNicknames: 'string',
          numberOfNicknames: 'number',
        },
        resolver: async ({ nicknames }) => {
          const formattedNicknames = nicknames.join(', ');

          return {
            nicknames,
            formattedNicknames,
            numberOfNicknames: nicknames.length,
          };
        },
      }),
    });

    const result = await schema.execute('listNicknames', {
      nicknames: ['John', 'Joe', 'Jack'],
    });

    expect(result).toEqual({
      nicknames: ['John', 'Joe', 'Jack'],
      formattedNicknames: 'John, Joe, Jack',
      numberOfNicknames: 3,
    });
  });

  test('handler with object as argument', async () => {
    const schema = new Schema({
      makeOrder: new Resolver({
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
                type: 'number',
                description: 'Amount of the product',
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
                    type: 'number',
                    description: 'Number',
                  },
                },
              },
            },
          },
        },
        output: {
          orderId: 'string',
          product: {
            id: 'string',
            amount: 'number',
          },
        },
        resolver: async ({ product }) => {
          return {
            orderId: '1234',
            product,
          };
        },
      }),
    });

    const result = await schema.execute('makeOrder', {
      product: {
        id: '123',
        amount: 2,
        address: {
          street: 'Main Street',
          number: 123,
        },
      },
    });

    expect(result).toEqual({
      orderId: '1234',
      product: {
        id: '123',
        amount: 2,
        address: {
          street: 'Main Street',
          number: 123,
        },
      },
    });
  });

  test('handler with list of objects as argument', async () => {
    const schema = new Schema({
      listCars: new Resolver({
        description: 'Return formatted cars',
        input: {
          cars: [
            {
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
                accessories: [
                  {
                    type: 'string',
                    description: 'Accessories of the car',
                  },
                ],
              },
            },
          ],
        },
        output: {
          formattedCars: 'string',
          numberOfCars: 'number',
          cars: [
            {
              name: 'string',
              color: 'string',
            },
          ],
        },
        resolver: async ({ cars }) => {
          const formattedCars = cars.map((car) => `${car.name} (${car.color})`).join(', ');

          return {
            formattedCars,
            numberOfCars: cars.length,
            cars,
          };
        },
      }),
    });

    const result = await schema.execute('listCars', {
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
    });

    expect(result.cars).toHaveLength(2);

    expect(result).toEqual({
      formattedCars: 'BMW (black), Audi (white)',
      numberOfCars: 2,
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
    });
  });

  test('check if resolver exists', async () => {
    const schema = new Schema({
      forbiddenResolver: new Resolver({
        description: "Resolver that won't be called",
        input: {},
        output: 'boolean',
        resolver: async () => {
          throw new Error('This resolver should not be called');
        },
      }),
    });

    try {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      await schema.execute('invalidResolver', {});
      throw new Error('Should not be called');
    } catch (e) {
      if (!(e instanceof Error)) {
        throw new Error('Wrong error type');
      }

      expect(e.message).toEqual('Resolver "invalidResolver" does not exist');
    }
  });

  test('check if handler exists', async () => {
    const schema = new Schema({
      corruptedResolver: new Resolver({
        description: "Resolver that won't be called",
        input: {},
        output: 'boolean',
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        resolver: undefined,
      }),
    });

    expect(() => schema.execute('corruptedResolver', {})).rejects.toThrowError(
      'Resolver "corruptedResolver" does not have a handler',
    );
  });
});
