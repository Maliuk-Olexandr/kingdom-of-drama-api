import { celebrate } from 'celebrate';
import { Router } from 'express';

import {
  getHeroes,
  getHeroById,
  createHero,
} from '../controllers/heroesController.js';
import { authenticate, optionalAuth } from '../middleware/authenticate.js';
import {
  createHeroSchema,
  heroIdSchema,
} from '../validations/heroesValidation.js';

const router = Router();

router.get('/heroes', celebrate(createHeroSchema), optionalAuth, getHeroes);

router.get(
  '/heroes/:heroId',
  celebrate(heroIdSchema),
  optionalAuth,
  getHeroById,
);

router.post('/heroes', authenticate, celebrate(createHeroSchema), createHero);

export default router;
