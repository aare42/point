import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if there are already any admin users
    const existingAdmins = await prisma.user.findMany({
      where: { role: 'ADMIN' }
    })

    if (existingAdmins.length > 0) {
      return NextResponse.json({ 
        error: 'Admin already exists. Only the first user can promote themselves.' 
      }, { status: 403 })
    }

    // Promote current user to admin
    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: { role: 'ADMIN' },
      select: { id: true, email: true, name: true, role: true }
    })

    return NextResponse.json({
      message: 'Successfully promoted to admin',
      user: updatedUser
    })

  } catch (error) {
    console.error('Admin promotion error:', error)
    return NextResponse.json(
      { error: 'Failed to promote to admin' },
      { status: 500 }
    )
  }
}