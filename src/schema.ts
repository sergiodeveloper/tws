// Helpers

import { Validation, ValidationError } from './validation';

type DefaultValueType<T> = T extends PrimitiveType<PrimitiveTypeName> ? T : undefined;

// Primitive types

export type PrimitiveTypeName = 'string' | 'int' | 'float' | 'boolean';

export type PrimitiveType<T extends PrimitiveTypeName> = T extends 'string'
  ? string
  : T extends 'int'
  ? number
  : T extends 'float'
  ? number
  : T extends 'boolean'
  ? boolean
  : never;

// Primitive input types

export type PrimitiveTypeDefinition = {
  type: PrimitiveTypeName;
  title?: string;
  description?: string;
  required?: boolean;
  defaultValue?: PrimitiveType<PrimitiveTypeName>;
};

export type HandlerPrimitiveType<T extends PrimitiveTypeDefinition> = T['required'] extends false
  ? PrimitiveType<T['type']> | DefaultValueType<T['defaultValue']>
  : PrimitiveType<T['type']>;

export type InvocationPrimitiveType<T extends PrimitiveTypeDefinition> = T['required'] extends false
  ? PrimitiveType<T['type']> | undefined
  : PrimitiveType<T['type']>;

// Enum input types

export type EnumTypeDefinition = {
  type: 'enum';
  title?: string;
  description?: string;
  required?: boolean;
  defaultValue?: string;
  values: {
    [name: string]: {
      title?: string;
      description?: string;
    };
  };
};

export type HandlerEnumType<T extends EnumTypeDefinition> = T['required'] extends false
  ? keyof T['values'] | DefaultValueType<T['defaultValue']>
  : keyof T['values'];
// ? T['values'] | (T['defaultValue'] extends string ? T['defaultValue'] : never)
// : T['values'];

export type InvocationEnumType<T extends EnumTypeDefinition> = T['required'] extends false
  ? keyof T['values'] | undefined
  : keyof T['values'];
// ? T['values'] | undefined
// : T['values'];

// Object input types

export type ObjectTypeDefinition = {
  type: 'object';
  title?: string;
  description?: string;
  required?: boolean;
  properties: {
    [name: string]:
      | PrimitiveTypeDefinition
      | ObjectTypeDefinition
      | ArrayTypeDefinition
      | EnumTypeDefinition;
  };
};

export type HandlerObjectType<T extends ObjectTypeDefinition> = T['required'] extends false
  ?
      | {
          [field in keyof T['properties']]: T['properties'][field] extends PrimitiveTypeDefinition
            ? HandlerPrimitiveType<T['properties'][field]>
            : T['properties'][field] extends ArrayTypeDefinition
            ? HandlerArrayType<T['properties'][field]>
            : T['properties'][field] extends ObjectTypeDefinition
            ? HandlerObjectType<T['properties'][field]>
            : T['properties'][field] extends EnumTypeDefinition
            ? HandlerEnumType<T['properties'][field]>
            : never;
        }
      | undefined
  : {
      [field in keyof T['properties']]: T['properties'][field] extends PrimitiveTypeDefinition
        ? HandlerPrimitiveType<T['properties'][field]>
        : T['properties'][field] extends ArrayTypeDefinition
        ? HandlerArrayType<T['properties'][field]>
        : T['properties'][field] extends ObjectTypeDefinition
        ? HandlerObjectType<T['properties'][field]>
        : T['properties'][field] extends EnumTypeDefinition
        ? HandlerEnumType<T['properties'][field]>
        : never;
    };

export type InvocationObjectType<T extends ObjectTypeDefinition> = T['required'] extends false
  ?
      | {
          [field in keyof T['properties']]: T['properties'][field] extends PrimitiveTypeDefinition
            ? InvocationPrimitiveType<T['properties'][field]>
            : T['properties'][field] extends ArrayTypeDefinition
            ? InvocationArrayType<T['properties'][field]>
            : T['properties'][field] extends ObjectTypeDefinition
            ? InvocationObjectType<T['properties'][field]>
            : T['properties'][field] extends EnumTypeDefinition
            ? InvocationEnumType<T['properties'][field]>
            : never;
        }
      | undefined
  : {
      [field in keyof T['properties']]: T['properties'][field] extends PrimitiveTypeDefinition
        ? InvocationPrimitiveType<T['properties'][field]>
        : T['properties'][field] extends ArrayTypeDefinition
        ? InvocationArrayType<T['properties'][field]>
        : T['properties'][field] extends ObjectTypeDefinition
        ? InvocationObjectType<T['properties'][field]>
        : T['properties'][field] extends EnumTypeDefinition
        ? InvocationEnumType<T['properties'][field]>
        : never;
    };

// Array input types

export type ArrayTypeDefinition = {
  type: 'array';
  title?: string;
  description?: string;
  item: PrimitiveTypeDefinition | ObjectTypeDefinition | ArrayTypeDefinition | EnumTypeDefinition;
};

export type HandlerArrayType<T extends ArrayTypeDefinition> =
  T['item'] extends PrimitiveTypeDefinition
    ? HandlerPrimitiveType<T['item']>[]
    : T['item'] extends ObjectTypeDefinition
    ? HandlerObjectType<T['item']>[]
    : T['item'] extends ArrayTypeDefinition
    ? HandlerArrayType<T['item']>[]
    : T['item'] extends EnumTypeDefinition
    ? HandlerEnumType<T['item']>[]
    : never;

export type InvocationArrayType<T extends ArrayTypeDefinition> =
  T['item'] extends PrimitiveTypeDefinition
    ? InvocationPrimitiveType<T['item']>[]
    : T['item'] extends ObjectTypeDefinition
    ? InvocationObjectType<T['item']>[]
    : T['item'] extends ArrayTypeDefinition
    ? InvocationArrayType<T['item']>[]
    : T['item'] extends EnumTypeDefinition
    ? InvocationEnumType<T['item']>[]
    : never;

// Root input types

export type InputTypeDefinition = {
  [name: string]:
    | PrimitiveTypeDefinition
    | ObjectTypeDefinition
    | ArrayTypeDefinition
    | EnumTypeDefinition;
};

export type HandlerInputType<T extends InputTypeDefinition> = {
  [field in keyof T]: T[field] extends PrimitiveTypeDefinition
    ? HandlerPrimitiveType<T[field]>
    : T[field] extends ArrayTypeDefinition
    ? HandlerArrayType<T[field]>
    : T[field] extends ObjectTypeDefinition
    ? HandlerObjectType<T[field]>
    : T[field] extends EnumTypeDefinition
    ? HandlerEnumType<T[field]>
    : never;
};

export type InvocationInputType<T extends InputTypeDefinition> = {
  [field in keyof T]: T[field] extends PrimitiveTypeDefinition
    ? InvocationPrimitiveType<T[field]>
    : T[field] extends ArrayTypeDefinition
    ? InvocationArrayType<T[field]>
    : T[field] extends ObjectTypeDefinition
    ? InvocationObjectType<T[field]>
    : T[field] extends EnumTypeDefinition
    ? InvocationEnumType<T[field]>
    : never;
};

// Output types

export type PrimitiveOutputTypeDefinition = {
  type: PrimitiveTypeName;
  title?: string;
  description?: string;
  required?: boolean;
};

export type PrimitiveOutputType<T extends PrimitiveOutputTypeDefinition> =
  T['required'] extends false ? PrimitiveType<T['type']> | undefined : PrimitiveType<T['type']>;

export type ObjectOutputTypeDefinition = {
  type: 'object';
  title?: string;
  description?: string;
  required?: boolean;
  properties: {
    [name: string]:
      | PrimitiveOutputTypeDefinition
      | ObjectOutputTypeDefinition
      | ArrayOutputTypeDefinition
      | EnumOutputTypeDefinition;
  };
};

export type ObjectOutputType<T extends ObjectOutputTypeDefinition> = T['required'] extends false
  ? { [field in keyof T['properties']]: OutputType<T['properties'][field]> } | undefined
  : { [field in keyof T['properties']]: OutputType<T['properties'][field]> };

export type ArrayOutputTypeDefinition = {
  type: 'array';
  title?: string;
  description?: string;
  required?: boolean;
  item:
    | PrimitiveOutputTypeDefinition
    | ObjectOutputTypeDefinition
    | ArrayOutputTypeDefinition
    | EnumOutputTypeDefinition;
};

export type ArrayOutputType<T extends ArrayOutputTypeDefinition> = T['required'] extends false
  ? OutputType<T['item']>[] | undefined
  : OutputType<T['item']>[];

export type EnumOutputTypeDefinition = {
  type: 'enum';
  title?: string;
  description?: string;
  required?: boolean;
  values: {
    [name: string]: {
      title?: string;
      description?: string;
    };
  };
};

export type EnumOutputType<T extends EnumOutputTypeDefinition> = T['required'] extends false
  ? keyof T['values'] | undefined
  : keyof T['values'];

export type OutputTypeDefinition =
  | PrimitiveOutputTypeDefinition
  | ObjectOutputTypeDefinition
  | ArrayOutputTypeDefinition
  | EnumOutputTypeDefinition;

export type OutputType<T extends OutputTypeDefinition> = T extends PrimitiveOutputTypeDefinition
  ? PrimitiveOutputType<T>
  : T extends EnumOutputTypeDefinition
  ? EnumOutputType<T>
  : T extends ObjectOutputTypeDefinition
  ? ObjectOutputType<T>
  : T extends ArrayOutputTypeDefinition
  ? ArrayOutputType<T>
  : never;

// Operation

export type OperationMetadata = {
  headers: Record<string, string>;
};

export class Operation<TInput extends InputTypeDefinition, TOutput extends OutputTypeDefinition> {
  public title?: string;
  public description?: string;
  public input: TInput;
  public output: TOutput;
  public handler:
    | (<T extends OutputTypeDefinition>(
        input: Record<string, unknown>,
        metadata: OperationMetadata,
      ) => OutputType<T>)
    | (<T extends OutputTypeDefinition>(
        input: Record<string, unknown>,
        metadata: OperationMetadata,
      ) => Promise<OutputType<T>>)
    | undefined;

  constructor(options: {
    title?: string;
    description?: string;
    input: TInput;
    output: TOutput;
    handler:
      | ((input: HandlerInputType<TInput>, metadata: OperationMetadata) => OutputType<TOutput>)
      | ((
          input: HandlerInputType<TInput>,
          metadata: OperationMetadata,
        ) => Promise<OutputType<TOutput>>);
  }) {
    this.title = options.title;
    this.description = options.description;
    this.input = options.input;
    this.output = options.output;
    this.handler = options.handler as typeof this.handler;
  }
}

export type OperationMap = {
  [name: string]: Operation<InputTypeDefinition, OutputTypeDefinition>;
};

export class Schema<R extends OperationMap> {
  operations: R;

  constructor(operations: R) {
    this.operations = operations;
  }

  async execute<OperationName extends keyof R>(
    operationName: OperationName,
    args: InvocationInputType<R[OperationName]['input']>,
    metadata: Partial<OperationMetadata>,
  ): Promise<OutputType<R[OperationName]['output']>> {
    const operation = this.operations[operationName];

    if (!operation) {
      throw new ValidationError(`Operation "${String(operationName)}" not found`);
    }
    if (!operation.handler) {
      throw new ValidationError(`Operation "${String(operationName)}" does not have a handler`);
    }

    const validatedArgs = Validation.validateRootObjectInput(args, operation.input);

    const result = await operation.handler(validatedArgs, {
      headers: metadata.headers || {},
    });

    return Validation.validateAndCleanOutput(operation.output, result) as OutputType<
      R[OperationName]['output']
    >;
  }
}
