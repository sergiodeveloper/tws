import type {
  HandlerInputType,
  InputTypeDefinition,
  InvocationInputType,
  OutputType,
  OutputTypeDefinition,
} from '@tws-js/common';

import { Validation, SafeError } from './validation';

export type OperationMetadata = {
  headers: Record<string, string>;
};

export interface ClientMessage {
  operation: string;
  headers: Record<string, string>;
  input: unknown;
  transactionId?: string;
}

/**
 * Operation that can be executed by the client.
 */
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

export type Event = {
  title?: string;
  description?: string;
  input: InputTypeDefinition;
};

/**
 * Operations that can be invoked by the client.
 */
export type OperationMap = Record<string, Operation<InputTypeDefinition, OutputTypeDefinition>>;

/**
 * Events that can be emitted by the server.
 */
export type EventMap = {
  [name: string]: Event;
};

export type Logger = {
  info?: (message: string) => void;
  error?: (message: string) => void;
};

/**
 * Aggregates operations and events.
 *
 * Can be used to execute operations.
 *
 * Does not communicate with the client directly.
 */
export class Schema<Operations extends OperationMap, Events extends EventMap> {
  operations: Operations;
  logger?: Logger;
  enablePlayground: boolean;
  enableSchema: boolean;
  remoteControl?: RemoteControl<Events>;

  constructor(
    operations: Operations,
    options?: {
      remoteControl?: RemoteControl<Events>;
      logger?: {
        info?: (message: string) => void;
        error?: (message: string) => void;
      };
      enablePlayground?: boolean;
      enableSchema?: boolean;
    },
  ) {
    this.operations = operations;
    this.remoteControl = options?.remoteControl;
    this.logger = options?.logger;
    this.enablePlayground = options?.enablePlayground ?? true;
    this.enableSchema = options?.enableSchema ?? true;
  }

  /**
   * Execute an operation with the given input and return the result.
   *
   * Validates the input and output.
   *
   * @throws {SafeError} if the operation does not exist or does not have a handler.
   * @throws {SafeError} if the input is invalid.
   * @throws {SafeError} if the output is invalid.
   * @throws {unknown} if the handler fails.
   */
  async execute<OperationName extends keyof Operations>(
    operationName: OperationName,
    input: InvocationInputType<Operations[OperationName]['input']>,
    metadata: Partial<OperationMetadata>,
  ): Promise<OutputType<Operations[OperationName]['output']>> {
    const operation = this.operations[operationName];

    if (!operation) {
      throw new SafeError(`Operation "${String(operationName)}" not found`);
    }
    if (!operation.handler) {
      throw new SafeError(`Operation "${String(operationName)}" does not have a handler`);
    }

    const validatedArgs = Validation.validateRootObjectInput(input, operation.input);

    const result = await operation.handler(validatedArgs, {
      headers: metadata.headers || {},
    });

    return Validation.validateAndCleanOutput(operation.output, result) as OutputType<
      Operations[OperationName]['output']
    >;
  }

  /**
   * Parses the raw message received from the client and returns a validated object.
   *
   * @throws {SafeError} if the message format is invalid.
   */
  private parseClientMessage(options: {
    rawMessage: string;
    externalHeaders?: Record<string, string>;
    requireTransactionId?: boolean;
  }): ClientMessage {
    let message: {
      operation?: unknown;
      headers?: unknown;
      input?: unknown;
      transactionId?: unknown;
    };

    try {
      message = JSON.parse(options.rawMessage);
    } catch (e) {
      throw new SafeError('Failed to parse client message, check if it is a valid JSON');
    }

    if (!message.operation || typeof message.operation !== 'string') {
      throw new SafeError('No operation provided in client message');
    }

    if (options.requireTransactionId && typeof message.transactionId !== 'string') {
      throw new SafeError('No transactionId provided in client message. Expected a string');
    }

    const headers =
      message.headers && typeof message.headers === 'object'
        ? Object.fromEntries(
            Object.entries(message.headers).map(([key, value]) => [key, String(value)]),
          )
        : options.externalHeaders;

    return {
      operation: message.operation,
      headers: headers || {},
      input: message.input,
      transactionId:
        options.requireTransactionId && typeof message.transactionId === 'string'
          ? message.transactionId
          : undefined,
    };
  }

  /**
   * Processes a response from a client.
   *
   * This is called when a client sends a message requesting the execution of an
   * operation.
   *
   * The result from the operation handler is returned.
   *
   * The body should be the body of the request received from the client. It
   * contains the attributes `operation`, `input` and optionally `headers`. If the
   * headers are not received in the body (for example, in HTTP servers), they can be
   * passed in the `externalHeaders` parameter.
   *
   * @throws {SafeError} if the message payload is invalid.
   * @throws {SafeError} if the operation does not exist or does not have a handler.
   * @throws {SafeError} if the operation input is invalid.
   * @throws {SafeError} if the handler output is invalid.
   * @throws {SafeError} if the operation handler fails.
   */
  public async executeClientRequest(options: {
    body: string;
    externalHeaders?: Record<string, string>;
    requireTransactionId?: boolean;
  }): Promise<{
    data?: OutputType<Operations[keyof Operations]['output']>;
    errors?: string[];
    transactionId?: string;
  }> {
    const errors: string[] = [];

    let message;

    try {
      message = this.parseClientMessage({
        rawMessage: options.body,
        externalHeaders: options.externalHeaders,
        requireTransactionId: options.requireTransactionId,
      });
    } catch (e) {
      errors.push(String(e));

      this.logger?.error?.(`Failed to parse client message: ${e}`);

      return {
        errors,
      };
    }

    this.logger?.info?.(
      `Received call from client: ${JSON.stringify({
        operation: message.operation,
        input: message.input,
      })}`,
    );

    let data;

    try {
      data = await this.execute(
        message.operation,
        message.input as InvocationInputType<Operations[keyof Operations]['input']>,
        {
          headers: message.headers,
        },
      );
    } catch (e) {
      this.logger?.error?.(
        `Failed to execute operation "${String(message.operation)}": ${String(e)}`,
      );

      errors.push(`Failed to execute operation "${String(message.operation)}"`);

      if (e instanceof SafeError) {
        errors.push(String(e));
      }
    }

    return {
      data,
      errors: errors.length > 0 ? errors : undefined,
      transactionId: message.transactionId,
    };
  }
}

export class RemoteControl<Events extends EventMap> {
  public events: Events;
  public eventSender: (event: {
    event: keyof Events;
    clientIds: string[];
    payload: string;
  }) => unknown;

  constructor(options: {
    events: Events;
    eventSender: (event: { event: keyof Events; clientIds: string[]; payload: string }) => unknown;
  }) {
    this.events = options.events;
    this.eventSender = options.eventSender;
  }

  /**
   * Sends a message to the client.
   *
   * Builds the payload and uses the event sender to send the message.
   */
  public async sendEvent(
    event: keyof Events,
    options: {
      clientIds: string[];
      data: InvocationInputType<Events[keyof Events]['input']>;
    },
  ) {
    const payload = {
      event,
      data: options.data,
    };

    this.eventSender({
      event,
      clientIds: options.clientIds,
      payload: JSON.stringify(payload),
    });
  }
}
