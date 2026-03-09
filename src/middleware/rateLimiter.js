import rateLimit from 'express-rate-limit';

// Обмеження: 100 запитів на 15 хвилин з однієї IP
export const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 хв
  max: 100, // максимум запитів
  message: 'Too many requests, please try again later.',
  standardHeaders: true, // включає X-RateLimit-*
  legacyHeaders: false, // відключає X-RateLimit-Limit/Remaining
});
