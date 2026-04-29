import { Joi, Segments } from 'celebrate';

export const updateUserSchema = {
  [Segments.BODY]: Joi.object({
    username: Joi.string().min(3).max(32).trim().lowercase(),
    displayName: Joi.string().min(3).max(64).trim(),
    aboutMe: Joi.string().allow('').max(800),
    birthdate: Joi.date().allow(null),
    userName: Joi.string().allow(''),
    userSurname: Joi.string().allow(''),
    phone: Joi.string().allow(''),
    email: Joi.string().email().lowercase(),
    city: Joi.string().allow(''),
    telegramId: Joi.string().allow(''),
    userSettings: Joi.object({
      darkMode: Joi.boolean(),
      birthdateHidden: Joi.boolean(),
      savedHidden: Joi.boolean(),
      favoritesHidden: Joi.boolean(),
    }).default({}),
  })
    .min(1)
    .unknown(false),
};

// Валідація токенів у query (для посилань)
export const tokenQuerySchema = {
  [Segments.QUERY]: Joi.object({
    token: Joi.string().required(),
  }),
};

// Валідація токенів у body (для кнопок/форм)
export const tokenBodySchema = {
  [Segments.BODY]: Joi.object({
    token: Joi.string().required(),
  }),
};
