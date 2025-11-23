import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { prisma } from '@/lib/prisma'

// One-time script to fix dual admin issue
export async function POST(request: NextRequest) {
  try {
    // Verify admin access
    const authResult = await withAuth(request, ['ADMIN'])
    if (authResult instanceof NextResponse) {
      return authResult
    }

    // Safety check: only allow if explicitly requested
    const { confirm } = await request.json()
    if (confirm !== 'FIX_DUAL_ADMIN_ISSUE') {
      return NextResponse.json({
        error: 'This is a dangerous operation. Send { "confirm": "FIX_DUAL_ADMIN_ISSUE" } to proceed.'
      }, { status: 400 })
    }

    console.log('=== STARTING DUAL ADMIN FIX ===')

    // Step 1: Find all admin users
    const adminUsers = await prisma.user.findMany({
      where: { role: 'ADMIN' },
      orderBy: { createdAt: 'asc' },
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

    if (adminUsers.length <= 1) {
      return NextResponse.json({
        message: 'No dual admin issue found',
        adminUsers: adminUsers.length
      })
    }

    console.log(`Found ${adminUsers.length} admin users`)

    // Step 2: Identify which is "System admin" and which is the real user
    const systemAdmin = adminUsers.find(user => 
      user.name?.toLowerCase().includes('system') ||
      user.email?.toLowerCase().includes('system') ||
      user.name === 'System admin'
    )

    const realUser = adminUsers.find(user => 
      user.id === authResult.sub || // Current user
      (!user.name?.toLowerCase().includes('system') && !user.email?.toLowerCase().includes('system'))
    )

    if (!systemAdmin || !realUser) {
      return NextResponse.json({
        error: 'Could not identify system admin and real user',
        adminUsers: adminUsers.map(u => ({ 
          id: u.id, 
          name: u.name, 
          email: u.email,
          createdAt: u.createdAt 
        }))
      }, { status: 400 })
    }

    console.log('System Admin:', systemAdmin.email)
    console.log('Real User:', realUser.email)

    // Step 3: Transfer all content from system admin to real user
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

    // Step 4: Update real user's creation date to be earliest (make them root admin)
    await prisma.user.update({
      where: { id: realUser.id },
      data: { 
        createdAt: new Date(Math.min(
          systemAdmin.createdAt.getTime(),
          realUser.createdAt.getTime()
        ) - 1000) // 1 second earlier to ensure they're first
      }
    })

    // Step 5: Delete system admin user
    await prisma.user.delete({
      where: { id: systemAdmin.id }
    })

    console.log('=== DUAL ADMIN FIX COMPLETED ===')

    return NextResponse.json({
      message: 'Dual admin issue fixed successfully',
      actions: {
        deletedUser: {
          id: systemAdmin.id,
          name: systemAdmin.name,
          email: systemAdmin.email
        },
        newRootAdmin: {
          id: realUser.id,
          name: realUser.name,
          email: realUser.email
        },
        contentTransferred: transferResults
      }
    })

  } catch (error) {
    console.error('Fix dual admin error:', error)
    return NextResponse.json({
      error: 'Failed to fix dual admin issue',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}