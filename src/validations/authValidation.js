import { Joi, Segments } from 'celebrate';

import { USERNAME_REGEX } from '../constants/const.js';

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
export const checkUsernameSchema = {
  [Segments.QUERY]: Joi.object({
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
  }),
};
