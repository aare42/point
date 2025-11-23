import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getToken } from 'next-auth/jwt'

// Nuclear option: Delete all users to allow fresh registration as root admin
export async function POST(request: NextRequest) {
  try {
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET })
    
    if (!token) {
      return NextResponse.json({ error: 'Must be logged in' }, { status: 401 })
    }

    const { confirm } = await request.json()
    if (confirm !== 'DELETE_ALL_USERS_NUCLEAR_OPTION') {
      return NextResponse.json({
        error: 'This is NUCLEAR OPTION! Send { "confirm": "DELETE_ALL_USERS_NUCLEAR_OPTION" } to delete ALL users and start fresh.'
      }, { status: 400 })
    }

    console.log('=== NUCLEAR OPTION: DELETING ALL USERS ===')

    // Get count before deletion
    const userCount = await prisma.user.count()
    console.log('Users to delete:', userCount)

    // Delete all user-related data first (to handle foreign key constraints)
    
    // Delete course enrollments
    await prisma.courseEnrollment.deleteMany({})
    console.log('Deleted all course enrollments')

    // Delete student topics (learning progress)
    await prisma.studentTopic.deleteMany({})
    console.log('Deleted all student topics')

    // Delete goals
    await prisma.goal.deleteMany({})
    console.log('Deleted all goals')

    // Delete goal templates
    await prisma.goalTemplate.deleteMany({})
    console.log('Deleted all goal templates')

    // Delete courses (will cascade to course topics)
    await prisma.course.deleteMany({})
    console.log('Deleted all courses')

    // Delete vacancies (will cascade to vacancy topics)
    await prisma.vacancy.deleteMany({})
    console.log('Deleted all vacancies')

    // Delete topics (will cascade to prerequisites)
    await prisma.topic.deleteMany({})
    console.log('Deleted all topics')

    // Delete sessions and accounts
    await prisma.session.deleteMany({})
    console.log('Deleted all sessions')
    
    await prisma.account.deleteMany({})
    console.log('Deleted all accounts')

    // Finally, delete all users
    await prisma.user.deleteMany({})
    console.log('Deleted all users')

    console.log('=== NUCLEAR RESET COMPLETE ===')

    return NextResponse.json({
      message: 'ALL USERS DELETED! Platform reset. You can now register as the first (root) admin.',
      deletedUsers: userCount,
      instructions: 'Log out, then log back in to become the first admin user with full privileges.'
    })

  } catch (error) {
    console.error('Nuclear reset error:', error)
    return NextResponse.json({
      error: 'Failed to reset users',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}