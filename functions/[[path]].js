import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import app from '../server.js'; // Importing your Express app

const server = new Hono();

server.use('*', (c, next) => {
  return new Promise((resolve, reject) => {
    // We need to use a trick to get the raw Node.js request and response objects
    const req = c.req.raw;
    const res = {
      ...c.res,
      end: (body) => {
        c.res = new Response(body, c.res);
        resolve(c.res);
      },
      // Mock other methods that Express might use
      setHeader: (key, value) => c.header(key, value),
      writeHead: (status, headers) => {
        c.status(status);
        if (headers) {
          for (const [key, value] of Object.entries(headers)) {
            c.header(key, value);
          }
        }
      },
      write: () => {}, // mock
    };

    // Pass the request to the Express app
    app(req, res);
  });
});

export const onRequest = (context) => {
  return serve(server, context);
};
