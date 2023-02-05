import type {
  InputTypeDefinition,
  InvocationInputType,
  InvocationObjectType,
  InvocationPrimitiveType,
  ObjectTypeDefinition,
  PrimitiveType,
  PrimitiveTypeDefinition,
  PrimitiveTypeName,
  ResolverInputType,
} from './schema';

export class Validation {
  private constructor() {
    // no-op
  }

  static validatePrimitiveValue(
    name: string,
    input: PrimitiveType<PrimitiveTypeName> | undefined,
    inputDefinition: PrimitiveTypeDefinition,
  ): PrimitiveType<PrimitiveTypeName> | undefined {
    if (input === undefined) {
      if (inputDefinition.defaultValue !== undefined) {
        // Allow to set default value even if the type is different, since resolver is typed correctly
        return inputDefinition.defaultValue;
      }

      if (inputDefinition.required !== false) {
        throw new Error(`"${name}" is required`);
      }
      return undefined;
    }

    if (typeof input !== inputDefinition.type) {
      throw new Error(`"${name}" must be a ${inputDefinition.type}`);
    }
    return input;
  }

  static validatePrimitiveInput(
    name: string,
    input: InvocationPrimitiveType<PrimitiveTypeDefinition & { required: false }>,
    inputDefinition: PrimitiveTypeDefinition,
  ): PrimitiveType<PrimitiveTypeName> | undefined {
    switch (inputDefinition.type) {
      case 'string':
      case 'number':
      case 'boolean':
        return Validation.validatePrimitiveValue(name, input, inputDefinition);
      default:
        throw new Error(`Unknown primitive type "${inputDefinition.type}" for "${name}"`);
    }
  }

  /**
   * Mutates the input object
   */
  static validateObjectInput(
    name: string,
    input: InvocationObjectType<ObjectTypeDefinition & { required: false }> | undefined,
    inputDefinition: ObjectTypeDefinition,
  ): void {
    if (input === undefined) {
      if (inputDefinition.required !== false) {
        throw new Error(`"${name}" is required`);
      }
      return;
    }

    if (typeof input !== 'object') {
      throw new Error(`"${name}" must be an object`);
    }

    Object.keys(inputDefinition.properties).forEach((fieldName) => {
      const fieldType = inputDefinition.properties[fieldName];

      if (Array.isArray(fieldType)) {
        const fieldValue = input[fieldName] as
          | InvocationPrimitiveType<PrimitiveTypeDefinition & { required: false }>[]
          | InvocationObjectType<ObjectTypeDefinition & { required: false }>[]
          | undefined;

        Validation.validateArrayInput(fieldName, fieldValue, fieldType);
      } else if (fieldType.type === 'object') {
        const fieldValue = input[fieldName] as
          | InvocationObjectType<ObjectTypeDefinition & { required: false }>
          | undefined;

        Validation.validateObjectInput(fieldName, fieldValue, fieldType);
      } else {
        const fieldValue = input[fieldName] as
          | InvocationPrimitiveType<PrimitiveTypeDefinition & { required: false }>
          | undefined;

        const validatedValue = Validation.validatePrimitiveInput(fieldName, fieldValue, fieldType);

        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        // eslint-disable-next-line no-param-reassign
        input[fieldName] = validatedValue;
      }
    });
  }

  /**
   * Mutates the input object
   */
  static validateArrayInput(
    name: string,
    input:
      | InvocationPrimitiveType<PrimitiveTypeDefinition & { required: false }>[]
      | InvocationObjectType<ObjectTypeDefinition & { required: false }>[]
      | undefined,
    inputDefinition: [PrimitiveTypeDefinition] | [ObjectTypeDefinition],
  ): void {
    if (!input) {
      throw new Error(`"${name}" is required`);
    }
    if (!Array.isArray(input)) {
      throw new Error(`"${name}" must be an array`);
    }

    if (inputDefinition[0].type === 'object') {
      const list = input as InvocationObjectType<ObjectTypeDefinition & { required: false }>[];
      list.forEach((objectInput) => {
        Validation.validateObjectInput(
          name,
          objectInput,
          inputDefinition[0] as ObjectTypeDefinition,
        );
      });
    } else {
      const list = input as InvocationPrimitiveType<
        PrimitiveTypeDefinition & { required: false }
      >[];

      list.forEach((primitiveInput, index) => {
        list[index] = Validation.validatePrimitiveInput(
          name,
          primitiveInput,
          inputDefinition[0] as PrimitiveTypeDefinition,
        );
      });
    }
  }

  static validateRootObjectInput(
    input: InvocationInputType<InputTypeDefinition>,
    inputDefinition: InputTypeDefinition,
  ): ResolverInputType<InputTypeDefinition> {
    if (!input) {
      throw new Error('Input is required');
    }

    if (typeof input !== 'object') {
      throw new Error('Input must be an object');
    }

    const result = JSON.parse(JSON.stringify(input)) as ResolverInputType<InputTypeDefinition>;

    Object.keys(inputDefinition).forEach((fieldName) => {
      const fieldType = inputDefinition[fieldName];

      if (Array.isArray(fieldType)) {
        const fieldValue = result[fieldName] as
          | InvocationPrimitiveType<PrimitiveTypeDefinition & { required: false }>[]
          | InvocationObjectType<ObjectTypeDefinition & { required: false }>[]
          | undefined;

        Validation.validateArrayInput(fieldName, fieldValue, fieldType);
      } else if (fieldType.type === 'object') {
        const fieldValue = result[fieldName] as
          | InvocationObjectType<ObjectTypeDefinition & { required: false }>
          | undefined;

        Validation.validateObjectInput(fieldName, fieldValue, fieldType);
      } else {
        const fieldValue = result[fieldName] as
          | InvocationPrimitiveType<PrimitiveTypeDefinition & { required: false }>
          | undefined;

        const validatedValue = Validation.validatePrimitiveInput(fieldName, fieldValue, fieldType);

        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        // eslint-disable-next-line no-param-reassign
        result[fieldName] = validatedValue;
      }
    });

    return result;
  }
}
