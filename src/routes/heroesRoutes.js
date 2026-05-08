import { celebrate } from 'celebrate';
import { Router } from 'express';

import { getHeroes, getHeroById } from '../controllers/heroesController.js';
import {
  createHeroSchema,
  heroIdSchema,
} from '../validations/heroesValidation.js';

const router = Router();

router.get('/heroes', celebrate(createHeroSchema), getHeroes);

router.get('/heroes/:heroId', celebrate(heroIdSchema), getHeroById);

export default router;
