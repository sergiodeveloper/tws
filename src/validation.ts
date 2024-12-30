import type {
  InputTypeDefinition,
  ObjectTypeDefinition,
  PrimitiveTypeDefinition,
  ArrayTypeDefinition,
  EnumTypeDefinition,
  OutputTypeDefinition,
  PrimitiveOutputTypeDefinition,
} from '@tws-js/common';

/**
 * Error that can be safely sent to the client.
 */
export class SafeError extends Error {
  constructor(message: string) {
    // Use only first line with a maximum length of 150 characters
    const cutMessage = message.split('\n')[0].substring(0, 150).trim();

    super(cutMessage);
  }

  toString(): string {
    return this.message;
  }
}

export abstract class Validation {
  static valueTypeName(value: unknown): string {
    if (Array.isArray(value)) {
      return 'array';
    }

    if (value === null) {
      return 'null';
    }

    return typeof value;
  }

  static errorMessage(options: {
    name: string | null;
    expectedType: string;
    receivedType: string;
    type: 'input' | 'output';
  }): string {
    return (
      `${options.type === 'output' ? 'Server error: output ' : ''}` +
      `${options.type === 'output' ? (options.name ? '"' + options.name + '" ' : '') : ''}` +
      `${options.type === 'input' ? (options.name ? '"' + options.name + '" ' : 'Input ') : ''}` +
      `must be of type ${options.expectedType}, got ${options.receivedType}`
    );
  }

  static validateString(name: string | null, value: unknown, type: 'input' | 'output'): string {
    if (typeof value !== 'string') {
      throw new SafeError(
        Validation.errorMessage({
          name,
          expectedType: 'string',
          receivedType: Validation.valueTypeName(value),
          type,
        }),
      );
    }

    return value;
  }

  static validateInt(name: string | null, input: unknown, type: 'input' | 'output'): number {
    if (
      typeof input !== 'number' ||
      !Number.isInteger(input) ||
      /^-?[0-9]+$/.test(`${input}`) === false
    ) {
      const isFloat = typeof input === 'number' && /^-?[0-9]+(\.[0-9]+)?$/.test(`${input}`);

      throw new SafeError(
        Validation.errorMessage({
          name,
          expectedType: 'integer',
          receivedType: isFloat ? 'float' : Validation.valueTypeName(input),
          type,
        }),
      );
    }

    return input;
  }

  static validateFloat(name: string | null, input: unknown, type: 'input' | 'output'): number {
    if (
      typeof input !== 'number' ||
      Number.isNaN(input) ||
      /^-?[0-9]+(\.[0-9]+)?$/.test(`${input}`) === false
    ) {
      throw new SafeError(
        Validation.errorMessage({
          name,
          expectedType: 'float',
          receivedType: Validation.valueTypeName(input),
          type,
        }),
      );
    }

    return input;
  }

  static validateBoolean(name: string | null, input: unknown, type: 'input' | 'output'): boolean {
    if (typeof input !== 'boolean') {
      throw new SafeError(
        Validation.errorMessage({
          name,
          expectedType: 'boolean',
          receivedType: Validation.valueTypeName(input),
          type,
        }),
      );
    }

    return input;
  }

  static validateObject(
    name: string | null,
    input: unknown,
    type: 'input' | 'output',
  ): Record<string, unknown> {
    if (
      !input ||
      typeof input !== 'object' ||
      Array.isArray(input) ||
      !Array.isArray(Object.keys(input))
    ) {
      throw new SafeError(
        Validation.errorMessage({
          name,
          expectedType: 'object',
          receivedType: Validation.valueTypeName(input),
          type,
        }),
      );
    }

    return input as Record<string, unknown>;
  }

  static validateArray(name: string | null, input: unknown, type: 'input' | 'output'): unknown[] {
    if (!Array.isArray(input)) {
      throw new SafeError(
        Validation.errorMessage({
          name,
          expectedType: 'array',
          receivedType: Validation.valueTypeName(input),
          type,
        }),
      );
    }

    return input;
  }

  static validatePrimitiveInput(
    name: string,
    input: unknown,
    inputDefinition: PrimitiveTypeDefinition,
  ): string | number | boolean | undefined {
    if (input === undefined || input === null) {
      if (inputDefinition.defaultValue !== undefined) {
        // Allow to set default value even if the type is different. The resolver will be
        // typed correctly
        return inputDefinition.defaultValue;
      }

      if (inputDefinition.required !== false) {
        throw new SafeError(`"${name}" is required`);
      }
      return undefined;
    }

    switch (inputDefinition.type) {
      case 'string':
        return Validation.validateString(name, input, 'input');
      case 'int':
        return Validation.validateInt(name, input, 'input');
      case 'float':
        return Validation.validateFloat(name, input, 'input');
      case 'boolean':
        return Validation.validateBoolean(name, input, 'input');
      default:
        throw new SafeError(`Server error: unknown input type for "${name}"`);
    }
  }

  /**
   * Mutates the input object
   */
  static validateObjectInput(
    name: string,
    input: unknown,
    inputDefinition: ObjectTypeDefinition,
  ): void {
    if ((input === undefined || input === null) && inputDefinition.required === false) {
      return;
    }

    const validatedObject = Validation.validateObject(name, input, 'input');

    Object.keys(inputDefinition.properties).forEach((fieldName) => {
      const fieldType = inputDefinition.properties[fieldName];
      const fieldValue = validatedObject[fieldName];

      if (fieldType.type === 'array') {
        Validation.validateArrayInput(fieldName, fieldValue, fieldType);
      } else if (fieldType.type === 'object') {
        Validation.validateObjectInput(fieldName, fieldValue, fieldType);
      } else if (fieldType.type === 'enum') {
        Validation.validateEnumInput(fieldName, fieldValue, fieldType);
      } else {
        const validated = Validation.validatePrimitiveInput(fieldName, fieldValue, fieldType);

        // Allow new field to be added to the input object if needed

        validatedObject[fieldName] = validated;
      }
    });
  }

  static validateEnumInput(
    name: string,
    input: unknown,
    inputDefinition: EnumTypeDefinition,
  ): string | undefined {
    if (input === undefined || input === null) {
      if (
        inputDefinition.defaultValue !== undefined &&
        !Object.keys(inputDefinition.values).includes(inputDefinition.defaultValue)
      ) {
        throw new SafeError(
          `Server error: default value for "${name}" must be one of: ` +
            Object.keys(inputDefinition.values)
              .map((value) => `"${value}"`)
              .join(', '),
        );
      }

      if (inputDefinition.defaultValue !== undefined) {
        return inputDefinition.defaultValue;
      }

      if (inputDefinition.required !== false) {
        throw new SafeError(`"${name}" is required`);
      }

      return undefined;
    }

    const inputString = Validation.validateString(name, input, 'input');

    if (!Object.keys(inputDefinition.values).includes(inputString)) {
      throw new SafeError(
        `"${name}" must be one of: ` +
          Object.keys(inputDefinition.values)
            .map((value) => `"${value}"`)
            .join(', ') +
          `, got "${inputString}"`,
      );
    }

    return inputString;
  }

  /**
   * Mutates the input object
   */
  static validateArrayInput(
    name: string,
    input: unknown,
    inputDefinition: ArrayTypeDefinition,
  ): void {
    const validatedArray = Validation.validateArray(name, input, 'input');

    const arrayItemType = inputDefinition.item;

    if (arrayItemType.type === 'object') {
      (validatedArray as unknown[]).forEach((objectInput) => {
        Validation.validateObjectInput(name, objectInput, arrayItemType);
      });
    } else if (arrayItemType.type === 'array') {
      (validatedArray as unknown[]).forEach((arrayInput) => {
        Validation.validateArrayInput(name, arrayInput, arrayItemType);
      });
    } else if (arrayItemType.type === 'enum') {
      (validatedArray as unknown[]).forEach((enumInput) => {
        Validation.validateEnumInput(name, enumInput, arrayItemType);
      });
    } else {
      (validatedArray as unknown[]).forEach((primitiveInput, index) => {
        validatedArray[index] = Validation.validatePrimitiveInput(
          name,
          primitiveInput,
          arrayItemType,
        );
      });
    }
  }

  /**
   * Validates the input object based on the input type definition.
   *
   * @throws {SafeError} if the input format is invalid.
   */
  static validateRootObjectInput(
    input: unknown,
    inputDefinition: InputTypeDefinition,
  ): Record<string, unknown> {
    const validatedObject = Validation.validateObject(null, input, 'input');

    const inputCopy = JSON.parse(JSON.stringify(validatedObject)) as typeof validatedObject;

    Object.keys(inputDefinition).forEach((fieldName) => {
      const fieldType = inputDefinition[fieldName];
      const fieldValue = inputCopy[fieldName];

      if (fieldType.type === 'array') {
        Validation.validateArrayInput(fieldName, fieldValue, fieldType);
      } else if (fieldType.type === 'object') {
        Validation.validateObjectInput(fieldName, fieldValue, fieldType);
      } else if (fieldType.type === 'enum') {
        const validated = Validation.validateEnumInput(fieldName, fieldValue, fieldType);

        // Allow new field to be added to the input object if needed

        inputCopy[fieldName] = validated;
      } else {
        const validated = Validation.validatePrimitiveInput(fieldName, fieldValue, fieldType);

        // Allow new field to be added to the input object if needed

        inputCopy[fieldName] = validated;
      }
    });

    return inputCopy;
  }

  static validateAndCleanPrimitiveOutput(
    name: string | null,
    value: unknown,
    type: PrimitiveOutputTypeDefinition,
  ): unknown {
    if ((value === undefined || value === null) && type.required === false) {
      return;
    }

    if (type.type === 'string') {
      return Validation.validateString(name, value, 'output');
    }

    if (type.type === 'int') {
      return Validation.validateInt(name, value, 'output');
    }

    if (type.type === 'float') {
      return Validation.validateFloat(name, value, 'output');
    }

    if (type.type === 'boolean') {
      return Validation.validateBoolean(name, value, 'output');
    }

    throw new SafeError('Server error: unknown output type' + (name ? ` in "${name}"` : ''));
  }

  static validateAndCleanEnumOutput(
    name: string | null,
    value: unknown,
    type: EnumTypeDefinition,
  ): string | undefined {
    if ((value === undefined || value === null) && type.required === false) {
      return;
    }

    const valueString = Validation.validateString(name, value, 'output');

    if (!Object.keys(type.values).includes(valueString)) {
      if (name) {
        throw new SafeError(
          `Server error: output "${name}" must be one of: ` +
            Object.keys(type.values)
              .map((value) => `"${value}"`)
              .join(', '),
        );
      }
      throw new SafeError(
        `Server error: output must be one of: ` +
          Object.keys(type.values)
            .map((value) => `"${value}"`)
            .join(', '),
      );
    }

    return valueString;
  }

  static validateAndCleanArrayOutput(
    name: string | null,
    value: unknown,
    type: ArrayTypeDefinition,
  ): unknown[] {
    const validatedArray = Validation.validateArray(name, value, 'output');

    return (validatedArray as unknown[]).map((item) => {
      if (type.item.type === 'array') {
        return Validation.validateAndCleanArrayOutput(null, item, type.item);
      } else if (type.item.type === 'object') {
        return Validation.validateAndCleanObjectOutput(name, item, type.item);
      } else if (type.item.type === 'enum') {
        return Validation.validateAndCleanEnumOutput(name, item, type.item);
      }
      return Validation.validateAndCleanPrimitiveOutput(name, item, type.item);
    });
  }

  static validateAndCleanObjectOutput(
    name: string | null,
    value: unknown,
    type: ObjectTypeDefinition,
  ): Record<string, unknown> | undefined {
    if ((value === undefined || value === null) && type.required === false) {
      return;
    }

    const validatedObject = Validation.validateObject(name, value, 'output');

    const cleanOutput = {} as Record<string, unknown>;

    Object.keys(type.properties).forEach((fieldName) => {
      const fieldType = type.properties[fieldName];
      const fieldValue = validatedObject[fieldName];

      if (fieldType.type === 'array') {
        cleanOutput[fieldName] = Validation.validateAndCleanArrayOutput(
          fieldName,
          fieldValue,
          fieldType,
        );
      } else if (fieldType.type === 'object') {
        cleanOutput[fieldName] = Validation.validateAndCleanObjectOutput(
          fieldName,
          fieldValue,
          fieldType,
        );
      } else if (fieldType.type === 'enum') {
        cleanOutput[fieldName] = Validation.validateAndCleanEnumOutput(
          fieldName,
          fieldValue,
          fieldType,
        );
      } else {
        cleanOutput[fieldName] = Validation.validateAndCleanPrimitiveOutput(
          fieldName,
          fieldValue,
          fieldType,
        );
      }
    });

    return cleanOutput;
  }

  /**
   * Clones and validates the output against the given output type.
   *
   * @throws {SafeError} if the output format is invalid.
   */
  static validateAndCleanOutput(outputType: OutputTypeDefinition, output: unknown): unknown {
    const outputCopy =
      output === undefined || output === null
        ? undefined
        : (JSON.parse(JSON.stringify(output)) as unknown);

    if (outputType.type === 'array') {
      return Validation.validateAndCleanArrayOutput(null, outputCopy, outputType);
    } else if (outputType.type === 'object') {
      return Validation.validateAndCleanObjectOutput(null, outputCopy, outputType);
    } else if (outputType.type === 'enum') {
      return Validation.validateAndCleanEnumOutput(null, outputCopy, outputType);
    }
    return Validation.validateAndCleanPrimitiveOutput(null, outputCopy, outputType);
  }
}
