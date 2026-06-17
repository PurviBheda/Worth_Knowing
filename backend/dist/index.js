"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const path_1 = __importDefault(require("path"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const categoryRoutes_1 = __importDefault(require("./routes/categoryRoutes"));
const articleRoutes_1 = __importDefault(require("./routes/articleRoutes"));
const prisma_1 = __importDefault(require("./prisma"));
const adminRoutes_1 = __importDefault(require("./routes/adminRoutes"));
const aiRoutes_1 = __importDefault(require("./routes/aiRoutes"));
const verificationRoutes_1 = __importDefault(require("./routes/verificationRoutes"));
const authRoutes_1 = __importDefault(require("./routes/authRoutes"));
const personalizationRoutes_1 = __importDefault(require("./routes/personalizationRoutes"));
const ingestionService_1 = require("./services/ingestionService");
// Load environment variables
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5000;
// Middleware
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// Serve static assets
app.use(express_1.default.static(path_1.default.resolve(__dirname, '../../frontend')));
// Routes
// Duplicate routes removed
app.use('/api/categories', categoryRoutes_1.default);
app.use('/api/articles', articleRoutes_1.default);
app.use('/api/admin', adminRoutes_1.default);
app.use('/api/ai', aiRoutes_1.default);
app.use('/api/verification', verificationRoutes_1.default);
app.use('/api/auth', authRoutes_1.default);
app.use('/api/user', personalizationRoutes_1.default);
// SPA fallback
app.get('*', (req, res) => {
    res.sendFile(path_1.default.resolve(__dirname, '../../frontend/index.html'));
});
// Health check endpoint
app.get('/api/health', async (req, res) => {
    try {
        // Check database connection
        await prisma_1.default.$queryRaw `SELECT 1`;
        res.json({
            status: 'OK',
            timestamp: new Date(),
            database: 'Connected',
            uptime: process.uptime()
        });
    }
    catch (error) {
        res.status(500).json({
            status: 'ERROR',
            timestamp: new Date(),
            database: 'Disconnected',
            error: error.message || error
        });
    }
});
// Global Error Handler
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(err.status || 500).json({
        error: err.message || 'Internal Server Error',
        ...(process.env.NODE_ENV === 'development' ? { stack: err.stack } : {})
    });
});
// Start Server
const server = app.listen(PORT, async () => {
    console.log(`🚀 Server is running on port ${PORT}`);
    console.log(`📌 Health check available at http://localhost:${PORT}/api/health`);
    (0, ingestionService_1.startScheduler)();
    // Trigger initial news ingestion if database has no articles
    try {
        const count = await prisma_1.default.article.count();
        if (count === 0) {
            console.log('🚀 No articles found in database – running initial news ingestion...');
            const { ingestNews } = require('./services/ingestionService');
            ingestNews().catch((err) => {
                console.error('⚠️ Initial news ingestion failed:', err);
            });
        }
    }
    catch (err) {
        console.error('⚠️ Error checking initial article count:', err);
    }
});
server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.error(`❌ Port ${PORT} is already in use. Please close the other process and try again.`);
        process.exit(1);
    }
    else {
        throw err;
    }
});
// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM signal received. Closing HTTP server and database connections.');
    server.close(() => {
        prisma_1.default.$disconnect().then(() => {
            console.log('HTTP server and database connections closed.');
            process.exit(0);
        });
    });
});
