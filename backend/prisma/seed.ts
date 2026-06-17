import { PrismaClient, Role } from '@prisma/client';
import { ingestNews } from '../src/services/ingestionService';

const prisma = new PrismaClient();

const CATEGORIES = [
  "AI & Technology",
  "Startups",
  "Business",
  "Stock Market",
  "Cryptocurrency",
  "Politics",
  "Science",
  "Global Affairs",
  "Economy",
  "Personal Finance",
  "Jobs",
];

const SOURCES = [
  "Moneycontrol",
  "CNBC",
  "TechCrunch",
  "The Verge",
  "CoinDesk",
  "NDTV Profit",
  "Reuters",
  "Bloomberg",
  "MIT Technology Review",
  "Nature",
  "Stack Overflow",
  "Financial Times",
  "Wall Street Journal",
  "AP News",
  "IRS",
  "IMF",
];

function slugify(text: string) {
  const norm = text.toString().toLowerCase().trim();
  if (norm === 'ai & technology' || norm === 'ai technology') return 'ai-technology';
  return norm
    .replace(/\s+/g, '-')          // Replace spaces with -
    .replace(/&/g, 'and')          // Replace & with 'and'
    .replace(/[^\w\-]+/g, '')      // Remove all non-word chars
    .replace(/\-\-+/g, '-');       // Replace multiple - with single -
}

async function main() {
  console.log("Cleaning database...");
  await prisma.bookmark.deleteMany({});
  await prisma.article.deleteMany({});
  await prisma.category.deleteMany({});
  await prisma.source.deleteMany({});
  await prisma.user.deleteMany({});

  console.log("Seeding categories...");
  for (const name of CATEGORIES) {
    const slug = slugify(name);
    await prisma.category.upsert({
      where: { name },
      create: { name, slug },
      update: { name, slug }
    });
  }

  console.log("Seeding sources...");
  for (const name of SOURCES) {
    await prisma.source.upsert({
      where: { name },
      create: { name },
      update: { name }
    });
  }

  console.log("Seeding users...");
  await prisma.user.upsert({
    where: { email: "admin@worthknowing.com" },
    create: {
      email: "admin@worthknowing.com",
      name: "Editor in Chief",
      role: Role.ADMIN,
    },
    update: {
      name: "Editor in Chief",
      role: Role.ADMIN,
    }
  });

  await prisma.user.upsert({
    where: { email: "reader@gmail.com" },
    create: {
      email: "reader@gmail.com",
      name: "John Doe",
      role: Role.USER,
    },
    update: {
      name: "John Doe",
      role: Role.USER,
    }
  });

  console.log("Triggering live news ingestion pipeline...");
  const stats = await ingestNews();
  console.log("Live news ingestion completed during seeding:", stats);

  console.log("Seeding completed successfully!");
}

main()
  .catch((e) => {
    console.error("Error during seeding:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
