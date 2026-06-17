"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteCategory = exports.updateCategory = exports.createCategory = exports.getCategoryById = exports.getCategories = void 0;
const prisma_1 = __importDefault(require("../prisma"));
const mockData_1 = require("../mockData");
function slugify(text) {
    return text
        .toString()
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-') // Replace spaces with -
        .replace(/&/g, 'and') // Replace & with 'and'
        .replace(/[^\w\-]+/g, '') // Remove all non-word chars
        .replace(/\-\-+/g, '-'); // Replace multiple - with single -
}
function isConnectionError(err) {
    if (!err)
        return false;
    const errMsg = String(err.message || err);
    return (errMsg.includes('P1001') ||
        errMsg.includes('P1002') ||
        errMsg.includes('P1003') ||
        errMsg.includes('Can\'t reach database server') ||
        errMsg.includes('connection') ||
        errMsg.includes('connect') ||
        errMsg.includes('ENOTFOUND') ||
        errMsg.includes('ECONNREFUSED'));
}
// GET /api/categories
const getCategories = async (req, res, next) => {
    try {
        const categories = await prisma_1.default.category.findMany({
            orderBy: { name: 'asc' },
            include: {
                _count: {
                    select: { articles: true }
                }
            }
        });
        res.json(categories);
    }
    catch (error) {
        if (isConnectionError(error)) {
            console.warn("⚠️ Database connection failed. Falling back to MOCK_CATEGORIES.");
            const result = mockData_1.MOCK_CATEGORIES.map(c => ({
                ...c,
                _count: { articles: mockData_1.MOCK_ARTICLES.filter(a => a.categoryId === c.id).length }
            }));
            res.json(result);
            return;
        }
        next(error);
    }
};
exports.getCategories = getCategories;
// GET /api/categories/:id
const getCategoryById = async (req, res, next) => {
    try {
        const id = parseInt(req.params.id, 10);
        if (isNaN(id)) {
            res.status(400).json({ error: 'Invalid category ID' });
            return;
        }
        try {
            const category = await prisma_1.default.category.findUnique({
                where: { id },
                include: {
                    articles: {
                        take: 10,
                        orderBy: { publishedAt: 'desc' },
                        include: { source: true }
                    }
                }
            });
            if (!category) {
                res.status(404).json({ error: 'Category not found' });
                return;
            }
            res.json(category);
        }
        catch (error) {
            if (isConnectionError(error)) {
                console.warn(`⚠️ Database connection failed. Falling back to MOCK_CATEGORIES for ID ${id}.`);
                const cat = mockData_1.MOCK_CATEGORIES.find(c => c.id === id);
                if (!cat) {
                    res.status(404).json({ error: 'Category not found' });
                    return;
                }
                const articles = mockData_1.MOCK_ARTICLES.filter(a => a.categoryId === id);
                res.json({
                    ...cat,
                    articles
                });
                return;
            }
            throw error;
        }
    }
    catch (error) {
        next(error);
    }
};
exports.getCategoryById = getCategoryById;
// POST /api/categories
const createCategory = async (req, res, next) => {
    try {
        const { name } = req.body;
        if (!name || typeof name !== 'string' || name.trim() === '') {
            res.status(400).json({ error: 'Category name is required' });
            return;
        }
        const trimmedName = name.trim();
        const slug = slugify(trimmedName);
        try {
            // Check duplicate
            const existing = await prisma_1.default.category.findFirst({
                where: {
                    OR: [
                        { name: trimmedName },
                        { slug }
                    ]
                }
            });
            if (existing) {
                res.status(400).json({ error: 'Category with this name or slug already exists' });
                return;
            }
            const newCategory = await prisma_1.default.category.create({
                data: {
                    name: trimmedName,
                    slug
                }
            });
            res.status(201).json(newCategory);
        }
        catch (error) {
            if (isConnectionError(error)) {
                console.warn("⚠️ Database connection failed. Returning simulated category creation.");
                const simulated = {
                    id: Math.floor(Math.random() * 1000) + 100,
                    name: trimmedName,
                    slug,
                    createdAt: new Date(),
                    updatedAt: new Date()
                };
                res.status(201).json(simulated);
                return;
            }
            throw error;
        }
    }
    catch (error) {
        next(error);
    }
};
exports.createCategory = createCategory;
// PUT /api/categories/:id
const updateCategory = async (req, res, next) => {
    try {
        const id = parseInt(req.params.id, 10);
        if (isNaN(id)) {
            res.status(400).json({ error: 'Invalid category ID' });
            return;
        }
        const { name } = req.body;
        if (!name || typeof name !== 'string' || name.trim() === '') {
            res.status(400).json({ error: 'Category name is required for update' });
            return;
        }
        const trimmedName = name.trim();
        const slug = slugify(trimmedName);
        try {
            const category = await prisma_1.default.category.findUnique({
                where: { id }
            });
            if (!category) {
                res.status(404).json({ error: 'Category not found' });
                return;
            }
            const existing = await prisma_1.default.category.findFirst({
                where: {
                    id: { not: id },
                    OR: [
                        { name: trimmedName },
                        { slug }
                    ]
                }
            });
            if (existing) {
                res.status(400).json({ error: 'Another category with this name or slug already exists' });
                return;
            }
            const updatedCategory = await prisma_1.default.category.update({
                where: { id },
                data: {
                    name: trimmedName,
                    slug
                }
            });
            res.json(updatedCategory);
        }
        catch (error) {
            if (isConnectionError(error)) {
                console.warn("⚠️ Database connection failed. Returning simulated category update.");
                res.json({
                    id,
                    name: trimmedName,
                    slug,
                    createdAt: new Date(),
                    updatedAt: new Date()
                });
                return;
            }
            throw error;
        }
    }
    catch (error) {
        next(error);
    }
};
exports.updateCategory = updateCategory;
// DELETE /api/categories/:id
const deleteCategory = async (req, res, next) => {
    try {
        const id = parseInt(req.params.id, 10);
        if (isNaN(id)) {
            res.status(400).json({ error: 'Invalid category ID' });
            return;
        }
        try {
            const category = await prisma_1.default.category.findUnique({
                where: { id }
            });
            if (!category) {
                res.status(404).json({ error: 'Category not found' });
                return;
            }
            await prisma_1.default.category.delete({
                where: { id }
            });
            res.json({ message: 'Category deleted successfully' });
        }
        catch (error) {
            if (isConnectionError(error)) {
                console.warn("⚠️ Database connection failed. Returning simulated category deletion.");
                res.json({ message: 'Category deleted successfully (Simulated)' });
                return;
            }
            throw error;
        }
    }
    catch (error) {
        next(error);
    }
};
exports.deleteCategory = deleteCategory;
