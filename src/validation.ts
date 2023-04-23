import type {
  InputTypeDefinition,
  ObjectTypeDefinition,
  PrimitiveTypeDefinition,
  ArrayTypeDefinition,
  EnumTypeDefinition,
  OutputTypeDefinition,
  PrimitiveOutputTypeDefinition,
} from '@tws-js/common';

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
  }
}

const REQUIRED_OUTPUT_ERROR = 'Output is required';

export class Validation {
  private constructor() {
    // no-op
  }

  static unknownIsObject(input: unknown): input is Record<string, unknown> {
    return (
      !!input &&
      typeof input === 'object' &&
      !Array.isArray(input) &&
      Array.isArray(Object.keys(input))
    );
  }

  static validateString(name: string, input: unknown): string {
    if (typeof input !== 'string') {
      throw new ValidationError(`"${name}" must be a string`);
    }

    return input;
  }

  static validateInt(name: string, input: unknown): number {
    if (
      typeof input !== 'number' ||
      !Number.isInteger(input) ||
      /^-?[0-9]+$/.test(`${input}`) === false
    ) {
      throw new ValidationError(`"${name}" must be a valid integer`);
    }

    return input;
  }

  static validateFloat(name: string, input: unknown): number {
    if (
      typeof input !== 'number' ||
      Number.isNaN(input) ||
      /^-?[0-9]+(\.[0-9]+)?$/.test(`${input}`) === false
    ) {
      throw new ValidationError(`"${name}" must be a valid float`);
    }

    return input;
  }

  static validateBoolean(name: string, input: unknown): boolean {
    if (typeof input !== 'boolean') {
      throw new ValidationError(`"${name}" must be a boolean`);
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
        // Allow to set default value even if the type is different. The resolver will be typed correctly
        return inputDefinition.defaultValue;
      }

      if (inputDefinition.required !== false) {
        throw new ValidationError(`"${name}" is required`);
      }
      return undefined;
    }

    switch (inputDefinition.type) {
      case 'string':
        return Validation.validateString(name, input);
      case 'int':
        return Validation.validateInt(name, input);
      case 'float':
        return Validation.validateFloat(name, input);
      case 'boolean':
        return Validation.validateBoolean(name, input);
      default:
        throw new ValidationError(`Unknown primitive type "${inputDefinition.type}" for "${name}"`);
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
    if (input === undefined || input === null) {
      if (inputDefinition.required !== false) {
        throw new ValidationError(`"${name}" is required`);
      }
      return;
    }

    if (!Validation.unknownIsObject(input)) {
      throw new ValidationError(`"${name}" must be an object`);
    }

    Object.keys(inputDefinition.properties).forEach((fieldName) => {
      const fieldType = inputDefinition.properties[fieldName];
      const fieldValue = input[fieldName];

      if (fieldType.type === 'array') {
        Validation.validateArrayInput(fieldName, fieldValue, fieldType);
      } else if (fieldType.type === 'object') {
        Validation.validateObjectInput(fieldName, fieldValue, fieldType);
      } else if (fieldType.type === 'enum') {
        Validation.validateEnumInput(fieldName, fieldValue, fieldType);
      } else {
        const validated = Validation.validatePrimitiveInput(fieldName, fieldValue, fieldType);

        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore Allow new field to be added to the input object if needed
        // eslint-disable-next-line no-param-reassign
        input[fieldName] = validated;
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
        throw new ValidationError(
          `Default value for "${name}" must be one of: ${Object.keys(inputDefinition.values).join(
            ', ',
          )}`,
        );
      }

      if (inputDefinition.required !== false) {
        throw new ValidationError(`"${name}" is required`);
      }

      return inputDefinition.defaultValue;
    }

    if (typeof input !== 'string') {
      throw new ValidationError(`"${name}" must be a string`);
    }

    // if (!inputDefinition.values.includes(input)) {
    if (!Object.keys(inputDefinition.values).includes(input)) {
      throw new ValidationError(
        `"${name}" must be one of: ${Object.keys(inputDefinition.values).join(', ')}`,
      );
    }

    return input;
  }

  /**
   * Mutates the input object
   */
  static validateArrayInput(
    name: string,
    input: unknown,
    inputDefinition: ArrayTypeDefinition,
  ): void {
    if (!input) {
      throw new ValidationError(`"${name}" is required`);
    }
    if (!Array.isArray(input)) {
      throw new ValidationError(`"${name}" must be an array`);
    }

    const arrayItemType = inputDefinition.item;

    if (arrayItemType.type === 'object') {
      (input as unknown[]).forEach((objectInput) => {
        Validation.validateObjectInput(name, objectInput, arrayItemType);
      });
    } else if (arrayItemType.type === 'array') {
      (input as unknown[]).forEach((arrayInput) => {
        Validation.validateArrayInput(name, arrayInput, arrayItemType);
      });
    } else if (arrayItemType.type === 'enum') {
      (input as unknown[]).forEach((enumInput) => {
        Validation.validateEnumInput(name, enumInput, arrayItemType);
      });
    } else {
      (input as unknown[]).forEach((primitiveInput, index) => {
        // eslint-disable-next-line no-param-reassign
        input[index] = Validation.validatePrimitiveInput(name, primitiveInput, arrayItemType);
      });
    }
  }

  static validateRootObjectInput(
    input: unknown,
    inputDefinition: InputTypeDefinition,
  ): Record<string, unknown> {
    if (!input) {
      throw new ValidationError('Input is required');
    }

    const inputCopy = JSON.parse(JSON.stringify(input)) as unknown;

    if (!Validation.unknownIsObject(inputCopy)) {
      throw new ValidationError('Input must be an object');
    }

    Object.keys(inputDefinition).forEach((fieldName) => {
      const fieldType = inputDefinition[fieldName];
      const fieldValue = inputCopy[fieldName];

      if (fieldType.type === 'array') {
        Validation.validateArrayInput(fieldName, fieldValue, fieldType);
      } else if (fieldType.type === 'object') {
        Validation.validateObjectInput(fieldName, fieldValue, fieldType);
      } else if (fieldType.type === 'enum') {
        const validated = Validation.validateEnumInput(fieldName, fieldValue, fieldType);

        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore Allow new field to be added to the input object if needed
        // eslint-disable-next-line no-param-reassign
        inputCopy[fieldName] = validated;
      } else {
        const validated = Validation.validatePrimitiveInput(fieldName, fieldValue, fieldType);

        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore Allow new field to be added to the input object if needed
        // eslint-disable-next-line no-param-reassign
        inputCopy[fieldName] = validated;
      }
    });

    return inputCopy;
  }

  // eslint-disable-next-line sonarjs/cognitive-complexity
  static validateAndCleanPrimitiveOutput(
    name: string | null,
    value: unknown,
    type: PrimitiveOutputTypeDefinition,
  ): unknown {
    if (value === undefined || value === null) {
      if (type.required !== false) {
        if (name) {
          throw new ValidationError(`Output "${name}" is required`);
        }
        throw new ValidationError(REQUIRED_OUTPUT_ERROR);
      }

      return undefined;
    }

    if (type.type === 'string') {
      try {
        return Validation.validateString(name || '', value);
      } catch (error) {
        if (name) {
          throw new ValidationError(`Output "${name}" must be a string`);
        }
        throw new ValidationError('Output must be a string');
      }
    }

    if (type.type === 'int') {
      try {
        return Validation.validateInt(name || '', value);
      } catch (error) {
        if (name) {
          throw new ValidationError(`Output "${name}" must be an integer`);
        }
        throw new ValidationError('Output must be an integer, got: ' + JSON.stringify(value));
      }
    }

    if (type.type === 'float') {
      try {
        return Validation.validateFloat(name || '', value);
      } catch (error) {
        if (name) {
          throw new ValidationError(`Output "${name}" must be a float`);
        }
        throw new ValidationError('Output must be a float');
      }
    }

    if (type.type === 'boolean') {
      try {
        return Validation.validateBoolean(name || '', value);
      } catch (error) {
        if (name) {
          throw new ValidationError(`Output "${name}" must be a boolean`);
        }
        throw new ValidationError('Output must be a boolean');
      }
    }
  }

  // eslint-disable-next-line sonarjs/cognitive-complexity
  static validateAndCleanEnumOutput(
    name: string | null,
    value: unknown,
    type: EnumTypeDefinition,
  ): string | undefined {
    if (value === undefined || value === null) {
      if (type.required !== false) {
        if (name) {
          throw new ValidationError(`Output "${name}" is required`);
        }
        throw new ValidationError(REQUIRED_OUTPUT_ERROR);
      }

      return undefined;
    }

    if (typeof value !== 'string') {
      if (name) {
        throw new ValidationError(`Output "${name}" must be a string`);
      }
      throw new ValidationError('Output must be a string');
    }

    if (!Object.keys(type.values).includes(value)) {
      if (name) {
        throw new ValidationError(
          `Output "${name}" must be one of: ${Object.keys(type.values).join(', ')}`,
        );
      }
      throw new ValidationError(`Output must be one of: ${Object.keys(type.values).join(', ')}`);
    }

    return value;
  }

  static validateAndCleanArrayOutput(
    name: string | null,
    value: unknown,
    type: ArrayTypeDefinition,
  ): unknown[] {
    if (!Array.isArray(value)) {
      if (name) {
        throw new ValidationError(`Output "${name}" must be an array`);
      }
      throw new ValidationError('Output must be an array');
    }

    return (value as unknown[]).map((item) => {
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

  // eslint-disable-next-line sonarjs/cognitive-complexity
  static validateAndCleanObjectOutput(
    name: string | null,
    value: unknown,
    type: ObjectTypeDefinition,
  ): Record<string, unknown> | undefined {
    if (value === undefined || value === null) {
      if (type.required !== false) {
        if (name) {
          throw new ValidationError(`Output "${name}" is required`);
        }
        throw new ValidationError(REQUIRED_OUTPUT_ERROR);
      }

      return undefined;
    }

    if (!Validation.unknownIsObject(value)) {
      if (name) {
        throw new ValidationError(`Output "${name}" must be an object`);
      }
      throw new ValidationError('Output must be an object');
    }

    const cleanOutput = {} as Record<string, unknown>;

    Object.keys(type.properties).forEach((fieldName) => {
      const fieldType = type.properties[fieldName];
      const fieldValue = value[fieldName];

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
