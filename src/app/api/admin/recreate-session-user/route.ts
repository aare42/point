import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getToken } from 'next-auth/jwt'

// Recreate user in database from session data when user is missing
export async function POST(request: NextRequest) {
  try {
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET })
    
    if (!token || !token.sub || !token.email) {
      return NextResponse.json({ error: 'Must be logged in with valid session' }, { status: 401 })
    }

    const { confirm } = await request.json()
    if (confirm !== 'RECREATE_SESSION_USER') {
      return NextResponse.json({
        error: 'Send { "confirm": "RECREATE_SESSION_USER" }'
      }, { status: 400 })
    }

    console.log('=== RECREATING USER FROM SESSION ===')
    console.log('Session data:', {
      id: token.sub,
      email: token.email,
      name: token.name,
      role: token.role,
      image: token.picture
    })

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { id: token.sub }
    })

    if (existingUser) {
      return NextResponse.json({
        message: 'User already exists in database',
        user: existingUser
      })
    }

    // Get earliest admin creation time to make this user root admin
    const earliestAdmin = await prisma.user.findFirst({
      where: { role: 'ADMIN' },
      orderBy: { createdAt: 'asc' }
    })

    const rootAdminDate = earliestAdmin 
      ? new Date(earliestAdmin.createdAt.getTime() - 24 * 60 * 60 * 1000) // 1 day earlier
      : new Date('2020-01-01') // Very early date

    // Create user in database with session data
    const newUser = await prisma.user.create({
      data: {
        id: token.sub,
        email: token.email!,
        name: token.name || null,
        image: token.picture || null,
        role: 'ADMIN', // Make them admin since session shows ADMIN
        emailVerified: new Date(), // Mark as verified since they're already logged in
        createdAt: rootAdminDate, // Make them root admin
        updatedAt: new Date()
      }
    })

    console.log('Created user:', newUser)

    // Verify they're now the root admin
    const rootCheck = await prisma.user.findFirst({
      where: { role: 'ADMIN' },
      orderBy: { createdAt: 'asc' }
    })

    const isRootAdmin = rootCheck?.id === newUser.id

    return NextResponse.json({
      message: 'Successfully recreated user in database',
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        role: newUser.role,
        createdAt: newUser.createdAt
      },
      isRootAdmin,
      previouslyMissing: true
    })

  } catch (error) {
    console.error('Recreate session user error:', error)
    return NextResponse.json({
      error: 'Failed to recreate user in database',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}