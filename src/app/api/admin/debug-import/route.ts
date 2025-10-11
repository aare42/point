import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    // Check authentication and admin role
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get database counts
    const counts = {
      topics: await prisma.topic.count(),
      topicPrerequisites: await prisma.topicPrerequisite.count(),
      users: await prisma.user.count(),
      courses: await prisma.course.count(),
      goals: await prisma.goal.count(),
      goalTemplates: await prisma.goalTemplate.count(),
      vacancies: await prisma.vacancy.count(),
      studentTopics: await prisma.studentTopic.count()
    }

    // Get sample topics for verification
    const sampleTopics = await prisma.topic.findMany({
      take: 5,
      select: {
        id: true,
        name: true,
        slug: true,
        type: true,
        authorId: true,
        createdAt: true
      }
    })

    // Check current user
    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        email: true,
        role: true,
        name: true
      }
    })

    // Database info
    const databaseInfo = {
      environment: process.env.NODE_ENV,
      databaseUrl: process.env.DATABASE_URL ? 
        process.env.DATABASE_URL.substring(0, 50) + '...' : 'Not set'
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      databaseInfo,
      counts,
      sampleTopics,
      currentUser,
      session: {
        userId: session.user.id,
        userEmail: session.user.email,
        userRole: session.user.role
      }
    })

  } catch (error) {
    console.error('Debug error:', error)
    return NextResponse.json({
      success: false,
      error: `Debug failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}