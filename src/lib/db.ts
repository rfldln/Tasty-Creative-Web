import { sql } from '@vercel/postgres';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';

// Interface for User type
export interface User {
  id: string;
  username: string;
  email: string;
  password?: string; // Optional because we don't always want to return this
  isAdmin: boolean;
  createdAt: string;
}

// Initialize database by ensuring tables exist
export async function initDb() {
  try {
    // Create users table if it doesn't exist
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY,
        username VARCHAR(255) NOT NULL UNIQUE,
        email VARCHAR(255) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        is_admin BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;

    console.log('Database initialized');
    
    // Check if admin user exists, create default admin if not
    const adminCheck = await sql`SELECT * FROM users WHERE is_admin = TRUE LIMIT 1`;
    
    // Use optional chaining to safely access rowCount
    if (adminCheck?.rowCount === 0) {
      // Create default admin user (make sure to change the password in production!)
      const adminId = uuidv4();
      const hashedPassword = await bcrypt.hash('admin123', 10);
      
      await sql`
        INSERT INTO users (id, username, email, password, is_admin)
        VALUES (${adminId}, 'admin', 'admin@example.com', ${hashedPassword}, TRUE)
      `;
      
      console.log('Default admin user created');
    }
    
    return { success: true };
  } catch (error) {
    console.error('Database initialization error:', error);
    return { success: false, error };
  }
}

// Get all users
export async function getUsers(): Promise<User[]> {
  try {
    const result = await sql`
      SELECT id, username, email, is_admin as "isAdmin", created_at as "createdAt"
      FROM users
      ORDER BY created_at DESC
    `;
    
    return result.rows as User[];
  } catch (error) {
    console.error('Error fetching users:', error);
    throw new Error('Failed to fetch users');
  }
}

// Get user by username (for login)
export async function getUserByUsername(username: string): Promise<User | null> {
  try {
    const result = await sql`
      SELECT id, username, email, password, is_admin as "isAdmin", created_at as "createdAt"
      FROM users
      WHERE username = ${username}
    `;
    
    return result.rows[0] as User || null;
  } catch (error) {
    console.error('Error fetching user by username:', error);
    throw new Error('Failed to fetch user');
  }
}

// Get user by email (for checking duplicates)
export async function getUserByEmail(email: string): Promise<User | null> {
  try {
    const result = await sql`
      SELECT id, username, email, is_admin as "isAdmin", created_at as "createdAt"
      FROM users
      WHERE email = ${email}
    `;
    
    return result.rows[0] as User || null;
  } catch (error) {
    console.error('Error fetching user by email:', error);
    throw new Error('Failed to fetch user');
  }
}

// Create new user
export async function createUser(userData: {
  username: string;
  email: string;
  password: string;
  isAdmin: boolean;
}): Promise<User> {
  try {
    // Check if username exists
    const existingUsername = await getUserByUsername(userData.username);
    if (existingUsername) {
      throw new Error('Username already exists');
    }
    
    // Check if email exists
    const existingEmail = await getUserByEmail(userData.email);
    if (existingEmail) {
      throw new Error('Email already exists');
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(userData.password, 10);
    
    // Generate UUID
    const userId = uuidv4();
    
    // Insert new user
    const result = await sql`
      INSERT INTO users (id, username, email, password, is_admin)
      VALUES (${userId}, ${userData.username}, ${userData.email}, ${hashedPassword}, ${userData.isAdmin})
      RETURNING id, username, email, is_admin as "isAdmin", created_at as "createdAt"
    `;
    
    return result.rows[0] as User;
  } catch (error: any) {
    console.error('Error creating user:', error);
    throw new Error(error.message || 'Failed to create user');
  }
}

// Delete user
export async function deleteUser(userId: string): Promise<boolean> {
  try {
    // Make sure we're not deleting the last admin
    const adminCheck = await sql`SELECT COUNT(*) FROM users WHERE is_admin = TRUE`;
    const userToDelete = await sql`SELECT is_admin FROM users WHERE id = ${userId}`;
    
    if (
      adminCheck.rows[0]?.count <= 1 && 
      userToDelete.rows[0] && 
      userToDelete.rows[0].is_admin
    ) {
      throw new Error('Cannot delete the last admin user');
    }
    
    const result = await sql`
      DELETE FROM users
      WHERE id = ${userId}
      RETURNING id
    `;
    
    // Use nullish coalescing to provide a default value if rowCount is null
    return (result?.rowCount ?? 0) > 0;
  } catch (error: any) {
    console.error('Error deleting user:', error);
    throw new Error(error.message || 'Failed to delete user');
  }
}

// Verify user login
export async function verifyUser(username: string, password: string): Promise<User | null> {
  try {
    const user = await getUserByUsername(username);
    
    if (!user || !user.password) {
      return null;
    }
    
    const passwordMatch = await bcrypt.compare(password, user.password);
    
    if (!passwordMatch) {
      return null;
    }
    
    // Don't return the password
    const { password: _, ...userWithoutPassword } = user;
    
    return userWithoutPassword;
  } catch (error) {
    console.error('Error verifying user:', error);
    throw new Error('Failed to verify user');
  }
}