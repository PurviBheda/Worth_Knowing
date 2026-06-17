import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import cors from 'cors';
import dotenv from 'dotenv';
import categoryRoutes from './routes/categoryRoutes';
import articleRoutes from './routes/articleRoutes';
import prisma from './prisma';
import adminRoutes from './routes/adminRoutes';
import aiRoutes from './routes/aiRoutes';
import verificationRoutes from './routes/verificationRoutes';
import authRoutes from './routes/authRoutes';
import personalizationRoutes from './routes/personalizationRoutes';
import { startScheduler } from './services/ingestionService';


// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
// Serve static assets
app.use(express.static(path.resolve(__dirname, '../../frontend')));
// Routes
// Duplicate routes removed
app.use('/api/categories', categoryRoutes);
app.use('/api/articles', articleRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/verification', verificationRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/user', personalizationRoutes);

// SPA fallback
app.get('*', (req, res) => {
  res.sendFile(path.resolve(__dirname, '../../frontend/index.html'));
});

// Health check endpoint
app.get('/api/health', async (req: Request, res: Response) => {
  try {
    // Check database connection
    await prisma.$queryRaw`SELECT 1`;
    res.json({
      status: 'OK',
      timestamp: new Date(),
      database: 'Connected',
      uptime: process.uptime()
    });
  } catch (error: any) {
    res.status(500).json({
      status: 'ERROR',
      timestamp: new Date(),
      database: 'Disconnected',
      error: error.message || error
    });
  }
});

// Global Error Handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
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
  startScheduler();

  // Trigger initial news ingestion if database has no articles
  try {
    const count = await prisma.article.count();
    if (count === 0) {
      console.log('🚀 No articles found in database – running initial news ingestion...');
      const { ingestNews } = require('./services/ingestionService');
      ingestNews().catch((err: any) => {
        console.error('⚠️ Initial news ingestion failed:', err);
      });
    }
  } catch (err) {
    console.error('⚠️ Error checking initial article count:', err);
  }
});

server.on('error', (err: NodeJS.ErrnoException) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} is already in use. Please close the other process and try again.`);
    process.exit(1);
  } else {
    throw err;
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received. Closing HTTP server and database connections.');
  server.close(() => {
    prisma.$disconnect().then(() => {
      console.log('HTTP server and database connections closed.');
      process.exit(0);
    });
  });
});
