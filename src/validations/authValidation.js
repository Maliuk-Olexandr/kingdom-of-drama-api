import { Joi, Segments } from 'celebrate';

import { USERNAME_REGEX, AVAILABILITY_FIELDS } from '../constants/const.js';

export const registerUserSchema = {
  [Segments.BODY]: Joi.object({
    username: Joi.string()
      .pattern(USERNAME_REGEX)
      .min(3)
      .max(32)
      .required()
      .messages({
        'string.pattern.base':
          'username can only contain latin letters, numbers, dots, and underscores',
        'string.min': 'username must be at least 3 characters long',
        'string.max': 'username must be no longer than 32 characters',
        'string.empty': 'username is required',
        'any.required': 'username is required',
      }),

    email: Joi.string().email().required().messages({
      'string.email': 'Invalid email format',
      'string.empty': 'Email is required',
      'any.required': 'Email is required',
    }),

    password: Joi.string().min(8).max(128).required().messages({
      'string.min': 'Password must be at least 8 characters long',
      'string.max': 'Password cannot exceed 128 characters',
      'string.empty': 'Password is required',
      'any.required': 'Password is required',
    }),
  }).unknown(true),
};

export const loginUserSchema = {
  [Segments.BODY]: Joi.object({
    email: Joi.string().email().required().messages({
      'string.email': 'Invalid email format',
      'string.empty': 'Email is required',
      'any.required': 'Email is required',
    }),

    password: Joi.string().min(8).max(128).required().messages({
      'string.min': 'Password must be at least 8 characters long',
      'string.max': 'Password cannot exceed 128 characters',
      'string.empty': 'Password is required',
      'any.required': 'Password is required',
    }),
  }),
};

export const requestResetEmailSchema = {
  [Segments.BODY]: Joi.object({
    email: Joi.string().email().required().messages({
      'string.email': 'Invalid email format',
      'string.empty': 'Email is required',
      'any.required': 'Email is required',
    }),
  }),
};

export const resetPasswordSchema = {
  [Segments.BODY]: Joi.object().keys({
    token: Joi.string().required(),
    id: Joi.string().hex().length(24).required().messages({
      'string.length': 'Invalid user ID format',
    }),
    password: Joi.string().min(8).max(128).required().messages({
      'string.min': 'Password must be at least 8 characters long',
      'string.max': 'Password cannot exceed 128 characters',
      'string.empty': 'Password is required',
      'any.required': 'Password is required',
    }),
  }),
};

export const checkAvailabilitySchema = {
  [Segments.QUERY]: Joi.object({
    // Перевіряємо, що поле входить до списку дозволених
    field: Joi.string()
      .valid(...Object.keys(AVAILABILITY_FIELDS))
      .required()
      .messages({
        'any.only': 'Validation for this field is not supported',
        'any.required': 'Field is required',
      }),

    // Значення валідуємо базово (рядок),
    // оскільки детальна перевірка regex вже є в самому контролері
    value: Joi.string().min(1).max(128).required().messages({
      'string.empty': 'Value cannot be empty',
      'any.required': 'Value is required',
    }),

    // Валідуємо як рядок формату MongoDB ObjectId
    excludeUserId: Joi.string().hex().length(24).messages({
      'string.hex': 'Invalid user ID format',
      'string.length': 'Invalid user ID length',
    }),
  }),
};
