import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';

// Import routes
import userRoutes from './routes/user.routes';
import contentRoutes from './routes/content.routes';
import authRoutes from './routes/auth.routes';
import aiRoutes from './routes/ai.routes';
import blockchainRoutes from './routes/blockchain.routes';

// Import error handling
import { errorHandler, notFoundHandler } from './middleware/errorHandler';

// Load environment variables
dotenv.config();

class StarlingServer {
  private app: Application;
  private server: any;
  private io: SocketIOServer;
  private port: number;

  constructor() {
    this.port = parseInt(process.env.PORT || '3000');
    this.app = express();
    this.server = createServer(this.app);
    this.io = new SocketIOServer(this.server, {
      cors: {
        origin: process.env.FRONTEND_URL || "http://localhost:5173",
        methods: ["GET", "POST"]
      }
    });

    this.initializeMiddleware();
    this.initializeRoutes();
    this.initializeErrorHandling();
    this.initializeWebSocket();
  }

  private initializeMiddleware(): void {
    // Security middleware
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'", "https:"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
        },
      },
    }));

    // CORS configuration
    this.app.use(cors({
      origin: process.env.FRONTEND_URL || "http://localhost:5173",
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
    }));

    // Rate limiting
    const limiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // limit each IP to 100 requests per windowMs
      message: 'Too many requests from this IP, please try again later.',
      standardHeaders: true,
      legacyHeaders: false,
    });
    this.app.use('/api/', limiter);

    // Other middleware
    this.app.use(compression());
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));
    
    // Logging
    if (process.env.NODE_ENV !== 'test') {
      this.app.use(morgan('combined'));
    }
  }

  private initializeRoutes(): void {
    // Health check endpoint
    this.app.get('/health', (req: Request, res: Response) => {
      res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
      });
    });

    // API routes
    this.app.use('/api/users', userRoutes);
    this.app.use('/api/content', contentRoutes);
    this.app.use('/api/auth', authRoutes);
    this.app.use('/api/ai', aiRoutes);
    this.app.use('/api/blockchain', blockchainRoutes);
  }

  private initializeErrorHandling(): void {
    // 404 handler - must be before error handler
    this.app.use(notFoundHandler);
    
    // Global error handler - must be last
    this.app.use(errorHandler);
  }

  private initializeWebSocket(): void {
    this.io.on('connection', (socket) => {
      console.log('Client connected:', socket.id);

      socket.on('join_room', (roomId: string) => {
        socket.join(roomId);
        console.log(`Client ${socket.id} joined room: ${roomId}`);
      });

      socket.on('leave_room', (roomId: string) => {
        socket.leave(roomId);
        console.log(`Client ${socket.id} left room: ${roomId}`);
      });

      socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
      });
    });
  }

  public async connectDatabase(): Promise<void> {
    try {
      let mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/starling_ai';
      
      // Check if we're connecting to a Docker MongoDB with auth
      if (mongoUri.includes('localhost:27017') && process.env.NODE_ENV !== 'production') {
        // For local development without auth
        mongoUri = 'mongodb://localhost:27017/starling_ai';
      }
      
      const options: mongoose.ConnectOptions = {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
        bufferCommands: false
      };

      await mongoose.connect(mongoUri, options);
      console.log('✅ MongoDB connected successfully');
      
      // Test the connection
      await mongoose.connection.db.admin().ping();
      console.log('✅ MongoDB connection verified');
    } catch (error) {
      console.error('❌ MongoDB connection error:', error);
      
      // Try to connect without auth for local development
      if (process.env.NODE_ENV !== 'production') {
        try {
          console.log('🔄 Attempting to connect to MongoDB without authentication...');
          const fallbackUri = 'mongodb://localhost:27017/starling_ai';
          await mongoose.connect(fallbackUri, {
            maxPoolSize: 10,
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
            bufferCommands: false,
            authSource: undefined,
            auth: undefined
          });
          console.log('✅ MongoDB connected successfully (no auth)');
        } catch (fallbackError) {
          console.error('❌ MongoDB fallback connection failed:', fallbackError);
          // Continue without database for development
          console.warn('⚠️ Running without database connection');
        }
      }
    }
  }

  public async start(): Promise<void> {
    try {
      // Connect to database
      await this.connectDatabase();

      // Start server
      this.server.listen(this.port, () => {
        console.log(`🚀 Starling.ai API Server running on port ${this.port}`);
        console.log(`📡 WebSocket server ready`);
        console.log(`🔗 Environment: ${process.env.NODE_ENV || 'development'}`);
      });

      // Graceful shutdown
      process.on('SIGTERM', () => {
        console.log('SIGTERM received, shutting down gracefully');
        this.server.close(() => {
          console.log('Process terminated');
          process.exit(0);
        });
      });

      process.on('SIGINT', () => {
        console.log('SIGINT received, shutting down gracefully');
        this.server.close(() => {
          console.log('Process terminated');
          process.exit(0);
        });
      });

    } catch (error) {
      console.error('❌ Failed to start server:', error);
      process.exit(1);
    }
  }

  public getIO(): SocketIOServer {
    return this.io;
  }
}

// Start the server
const server = new StarlingServer();
server.start().catch(console.error);

export default server; 