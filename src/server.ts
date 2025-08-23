import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import { config } from './config/environment.js';
import { setupRoutes } from './routes/index.js';

const server = Fastify({
  logger: {
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
      },
    },
  },
});

async function start() {
  try {
    await server.register(helmet, {
      global: true,
    });

    await server.register(cors, {
      origin: true,
      credentials: true,
    });

    await setupRoutes(server);

    const address = await server.listen({
      port: config.port,
      host: config.host,
    });

    server.log.info(`Server listening at ${address}`);
  } catch (error) {
    server.log.error(error);
    process.exit(1);
  }
}

if (import.meta.main) {
  start();
}

export { server };