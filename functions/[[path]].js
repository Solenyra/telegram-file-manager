import { Hono } from 'hono';
import { handle } from '@hono/node-server/vercel';
import app from '../server.js';

export const onRequest = handle(app);
