// import { isCelebrateError } from 'celebrate';
import { HttpError } from 'http-errors';

export const errorHandler = (err, req, res, next) => {
  console.error(err);

  const isProd = process.env.NODE_ENV === 'production';

  // if (!isProd && isCelebrateError(err)) {
  //   const details = [];
  //   for (const [, joiError] of err.details.entries()) {
  //     details.push(joiError.message);
  //   }
  //   return res.status(400).json({
  //     message: 'Validation Error',
  //     details,
  //   });
  // }

  if (err instanceof HttpError) {
    return res.status(err.status).json({
      message: err.message || err.name,
    });
  }

  res.status(500).json({
    message: isProd
      ? 'Something went wrong. Please try again later.'
      : err.message,
  });
};
