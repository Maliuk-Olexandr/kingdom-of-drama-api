import { celebrate } from 'celebrate';
import { Router } from 'express';

import {
  registerUser,
  loginUser,
  logoutUser,
  getSession,
  // requestResetEmail,
  resetPassword,
} from '../controllers/authController.js';
import { authenticate } from '../middleware/authenticate.js';
import {
  registerUserSchema,
  loginUserSchema,
  // requestResetEmailSchema,
  resetPasswordSchema,
} from '../validations/authValidation.js';

const router = Router();

//public routes
router.post('/api/register', celebrate(registerUserSchema), registerUser);
router.post('/api/login', celebrate(loginUserSchema), loginUser);
// router.post(
//   '/api/request-reset-email',
//   celebrate(requestResetEmailSchema),
//   requestResetEmail,
// );
router.post(
  '/api/reset-password',
  celebrate(resetPasswordSchema),
  resetPassword,
);
router.get('/api/session', getSession);
//protected routes
router.post('/api/logout', authenticate, logoutUser);

export default router;
