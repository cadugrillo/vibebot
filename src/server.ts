import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import { createServer } from 'http';
import authRoutes from './routes/auth.routes';
import adminRoutes from './routes/admin.routes';
import conversationRoutes from './routes/conversation.routes';
import messageRoutes from './routes/message.routes';
import { VibeWebSocketServer } from './websocket/server';

// Load environment variables
dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 3000;

// Create HTTP server for both Express and WebSocket
const httpServer = createServer(app);

// Middleware
// CORS configuration - allow credentials for cookies
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true, // Allow cookies to be sent
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// Cookie parser middleware for reading HTTP-only cookies
app.use(cookieParser());

// Request logging middleware
app.use((req: Request, _res: Response, next: NextFunction) => {
  console.warn(`${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/messages', messageRoutes);

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'Not found' });
});

// Error handling middleware
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Error:', err.message);
  res.status(500).json({ error: 'Internal server error' });
});

// Initialize WebSocket server
const wsServer = new VibeWebSocketServer({
  server: httpServer,
  path: '/ws',
  heartbeatInterval: 30000, // 30 seconds
  connectionTimeout: 60000, // 60 seconds
});

// Graceful shutdown handler
process.on('SIGTERM', async () => {
  console.log('SIGTERM signal received: closing HTTP server and WebSocket server');
  await wsServer.shutdown();
  httpServer.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});

// Start server
httpServer.listen(PORT, () => {
  console.warn(`Server is running on port ${PORT}`);
  console.warn(`WebSocket server available at ws://localhost:${PORT}/ws`);
});

export default app;
export { wsServer };
