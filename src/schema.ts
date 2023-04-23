import type {
  HandlerInputType,
  InputTypeDefinition,
  InvocationInputType,
  OutputType,
  OutputTypeDefinition,
} from '@tws-js/common';

import { Validation, ValidationError } from './validation';

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
