import { Request, Response } from 'express';
import User from '../models/User';
import { AuthRequest } from '../middleware/auth';
import logger from '../utils/logger';

export const getAllUsers = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { department, role, isActive } = req.query;
    
    const filter: any = {};
    if (department) filter.department = department;
    if (role) filter.role = role;
    if (isActive !== undefined) filter.isActive = isActive === 'true';
    
    const users = await User.find(filter).select('-pin').sort('name');
    res.json(users);
  } catch (error) {
    logger.error('Get all users error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
};

export const getUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = await User.findById(req.params.id).select('-pin');
    
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    
    res.json(user);
  } catch (error) {
    logger.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
};

export const createUser = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userData = req.body;
    
    // Check if email already exists
    if (userData.email) {
      const existingUser = await User.findOne({ email: userData.email });
      if (existingUser) {
        res.status(400).json({ error: 'Email already in use' });
        return;
      }
    }
    
    const user = new User(userData);
    await user.save();
    
    // Remove PIN from response
    const userResponse = user.toObject() as any;
    delete userResponse.pin;
    
    res.status(201).json(userResponse);
  } catch (error) {
    logger.error('Create user error:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
};

export const updateUser = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const updates = req.body;
    delete updates.pin; // PIN should be updated through separate endpoint
    
    const user = await User.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    ).select('-pin');
    
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    
    res.json(user);
  } catch (error) {
    logger.error('Update user error:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
};

export const deleteUser = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // Soft delete - just deactivate the user
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    ).select('-pin');
    
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    
    res.json({ message: 'User deactivated successfully', user });
  } catch (error) {
    logger.error('Delete user error:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
};

export const resetUserPin = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { newPin } = req.body;
    const userId = req.params.id;
    
    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    
    user.pin = newPin;
    await user.save();
    
    res.json({ message: 'PIN reset successfully' });
  } catch (error) {
    logger.error('Reset PIN error:', error);
    res.status(500).json({ error: 'Failed to reset PIN' });
  }
};