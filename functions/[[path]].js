// This file is the entry point for Cloudflare Pages Functions.
// It imports the Express app from server.js and exports a handler
// that allows it to be served by the Cloudflare network.
const app = require('../server.js');

export function onRequest(context) {
  // The `app` is an Express app instance. By returning it,
  // Cloudflare Pages knows how to handle incoming requests.
  return app(context.request);
}
