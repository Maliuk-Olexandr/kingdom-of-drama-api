import { celebrate } from 'celebrate';
import { Router } from 'express';

import {
  getCurrentUser,
  updateUser,
  updateUserAvatar,
  confirmEmailChangeIntent,
  completeEmailChange,
  requestDeleteAccount,
  confirmDeleteAccount,
} from '../controllers/userController.js';
import { authenticate } from '../middleware/authenticate.js';
import { upload } from '../middleware/multer.js';
import {
  updateUserSchema,
  tokenQuerySchema,
  tokenBodySchema,
} from '../validations/userValidation.js';

const router = Router();

// --- Профіль користувача ---
router.get('/users/me', authenticate, getCurrentUser);

router.patch(
  '/users/me',
  authenticate,
  celebrate(updateUserSchema),
  updateUser,
);

router.patch(
  '/users/me/avatar',
  authenticate,
  upload.single('avatar'),
  updateUserAvatar,
);

// --- Складна зміна Email (Double Confirmation) ---

// 1. Клік по посиланню на СТАРІЙ пошті
router.get(
  '/auth/confirm-email-change',
  celebrate(tokenQuerySchema), // Перевірка ?token=...
  confirmEmailChangeIntent,
);

// 2. Клік по посиланню на НОВІЙ пошті
router.get(
  '/auth/verify-new-email',
  celebrate(tokenQuerySchema),
  completeEmailChange,
);

// --- Видалення (Анонімізація) аккаунта ---

// 1. Запит на видалення (відправка листа)
router.post('/users/me/request-delete', authenticate, requestDeleteAccount);

// 2. Фінальне підтвердження (наприклад, введення коду або клік з токеном у body)
router.post(
  '/users/me/confirm-delete',
  authenticate,
  celebrate(tokenBodySchema), // Перевірка { "token": "..." } у body
  confirmDeleteAccount,
);

export default router;
