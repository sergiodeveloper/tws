# TWS - Type-Safe Web Server Framework

[![Test](https://github.com/sergiodeveloper/tws/actions/workflows/test.yml/badge.svg)](https://github.com/sergiodeveloper/tws/actions/workflows/test.yml)
[![NPM](https://img.shields.io/npm/v/@tws-js/server)](https://www.npmjs.com/package/@tws-js/server)

<p align="center">
  <img alt="TWS Logo" height="150" src="https://user-images.githubusercontent.com/7635171/232378489-e32588ea-e76b-4fd9-9cad-14bfb045e7b3.svg" />
  <br>
  <b>TWS is a framework built with TypeScript to create type-safe web servers.</b>
</p>

This framework was created with the purpose of enhancing the developer and user experience when developing and communicating with strongly typed APIs.

## Usage

### Installation

```bash
npm install @tws-js/server
```

### Example

Start the server:

```typescript
import { Operation, Schema, HTTPServerHelper } from '@tws-js/server';

const schema = new Schema({
  hello: new Operation({
    input: {
      name: {
        type: 'string',
        required: true,
        description: 'The name to greet',
      },
    },
    output: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          description: 'The greeting message',
        },
      },
    },
    handler: ({ name }, metadata) => { // "name" automatically typed as string
      return {
        // Typescript will warn if "message" is not a string,
        // as required by the output
        message: `Hello ${name}`,
      };
    },
  }),
}, {
  logger: {
    error: (message) => console.error(message),
  },
  enablePlayground: true,
});

HTTPServerHelper.create({
  port: 3000,
  schema,
  path: '/tws',
});
```

Send a request to the server:

```bash
curl -X POST \
  http://localhost:3000/tws \
  -H "Content-Type: application/json" \
  -d '{ "operation": "hello", "input": { "name": "TWS" } }'
```

Check the response:

```json
{
  "data": {
    "message": "Hello TWS"
  }
}
```

## Collaborating

### Setup

```bash
nvm use 20
npm install
```

### Running

```bash
npm start
```

### Testing

```bash
npm run lint
npm test
```
