const app = require('../server.js');

// This is the correct way to handle requests in Cloudflare Pages Functions
// It passes the context object directly to a handler.
// `app` in this case is our Express app, which can handle the request.
export const onRequest = async (context) => {
    return app(context);
};
