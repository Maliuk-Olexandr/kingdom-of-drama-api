import { celebrate } from 'celebrate';
import { Router } from 'express';

import {
  getCurrentUser,
  updateUser,
  // updateUserAvatar,
} from '../controllers/userController.js';
import { authenticate } from '../middleware/authenticate.js';
import { updateUserSchema } from '../validations/userValidation.js';
// import { upload } from '../middleware/multer.js';

const router = Router();

// router.patch(
//   '/users/me/avatar',
//   upload.single('avatar'),
//   updateUserAvatar,
// );

router.get('/api/users/me', authenticate, getCurrentUser);
router.patch(
  '/api/users/me',
  authenticate,
  celebrate(updateUserSchema),
  updateUser,
);

export default router;
