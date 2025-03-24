import { NextResponse } from 'next/server';
import { deleteUser } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// Option 1: Try this version first
export async function DELETE(
  _request: Request, // Underscore prefix indicates unused parameter
  { params }: { params: { userId: string } }
) {
  try {
    // Verify admin authorization
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.isAdmin) {
      return NextResponse.json(
        { message: 'Unauthorized: Admin access required' }, 
        { status: 403 }
      );
    }
    
    // Delete user from database
    const success = await deleteUser(params.userId);
    
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