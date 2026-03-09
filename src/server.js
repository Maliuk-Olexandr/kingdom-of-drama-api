import 'dotenv/config';
import { errors } from 'celebrate';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
// import swaggerUi from 'swagger-ui-express';

// import { swaggerSpec } from './swagger.js';
import { connectMongoDB } from './db/connectMongoDB.js';
import { errorHandler } from './middleware/errorHandler.js';
import { logger } from './middleware/logger.js';
import { notFoundHandler } from './middleware/notFoundHandler.js';
import { limiter } from './middleware/rateLimiter.js';
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';

const app = express();
const PORT = process.env.PORT || 3000;
app.use(helmet());
app.use(cors());
app.use(limiter);
app.use(express.json());
app.use(cookieParser());
app.use(logger);

// app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
// app.get('/', (req, res) => res.redirect('/api-docs'));

// public routes

// app.use(categoriesRoutes);
// app.use(goodsRoutes);
// app.use(feedbackRoutes);
// app.use(subscriptionsRoutes);
// app.use(filterRoutes);

// protected routes

app.use(authRoutes);
app.use(userRoutes);

app.use(notFoundHandler);
app.use(errors());
app.use(errorHandler);

await connectMongoDB();

app.listen(PORT, () => {
  console.log(`Server running. Use our API on port: ${PORT}`);
});
export default app;
