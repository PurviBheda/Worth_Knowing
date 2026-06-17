import prisma from './prisma';
import { getCategoryPlaceholderImage } from './services/ingestionService';

async function main() {
  console.log("Starting update of existing article images to use title hashing...");
  try {
    const articles = await prisma.article.findMany({
      include: {
        category: {
          select: { name: true }
        }
      }
    });

    console.log(`Found ${articles.length} total articles in database.`);
    let updatedCount = 0;

    for (const article of articles) {
      // Skip if imageId is already a full URL
      if (article.imageId && article.imageId.startsWith('http')) {
        continue;
      }

      // Generate the new title-hashed image ID
      const newImageId = getCategoryPlaceholderImage(article.category.name, article.title);

      if (article.imageId !== newImageId) {
        await prisma.article.update({
          where: { id: article.id },
          data: { imageId: newImageId }
        });
        updatedCount++;
      }
    }

    console.log(`Completed migration: updated ${updatedCount} articles with new dynamic image IDs.`);
  } catch (error) {
    console.error("Migration failed:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
