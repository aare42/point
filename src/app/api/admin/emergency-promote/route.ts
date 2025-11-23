import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getToken } from 'next-auth/jwt'

// Emergency endpoint to promote a user to admin when no admins exist
export async function POST(request: NextRequest) {
  try {
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET })
    
    if (!token) {
      return NextResponse.json({ error: 'Must be logged in' }, { status: 401 })
    }

    // Check if there are any existing admins
    const existingAdmins = await prisma.user.count({
      where: { role: 'ADMIN' }
    })

    if (existingAdmins > 0) {
      return NextResponse.json({
        error: 'Admins already exist. This endpoint only works when no admins exist.'
      }, { status: 403 })
    }

    // Get the current user
    const currentUser = await prisma.user.findUnique({
      where: { id: token.sub! }
    })

    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Promote current user to admin
    const promotedUser = await prisma.user.update({
      where: { id: token.sub! },
      data: { role: 'ADMIN' }
    })

    return NextResponse.json({
      message: 'Successfully promoted to admin',
      user: {
        id: promotedUser.id,
        email: promotedUser.email,
        role: promotedUser.role
      }
    })

  } catch (error) {
    console.error('Emergency promotion error:', error)
    return NextResponse.json({
      error: 'Failed to promote user',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}