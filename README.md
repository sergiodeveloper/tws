# TWS - Type-Safe Web Server Framework

[![Test](https://github.com/sergiodeveloper/tws/actions/workflows/test.yml/badge.svg)](https://github.com/sergiodeveloper/tws/actions/workflows/test.yml)
[![NPM](https://img.shields.io/npm/v/@tws-js/server)](https://www.npmjs.com/package/@tws-js/server)

TWS is a framework built with TypeScript to create type-safe web servers.

✅ 100% code coverage

## Usage

### Installation

```bash
npm install @tws-js/server
```

### Example

Start the server:

```typescript
import { Resolver, Schema, createServer } from '@tws-js/server';

const schema = new Schema({
  hello: new Resolver({
    input: {
      name: {
        type: 'string',
        required: true,
        description: 'The name to greet',
      },
    },
    output: { message: 'string' },
    resolver: ({ name }) => { // "name" is automatically typed as string from the input
      return {
        // Typescript will warn if "message" is not a string, as required by the output
        message: `Hello ${name}`,
      };
    },
  }),
});

const server = createServer({
  schema,
  endpoint: '/tws',
  logger: {
    error: (message) => console.error(message),
  },
});

server.listen(3000);
```

Send a request to the server:

```bash
curl -X POST -H "Content-Type: application/json" -d '{ "operation": "hello", "input": { "name": "TWS" } }' http://localhost:3000/tws
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
nvm use 18
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
