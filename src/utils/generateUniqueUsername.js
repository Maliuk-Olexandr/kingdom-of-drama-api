import { nanoid } from 'nanoid';

import User from '../models/user.js';

export async function generateDeletedUsername() {
  let isUnique = false;
  let newUsername = '';

  while (!isUnique) {
    const suffix = nanoid(6).toLowerCase(); // генеруємо 6 символів
    newUsername = `user-${suffix}`;

    const existingUser = await User.findOne({ username: newUsername });
    if (!existingUser) {
      isUnique = true;
    }
  }
  return newUsername;
}
