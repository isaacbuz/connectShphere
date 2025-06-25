import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import { Server } from 'socket.io';
import mongoose from 'mongoose';
import Redis from 'ioredis';
import dotenv from 'dotenv';

// Import routes
import authRoutes from './routes/auth.routes';
import contentRoutes from './routes/content.routes';
import userRoutes from './routes/user.routes';
import aiRoutes from './routes/ai.routes';
import blockchainRoutes from './routes/blockchain.routes';

// Import middleware
import { errorHandler } from './middleware/error.middleware';
import { authenticate } from './middleware/auth.middleware';

// Load environment variables
dotenv.config();

class ConnectSphereServer {
  public app: express.Application;
  public server: any;
  public io: Server;
  public redis: Redis;

  constructor() {
    this.app = express();
    this.server = createServer(this.app);
    this.io = new Server(this.server, {
      cors: {
        origin: process.env.FRONTEND_URL || 'http://localhost:3000',
        credentials: true
      }
    });
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
    });

    this.connectDatabase();
    this.setupMiddleware();
    this.setupRoutes();
    this.setupSocketHandlers();
    this.setupErrorHandling();
  }

  private async connectDatabase(): Promise<void> {
    try {
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/connectsphere', {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      } as any);
      console.log('✅ MongoDB connected successfully');
    } catch (error) {
      console.error('❌ MongoDB connection error:', error);
      process.exit(1);
    }
  }

  private setupMiddleware(): void {
    // Security middleware
    this.app.use(helmet());
    this.app.use(cors({
      origin: process.env.FRONTEND_URL || 'http://localhost:3000',
      credentials: true
    }));

    // Rate limiting
    const limiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // limit each IP to 100 requests per windowMs
      message: 'Too many requests from this IP, please try again later.'
    });
    this.app.use('/api/', limiter);

    // General middleware
    this.app.use(compression());
    this.app.use(express.json({ limit: '50mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '50mb' }));
    this.app.use(morgan('combined'));

    // Health check endpoint
    this.app.get('/health', (req, res) => {
      res.status(200).json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
      });
    });
  }

  private setupRoutes(): void {
    // Public routes
    this.app.use('/api/auth', authRoutes);
    
    // Protected routes
    this.app.use('/api/content', authenticate, contentRoutes);
    this.app.use('/api/users', authenticate, userRoutes);
    this.app.use('/api/ai', authenticate, aiRoutes);
    this.app.use('/api/blockchain', authenticate, blockchainRoutes);

    // 404 handler
    this.app.use('*', (req, res) => {
      res.status(404).json({ error: 'Route not found' });
    });
  }

  private setupSocketHandlers(): void {
    this.io.use(async (socket, next) => {
      try {
        // Implement socket authentication
        const token = socket.handshake.auth.token;
        if (!token) {
          return next(new Error('Authentication error'));
        }
        // Verify token and attach user to socket
        // socket.userId = decoded.userId;
        next();
      } catch (err) {
        next(new Error('Authentication error'));
      }
    });

    this.io.on('connection', (socket) => {
      console.log(`User connected: ${socket.id}`);

      // Join user to their personal room
      // socket.join(`user:${socket.userId}`);

      // Handle real-time events
      socket.on('post:create', async (data) => {
        // Broadcast new post to followers
        this.io.emit('post:new', data);
      });

      socket.on('post:like', async (data) => {
        // Notify post author
        this.io.to(`user:${data.authorId}`).emit('notification:like', data);
      });

      socket.on('ai:personalization', async (data) => {
        // Request AI personalization
        // Emit results back to user
      });

      socket.on('disconnect', () => {
        console.log(`User disconnected: ${socket.id}`);
      });
    });
  }

  private setupErrorHandling(): void {
    this.app.use(errorHandler);

    process.on('unhandledRejection', (reason, promise) => {
      console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    });

    process.on('uncaughtException', (error) => {
      console.error('Uncaught Exception:', error);
      process.exit(1);
    });
  }

  public start(): void {
    const PORT = process.env.PORT || 3000;
    this.server.listen(PORT, () => {
      console.log(`🚀 ConnectSphere API Server running on port ${PORT}`);
      console.log(`📡 WebSocket server ready`);
      console.log(`🔗 Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  }
}

// Start server
const server = new ConnectSphereServer();
server.start();

export default server.app; 