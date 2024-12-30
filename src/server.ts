import type { EventMap, OperationMap, Schema } from './schema';

export abstract class Server {
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
    const schema: Schema<Operations, Events> = JSON.parse(
      JSON.stringify({
        operations: options.schema.operations,
        events: options.schema.remoteControl?.events || {},
      }),
    );

    Object.keys(schema.operations).forEach((operation) => {
      delete schema.operations[operation].handler;
    });

    return JSON.stringify(schema);
  }
}
