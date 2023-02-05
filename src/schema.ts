// Helpers

import { Validation } from './validation';

type DefaultValueType<T> = T extends PrimitiveType<PrimitiveTypeName> ? T : undefined;

// Primitive types

export type PrimitiveTypeName = 'string' | 'number' | 'boolean';

export type PrimitiveType<T extends PrimitiveTypeName> = T extends 'string'
  ? string
  : T extends 'number'
  ? number
  : T extends 'boolean'
  ? boolean
  : never;

// Primitive input types

export type PrimitiveTypeDefinition = {
  type: PrimitiveTypeName;
  description?: string;
  required?: boolean;
  defaultValue?: PrimitiveType<PrimitiveTypeName>;
};

export type ResolverPrimitiveType<T extends PrimitiveTypeDefinition> = T['required'] extends false
  ? PrimitiveType<T['type']> | DefaultValueType<T['defaultValue']>
  : PrimitiveType<T['type']>;

export type InvocationPrimitiveType<T extends PrimitiveTypeDefinition> = T['required'] extends false
  ? PrimitiveType<T['type']> | undefined
  : PrimitiveType<T['type']>;

// Object input types

export type ObjectTypeDefinition = {
  type: 'object';
  description?: string;
  required?: boolean;
  properties: {
    [name: string]:
      | PrimitiveTypeDefinition
      | [PrimitiveTypeDefinition]
      | ObjectTypeDefinition
      | [ObjectTypeDefinition];
  };
};

export type ResolverObjectType<T extends ObjectTypeDefinition> = {
  [field in keyof T['properties']]: T['properties'][field] extends PrimitiveTypeDefinition
    ? ResolverPrimitiveType<T['properties'][field]>
    : T['properties'][field] extends [PrimitiveTypeDefinition]
    ? ResolverPrimitiveType<T['properties'][field][0]>[]
    : T['properties'][field] extends ObjectTypeDefinition & { required: false }
    ? ResolverObjectType<T['properties'][field]> | undefined
    : T['properties'][field] extends ObjectTypeDefinition
    ? ResolverObjectType<T['properties'][field]>
    : T['properties'][field] extends [ObjectTypeDefinition & { required: false }]
    ? ResolverObjectType<T['properties'][field][0]>[] | undefined
    : T['properties'][field] extends [ObjectTypeDefinition]
    ? ResolverObjectType<T['properties'][field][0]>[]
    : never;
};

export type InvocationObjectType<T extends ObjectTypeDefinition> = {
  [field in keyof T['properties']]: T['properties'][field] extends PrimitiveTypeDefinition
    ? InvocationPrimitiveType<T['properties'][field]>
    : T['properties'][field] extends [PrimitiveTypeDefinition]
    ? InvocationPrimitiveType<T['properties'][field][0]>[]
    : T['properties'][field] extends ObjectTypeDefinition & { required: false }
    ? InvocationObjectType<T['properties'][field]> | undefined
    : T['properties'][field] extends ObjectTypeDefinition
    ? InvocationObjectType<T['properties'][field]>
    : T['properties'][field] extends [ObjectTypeDefinition & { required: false }]
    ? InvocationObjectType<T['properties'][field][0]>[] | undefined
    : T['properties'][field] extends [ObjectTypeDefinition]
    ? InvocationObjectType<T['properties'][field][0]>[]
    : never;
};

// Root input types

export type InputTypeDefinition = {
  [name: string]:
    | PrimitiveTypeDefinition
    | [PrimitiveTypeDefinition]
    | ObjectTypeDefinition
    | [ObjectTypeDefinition];
};

export type ResolverInputType<T extends InputTypeDefinition> = {
  [field in keyof T]: T[field] extends PrimitiveTypeDefinition
    ? ResolverPrimitiveType<T[field]>
    : T[field] extends [PrimitiveTypeDefinition]
    ? ResolverPrimitiveType<T[field][0]>[]
    : T[field] extends ObjectTypeDefinition
    ? ResolverObjectType<T[field]>
    : T[field] extends [ObjectTypeDefinition]
    ? ResolverObjectType<T[field][0]>[]
    : never;
};

export type InvocationInputType<T extends InputTypeDefinition> = {
  [field in keyof T]: T[field] extends PrimitiveTypeDefinition
    ? InvocationPrimitiveType<T[field]>
    : T[field] extends [PrimitiveTypeDefinition]
    ? InvocationPrimitiveType<T[field][0]>[]
    : T[field] extends ObjectTypeDefinition & { required: false }
    ? InvocationObjectType<T[field]> | undefined
    : T[field] extends ObjectTypeDefinition
    ? InvocationObjectType<T[field]>
    : T[field] extends [ObjectTypeDefinition & { required: false }]
    ? InvocationObjectType<T[field][0]>[] | undefined
    : T[field] extends [ObjectTypeDefinition]
    ? InvocationObjectType<T[field][0]>[]
    : never;
};

// Output types

export type OutputTypeDefinition =
  | PrimitiveTypeName
  | [PrimitiveTypeName]
  | { [field: string]: OutputTypeDefinition }
  | [{ [field: string]: OutputTypeDefinition }];

export type OutputType<T extends OutputTypeDefinition> = T extends PrimitiveTypeName
  ? PrimitiveType<T>
  : T extends [PrimitiveTypeName]
  ? PrimitiveType<T[0]>[]
  : T extends { [field: string]: OutputTypeDefinition }
  ? { [field in keyof T]: OutputType<T[field]> }
  : T extends [{ [field: string]: OutputTypeDefinition }]
  ? { [field in keyof T[0]]: OutputType<T[0][field]> }[]
  : never;

// Resolver

export class Resolver<TInput extends InputTypeDefinition, TOutput extends OutputTypeDefinition> {
  public description?: string;
  public input: TInput;
  public output: TOutput;
  public handler:
    | (<T extends TInput, U extends OutputTypeDefinition>(
        input: ResolverInputType<T>,
      ) => OutputType<U>)
    | (<T extends TInput, U extends OutputTypeDefinition>(
        input: ResolverInputType<T>,
      ) => Promise<OutputType<U>>)
    | undefined;

  constructor(options: {
    description?: string;
    input: TInput;
    output: TOutput;
    resolver:
      | ((input: ResolverInputType<TInput>) => OutputType<TOutput>)
      | ((input: ResolverInputType<TInput>) => Promise<OutputType<TOutput>>);
  }) {
    this.description = options.description;
    this.input = options.input;
    this.output = options.output;
    this.handler = options.resolver as typeof this.handler;
  }
}

export type ResolverMap = {
  [name: string]: Resolver<InputTypeDefinition, OutputTypeDefinition>;
};

export class Schema<R extends ResolverMap> {
  private resolvers: R;

  constructor(resolvers: R) {
    this.resolvers = resolvers;
  }

  async execute<OperationName extends keyof R>(
    operation: OperationName,
    args: InvocationInputType<R[OperationName]['input']>,
  ): Promise<OutputType<R[OperationName]['output']>> {
    const resolver = this.resolvers[operation];

    if (!resolver) {
      throw new Error(`Resolver "${String(operation)}" does not exist`);
    }
    if (!resolver.handler) {
      throw new Error(`Resolver "${String(operation)}" does not have a handler`);
    }

    const validatedArgs = Validation.validateRootObjectInput(args, resolver.input);

    return resolver.handler(validatedArgs);
  }
}
