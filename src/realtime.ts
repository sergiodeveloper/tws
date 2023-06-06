import type { InvocationInputType, OutputType } from '@tws-js/common';

import type { ClientEventMap, OperationMap, Schema, ServerEventMap } from './schema';
import type { Logger } from './server';
import { Validation, ValidationError } from './validation';

const DEFAULT_OPERATION_RESPONSE_TIMEOUT_MS = 10000;

export class RealtimeManager<
  R extends OperationMap,
  S extends ClientEventMap,
  T extends ServerEventMap,
> {
  private schema: Schema<R, S, T>;
  private logger?: Logger;
  private clientEventSender: (event: { connectionIds: string[]; payload: string }) => void;
  private operationResponseTimeoutMs: number;
  private responseListeners: {
    [eventId: string]:
      | ((event: OutputType<T[keyof T]['output']>) => void | Promise<void>)
      | undefined;
  } = {};

  constructor(options: {
    schema: Schema<R, S, T>;
    logger?: Logger;
    clientEventSender: (event: { connectionIds: string[]; payload: string }) => void;
    operationResponseTimeoutMs?: number;
  }) {
    this.schema = options.schema;
    this.logger = options.logger;
    this.clientEventSender = options.clientEventSender;
    this.operationResponseTimeoutMs =
      options.operationResponseTimeoutMs ?? DEFAULT_OPERATION_RESPONSE_TIMEOUT_MS;
  }

  private sendEventToClient(options: {
    connectionIds: string[];
    type: 'call' | 'response';
    operation: string;
    eventId: string;
    payload: string;
  }) {
    const rawEvent = JSON.stringify({
      type: options.type,
      operation: options.operation,
      eventId: options.eventId,
      payload: options.payload,
    });

    this.logger?.info?.(`Sending event to client: ${rawEvent}`);
    this.clientEventSender({
      connectionIds: options.connectionIds,
      payload: rawEvent,
    });
  }

  private waitForResponse<ServerEventName extends keyof T>(options: {
    eventId: string;
  }): Promise<OutputType<T[ServerEventName]['output']>> {
    return new Promise((resolve) => {
      const timeoutId = setTimeout(() => {
        this.logger?.error(`Timeout while waiting for response to event ${options.eventId}`);
        delete this.responseListeners[options.eventId];
      }, this.operationResponseTimeoutMs);

      this.responseListeners[options.eventId] = (event) => {
        delete this.responseListeners[options.eventId];
        clearTimeout(timeoutId);
        resolve(event);
      };
    });
  }

  async publish<ServerEventName extends keyof T>(
    connectionIds: string[],
    serverEventName: ServerEventName,
    payload: InvocationInputType<T[ServerEventName]['input']>,
  ): Promise<OutputType<T[ServerEventName]['output']>> {
    const eventId = `event-${Math.floor(Math.random() * 1e10)}`;

    const serverEvent = this.schema.serverEvents[serverEventName];

    if (!serverEvent) {
      throw new ValidationError(`Server event "${String(serverEventName)}" not found`);
    }

    const validatedPayload = Validation.validateRootObjectInput(payload, serverEvent.input);

    const rawPayload = JSON.stringify(validatedPayload);

    const promise = this.waitForResponse<ServerEventName>({
      eventId,
    });

    this.sendEventToClient({
      connectionIds,
      type: 'call',
      operation: String(serverEventName),
      eventId,
      payload: rawPayload,
    });

    return await promise;
  }

  async processEventFromClient(options: { connectionId: string; payload: string }): Promise<void> {
    let event: {
      type?: 'call' | 'response';
      operation?: string;
      eventId?: string;
      payload?: string;
    };

    try {
      event = JSON.parse(options.payload);
    } catch (e) {
      this.logger?.error?.(`Failed to parse client event, check if it is valid JSON: ${e}`);
      return;
    }

    if (!event.operation) {
      this.logger?.error?.('No operation provided in client event');
      return;
    }

    if (!event.eventId) {
      this.logger?.error?.('No eventId provided in client event');
      return;
    }

    if (!event.payload) {
      this.logger?.error?.('No payload provided in client event');
      return;
    }

    if (event.type === 'call') {
      await this.processCallFromClient({
        connectionId: options.connectionId,
        operation: event.operation,
        eventId: event.eventId,
        payload: event.payload,
      });
    } else if (event.type === 'response') {
      await this.processResponseFromClient({
        operation: event.operation,
        eventId: event.eventId,
        payload: event.payload,
      });
    } else {
      this.logger?.error?.(`Unknown message type "${String(event.type)}" in client event`);
    }
  }

  private async processCallFromClient(options: {
    connectionId: string;
    operation: string;
    eventId: string;
    payload: string;
  }): Promise<void> {
    this.logger?.info?.(
      `Received call event from client: ${JSON.stringify({
        operation: options.operation,
        eventId: options.eventId,
        payload: options.payload,
      })}`,
    );

    const operation = this.schema.clientEvents[options.operation];

    if (!operation) {
      this.logger?.error?.(`Client event "${String(options.operation)}" not found in schema`);
      return;
    }
    if (!operation.handler) {
      this.logger?.error?.(`Client event "${String(options.operation)}" does not have a handler`);
      return;
    }

    let parsedPayload: InvocationInputType<S[keyof S]['input']>;
    try {
      parsedPayload = JSON.parse(options.payload);
    } catch (e) {
      this.logger?.error?.(`Failed to parse client event payload, check if it is valid JSON: ${e}`);
      return;
    }

    const validatedArgs = Validation.validateRootObjectInput(parsedPayload, operation.input);

    let result: OutputType<S[keyof S]['output']>;
    try {
      result = await operation.handler(validatedArgs, {
        headers: {},
      });
    } catch (e) {
      this.logger?.error(`Failed to process client event "${String(e)}"`);
      return;
    }

    const stringifiedResult = JSON.stringify(result);

    this.sendEventToClient({
      connectionIds: [options.connectionId],
      type: 'response',
      operation: options.operation,
      payload: stringifiedResult,
      eventId: options.eventId,
    });
  }

  private async processResponseFromClient(options: {
    operation: string;
    eventId: string;
    payload: string;
  }): Promise<void> {
    this.logger?.info?.(
      `Client sent a response: ${JSON.stringify({
        operation: options.operation,
        eventId: options.eventId,
        payload: options.payload,
      })}`,
    );
    const operation = this.schema.serverEvents[options.operation];

    if (!operation) {
      this.logger?.error?.(`Server event "${String(options.operation)}" not found in schema`);
      return;
    }

    let parsedPayload: OutputType<T[keyof T]['output']>;
    try {
      parsedPayload = JSON.parse(options.payload);
    } catch (e) {
      this.logger?.error?.(`Failed to parse client event payload, check if it is valid JSON: ${e}`);
      return;
    }

    const cleanOutput = Validation.validateAndCleanOutput(
      operation.output,
      parsedPayload,
    ) as OutputType<T[keyof T]['output']>;

    const listener = this.responseListeners[options.eventId];

    if (listener) {
      listener(cleanOutput);
      delete this.responseListeners[options.eventId];
    }
  }
}
