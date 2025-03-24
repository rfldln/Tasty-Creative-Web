// Run this script with: node scripts/reset-admin.js
import { sql } from '@vercel/postgres';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

async function resetAdmin() {
  try {
    console.log('Connecting to database...');
    
    // First, try to drop the existing users table (optional - be careful!)
    try {
      await sql`DROP TABLE IF EXISTS users;`;
      console.log('Dropped existing users table');
    } catch (error) {
      console.error('Error dropping table:', error);
    }
    
    // Create the users table with the correct schema
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY,
        username VARCHAR(255) NOT NULL UNIQUE,
        full_name VARCHAR(255) NOT NULL,
        password VARCHAR(255) NOT NULL,
        is_admin BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;
    console.log('Created users table');
    
    // Create admin user
    const adminId = uuidv4();
    const hashedPassword = await bcrypt.hash('admin123', 10);
    
    await sql`
      INSERT INTO users (id, username, full_name, password, is_admin)
      VALUES (${adminId}, 'admin', 'Administrator', ${hashedPassword}, TRUE)
    `;
    
    console.log('Created admin user:');
    console.log('Username: admin');
    console.log('Password: admin123');
    
    // Verify the admin user was created
    const result = await sql`SELECT * FROM users WHERE username = 'admin'`;
    console.log('Admin user in database:', result.rows[0]);
    
    console.log('Reset complete!');
  } catch (error) {
    console.error('Error resetting admin:', error);
  } finally {
    process.exit(0);
  }
}

resetAdmin();