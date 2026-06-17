"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const prisma_1 = __importDefault(require("./prisma"));
async function main() {
    console.log("Checking DB connection...");
    try {
        const categories = await prisma_1.default.category.findMany({
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
        const articles = await prisma_1.default.article.findMany({
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
    }
    catch (error) {
        console.error("DB connection/query failed:", error);
    }
    finally {
        await prisma_1.default.$disconnect();
    }
}
main();
