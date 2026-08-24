import { createServer } from 'node:http';
import { Server } from 'socket.io';

import { app } from './app.js';
import { connectDb } from './config/db.js';
import { env } from './config/env.js';
import { configureSockets } from './sockets/index.js';
import { setIo } from './services/realtime.js';
import { startJobs } from './jobs/worker.js';

const http = createServer(app);

const io = new Server(http, {
  cors: {
    origin: (origin, callback) => {
      // Allow requests without an Origin header
      if (!origin) {
        return callback(null, true);
      }

      // Production Vercel frontend
      if (origin === env.clientUrl) {
        return callback(null, true);
      }

      // Local development
      if (
        origin === 'http://localhost:5173' ||
        origin === 'http://127.0.0.1:5173'
      ) {
        return callback(null, true);
      }

      // Vercel preview deployments
      if (
        /^https:\/\/[a-zA-Z0-9-]+\.vercel\.app$/.test(origin)
      ) {
        return callback(null, true);
      }

      return callback(
        new Error('Not allowed by Socket.IO CORS')
      );
    }
  }
});

configureSockets(io);
setIo(io);

await connectDb(env.mongoUri);

startJobs();

http.listen(
  env.port,
  () => console.log(`API on :${env.port}`)
);