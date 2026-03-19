import { celebrate } from 'celebrate';
import { Router } from 'express';

import { getAllHeroes, getHeroById } from '../controllers/heroesController.js';
import {
  createHeroSchema,
  heroIdSchema,
} from '../validations/heroesValidation.js';

const router = Router();

router.get('/api/heroes', celebrate(createHeroSchema), getAllHeroes);

router.get('/api/heroes/:heroId', celebrate(heroIdSchema), getHeroById);

export default router;
