import type { InputTypeDefinition, InvocationInputType } from '@tws-js/common';

import type { EventMap, Logger, OperationMap, Schema } from './schema';
import { SafeError } from './validation';

export abstract class Server {
  static parseRequestBody(
    body: string,
    logger: Logger,
  ): {
    operation: string;
    input: InvocationInputType<InputTypeDefinition>;
  } {
    if (!body.length) {
      logger.error?.('No request body provided');
      throw new SafeError('No request body provided');
    }

    let parsedBody: { operation?: string; input?: InvocationInputType<InputTypeDefinition> };

    try {
      parsedBody = JSON.parse(body);
    } catch (e) {
      logger.error?.(`Failed to parse request body: ${e}`);
      throw new SafeError('Failed to parse request body, check if it is valid JSON');
    }

    if (!parsedBody.operation) {
      logger.error?.('No operation provided in request body');
      throw new SafeError('No operation provided');
    }

    if (!parsedBody.input) {
      logger.error?.('No input provided in request body');
      throw new SafeError('No input provided');
    }

    return {
      operation: parsedBody.operation,
      input: parsedBody.input,
    };
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
    <script
      type="module"
      crossorigin
      src="https://cdn.jsdelivr.net/npm/@tws-js/playground@2.0.1/dist/bundle.js"
    ></script>
    <link
      rel="stylesheet"
      crossorigin
      href="https://cdn.jsdelivr.net/npm/@tws-js/playground@2.0.1/dist/bundle.css"
    />
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>
`;
  }

  static processSchemaRequest<Operations extends OperationMap, Events extends EventMap>(options: {
    schema: Schema<Operations, Events>;
  }): string {
    const schema: Schema<Operations, Events> = JSON.parse(JSON.stringify(options.schema));

    Object.keys(schema.operations).forEach((operation) => {
      delete schema.operations[operation].handler;
    });

    return JSON.stringify(schema);
  }
}
