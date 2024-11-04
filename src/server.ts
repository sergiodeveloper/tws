import * as express from 'express';
import type {
  InputTypeDefinition,
  InvocationInputType,
  OutputType,
  OutputTypeDefinition,
} from '@tws-js/common';

import type { OperationMap, Schema } from './schema';
import { ValidationError } from './validation';

const DEFAULT_MAX_REQUEST_BODY_BYTES = 1000000;
const DEFAULT_SERVER_PATH = '/tws';
const DEFAULT_PLAYGROUND_PATH = '/tws';
const DEFAULT_SCHEMA_PATH = '/tws/schema';
const DEFAULT_ACCESS_CONTROL_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

const ACCESS_CONTROL_HEADER = 'Access-Control-Allow-Origin';

type Logger = {
  error: (message: string) => void;
};

export class Server {
  private constructor() {
    // no-op
  }

  static parseRequestBody(
    body: string,
    logger: Logger,
  ): {
    operation: string;
    input: InvocationInputType<InputTypeDefinition>;
  } {
    if (!body.length) {
      logger.error('No request body provided');
      throw new ValidationError('No request body provided');
    }

    let parsedBody: { operation?: string; input?: InvocationInputType<InputTypeDefinition> };

    try {
      parsedBody = JSON.parse(body);
    } catch (e) {
      logger.error(`Failed to parse request body: ${e}`);
      throw new ValidationError('Failed to parse request body, check if it is valid JSON');
    }

    if (!parsedBody.operation) {
      logger.error('No operation provided in request body');
      throw new ValidationError('No operation provided');
    }

    if (!parsedBody.input) {
      logger.error('No input provided in request body');
      throw new ValidationError('No input provided');
    }

    return {
      operation: parsedBody.operation,
      input: parsedBody.input,
    };
  }

  static async processServerRequest<T extends OperationMap>(options: {
    schema: Schema<T>;
    body: string;
    logger: Logger;
    headers: Record<string, string>;
  }): Promise<{ error?: string; data?: OutputType<OutputTypeDefinition> | null }> {
    let operation: string;
    let input: InvocationInputType<InputTypeDefinition>;

    try {
      ({ operation, input } = Server.parseRequestBody(options.body, options.logger));
    } catch (e) {
      options.logger.error(`Failed to parse request body: ${e}`);

      if (e instanceof ValidationError) {
        return { error: e.message };
      }

      return { error: 'Failed to parse request body. Check the server logs for more details' };
    }

    try {
      const result = await options.schema.execute(operation, input, {
        headers: options.headers,
      });

      return { data: result };
    } catch (e) {
      options.logger.error(`Failed to execute operation "${operation}": ${e}`);

      if (e instanceof ValidationError) {
        return { error: e.message };
      }

      return { error: 'Failed to execute operation. Check the server logs for more details' };
    }
  }

  static processPlaygroundRequest(options: { schemaPath: string; serverPath: string }): string {
    return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link
      rel="icon"
      type="image/png"
      href="https://cdn.jsdelivr.net/npm/@tws-js/playground@2.0.1/dist/favicon.png"
    />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>TWS Playground</title>
    <script type="text/javascript">
      window.TWS_SCHEMA_PATH = '${options.schemaPath}';
      window.TWS_SERVER_PATH = '${options.serverPath}';
    </script>
    <script type="module" crossorigin src="https://cdn.jsdelivr.net/npm/@tws-js/playground@2.0.1/dist/bundle.js"></script>
    <link rel="stylesheet" crossorigin href="https://cdn.jsdelivr.net/npm/@tws-js/playground@2.0.1/dist/bundle.css">
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>
`;
  }

  static processSchemaRequest<T extends OperationMap>(options: { schema: Schema<T> }): string {
    const schema: Schema<T> = JSON.parse(JSON.stringify(options.schema));

    Object.keys(schema.operations).forEach((operation) => {
      delete schema.operations[operation].handler;
    });

    return JSON.stringify(schema);
  }

  static async getRequestBody(
    req: {
      on: (event: 'data' | 'end', cb: (data: string) => void) => void;
    },
    maxBodyBytes: number,
  ): Promise<string> {
    let body = '';

    await new Promise((resolve, reject) => {
      req.on('data', function (chunk) {
        body += chunk;
        if (body.length > maxBodyBytes) {
          reject(new Error('Request body is too large'));
        }
      });
      req.on('end', resolve);
    });

    return body;
  }

  static createExpressServerListener<T extends OperationMap>(options: {
    schema: Schema<T>;
    maxRequestBodyBytes: number;
    logger: Logger;
    allowedOrigin: string;
  }) {
    return async function (
      req: {
        on: (event: 'data' | 'end', cb: (data: string) => void) => void;
        headers: Record<string, string | string[] | undefined>;
      },
      res: {
        status: (code: number) => unknown;
        json: (data: { error?: string; data?: OutputType<OutputTypeDefinition> | null }) => unknown;
        setHeader: (name: string, value: string) => unknown;
      },
    ): Promise<void> {
      const body = await Server.getRequestBody(req, options.maxRequestBodyBytes);

      const cleanHeaders: Record<string, string> = {};
      Object.keys(req.headers).forEach((key) => {
        const value = req.headers[key];
        if (typeof value === 'string') {
          cleanHeaders[key] = value;
        } else if (Array.isArray(value)) {
          cleanHeaders[key] = value.join('; ');
        }
      });

      const { error, data } = await Server.processServerRequest({
        schema: options.schema,
        body,
        logger: options.logger,
        headers: cleanHeaders,
      });

      if (error) {
        res.status(400);
        res.setHeader(ACCESS_CONTROL_HEADER, options.allowedOrigin);
        res.json({ error });
      } else {
        res.status(200);
        res.setHeader(ACCESS_CONTROL_HEADER, options.allowedOrigin);
        res.json({ data });
      }
    };
  }

  static createExpressPlaygroundListener(options: {
    allowedOrigin: string;
    schemaPath: string;
    serverPath: string;
  }) {
    return (
      req: unknown,
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

  static createExpressSchemaListener<T extends OperationMap>(options: {
    schema: Schema<T>;
    allowedOrigin: string;
  }) {
    return (
      req: unknown,
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

  static createExpressOptionsListener(options: { allowedOrigin: string; maxAge: number }) {
    return (
      req: unknown,
      res: {
        status: (code: number) => unknown;
        send: () => unknown;
        setHeader: (name: string, value: string) => unknown;
      },
    ) => {
      res.setHeader(ACCESS_CONTROL_HEADER, options.allowedOrigin);
      res.setHeader('Access-Control-Allow-Methods', 'OPTIONS, GET, POST, PUT, DELETE');
      res.setHeader('Access-Control-Allow-Headers', '*');
      res.setHeader('Access-Control-Max-Age', `${options.maxAge}`);
      res.status(200);
      res.send();
    };
  }

  static createExpressServer() {
    return express();
  }
}

export function createServer<T extends OperationMap>(options: {
  schema: Schema<T>;
  logger: Logger;
  maxRequestBodyBytes?: number;
  path?: string;
  allowedOrigins?: string[];
  accessControlMaxAgeSeconds?: number;
  playgroundPath?: string;
  enablePlayground?: boolean;
  schemaPath?: string;
  enableSchema?: boolean;
}): express.Express {
  const app = Server.createExpressServer();

  const allowedOriginsString = options.allowedOrigins?.join(',') ?? '*';

  app.options(
    '*',
    Server.createExpressOptionsListener({
      allowedOrigin: allowedOriginsString,
      maxAge: options.accessControlMaxAgeSeconds ?? DEFAULT_ACCESS_CONTROL_MAX_AGE,
    }),
  );

  app.post(
    options.path ?? DEFAULT_SERVER_PATH,
    Server.createExpressServerListener({
      schema: options.schema,
      maxRequestBodyBytes: options.maxRequestBodyBytes ?? DEFAULT_MAX_REQUEST_BODY_BYTES,
      logger: options.logger,
      allowedOrigin: allowedOriginsString,
    }),
  );

  if (options.enablePlayground) {
    app.get(
      options.playgroundPath ?? DEFAULT_PLAYGROUND_PATH,
      Server.createExpressPlaygroundListener({
        allowedOrigin: allowedOriginsString,
        schemaPath: options.schemaPath ?? DEFAULT_SCHEMA_PATH,
        serverPath: options.path ?? DEFAULT_SERVER_PATH,
      }),
    );
  }

  if (options.enableSchema || options.enablePlayground) {
    app.get(
      options.schemaPath ?? DEFAULT_SCHEMA_PATH,
      Server.createExpressSchemaListener({
        schema: options.schema,
        allowedOrigin: allowedOriginsString,
      }),
    );
  }

  return app;
}
