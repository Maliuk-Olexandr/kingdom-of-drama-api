import { celebrate } from 'celebrate';
import { Router } from 'express';

import {
  oauthLogin,
  registerUser,
  loginUser,
  logoutUser,
  getSession,
  refreshUserSession,
  checkAvailability,
  requestResetEmail,
  resetPassword,
  verifyEmail,
} from '../controllers/authController.js';
import { authenticate } from '../middleware/authenticate.js';
import { authLimiter, checkLimiter } from '../middleware/rateLimiter.js';
import {
  registerUserSchema,
  loginUserSchema,
  requestResetEmailSchema,
  resetPasswordSchema,
  checkAvailabilitySchema,
} from '../validations/authValidation.js';

const router = Router();

// 📝 User registration --------------------------------------

router.post('/oauth-login', oauthLogin);

router.post(
  '/register',
  authLimiter,
  celebrate(registerUserSchema),
  registerUser,
);

router.post('/login', authLimiter, celebrate(loginUserSchema), loginUser);
router.post('/logout', authenticate, logoutUser);
router.post('/verify-email', verifyEmail);

// 🔄 Refresh user session --------------------------------------
router.post('/refresh', refreshUserSession);
router.get('/session', getSession);
router.get(
  '/check-availability',
  checkLimiter,
  celebrate(checkAvailabilitySchema),
  checkAvailability,
);

// 📧 Password reset flow --------------------------------------
router.post(
  '/request-reset-password-email',
  authLimiter,
  celebrate(requestResetEmailSchema),
  requestResetEmail,
);
// 2. Безпосередньо зміна пароля (з токеном та ID)
router.post(
  '/reset-password',
  authLimiter,
  celebrate(resetPasswordSchema),
  resetPassword,
);

export default router;
