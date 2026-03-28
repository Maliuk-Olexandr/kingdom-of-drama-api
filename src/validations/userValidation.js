import { Joi, Segments } from 'celebrate';

export const updateUserSchema = {
  [Segments.BODY]: Joi.object({
    username: Joi.string(),
    userSurname: Joi.string(),
    email: Joi.string().email(),
    city: Joi.string(),
    postNumber: Joi.number(),
  }).min(1),
};
