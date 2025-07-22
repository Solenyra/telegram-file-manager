const app = require('../server.js');

export async function onRequest(context) {
  return app(context.request);
}
