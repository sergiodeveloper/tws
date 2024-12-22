import type {
  ObjectTypeDefinition,
  PrimitiveTypeDefinition,
  PrimitiveTypeName,
} from '@tws-js/common';

import { SafeError, Validation } from '../../src/validation';

const OUTPUT_IS_REQUIRED = 'Output is required';
const OUTPUT_MUST_BE_A_STRING = 'Output must be a string';

describe('Validation', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('method toJSON from SafeError', async () => {
    const error = new SafeError('test');
    expect(error.toJSON()).toEqual('test');
  });

  test('validate primitive input with missing value', async () => {
    const typeDefinition = {
      type: 'string' as const,
      description: 'desc',
      required: true,
    };

    expect(() => Validation.validatePrimitiveInput('a', undefined, typeDefinition)).toThrow(
      '"a" is required',
    );
  });

  test('validate primitive input with invalid string', async () => {
    const typeDefinition = {
      type: 'string' as const,
      description: 'desc',
      required: true,
    };

    expect(() => Validation.validatePrimitiveInput('b', 1, typeDefinition)).toThrow(
      '"b" must be a string',
    );
  });

  test('validate primitive input with invalid int', async () => {
    const typeDefinition = {
      type: 'int' as const,
      description: 'desc',
      required: true,
    };

    expect(() => Validation.validatePrimitiveInput('b', 1.3, typeDefinition)).toThrow(
      '"b" must be a valid integer',
    );
  });

  test('validate primitive input with invalid float', async () => {
    const typeDefinition = {
      type: 'float' as const,
      description: 'desc',
      required: true,
    };

    expect(() => Validation.validatePrimitiveInput('b', '1.7', typeDefinition)).toThrow(
      '"b" must be a valid float',
    );
  });

  test('validate primitive input with invalid boolean', async () => {
    const typeDefinition = {
      type: 'boolean' as const,
      description: 'desc',
      required: true,
    };

    expect(() => Validation.validatePrimitiveInput('b', 1, typeDefinition)).toThrow(
      '"b" must be a boolean',
    );
  });

  test('validate primitive input with invalid input type', async () => {
    const typeDefinition = {
      type: 'abcd' as PrimitiveTypeName,
      description: 'desc',
      required: true,
    };

    expect(() => Validation.validatePrimitiveInput('c', 1, typeDefinition)).toThrow(
      `Unknown primitive type "abcd" for "c"`,
    );
  });

  test('validate object input with missing value', async () => {
    const typeDefinition = {
      type: 'object' as const,
      description: 'desc',
      required: true,
      properties: {},
    };

    expect(() => Validation.validateObjectInput('d', undefined, typeDefinition)).toThrow(
      '"d" is required',
    );
  });

  test('validate object input passing a non-object', async () => {
    const typeDefinition: ObjectTypeDefinition = {
      type: 'object' as const,
      description: 'desc',
      required: true,
      properties: {},
    };

    expect(() =>
      Validation.validateObjectInput(
        'e',
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        1,
        typeDefinition,
      ),
    ).toThrow('"e" must be an object');
  });

  test('validate enum input with missing value', async () => {
    const typeDefinition = {
      a: {
        type: 'enum' as const,
        description: 'desc',
        required: true,
        values: { a: {}, b: {} },
      },
    };

    expect(() => Validation.validateRootObjectInput({}, typeDefinition)).toThrow('"a" is required');
  });

  test('validate enum input with invalid default value', async () => {
    const typeDefinition = {
      a: {
        type: 'enum' as const,
        required: false,
        values: { a: {}, b: {} },
        defaultValue: 'c',
      },
    };

    expect(() => Validation.validateRootObjectInput({}, typeDefinition)).toThrow(
      'Default value for "a" must be one of: a, b',
    );
  });

  test('validate enum input with default value', async () => {
    const typeDefinition = {
      a: {
        type: 'enum' as const,
        required: false,
        values: { a: {}, b: {} },
        defaultValue: 'a',
      },
    };

    expect(Validation.validateRootObjectInput({}, typeDefinition)).toEqual({ a: 'a' });
  });

  test('validate enum input with invalid value', async () => {
    const typeDefinition = {
      a: {
        type: 'enum' as const,
        values: { a: {}, b: {} },
      },
    };

    expect(() => Validation.validateRootObjectInput({ a: 'c' }, typeDefinition)).toThrow(
      '"a" must be one of: a, b',
    );
  });

  test('validate enum input with non-string value', async () => {
    const typeDefinition = {
      a: {
        type: 'enum' as const,
        values: { a: {}, b: {} },
      },
    };

    expect(() => Validation.validateRootObjectInput({ a: 1 }, typeDefinition)).toThrow(
      '"a" must be a string',
    );
  });

  test('validate array input with missing or non-array value', async () => {
    const typeDefinition: PrimitiveTypeDefinition = {
      type: 'string' as const,
      description: 'desc',
      required: true,
    };

    expect(() =>
      Validation.validateArrayInput('f', undefined, {
        type: 'array',
        item: typeDefinition,
      }),
    ).toThrow('"f" is required');

    expect(() =>
      Validation.validateArrayInput(
        'g',
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        1,
        { type: 'array', item: typeDefinition },
      ),
    ).toThrow('"g" must be an array');
  });

  test('validate root object input with missing or non-object input', async () => {
    const typeDefinition = {
      name: {
        type: 'string' as const,
        description: 'desc',
        required: true,
      },
    };

    expect(() =>
      Validation.validateRootObjectInput(
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        undefined,
        typeDefinition,
      ),
    ).toThrow('Input is required');

    expect(() =>
      Validation.validateRootObjectInput(
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        1,
        typeDefinition,
      ),
    ).toThrow('Input must be an object');
  });

  test('validate root object input with array of arrays', async () => {
    const typeDefinition = {
      name: {
        type: 'array' as const,
        description: 'desc',
        required: true,
        item: {
          type: 'array' as const,
          item: {
            type: 'string' as const,
          },
        },
      },
    };

    const result = Validation.validateRootObjectInput(
      {
        name: [
          ['a', 'b'],
          ['c', 'd'],
        ],
      },
      typeDefinition,
    );

    expect(result).toEqual({
      name: [
        ['a', 'b'],
        ['c', 'd'],
      ],
    });
  });

  test('validate root object input with array of enums', async () => {
    const typeDefinition = {
      name: {
        type: 'array' as const,
        description: 'desc',
        required: true,
        item: {
          type: 'enum' as const,
          values: { a: {}, b: {} },
        },
      },
    };

    const result = Validation.validateRootObjectInput(
      {
        name: ['a', 'b'],
      },
      typeDefinition,
    );

    expect(result).toEqual({
      name: ['a', 'b'],
    });
  });

  test('validate output with primitive type', async () => {
    expect(Validation.validateAndCleanOutput({ type: 'string' as const }, 'a')).toEqual('a');
  });

  test('validate output with empty primitive type', async () => {
    expect(
      Validation.validateAndCleanOutput({ type: 'string' as const, required: false }, undefined),
    ).toEqual(undefined);
  });

  test('validate output with missing required primitive type', async () => {
    expect(() => Validation.validateAndCleanOutput({ type: 'string' as const }, undefined)).toThrow(
      OUTPUT_IS_REQUIRED,
    );

    expect(() =>
      Validation.validateAndCleanOutput(
        {
          type: 'object' as const,
          properties: {
            a: { type: 'string' as const, required: true },
          },
        },
        { a: undefined },
      ),
    ).toThrow('Output "a" is required');
  });

  test('validate output with invalid strinssssg', async () => {
    expect(() => Validation.validateAndCleanOutput({ type: 'string' as const }, 1)).toThrow(
      OUTPUT_MUST_BE_A_STRING,
    );

    expect(() =>
      Validation.validateAndCleanOutput(
        {
          type: 'object' as const,
          properties: {
            test: { type: 'string' as const },
          },
        },
        { test: 1 },
      ),
    ).toThrow('Output "test" must be a string');
  });

  test('validate output with invalid integer', async () => {
    expect(() => Validation.validateAndCleanOutput({ type: 'int' as const }, 'a')).toThrow(
      'Output must be an integer',
    );

    expect(() =>
      Validation.validateAndCleanOutput(
        {
          type: 'object' as const,
          properties: {
            a: { type: 'int' as const },
          },
        },
        { a: 'a' },
      ),
    ).toThrow('Output "a" must be an integer');
  });

  test('validate output with invalid float', async () => {
    expect(() => Validation.validateAndCleanOutput({ type: 'float' as const }, 'a')).toThrow(
      'Output must be a float',
    );

    expect(() =>
      Validation.validateAndCleanOutput(
        {
          type: 'object' as const,
          properties: {
            a: { type: 'float' as const },
          },
        },
        { a: 'a' },
      ),
    ).toThrow('Output "a" must be a float');
  });

  test('validate output with invalid boolean', async () => {
    expect(() => Validation.validateAndCleanOutput({ type: 'boolean' as const }, 'a')).toThrow(
      'Output must be a boolean',
    );

    expect(() =>
      Validation.validateAndCleanOutput(
        {
          type: 'object' as const,
          properties: {
            a: { type: 'boolean' as const },
          },
        },
        { a: 'a' },
      ),
    ).toThrow('Output "a" must be a boolean');
  });

  test('validate output with missing enum', async () => {
    expect(() =>
      Validation.validateAndCleanOutput(
        {
          type: 'enum' as const,
          values: { a: {}, b: {} },
        },
        undefined,
      ),
    ).toThrow(OUTPUT_IS_REQUIRED);

    expect(() =>
      Validation.validateAndCleanOutput(
        {
          type: 'object' as const,
          properties: {
            a: { type: 'enum' as const, values: { a: {}, b: {} } },
          },
        },
        { a: undefined },
      ),
    ).toThrow('Output "a" is required');

    expect(
      Validation.validateAndCleanOutput(
        {
          type: 'enum' as const,
          values: { a: {}, b: {} },
          required: false,
        },
        undefined,
      ),
    ).toEqual(undefined);
  });

  test('validate output with non-string enum', async () => {
    expect(() =>
      Validation.validateAndCleanOutput(
        {
          type: 'enum' as const,
          values: { a: {}, b: {} },
        },
        5,
      ),
    ).toThrow(OUTPUT_MUST_BE_A_STRING);

    expect(() =>
      Validation.validateAndCleanOutput(
        {
          type: 'object' as const,
          properties: {
            a: { type: 'enum' as const, values: { a: {}, b: {} } },
          },
        },
        { a: 5 },
      ),
    ).toThrow('Output "a" must be a string');
  });

  test('validate output with invalid enum', async () => {
    expect(() =>
      Validation.validateAndCleanOutput(
        {
          type: 'enum' as const,
          values: { a: {}, b: {} },
        },
        'c',
      ),
    ).toThrow('Output must be one of: a, b');

    expect(() =>
      Validation.validateAndCleanOutput(
        {
          type: 'object' as const,
          properties: {
            a: { type: 'enum' as const, values: { a: {}, b: {} } },
          },
        },
        { a: 'c' },
      ),
    ).toThrow('Output "a" must be one of: a, b');
  });

  test('validate output with invalid array', async () => {
    expect(() =>
      Validation.validateAndCleanOutput(
        {
          type: 'array' as const,
          item: { type: 'string' as const },
        },
        5,
      ),
    ).toThrow('Output must be an array');

    expect(() =>
      Validation.validateAndCleanOutput(
        {
          type: 'object' as const,
          properties: {
            a: {
              type: 'array' as const,
              item: { type: 'string' as const },
            },
          },
        },
        { a: 5 },
      ),
    ).toThrow('Output "a" must be an array');
  });

  test('validate output with array of valid arrays', async () => {
    expect(
      Validation.validateAndCleanOutput(
        {
          type: 'array' as const,
          item: {
            type: 'array' as const,
            item: { type: 'string' as const },
          },
        },
        [['a'], ['b']],
      ),
    ).toEqual([['a'], ['b']]);
  });

  test('validate output with array of enum', async () => {
    expect(
      Validation.validateAndCleanOutput(
        {
          type: 'array' as const,
          item: {
            type: 'enum' as const,
            values: { a: {}, b: {} },
          },
        },
        ['a', 'b'],
      ),
    ).toEqual(['a', 'b']);
  });

  test('validate output with missing object', async () => {
    expect(() =>
      Validation.validateAndCleanOutput(
        {
          type: 'object' as const,
          properties: {
            a: { type: 'string' as const },
          },
        },
        undefined,
      ),
    ).toThrow(OUTPUT_IS_REQUIRED);

    expect(() =>
      Validation.validateAndCleanOutput(
        {
          type: 'object' as const,
          properties: {
            obj: {
              type: 'object' as const,
              properties: {
                a: { type: 'string' as const },
              },
            },
          },
        },
        {
          obj: undefined,
        },
      ),
    ).toThrow('Output "obj" is required');

    expect(
      Validation.validateAndCleanOutput(
        {
          type: 'object' as const,
          properties: {
            a: { type: 'string' as const },
          },
          required: false,
        },
        undefined,
      ),
    ).toEqual(undefined);
  });

  test('validate output with invalid object', async () => {
    expect(() =>
      Validation.validateAndCleanOutput(
        {
          type: 'object' as const,
          properties: {
            a: { type: 'string' as const },
          },
        },
        5,
      ),
    ).toThrow('Output must be an object');

    expect(() =>
      Validation.validateAndCleanOutput(
        {
          type: 'object' as const,
          properties: {
            obj: {
              type: 'object' as const,
              properties: {
                a: { type: 'string' as const },
              },
            },
          },
        },
        {
          obj: 5,
        },
      ),
    ).toThrow('Output "obj" must be an object');
  });
});
