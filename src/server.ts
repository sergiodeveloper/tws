import * as express from 'express';

import type {
  InputTypeDefinition,
  InvocationInputType,
  OutputType,
  OutputTypeDefinition,
  ResolverMap,
  Schema,
} from './schema';

const DEFAULT_MAX_REQUEST_BODY_BYTES = 1000000;
const DEFAULT_ENDPOINT = '/tws';

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
      throw new Error('No request body provided');
    }

    let parsedBody: { operation?: string; input?: InvocationInputType<InputTypeDefinition> };

    try {
      parsedBody = JSON.parse(body);
    } catch (e) {
      logger.error(`Failed to parse request body: ${e}`);
      throw new Error('Failed to parse request body, check if it is valid JSON');
    }

    if (!parsedBody.operation) {
      logger.error('No operation provided in request body');
      throw new Error('No operation provided');
    }

    if (!parsedBody.input) {
      logger.error('No input provided in request body');
      throw new Error('No input provided');
    }

    return {
      operation: parsedBody.operation,
      input: parsedBody.input,
    };
  }

  static async processPostRequest(options: {
    schema: Schema<ResolverMap>;
    body: string;
    logger: Logger;
  }): Promise<{ error?: string; data?: OutputType<OutputTypeDefinition> | null }> {
    let operation: string;
    let input: InvocationInputType<InputTypeDefinition>;

    try {
      ({ operation, input } = Server.parseRequestBody(options.body, options.logger));
    } catch (e) {
      return { error: `Failed to parse request body: ${e}` };
    }

    try {
      const result = await options.schema.execute(operation, input);

      return { data: result };
    } catch (e) {
      options.logger.error(`Failed to execute operation "${operation}": ${e}`);
      return { error: 'Failed to execute operation, please check your request body' };
    }
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

  static createExpressEndpointListener(options: {
    schema: Schema<ResolverMap>;
    maxRequestBodyBytes: number;
    logger: Logger;
  }) {
    return async function (
      req: {
        on: (event: 'data' | 'end', cb: (data: string) => void) => void;
      },
      res: {
        status: (code: number) => unknown;
        json: (data: { error?: string; data?: OutputType<OutputTypeDefinition> | null }) => unknown;
      },
    ): Promise<void> {
      const body = await Server.getRequestBody(req, options.maxRequestBodyBytes);

      const { error, data } = await Server.processPostRequest({
        schema: options.schema,
        body,
        logger: options.logger,
      });

      if (error) {
        res.status(400);
        res.json({ error });
      } else {
        res.status(200);
        res.json({ data });
      }
    };
  }

  static createExpressServer() {
    return express();
  }
}

export function createServer(options: {
  schema: Schema<ResolverMap>;
  logger: Logger;
  maxRequestBodyBytes?: number;
  endpoint?: string;
}): express.Express {
  const app = Server.createExpressServer();

  app.post(
    options.endpoint ?? DEFAULT_ENDPOINT,
    Server.createExpressEndpointListener({
      schema: options.schema,
      maxRequestBodyBytes: options.maxRequestBodyBytes ?? DEFAULT_MAX_REQUEST_BODY_BYTES,
      logger: options.logger,
    }),
  );

  return app;
}
