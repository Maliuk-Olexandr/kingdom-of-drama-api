import Hero from '../models/hero.js';

export const getAllHeroes = async (req, res, next) => {
  try {
    const { sortBy = '_id', sortOrder = 'asc' } = req.query;

    const page = Number(req.query.page) || 1;
    const perPage = Number(req.query.perPage) || 8;
    const skip = (page - 1) * perPage;

    const heroesQuery = Hero.find();

    // Виконуємо одразу два запити паралельно
    const [totalHeroes, heroes] = await Promise.all([
      heroesQuery.clone().countDocuments(),
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
      // Повертаємо 200, але додаємо прапорець, що героя немає
      return res.status(200).json({ message: 'Hero not found', status: 404 });
    }

    res.status(200).json(hero);
  } catch (error) {
    next(error);
  }
};
