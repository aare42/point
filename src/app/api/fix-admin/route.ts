import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// One-time fix to remove System Admin and restore proper admin access
export async function POST(request: NextRequest) {
  try {
    console.log('🔧 Starting admin access fix...')
    
    // Remove any "System Admin" users (created by seeding)
    const deletedSystemAdmins = await prisma.user.deleteMany({
      where: {
        OR: [
          { name: 'System Admin' },
          { email: 'admin@system.local' }
        ]
      }
    })
    
    console.log(`🗑️ Removed ${deletedSystemAdmins.count} system admin users`)
    
    // Ensure your email has a user record and admin rights
    const yourEmail = 'pawlovtaras@gmail.com'
    
    // Find or create your user record
    let yourUser = await prisma.user.findUnique({
      where: { email: yourEmail }
    })
    
    if (!yourUser) {
      // Create your user if it doesn't exist
      yourUser = await prisma.user.create({
        data: {
          email: yourEmail,
          name: 'Taras Pavlov',
          role: 'ADMIN',
          emailVerified: new Date(),
          createdAt: new Date('2020-01-01') // Ensure root admin status
        }
      })
      console.log('👤 Created your admin user')
    } else {
      // Update existing user to be admin
      yourUser = await prisma.user.update({
        where: { id: yourUser.id },
        data: {
          role: 'ADMIN',
          createdAt: new Date('2020-01-01') // Ensure root admin status
        }
      })
      console.log('⬆️ Updated your user to admin')
    }
    
    // Check final admin status
    const allAdmins = await prisma.user.findMany({
      where: { role: 'ADMIN' },
      select: { id: true, email: true, name: true, createdAt: true },
      orderBy: { createdAt: 'asc' }
    })
    
    const rootAdmin = allAdmins[0]
    const isYouRootAdmin = rootAdmin?.email === yourEmail
    
    console.log('✅ Admin fix completed')
    console.log('Root admin:', rootAdmin?.email)
    console.log('You are root admin:', isYouRootAdmin)
    
    return NextResponse.json({
      message: 'Admin access fixed successfully',
      removedSystemAdmins: deletedSystemAdmins.count,
      yourUser: {
        id: yourUser.id,
        email: yourUser.email,
        role: yourUser.role
      },
      rootAdmin: rootAdmin?.email,
      youAreRootAdmin: isYouRootAdmin,
      totalAdmins: allAdmins.length
    })
    
  } catch (error) {
    console.error('Fix admin error:', error)
    return NextResponse.json({
      error: 'Failed to fix admin access',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}