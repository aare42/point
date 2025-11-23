import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getToken } from 'next-auth/jwt'

// Fix current authenticated user to be root admin
export async function POST(request: NextRequest) {
  try {
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET })
    
    if (!token || !token.sub) {
      return NextResponse.json({ error: 'Must be logged in' }, { status: 401 })
    }

    const { confirm } = await request.json()
    if (confirm !== 'FIX_CURRENT_USER_ROOT') {
      return NextResponse.json({
        error: 'Send { "confirm": "FIX_CURRENT_USER_ROOT" }'
      }, { status: 400 })
    }

    console.log('=== FIXING CURRENT USER AS ROOT ADMIN ===')
    console.log('Token user ID:', token.sub)
    console.log('Token email:', token.email)

    // Find current user by ID from token
    const currentUser = await prisma.user.findUnique({
      where: { id: token.sub }
    })

    console.log('Found user in database:', currentUser ? 'YES' : 'NO')

    if (!currentUser) {
      return NextResponse.json({
        error: `User with ID ${token.sub} not found in database`,
        tokenInfo: {
          id: token.sub,
          email: token.email,
          role: token.role
        }
      }, { status: 404 })
    }

    // Get the earliest creation time of any existing admin
    const earliestAdmin = await prisma.user.findFirst({
      where: { 
        role: 'ADMIN',
        id: { not: currentUser.id } // Exclude current user
      },
      orderBy: { createdAt: 'asc' }
    })

    console.log('Earliest other admin:', earliestAdmin?.email)

    const newCreatedAt = earliestAdmin 
      ? new Date(earliestAdmin.createdAt.getTime() - 24 * 60 * 60 * 1000) // 1 day earlier
      : new Date('2020-01-01') // Very early date if no other admins

    // Update current user to be root admin
    const updatedUser = await prisma.user.update({
      where: { id: currentUser.id },
      data: { 
        role: 'ADMIN',
        createdAt: newCreatedAt
      }
    })

    console.log('Updated user:', updatedUser.email, 'createdAt:', updatedUser.createdAt)

    // Verify root admin status
    const rootCheck = await prisma.user.findFirst({
      where: { role: 'ADMIN' },
      orderBy: { createdAt: 'asc' }
    })

    const isNowRoot = rootCheck?.id === currentUser.id

    return NextResponse.json({
      message: 'Successfully updated current user to root admin',
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        role: updatedUser.role,
        createdAt: updatedUser.createdAt
      },
      isNowRootAdmin: isNowRoot,
      debug: {
        tokenUserId: token.sub,
        foundInDb: true,
        earliestAdminBefore: earliestAdmin?.email || 'none'
      }
    })

  } catch (error) {
    console.error('Fix current user root error:', error)
    return NextResponse.json({
      error: 'Failed to fix current user as root admin',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}