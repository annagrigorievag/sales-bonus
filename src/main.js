/**
 * Функция для расчета выручки
 * @param purchase запись о покупке
 * @param _product карточка товара
 * @returns {number}
 */
function calculateSimpleRevenue(purchase, _product) {
   // @TODO: Расчет выручки от операции
     // 1. Рассчитываем коэффициент скидки: 1 - (скидка в процентах / 100)
    const discountCoefficient = 1 - (purchase.discount / 100);
    
    // 2. Рассчитываем выручку: цена продажи * количество * коэффициент скидки
    const revenue = purchase.sale_price * purchase.quantity * discountCoefficient;
    
    return revenue;
}

/**
 * Функция для расчета бонусов
 * @param index порядковый номер в отсортированном массиве
 * @param total общее число продавцов
 * @param seller карточка продавца
 * @returns {number}
 */
function calculateBonusByProfit(index, total, seller) {
    // @TODO: Расчет бонуса от позиции в рейтинге
        const { profit } = seller;
    
    // Проверка на отрицательную прибыль (бонус не может быть отрицательным)
    if (profit <= 0) {
        return 0;
    }
    
    // Первое место (индекс 0) - бонус 15%
    if (index === 0) {
        return profit * 0.15;
    }
    
    // Второе и третье место (индексы 1 и 2) - бонус 10%
    if (index === 1 || index === 2) {
        return profit * 0.10;
    }
    
    // Последнее место (индекс total - 1) - бонус 0%
    if (index === total - 1) {
        return 0;
    }
    
    // Все остальные - бонус 5%
    return profit * 0.05;
}

/**
 * Функция для анализа данных продаж
 * @param data
 * @param options
 * @returns {{revenue, top_products, bonus, name, sales_count, profit, seller_id}[]}
 */
function analyzeSalesData(data, options) {
    // @TODO: Проверка входных данных
 if (!data
        || !Array.isArray(data.sellers)
        || !Array.isArray(data.products)
        || !Array.isArray(data.purchase_records)
        || data.sellers.length === 0
        || data.products.length === 0
        || data.purchase_records.length === 0
    ) {
        throw new Error('Некорректные входные данные');
    }
    // @TODO: Проверка наличия опций
  const { calculateRevenue, calculateBonus } = options || {};
    
    if (!calculateRevenue || !calculateBonus) {
        throw new Error('Отсутствуют необходимые функции расчета');
    }
    
    if (typeof calculateRevenue !== 'function' || typeof calculateBonus !== 'function') {
        throw new Error('Переданные опции должны быть функциями');
    }
    // @TODO: Подготовка промежуточных данных для сбора статистики
 const sellerStats = data.sellers.map(seller => ({
        id: seller.id,
        name: `${seller.first_name} ${seller.last_name}`,
        revenue: 0,
        profit: 0,
        sales_count: 0,
        products_sold: {} // Здесь будем накапливать проданные товары
    }));
    // @TODO: Индексация продавцов и товаров для быстрого доступа
 // Индекс продавцов для быстрого доступа по id
    const sellerIndex = {};
    sellerStats.forEach(seller => {
        sellerIndex[seller.id] = seller;
    });
    
    // Индекс товаров для быстрого доступа по sku
    const productIndex = {};
    data.products.forEach(product => {
        productIndex[product.sku] = product;
    });
    // @TODO: Расчет выручки и прибыли для каждого продавца
 // Перебираем все чеки
    data.purchase_records.forEach(record => {
        // Получаем продавца по его ID из индекса
        const seller = sellerIndex[record.seller_id];
        
        if (!seller) {
            console.warn(`Продавец с ID ${record.seller_id} не найден, чек ${record.receipt_id} пропущен`);
            return; // Пропускаем чек, если продавец не найден
        }
        
        // Увеличиваем количество продаж продавца
        seller.sales_count += 1;
        
        // Увеличиваем общую выручку продавца на сумму чека
        seller.revenue += record.total_amount;
        
      // Внутренний цикл по товарам в чеке
        record.items.forEach(item => {
            // Получаем информацию о товаре из каталога по SKU
            const product = productIndex[item.sku];
            
            if (!product) {
                console.warn(`Товар с SKU ${item.sku} не найден в каталоге, позиция пропущена`);
                return; // Пропускаем товар, если его нет в каталоге
            }
            
            // Рассчитываем себестоимость товара
            const cost = product.purchase_price * item.quantity;
            
            // Рассчитываем выручку с учетом скидки через переданную функцию
            const revenue = calculateRevenue(item, product);
            
            // Рассчитываем прибыль (выручка минус себестоимость)
            const profit = revenue - cost;
            
            // Добавляем прибыль к общей прибыли продавца
            seller.profit += profit;
            
            // Учет количества проданных товаров
            if (!seller.products_sold[item.sku]) {
                seller.products_sold[item.sku] = 0;
            }
            seller.products_sold[item.sku] += item.quantity;
        });
    });
    
    // @TODO: Сортировка продавцов по прибыли
 // Сортируем по убыванию прибыли (от большего к меньшему)
    sellerStats.sort((a, b) => b.profit - a.profit);
    // @TODO: Назначение премий на основе ранжирования
 const totalSellers = sellerStats.length;
    
    sellerStats.forEach((seller, index) => {
        // Расчет бонуса с использованием переданной функции
        seller.bonus = calculateBonus(index, totalSellers, seller);
        
        // Формирование топа-10 продуктов
        // 1. Преобразуем объект products_sold в массив записей [sku, quantity]
        // 2. Преобразуем каждую запись в объект {sku, quantity}
        // 3. Сортируем по убыванию quantity
        // 4. Берем первые 10 элементов
        
        seller.top_products = Object.entries(seller.products_sold)
            .map(([sku, quantity]) => ({ sku, quantity }))
            .sort((a, b) => b.quantity - a.quantity)
            .slice(0, 10);
    });
    // @TODO: Подготовка итоговой коллекции с нужными полями
      return sellerStats.map(seller => ({
        seller_id: seller.id,
        name: seller.name,
        revenue: Number(seller.revenue.toFixed(2)),
        profit: Number(seller.profit.toFixed(2)),
        sales_count: seller.sales_count,
        top_products: seller.top_products,
        bonus: Number(seller.bonus.toFixed(2))
    }));
}
