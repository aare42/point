import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getToken } from 'next-auth/jwt'

// Force current user to be root admin regardless of existing admins
export async function POST(request: NextRequest) {
  try {
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET })
    
    if (!token) {
      return NextResponse.json({ error: 'Must be logged in' }, { status: 401 })
    }

    const { confirm, targetEmail } = await request.json()
    if (confirm !== 'FORCE_ROOT_ADMIN' || !targetEmail) {
      return NextResponse.json({
        error: 'Send { "confirm": "FORCE_ROOT_ADMIN", "targetEmail": "your-email@domain.com" }'
      }, { status: 400 })
    }

    console.log('=== FORCING ROOT ADMIN STATUS ===')

    // Find the target user (should be current user)
    const targetUser = await prisma.user.findUnique({
      where: { email: targetEmail }
    })

    if (!targetUser) {
      return NextResponse.json({
        error: `User ${targetEmail} not found`
      }, { status: 404 })
    }

    // Get the earliest creation time of any existing admin
    const earliestAdmin = await prisma.user.findFirst({
      where: { role: 'ADMIN' },
      orderBy: { createdAt: 'asc' }
    })

    const newCreatedAt = earliestAdmin 
      ? new Date(earliestAdmin.createdAt.getTime() - 24 * 60 * 60 * 1000) // 1 day earlier
      : new Date() // If no admins exist, use current time

    // Promote target user to admin and make them earliest created
    const updatedUser = await prisma.user.update({
      where: { id: targetUser.id },
      data: { 
        role: 'ADMIN',
        createdAt: newCreatedAt
      }
    })

    // Get current admin count
    const adminCount = await prisma.user.count({
      where: { role: 'ADMIN' }
    })

    return NextResponse.json({
      message: `Successfully made ${targetEmail} the root admin`,
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        role: updatedUser.role,
        createdAt: updatedUser.createdAt
      },
      totalAdmins: adminCount,
      note: 'This user is now guaranteed to be the root admin (earliest created)'
    })

  } catch (error) {
    console.error('Force root admin error:', error)
    return NextResponse.json({
      error: 'Failed to force root admin status',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}