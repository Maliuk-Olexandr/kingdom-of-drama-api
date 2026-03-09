import { isCelebrateError } from 'celebrate';
import { HttpError } from 'http-errors';

export const errorHandler = (err, req, res, next) => {
  req.log.error(err);

  if (isCelebrateError(err)) {
    const details = [];
    err.details.forEach((error) => {
      error.details.forEach((detail) => details.push(detail.message));
    });

    return res.status(400).json({
      message: 'Validation Error',
      details,
    });
  }

  if (err instanceof HttpError) {
    return res.status(err.status).json({
      message: err.message || err.name,
    });
  }

  if (err.name === 'MongoServerError' && err.code === 11000) {
    return res.status(409).json({
      status: 409,
      message: 'Conflict',
      details: ['User with this email already exists'],
    });
  }

  res.status(500).json({
    message: 'Something went wrong. Please try again later.',
  });
};
