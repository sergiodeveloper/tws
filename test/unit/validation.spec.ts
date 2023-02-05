import { Validation } from '../../src/validation';

describe('Validation', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('validatePrimitiveValue', async () => {
    const result = Validation.validatePrimitiveValue('test', 'test', {
      type: 'string',
      description: '',
    });

    expect(result).toBe('test');
  });

  test('validatePrimitiveValue with default value', async () => {
    const result = Validation.validatePrimitiveValue('test', undefined, {
      type: 'string',
      description: '',
      defaultValue: 'test',
    });

    expect(result).toBe('test');
  });

  test('validatePrimitiveValue with empty value', async () => {
    const result = Validation.validatePrimitiveValue('test', undefined, {
      type: 'string',
      description: '',
      required: false,
    });

    expect(result).toBe(undefined);
  });

  test('validatePrimitiveValue with empty value and no default', async () => {
    expect(() => {
      Validation.validatePrimitiveValue('test', undefined, {
        type: 'string',
        description: '',
      });
    }).toThrowError('"test" is required');
  });

  test('validatePrimitiveValue with wrong type', async () => {
    expect(() => {
      Validation.validatePrimitiveValue('test', 1, {
        type: 'string',
        description: '',
      });
    }).toThrowError('"test" must be a string');
  });

  test('validatePrimitiveInput', async () => {
    jest.spyOn(Validation, 'validatePrimitiveValue').mockImplementation(() => 10);

    const result = Validation.validatePrimitiveInput('test', 'test', {
      type: 'string',
      description: '',
    });

    expect(result).toBe(10);

    expect(Validation.validatePrimitiveValue).toBeCalledWith('test', 'test', {
      type: 'string',
      description: '',
    });
  });

  test('validatePrimitiveInput with unknown type', async () => {
    jest.spyOn(Validation, 'validatePrimitiveValue').mockImplementation(() => 10);

    expect(() => {
      Validation.validatePrimitiveInput('test', 'test', {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        type: 'unknown',
        description: '',
      });
    }).toThrowError('Unknown primitive type "unknown" for "test"');

    expect(Validation.validatePrimitiveValue).not.toBeCalled();
  });

  test('validateObjectInput', async () => {
    jest.spyOn(Validation, 'validateArrayInput').mockImplementation(() => 10);
    jest.spyOn(Validation, 'validateObjectInput');
    jest.spyOn(Validation, 'validatePrimitiveInput').mockImplementation(() => 30);

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

    expect(Validation.validateArrayInput).not.toBeCalled();
    expect(Validation.validateObjectInput).toBeCalledTimes(1);
    expect(Validation.validatePrimitiveInput).toBeCalledWith('test', 'value', {
      type: 'string',
      description: '',
    });
  });

  test('validateObjectInput with empty value', async () => {
    jest.spyOn(Validation, 'validateArrayInput').mockImplementation(() => 10);
    jest.spyOn(Validation, 'validateObjectInput');
    jest.spyOn(Validation, 'validatePrimitiveInput').mockImplementation(() => 30);

    const result = Validation.validateObjectInput('test', undefined, {
      type: 'object',
      description: '',
      required: false,
      properties: {},
    });

    expect(result).toEqual(undefined);

    expect(Validation.validateArrayInput).not.toBeCalled();
    expect(Validation.validateObjectInput).toBeCalledTimes(1);
    expect(Validation.validatePrimitiveInput).not.toBeCalled();
  });

  test('validateObjectInput with empty value and no default', async () => {
    jest.spyOn(Validation, 'validateArrayInput').mockImplementation(() => 10);
    jest.spyOn(Validation, 'validateObjectInput');
    jest.spyOn(Validation, 'validatePrimitiveInput').mockImplementation(() => 30);

    expect(() => {
      Validation.validateObjectInput('test', undefined, {
        type: 'object',
        description: '',
        properties: {},
      });
    }).toThrowError('"test" is required');

    expect(Validation.validateArrayInput).not.toBeCalled();
    expect(Validation.validateObjectInput).toBeCalledTimes(1);
    expect(Validation.validatePrimitiveInput).not.toBeCalled();
  });

  test('validateObjectInput with wrong type', async () => {
    jest.spyOn(Validation, 'validateArrayInput').mockImplementation(() => 10);
    jest.spyOn(Validation, 'validateObjectInput');
    jest.spyOn(Validation, 'validatePrimitiveInput').mockImplementation(() => 30);

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
    }).toThrowError('"test" must be an object');

    expect(Validation.validateArrayInput).not.toBeCalled();
    expect(Validation.validateObjectInput).toBeCalledTimes(1);
    expect(Validation.validatePrimitiveInput).not.toBeCalled();
  });

  test('validateObjectInput with array attribute', async () => {
    jest.spyOn(Validation, 'validateArrayInput').mockImplementation(() => 10);
    jest.spyOn(Validation, 'validateObjectInput');
    jest.spyOn(Validation, 'validatePrimitiveInput').mockImplementation(() => 30);

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
          test: [
            {
              type: 'string',
              description: '',
            },
          ],
        },
      },
    );

    expect(input).toEqual({
      test: ['value'],
    });

    expect(result).toEqual(undefined);

    expect(Validation.validateArrayInput).toBeCalledWith(
      'test',
      ['value'],
      [
        {
          type: 'string',
          description: '',
        },
      ],
    );
    expect(Validation.validateObjectInput).toBeCalledTimes(1);
    expect(Validation.validatePrimitiveInput).not.toBeCalled();
  });

  test('validateObjectInput with object attribute', async () => {
    jest.spyOn(Validation, 'validateArrayInput').mockImplementation(() => 10);
    jest.spyOn(Validation, 'validateObjectInput');
    jest.spyOn(Validation, 'validatePrimitiveInput').mockImplementation(() => 30);

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

    expect(Validation.validateArrayInput).not.toBeCalled();

    expect(Validation.validateObjectInput).toBeCalledTimes(2);
    expect(Validation.validateObjectInput).toHaveBeenNthCalledWith(
      2,
      'test',
      {
        test: {},
      },
      {
        type: 'object',
        description: '',
        properties: {},
      },
    );

    expect(Validation.validatePrimitiveInput).not.toBeCalled();
  });

  test('validateArrayInput', async () => {
    jest.spyOn(Validation, 'validateObjectInput').mockImplementation(() => 10);
    jest.spyOn(Validation, 'validatePrimitiveInput').mockImplementation(() => 20);

    const input = ['value'];

    const result = Validation.validateArrayInput('test', input, [
      {
        type: 'string',
        description: '',
      },
    ]);

    expect(result).toEqual(undefined);

    expect(input).toEqual([20]);

    expect(Validation.validateObjectInput).not.toBeCalled();
    expect(Validation.validatePrimitiveInput).toBeCalledWith('test', 'value', {
      type: 'string',
      description: '',
    });
  });

  test('validateArrayInput with empty value', async () => {
    jest.spyOn(Validation, 'validateObjectInput').mockImplementation(() => 10);
    jest.spyOn(Validation, 'validatePrimitiveInput').mockImplementation(() => 20);

    expect(() => {
      Validation.validateArrayInput('field', undefined, [
        {
          type: 'string',
          description: '',
        },
      ]);
    }).toThrowError('"field" is required');

    expect(Validation.validateObjectInput).not.toBeCalled();
    expect(Validation.validatePrimitiveInput).not.toBeCalled();
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
        [
          {
            type: 'string',
            description: '',
          },
        ],
      );
    }).toThrowError('"test" must be an array');

    expect(Validation.validateObjectInput).not.toBeCalled();
    expect(Validation.validatePrimitiveInput).not.toBeCalled();
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
      [
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
      ],
    );

    expect(result).toEqual(undefined);

    expect(input).toEqual([
      {
        test: 'value',
      },
    ]);

    expect(Validation.validateObjectInput).toBeCalledWith(
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
    expect(Validation.validatePrimitiveInput).not.toBeCalled();
  });

  test('validateRootObjectInput', async () => {
    jest.spyOn(Validation, 'validateArrayInput').mockImplementation(() => 10);
    jest.spyOn(Validation, 'validateObjectInput').mockImplementation(() => 20);
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

    expect(Validation.validateArrayInput).not.toBeCalled();
    expect(Validation.validateObjectInput).not.toBeCalled();
    expect(Validation.validatePrimitiveInput).toBeCalledWith('test', 'value', {
      type: 'string',
      description: '',
    });
  });

  test('validateRootObjectInput with empty input', async () => {
    jest.spyOn(Validation, 'validateArrayInput').mockImplementation(() => 10);
    jest.spyOn(Validation, 'validateObjectInput').mockImplementation(() => 20);
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
    ).toThrowError('Input is required');

    expect(Validation.validateArrayInput).not.toBeCalled();
    expect(Validation.validateObjectInput).not.toBeCalled();
    expect(Validation.validatePrimitiveInput).not.toBeCalled();
  });

  test('validateRootObjectInput with a non object', async () => {
    jest.spyOn(Validation, 'validateArrayInput').mockImplementation(() => 10);
    jest.spyOn(Validation, 'validateObjectInput').mockImplementation(() => 20);
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
    ).toThrowError('Input must be an object');

    expect(Validation.validateArrayInput).not.toBeCalled();
    expect(Validation.validateObjectInput).not.toBeCalled();
    expect(Validation.validatePrimitiveInput).not.toBeCalled();
  });

  test('validateRootObjectInput with array attribute', async () => {
    jest.spyOn(Validation, 'validateArrayInput').mockImplementation(() => 10);
    jest.spyOn(Validation, 'validateObjectInput').mockImplementation(() => 20);
    jest.spyOn(Validation, 'validatePrimitiveInput').mockImplementation(() => 30);

    const input = {
      array: [10],
    };

    const result = Validation.validateRootObjectInput(
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      input,
      {
        array: [
          {
            type: 'number',
            description: '',
          },
        ],
      },
    );

    expect(result).toEqual(input);

    expect(Validation.validateArrayInput).toBeCalledWith(
      'array',
      [10],
      [
        {
          type: 'number',
          description: '',
        },
      ],
    );

    expect(Validation.validateObjectInput).not.toBeCalled();
    expect(Validation.validatePrimitiveInput).not.toBeCalled();
  });

  test('validateRootObjectInput with object attribute', async () => {
    jest.spyOn(Validation, 'validateArrayInput').mockImplementation(() => 10);
    jest.spyOn(Validation, 'validateObjectInput').mockImplementation(() => 20);
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

    expect(Validation.validateObjectInput).toBeCalledWith(
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

    expect(Validation.validateArrayInput).not.toBeCalled();
    expect(Validation.validatePrimitiveInput).not.toBeCalled();
  });

  test('constructor', async () => {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    new Validation();
  });
});
