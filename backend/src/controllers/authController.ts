import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User';
import { AuthRequest } from '../middleware/auth';
import logger from '../utils/logger';

const generateToken = (id: string): string => {
  return jwt.sign(
    { id },
    process.env.JWT_SECRET || 'your-secret-key',
    { expiresIn: process.env.JWT_EXPIRE || '7d' } as jwt.SignOptions
  );
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, pin } = req.body;
    
    // Find user by email or use the pin directly for quick clock-in
    let user;
    if (email) {
      user = await User.findOne({ email, isActive: true });
    } else {
      // For PIN-only login, we need to implement a different strategy
      // This could be a dedicated PIN field or a special lookup
      res.status(400).json({ error: 'Email is required for login' });
      return;
    }
    
    if (!user || !(await user.comparePin(pin))) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }
    
    // Update last login
    user.lastLogin = new Date();
    await user.save();
    
    const token = generateToken((user._id as any).toString());
    
    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department
      }
    });
  } catch (error) {
    logger.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
};

export const quickClockIn = async (req: Request, res: Response): Promise<void> => {
  try {
    const { pin } = req.body;
    
    // For quick clock-in, find user by comparing PIN with all users
    // In production, you might want to implement a more efficient method
    const users = await User.find({ isActive: true });
    
    let authenticatedUser = null;
    for (const user of users) {
      if (await user.comparePin(pin)) {
        authenticatedUser = user;
        break;
      }
    }
    
    if (!authenticatedUser) {
      res.status(401).json({ error: 'Invalid PIN' });
      return;
    }
    
    const token = generateToken((authenticatedUser._id as any).toString());
    
    res.json({
      token,
      user: {
        id: authenticatedUser._id,
        name: authenticatedUser.name,
        role: authenticatedUser.role
      }
    });
  } catch (error) {
    logger.error('Quick clock-in error:', error);
    res.status(500).json({ error: 'Clock-in failed' });
  }
};

export const getProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }
    
    const user = await User.findById(req.user._id).select('-pin');
    res.json(user);
  } catch (error) {
    logger.error('Get profile error:', error);
    res.status(500).json({ error: 'Failed to get profile' });
  }
};

export const updateProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }
    
    const updates = req.body;
    delete updates.pin; // Don't allow PIN updates through this endpoint
    delete updates.role; // Don't allow role updates through profile endpoint
    
    const user = await User.findByIdAndUpdate(
      req.user._id,
      updates,
      { new: true, runValidators: true }
    ).select('-pin');
    
    res.json(user);
  } catch (error) {
    logger.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
};

export const changePin = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }
    
    const { currentPin, newPin } = req.body;
    
    const user = await User.findById(req.user._id);
    if (!user || !(await user.comparePin(currentPin))) {
      res.status(401).json({ error: 'Current PIN is incorrect' });
      return;
    }
    
    user.pin = newPin;
    await user.save();
    
    res.json({ message: 'PIN updated successfully' });
  } catch (error) {
    logger.error('Change PIN error:', error);
    res.status(500).json({ error: 'Failed to change PIN' });
  }
};