import type { OutputType, OutputTypeDefinition } from '@tws-js/common';

import type { EventMap, OperationMap, Schema } from './schema';
import { SafeError } from './validation';
import { Server } from './server';

const express = require('express');

const DEFAULT_MAX_REQUEST_BODY_BYTES = 1000000;
const DEFAULT_SERVER_PATH = '/tws';
const DEFAULT_PLAYGROUND_PATH = '/tws';
const DEFAULT_SCHEMA_PATH = '/tws/schema';
const DEFAULT_ACCESS_CONTROL_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

const ACCESS_CONTROL_HEADER = 'Access-Control-Allow-Origin';

/**
 * Utilities for creating an HTTP server that can execute operations from a schema, serve
 * the schema and the HTML playground.
 */
export abstract class HTTPServerHelper {
  /**
   * Gets the body received in an HTTP request and returns it as a string.
   *
   * @throws {SafeError} if the body is too large.
   */
  static async getRequestBody(options: {
    request: {
      on: (event: 'data' | 'end', callback: (data: string) => void) => void;
    };
    maxBodyBytes: number;
  }): Promise<string> {
    let body = '';

    await new Promise((resolve, reject) => {
      options.request.on('data', function (chunk) {
        body += chunk;
        if (body.length > options.maxBodyBytes) {
          reject(new SafeError('Request body is too large'));
        }
      });
      options.request.on('end', resolve);
    });

    return body;
  }

  /**
   * Creates a handler for an Express server that can execute operations from a schema.
   *
   * This handler can be used when creating a route in an Express server.
   */
  static createExpressServerListener<
    Operations extends OperationMap,
    Events extends EventMap,
  >(options: {
    schema: Schema<Operations, Events>;
    maxRequestBodyBytes: number;
    allowedOrigin: string;
  }) {
    return async function (
      request: {
        on: (event: 'data' | 'end', callback: (data: string) => void) => void;
        headers: Record<string, string | string[] | undefined>;
      },
      res: {
        status: (code: number) => unknown;
        json: (data: {
          data?: OutputType<OutputTypeDefinition> | null;
          errors?: string[];
        }) => unknown;
        setHeader: (name: string, value: string) => unknown;
      },
    ): Promise<void> {
      let body: string;

      try {
        body = await HTTPServerHelper.getRequestBody({
          request,
          maxBodyBytes: options.maxRequestBodyBytes,
        });
      } catch (error) {
        res.status(400);
        res.setHeader(ACCESS_CONTROL_HEADER, options.allowedOrigin);
        res.json({
          errors: ['Failed to read request body', String(error)],
        });
        return;
      }

      const cleanHeaders: Record<string, string> = {};
      Object.keys(request.headers).forEach((key) => {
        const value = request.headers[key];
        if (typeof value === 'string') {
          cleanHeaders[key] = value;
        } else if (Array.isArray(value)) {
          cleanHeaders[key] = value.join('; ');
        }
      });

      const { data, errors } = await options.schema.executeClientRequest({
        body,
        externalHeaders: cleanHeaders,
      });

      if (errors?.length) {
        res.status(400);
        res.setHeader(ACCESS_CONTROL_HEADER, options.allowedOrigin);
        res.json({ data, errors });
      } else {
        res.status(200);
        res.setHeader(ACCESS_CONTROL_HEADER, options.allowedOrigin);
        res.json({ data });
      }
    };
  }

  /**
   * Creates a handler for an Express server that returns the HTML for the playground.
   *
   * This handler can be used when creating a route in an Express server.
   */
  static createExpressPlaygroundListener(options: {
    allowedOrigin: string;
    schemaPath: string;
    serverPath: string;
  }) {
    return (
      _request: unknown,
      res: {
        status: (code: number) => unknown;
        send: (data: string) => unknown;
        setHeader: (name: string, value: string) => unknown;
      },
    ) => {
      res.status(200);
      res.setHeader(ACCESS_CONTROL_HEADER, options.allowedOrigin);
      res.send(
        Server.processPlaygroundRequest({
          schemaPath: options.schemaPath,
          serverPath: options.serverPath,
        }),
      );
    };
  }

  /**
   * Creates a handler for an Express server that returns the schema as JSON.
   *
   * This handler can be used when creating a route in an Express server.
   */
  static createExpressSchemaListener<T extends OperationMap, U extends EventMap>(options: {
    schema: Schema<T, U>;
    allowedOrigin: string;
  }) {
    return (
      _request: unknown,
      res: {
        status: (code: number) => unknown;
        send: (data: string) => unknown;
        setHeader: (name: string, value: string) => unknown;
      },
    ) => {
      res.status(200);
      res.setHeader(ACCESS_CONTROL_HEADER, options.allowedOrigin);
      res.setHeader('Content-Type', 'application/json');
      res.send(Server.processSchemaRequest({ schema: options.schema }));
    };
  }

  /**
   * Creates a handler for an Express server that returns default headers for CORS
   * requests.
   *
   * This handler can be used when creating a route in an Express server.
   */
  static createExpressOptionsListener(options: { allowedOrigin: string; maxAge: number }) {
    return (
      _request: unknown,
      res: {
        status: (code: number) => unknown;
        send: () => unknown;
        setHeader: (name: string, value: string) => unknown;
      },
    ) => {
      res.setHeader(ACCESS_CONTROL_HEADER, options.allowedOrigin);
      res.setHeader('Access-Control-Allow-Methods', 'OPTIONS, GET, POST');
      res.setHeader('Access-Control-Allow-Headers', '*');
      res.setHeader('Access-Control-Max-Age', `${options.maxAge}`);
      res.status(200);
      res.send();
    };
  }

  /**
   * Creates an Express server with no routes.
   */
  static createEmptyExpressServer() {
    return express();
  }

  /**
   * Creates an Express server with routes for processing operations, serving the
   * playground, and serving the schema.
   */
  static async create<T extends OperationMap, U extends EventMap>(options: {
    port: number;
    schema: Schema<T, U>;
    maxRequestBodyBytes?: number;
    path?: string;
    allowedOrigin?: string;
    accessControlMaxAgeSeconds?: number;
    playgroundPath?: string;
    schemaPath?: string;
  }) {
    const app: import('express').Express = HTTPServerHelper.createEmptyExpressServer();

    const allowedOriginString = options.allowedOrigin ?? '*';

    app.options(
      '*',
      HTTPServerHelper.createExpressOptionsListener({
        allowedOrigin: allowedOriginString,
        maxAge: options.accessControlMaxAgeSeconds ?? DEFAULT_ACCESS_CONTROL_MAX_AGE,
      }),
    );

    app.post(
      options.path ?? DEFAULT_SERVER_PATH,
      HTTPServerHelper.createExpressServerListener({
        schema: options.schema,
        maxRequestBodyBytes: options.maxRequestBodyBytes ?? DEFAULT_MAX_REQUEST_BODY_BYTES,
        allowedOrigin: allowedOriginString,
      }),
    );

    if (options.schema.enablePlayground) {
      app.get(
        options.playgroundPath ?? DEFAULT_PLAYGROUND_PATH,
        HTTPServerHelper.createExpressPlaygroundListener({
          allowedOrigin: allowedOriginString,
          schemaPath: options.schemaPath ?? DEFAULT_SCHEMA_PATH,
          serverPath: options.path ?? DEFAULT_SERVER_PATH,
        }),
      );
    }

    if (options.schema.enableSchema) {
      app.get(
        options.schemaPath ?? DEFAULT_SCHEMA_PATH,
        HTTPServerHelper.createExpressSchemaListener({
          schema: options.schema,
          allowedOrigin: allowedOriginString,
        }),
      );
    }

    const netServer = app.listen(options.port);

    await new Promise((resolve) => netServer.on('listening', resolve));

    return {
      url: `http://localhost:${options.port}`,
      app,
      server: netServer,
      stop: async () => await new Promise((resolve) => netServer.close(resolve)),
    };
  }
}
