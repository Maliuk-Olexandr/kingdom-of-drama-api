import * as celebrate from 'celebrate';
import createHttpError from 'http-errors';

// Витягуємо функцію перевірки
const { isCelebrateError } = celebrate;

export const errorHandler = (err, req, res, next) => {
  if (req.log) {
    req.log.error(err);
  }

  // Перевіряємо через іменований експорт з namespace
  if (isCelebrateError && isCelebrateError(err)) {
    const details = [];
    err.details.forEach((value) => {
      value.details.forEach((detail) => details.push(detail.message));
    });

    return res.status(400).json({
      status: 400,
      message: 'Validation Error',
      details,
    });
  }

  // Обробка HttpError
  if (createHttpError.isHttpError(err) || (err.status && err.expose)) {
    return res.status(err.status).json({
      status: err.status,
      message: err.message,
    });
  }

  // Обробка конфліктів MongoDB
  if (err.name === 'MongoServerError' && err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0];
    return res.status(409).json({
      status: 409,
      message: 'Conflict',
      details: [`User with this ${field} already exists`],
    });
  }

  // Дефолтна помилка 500
  const statusCode = err.status || 500;
  res.status(statusCode).json({
    status: statusCode,
    message: statusCode === 500 ? 'Something went wrong.' : err.message,
  });
};
