import prisma from './prisma';

async function main() {
  console.log("Checking DB connection...");
  try {
    const categories = await prisma.category.findMany({
      include: {
        _count: {
          select: { articles: true }
        }
      }
    });
    console.log("Connected successfully!");
    console.log("Categories in DB:");
    categories.forEach(c => {
      console.log(`- ${c.name} (slug: ${c.slug}, articles: ${c._count.articles})`);
    });

    const articles = await prisma.article.findMany({
      take: 5,
      select: {
        id: true,
        title: true,
        category: { select: { name: true } },
        imageId: true,
        source: { select: { name: true } }
      }
    });
    console.log("\nSample articles in DB:");
    articles.forEach(a => {
      console.log(`- [${a.category.name}] ${a.title} | Image: ${a.imageId} | Source: ${a.source.name}`);
    });

  } catch (error) {
    console.error("DB connection/query failed:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
