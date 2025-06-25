import { Request, Response } from 'express';
import { User } from '../models/User';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

// Register new user
export const register = async (req: Request, res: Response) => {
  try {
    const { username, email, password, walletAddress } = req.body;

    // Validation
    if (!username || !email || !password || !walletAddress) {
      return res.status(400).json({ 
        error: 'Username, email, password, and wallet address are required' 
      });
    }

    if (password.length < 6) {
      return res.status(400).json({ 
        error: 'Password must be at least 6 characters long' 
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email }, { username }, { walletAddress }]
    });

    if (existingUser) {
      return res.status(400).json({ 
        error: 'User with this email, username, or wallet address already exists' 
      });
    }

    // Create new user
    const user = new User({
      username,
      email,
      password,
      walletAddress
    });

    await user.save();

    // Generate JWT token
    const token = jwt.sign(
      { id: user._id, username: user.username },
      process.env.JWT_SECRET || 'fallback-secret',
      { expiresIn: '7d' }
    );

    // Remove password from response
    const { password: _, ...userResponse } = user.toObject();

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: userResponse,
        token
      }
    });
  } catch (error) {
    console.error('Error registering user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Login user
export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({ 
        error: 'Email and password are required' 
      });
    }

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ 
        error: 'Invalid email or password' 
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({ 
        error: 'Account is deactivated' 
      });
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({ 
        error: 'Invalid email or password' 
      });
    }

    // Update last seen
    user.lastSeen = new Date();
    await user.save();

    // Generate JWT token
    const token = jwt.sign(
      { id: user._id, username: user.username },
      process.env.JWT_SECRET || 'fallback-secret',
      { expiresIn: '7d' }
    );

    // Remove password from response
    const { password: _, ...userResponse } = user.toObject();

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: userResponse,
        token
      }
    });
  } catch (error) {
    console.error('Error logging in:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Login with wallet
export const loginWithWallet = async (req: Request, res: Response) => {
  try {
    const { walletAddress, signature, message } = req.body;

    if (!walletAddress || !signature || !message) {
      return res.status(400).json({ 
        error: 'Wallet address, signature, and message are required' 
      });
    }

    // TODO: Verify signature with ethers.js
    // const recoveredAddress = ethers.utils.verifyMessage(message, signature);
    // if (recoveredAddress.toLowerCase() !== walletAddress.toLowerCase()) {
    //   return res.status(401).json({ error: 'Invalid signature' });
    // }

    // Find user by wallet address
    const user = await User.findOne({ walletAddress: walletAddress.toLowerCase() });
    if (!user) {
      return res.status(404).json({ 
        error: 'No account found with this wallet address' 
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({ 
        error: 'Account is deactivated' 
      });
    }

    // Update last seen
    user.lastSeen = new Date();
    await user.save();

    // Generate JWT token
    const token = jwt.sign(
      { id: user._id, username: user.username },
      process.env.JWT_SECRET || 'fallback-secret',
      { expiresIn: '7d' }
    );

    // Remove password from response
    const { password: _, ...userResponse } = user.toObject();

    res.json({
      success: true,
      message: 'Wallet login successful',
      data: {
        user: userResponse,
        token
      }
    });
  } catch (error) {
    console.error('Error logging in with wallet:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Refresh token
export const refreshToken = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const user = await User.findById(userId).select('-password');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Generate new JWT token
    const token = jwt.sign(
      { id: user._id, username: user.username },
      process.env.JWT_SECRET || 'fallback-secret',
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      message: 'Token refreshed successfully',
      data: {
        user,
        token
      }
    });
  } catch (error) {
    console.error('Error refreshing token:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Logout user
export const logout = async (req: Request, res: Response) => {
  try {
    // In a stateless JWT system, logout is handled client-side
    // by removing the token. However, we can track logout events
    // for analytics purposes.
    
    const userId = req.user?.id;
    if (userId) {
      // Update last seen
      await User.findByIdAndUpdate(userId, {
        lastSeen: new Date()
      });
    }

    res.json({
      success: true,
      message: 'Logout successful'
    });
  } catch (error) {
    console.error('Error during logout:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get current user
export const getCurrentUser = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

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
    console.error('Error fetching current user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Change password
export const changePassword = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { currentPassword, newPassword } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ 
        error: 'Current password and new password are required' 
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ 
        error: 'New password must be at least 6 characters long' 
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Verify current password
    const isCurrentPasswordValid = await user.comparePassword(currentPassword);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Error changing password:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}; 