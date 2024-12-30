import { Operation, Schema } from '../../src';

import {
  HELLO_SCHEMA,
  httpPost,
  JSON_HEADER,
  INT_MULTIPLY_SCHEMA,
  ServerProvider,
  FLOAT_SUM_SCHEMA,
  BOOLEAN_NEGATE_SCHEMA,
} from './utils';

const servers = new ServerProvider();

describe('client runs operation', () => {
  afterEach(async () => {
    jest.restoreAllMocks();
    await servers.stop();
  });

  test('execute an existing operation', async () => {
    const schemaHandlerSpy = jest.spyOn(HELLO_SCHEMA.operations.hello, 'handler' as never);

    const server = await servers.createTwsHttpServer({
      schema: HELLO_SCHEMA,
    });

    const error1 = 'Failed to execute operation "hello"';

    const response1 = await httpPost({
      url: `${server.url}/tws`,
      headers: JSON_HEADER,
      body: JSON.stringify({
        operation: 'hello',
        input: {
          name: 'world',
        },
      }),
    });

    expect(response1.status).toBe(200);
    expect(response1.json).toEqual({
      data: 'Hello world!',
    });

    expect(schemaHandlerSpy).toHaveBeenCalledTimes(1);
    expect(schemaHandlerSpy).toHaveBeenCalledWith(
      {
        name: 'world',
      },
      {
        headers: expect.objectContaining({
          'content-type': 'application/json',
        }),
      },
    );

    const response2 = await httpPost({
      url: `${server.url}/tws`,
      headers: JSON_HEADER,
      body: JSON.stringify({
        operation: 'hello',
        input: undefined,
      }),
    });

    expect(response2.status).toBe(400);
    expect(response2.json).toEqual({
      errors: [error1, 'Input must be of type object, got undefined'],
    });

    const response3 = await httpPost({
      url: `${server.url}/tws`,
      headers: JSON_HEADER,
      body: JSON.stringify({
        operation: 'hello',
        input: 10,
      }),
    });

    expect(response3.status).toBe(400);
    expect(response3.json).toEqual({
      errors: [error1, 'Input must be of type object, got number'],
    });

    const response4 = await httpPost({
      url: `${server.url}/tws`,
      headers: JSON_HEADER,
      body: JSON.stringify({
        operation: 'hello',
        input: [],
      }),
    });

    expect(response4.status).toBe(400);
    expect(response4.json).toEqual({
      errors: [error1, 'Input must be of type object, got array'],
    });

    const response5 = await httpPost({
      url: `${server.url}/tws`,
      headers: JSON_HEADER,
      body: JSON.stringify({
        operation: 'hello',
        input: null,
      }),
    });

    expect(response5.status).toBe(400);
    expect(response5.json).toEqual({
      errors: [error1, 'Input must be of type object, got null'],
    });
  });

  test('execute an operation on different endpoint', async () => {
    const server = await servers.createTwsHttpServer({
      schema: HELLO_SCHEMA,
      path: '/testpath',
    });

    const response = await httpPost({
      url: `${server.url}/testpath`,
      headers: JSON_HEADER,
      body: JSON.stringify({
        operation: 'hello',
        input: {
          name: 'world',
        },
      }),
    });

    expect(response.status).toBe(200);
    expect(response.json).toEqual({
      data: 'Hello world!',
    });

    const response2 = await httpPost({
      url: `${server.url}/tws`,
      headers: JSON_HEADER,
      body: JSON.stringify({
        operation: 'hello',
        input: {
          name: 'world',
        },
      }),
    });
    expect(response2.status).toBe(404);
  });

  test('execute an unknown operation', async () => {
    const server = await servers.createTwsHttpServer({
      schema: HELLO_SCHEMA,
    });

    const response = await httpPost({
      url: `${server.url}/tws`,
      headers: JSON_HEADER,
      body: JSON.stringify({
        operation: 'testoperation',
        input: {
          name: 'world',
        },
      }),
    });

    expect(response.status).toBe(400);
    expect(response.json).toEqual({
      errors: [
        'Failed to execute operation "testoperation"',
        'Operation "testoperation" not found',
      ],
    });
  });

  test('execute an operation with unknown output type', async () => {
    const server = await servers.createTwsHttpServer({
      schema: new Schema({
        glitch: {
          input: {},
          output: {
            // @ts-expect-error Unknown type
            type: 'unknown',
          },
          // @ts-expect-error Unknown type
          handler: () => 'test',
        },
      }),
    });

    const response = await httpPost({
      url: `${server.url}/tws`,
      headers: JSON_HEADER,
      body: JSON.stringify({
        operation: 'glitch',
        input: {},
      }),
    });

    expect(response.status).toBe(400);
    expect(response.json).toEqual({
      errors: ['Failed to execute operation "glitch"', 'Server error: unknown output type'],
    });
  });

  test('execute an operation with unknown input type', async () => {
    const server = await servers.createTwsHttpServer({
      schema: new Schema({
        glitch: {
          input: {
            chart: {
              // @ts-expect-error Unknown type
              type: 'unknown',
            },
          },
          output: {
            type: 'string',
          },
          // @ts-expect-error Unknown type
          handler: () => 'test',
        },
      }),
    });

    const response = await httpPost({
      url: `${server.url}/tws`,
      headers: JSON_HEADER,
      body: JSON.stringify({
        operation: 'glitch',
        input: {
          chart: 'test',
        },
      }),
    });

    expect(response.status).toBe(400);
    expect(response.json).toEqual({
      errors: [
        'Failed to execute operation "glitch"',
        'Server error: unknown input type for "chart"',
      ],
    });
  });

  test('execute an operation with string', async () => {
    const server = await servers.createTwsHttpServer({
      schema: HELLO_SCHEMA,
    });

    const response = await httpPost({
      url: `${server.url}/tws`,
      headers: JSON_HEADER,
      body: JSON.stringify({
        operation: 'hello',
        input: {
          name: '1',
        },
      }),
    });

    expect(response.status).toBe(200);
    expect(response.json).toEqual({
      data: 'Hello 1!',
    });

    const server2 = await servers.createTwsHttpServer({
      schema: HELLO_SCHEMA,
    });

    const response2 = await httpPost({
      url: `${server2.url}/tws`,
      headers: JSON_HEADER,
      body: JSON.stringify({
        operation: 'hello',
        input: {
          name: 1,
        },
      }),
    });

    expect(response2.status).toBe(400);
    expect(response2.json).toEqual({
      errors: ['Failed to execute operation "hello"', '"name" must be of type string, got number'],
    });
  });

  test('execute an operation with integer', async () => {
    const server = await servers.createTwsHttpServer({
      schema: INT_MULTIPLY_SCHEMA,
    });

    const response = await httpPost({
      url: `${server.url}/tws`,
      headers: JSON_HEADER,
      body: JSON.stringify({
        operation: 'multiply',
        input: {
          a: 4,
          b: 2,
        },
      }),
    });

    expect(response.status).toBe(200);
    expect(response.json).toEqual({
      data: 8,
    });

    const server2 = await servers.createTwsHttpServer({
      schema: INT_MULTIPLY_SCHEMA,
    });

    const response2 = await httpPost({
      url: `${server2.url}/tws`,
      headers: JSON_HEADER,
      body: JSON.stringify({
        operation: 'multiply',
        input: {
          a: 3.14,
          b: 2,
        },
      }),
    });

    expect(response2.status).toBe(400);
    expect(response2.json).toEqual({
      errors: ['Failed to execute operation "multiply"', '"a" must be of type integer, got float'],
    });
  });

  test('execute an operation with float', async () => {
    const server = await servers.createTwsHttpServer({
      schema: FLOAT_SUM_SCHEMA,
    });

    const response = await httpPost({
      url: `${server.url}/tws`,
      headers: JSON_HEADER,
      body: JSON.stringify({
        operation: 'sum',
        input: {
          a: 4.23,
          b: 2,
        },
      }),
    });

    expect(response.status).toBe(200);
    expect(response.json).toEqual({
      data: 6.23,
    });

    const server2 = await servers.createTwsHttpServer({
      schema: FLOAT_SUM_SCHEMA,
    });

    const response2 = await httpPost({
      url: `${server2.url}/tws`,
      headers: JSON_HEADER,
      body: JSON.stringify({
        operation: 'sum',
        input: {
          a: '3.14',
          b: 2,
        },
      }),
    });

    expect(response2.status).toBe(400);
    expect(response2.json).toEqual({
      errors: ['Failed to execute operation "sum"', '"a" must be of type float, got string'],
    });
  });

  test('execute an operation with boolean', async () => {
    const server = await servers.createTwsHttpServer({
      schema: BOOLEAN_NEGATE_SCHEMA,
    });

    const response = await httpPost({
      url: `${server.url}/tws`,
      headers: JSON_HEADER,
      body: JSON.stringify({
        operation: 'negate',
        input: {
          a: true,
        },
      }),
    });

    expect(response.status).toBe(200);
    expect(response.json).toEqual({
      data: false,
    });

    const server2 = await servers.createTwsHttpServer({
      schema: BOOLEAN_NEGATE_SCHEMA,
    });

    const response2 = await httpPost({
      url: `${server2.url}/tws`,
      headers: JSON_HEADER,
      body: JSON.stringify({
        operation: 'negate',
        input: {
          a: 'true',
        },
      }),
    });

    expect(response2.status).toBe(400);
    expect(response2.json).toEqual({
      errors: ['Failed to execute operation "negate"', '"a" must be of type boolean, got string'],
    });
  });

  test('execute an operation with empty value and a default', async () => {
    const server = await servers.createTwsHttpServer({
      schema: new Schema({
        hello: new Operation({
          title: 'reverse string',
          description: 'reverses a string',
          input: {
            value: {
              type: 'string',
              defaultValue: 'abc',
            },
          },
          output: {
            type: 'string',
          },
          handler: (input) => input.value.split('').reverse().join(''),
        }),
      }),
    });

    const response1 = await httpPost({
      url: `${server.url}/tws`,
      headers: JSON_HEADER,
      body: JSON.stringify({
        operation: 'hello',
        input: {
          value: 'test',
        },
      }),
    });

    expect(response1.status).toBe(200);
    expect(response1.json).toEqual({
      data: 'tset',
    });

    const response2 = await httpPost({
      url: `${server.url}/tws`,
      headers: JSON_HEADER,
      body: JSON.stringify({
        operation: 'hello',
        input: {
          value: '',
        },
      }),
    });

    expect(response2.status).toBe(200);
    expect(response2.json).toEqual({
      data: '',
    });

    const response3 = await httpPost({
      url: `${server.url}/tws`,
      headers: JSON_HEADER,
      body: JSON.stringify({
        operation: 'hello',
        input: {},
      }),
    });

    expect(response3.status).toBe(200);
    expect(response3.json).toEqual({
      data: 'cba',
    });

    const response4 = await httpPost({
      url: `${server.url}/tws`,
      headers: JSON_HEADER,
      body: JSON.stringify({
        operation: 'hello',
        input: {
          value: null,
        },
      }),
    });

    expect(response4.status).toBe(200);
    expect(response4.json).toEqual({
      data: 'cba',
    });

    const response5 = await httpPost({
      url: `${server.url}/tws`,
      headers: JSON_HEADER,
      body: JSON.stringify({
        operation: 'hello',
        input: {
          value: undefined,
        },
      }),
    });

    expect(response5.status).toBe(200);
    expect(response5.json).toEqual({
      data: 'cba',
    });
  });

  test('execute an operation with empty value and no default', async () => {
    const server = await servers.createTwsHttpServer({
      schema: new Schema({
        divide: new Operation({
          input: {
            a: {
              type: 'float',
            },
            b: {
              type: 'float',
            },
          },
          output: {
            type: 'float',
          },
          handler: (input) => input.a / input.b,
        }),
      }),
    });

    const response1 = await httpPost({
      url: `${server.url}/tws`,
      headers: JSON_HEADER,
      body: JSON.stringify({
        operation: 'divide',
        input: {},
      }),
    });

    expect(response1.status).toBe(400);
    expect(response1.json).toEqual({
      errors: ['Failed to execute operation "divide"', '"a" is required'],
    });
  });

  test('execute an operation with empty and non-required value', async () => {
    const server = await servers.createTwsHttpServer({
      schema: new Schema({
        additionalInfo: new Operation({
          input: {
            info: {
              type: 'string',
              required: false,
            },
          },
          output: {
            type: 'string',
            required: false,
          },
          handler: (input) => input.info,
        }),
      }),
    });

    const response1 = await httpPost({
      url: `${server.url}/tws`,
      headers: JSON_HEADER,
      body: JSON.stringify({
        operation: 'additionalInfo',
        input: {},
      }),
    });

    expect(response1.status).toBe(200);
    expect(response1.json).toEqual({
      data: undefined,
    });
  });

  test('execute an operation with object input', async () => {
    const server = await servers.createTwsHttpServer({
      schema: new Schema({
        subscribe: new Operation({
          input: {
            contact: {
              type: 'object',
              properties: {
                name: {
                  type: 'string',
                },
                email: {
                  type: 'string',
                },
              },
            },
          },
          output: {
            type: 'string',
          },
          handler: (input) => `${input.contact.name} (${input.contact.email})`,
        }),
      }),
    });

    const response1 = await httpPost({
      url: `${server.url}/tws`,
      headers: JSON_HEADER,
      body: JSON.stringify({
        operation: 'subscribe',
        input: {
          contact: {
            name: 'test name',
            email: 'testEmail',
          },
        },
      }),
    });

    expect(response1.status).toBe(200);
    expect(response1.json).toEqual({
      data: 'test name (testEmail)',
    });

    const response2 = await httpPost({
      url: `${server.url}/tws`,
      headers: JSON_HEADER,
      body: JSON.stringify({
        operation: 'subscribe',
        input: {
          contact: undefined,
        },
      }),
    });

    expect(response2.status).toBe(400);
    expect(response2.json).toEqual({
      errors: [
        'Failed to execute operation "subscribe"',
        '"contact" must be of type object, got undefined',
      ],
    });

    const response3 = await httpPost({
      url: `${server.url}/tws`,
      headers: JSON_HEADER,
      body: JSON.stringify({
        operation: 'subscribe',
        input: {
          contact: 30,
        },
      }),
    });

    expect(response3.status).toBe(400);
    expect(response3.json).toEqual({
      errors: [
        'Failed to execute operation "subscribe"',
        '"contact" must be of type object, got number',
      ],
    });
  });

  test('execute an operation with a non-required object input', async () => {
    const server = await servers.createTwsHttpServer({
      schema: new Schema({
        subscribe: new Operation({
          input: {
            contact: {
              type: 'object',
              properties: {
                name: {
                  type: 'string',
                },
                email: {
                  type: 'string',
                },
              },
              required: false,
            },
          },
          output: {
            type: 'object',
            properties: {
              name: {
                type: 'string',
              },
              email: {
                type: 'string',
              },
            },
            required: false,
          },
          handler: (input) => input.contact,
        }),
      }),
    });

    const response1 = await httpPost({
      url: `${server.url}/tws`,
      headers: JSON_HEADER,
      body: JSON.stringify({
        operation: 'subscribe',
        input: {},
      }),
    });

    expect(response1.status).toBe(200);
    expect(response1.json).toEqual({
      data: undefined,
    });
  });

  test('execute an operation with object containing array, object and enum', async () => {
    const server = await servers.createTwsHttpServer({
      schema: new Schema({
        subscribe: new Operation({
          input: {
            contact: {
              type: 'object',
              properties: {
                name: {
                  type: 'string',
                },
                email: {
                  type: 'object',
                  properties: {
                    address: {
                      type: 'string',
                    },
                    domain: {
                      type: 'string',
                    },
                  },
                },
                departments: {
                  type: 'array',
                  item: {
                    type: 'string',
                  },
                },
                role: {
                  type: 'enum',
                  values: {
                    admin: {
                      title: 'admin',
                    },
                    user: {
                      title: 'user',
                    },
                  },
                },
              },
            },
          },
          output: {
            type: 'object',
            properties: {
              name: {
                type: 'string',
              },
              email: {
                type: 'object',
                properties: {
                  address: {
                    type: 'string',
                  },
                  domain: {
                    type: 'string',
                  },
                },
              },
              departments: {
                type: 'array',
                item: {
                  type: 'string',
                },
              },
              role: {
                type: 'enum',
                values: {
                  admin: {
                    title: 'admin',
                  },
                  user: {
                    title: 'user',
                  },
                },
              },
            },
          },
          handler: (input) => input.contact,
        }),
      }),
    });

    const response1 = await httpPost({
      url: `${server.url}/tws`,
      headers: JSON_HEADER,
      body: JSON.stringify({
        operation: 'subscribe',
        input: {
          contact: {
            name: 'test name',
            email: {
              address: 'testaddress',
              domain: 'testdomain',
            },
            departments: ['IT', 'HR'],
            role: 'admin',
          },
        },
      }),
    });

    expect(response1.status).toBe(200);
    expect(response1.json).toEqual({
      data: {
        name: 'test name',
        email: {
          address: 'testaddress',
          domain: 'testdomain',
        },
        departments: ['IT', 'HR'],
        role: 'admin',
      },
    });
  });

  test('execute an operation with required enum', async () => {
    const server = await servers.createTwsHttpServer({
      schema: new Schema({
        updateStatus: new Operation({
          input: {
            status: {
              type: 'enum',
              values: {
                active: {
                  title: 'active',
                },
                inactive: {
                  title: 'inactive',
                },
              },
            },
          },
          output: {
            type: 'enum',
            values: {
              active: {
                title: 'active',
              },
              inactive: {
                title: 'inactive',
              },
            },
          },
          handler: (input) => input.status,
        }),
      }),
    });

    const error1 = 'Failed to execute operation "updateStatus"';

    const response1 = await httpPost({
      url: `${server.url}/tws`,
      headers: JSON_HEADER,
      body: JSON.stringify({
        operation: 'updateStatus',
        input: {
          status: 'active',
        },
      }),
    });

    expect(response1.status).toBe(200);
    expect(response1.json).toEqual({
      data: 'active',
    });

    const response2 = await httpPost({
      url: `${server.url}/tws`,
      headers: JSON_HEADER,
      body: JSON.stringify({
        operation: 'updateStatus',
        input: {
          status: 'invalidvalue',
        },
      }),
    });

    expect(response2.status).toBe(400);
    expect(response2.json).toEqual({
      errors: [error1, '"status" must be one of: "active", "inactive", got "invalidvalue"'],
    });

    const response3 = await httpPost({
      url: `${server.url}/tws`,
      headers: JSON_HEADER,
      body: JSON.stringify({
        operation: 'updateStatus',
        input: {},
      }),
    });

    expect(response3.status).toBe(400);
    expect(response3.json).toEqual({
      errors: [error1, '"status" is required'],
    });

    const response4 = await httpPost({
      url: `${server.url}/tws`,
      headers: JSON_HEADER,
      body: JSON.stringify({
        operation: 'updateStatus',
        input: {
          status: 40,
        },
      }),
    });

    expect(response4.status).toBe(400);
    expect(response4.json).toEqual({
      errors: [error1, '"status" must be of type string, got number'],
    });
  });

  test('execute an operation with enum with invalid default value', async () => {
    const server = await servers.createTwsHttpServer({
      schema: new Schema({
        setStatus: new Operation({
          input: {
            status: {
              type: 'enum',
              values: {
                active: {
                  title: 'active',
                },
                inactive: {
                  title: 'inactive',
                },
              },
              defaultValue: 'invalidvalue',
            },
          },
          output: {
            type: 'string',
            required: false,
          },
          handler: (input) => input.status,
        }),
      }),
    });

    const response1 = await httpPost({
      url: `${server.url}/tws`,
      headers: JSON_HEADER,
      body: JSON.stringify({
        operation: 'setStatus',
        input: {},
      }),
    });

    expect(response1.status).toBe(400);
    expect(response1.json).toEqual({
      errors: [
        'Failed to execute operation "setStatus"',
        'Server error: default value for "status" must be one of: "active", "inactive"',
      ],
    });
  });

  test('execute an operation with enum with default value', async () => {
    const server = await servers.createTwsHttpServer({
      schema: new Schema({
        checkin: new Operation({
          input: {
            status: {
              type: 'enum',
              values: {
                checkin: {
                  title: 'check-in',
                },
              },
              defaultValue: 'checkin',
            },
          },
          output: {
            type: 'string',
            required: false,
          },
          handler: (input) => input.status,
        }),
      }),
    });

    const response1 = await httpPost({
      url: `${server.url}/tws`,
      headers: JSON_HEADER,
      body: JSON.stringify({
        operation: 'checkin',
        input: {},
      }),
    });

    // expect(response1.status).toBe(200);
    expect(response1.json).toEqual({
      data: 'checkin',
    });
  });

  test('execute an operation with non-required enum', async () => {
    const server = await servers.createTwsHttpServer({
      schema: new Schema({
        checkin: new Operation({
          input: {
            status: {
              type: 'enum',
              values: {
                checkin: {
                  title: 'check-in',
                },
              },
              required: false,
            },
          },
          output: {
            type: 'string',
            required: false,
          },
          handler: (input) => input.status,
        }),
      }),
    });

    const response1 = await httpPost({
      url: `${server.url}/tws`,
      headers: JSON_HEADER,
      body: JSON.stringify({
        operation: 'checkin',
        input: {},
      }),
    });

    expect(response1.status).toBe(200);
    expect(response1.json).toEqual({
      data: undefined,
    });
  });

  test('execute an operation with array', async () => {
    const server = await servers.createTwsHttpServer({
      schema: new Schema({
        nicknames: new Operation({
          input: {
            nicknames: {
              type: 'array',
              item: {
                type: 'string',
                description: 'Nicknames',
              },
            },
          },
          output: {
            type: 'array',
            item: {
              type: 'string',
              description: 'Nicknames',
            },
          },
          handler: (input) => input.nicknames,
        }),
      }),
    });

    const response1 = await httpPost({
      url: `${server.url}/tws`,
      headers: JSON_HEADER,
      body: JSON.stringify({
        operation: 'nicknames',
        input: {
          nicknames: ['John', 'Joe', 'Jack'],
        },
      }),
    });

    expect(response1.status).toBe(200);
    expect(response1.json).toEqual({
      data: ['John', 'Joe', 'Jack'],
    });

    const response2 = await httpPost({
      url: `${server.url}/tws`,
      headers: JSON_HEADER,
      body: JSON.stringify({
        operation: 'nicknames',
        input: {},
      }),
    });

    expect(response2.status).toBe(400);
    expect(response2.json).toEqual({
      errors: [
        'Failed to execute operation "nicknames"',
        '"nicknames" must be of type array, got undefined',
      ],
    });

    const response3 = await httpPost({
      url: `${server.url}/tws`,
      headers: JSON_HEADER,
      body: JSON.stringify({
        operation: 'nicknames',
        input: {
          nicknames: 40,
        },
      }),
    });

    expect(response3.status).toBe(400);
    expect(response3.json).toEqual({
      errors: [
        'Failed to execute operation "nicknames"',
        '"nicknames" must be of type array, got number',
      ],
    });
  });

  test('execute an operation with array of object', async () => {
    const server = await servers.createTwsHttpServer({
      schema: new Schema({
        createBlog: new Operation({
          input: {
            pages: {
              type: 'array',
              item: {
                type: 'object',
                properties: {
                  title: {
                    type: 'string',
                  },
                  content: {
                    type: 'string',
                  },
                },
              },
            },
          },
          output: {
            type: 'array',
            item: {
              type: 'object',
              properties: {
                title: {
                  type: 'string',
                },
                content: {
                  type: 'string',
                },
              },
            },
          },
          handler: (input) => input.pages,
        }),
      }),
    });

    const response1 = await httpPost({
      url: `${server.url}/tws`,
      headers: JSON_HEADER,
      body: JSON.stringify({
        operation: 'createBlog',
        input: {
          pages: [
            { title: 'Title 1', content: 'Content 1' },
            { title: 'Title 2', content: 'Content 2' },
          ],
        },
      }),
    });

    expect(response1.status).toBe(200);
    expect(response1.json).toEqual({
      data: [
        { title: 'Title 1', content: 'Content 1' },
        { title: 'Title 2', content: 'Content 2' },
      ],
    });
  });

  test('execute an operation with array of arrays', async () => {
    const server = await servers.createTwsHttpServer({
      schema: new Schema({
        createMatrix: new Operation({
          input: {
            matrix: {
              type: 'array',
              item: {
                type: 'array',
                item: {
                  type: 'int',
                },
              },
            },
          },
          output: {
            type: 'array',
            item: {
              type: 'array',
              item: {
                type: 'int',
              },
            },
          },
          handler: (input) => input.matrix,
        }),
      }),
    });

    const response1 = await httpPost({
      url: `${server.url}/tws`,
      headers: JSON_HEADER,
      body: JSON.stringify({
        operation: 'createMatrix',
        input: {
          matrix: [
            [1, 2],
            [3, 4],
          ],
        },
      }),
    });

    expect(response1.status).toBe(200);
    expect(response1.json).toEqual({
      data: [
        [1, 2],
        [3, 4],
      ],
    });
  });

  test('execute an operation with array of enums', async () => {
    const server = await servers.createTwsHttpServer({
      schema: new Schema({
        hobbies: new Operation({
          input: {
            hobbies: {
              type: 'array',
              item: {
                type: 'enum',
                values: {
                  reading: {
                    title: 'Reading',
                  },
                  writing: {
                    title: 'Writing',
                  },
                },
              },
            },
          },
          output: {
            type: 'array',
            item: {
              type: 'enum',
              values: {
                reading: {
                  title: 'Reading',
                },
                writing: {
                  title: 'Writing',
                },
              },
            },
          },
          handler: (input) => input.hobbies,
        }),
      }),
    });

    const response1 = await httpPost({
      url: `${server.url}/tws`,
      headers: JSON_HEADER,
      body: JSON.stringify({
        operation: 'hobbies',
        input: {
          hobbies: ['reading', 'writing'],
        },
      }),
    });

    expect(response1.status).toBe(200);
    expect(response1.json).toEqual({
      data: ['reading', 'writing'],
    });
  });

  test('execute an operation with missing output field', async () => {
    const server = await servers.createTwsHttpServer({
      schema: new Schema({
        getName: new Operation({
          input: {},
          output: {
            type: 'object',
            properties: {
              name: {
                type: 'string',
              },
            },
          },
          handler: () => ({
            // @ts-expect-error Missing output
            name: undefined,
          }),
        }),
      }),
    });

    const response1 = await httpPost({
      url: `${server.url}/tws`,
      headers: JSON_HEADER,
      body: JSON.stringify({
        operation: 'getName',
        input: {},
      }),
    });

    expect(response1.status).toBe(400);
    expect(response1.json).toEqual({
      errors: [
        'Failed to execute operation "getName"',
        'Server error: output "name" must be of type string, got undefined',
      ],
    });
  });

  test('execute an operation with missing output root', async () => {
    const server = await servers.createTwsHttpServer({
      schema: new Schema({
        getName: new Operation({
          input: {},
          output: {
            type: 'string',
          },
          // @ts-expect-error Missing output
          handler: () => undefined,
        }),
      }),
    });

    const response1 = await httpPost({
      url: `${server.url}/tws`,
      headers: JSON_HEADER,
      body: JSON.stringify({
        operation: 'getName',
        input: {},
      }),
    });

    expect(response1.status).toBe(400);
    expect(response1.json).toEqual({
      errors: [
        'Failed to execute operation "getName"',
        'Server error: output must be of type string, got undefined',
      ],
    });
  });

  test('execute an operation with invalid string field output', async () => {
    const server = await servers.createTwsHttpServer({
      schema: new Schema({
        cashierDetails: new Operation({
          input: {},
          output: {
            type: 'object',
            properties: {
              fullname: {
                type: 'string',
              },
            },
          },
          // @ts-expect-error Invalid output
          handler: () => ({ fullname: 30 }),
        }),
      }),
    });

    const response1 = await httpPost({
      url: `${server.url}/tws`,
      headers: JSON_HEADER,
      body: JSON.stringify({
        operation: 'cashierDetails',
        input: {},
      }),
    });

    expect(response1.status).toBe(400);
    expect(response1.json).toEqual({
      errors: [
        'Failed to execute operation "cashierDetails"',
        'Server error: output "fullname" must be of type string, got number',
      ],
    });
  });

  test('execute an operation with invalid string root output', async () => {
    const server = await servers.createTwsHttpServer({
      schema: new Schema({
        label: new Operation({
          input: {},
          output: {
            type: 'string',
          },
          // @ts-expect-error Invalid output
          handler: () => 30,
        }),
      }),
    });

    const response1 = await httpPost({
      url: `${server.url}/tws`,
      headers: JSON_HEADER,
      body: JSON.stringify({
        operation: 'label',
        input: {},
      }),
    });

    expect(response1.status).toBe(400);
    expect(response1.json).toEqual({
      errors: [
        'Failed to execute operation "label"',
        'Server error: output must be of type string, got number',
      ],
    });
  });

  test('execute an operation with invalid integer field output', async () => {
    const server = await servers.createTwsHttpServer({
      schema: new Schema({
        customerDetails: new Operation({
          input: {},
          output: {
            type: 'object',
            properties: {
              age: {
                type: 'int',
              },
            },
          },
          // @ts-expect-error Invalid output
          handler: () => ({ age: '30' }),
        }),
      }),
    });

    const response1 = await httpPost({
      url: `${server.url}/tws`,
      headers: JSON_HEADER,
      body: JSON.stringify({
        operation: 'customerDetails',
        input: {},
      }),
    });

    expect(response1.status).toBe(400);
    expect(response1.json).toEqual({
      errors: [
        'Failed to execute operation "customerDetails"',
        'Server error: output "age" must be of type integer, got string',
      ],
    });
  });

  test('execute an operation with invalid integer root output', async () => {
    const server = await servers.createTwsHttpServer({
      schema: new Schema({
        getLabel: new Operation({
          input: {},
          output: {
            type: 'int',
          },
          // @ts-expect-error Invalid output
          handler: () => '30',
        }),
      }),
    });

    const response1 = await httpPost({
      url: `${server.url}/tws`,
      headers: JSON_HEADER,
      body: JSON.stringify({
        operation: 'getLabel',
        input: {},
      }),
    });

    expect(response1.status).toBe(400);
    expect(response1.json).toEqual({
      errors: [
        'Failed to execute operation "getLabel"',
        'Server error: output must be of type integer, got string',
      ],
    });
  });

  test('execute an operation with required enum output field', async () => {
    const server = await servers.createTwsHttpServer({
      schema: new Schema({
        myRoute: new Operation({
          input: {},
          output: {
            type: 'object',
            properties: {
              color: {
                type: 'enum',
                required: true,
                values: {
                  red: {},
                  green: {},
                  blue: {},
                },
              },
            },
          },
          // @ts-expect-error Invalid output
          handler: () => ({}),
        }),
      }),
    });

    const response1 = await httpPost({
      url: `${server.url}/tws`,
      headers: JSON_HEADER,
      body: JSON.stringify({
        operation: 'myRoute',
        input: {},
      }),
    });

    expect(response1.status).toBe(400);
    expect(response1.json).toEqual({
      errors: [
        'Failed to execute operation "myRoute"',
        'Server error: output "color" must be of type string, got undefined',
      ],
    });
  });

  test('execute an operation with non-required enum output field', async () => {
    const server = await servers.createTwsHttpServer({
      schema: new Schema({
        ocean: new Operation({
          input: {},
          output: {
            type: 'object',
            properties: {
              side: {
                type: 'enum',
                required: false,
                values: {
                  north: {},
                  south: {},
                  east: {},
                  west: {},
                },
              },
            },
          },
          handler: () => ({
            side: undefined,
          }),
        }),
      }),
    });

    const response1 = await httpPost({
      url: `${server.url}/tws`,
      headers: JSON_HEADER,
      body: JSON.stringify({
        operation: 'ocean',
        input: {},
      }),
    });

    expect(response1.status).toBe(200);
    expect(response1.json).toEqual({
      data: {
        side: undefined,
      },
    });
  });

  test('execute an operation with invalid enum field output', async () => {
    const server = await servers.createTwsHttpServer({
      schema: new Schema({
        myRoute: new Operation({
          input: {},
          output: {
            type: 'object',
            properties: {
              color: {
                type: 'enum',
                values: {
                  red: {},
                  green: {},
                  blue: {},
                },
              },
            },
          },
          // @ts-expect-error Invalid output
          handler: () => ({ color: 'yellow' }),
        }),
      }),
    });

    const response1 = await httpPost({
      url: `${server.url}/tws`,
      headers: JSON_HEADER,
      body: JSON.stringify({
        operation: 'myRoute',
        input: {},
      }),
    });

    expect(response1.status).toBe(400);
    expect(response1.json).toEqual({
      errors: [
        'Failed to execute operation "myRoute"',
        'Server error: output "color" must be one of: "red", "green", "blue"',
      ],
    });
  });

  test('execute an operation with invalid enum root output', async () => {
    const server = await servers.createTwsHttpServer({
      schema: new Schema({
        checkStatus: new Operation({
          input: {},
          output: {
            type: 'enum',
            values: {
              open: {},
              closed: {},
            },
          },
          // @ts-expect-error Invalid output
          handler: () => 'head',
        }),
      }),
    });

    const response1 = await httpPost({
      url: `${server.url}/tws`,
      headers: JSON_HEADER,
      body: JSON.stringify({
        operation: 'checkStatus',
        input: {},
      }),
    });

    expect(response1.status).toBe(400);
    expect(response1.json).toEqual({
      errors: [
        'Failed to execute operation "checkStatus"',
        'Server error: output must be one of: "open", "closed"',
      ],
    });
  });
});
