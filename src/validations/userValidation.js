import { Joi, Segments } from 'celebrate';

import { PHONE_REGEX } from '../constants/const.js';

export const updateUserSchema = {
  [Segments.BODY]: Joi.object({
    userName: Joi.string(),
    userSurname: Joi.string(),
    phone: Joi.string().regex(PHONE_REGEX),
    city: Joi.string(),
    postNumber: Joi.number(),
  }).min(1),
};
