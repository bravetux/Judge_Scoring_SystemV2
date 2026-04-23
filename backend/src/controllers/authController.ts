import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db, run, get, all } from '../database/db';
import { hashPassword, generateToken, comparePassword } from '../utils/auth';
import { AuthenticatedRequest } from '../middleware/auth';
import { User, Judge } from '../types';

export async function register(
  req: AuthenticatedRequest,
  res: Response
) {
  try {
    // Only admin can register new users
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can register users' });
    }

    const { username, email, password, role, name, assignedCategories } = req.body;

    if (!username || !email || !password || !role) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const existingUser = await get<User>(
      'SELECT * FROM users WHERE username = ? OR email = ?',
      [username, email]
    );

    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    const userId = uuidv4();
    const hashedPassword = await hashPassword(password);

    await run(
      `INSERT INTO users (id, username, email, password, role, createdAt)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [userId, username, email, hashedPassword, role, new Date().toISOString()]
    );

    if (role === 'judge') {
      const judgeId = uuidv4();
      await run(
        `INSERT INTO judges (id, userId, name, assignedCategories)
         VALUES (?, ?, ?, ?)`,
        [judgeId, userId, name, JSON.stringify(assignedCategories || [])]
      );
    }

    res.status(201).json({ message: 'User registered successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function login(req: Request, res: Response) {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Missing username or password' });
    }

    const user = await get<User>(
      'SELECT * FROM users WHERE username = ?',
      [username]
    );

    if (!user || !(await comparePassword(password, user.password))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = generateToken({
      userId: user.id,
      username: user.username,
      role: user.role,
    });

    res.json({ token, userId: user.id, role: user.role });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getJudges(req: AuthenticatedRequest, res: Response) {
  try {
    const judges = await all<any>(
      `SELECT j.id, j.userId, j.name, j.assignedCategories, u.username 
       FROM judges j 
       JOIN users u ON j.userId = u.id 
       ORDER BY j.name`
    );

    // Parse assignedCategories
    const formattedJudges = judges.map((judge) => ({
      ...judge,
      assignedCategories: JSON.parse(judge.assignedCategories as any),
    }));

    res.json(formattedJudges);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function updateJudgeAssignments(
  req: AuthenticatedRequest,
  res: Response
) {
  try {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can update assignments' });
    }

    const { judgeId } = req.params;
    const { assignedCategories } = req.body;

    if (!assignedCategories || !Array.isArray(assignedCategories)) {
      return res.status(400).json({ error: 'Invalid assignedCategories format' });
    }

    console.log('Updating judge assignments:', { judgeId, assignedCategories });

    const result = await run(
      'UPDATE judges SET assignedCategories = ? WHERE id = ?',
      [JSON.stringify(assignedCategories), judgeId]
    );

    console.log('Update completed for judgeId:', judgeId);

    // Verify the update
    const updated = await get<any>(
      'SELECT assignedCategories FROM judges WHERE id = ?',
      [judgeId]
    );
    console.log('Verified assignment:', updated?.assignedCategories);

    res.json({ message: 'Judge assignments updated successfully' });
  } catch (error) {
    console.error('Update judge assignments error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function updateJudgeName(
  req: AuthenticatedRequest,
  res: Response
) {
  try {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can update judge names' });
    }

    const { judgeId } = req.params;
    const { name } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Judge name is required' });
    }

    await run(
      'UPDATE judges SET name = ? WHERE id = ?',
      [name.trim(), judgeId]
    );

    res.json({ message: 'Judge name updated successfully' });
  } catch (error) {
    console.error('Update judge name error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function deleteJudge(
  req: AuthenticatedRequest,
  res: Response
) {
  try {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can delete judges' });
    }

    const { judgeId } = req.params;

    // Get the judge's userId
    const judge = await get<Judge>(
      'SELECT userId FROM judges WHERE id = ?',
      [judgeId]
    );

    if (!judge) {
      return res.status(404).json({ error: 'Judge not found' });
    }

    // Delete judge and their user account
    await run('DELETE FROM judges WHERE id = ?', [judgeId]);
    await run('DELETE FROM users WHERE id = ?', [judge.userId]);

    res.json({ message: 'Judge deleted successfully' });
  } catch (error) {
    console.error('Delete judge error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function updateJudgeUsername(
  req: AuthenticatedRequest,
  res: Response
) {
  try {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can update judge usernames' });
    }

    const { judgeId } = req.params;
    const { username } = req.body;

    if (!username || !username.trim()) {
      return res.status(400).json({ error: 'Username is required' });
    }

    // Get the judge's userId
    const judge = await get<any>(
      'SELECT userId FROM judges WHERE id = ?',
      [judgeId]
    );

    if (!judge) {
      return res.status(404).json({ error: 'Judge not found' });
    }

    // Check if username already exists for a different user
    const existingUser = await get<any>(
      'SELECT id FROM users WHERE username = ? AND id != ?',
      [username.trim(), judge.userId]
    );

    if (existingUser) {
      return res.status(400).json({ error: 'Username already exists' });
    }

    // Update the username in users table
    await run(
      'UPDATE users SET username = ? WHERE id = ?',
      [username.trim(), judge.userId]
    );

    res.json({ message: 'Judge username updated successfully' });
  } catch (error) {
    console.error('Update judge username error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getAllUsers(
  req: AuthenticatedRequest,
  res: Response
) {
  try {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can view users' });
    }

    const users = await all<any>(
      'SELECT id, username, email, role, createdAt FROM users ORDER BY username'
    );

    res.json(users);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getJudgeProfile(
  req: AuthenticatedRequest,
  res: Response
) {
  try {
    const judge = await get<any>(
      `SELECT j.id, j.name, j.assignedCategories, u.username 
       FROM judges j 
       JOIN users u ON j.userId = u.id 
       WHERE j.userId = ?`,
      [req.user?.userId]
    );

    if (!judge) {
      return res.status(404).json({ error: 'Judge profile not found' });
    }

    res.json({
      id: judge.id,
      name: judge.name,
      username: judge.username,
      assignedCategories: JSON.parse(judge.assignedCategories)
    });
  } catch (error) {
    console.error('Get judge profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function createUser(
  req: AuthenticatedRequest,
  res: Response
) {
  try {
    console.log('=== CREATE USER REQUEST ===');
    console.log('Request body:', req.body);
    console.log('Authenticated user:', req.user);
    
    if (req.user?.role !== 'admin') {
      console.error('Unauthorized: User is not admin');
      return res.status(403).json({ error: 'Only admins can create users' });
    }

    const { username, email, password, role, name, assignedCategories } = req.body;

    if (!username || !email || !password || !role) {
      console.error('Missing required fields');
      return res.status(400).json({ error: 'Username, email, password, and role are required' });
    }

    if (role === 'judge' && !name) {
      return res.status(400).json({ error: 'Name is required for judge users' });
    }

    if (password.length < 4) {
      return res.status(400).json({ error: 'Password must be at least 4 characters' });
    }

    // Check if username or email already exists
    const existingUser = await get<User>(
      'SELECT * FROM users WHERE username = ? OR email = ?',
      [username, email]
    );

    if (existingUser) {
      if (existingUser.username === username) {
        return res.status(400).json({ error: 'Username already exists' });
      }
      return res.status(400).json({ error: 'Email already exists' });
    }

    const userId = uuidv4();
    const hashedPassword = await hashPassword(password);

    console.log('Creating user with ID:', userId);
    await run(
      `INSERT INTO users (id, username, email, password, role, createdAt)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [userId, username, email, hashedPassword, role, new Date().toISOString()]
    );
    console.log('User created in database');

    // If role is judge, create judge entry
    if (role === 'judge') {
      const judgeId = uuidv4();
      console.log('Creating judge entry with ID:', judgeId);
      await run(
        `INSERT INTO judges (id, userId, name, assignedCategories)
         VALUES (?, ?, ?, ?)`,
        [judgeId, userId, name, JSON.stringify(assignedCategories || [])]
      );
      console.log('Judge entry created');
    }

    console.log('User creation completed successfully');
    res.status(201).json({ message: 'User created successfully', userId });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
export async function updateUserCredentials(
  req: AuthenticatedRequest,
  res: Response
) {
  try {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can update user credentials' });
    }

    const { userId } = req.params;
    const { username, password } = req.body;

    if (!username && !password) {
      return res.status(400).json({ error: 'Provide username or password to update' });
    }

    // Check if username already exists (if updating username)
    if (username) {
      const existingUser = await get<any>(
        'SELECT id FROM users WHERE username = ? AND id != ?',
        [username, userId]
      );

      if (existingUser) {
        return res.status(400).json({ error: 'Username already exists' });
      }
    }

    // Update username if provided
    if (username) {
      await run('UPDATE users SET username = ? WHERE id = ?', [username, userId]);
      console.log(`Username updated for user ${userId}`);
    }

    // Update password if provided
    if (password) {
      const hashedPassword = await hashPassword(password);
      await run('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, userId]);
      console.log(`Password updated for user ${userId}`);
    }

    res.json({ message: 'User credentials updated successfully' });
  } catch (error) {
    console.error('Update user credentials error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function addJudge(
  req: AuthenticatedRequest,
  res: Response
) {
  try {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can add judges' });
    }

    const { username, password, name, email, assignedCategories } = req.body;

    if (!username || !password || !name || !email) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Check if username or email already exists
    const existingUser = await get<User>(
      'SELECT * FROM users WHERE username = ? OR email = ?',
      [username, email]
    );

    if (existingUser) {
      return res.status(400).json({ error: 'Username or email already exists' });
    }

    const userId = uuidv4();
    const hashedPassword = await hashPassword(password);

    // Create user account
    await run(
      `INSERT INTO users (id, username, email, password, role, createdAt)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [userId, username, email, hashedPassword, 'judge', new Date().toISOString()]
    );

    // Create judge record
    const judgeId = uuidv4();
    await run(
      `INSERT INTO judges (id, userId, name, assignedCategories)
       VALUES (?, ?, ?, ?)`,
      [judgeId, userId, name, JSON.stringify(assignedCategories || [])]
    );

    res.status(201).json({ message: 'Judge added successfully', judgeId });
  } catch (error) {
    console.error('Add judge error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
