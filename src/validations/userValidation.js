import { Joi, Segments } from 'celebrate';

export const updateUserSchema = {
  [Segments.BODY]: Joi.object({
    username: Joi.string().min(3).max(32).trim().lowercase(),
    displayName: Joi.string().min(3).max(64).trim().allow('', null),
    aboutMe: Joi.string().allow('', null).max(800),
    birthdate: Joi.date().allow(null),
    userName: Joi.string().allow('', null),
    userSurname: Joi.string().allow('', null),
    phone: Joi.string().allow('', null),
    email: Joi.string().email().lowercase().optional().allow('', null),
    pendingEmail: Joi.string().allow('', null),
    city: Joi.string().allow('', null),
    telegramId: Joi.string().allow('', null),
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

export const usernameParamsSchema = {
  [Segments.PARAMS]: Joi.object({
    username: Joi.string().min(3).max(32).trim().lowercase().required(),
  }),
};

// Валідація для зв'язування Telegram аккаунта

export const telegramDataSchema = Joi.object({
  id: Joi.alternatives().try(Joi.string(), Joi.number()).required(),
  sub: Joi.alternatives()
    .try(Joi.string(), Joi.number())
    .allow('', null)
    .optional(),
  name: Joi.string().allow('', null).optional(),
  given_name: Joi.string().allow('', null).max(32).optional(),
  family_name: Joi.string().allow('', null).max(32).optional(),
  preferred_username: Joi.string().allow('', null).max(32).optional(),
  picture: Joi.string().allow('', null).optional(),
  phone_number: Joi.string().allow('', null).optional(),
  phone_number_verified: Joi.boolean().optional(),
});

export const linkTelegramSchema = {
  [Segments.BODY]: Joi.object({
    providerId: Joi.alternatives().try(Joi.string(), Joi.number()).required(),
    telegramData: telegramDataSchema.required(),
    secretKey: Joi.string().required(),
  }).required(),
};
