import { Joi, Segments } from 'celebrate';

import { objectIdValidator } from '../utils/objectIdValidator.js';

export const createHeroSchema = {
  [Segments.BODY]: Joi.object({
    name: Joi.string().required(),
    fullName: Joi.string(),
    title: Joi.string(),
    description: Joi.string(),
    images: Joi.object({
      avatar: Joi.string().uri(),
      portraite: Joi.string().uri(),
    }),
    basicInfo: Joi.object({
      age: Joi.string(),
      sex: Joi.string(),
      height: Joi.string(),
      weight: Joi.string(),
      race: Joi.string(),
      birthDay: Joi.string(),
      room: Joi.string(),
    }),
    attributes: Joi.object({
      character: Joi.string(),
      credo: Joi.string(),
      fears: Joi.string(),
      dreams: Joi.string(),
      psychState: Joi.string(),
      addictions: Joi.string(),
      features: Joi.string(),
      habits: Joi.string(),
      health: Joi.string(),
      food: Joi.string(),
      weaknesses: Joi.string(),
      family: Joi.string(),
      relations: Joi.string(),
      reputation: Joi.string(),
      career: Joi.string(),
      history: Joi.string(),
      failures: Joi.string(),
      achievements: Joi.string(),
      education: Joi.string(),
      hobbies: Joi.string(),
      media: Joi.string(),
      travels: Joi.string(),
      animals: Joi.string(),
      worldview: Joi.string(),
      religionSpirituality: Joi.string(),
      politics: Joi.string(),
      ethics: Joi.string(),
      skills: Joi.string(),
      magic: Joi.string(),
      inventory: Joi.string(),
      technologies: Joi.string(),
    }),
  }),
};

// Схема для перевірки параметра heroId
export const heroIdSchema = {
  [Segments.PARAMS]: Joi.object({
    heroId: Joi.string().custom(objectIdValidator).required().messages({
      'any.required': 'heroId is required',
      'string.custom': 'heroId must be a valid ObjectId',
    }),
  }),
};
