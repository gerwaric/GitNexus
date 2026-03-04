import { createServer } from '../server/api.js';

export const serveCommand = async (options?: { port?: string; host?: string }) => {
  const port = Number(options?.port ?? process.env.PORT ?? 4747);
  const host = options?.host ?? process.env.HOST ?? '127.0.0.1';
  await createServer(port, host);
};
