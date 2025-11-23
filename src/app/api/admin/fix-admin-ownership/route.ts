import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getToken } from 'next-auth/jwt'

// Script to fix admin ownership when real user lost admin status
export async function POST(request: NextRequest) {
  try {
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET })
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Safety check: only allow if explicitly requested
    const { confirm, targetEmail } = await request.json()
    if (confirm !== 'PROMOTE_REAL_ADMIN' || !targetEmail) {
      return NextResponse.json({
        error: 'Send { "confirm": "PROMOTE_REAL_ADMIN", "targetEmail": "your-email@domain.com" } to proceed.'
      }, { status: 400 })
    }

    console.log('=== FIXING ADMIN OWNERSHIP ===')

    // Find the fake system admin
    const systemAdmin = await prisma.user.findFirst({
      where: { 
        OR: [
          { email: 'system@point.edu' },
          { email: { contains: 'system' } },
          { role: 'ADMIN' }
        ]
      },
      include: {
        _count: {
          select: {
            authoredTopics: true,
            goals: true,
            educatedCourses: true,
            enrollments: true,
            authoredVacancies: true,
            goalTemplates: true
          }
        }
      }
    })

    // Find the real user
    const realUser = await prisma.user.findUnique({
      where: { email: targetEmail }
    })

    if (!realUser) {
      return NextResponse.json({
        error: `User with email ${targetEmail} not found`
      }, { status: 404 })
    }

    if (!systemAdmin) {
      return NextResponse.json({
        error: 'No system admin found to transfer from'
      }, { status: 404 })
    }

    console.log('System Admin found:', systemAdmin.email)
    console.log('Real User found:', realUser.email)

    // Transfer all content from system admin to real user
    const transferResults = {
      topics: 0,
      courses: 0,
      goals: 0,
      goalTemplates: 0,
      vacancies: 0
    }

    // Transfer authored topics
    const topicUpdate = await prisma.topic.updateMany({
      where: { authorId: systemAdmin.id },
      data: { authorId: realUser.id }
    })
    transferResults.topics = topicUpdate.count

    // Transfer courses
    const courseUpdate = await prisma.course.updateMany({
      where: { educatorId: systemAdmin.id },
      data: { educatorId: realUser.id }
    })
    transferResults.courses = courseUpdate.count

    // Transfer goals
    const goalUpdate = await prisma.goal.updateMany({
      where: { userId: systemAdmin.id },
      data: { userId: realUser.id }
    })
    transferResults.goals = goalUpdate.count

    // Transfer goal templates
    const goalTemplateUpdate = await prisma.goalTemplate.updateMany({
      where: { authorId: systemAdmin.id },
      data: { authorId: realUser.id }
    })
    transferResults.goalTemplates = goalTemplateUpdate.count

    // Transfer vacancies
    const vacancyUpdate = await prisma.vacancy.updateMany({
      where: { authorId: systemAdmin.id },
      data: { authorId: realUser.id }
    })
    transferResults.vacancies = vacancyUpdate.count

    // Promote real user to admin and set as earliest created
    const updatedRealUser = await prisma.user.update({
      where: { id: realUser.id },
      data: { 
        role: 'ADMIN',
        createdAt: new Date(systemAdmin.createdAt.getTime() - 1000) // 1 second earlier
      }
    })

    // Delete system admin user
    await prisma.user.delete({
      where: { id: systemAdmin.id }
    })

    console.log('=== ADMIN OWNERSHIP FIX COMPLETED ===')

    return NextResponse.json({
      message: 'Admin ownership fixed successfully',
      actions: {
        deletedSystemAdmin: {
          id: systemAdmin.id,
          email: systemAdmin.email
        },
        promotedRealUser: {
          id: updatedRealUser.id,
          email: updatedRealUser.email,
          role: updatedRealUser.role
        },
        contentTransferred: transferResults
      }
    })

  } catch (error) {
    console.error('Fix admin ownership error:', error)
    return NextResponse.json({
      error: 'Failed to fix admin ownership',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}