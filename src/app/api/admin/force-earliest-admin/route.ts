import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getToken } from 'next-auth/jwt'

// Force current user to be the earliest admin (simplest solution)
export async function POST(request: NextRequest) {
  try {
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET })
    
    if (!token) {
      return NextResponse.json({ error: 'Must be logged in' }, { status: 401 })
    }

    const { confirm } = await request.json()
    if (confirm !== 'FORCE_EARLIEST_ADMIN') {
      return NextResponse.json({
        error: 'Send { "confirm": "FORCE_EARLIEST_ADMIN" }'
      }, { status: 400 })
    }

    console.log('=== FORCING CURRENT USER TO BE EARLIEST ADMIN ===')

    // Get current user
    const currentUser = await prisma.user.findUnique({
      where: { id: token.sub! }
    })

    if (!currentUser) {
      return NextResponse.json({ error: 'Current user not found' }, { status: 404 })
    }

    // Get all other admin users
    const otherAdmins = await prisma.user.findMany({
      where: { 
        role: 'ADMIN',
        id: { not: currentUser.id }
      },
      orderBy: { createdAt: 'asc' }
    })

    console.log('Other admins:', otherAdmins.map(u => u.email))

    // Set current user's creation date to be way earlier than anyone else
    const veryEarlyDate = new Date('2020-01-01T00:00:00Z')
    
    const updatedUser = await prisma.user.update({
      where: { id: currentUser.id },
      data: { 
        role: 'ADMIN', // Ensure admin role
        createdAt: veryEarlyDate
      }
    })

    // Verify root admin status
    const rootCheck = await prisma.user.findFirst({
      where: { role: 'ADMIN' },
      orderBy: { createdAt: 'asc' }
    })

    const isRootAdmin = rootCheck?.id === currentUser.id

    console.log('Root admin check:', isRootAdmin, rootCheck?.email)

    return NextResponse.json({
      message: isRootAdmin ? 'Successfully made current user the root admin' : 'Updated user but root admin status uncertain',
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        role: updatedUser.role,
        createdAt: updatedUser.createdAt
      },
      isRootAdmin,
      otherAdmins: otherAdmins.map(u => ({ email: u.email, createdAt: u.createdAt }))
    })

  } catch (error) {
    console.error('Force earliest admin error:', error)
    return NextResponse.json({
      error: 'Failed to force earliest admin status',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}