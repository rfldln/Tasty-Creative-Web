import { NextResponse } from 'next/server';
import { deleteUser } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function DELETE(
  request: Request,
): Promise<Response> {
  try {
    // Extract userId from the URL
    const url = new URL(request.url);
    const userId = url.pathname.split('/').pop();
    
    if (!userId) {
      return NextResponse.json(
        { message: 'User ID is required' },
        { status: 400 }
      );
    }
    
    // Verify admin authorization
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.isAdmin) {
      return NextResponse.json(
        { message: 'Unauthorized: Admin access required' }, 
        { status: 403 }
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