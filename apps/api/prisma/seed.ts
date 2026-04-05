import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const connectionString = (process.env.DATABASE_URL || '').replace('?pgbouncer=true', '').replace('&pgbouncer=true', '');
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

const CATEGORY_EMOJI: Record<string, string> = {
  'dairy':       '🥛',
  'bread':       '🍞',
  'meat':        '🥩',
  'fruit & veg': '🥦',
  'pantry':      '🥫',
  'drinks':      '🥤',
  'household':   '🧴',
};

type ProductSeed = {
  name: string;
  category: string;
  unit: string;
  freshmart: number;
  valuegrocer: number;
};

const products: ProductSeed[] = [
  // Dairy
  { name: 'Full Cream Milk',        category: 'dairy',       unit: 'L',    freshmart: 2.50, valuegrocer: 2.20 },
  { name: 'Skim Milk',              category: 'dairy',       unit: 'L',    freshmart: 2.45, valuegrocer: 2.15 },
  { name: 'Oat Milk',               category: 'dairy',       unit: 'L',    freshmart: 4.50, valuegrocer: 4.20 },
  { name: 'Almond Milk',            category: 'dairy',       unit: 'L',    freshmart: 4.20, valuegrocer: 3.90 },
  { name: 'Natural Yoghurt',        category: 'dairy',       unit: 'each', freshmart: 3.80, valuegrocer: 3.50 },
  { name: 'Greek Yoghurt',          category: 'dairy',       unit: 'each', freshmart: 4.20, valuegrocer: 4.00 },
  { name: 'Cheddar Cheese',         category: 'dairy',       unit: 'each', freshmart: 8.50, valuegrocer: 7.90 },
  { name: 'Tasty Cheese Slices',    category: 'dairy',       unit: 'each', freshmart: 5.20, valuegrocer: 4.80 },
  { name: 'Butter',                 category: 'dairy',       unit: 'each', freshmart: 4.00, valuegrocer: 3.70 },
  { name: 'Eggs',                   category: 'dairy',       unit: 'each', freshmart: 6.00, valuegrocer: 5.50 },
  { name: 'Thickened Cream',        category: 'dairy',       unit: 'each', freshmart: 3.20, valuegrocer: 2.90 },
  { name: 'Sour Cream',             category: 'dairy',       unit: 'each', freshmart: 2.80, valuegrocer: 2.60 },

  // Bread
  { name: 'White Bread',            category: 'bread',       unit: 'each', freshmart: 3.00, valuegrocer: 2.80 },
  { name: 'Wholemeal Bread',        category: 'bread',       unit: 'each', freshmart: 3.20, valuegrocer: 3.00 },
  { name: 'Sourdough Loaf',         category: 'bread',       unit: 'each', freshmart: 5.50, valuegrocer: 6.00 },
  { name: 'Multigrain Bread',       category: 'bread',       unit: 'each', freshmart: 3.50, valuegrocer: 3.20 },
  { name: 'English Muffins',        category: 'bread',       unit: 'each', freshmart: 3.80, valuegrocer: 3.50 },
  { name: 'Tortilla Wraps',         category: 'bread',       unit: 'each', freshmart: 3.20, valuegrocer: 2.90 },
  { name: 'Plain Crackers',         category: 'bread',       unit: 'each', freshmart: 2.50, valuegrocer: 2.30 },

  // Meat
  { name: 'Chicken Breast',         category: 'meat',        unit: 'kg',   freshmart: 10.00, valuegrocer: 9.50 },
  { name: 'Chicken Thighs',         category: 'meat',        unit: 'kg',   freshmart: 7.50,  valuegrocer: 6.90 },
  { name: 'Beef Mince',             category: 'meat',        unit: 'kg',   freshmart: 12.00, valuegrocer: 11.50 },
  { name: 'Lamb Chops',             category: 'meat',        unit: 'kg',   freshmart: 18.00, valuegrocer: 17.50 },
  { name: 'Pork Sausages',          category: 'meat',        unit: 'each', freshmart: 6.50,  valuegrocer: 5.90 },
  { name: 'Beef Steak',             category: 'meat',        unit: 'kg',   freshmart: 25.00, valuegrocer: 24.00 },
  { name: 'Bacon Rashers',          category: 'meat',        unit: 'each', freshmart: 7.00,  valuegrocer: 6.50 },
  { name: 'Salmon Fillet',          category: 'meat',        unit: 'kg',   freshmart: 28.00, valuegrocer: 27.00 },

  // Fruit & veg
  { name: 'Bananas',                category: 'fruit & veg', unit: 'kg',   freshmart: 2.90, valuegrocer: 2.70 },
  { name: 'Apples',                 category: 'fruit & veg', unit: 'kg',   freshmart: 4.50, valuegrocer: 4.20 },
  { name: 'Strawberries',           category: 'fruit & veg', unit: 'each', freshmart: 4.00, valuegrocer: 3.50 },
  { name: 'Broccoli',               category: 'fruit & veg', unit: 'each', freshmart: 3.00, valuegrocer: 2.80 },
  { name: 'Carrots',                category: 'fruit & veg', unit: 'kg',   freshmart: 1.80, valuegrocer: 1.60 },
  { name: 'Potatoes',               category: 'fruit & veg', unit: 'kg',   freshmart: 3.50, valuegrocer: 3.20 },
  { name: 'Tomatoes',               category: 'fruit & veg', unit: 'kg',   freshmart: 4.00, valuegrocer: 3.70 },
  { name: 'Baby Spinach',           category: 'fruit & veg', unit: 'each', freshmart: 3.50, valuegrocer: 3.20 },
  { name: 'Avocado',                category: 'fruit & veg', unit: 'each', freshmart: 2.50, valuegrocer: 2.20 },
  { name: 'Sweet Potato',           category: 'fruit & veg', unit: 'kg',   freshmart: 3.80, valuegrocer: 3.50 },

  // Pantry
  { name: 'Rolled Oats',            category: 'pantry',      unit: 'each', freshmart: 3.50, valuegrocer: 3.20 },
  { name: 'White Rice',             category: 'pantry',      unit: 'kg',   freshmart: 4.00, valuegrocer: 3.70 },
  { name: 'Pasta',                  category: 'pantry',      unit: 'each', freshmart: 2.50, valuegrocer: 2.20 },
  { name: 'Canned Tomatoes',        category: 'pantry',      unit: 'each', freshmart: 1.80, valuegrocer: 1.60 },
  { name: 'Canned Chickpeas',       category: 'pantry',      unit: 'each', freshmart: 1.90, valuegrocer: 1.70 },
  { name: 'Olive Oil',              category: 'pantry',      unit: 'each', freshmart: 8.50, valuegrocer: 7.90 },
  { name: 'Tomato Sauce',           category: 'pantry',      unit: 'each', freshmart: 3.20, valuegrocer: 2.90 },
  { name: 'Plain Flour',            category: 'pantry',      unit: 'kg',   freshmart: 2.00, valuegrocer: 1.80 },
  { name: 'Sugar',                  category: 'pantry',      unit: 'kg',   freshmart: 2.20, valuegrocer: 2.00 },
  { name: 'Peanut Butter',          category: 'pantry',      unit: 'each', freshmart: 5.00, valuegrocer: 4.50 },

  // Drinks
  { name: 'Orange Juice',           category: 'drinks',      unit: 'L',    freshmart: 4.50, valuegrocer: 4.20 },
  { name: 'Apple Juice',            category: 'drinks',      unit: 'L',    freshmart: 4.00, valuegrocer: 3.70 },
  { name: 'Sparkling Water',        category: 'drinks',      unit: 'L',    freshmart: 2.50, valuegrocer: 2.20 },
  { name: 'Cola',                   category: 'drinks',      unit: 'L',    freshmart: 3.20, valuegrocer: 2.90 },
  { name: 'Coffee Pods',            category: 'drinks',      unit: 'each', freshmart: 9.00, valuegrocer: 8.50 },
  { name: 'Black Tea Bags',         category: 'drinks',      unit: 'each', freshmart: 4.50, valuegrocer: 4.00 },

  // Household
  { name: 'Dishwashing Liquid',     category: 'household',   unit: 'each', freshmart: 3.50, valuegrocer: 3.20 },
  { name: 'Laundry Detergent',      category: 'household',   unit: 'each', freshmart: 12.00, valuegrocer: 11.00 },
  { name: 'Paper Towels',           category: 'household',   unit: 'each', freshmart: 5.00, valuegrocer: 4.50 },
  { name: 'Toilet Paper',           category: 'household',   unit: 'each', freshmart: 8.00, valuegrocer: 7.50 },
  { name: 'Bin Liners',             category: 'household',   unit: 'each', freshmart: 4.00, valuegrocer: 3.70 },
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
      where: { productId_store: { productId: product.id, store: 'FreshMart' } },
      update: { amount: p.freshmart },
      create: { productId: product.id, store: 'FreshMart', amount: p.freshmart, currency: 'AUD' },
    });

    await prisma.price.upsert({
      where: { productId_store: { productId: product.id, store: 'ValueGrocer' } },
      update: { amount: p.valuegrocer },
      create: { productId: product.id, store: 'ValueGrocer', amount: p.valuegrocer, currency: 'AUD' },
    });
  }

  console.log(`Seeded ${products.length} products with emoji categories.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
