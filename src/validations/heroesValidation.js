import { Joi, Segments } from 'celebrate';

import { objectIdValidator } from '../utils/objectIdValidator.js';

export const createHeroSchema = {
  [Segments.BODY]: Joi.object({
    name: Joi.string().min(2).max(30).required(),
    fullName: Joi.string().allow('', null).optional(),
    title: Joi.string().allow('', null).optional(),
    description: Joi.string().allow('', null).optional(),
    images: Joi.object({
      avatar: Joi.string().allow('', null).optional(),
      portrait: Joi.string().allow('', null).optional(),
    }).optional(),
    statuses: Joi.object({
      isDraft: Joi.boolean().default(true),
      isAuthorShown: Joi.boolean().default(false),
      isAlive: Joi.boolean().default(true),
      isInShow: Joi.boolean().default(false),
      isCanon: Joi.boolean().default(false),
      isCandidate: Joi.boolean().default(false),
    }).optional(),
    basicInfo: Joi.object({
      age: Joi.string().allow('', null).optional(),
      sex: Joi.string().allow('', null).optional(),
      height: Joi.string().allow('', null).optional(),
      weight: Joi.string().allow('', null).optional(),
      race: Joi.string().allow('', null).optional(),
      birthday: Joi.string().allow('', null).optional(),
      room: Joi.string().allow('', null).optional(),
    }).optional(),
    attributes: Joi.object({
      character: Joi.string().allow('', null).optional(),
      credo: Joi.string().allow('', null).optional(),
      fears: Joi.string().allow('', null).optional(),
      dreams: Joi.string().allow('', null).optional(),
      psychState: Joi.string().allow('', null).optional(),
      addictions: Joi.string().allow('', null).optional(),
      features: Joi.string().allow('', null).optional(),
      habits: Joi.string().allow('', null).optional(),
      health: Joi.string().allow('', null).optional(),
      food: Joi.string().allow('', null).optional(),
      weaknesses: Joi.string().allow('', null).optional(),
      family: Joi.string().allow('', null).optional(),
      relations: Joi.string().allow('', null).optional(),
      reputation: Joi.string().allow('', null).optional(),
      career: Joi.string().allow('', null).optional(),
      history: Joi.string().allow('', null).optional(),
      failures: Joi.string().allow('', null).optional(),
      achievements: Joi.string().allow('', null).optional(),
      education: Joi.string().allow('', null).optional(),
      hobbies: Joi.string().allow('', null).optional(),
      media: Joi.string().allow('', null).optional(),
      travels: Joi.string().allow('', null).optional(),
      animals: Joi.string().allow('', null).optional(),
      worldview: Joi.string().allow('', null).optional(),
      religionSpirituality: Joi.string().allow('', null).optional(),
      politics: Joi.string().allow('', null).optional(),
      ethics: Joi.string().allow('', null).optional(),
      skills: Joi.string().allow('', null).optional(),
      magic: Joi.string().allow('', null).optional(),
      inventory: Joi.string().allow('', null).optional(),
      technologies: Joi.string().allow('', null).optional(),
    }).optional(),
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
