import { NextRequest, NextResponse } from 'next/server';
import { deleteUser } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// DELETE handler - Delete a user by ID
export async function DELETE(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    // Verify admin authorization
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user || !session.user.isAdmin) {
      return NextResponse.json(
        { message: 'Unauthorized: Admin access required' }, 
        { status: 403 }
      );
    }
    
    const { userId } = params;
    
    if (!userId) {
      return NextResponse.json(
        { message: 'User ID is required' },
        { status: 400 }
      );
    }
    
    // Delete user from database
    const success = await deleteUser(userId);
    
    if (!success) {
      return NextResponse.json(
        { message: 'User not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ message: 'User deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting user:', error);
    return NextResponse.json(
      { message: error.message || 'Failed to delete user' }, 
      { status: 500 }
    );
  }
}