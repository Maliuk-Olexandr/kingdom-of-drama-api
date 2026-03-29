import { celebrate } from 'celebrate';
import { Router } from 'express';

import {
  registerUser,
  loginUser,
  logoutUser,
  getSession,
  refreshUserSession,
  checkUsernameAvailability,
  requestResetEmail,
  resetPassword,
  verifyEmail,
} from '../controllers/authController.js';
import { authenticate } from '../middleware/authenticate.js';
import { authLimiter } from '../middleware/rateLimiter.js';
import {
  registerUserSchema,
  loginUserSchema,
  requestResetEmailSchema,
  resetPasswordSchema,
  checkUsernameSchema,
} from '../validations/authValidation.js';

const router = Router();

// 📝 User registration --------------------------------------
router.post('/register', celebrate(registerUserSchema), registerUser);

router.post('/login', celebrate(loginUserSchema), authLimiter, loginUser);
router.post('/logout', authenticate, logoutUser);
router.post('/verify-email', verifyEmail);

// 🔄 Refresh user session --------------------------------------
router.post('/refresh', refreshUserSession);
router.get('/session', getSession);
router.get(
  '/check-username',
  celebrate(checkUsernameSchema),
  checkUsernameAvailability,
);

// 📧 Password reset flow --------------------------------------
router.post(
  '/request-reset-password-email',
  celebrate(requestResetEmailSchema),
  authLimiter,
  requestResetEmail,
);
// 2. Безпосередньо зміна пароля (з токеном та ID)
router.post(
  '/reset-password',
  celebrate(resetPasswordSchema),
  authLimiter,
  resetPassword,
);

// router.patch(
//   '/avatar',
//   authenticate,
//   upload.single('avatar'),
//   authController.updateAvatar,
// );

export default router;
