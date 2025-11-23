import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { UserRole } from '@prisma/client'
import { prisma } from '@/lib/prisma'

export async function withAuth(
  req: NextRequest,
  requiredRoles: UserRole[] = ['USER']
) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (requiredRoles.length > 0 && !requiredRoles.includes(token.role as UserRole)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    return token
  } catch (error) {
    console.error('Auth middleware error:', error)
    return NextResponse.json({ error: 'Authentication failed' }, { status: 401 })
  }
}

export async function isRootAdmin(userId: string): Promise<boolean> {
  try {
    // Get the first admin user (root admin)
    const firstAdmin = await prisma.user.findFirst({
      where: { role: 'ADMIN' },
      orderBy: { createdAt: 'asc' }
    })
    
    return firstAdmin?.id === userId
  } catch (error) {
    console.error('Root admin check error:', error)
    return false
  }
}

export async function withRootAdminAuth(req: NextRequest) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (token.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const isRoot = await isRootAdmin(token.sub!)
    if (!isRoot) {
      return NextResponse.json({ error: 'Root admin access required' }, { status: 403 })
    }

    return token
  } catch (error) {
    console.error('Root admin auth error:', error)
    return NextResponse.json({ error: 'Authentication failed' }, { status: 401 })
  }
}