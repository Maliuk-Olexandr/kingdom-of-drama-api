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
} from '../controllers/authController.js';
import { authenticate } from '../middleware/authenticate.js';
import {
  registerUserSchema,
  loginUserSchema,
  requestResetEmailSchema,
  resetPasswordSchema,
  checkUsernameSchema,
} from '../validations/authValidation.js';

const router = Router();

// 📝 User registration --------------------------------------
router.post('/api/register', celebrate(registerUserSchema), registerUser);
router.post('/api/login', celebrate(loginUserSchema), loginUser);
router.post('/api/logout', authenticate, logoutUser);

// 🔄 Refresh user session --------------------------------------
router.post('/api/refresh', refreshUserSession);
router.get('/api/session', getSession);
router.get(
  '/api/check-username',
  celebrate(checkUsernameSchema),
  checkUsernameAvailability,
);

// 📧 Password reset flow --------------------------------------
router.post(
  '/api/request-reset-password-email',
  celebrate(requestResetEmailSchema),
  requestResetEmail,
);
// 2. Безпосередньо зміна пароля (з токеном та ID)
router.post(
  '/api/reset-password',
  celebrate(resetPasswordSchema),
  resetPassword,
);

// router.patch(
//   '/avatar',
//   authenticate,
//   upload.single('avatar'),
//   authController.updateAvatar,
// );

export default router;
