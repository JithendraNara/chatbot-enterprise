// Vercel Serverless Function Entry Point
import { createApp } from '../src/index.js';

let app: any;

export default async function handler(req: any, res: any) {
  if (!app) {
    app = await createApp();
    await app.ready();
  }
  
  // Forward the request to Fastify
  app.server.emit('request', req, res);
}
