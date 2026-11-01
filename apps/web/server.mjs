import express from 'express';
import { createRequestHandler } from '@react-router/express';
import * as build from './build/server/index.js';

const app = express();
// Solo nginx puede alcanzar este servicio y sobrescribe las cabeceras del proxy.
app.set('trust proxy', 1);
app.disable('x-powered-by');
app.use((request, response, next) => {
  response.on('finish', () => console.log(JSON.stringify({
    time: new Date().toISOString(), method: request.method,
    path: request.path, status: response.statusCode,
    requestId: request.headers['x-request-id'],
  })));
  next();
});
app.use('/assets', express.static('build/client/assets', { immutable: true, maxAge: '1y' }));
app.use(express.static('build/client', { maxAge: '1h', index: false }));
app.all('/{*splat}', createRequestHandler({ build, mode: process.env.NODE_ENV }));
const server = app.listen(Number(process.env.PORT ?? 3000), process.env.HOST ?? '0.0.0.0');
process.once('SIGTERM', () => {
  const timer = setTimeout(() => { server.closeAllConnections(); process.exit(1); }, 9000);
  timer.unref();
  server.close(() => { clearTimeout(timer); process.exit(0); });
});
