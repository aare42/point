import { NextRequest, NextResponse } from 'next/server'
import { withRootAdminAuth } from '@/lib/auth/middleware'
import { prisma } from '@/lib/prisma'

export async function POST(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  const authResult = await withRootAdminAuth(request)
  if (authResult instanceof NextResponse) {
    return authResult
  }

  try {
    const { userId } = params

    // Prevent blocking the root admin themselves
    if (userId === authResult.sub) {
      return NextResponse.json(
        { error: 'Cannot block yourself' },
        { status: 400 }
      )
    }

    // Block the user
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { isBlocked: true },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isBlocked: true,
        createdAt: true
      }
    })

    return NextResponse.json({
      message: 'User blocked successfully',
      user: updatedUser
    })

  } catch (error) {
    console.error('Block user error:', error)
    return NextResponse.json(
      { error: 'Failed to block user' },
      { status: 500 }
    )
  }
}

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

    // Prevent unblocking the root admin themselves
    if (userId === authResult.sub) {
      return NextResponse.json(
        { error: 'Cannot modify your own block status' },
        { status: 400 }
      )
    }

    // Unblock the user
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { isBlocked: false },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isBlocked: true,
        createdAt: true
      }
    })

    return NextResponse.json({
      message: 'User unblocked successfully',
      user: updatedUser
    })

  } catch (error) {
    console.error('Unblock user error:', error)
    return NextResponse.json(
      { error: 'Failed to unblock user' },
      { status: 500 }
    )
  }
}