//---!!!--- ручне кешування фільтрів товарів ---!!!---//

// import Category from '../models/category.js';
// import Good from '../models/good.js';
// import { CACHE_TTL } from '../constants/time.js';

// let cachedMeta = null;
// let lastFetchTime = 0;
// export const getFilterParamsCache = async () => {
//   const now = Date.now();
//   // Якщо кеш існує і ще не протух — повертаємо його
//   if (cachedMeta && now - lastFetchTime < CACHE_TTL) {
//     return cachedMeta;
//   }
//   // Інакше — оновлюємо з бази
//   const categories = await Category.find({}, '_id');
//   const categoryIds = ['all', ...categories.map((c) => c._id.toString())];
//    const priceStats = await Good.aggregate([
//      {
//        $group: {
//          _id: null,
//          minPrice: { $min: '$price.value' },
//          maxPrice: { $max: '$price.value' },
//        },
//      },
//    ]);
//  const { minPrice, maxPrice } = priceStats[0] || {  };
//   cachedMeta = {categoryIds, minPrice, maxPrice};
//   lastFetchTime = now;
//   return cachedMeta;
// };
