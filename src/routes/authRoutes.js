import { celebrate } from 'celebrate';
import { Router } from 'express';

import {
  registerUser,
  loginUser,
  logoutUser,
  getSession,
  refreshUserSession,
} from '../controllers/authController.js';
import { authenticate } from '../middleware/authenticate.js';
import {
  registerUserSchema,
  loginUserSchema,
} from '../validations/authValidation.js';

const router = Router();

//public routes
router.post('/api/register', celebrate(registerUserSchema), registerUser);
router.post('/api/login', celebrate(loginUserSchema), loginUser);
router.get('/api/session', getSession);
router.post('/api/refresh', refreshUserSession);
//protected routes
router.post('/api/logout', authenticate, logoutUser);

export default router;
