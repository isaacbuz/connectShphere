import { Request, Response } from 'express';
import { User } from '../models/User';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

// Get user profile
export const getProfile = async (req: Request, res: Response) => {
  try {
    const userId = req.params.id || req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const user = await User.findById(userId)
      .select('-password')
      .populate('followers', 'username avatar bio')
      .populate('following', 'username avatar bio');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Update user profile
export const updateProfile = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { username, email, bio, avatar, socialLinks, preferences } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Check if username is already taken
    if (username) {
      const existingUser = await User.findOne({ username, _id: { $ne: userId } });
      if (existingUser) {
        return res.status(400).json({ error: 'Username already taken' });
      }
    }

    // Check if email is already taken
    if (email) {
      const existingUser = await User.findOne({ email, _id: { $ne: userId } });
      if (existingUser) {
        return res.status(400).json({ error: 'Email already registered' });
      }
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        username,
        email,
        bio,
        avatar,
        socialLinks,
        preferences,
        updatedAt: new Date()
      },
      { new: true, runValidators: true }
    ).select('-password');

    res.json({
      success: true,
      data: updatedUser
    });
  } catch (error) {
    console.error('Error updating user profile:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Follow user
export const followUser = async (req: Request, res: Response) => {
  try {
    const followerId = req.user?.id;
    const { userId } = req.params;

    if (!followerId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (followerId === userId) {
      return res.status(400).json({ error: 'Cannot follow yourself' });
    }

    const userToFollow = await User.findById(userId);
    if (!userToFollow) {
      return res.status(404).json({ error: 'User not found' });
    }

    const follower = await User.findById(followerId);
    if (!follower) {
      return res.status(404).json({ error: 'Follower not found' });
    }

    // Check if already following
    if (userId && follower.following.includes(userId as any)) {
      return res.status(400).json({ error: 'Already following this user' });
    }

    // Add to following/followers
    await User.findByIdAndUpdate(followerId, {
      $addToSet: { following: userId }
    });

    await User.findByIdAndUpdate(userId, {
      $addToSet: { followers: followerId }
    });

    res.json({
      success: true,
      message: 'User followed successfully'
    });
  } catch (error) {
    console.error('Error following user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Unfollow user
export const unfollowUser = async (req: Request, res: Response) => {
  try {
    const followerId = req.user?.id;
    const { userId } = req.params;

    if (!followerId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (followerId === userId) {
      return res.status(400).json({ error: 'Cannot unfollow yourself' });
    }

    // Remove from following/followers
    await User.findByIdAndUpdate(followerId, {
      $pull: { following: userId }
    });

    await User.findByIdAndUpdate(userId, {
      $pull: { followers: followerId }
    });

    res.json({
      success: true,
      message: 'User unfollowed successfully'
    });
  } catch (error) {
    console.error('Error unfollowing user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get followers
export const getFollowers = async (req: Request, res: Response) => {
  try {
    const userId = req.params.id || req.user?.id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const user = await User.findById(userId)
      .populate({
        path: 'followers',
        select: 'username avatar bio followersCount followingCount',
        options: {
          skip: (page - 1) * limit,
          limit: limit
        }
      });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      success: true,
      data: user.followers,
      pagination: {
        page,
        limit,
        total: user.followers.length,
        hasMore: user.followers.length === limit
      }
    });
  } catch (error) {
    console.error('Error fetching followers:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get following
export const getFollowing = async (req: Request, res: Response) => {
  try {
    const userId = req.params.id || req.user?.id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const user = await User.findById(userId)
      .populate({
        path: 'following',
        select: 'username avatar bio followersCount followingCount',
        options: {
          skip: (page - 1) * limit,
          limit: limit
        }
      });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      success: true,
      data: user.following,
      pagination: {
        page,
        limit,
        total: user.following.length,
        hasMore: user.following.length === limit
      }
    });
  } catch (error) {
    console.error('Error fetching following:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Search users
export const searchUsers = async (req: Request, res: Response) => {
  try {
    const { q, page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    if (!q) {
      return res.status(400).json({ error: 'Search query required' });
    }

    const users = await User.find({
      $or: [
        { username: { $regex: q, $options: 'i' } },
        { bio: { $regex: q, $options: 'i' } }
      ]
    })
    .select('username avatar bio followersCount followingCount')
    .skip(skip)
    .limit(parseInt(limit as string))
    .sort({ followersCount: -1 });

    const total = await User.countDocuments({
      $or: [
        { username: { $regex: q, $options: 'i' } },
        { bio: { $regex: q, $options: 'i' } }
      ]
    });

    res.json({
      success: true,
      data: users,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total,
        hasMore: skip + users.length < total
      }
    });
  } catch (error) {
    console.error('Error searching users:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get user stats
export const getUserStats = async (req: Request, res: Response) => {
  try {
    const userId = req.params.id || req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const user = await User.findById(userId)
      .select('followersCount followingCount contentCount totalEarnings');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      success: true,
      data: {
        followers: user.followersCount,
        following: user.followingCount,
        content: user.contentCount,
        earnings: user.totalEarnings
      }
    });
  } catch (error) {
    console.error('Error fetching user stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}; 