import 'dotenv/config';
import * as Sentry from '@sentry/node';
import { errors } from 'celebrate';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';

import { connectMongoDB } from './db/connectMongoDB.js';
import { errorHandler } from './middleware/errorHandler.js';
import { logger } from './middleware/logger.js';
import { notFoundHandler } from './middleware/notFoundHandler.js';
import { generalLimiter } from './middleware/rateLimiter.js';
import authRoutes from './routes/authRoutes.js';
import heroesRoutes from './routes/heroesRoutes.js';
import userRoutes from './routes/userRoutes.js';

const app = express();
app.set('trust proxy', 1);
const PORT = process.env.PORT || 3000;
app.use(helmet());
app.use(cors());
app.use(logger);
app.use(generalLimiter);
app.use(express.json());
app.use(cookieParser());

// public routes

app.use('/api', heroesRoutes);

// protected routes

app.use('/api', authRoutes);
app.use('/api', userRoutes);

Sentry.setupExpressErrorHandler(app);

app.use(notFoundHandler);
app.use(errors());
app.use(errorHandler);

await connectMongoDB();

app.listen(PORT, () => {
  console.log(`Server running. Use our API on port: ${PORT}`);
});
export default app;
