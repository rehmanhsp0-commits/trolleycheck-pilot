import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const connectionString = (process.env.DATABASE_URL || '').replace('?pgbouncer=true', '').replace('&pgbouncer=true', '');
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

const CATEGORY_EMOJI: Record<string, string> = {
  'dairy':           '🥛',
  'bread':           '🍞',
  'meat':            '🥩',
  'fruit & veg':     '🥦',
  'pantry':          '🥫',
  'drinks':          '🥤',
  'household':       '🧴',
  'cleaning':        '🧹',
  'confectionery':   '🍫',
};

type ProductSeed = {
  name: string;
  category: string;
  unit: string;
  coles: number;
  woolworths: number;
  iga: number;
  aldi: number;
};

const products: ProductSeed[] = [
  // Dairy
  { name: 'Full Cream Milk',        category: 'dairy',         unit: 'L',    coles: 2.50, woolworths: 2.20, iga: 2.60, aldi: 1.99 },
  { name: 'Skim Milk',              category: 'dairy',         unit: 'L',    coles: 2.45, woolworths: 2.15, iga: 2.55, aldi: 1.99 },
  { name: 'Oat Milk',               category: 'dairy',         unit: 'L',    coles: 4.50, woolworths: 4.20, iga: 4.70, aldi: 3.49 },
  { name: 'Almond Milk',            category: 'dairy',         unit: 'L',    coles: 4.20, woolworths: 3.90, iga: 4.40, aldi: 3.29 },
  { name: 'Natural Yoghurt',        category: 'dairy',         unit: 'each', coles: 3.80, woolworths: 3.50, iga: 3.90, aldi: 2.99 },
  { name: 'Greek Yoghurt',          category: 'dairy',         unit: 'each', coles: 4.20, woolworths: 4.00, iga: 4.30, aldi: 3.49 },
  { name: 'Cheddar Cheese',         category: 'dairy',         unit: 'each', coles: 8.50, woolworths: 7.90, iga: 8.80, aldi: 6.99 },
  { name: 'Tasty Cheese Slices',    category: 'dairy',         unit: 'each', coles: 5.20, woolworths: 4.80, iga: 5.40, aldi: 4.29 },
  { name: 'Butter',                 category: 'dairy',         unit: 'each', coles: 4.00, woolworths: 3.70, iga: 4.20, aldi: 3.29 },
  { name: 'Eggs',                   category: 'dairy',         unit: 'each', coles: 6.00, woolworths: 5.50, iga: 6.20, aldi: 4.99 },
  { name: 'Thickened Cream',        category: 'dairy',         unit: 'each', coles: 3.20, woolworths: 2.90, iga: 3.30, aldi: 2.49 },
  { name: 'Sour Cream',             category: 'dairy',         unit: 'each', coles: 2.80, woolworths: 2.60, iga: 2.90, aldi: 2.29 },

  // Bread
  { name: 'White Bread',            category: 'bread',         unit: 'each', coles: 3.00, woolworths: 2.80, iga: 3.10, aldi: 2.19 },
  { name: 'Wholemeal Bread',        category: 'bread',         unit: 'each', coles: 3.20, woolworths: 3.00, iga: 3.30, aldi: 2.49 },
  { name: 'Sourdough Loaf',         category: 'bread',         unit: 'each', coles: 5.50, woolworths: 6.00, iga: 5.80, aldi: 4.49 },
  { name: 'Multigrain Bread',       category: 'bread',         unit: 'each', coles: 3.50, woolworths: 3.20, iga: 3.60, aldi: 2.69 },
  { name: 'English Muffins',        category: 'bread',         unit: 'each', coles: 3.80, woolworths: 3.50, iga: 3.90, aldi: 2.99 },
  { name: 'Tortilla Wraps',         category: 'bread',         unit: 'each', coles: 3.20, woolworths: 2.90, iga: 3.30, aldi: 2.49 },
  { name: 'Plain Crackers',         category: 'bread',         unit: 'each', coles: 2.50, woolworths: 2.30, iga: 2.60, aldi: 1.99 },

  // Meat
  { name: 'Chicken Breast',         category: 'meat',          unit: 'kg',   coles: 10.00, woolworths: 9.50,  iga: 10.50, aldi: 8.99 },
  { name: 'Chicken Thighs',         category: 'meat',          unit: 'kg',   coles: 7.50,  woolworths: 6.90,  iga: 7.90,  aldi: 6.49 },
  { name: 'Beef Mince',             category: 'meat',          unit: 'kg',   coles: 12.00, woolworths: 11.50, iga: 12.50, aldi: 10.99 },
  { name: 'Lamb Chops',             category: 'meat',          unit: 'kg',   coles: 18.00, woolworths: 17.50, iga: 18.50, aldi: 16.99 },
  { name: 'Pork Sausages',          category: 'meat',          unit: 'each', coles: 6.50,  woolworths: 5.90,  iga: 6.80,  aldi: 4.99 },
  { name: 'Beef Steak',             category: 'meat',          unit: 'kg',   coles: 25.00, woolworths: 24.00, iga: 26.00, aldi: 22.99 },
  { name: 'Bacon Rashers',          category: 'meat',          unit: 'each', coles: 7.00,  woolworths: 6.50,  iga: 7.20,  aldi: 5.99 },
  { name: 'Salmon Fillet',          category: 'meat',          unit: 'kg',   coles: 28.00, woolworths: 27.00, iga: 29.00, aldi: 24.99 },

  // Fruit & Veg
  { name: 'Bananas',                category: 'fruit & veg',   unit: 'kg',   coles: 2.90, woolworths: 2.70, iga: 3.00, aldi: 2.49 },
  { name: 'Apples',                 category: 'fruit & veg',   unit: 'kg',   coles: 4.50, woolworths: 4.20, iga: 4.70, aldi: 3.99 },
  { name: 'Strawberries',           category: 'fruit & veg',   unit: 'each', coles: 4.00, woolworths: 3.50, iga: 4.20, aldi: 3.29 },
  { name: 'Broccoli',               category: 'fruit & veg',   unit: 'each', coles: 3.00, woolworths: 2.80, iga: 3.10, aldi: 2.49 },
  { name: 'Carrots',                category: 'fruit & veg',   unit: 'kg',   coles: 1.80, woolworths: 1.60, iga: 1.90, aldi: 1.49 },
  { name: 'Potatoes',               category: 'fruit & veg',   unit: 'kg',   coles: 3.50, woolworths: 3.20, iga: 3.60, aldi: 2.99 },
  { name: 'Tomatoes',               category: 'fruit & veg',   unit: 'kg',   coles: 4.00, woolworths: 3.70, iga: 4.20, aldi: 3.49 },
  { name: 'Baby Spinach',           category: 'fruit & veg',   unit: 'each', coles: 3.50, woolworths: 3.20, iga: 3.60, aldi: 2.99 },
  { name: 'Avocado',                category: 'fruit & veg',   unit: 'each', coles: 2.50, woolworths: 2.20, iga: 2.60, aldi: 1.99 },
  { name: 'Sweet Potato',           category: 'fruit & veg',   unit: 'kg',   coles: 3.80, woolworths: 3.50, iga: 3.90, aldi: 3.29 },
  { name: 'Cucumber',               category: 'fruit & veg',   unit: 'each', coles: 1.50, woolworths: 1.30, iga: 1.60, aldi: 1.19 },
  { name: 'Capsicum',               category: 'fruit & veg',   unit: 'each', coles: 1.80, woolworths: 1.60, iga: 1.90, aldi: 1.49 },
  { name: 'Mushrooms',              category: 'fruit & veg',   unit: 'each', coles: 3.50, woolworths: 3.20, iga: 3.70, aldi: 2.79 },
  { name: 'Lemons',                 category: 'fruit & veg',   unit: 'each', coles: 2.00, woolworths: 1.80, iga: 2.10, aldi: 1.69 },

  // Pantry
  { name: 'Rolled Oats',            category: 'pantry',        unit: 'each', coles: 3.50, woolworths: 3.20, iga: 3.60, aldi: 2.49 },
  { name: 'White Rice',             category: 'pantry',        unit: 'kg',   coles: 4.00, woolworths: 3.70, iga: 4.20, aldi: 3.29 },
  { name: 'Pasta',                  category: 'pantry',        unit: 'each', coles: 2.50, woolworths: 2.20, iga: 2.60, aldi: 1.79 },
  { name: 'Canned Tomatoes',        category: 'pantry',        unit: 'each', coles: 1.80, woolworths: 1.60, iga: 1.90, aldi: 1.29 },
  { name: 'Canned Chickpeas',       category: 'pantry',        unit: 'each', coles: 1.90, woolworths: 1.70, iga: 1.99, aldi: 1.39 },
  { name: 'Olive Oil',              category: 'pantry',        unit: 'each', coles: 8.50, woolworths: 7.90, iga: 8.80, aldi: 6.99 },
  { name: 'Tomato Sauce',           category: 'pantry',        unit: 'each', coles: 3.20, woolworths: 2.90, iga: 3.30, aldi: 2.49 },
  { name: 'Plain Flour',            category: 'pantry',        unit: 'kg',   coles: 2.00, woolworths: 1.80, iga: 2.10, aldi: 1.49 },
  { name: 'Sugar',                  category: 'pantry',        unit: 'kg',   coles: 2.20, woolworths: 2.00, iga: 2.30, aldi: 1.79 },
  { name: 'Peanut Butter',          category: 'pantry',        unit: 'each', coles: 5.00, woolworths: 4.50, iga: 5.20, aldi: 3.99 },
  { name: 'Vegemite',               category: 'pantry',        unit: 'each', coles: 5.50, woolworths: 5.20, iga: 5.70, aldi: 4.99 },
  { name: 'Honey',                  category: 'pantry',        unit: 'each', coles: 6.00, woolworths: 5.50, iga: 6.20, aldi: 4.79 },
  { name: 'Soy Sauce',              category: 'pantry',        unit: 'each', coles: 3.00, woolworths: 2.80, iga: 3.10, aldi: 2.49 },
  { name: 'Coconut Milk',           category: 'pantry',        unit: 'each', coles: 2.50, woolworths: 2.20, iga: 2.60, aldi: 1.89 },

  // Drinks
  { name: 'Orange Juice',           category: 'drinks',        unit: 'L',    coles: 4.50, woolworths: 4.20, iga: 4.70, aldi: 3.49 },
  { name: 'Apple Juice',            category: 'drinks',        unit: 'L',    coles: 4.00, woolworths: 3.70, iga: 4.20, aldi: 3.29 },
  { name: 'Sparkling Water',        category: 'drinks',        unit: 'L',    coles: 2.50, woolworths: 2.20, iga: 2.60, aldi: 1.59 },
  { name: 'Cola',                   category: 'drinks',        unit: 'L',    coles: 3.20, woolworths: 2.90, iga: 3.30, aldi: 2.49 },
  { name: 'Coffee Pods',            category: 'drinks',        unit: 'each', coles: 9.00, woolworths: 8.50, iga: 9.20, aldi: 6.99 },
  { name: 'Black Tea Bags',         category: 'drinks',        unit: 'each', coles: 4.50, woolworths: 4.00, iga: 4.60, aldi: 3.49 },
  { name: 'Instant Coffee',         category: 'drinks',        unit: 'each', coles: 7.00, woolworths: 6.50, iga: 7.20, aldi: 5.49 },
  { name: 'Energy Drink',           category: 'drinks',        unit: 'each', coles: 3.50, woolworths: 3.20, iga: 3.60, aldi: 2.49 },

  // Household
  { name: 'Dishwashing Liquid',     category: 'household',     unit: 'each', coles: 3.50, woolworths: 3.20, iga: 3.60, aldi: 2.49 },
  { name: 'Laundry Detergent',      category: 'household',     unit: 'each', coles: 12.00, woolworths: 11.00, iga: 12.50, aldi: 9.99 },
  { name: 'Paper Towels',           category: 'household',     unit: 'each', coles: 5.00, woolworths: 4.50, iga: 5.20, aldi: 3.99 },
  { name: 'Toilet Paper',           category: 'household',     unit: 'each', coles: 8.00, woolworths: 7.50, iga: 8.20, aldi: 6.99 },
  { name: 'Bin Liners',             category: 'household',     unit: 'each', coles: 4.00, woolworths: 3.70, iga: 4.20, aldi: 2.99 },
  { name: 'Aluminium Foil',         category: 'household',     unit: 'each', coles: 3.50, woolworths: 3.20, iga: 3.60, aldi: 2.49 },
  { name: 'Plastic Wrap',           category: 'household',     unit: 'each', coles: 3.00, woolworths: 2.80, iga: 3.10, aldi: 2.19 },
  { name: 'Zip Lock Bags',          category: 'household',     unit: 'each', coles: 4.50, woolworths: 4.20, iga: 4.70, aldi: 3.49 },

  // Cleaning
  { name: 'Multi-Purpose Spray',    category: 'cleaning',      unit: 'each', coles: 4.50, woolworths: 4.20, iga: 4.70, aldi: 3.49 },
  { name: 'Bathroom Cleaner',       category: 'cleaning',      unit: 'each', coles: 4.80, woolworths: 4.50, iga: 5.00, aldi: 3.79 },
  { name: 'Toilet Cleaner',         category: 'cleaning',      unit: 'each', coles: 3.80, woolworths: 3.50, iga: 3.90, aldi: 2.99 },
  { name: 'Floor Cleaner',          category: 'cleaning',      unit: 'each', coles: 5.50, woolworths: 5.20, iga: 5.70, aldi: 4.49 },
  { name: 'Mould Remover',          category: 'cleaning',      unit: 'each', coles: 6.00, woolworths: 5.50, iga: 6.20, aldi: 4.99 },
  { name: 'Sponges',                category: 'cleaning',      unit: 'each', coles: 3.00, woolworths: 2.80, iga: 3.10, aldi: 1.99 },
  { name: 'Bleach',                 category: 'cleaning',      unit: 'each', coles: 3.50, woolworths: 3.20, iga: 3.60, aldi: 2.49 },
  { name: 'Microfibre Cloths',      category: 'cleaning',      unit: 'each', coles: 5.00, woolworths: 4.80, iga: 5.20, aldi: 3.99 },
  { name: 'Dishwasher Tablets',     category: 'cleaning',      unit: 'each', coles: 14.00, woolworths: 13.50, iga: 14.50, aldi: 10.99 },

  // Confectionery
  { name: 'Milk Chocolate Block',   category: 'confectionery', unit: 'each', coles: 4.50, woolworths: 4.20, iga: 4.70, aldi: 2.99 },
  { name: 'Dark Chocolate Block',   category: 'confectionery', unit: 'each', coles: 4.50, woolworths: 4.20, iga: 4.70, aldi: 2.99 },
  { name: 'Lollies',                category: 'confectionery', unit: 'each', coles: 3.50, woolworths: 3.20, iga: 3.60, aldi: 2.49 },
  { name: 'Gummy Bears',            category: 'confectionery', unit: 'each', coles: 3.00, woolworths: 2.80, iga: 3.10, aldi: 2.19 },
  { name: 'Potato Chips',           category: 'confectionery', unit: 'each', coles: 3.80, woolworths: 3.50, iga: 3.90, aldi: 2.49 },
  { name: 'Chocolate Biscuits',     category: 'confectionery', unit: 'each', coles: 4.50, woolworths: 4.20, iga: 4.70, aldi: 3.29 },
  { name: 'Tim Tams',               category: 'confectionery', unit: 'each', coles: 4.50, woolworths: 4.00, iga: 4.70, aldi: 3.49 },
  { name: 'Muesli Bars',            category: 'confectionery', unit: 'each', coles: 4.00, woolworths: 3.70, iga: 4.20, aldi: 2.99 },
  { name: 'Ice Cream',              category: 'confectionery', unit: 'each', coles: 6.50, woolworths: 6.00, iga: 6.80, aldi: 4.99 },
  { name: 'Chewing Gum',            category: 'confectionery', unit: 'each', coles: 2.50, woolworths: 2.30, iga: 2.60, aldi: 1.79 },
];

async function main() {
  console.log('Seeding product catalogue...');

  for (const p of products) {
    const emoji = CATEGORY_EMOJI[p.category] ?? '';

    const existing = await prisma.product.findFirst({ where: { name: p.name } });
    const product = existing
      ? await prisma.product.update({
          where: { id: existing.id },
          data: { category: p.category, unit: p.unit, categoryEmoji: emoji, active: true },
        })
      : await prisma.product.create({
          data: { name: p.name, category: p.category, categoryEmoji: emoji, unit: p.unit, active: true },
        });

    await prisma.price.upsert({
      where: { productId_store: { productId: product.id, store: 'Coles' } },
      update: { amount: p.coles },
      create: { productId: product.id, store: 'Coles', amount: p.coles, currency: 'AUD' },
    });

    await prisma.price.upsert({
      where: { productId_store: { productId: product.id, store: 'Woolworths' } },
      update: { amount: p.woolworths },
      create: { productId: product.id, store: 'Woolworths', amount: p.woolworths, currency: 'AUD' },
    });

    await prisma.price.upsert({
      where: { productId_store: { productId: product.id, store: 'IGA' } },
      update: { amount: p.iga },
      create: { productId: product.id, store: 'IGA', amount: p.iga, currency: 'AUD' },
    });

    await prisma.price.upsert({
      where: { productId_store: { productId: product.id, store: 'ALDI' } },
      update: { amount: p.aldi },
      create: { productId: product.id, store: 'ALDI', amount: p.aldi, currency: 'AUD' },
    });
  }

  // Remove legacy store prices
  await prisma.price.deleteMany({ where: { store: { in: ['FreshMart', 'ValueGrocer'] } } });

  console.log(`Seeded ${products.length} products with 4 stores (Coles, Woolworths, IGA, ALDI).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
