import { NextRequest, NextResponse } from 'next/server';
import { getUsers, createUser } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// GET handler - Fetch all users
export async function GET(request: NextRequest) {
  try {
    // Verify admin authorization
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user || !session.user.isAdmin) {
      return NextResponse.json(
        { message: 'Unauthorized: Admin access required' }, 
        { status: 403 }
      );
    }
    
    // Fetch users from database
    const users = await getUsers();
    
    return NextResponse.json({ users });
  } catch (error: any) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { message: error.message || 'Failed to fetch users' }, 
      { status: 500 }
    );
  }
}

// POST handler - Create a new user
export async function POST(request: NextRequest) {
  try {
    // Verify admin authorization
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user || !session.user.isAdmin) {
      return NextResponse.json(
        { message: 'Unauthorized: Admin access required' }, 
        { status: 403 }
      );
    }
    
    // Parse request body
    const { username, email, password, isAdmin } = await request.json();
    
    // Validate required fields
    if (!username || !email || !password) {
      return NextResponse.json(
        { message: 'Missing required fields: username, email, and password are required' },
        { status: 400 }
      );
    }
    
    // Create user in database
    const newUser = await createUser({
      username,
      email,
      password,
      isAdmin: Boolean(isAdmin)
    });
    
    // Return the new user without password
    return NextResponse.json({ user: newUser }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating user:', error);
    return NextResponse.json(
      { message: error.message || 'Failed to create user' }, 
      { status: 500 }
    );
  }
}