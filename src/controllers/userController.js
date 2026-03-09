import createHttpError from 'http-errors';

import User from '../models/user.js';
// import { saveFileToCloudinary } from '../utils/saveFileToCloudinary.js';

// export const updateUserAvatar = async (req, res, next) => {
//   if (!req.file) {
//     return next(createHttpError(400, 'No file'));
//   }
//   const result = await saveFileToCloudinary(req.file.buffer);
//   const user = await User.findOneAndUpdate(
//     { _id: req.user._id },
//     { avatar: result.secure_url },
//     { new: true },
//   );

//   res.status(200).json({ url: user.avatar });
// };

export async function getCurrentUser(req, res, next) {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return next(createHttpError(404, 'User not found'));

    res.status(200).json(user);
  } catch (error) {
    next(error);
  }
}

export async function updateUser(req, res, next) {
  try {
    const user = await User.findOneAndUpdate({ _id: req.user._id }, req.body, {
      new: true,
    });
    if (!user) return next(createHttpError(404, 'User not found'));

    res.status(200).json(user);
  } catch (error) {
    next(error);
  }
}
