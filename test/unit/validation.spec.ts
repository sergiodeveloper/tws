import { SafeError, Validation } from '../../src/validation';

const OUTPUT_REQUIRED_ERROR = '"Output is required"';

describe('Validation', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('SafeError.constructor successfully', async () => {
    const error = new SafeError('test');
    expect(error.message).toBe('test');
  });

  test('SafeError.constructor with a long message', async () => {
    const longMessage = 'a'.repeat(1000);
    const error = new SafeError(longMessage);
    expect(error.message).toHaveLength(150);
  });

  test('SafeError.toString successfully', async () => {
    const error = new SafeError('test');
    expect(error.toString()).toBe('test');
  });

  test('SafeError.toJSON successfully', async () => {
    const error = new SafeError('test');
    expect(error.toJSON()).toEqual('test');
  });

  test('unknownIsObject', async () => {
    expect(Validation.unknownIsObject({})).toBe(true);
    expect(Validation.unknownIsObject([])).toBe(false);
    expect(Validation.unknownIsObject('test')).toBe(false);
    expect(Validation.unknownIsObject(1)).toBe(false);
    expect(Validation.unknownIsObject(true)).toBe(false);
    expect(Validation.unknownIsObject(null)).toBe(false);
    expect(Validation.unknownIsObject(undefined)).toBe(false);
  });

  test('validateString', async () => {
    expect(Validation.validateString('myString', 'test')).toBe('test');

    expect(() => {
      Validation.validateString('myString', 1);
    }).toThrowErrorMatchingInlineSnapshot('""myString" must be a string"');
  });

  test('validateInt', async () => {
    expect(Validation.validateInt('test', 1)).toBe(1);

    expect(() => {
      Validation.validateInt('test', 'test');
    }).toThrowErrorMatchingInlineSnapshot('""test" must be a valid integer"');
  });

  test('validateFloat', async () => {
    expect(Validation.validateFloat('test', 1.1)).toBe(1.1);

    expect(() => {
      Validation.validateFloat('test', 'test');
    }).toThrowErrorMatchingInlineSnapshot('""test" must be a valid float"');
  });

  test('validateBoolean', async () => {
    expect(Validation.validateBoolean('test', true)).toBe(true);

    expect(() => {
      Validation.validateBoolean('test', 'test');
    }).toThrowErrorMatchingInlineSnapshot('""test" must be a boolean"');
  });

  test('validatePrimitiveInput successfully', async () => {
    expect(Validation.validatePrimitiveInput('test', 'test', { type: 'string' })).toBe('test');

    expect(Validation.validatePrimitiveInput('test', 1, { type: 'int' })).toBe(1);

    expect(Validation.validatePrimitiveInput('test', 1.1, { type: 'float' })).toBe(1.1);

    expect(Validation.validatePrimitiveInput('test', true, { type: 'boolean' })).toBe(true);
  });

  test('validatePrimitiveInput with default value', async () => {
    const result = Validation.validatePrimitiveInput('test', undefined, {
      type: 'string',
      description: '',
      defaultValue: 'test',
    });

    expect(result).toBe('test');
  });

  test('validatePrimitiveInput with empty value not required', async () => {
    const result = Validation.validatePrimitiveInput('test', undefined, {
      type: 'string',
      description: '',
      required: false,
    });

    expect(result).toBe(undefined);
  });

  test('validatePrimitiveInput with empty value and no default', async () => {
    expect(() => {
      Validation.validatePrimitiveInput('field', undefined, {
        type: 'string',
        description: '',
      });
    }).toThrowErrorMatchingInlineSnapshot('""field" is required"');
  });

  test('validatePrimitiveInput with wrong type', async () => {
    expect(() => {
      Validation.validatePrimitiveInput('test', 1, {
        type: 'string',
        description: '',
      });
    }).toThrowErrorMatchingInlineSnapshot('""test" must be a string"');
  });

  test('validatePrimitiveInput with unknown type', async () => {
    expect(() => {
      Validation.validatePrimitiveInput('test', 'test', {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        type: 'unknown',
        description: '',
      });
    }).toThrowErrorMatchingInlineSnapshot('"Unknown primitive type "unknown" for "test""');
  });

  test('validateObjectInput successfully', async () => {
    jest.spyOn(Validation, 'validateArrayInput').mockImplementation(() => 10);
    jest.spyOn(Validation, 'validatePrimitiveInput').mockImplementation(() => 30);
    jest.spyOn(Validation, 'validateEnumInput').mockImplementation(() => 'test');

    const input = {
      test: 'value',
    };

    const result = Validation.validateObjectInput(
      'test',
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      input,
      {
        type: 'object',
        description: '',
        properties: {
          test: {
            type: 'string',
            description: '',
          },
        },
      },
    );

    expect(input).toEqual({
      test: 30,
    });

    expect(result).toEqual(undefined);

    expect(Validation.validateArrayInput).not.toHaveBeenCalled();
    expect(Validation.validatePrimitiveInput).toHaveBeenCalledWith('test', 'value', {
      type: 'string',
      description: '',
    });
    expect(Validation.validateEnumInput).not.toHaveBeenCalled();
  });

  test('validateObjectInput with empty value', async () => {
    jest.spyOn(Validation, 'validateArrayInput').mockImplementation(() => 10);
    jest.spyOn(Validation, 'validatePrimitiveInput').mockImplementation(() => 30);
    jest.spyOn(Validation, 'validateEnumInput').mockImplementation(() => 'test');

    const result = Validation.validateObjectInput('test', undefined, {
      type: 'object',
      description: '',
      required: false,
      properties: {},
    });

    expect(result).toEqual(undefined);

    expect(Validation.validateArrayInput).not.toHaveBeenCalled();
    expect(Validation.validatePrimitiveInput).not.toHaveBeenCalled();
    expect(Validation.validateEnumInput).not.toHaveBeenCalled();
  });

  test('validateObjectInput with empty value and no default', async () => {
    jest.spyOn(Validation, 'validateArrayInput').mockImplementation(() => 10);
    jest.spyOn(Validation, 'validatePrimitiveInput').mockImplementation(() => 30);
    jest.spyOn(Validation, 'validateEnumInput').mockImplementation(() => 'test');

    expect(() => {
      Validation.validateObjectInput('test', undefined, {
        type: 'object',
        description: '',
        properties: {},
      });
    }).toThrowErrorMatchingInlineSnapshot('""test" is required"');

    expect(Validation.validateArrayInput).not.toHaveBeenCalled();
    expect(Validation.validatePrimitiveInput).not.toHaveBeenCalled();
    expect(Validation.validateEnumInput).not.toHaveBeenCalled();
  });

  test('validateObjectInput with wrong type', async () => {
    jest.spyOn(Validation, 'validateArrayInput').mockImplementation(() => 10);
    jest.spyOn(Validation, 'validatePrimitiveInput').mockImplementation(() => 30);
    jest.spyOn(Validation, 'validateEnumInput').mockImplementation(() => 'test');

    expect(() => {
      Validation.validateObjectInput(
        'test',
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        1,
        {
          type: 'object',
          description: '',
          properties: {},
        },
      );
    }).toThrowErrorMatchingInlineSnapshot('""test" must be an object"');

    expect(Validation.validateArrayInput).not.toHaveBeenCalled();
    expect(Validation.validatePrimitiveInput).not.toHaveBeenCalled();
    expect(Validation.validateEnumInput).not.toHaveBeenCalled();
  });

  test('validateObjectInput with array attribute', async () => {
    jest.spyOn(Validation, 'validateArrayInput').mockImplementation(() => 10);
    jest.spyOn(Validation, 'validatePrimitiveInput').mockImplementation(() => 30);
    jest.spyOn(Validation, 'validateEnumInput').mockImplementation(() => 'test');

    const input = {
      test: ['value'],
    };

    const result = Validation.validateObjectInput(
      'test',
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      input,
      {
        type: 'object',
        description: '',
        properties: {
          test: {
            type: 'array',
            item: {
              type: 'string',
              description: '',
            },
          },
        },
      },
    );

    expect(input).toEqual({
      test: ['value'],
    });

    expect(result).toEqual(undefined);

    expect(Validation.validateArrayInput).toHaveBeenCalledWith('test', ['value'], {
      type: 'array',
      item: {
        type: 'string',
        description: '',
      },
    });
    expect(Validation.validatePrimitiveInput).not.toHaveBeenCalled();
    expect(Validation.validateEnumInput).not.toHaveBeenCalled();
  });

  test('validateObjectInput with object attribute', async () => {
    jest.spyOn(Validation, 'validateArrayInput').mockImplementation(() => 10);
    jest.spyOn(Validation, 'validatePrimitiveInput').mockImplementation(() => 30);
    jest.spyOn(Validation, 'validateEnumInput').mockImplementation(() => 'test');

    const input = {
      test: {
        test: {},
      },
    };

    const result = Validation.validateObjectInput(
      'test',
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      input,
      {
        type: 'object',
        description: '',
        properties: {
          test: {
            type: 'object',
            description: '',
            properties: {},
          },
        },
      },
    );

    expect(input).toEqual({
      test: {
        test: {},
      },
    });

    expect(result).toEqual(undefined);

    expect(Validation.validateArrayInput).not.toHaveBeenCalled();
    expect(Validation.validatePrimitiveInput).not.toHaveBeenCalled();
    expect(Validation.validateEnumInput).not.toHaveBeenCalled();
  });

  test('validateObjectInput with enum attribute', async () => {
    jest.spyOn(Validation, 'validateArrayInput').mockImplementation(() => 10);
    jest.spyOn(Validation, 'validatePrimitiveInput').mockImplementation(() => 30);
    jest.spyOn(Validation, 'validateEnumInput').mockImplementation(() => 'test');

    const input = {
      test: 'value',
    };

    const result = Validation.validateObjectInput(
      'test',
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      input,
      {
        type: 'object',
        properties: {
          test: {
            type: 'enum',
            values: {},
          },
        },
      },
    );

    expect(input).toEqual({
      test: 'value',
    });

    expect(result).toEqual(undefined);

    expect(Validation.validateArrayInput).not.toHaveBeenCalled();
    expect(Validation.validatePrimitiveInput).not.toHaveBeenCalled();
    expect(Validation.validateEnumInput).toHaveBeenCalledWith('test', 'value', {
      type: 'enum',
      values: {},
    });
  });

  test('validateEnumInput', async () => {
    const result = Validation.validateEnumInput('test', 'value', {
      type: 'enum',
      values: {
        value: {},
      },
    });

    expect(result).toEqual('value');
  });

  test('validateEnumInput with default value', async () => {
    const result = Validation.validateEnumInput('test', undefined, {
      type: 'enum',
      required: false,
      values: {
        value: {},
      },
      defaultValue: 'value',
    });

    expect(result).toEqual('value');
  });

  test('validateEnumInput with invalid default value', async () => {
    expect(() => {
      Validation.validateEnumInput('test', undefined, {
        type: 'enum',
        required: false,
        values: {
          value: {},
        },
        defaultValue: 'value2',
      });
    }).toThrowErrorMatchingInlineSnapshot('"Default value for "test" must be one of: value"');
  });

  test('validateEnumInput with missing value', async () => {
    expect(() => {
      Validation.validateEnumInput('test', undefined, {
        type: 'enum',
        required: true,
        values: {
          value: {},
        },
      });
    }).toThrowErrorMatchingInlineSnapshot('""test" is required"');
  });

  test('validateEnumInput with non-string', async () => {
    expect(() => {
      Validation.validateEnumInput('test', 4, {
        type: 'enum',
        values: {
          value: {},
        },
      });
    }).toThrowErrorMatchingInlineSnapshot('""test" must be a string"');
  });

  test('validateEnumInput with invalid value', async () => {
    expect(() => {
      Validation.validateEnumInput('test', 'value2', {
        type: 'enum',
        values: {
          value: {},
        },
      });
    }).toThrowErrorMatchingInlineSnapshot('""test" must be one of: value"');
  });

  test('validateArrayInput', async () => {
    jest.spyOn(Validation, 'validateObjectInput').mockImplementation(() => 10);
    jest.spyOn(Validation, 'validatePrimitiveInput').mockImplementation(() => 20);

    const input = ['value'];

    const result = Validation.validateArrayInput('test', input, {
      type: 'array',
      item: {
        type: 'string',
        description: '',
      },
    });

    expect(result).toEqual(undefined);

    expect(input).toEqual([20]);

    expect(Validation.validateObjectInput).not.toHaveBeenCalled();
    expect(Validation.validatePrimitiveInput).toHaveBeenCalledWith('test', 'value', {
      type: 'string',
      description: '',
    });
  });

  test('validateArrayInput with empty value', async () => {
    jest.spyOn(Validation, 'validateObjectInput').mockImplementation(() => 10);
    jest.spyOn(Validation, 'validatePrimitiveInput').mockImplementation(() => 20);

    expect(() => {
      Validation.validateArrayInput('field', undefined, {
        type: 'array',
        item: {
          type: 'string',
          description: '',
        },
      });
    }).toThrowErrorMatchingInlineSnapshot('""field" is required"');

    expect(Validation.validateObjectInput).not.toHaveBeenCalled();
    expect(Validation.validatePrimitiveInput).not.toHaveBeenCalled();
  });

  test('validateArrayInput with wrong type', async () => {
    jest.spyOn(Validation, 'validateObjectInput').mockImplementation(() => 10);
    jest.spyOn(Validation, 'validatePrimitiveInput').mockImplementation(() => 20);

    expect(() => {
      Validation.validateArrayInput(
        'test',
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        1,
        {
          type: 'array',
          item: {
            type: 'string',
            description: '',
          },
        },
      );
    }).toThrowErrorMatchingInlineSnapshot('""test" must be an array"');

    expect(Validation.validateObjectInput).not.toHaveBeenCalled();
    expect(Validation.validatePrimitiveInput).not.toHaveBeenCalled();
  });

  test('validateArrayInput with a list of objects', async () => {
    jest.spyOn(Validation, 'validateObjectInput').mockImplementation(() => 10);
    jest.spyOn(Validation, 'validatePrimitiveInput').mockImplementation(() => 20);

    const input = [
      {
        test: 'value',
      },
    ];

    const result = Validation.validateArrayInput(
      'test',
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      input,
      {
        type: 'array',
        item: {
          type: 'object',
          description: '',
          properties: {
            test: {
              type: 'string',
              description: '',
            },
          },
        },
      },
    );

    expect(result).toEqual(undefined);

    expect(input).toEqual([
      {
        test: 'value',
      },
    ]);

    expect(Validation.validateObjectInput).toHaveBeenCalledWith(
      'test',
      {
        test: 'value',
      },
      {
        type: 'object',
        description: '',
        properties: {
          test: {
            type: 'string',
            description: '',
          },
        },
      },
    );
    expect(Validation.validatePrimitiveInput).not.toHaveBeenCalled();
  });

  test('validateArrayInput with a list of arrays', async () => {
    jest.spyOn(Validation, 'validateObjectInput').mockImplementation(() => 10);
    jest.spyOn(Validation, 'validateArrayInput');

    const input = [['value']];

    const result = Validation.validateArrayInput(
      'test',
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      input,
      {
        type: 'array',
        item: {
          type: 'array',
          item: {
            type: 'string',
          },
        },
      },
    );

    expect(result).toEqual(undefined);

    expect(Validation.validateObjectInput).not.toHaveBeenCalled();
    expect(Validation.validateArrayInput).toHaveBeenCalledTimes(2);
    expect(Validation.validateArrayInput).toHaveBeenNthCalledWith(2, 'test', ['value'], {
      type: 'array',
      item: {
        type: 'string',
      },
    });
  });

  test('validateArrayInput with a list of enums', async () => {
    jest.spyOn(Validation, 'validateObjectInput').mockImplementation(() => 10);
    jest.spyOn(Validation, 'validatePrimitiveInput').mockImplementation(() => 20);
    jest.spyOn(Validation, 'validateEnumInput').mockImplementation(() => 'value');

    const input = ['value'];

    const result = Validation.validateArrayInput(
      'test',
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      input,
      {
        type: 'array',
        item: {
          type: 'enum',
          values: {
            value: {},
          },
        },
      },
    );

    expect(result).toEqual(undefined);

    expect(Validation.validateObjectInput).not.toHaveBeenCalled();
    expect(Validation.validatePrimitiveInput).not.toHaveBeenCalled();
    expect(Validation.validateEnumInput).toHaveBeenCalledWith('test', 'value', {
      type: 'enum',
      values: {
        value: {},
      },
    });
  });

  test('validateRootObjectInput', async () => {
    jest.spyOn(Validation, 'validateArrayInput').mockImplementation(() => 10);
    jest.spyOn(Validation, 'validateObjectInput').mockImplementation(() => 20);
    jest.spyOn(Validation, 'validateEnumInput').mockImplementation(() => 'value');
    jest.spyOn(Validation, 'validatePrimitiveInput').mockImplementation(() => 30);

    const input = {
      test: 'value',
    };

    const result = Validation.validateRootObjectInput(
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      input,
      {
        test: {
          type: 'string',
          description: '',
        },
      },
    );

    expect(result).toEqual({
      test: 30,
    });

    expect(input).toEqual({
      test: 'value',
    });

    expect(Validation.validateArrayInput).not.toHaveBeenCalled();
    expect(Validation.validateObjectInput).not.toHaveBeenCalled();
    expect(Validation.validateEnumInput).not.toHaveBeenCalled();
    expect(Validation.validatePrimitiveInput).toHaveBeenCalledWith('test', 'value', {
      type: 'string',
      description: '',
    });
  });

  test('validateRootObjectInput with empty input', async () => {
    jest.spyOn(Validation, 'validateArrayInput').mockImplementation(() => 10);
    jest.spyOn(Validation, 'validateObjectInput').mockImplementation(() => 20);
    jest.spyOn(Validation, 'validateEnumInput').mockImplementation(() => 'test');
    jest.spyOn(Validation, 'validatePrimitiveInput').mockImplementation(() => 30);

    expect(() =>
      Validation.validateRootObjectInput(
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        null,
        {
          test: {
            type: 'string',
            description: '',
          },
        },
      ),
    ).toThrowErrorMatchingInlineSnapshot('"Input is required"');

    expect(Validation.validateArrayInput).not.toHaveBeenCalled();
    expect(Validation.validateObjectInput).not.toHaveBeenCalled();
    expect(Validation.validateEnumInput).not.toHaveBeenCalled();
    expect(Validation.validatePrimitiveInput).not.toHaveBeenCalled();
  });

  test('validateRootObjectInput with a non object', async () => {
    jest.spyOn(Validation, 'validateArrayInput').mockImplementation(() => 10);
    jest.spyOn(Validation, 'validateObjectInput').mockImplementation(() => 20);
    jest.spyOn(Validation, 'validateEnumInput').mockImplementation(() => 'test');
    jest.spyOn(Validation, 'validatePrimitiveInput').mockImplementation(() => 30);

    expect(() =>
      Validation.validateRootObjectInput(
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        10,
        {
          test: {
            type: 'string',
            description: '',
          },
        },
      ),
    ).toThrowErrorMatchingInlineSnapshot('"Input must be an object"');

    expect(Validation.validateArrayInput).not.toHaveBeenCalled();
    expect(Validation.validateObjectInput).not.toHaveBeenCalled();
    expect(Validation.validateEnumInput).not.toHaveBeenCalled();
    expect(Validation.validatePrimitiveInput).not.toHaveBeenCalled();
  });

  test('validateRootObjectInput with array attribute', async () => {
    jest.spyOn(Validation, 'validateArrayInput').mockImplementation(() => 10);
    jest.spyOn(Validation, 'validateObjectInput').mockImplementation(() => 20);
    jest.spyOn(Validation, 'validateEnumInput').mockImplementation(() => 'value');
    jest.spyOn(Validation, 'validatePrimitiveInput').mockImplementation(() => 30);

    const input = {
      array: [10],
    };

    const result = Validation.validateRootObjectInput(
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      input,
      {
        array: {
          type: 'array',
          item: {
            type: 'int',
            description: '',
          },
        },
      },
    );

    expect(result).toEqual(input);

    expect(Validation.validateArrayInput).toHaveBeenCalledWith('array', [10], {
      type: 'array',
      item: {
        type: 'int',
        description: '',
      },
    });

    expect(Validation.validateObjectInput).not.toHaveBeenCalled();
    expect(Validation.validateEnumInput).not.toHaveBeenCalled();
    expect(Validation.validatePrimitiveInput).not.toHaveBeenCalled();
  });

  test('validateRootObjectInput with object attribute', async () => {
    jest.spyOn(Validation, 'validateArrayInput').mockImplementation(() => 10);
    jest.spyOn(Validation, 'validateObjectInput').mockImplementation(() => 20);
    jest.spyOn(Validation, 'validateEnumInput').mockImplementation(() => 'test');
    jest.spyOn(Validation, 'validatePrimitiveInput').mockImplementation(() => 30);

    const input = {
      myObject: {
        attribute: true,
      },
    };

    const result = Validation.validateRootObjectInput(
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      input,
      {
        myObject: {
          type: 'object',
          properties: {
            attribute: {
              type: 'boolean',
              description: '',
            },
          },
        },
      },
    );

    expect(result).toEqual(input);

    expect(Validation.validateObjectInput).toHaveBeenCalledWith(
      'myObject',
      {
        attribute: true,
      },
      {
        type: 'object',
        properties: {
          attribute: {
            type: 'boolean',
            description: '',
          },
        },
      },
    );

    expect(Validation.validateArrayInput).not.toHaveBeenCalled();
    expect(Validation.validateEnumInput).not.toHaveBeenCalled();
    expect(Validation.validatePrimitiveInput).not.toHaveBeenCalled();
  });

  test('validateRootObjectInput with enum attribute', async () => {
    jest.spyOn(Validation, 'validateArrayInput').mockImplementation(() => 10);
    jest.spyOn(Validation, 'validateObjectInput').mockImplementation(() => 20);
    jest.spyOn(Validation, 'validateEnumInput').mockImplementation(() => 'value');
    jest.spyOn(Validation, 'validatePrimitiveInput').mockImplementation(() => 30);

    const input = {
      myEnum: 'value',
    };

    const result = Validation.validateRootObjectInput(
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      input,
      {
        myEnum: {
          type: 'enum',
          values: {
            value: {},
          },
        },
      },
    );

    expect(result).toEqual(input);

    expect(Validation.validateArrayInput).not.toHaveBeenCalled();
    expect(Validation.validateObjectInput).not.toHaveBeenCalled();
    expect(Validation.validateEnumInput).toHaveBeenCalledWith('myEnum', 'value', {
      type: 'enum',
      values: {
        value: {},
      },
    });
    expect(Validation.validatePrimitiveInput).not.toHaveBeenCalled();
  });

  test('validateAndCleanPrimitiveOutput with empty output', async () => {
    jest.spyOn(Validation, 'validateString').mockImplementation(() => 'test');
    jest.spyOn(Validation, 'validateInt').mockImplementation(() => 10);
    jest.spyOn(Validation, 'validateFloat').mockImplementation(() => 3.5);
    jest.spyOn(Validation, 'validateBoolean').mockImplementation(() => true);

    const result = Validation.validateAndCleanPrimitiveOutput(null, undefined, {
      type: 'string',
      required: false,
    });

    expect(result).toBeUndefined();

    expect(Validation.validateString).not.toHaveBeenCalled();
    expect(Validation.validateInt).not.toHaveBeenCalled();
    expect(Validation.validateFloat).not.toHaveBeenCalled();
    expect(Validation.validateBoolean).not.toHaveBeenCalled();
  });

  test('validateAndCleanPrimitiveOutput with missing output', async () => {
    jest.spyOn(Validation, 'validateString').mockImplementation(() => 'test');
    jest.spyOn(Validation, 'validateInt').mockImplementation(() => 10);
    jest.spyOn(Validation, 'validateFloat').mockImplementation(() => 3.5);
    jest.spyOn(Validation, 'validateBoolean').mockImplementation(() => true);

    expect(() =>
      Validation.validateAndCleanPrimitiveOutput(null, undefined, {
        type: 'string',
      }),
    ).toThrowErrorMatchingInlineSnapshot(OUTPUT_REQUIRED_ERROR);

    expect(Validation.validateString).not.toHaveBeenCalled();
    expect(Validation.validateInt).not.toHaveBeenCalled();
    expect(Validation.validateFloat).not.toHaveBeenCalled();
    expect(Validation.validateBoolean).not.toHaveBeenCalled();
  });

  test('validateAndCleanPrimitiveOutput with missing named output', async () => {
    jest.spyOn(Validation, 'validateString').mockImplementation(() => 'test');
    jest.spyOn(Validation, 'validateInt').mockImplementation(() => 10);
    jest.spyOn(Validation, 'validateFloat').mockImplementation(() => 3.5);
    jest.spyOn(Validation, 'validateBoolean').mockImplementation(() => true);

    expect(() =>
      Validation.validateAndCleanPrimitiveOutput('test', undefined, {
        type: 'string',
      }),
    ).toThrowErrorMatchingInlineSnapshot('"Output "test" is required"');

    expect(Validation.validateString).not.toHaveBeenCalled();
    expect(Validation.validateInt).not.toHaveBeenCalled();
    expect(Validation.validateFloat).not.toHaveBeenCalled();
    expect(Validation.validateBoolean).not.toHaveBeenCalled();
  });

  test('validateAndCleanPrimitiveOutput with string', async () => {
    jest.spyOn(Validation, 'validateString').mockImplementation(() => 'test');
    jest.spyOn(Validation, 'validateInt').mockImplementation(() => 10);
    jest.spyOn(Validation, 'validateFloat').mockImplementation(() => 3.5);
    jest.spyOn(Validation, 'validateBoolean').mockImplementation(() => true);

    const result = Validation.validateAndCleanPrimitiveOutput(null, 'test', {
      type: 'string',
    });

    expect(result).toEqual('test');

    expect(Validation.validateString).toHaveBeenCalledWith('', 'test');

    expect(Validation.validateInt).not.toHaveBeenCalled();
    expect(Validation.validateFloat).not.toHaveBeenCalled();
    expect(Validation.validateBoolean).not.toHaveBeenCalled();
  });

  test('validateAndCleanPrimitiveOutput with invalid string', async () => {
    jest.spyOn(Validation, 'validateString').mockImplementation(() => {
      throw new Error('testError');
    });
    jest.spyOn(Validation, 'validateInt').mockImplementation(() => 10);
    jest.spyOn(Validation, 'validateFloat').mockImplementation(() => 3.5);
    jest.spyOn(Validation, 'validateBoolean').mockImplementation(() => true);

    expect(() =>
      Validation.validateAndCleanPrimitiveOutput(null, 50, {
        type: 'string',
      }),
    ).toThrowErrorMatchingInlineSnapshot('"Output must be a string"');

    expect(() =>
      Validation.validateAndCleanPrimitiveOutput('test', 50, {
        type: 'string',
      }),
    ).toThrowErrorMatchingInlineSnapshot('"Output "test" must be a string"');

    expect(Validation.validateString).toHaveBeenCalledWith('', 50);
    expect(Validation.validateString).toHaveBeenCalledWith('test', 50);

    expect(Validation.validateInt).not.toHaveBeenCalled();
    expect(Validation.validateFloat).not.toHaveBeenCalled();
    expect(Validation.validateBoolean).not.toHaveBeenCalled();
  });

  test('validateAndCleanPrimitiveOutput with int', async () => {
    jest.spyOn(Validation, 'validateString').mockImplementation(() => 'test');
    jest.spyOn(Validation, 'validateInt').mockImplementation(() => 10);
    jest.spyOn(Validation, 'validateFloat').mockImplementation(() => 3.5);
    jest.spyOn(Validation, 'validateBoolean').mockImplementation(() => true);

    const result = Validation.validateAndCleanPrimitiveOutput(null, 10, {
      type: 'int',
    });

    expect(result).toEqual(10);

    expect(Validation.validateInt).toHaveBeenCalledWith('', 10);

    expect(Validation.validateString).not.toHaveBeenCalled();
    expect(Validation.validateFloat).not.toHaveBeenCalled();
    expect(Validation.validateBoolean).not.toHaveBeenCalled();
  });

  test('validateAndCleanPrimitiveOutput with invalid int', async () => {
    jest.spyOn(Validation, 'validateString').mockImplementation(() => 'test');
    jest.spyOn(Validation, 'validateInt').mockImplementation(() => {
      throw new Error('testError');
    });
    jest.spyOn(Validation, 'validateFloat').mockImplementation(() => 3.5);
    jest.spyOn(Validation, 'validateBoolean').mockImplementation(() => true);

    expect(() =>
      Validation.validateAndCleanPrimitiveOutput(null, 3.5, {
        type: 'int',
      }),
    ).toThrowErrorMatchingInlineSnapshot('"Output must be an integer, got: 3.5"');

    expect(() =>
      Validation.validateAndCleanPrimitiveOutput('test', 3.5, {
        type: 'int',
      }),
    ).toThrowErrorMatchingInlineSnapshot('"Output "test" must be an integer"');

    expect(Validation.validateInt).toHaveBeenCalledWith('', 3.5);
    expect(Validation.validateInt).toHaveBeenCalledWith('test', 3.5);

    expect(Validation.validateString).not.toHaveBeenCalled();
    expect(Validation.validateFloat).not.toHaveBeenCalled();
    expect(Validation.validateBoolean).not.toHaveBeenCalled();
  });

  test('validateAndCleanPrimitiveOutput with float', async () => {
    jest.spyOn(Validation, 'validateString').mockImplementation(() => 'test');
    jest.spyOn(Validation, 'validateInt').mockImplementation(() => 10);
    jest.spyOn(Validation, 'validateFloat').mockImplementation(() => 3.5);
    jest.spyOn(Validation, 'validateBoolean').mockImplementation(() => true);

    const result = Validation.validateAndCleanPrimitiveOutput(null, 3.5, {
      type: 'float',
    });

    expect(result).toEqual(3.5);

    expect(Validation.validateFloat).toHaveBeenCalledWith('', 3.5);

    expect(Validation.validateString).not.toHaveBeenCalled();
    expect(Validation.validateInt).not.toHaveBeenCalled();
    expect(Validation.validateBoolean).not.toHaveBeenCalled();
  });

  test('validateAndCleanPrimitiveOutput with invalid float', async () => {
    jest.spyOn(Validation, 'validateString').mockImplementation(() => 'test');
    jest.spyOn(Validation, 'validateInt').mockImplementation(() => 10);
    jest.spyOn(Validation, 'validateFloat').mockImplementation(() => {
      throw new Error('testError');
    });
    jest.spyOn(Validation, 'validateBoolean').mockImplementation(() => true);

    expect(() =>
      Validation.validateAndCleanPrimitiveOutput(null, 'test', {
        type: 'float',
      }),
    ).toThrowErrorMatchingInlineSnapshot('"Output must be a float"');

    expect(() =>
      Validation.validateAndCleanPrimitiveOutput('a', 'test', {
        type: 'float',
      }),
    ).toThrowErrorMatchingInlineSnapshot('"Output "a" must be a float"');

    expect(Validation.validateFloat).toHaveBeenCalledWith('', 'test');
    expect(Validation.validateFloat).toHaveBeenCalledWith('a', 'test');

    expect(Validation.validateString).not.toHaveBeenCalled();
    expect(Validation.validateInt).not.toHaveBeenCalled();
    expect(Validation.validateBoolean).not.toHaveBeenCalled();
  });

  test('validateAndCleanPrimitiveOutput with boolean', async () => {
    jest.spyOn(Validation, 'validateString').mockImplementation(() => 'test');
    jest.spyOn(Validation, 'validateInt').mockImplementation(() => 10);
    jest.spyOn(Validation, 'validateFloat').mockImplementation(() => 3.5);
    jest.spyOn(Validation, 'validateBoolean').mockImplementation(() => true);

    const result = Validation.validateAndCleanPrimitiveOutput(null, true, {
      type: 'boolean',
    });

    expect(result).toEqual(true);

    expect(Validation.validateBoolean).toHaveBeenCalledWith('', true);

    expect(Validation.validateString).not.toHaveBeenCalled();
    expect(Validation.validateInt).not.toHaveBeenCalled();
    expect(Validation.validateFloat).not.toHaveBeenCalled();
  });

  test('validateAndCleanPrimitiveOutput with invalid boolean', async () => {
    jest.spyOn(Validation, 'validateString').mockImplementation(() => 'test');
    jest.spyOn(Validation, 'validateInt').mockImplementation(() => 10);
    jest.spyOn(Validation, 'validateFloat').mockImplementation(() => 3.5);
    jest.spyOn(Validation, 'validateBoolean').mockImplementation(() => {
      throw new Error('testError');
    });

    expect(() =>
      Validation.validateAndCleanPrimitiveOutput(null, 10, {
        type: 'boolean',
      }),
    ).toThrowErrorMatchingInlineSnapshot('"Output must be a boolean"');

    expect(() =>
      Validation.validateAndCleanPrimitiveOutput('a', 10, {
        type: 'boolean',
      }),
    ).toThrowErrorMatchingInlineSnapshot('"Output "a" must be a boolean"');

    expect(Validation.validateBoolean).toHaveBeenCalledWith('', 10);
    expect(Validation.validateBoolean).toHaveBeenCalledWith('a', 10);

    expect(Validation.validateString).not.toHaveBeenCalled();
    expect(Validation.validateInt).not.toHaveBeenCalled();
    expect(Validation.validateFloat).not.toHaveBeenCalled();
  });

  test('validateAndCleanEnumOutput', async () => {
    const result = Validation.validateAndCleanEnumOutput(null, 'b', {
      type: 'enum',
      values: { a: {}, b: {} },
    });

    expect(result).toEqual('b');
  });

  test('validateAndCleanEnumOutput with non-string', async () => {
    expect(() =>
      Validation.validateAndCleanEnumOutput(null, 10, {
        type: 'enum',
        values: { a: {}, b: {} },
      }),
    ).toThrowErrorMatchingInlineSnapshot('"Output must be a string"');

    expect(() =>
      Validation.validateAndCleanEnumOutput('a', 10, {
        type: 'enum',
        values: { a: {}, b: {} },
      }),
    ).toThrowErrorMatchingInlineSnapshot('"Output "a" must be a string"');
  });

  test('validateAndCleanEnumOutput with invalid value', async () => {
    expect(() =>
      Validation.validateAndCleanEnumOutput(null, 'c', {
        type: 'enum',
        values: { a: {}, b: {} },
      }),
    ).toThrowErrorMatchingInlineSnapshot('"Output must be one of: a, b"');

    expect(() =>
      Validation.validateAndCleanEnumOutput('a', 'c', {
        type: 'enum',
        values: { a: {}, b: {} },
      }),
    ).toThrowErrorMatchingInlineSnapshot('"Output "a" must be one of: a, b"');

    expect(() =>
      Validation.validateAndCleanEnumOutput(null, undefined, {
        type: 'enum',
        values: { a: {}, b: {} },
        required: true,
      }),
    ).toThrowErrorMatchingInlineSnapshot(OUTPUT_REQUIRED_ERROR);

    expect(() =>
      Validation.validateAndCleanEnumOutput('a', undefined, {
        type: 'enum',
        values: { a: {}, b: {} },
        required: true,
      }),
    ).toThrowErrorMatchingInlineSnapshot('"Output "a" is required"');

    const result = Validation.validateAndCleanEnumOutput(null, undefined, {
      type: 'enum',
      values: { a: {}, b: {} },
      required: false,
    });
    expect(result).toEqual(undefined);
  });

  test('validateAndCleanArrayOutput', async () => {
    jest.spyOn(Validation, 'validateAndCleanArrayOutput');
    jest.spyOn(Validation, 'validateAndCleanObjectOutput').mockImplementation(() => ({}));
    jest.spyOn(Validation, 'validateAndCleanEnumOutput').mockImplementation(() => 'a');
    jest.spyOn(Validation, 'validateAndCleanPrimitiveOutput').mockImplementation(() => 10);

    const result = Validation.validateAndCleanArrayOutput(null, [10, 20, 30], {
      type: 'array',
      item: {
        type: 'int',
      },
    });

    expect(result).toEqual([10, 10, 10]);

    expect(Validation.validateAndCleanObjectOutput).not.toHaveBeenCalled();
    expect(Validation.validateAndCleanEnumOutput).not.toHaveBeenCalled();
    expect(Validation.validateAndCleanPrimitiveOutput).toHaveBeenCalledTimes(3);
    expect(Validation.validateAndCleanPrimitiveOutput).toHaveBeenNthCalledWith(1, null, 10, {
      type: 'int',
    });
    expect(Validation.validateAndCleanPrimitiveOutput).toHaveBeenNthCalledWith(2, null, 20, {
      type: 'int',
    });
    expect(Validation.validateAndCleanPrimitiveOutput).toHaveBeenNthCalledWith(3, null, 30, {
      type: 'int',
    });
  });

  test('validateAndCleanArrayOutput with non-array', async () => {
    expect(() =>
      Validation.validateAndCleanArrayOutput(null, 10, {
        type: 'array',
        item: {
          type: 'int',
        },
      }),
    ).toThrowErrorMatchingInlineSnapshot('"Output must be an array"');

    expect(() =>
      Validation.validateAndCleanArrayOutput('a', 10, {
        type: 'array',
        item: {
          type: 'int',
        },
      }),
    ).toThrowErrorMatchingInlineSnapshot('"Output "a" must be an array"');
  });

  test('validateAndCleanArrayOutput with array of arrays', async () => {
    jest.spyOn(Validation, 'validateAndCleanArrayOutput');
    jest.spyOn(Validation, 'validateAndCleanObjectOutput').mockImplementation(() => ({}));
    jest.spyOn(Validation, 'validateAndCleanEnumOutput').mockImplementation(() => 'a');
    jest.spyOn(Validation, 'validateAndCleanPrimitiveOutput').mockImplementation(() => 10);

    const result = Validation.validateAndCleanArrayOutput(null, [[20, 30]], {
      type: 'array',
      item: {
        type: 'array',
        item: {
          type: 'int',
        },
      },
    });

    expect(result).toEqual([[10, 10]]);

    expect(Validation.validateAndCleanObjectOutput).not.toHaveBeenCalled();
    expect(Validation.validateAndCleanEnumOutput).not.toHaveBeenCalled();
    expect(Validation.validateAndCleanPrimitiveOutput).toHaveBeenCalledTimes(2);
    expect(Validation.validateAndCleanPrimitiveOutput).toHaveBeenNthCalledWith(1, null, 20, {
      type: 'int',
    });
    expect(Validation.validateAndCleanPrimitiveOutput).toHaveBeenNthCalledWith(2, null, 30, {
      type: 'int',
    });
    expect(Validation.validateAndCleanArrayOutput).toHaveBeenCalledTimes(2);
    expect(Validation.validateAndCleanArrayOutput).toHaveBeenNthCalledWith(2, null, [20, 30], {
      type: 'array',
      item: {
        type: 'int',
      },
    });
  });

  test('validateAndCleanArrayOutput with array of objects', async () => {
    jest.spyOn(Validation, 'validateAndCleanArrayOutput');
    jest.spyOn(Validation, 'validateAndCleanObjectOutput').mockImplementation(() => ({ test: 4 }));
    jest.spyOn(Validation, 'validateAndCleanEnumOutput').mockImplementation(() => 'a');
    jest.spyOn(Validation, 'validateAndCleanPrimitiveOutput').mockImplementation(() => 10);

    const result = Validation.validateAndCleanArrayOutput(null, [{ a: 10, b: 20 }], {
      type: 'array',
      item: {
        type: 'object',
        properties: {
          a: { type: 'int' },
          b: { type: 'int' },
        },
      },
    });

    expect(result).toEqual([{ test: 4 }]);

    expect(Validation.validateAndCleanObjectOutput).toHaveBeenCalledTimes(1);
    expect(Validation.validateAndCleanObjectOutput).toHaveBeenNthCalledWith(
      1,
      null,
      { a: 10, b: 20 },
      {
        type: 'object',
        properties: {
          a: { type: 'int' },
          b: { type: 'int' },
        },
      },
    );
    expect(Validation.validateAndCleanEnumOutput).not.toHaveBeenCalled();
    expect(Validation.validateAndCleanPrimitiveOutput).not.toHaveBeenCalled();
    expect(Validation.validateAndCleanArrayOutput).toHaveBeenCalledTimes(1);
    expect(Validation.validateAndCleanArrayOutput).toHaveBeenNthCalledWith(
      1,
      null,
      [{ a: 10, b: 20 }],
      {
        type: 'array',
        item: {
          type: 'object',
          properties: {
            a: { type: 'int' },
            b: { type: 'int' },
          },
        },
      },
    );
  });

  test('validateAndCleanArrayOutput with array of enums', async () => {
    jest.spyOn(Validation, 'validateAndCleanArrayOutput');
    jest.spyOn(Validation, 'validateAndCleanObjectOutput').mockImplementation(() => ({}));
    jest.spyOn(Validation, 'validateAndCleanEnumOutput').mockImplementation(() => 'a');
    jest.spyOn(Validation, 'validateAndCleanPrimitiveOutput').mockImplementation(() => 10);

    const result = Validation.validateAndCleanArrayOutput(null, ['a', 'b'], {
      type: 'array',
      item: {
        type: 'enum',
        values: { a: {}, b: {} },
      },
    });

    expect(result).toEqual(['a', 'a']);

    expect(Validation.validateAndCleanObjectOutput).not.toHaveBeenCalled();
    expect(Validation.validateAndCleanEnumOutput).toHaveBeenCalledTimes(2);
    expect(Validation.validateAndCleanEnumOutput).toHaveBeenNthCalledWith(1, null, 'a', {
      type: 'enum',
      values: { a: {}, b: {} },
    });
    expect(Validation.validateAndCleanEnumOutput).toHaveBeenNthCalledWith(2, null, 'b', {
      type: 'enum',
      values: { a: {}, b: {} },
    });
    expect(Validation.validateAndCleanPrimitiveOutput).not.toHaveBeenCalled();
    expect(Validation.validateAndCleanArrayOutput).toHaveBeenCalledTimes(1);
    expect(Validation.validateAndCleanArrayOutput).toHaveBeenNthCalledWith(1, null, ['a', 'b'], {
      type: 'array',
      item: {
        type: 'enum',
        values: { a: {}, b: {} },
      },
    });
  });

  test('validateAndCleanObjectOutput', async () => {
    jest.spyOn(Validation, 'unknownIsObject').mockImplementation(() => true);
    jest.spyOn(Validation, 'validateAndCleanArrayOutput').mockImplementation(() => ['ok']);
    jest.spyOn(Validation, 'validateAndCleanObjectOutput');
    jest.spyOn(Validation, 'validateAndCleanEnumOutput').mockImplementation(() => 'a');
    jest.spyOn(Validation, 'validateAndCleanPrimitiveOutput').mockImplementation(() => 10);

    const result = Validation.validateAndCleanObjectOutput(
      null,
      { a: 10, b: 'e', c: [20, 30], d: { t: 'v' } },
      {
        type: 'object',
        properties: {
          a: { type: 'int' },
          b: { type: 'enum', values: { e: {}, f: {} } },
          c: { type: 'array', item: { type: 'int' } },
          d: { type: 'object', properties: { t: { type: 'string' } } },
        },
      },
    );

    expect(result).toEqual({ a: 10, b: 'a', c: ['ok'], d: { t: 10 } });

    expect(Validation.validateAndCleanPrimitiveOutput).toHaveBeenCalledTimes(2);
    expect(Validation.validateAndCleanPrimitiveOutput).toHaveBeenNthCalledWith(1, 'a', 10, {
      type: 'int',
    });
    expect(Validation.validateAndCleanPrimitiveOutput).toHaveBeenNthCalledWith(2, 't', 'v', {
      type: 'string',
    });
    expect(Validation.validateAndCleanEnumOutput).toHaveBeenCalledTimes(1);
    expect(Validation.validateAndCleanEnumOutput).toHaveBeenNthCalledWith(1, 'b', 'e', {
      type: 'enum',
      values: { e: {}, f: {} },
    });
    expect(Validation.validateAndCleanArrayOutput).toHaveBeenCalledTimes(1);
    expect(Validation.validateAndCleanArrayOutput).toHaveBeenNthCalledWith(1, 'c', [20, 30], {
      type: 'array',
      item: {
        type: 'int',
      },
    });
    expect(Validation.validateAndCleanObjectOutput).toHaveBeenCalledTimes(2);
    expect(Validation.validateAndCleanObjectOutput).toHaveBeenNthCalledWith(
      2,
      'd',
      { t: 'v' },
      {
        type: 'object',
        properties: { t: { type: 'string' } },
      },
    );
  });

  test('validateAndCleanObjectOutput with missing value', async () => {
    jest.spyOn(Validation, 'unknownIsObject').mockImplementation(() => true);
    jest.spyOn(Validation, 'validateAndCleanArrayOutput').mockImplementation(() => ['ok']);
    jest.spyOn(Validation, 'validateAndCleanObjectOutput');
    jest.spyOn(Validation, 'validateAndCleanEnumOutput').mockImplementation(() => 'a');
    jest.spyOn(Validation, 'validateAndCleanPrimitiveOutput').mockImplementation(() => 10);

    expect(() =>
      Validation.validateAndCleanObjectOutput(null, undefined, {
        type: 'object',
        properties: {},
      }),
    ).toThrowErrorMatchingInlineSnapshot(OUTPUT_REQUIRED_ERROR);

    expect(() =>
      Validation.validateAndCleanObjectOutput('testName', null, {
        type: 'object',
        properties: {},
      }),
    ).toThrowErrorMatchingInlineSnapshot('"Output "testName" is required"');

    expect(Validation.validateAndCleanPrimitiveOutput).not.toHaveBeenCalled();
    expect(Validation.validateAndCleanEnumOutput).not.toHaveBeenCalled();
    expect(Validation.validateAndCleanArrayOutput).not.toHaveBeenCalled();
    expect(Validation.validateAndCleanObjectOutput).toHaveBeenCalledTimes(2);
  });

  test('validateAndCleanObjectOutput with empty value', async () => {
    jest.spyOn(Validation, 'unknownIsObject').mockImplementation(() => true);
    jest.spyOn(Validation, 'validateAndCleanArrayOutput').mockImplementation(() => ['ok']);
    jest.spyOn(Validation, 'validateAndCleanObjectOutput');
    jest.spyOn(Validation, 'validateAndCleanEnumOutput').mockImplementation(() => 'a');
    jest.spyOn(Validation, 'validateAndCleanPrimitiveOutput').mockImplementation(() => 10);

    const result = Validation.validateAndCleanObjectOutput(null, undefined, {
      type: 'object',
      properties: {},
      required: false,
    });

    expect(result).toBeUndefined();

    expect(Validation.validateAndCleanPrimitiveOutput).not.toHaveBeenCalled();
    expect(Validation.validateAndCleanEnumOutput).not.toHaveBeenCalled();
    expect(Validation.validateAndCleanArrayOutput).not.toHaveBeenCalled();
    expect(Validation.validateAndCleanObjectOutput).toHaveBeenCalledTimes(1);
  });

  test('validateAndCleanObjectOutput with non-object', async () => {
    jest.spyOn(Validation, 'unknownIsObject').mockImplementation(() => false);
    jest.spyOn(Validation, 'validateAndCleanArrayOutput').mockImplementation(() => ['ok']);
    jest.spyOn(Validation, 'validateAndCleanObjectOutput');
    jest.spyOn(Validation, 'validateAndCleanEnumOutput').mockImplementation(() => 'a');
    jest.spyOn(Validation, 'validateAndCleanPrimitiveOutput').mockImplementation(() => 10);

    expect(() =>
      Validation.validateAndCleanObjectOutput(null, 20, {
        type: 'object',
        properties: {},
      }),
    ).toThrowErrorMatchingInlineSnapshot('"Output must be an object"');

    expect(() =>
      Validation.validateAndCleanObjectOutput('testName', 20, {
        type: 'object',
        properties: {},
      }),
    ).toThrowErrorMatchingInlineSnapshot('"Output "testName" must be an object"');

    expect(Validation.validateAndCleanPrimitiveOutput).not.toHaveBeenCalled();
    expect(Validation.validateAndCleanEnumOutput).not.toHaveBeenCalled();
    expect(Validation.validateAndCleanArrayOutput).not.toHaveBeenCalled();
    expect(Validation.validateAndCleanObjectOutput).toHaveBeenCalledTimes(2);
  });

  test('validateAndCleanOutput with object', async () => {
    jest.spyOn(Validation, 'validateAndCleanArrayOutput').mockImplementation(() => ['ok']);
    jest.spyOn(Validation, 'validateAndCleanObjectOutput').mockImplementation(() => ({ a: 10 }));
    jest.spyOn(Validation, 'validateAndCleanEnumOutput').mockImplementation(() => 'e');
    jest.spyOn(Validation, 'validateAndCleanPrimitiveOutput').mockImplementation(() => 10);

    const result = Validation.validateAndCleanOutput(
      {
        type: 'object',
        properties: {
          a: { type: 'int' },
        },
      },
      { test: 'ok' },
    );

    expect(result).toEqual({ a: 10 });

    expect(Validation.validateAndCleanPrimitiveOutput).not.toHaveBeenCalled();
    expect(Validation.validateAndCleanEnumOutput).not.toHaveBeenCalled();
    expect(Validation.validateAndCleanArrayOutput).not.toHaveBeenCalled();
    expect(Validation.validateAndCleanObjectOutput).toHaveBeenCalledTimes(1);
    expect(Validation.validateAndCleanObjectOutput).toHaveBeenNthCalledWith(
      1,
      null,
      {
        test: 'ok',
      },
      {
        type: 'object',
        properties: {
          a: { type: 'int' },
        },
      },
    );
  });

  test('validateAndCleanOutput with array', async () => {
    jest.spyOn(Validation, 'validateAndCleanArrayOutput').mockImplementation(() => ['ok']);
    jest.spyOn(Validation, 'validateAndCleanObjectOutput').mockImplementation(() => ({ a: 10 }));
    jest.spyOn(Validation, 'validateAndCleanEnumOutput').mockImplementation(() => 'e');
    jest.spyOn(Validation, 'validateAndCleanPrimitiveOutput').mockImplementation(() => 10);

    const result = Validation.validateAndCleanOutput(
      {
        type: 'array',
        item: {
          type: 'int',
        },
      },
      [20, 30],
    );

    expect(result).toEqual(['ok']);

    expect(Validation.validateAndCleanPrimitiveOutput).not.toHaveBeenCalled();
    expect(Validation.validateAndCleanEnumOutput).not.toHaveBeenCalled();
    expect(Validation.validateAndCleanArrayOutput).toHaveBeenCalledTimes(1);
    expect(Validation.validateAndCleanArrayOutput).toHaveBeenNthCalledWith(1, null, [20, 30], {
      type: 'array',
      item: {
        type: 'int',
      },
    });
    expect(Validation.validateAndCleanObjectOutput).not.toHaveBeenCalled();
  });

  test('validateAndCleanOutput with enum', async () => {
    jest.spyOn(Validation, 'validateAndCleanArrayOutput').mockImplementation(() => ['ok']);
    jest.spyOn(Validation, 'validateAndCleanObjectOutput').mockImplementation(() => ({ a: 10 }));
    jest.spyOn(Validation, 'validateAndCleanEnumOutput').mockImplementation(() => 'e');
    jest.spyOn(Validation, 'validateAndCleanPrimitiveOutput').mockImplementation(() => 10);

    const result = Validation.validateAndCleanOutput(
      {
        type: 'enum',
        values: { a: {}, b: {} },
      },
      'b',
    );

    expect(result).toEqual('e');

    expect(Validation.validateAndCleanPrimitiveOutput).not.toHaveBeenCalled();
    expect(Validation.validateAndCleanEnumOutput).toHaveBeenCalledTimes(1);
    expect(Validation.validateAndCleanEnumOutput).toHaveBeenNthCalledWith(1, null, 'b', {
      type: 'enum',
      values: { a: {}, b: {} },
    });
    expect(Validation.validateAndCleanArrayOutput).not.toHaveBeenCalled();
    expect(Validation.validateAndCleanObjectOutput).not.toHaveBeenCalled();
  });

  test('validateAndCleanOutput with primitive', async () => {
    jest.spyOn(Validation, 'validateAndCleanArrayOutput').mockImplementation(() => ['ok']);
    jest.spyOn(Validation, 'validateAndCleanObjectOutput').mockImplementation(() => ({ a: 10 }));
    jest.spyOn(Validation, 'validateAndCleanEnumOutput').mockImplementation(() => 'e');
    jest.spyOn(Validation, 'validateAndCleanPrimitiveOutput').mockImplementation(() => 10);

    const result = Validation.validateAndCleanOutput(
      {
        type: 'int',
      },
      20,
    );

    expect(result).toEqual(10);

    expect(Validation.validateAndCleanPrimitiveOutput).toHaveBeenCalledTimes(1);
    expect(Validation.validateAndCleanPrimitiveOutput).toHaveBeenNthCalledWith(1, null, 20, {
      type: 'int',
    });
    expect(Validation.validateAndCleanEnumOutput).not.toHaveBeenCalled();
    expect(Validation.validateAndCleanArrayOutput).not.toHaveBeenCalled();
    expect(Validation.validateAndCleanObjectOutput).not.toHaveBeenCalled();
  });

  test('validateAndCleanOutput with missing value', async () => {
    jest.spyOn(Validation, 'validateAndCleanArrayOutput').mockImplementation(() => ['ok']);
    jest.spyOn(Validation, 'validateAndCleanObjectOutput').mockImplementation(() => ({ a: 10 }));
    jest.spyOn(Validation, 'validateAndCleanEnumOutput').mockImplementation(() => 'e');
    jest.spyOn(Validation, 'validateAndCleanPrimitiveOutput').mockImplementation(() => {
      throw new Error('testError');
    });

    expect(() =>
      Validation.validateAndCleanOutput(
        {
          type: 'int',
        },
        undefined,
      ),
    ).toThrowErrorMatchingInlineSnapshot('"testError"');

    expect(Validation.validateAndCleanPrimitiveOutput).toHaveBeenCalledTimes(1);
    expect(Validation.validateAndCleanPrimitiveOutput).toHaveBeenNthCalledWith(1, null, undefined, {
      type: 'int',
    });
    expect(Validation.validateAndCleanEnumOutput).not.toHaveBeenCalled();
    expect(Validation.validateAndCleanArrayOutput).not.toHaveBeenCalled();
    expect(Validation.validateAndCleanObjectOutput).not.toHaveBeenCalled();
  });
});
