import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { UserRole } from '@prisma/client'

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