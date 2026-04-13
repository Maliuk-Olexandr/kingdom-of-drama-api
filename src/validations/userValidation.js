import { Joi, Segments } from 'celebrate';

export const updateUserSchema = {
  [Segments.BODY]: Joi.object({
    username: Joi.string(),
    displayName: Joi.string(),
    aboutMe: Joi.string().allow(''),
    birthdate: Joi.date().allow(null),
    birthdateHidden: Joi.boolean(),
    userName: Joi.string().allow(''),
    userSurname: Joi.string().allow(''),
    phone: Joi.string().allow(''),
    email: Joi.string().email(),
    city: Joi.string().allow(''),
    postNumber: Joi.number().allow(null),
    telegramId: Joi.string().allow(''),
  }).min(1),
};
