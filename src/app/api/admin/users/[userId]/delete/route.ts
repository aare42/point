import { NextRequest, NextResponse } from 'next/server'
import { withRootAdminAuth } from '@/lib/auth/middleware'
import { prisma } from '@/lib/prisma'

export async function DELETE(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  const authResult = await withRootAdminAuth(request)
  if (authResult instanceof NextResponse) {
    return authResult
  }

  try {
    const { userId } = params

    // Prevent deleting the root admin themselves
    if (userId === authResult.sub) {
      return NextResponse.json(
        { error: 'Cannot delete yourself' },
        { status: 400 }
      )
    }

    // Get user data before deletion for response
    const userToDelete = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true
      }
    })

    if (!userToDelete) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Delete the user - Prisma cascade will handle related data
    // (courses, goals, topics, etc. will be deleted automatically)
    await prisma.user.delete({
      where: { id: userId }
    })

    return NextResponse.json({
      message: 'User and all their content deleted successfully',
      deletedUser: userToDelete
    })

  } catch (error) {
    console.error('Delete user error:', error)
    return NextResponse.json(
      { error: 'Failed to delete user' },
      { status: 500 }
    )
  }
}