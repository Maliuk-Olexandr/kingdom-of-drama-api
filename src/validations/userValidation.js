import { Joi, Segments } from 'celebrate';

export const updateUserSchema = {
  [Segments.BODY]: Joi.object({
    username: Joi.string().min(3).max(32).trim().lowercase(),
    displayName: Joi.string().min(3).max(64).trim(),
    aboutMe: Joi.string().allow('').max(800),
    birthdate: Joi.date().allow(null),
    userName: Joi.string().allow(''),
    userSurname: Joi.string().allow(''),
    phone: Joi.string().allow(''),
    email: Joi.string().email(),
    city: Joi.string().allow(''),
    telegramId: Joi.string().allow(''),
    userSettings: Joi.object({
      darkMode: Joi.boolean(),
      birthdateHidden: Joi.boolean(),
      savedHidden: Joi.boolean(),
      favoritesHidden: Joi.boolean(),
    }).default({}), // Додаємо .default({}), щоб userSettings завжди був об'єктом, навіть якщо його не передали
  })
    .min(1)
    .unknown(false), // .min(1) - вимагає принаймні одне поле для оновлення, .unknown(false) - забороняє додаткові поля
};
