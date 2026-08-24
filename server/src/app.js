import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

import auth from './routes/auth.js';
import shows from './routes/shows.js';
import bookings from './routes/bookings.js';
import waitlist from './routes/waitlist.js';
import catalog from './routes/catalog.js';

import {
  notFound,
  errors
} from './middleware/errors.js';

import { env } from './config/env.js';

export const app = express();

const allowedOrigin = (origin, callback) => {
  // Allow requests without an Origin header
  // such as server-to-server requests.
  if (!origin) {
    return callback(null, true);
  }

  // Always allow configured production frontend
  if (origin === env.clientUrl) {
    return callback(null, true);
  }

  // Allow local development
  if (
    origin === 'http://localhost:5173' ||
    origin === 'http://127.0.0.1:5173'
  ) {
    return callback(null, true);
  }

  // Allow Vercel preview deployments
  if (
    /^https:\/\/[a-zA-Z0-9-]+\.vercel\.app$/.test(origin)
  ) {
    return callback(null, true);
  }

  return callback(
    new Error('Not allowed by CORS')
  );
};

app.use(helmet());

app.use(
  cors({
    origin: allowedOrigin
  })
);

app.use(
  express.json({
    limit: '100kb'
  })
);

app.get('/health', (req, res) => {
  res.json({
    ok: true
  });
});

app.use('/api/auth', auth);
app.use('/api/shows', shows);
app.use('/api/bookings', bookings);
app.use('/api/waitlist', waitlist);
app.use('/api', catalog);

app.use(notFound);
app.use(errors);