import Hero from '../models/hero.js';
import User from '../models/user.js';

export const getHeroes = async (req, res, next) => {
  try {
    const { sortBy = '_id', sortOrder = 'asc', username, search } = req.query;

    const page = Number(req.query.page) || 1;
    const perPage = Number(req.query.perPage) || 8;
    const skip = (page - 1) * perPage;
    // Створюємо об'єкт фільтра для запиту до бази даних
    const filter = {};
    // Додаємо фільтр за автором, якщо параметр username присутній
    if (username) {
      const user = await User.findOne({ username }).select('_id');
      if (user) {
        filter.author = user._id;
      } else {
        // Якщо користувача не знайдено, повертаємо порожній результат
        return res.status(200).json({
          page,
          perPage,
          totalPages: 0,
          totalHeroes: 0,
          sortBy,
          sortOrder,
          heroes: [],
        });
      }
    }
    // Додаємо фільтр за назвою героя, якщо параметр search присутній
    if (search) {
      filter.name = { $regex: search, $options: 'i' };
    }

    const heroesQuery = Hero.find(filter);

    // Виконуємо одразу два запити паралельно
    const [totalHeroes, heroes] = await Promise.all([
      Hero.countDocuments(filter), // Використовуємо фільтр для підрахунку загальної кількості героїв
      heroesQuery
        .skip(skip)
        .limit(perPage)
        .sort({ [sortBy]: sortOrder })
        .populate('author', 'username')
        .exec(),
    ]);

    // Обчислюємо загальну кількість «сторінок»
    const totalPages = Math.ceil(totalHeroes / perPage);

    res.status(200).json({
      page,
      perPage,
      totalPages,
      totalHeroes,
      sortBy,
      sortOrder,
      heroes,
    });
  } catch (error) {
    next(error);
  }
};

export const getHeroById = async (req, res, next) => {
  try {
    const { heroId } = req.params;
    const hero = await Hero.findById(heroId)
      .populate('author', 'username')
      .exec();

    if (!hero) {
      // Повертаємо 404, якщо героя не знайдено
      return res.status(404).json({ message: 'Hero not found' });
    }

    res.status(200).json(hero);
  } catch (error) {
    next(error);
  }
};
