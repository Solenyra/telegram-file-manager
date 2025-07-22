import { createPagesFunctionHandler } from '@cloudflare/workers-express-adapter';
import app from '../server'; // 導入我們修改後的 Express app

export const onRequest = createPagesFunctionHandler({ app });
