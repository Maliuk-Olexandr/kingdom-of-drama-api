import { ALLOWED_VIEW_MODES } from '../constants/const.js';
import Hero from '../models/hero.js';
import User from '../models/user.js';

export const getHeroes = async (req, res, next) => {
  try {
    const { sortBy = '_id', sortOrder = 'asc', username, search } = req.query;

    let viewMode = req.query.viewMode;
    if (!ALLOWED_VIEW_MODES.includes(viewMode)) {
      viewMode = null;
    }
    const page = Number(req.query.page) || 1;
    const perPage = Number(req.query.perPage) || 8;
    const skip = (page - 1) * perPage;

    // 1. Визначаємо автора та перевіряємо, чи є запитувач власником профілю
    let isOwner = false;
    let targetUserId = null;

    if (username) {
      const user = await User.findOne({ username }).select('_id');
      if (!user) {
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
      targetUserId = user._id;

      // req.user заповнюється твоїм middleware авторизації
      isOwner = req.user && req.user._id.toString() === targetUserId.toString();
    }

    // 2. ЗАХИСТ: Режим "all" (перегляд чернеток і неопублікованого) доступний ТІЛЬКИ власнику або адміну
    const isAdmin = req.user && req.user.role === 'admin';
    if (viewMode === 'all' && !isOwner && !isAdmin) {
      console.warn(
        `Unauthorized access attempt to "all" viewMode by user ${req.user ? req.user._id : 'unknown'}`,
      );
      // Якщо хакер намагається підглянути "all" у чужому профілі або загальній стрічці —
      // примусово скидаємо в null, що згодом поверне порожній список
      viewMode = null;
    }
    // ==========================================
    // НОВА ПЕРЕВІРКА: Якщо viewMode відсутній або не валідний
    if (viewMode === null || viewMode === undefined) {
      return res.status(200).json({
        page,
        perPage,
        totalPages: 0,
        totalHeroes: 0,
        sortBy,
        sortOrder,
        heroes: [], // Повертаємо пустий список БЕЗ запитів до бази
      });
    }
    // ==========================================

    // 3. Конструюємо фільтр для MongoDB (сюди ми дійдемо тільки якщо viewMode не null)
    const filter = {};

    // Якщо є прив'язка до конкретного автора (наприклад, у табі профілю)
    if (targetUserId) {
      filter.author = targetUserId;
    }

    // Застосовуємо логіку статусів відповідно до обраного режиму
    switch (viewMode) {
      case 'in-show':
        // 1) in-show = isInShow: true
        filter['statuses.isInShow'] = true;
        break;

      case 'canon-only':
        // 2) canon-only = isCanon: true
        filter['statuses.isCanon'] = true;
        break;

      case 'fans-only':
        // 3) fans-only = {!isCanon, !isDraft}
        filter['statuses.isCanon'] = false;
        filter['statuses.isDraft'] = false;
        break;

      case 'profile-only':
        // 4) profile-only = {!isDraft, !isAuthorShown}
        filter['statuses.isDraft'] = false;
        filter['statuses.isAuthorShown'] = false;
        break;

      case 'all':
        // 5) all = всі (без додаткових фільтрів, бо користувач має право бачити все)
        break;

      default:
        // Цей блок фактично ніколи не спрацює завдяки перевірці вище,
        // але залишаємо його для чистоти switch-case
        filter['statuses.isDraft'] = false;
        break;
    }

    // 4. Пошук за ім'ям
    if (search) {
      filter.name = { $regex: search, $options: 'i' };
    }

    // 5. Виконуємо запити до бази
    const heroesQuery = Hero.find(filter);

    const [totalHeroes, heroes] = await Promise.all([
      Hero.countDocuments(filter),
      heroesQuery
        .skip(skip)
        .limit(perPage)
        .sort({ [sortBy]: sortOrder === 'desc' ? -1 : 1 })
        .populate('author', 'username')
        .exec(),
    ]);

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
