import type {
  ObjectTypeDefinition,
  PrimitiveTypeDefinition,
  PrimitiveTypeName,
} from '../../src/index';
import { Validation } from '../../src/validation';

describe('Validation', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('validate primitive value with missing value', async () => {
    const typeDefinition = {
      type: 'string' as const,
      description: 'desc',
      required: true,
    };

    expect(() => Validation.validatePrimitiveValue('a', undefined, typeDefinition)).toThrowError(
      '"a" is required',
    );
  });

  test('validate primitive value with wrong type', async () => {
    const typeDefinition = {
      type: 'string' as const,
      description: 'desc',
      required: true,
    };

    expect(() => Validation.validatePrimitiveValue('b', 1, typeDefinition)).toThrowError(
      '"b" must be a string',
    );
  });

  test('validate primitive input with invalid input type', async () => {
    const typeDefinition = {
      type: 'abcd' as PrimitiveTypeName,
      description: 'desc',
      required: true,
    };

    expect(() => Validation.validatePrimitiveInput('c', 1, typeDefinition)).toThrowError(
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

    expect(() => Validation.validateObjectInput('d', undefined, typeDefinition)).toThrowError(
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
    ).toThrowError('"e" must be an object');
  });

  test('validate array input with missing or non-array value', async () => {
    const typeDefinition: PrimitiveTypeDefinition = {
      type: 'string' as const,
      description: 'desc',
      required: true,
    };

    expect(() => Validation.validateArrayInput('f', undefined, [typeDefinition])).toThrowError(
      '"f" is required',
    );

    expect(() =>
      Validation.validateArrayInput(
        'g',
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        1,
        [typeDefinition],
      ),
    ).toThrowError('"g" must be an array');
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
    ).toThrowError('Input is required');

    expect(() =>
      Validation.validateRootObjectInput(
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        1,
        typeDefinition,
      ),
    ).toThrowError('Input must be an object');
  });

  test('constructor', async () => {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    new Validation();
  });
});
