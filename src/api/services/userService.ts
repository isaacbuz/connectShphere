import { User, IUser } from '../models/User';
import { Interaction } from '../models/Interaction';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { ethers } from 'ethers';
import { redis } from '../config/redis';
import { kafka } from '../config/kafka';

export interface UserRegistrationData {
  username: string;
  email: string;
  password: string;
  walletAddress: string;
  displayName?: string;
}

export interface UserLoginData {
  email: string;
  password: string;
}

export interface UserProfileUpdate {
  displayName?: string;
  bio?: string;
  avatar?: string;
  socialLinks?: {
    twitter?: string;
    linkedin?: string;
    github?: string;
  };
  preferences?: {
    theme?: 'light' | 'dark';
    notifications?: {
      email?: boolean;
      push?: boolean;
      mentions?: boolean;
    };
    privacy?: {
      profileVisibility?: 'public' | 'private' | 'friends';
      contentVisibility?: 'public' | 'private' | 'friends';
    };
  };
}

export class UserService {
  private readonly JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
  private readonly JWT_EXPIRES_IN = '7d';

  /**
   * Register a new user
   */
  async registerUser(userData: UserRegistrationData): Promise<{ user: IUser; token: string }> {
    try {
      // Check if user already exists
      const existingUser = await User.findOne({
        $or: [
          { email: userData.email.toLowerCase() },
          { username: userData.username.toLowerCase() },
          { walletAddress: userData.walletAddress.toLowerCase() }
        ]
      });

      if (existingUser) {
        throw new Error('User already exists with this email, username, or wallet address');
      }

      // Validate wallet address
      if (!ethers.isAddress(userData.walletAddress)) {
        throw new Error('Invalid wallet address');
      }

      // Create new user
      const user = new User({
        username: userData.username.toLowerCase(),
        email: userData.email.toLowerCase(),
        password: userData.password,
        walletAddress: userData.walletAddress.toLowerCase(),
        profile: {
          displayName: userData.displayName || userData.username
        }
      });

      await user.save();

      // Generate JWT token
      const token = this.generateToken(user._id.toString());

      // Cache user data
      await this.cacheUserData(user._id.toString(), user);

      // Publish user registration event
      await this.publishUserEvent('user.registered', {
        userId: user._id.toString(),
        username: user.username,
        walletAddress: user.walletAddress
      });

      return { user, token };
    } catch (error) {
      throw new Error(`Registration failed: ${error.message}`);
    }
  }

  /**
   * Authenticate user login
   */
  async loginUser(loginData: UserLoginData): Promise<{ user: IUser; token: string }> {
    try {
      const user = await User.findOne({ email: loginData.email.toLowerCase() });
      if (!user) {
        throw new Error('Invalid email or password');
      }

      const isPasswordValid = await user.comparePassword(loginData.password);
      if (!isPasswordValid) {
        throw new Error('Invalid email or password');
      }

      if (!user.isActive) {
        throw new Error('Account is deactivated');
      }

      // Update last seen
      user.lastSeen = new Date();
      await user.save();

      // Generate JWT token
      const token = this.generateToken(user._id.toString());

      // Cache user data
      await this.cacheUserData(user._id.toString(), user);

      // Publish login event
      await this.publishUserEvent('user.logged_in', {
        userId: user._id.toString(),
        timestamp: new Date().toISOString()
      });

      return { user, token };
    } catch (error) {
      throw new Error(`Login failed: ${error.message}`);
    }
  }

  /**
   * Get user by ID
   */
  async getUserById(userId: string): Promise<IUser | null> {
    try {
      // Try to get from cache first
      const cachedUser = await this.getCachedUserData(userId);
      if (cachedUser) {
        return cachedUser;
      }

      // Get from database
      const user = await User.findById(userId);
      if (user) {
        // Cache the user data
        await this.cacheUserData(userId, user);
      }

      return user;
    } catch (error) {
      throw new Error(`Failed to get user: ${error.message}`);
    }
  }

  /**
   * Get user by wallet address
   */
  async getUserByWalletAddress(walletAddress: string): Promise<IUser | null> {
    try {
      const user = await User.findOne({ walletAddress: walletAddress.toLowerCase() });
      return user;
    } catch (error) {
      throw new Error(`Failed to get user by wallet: ${error.message}`);
    }
  }

  /**
   * Update user profile
   */
  async updateUserProfile(userId: string, profileData: UserProfileUpdate): Promise<IUser> {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Update profile fields
      if (profileData.displayName) {
        user.profile.displayName = profileData.displayName;
      }
      if (profileData.bio) {
        user.profile.bio = profileData.bio;
      }
      if (profileData.avatar) {
        user.profile.avatar = profileData.avatar;
      }
      if (profileData.socialLinks) {
        user.profile.socialLinks = { ...user.profile.socialLinks, ...profileData.socialLinks };
      }
      if (profileData.preferences) {
        user.preferences = { ...user.preferences, ...profileData.preferences };
      }

      await user.save();

      // Update cache
      await this.cacheUserData(userId, user);

      // Publish profile update event
      await this.publishUserEvent('user.profile_updated', {
        userId: user._id.toString(),
        updatedFields: Object.keys(profileData)
      });

      return user;
    } catch (error) {
      throw new Error(`Failed to update profile: ${error.message}`);
    }
  }

  /**
   * Follow a user
   */
  async followUser(followerId: string, followingId: string): Promise<void> {
    try {
      if (followerId === followingId) {
        throw new Error('Cannot follow yourself');
      }

      const [follower, following] = await Promise.all([
        User.findById(followerId),
        User.findById(followingId)
      ]);

      if (!follower || !following) {
        throw new Error('User not found');
      }

      // Check if already following
      const existingInteraction = await Interaction.findOne({
        user: followerId,
        targetType: 'user',
        targetId: followingId,
        type: 'follow'
      });

      if (existingInteraction) {
        throw new Error('Already following this user');
      }

      // Create follow interaction
      await Interaction.create({
        user: followerId,
        targetType: 'user',
        targetId: followingId,
        type: 'follow'
      });

      // Update follower counts
      await Promise.all([
        User.findByIdAndUpdate(followerId, { $inc: { 'stats.following': 1 } }),
        User.findByIdAndUpdate(followingId, { $inc: { 'stats.followers': 1 } })
      ]);

      // Publish follow event
      await this.publishUserEvent('user.followed', {
        followerId,
        followingId,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      throw new Error(`Failed to follow user: ${error.message}`);
    }
  }

  /**
   * Unfollow a user
   */
  async unfollowUser(followerId: string, followingId: string): Promise<void> {
    try {
      const existingInteraction = await Interaction.findOne({
        user: followerId,
        targetType: 'user',
        targetId: followingId,
        type: 'follow'
      });

      if (!existingInteraction) {
        throw new Error('Not following this user');
      }

      // Remove follow interaction
      await Interaction.findByIdAndDelete(existingInteraction._id);

      // Update follower counts
      await Promise.all([
        User.findByIdAndUpdate(followerId, { $inc: { 'stats.following': -1 } }),
        User.findByIdAndUpdate(followingId, { $inc: { 'stats.followers': -1 } })
      ]);

      // Publish unfollow event
      await this.publishUserEvent('user.unfollowed', {
        followerId,
        followingId,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      throw new Error(`Failed to unfollow user: ${error.message}`);
    }
  }

  /**
   * Get user followers
   */
  async getUserFollowers(userId: string, page: number = 1, limit: number = 20): Promise<{ users: IUser[]; total: number }> {
    try {
      const skip = (page - 1) * limit;

      const [followers, total] = await Promise.all([
        Interaction.find({ targetType: 'user', targetId: userId, type: 'follow' })
          .populate('user', 'username profile.displayName profile.avatar stats')
          .skip(skip)
          .limit(limit)
          .sort({ createdAt: -1 }),
        Interaction.countDocuments({ targetType: 'user', targetId: userId, type: 'follow' })
      ]);

      const users = followers.map(f => f.user as IUser);
      return { users, total };
    } catch (error) {
      throw new Error(`Failed to get followers: ${error.message}`);
    }
  }

  /**
   * Get user following
   */
  async getUserFollowing(userId: string, page: number = 1, limit: number = 20): Promise<{ users: IUser[]; total: number }> {
    try {
      const skip = (page - 1) * limit;

      const [following, total] = await Promise.all([
        Interaction.find({ user: userId, targetType: 'user', type: 'follow' })
          .populate('targetId', 'username profile.displayName profile.avatar stats')
          .skip(skip)
          .limit(limit)
          .sort({ createdAt: -1 }),
        Interaction.countDocuments({ user: userId, targetType: 'user', type: 'follow' })
      ]);

      const users = following.map(f => f.targetId as IUser);
      return { users, total };
    } catch (error) {
      throw new Error(`Failed to get following: ${error.message}`);
    }
  }

  /**
   * Update user token balance
   */
  async updateTokenBalance(userId: string, amount: number, type: 'add' | 'subtract'): Promise<void> {
    try {
      const update = type === 'add' ? { $inc: { 'tokens.balance': amount } } : { $inc: { 'tokens.balance': -amount } };
      await User.findByIdAndUpdate(userId, update);

      // Publish token update event
      await this.publishUserEvent('user.tokens_updated', {
        userId,
        amount,
        type,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      throw new Error(`Failed to update token balance: ${error.message}`);
    }
  }

  /**
   * Generate JWT token
   */
  private generateToken(userId: string): string {
    return jwt.sign({ userId }, this.JWT_SECRET, { expiresIn: this.JWT_EXPIRES_IN });
  }

  /**
   * Cache user data in Redis
   */
  private async cacheUserData(userId: string, user: IUser): Promise<void> {
    try {
      const userData = user.toJSON();
      await redis.setex(`user:${userId}`, 3600, JSON.stringify(userData)); // Cache for 1 hour
    } catch (error) {
      console.error('Failed to cache user data:', error);
    }
  }

  /**
   * Get cached user data from Redis
   */
  private async getCachedUserData(userId: string): Promise<IUser | null> {
    try {
      const cached = await redis.get(`user:${userId}`);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      console.error('Failed to get cached user data:', error);
      return null;
    }
  }

  /**
   * Publish user event to Kafka
   */
  private async publishUserEvent(eventType: string, eventData: any): Promise<void> {
    try {
      const producer = kafka.producer();
      await producer.connect();
      await producer.send({
        topic: 'user-events',
        messages: [{
          key: eventData.userId || 'system',
          value: JSON.stringify({
            type: eventType,
            data: eventData,
            timestamp: new Date().toISOString()
          })
        }]
      });
      await producer.disconnect();
    } catch (error) {
      console.error('Failed to publish user event:', error);
    }
  }
}

export const userService = new UserService(); 