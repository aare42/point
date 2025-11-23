import { NextRequest, NextResponse } from 'next/server'
import { withRootAdminAuth } from '@/lib/auth/middleware'
import { prisma } from '@/lib/prisma'

// Automatically find and delete system admin user
export async function POST(request: NextRequest) {
  const authResult = await withRootAdminAuth(request)
  if (authResult instanceof NextResponse) {
    return authResult
  }

  try {
    const { confirm } = await request.json()
    if (confirm !== 'AUTO_DELETE_SYSTEM_ADMIN') {
      return NextResponse.json({
        error: 'Send { "confirm": "AUTO_DELETE_SYSTEM_ADMIN" }'
      }, { status: 400 })
    }

    // Find current user (the one making the request)
    const currentUser = await prisma.user.findUnique({
      where: { id: authResult.sub }
    })

    if (!currentUser) {
      return NextResponse.json({ error: 'Current user not found' }, { status: 404 })
    }

    // Find system admin user
    const systemAdmin = await prisma.user.findFirst({
      where: {
        OR: [
          { email: { contains: 'system' } },
          { name: { contains: 'System' } },
          { email: 'system@point.edu' }
        ],
        id: { not: currentUser.id } // Make sure we don't delete ourselves
      }
    })

    if (!systemAdmin) {
      return NextResponse.json({
        message: 'No system admin found to delete',
        currentUser: currentUser.email
      })
    }

    console.log('Found system admin:', systemAdmin.email)
    console.log('Current user:', currentUser.email)

    // Transfer all content from system admin to current user
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
      data: { authorId: currentUser.id }
    })
    transferResults.topics = topicUpdate.count

    // Transfer courses
    const courseUpdate = await prisma.course.updateMany({
      where: { educatorId: systemAdmin.id },
      data: { educatorId: currentUser.id }
    })
    transferResults.courses = courseUpdate.count

    // Transfer goals
    const goalUpdate = await prisma.goal.updateMany({
      where: { userId: systemAdmin.id },
      data: { userId: currentUser.id }
    })
    transferResults.goals = goalUpdate.count

    // Transfer goal templates
    const goalTemplateUpdate = await prisma.goalTemplate.updateMany({
      where: { authorId: systemAdmin.id },
      data: { authorId: currentUser.id }
    })
    transferResults.goalTemplates = goalTemplateUpdate.count

    // Transfer vacancies
    const vacancyUpdate = await prisma.vacancy.updateMany({
      where: { authorId: systemAdmin.id },
      data: { authorId: currentUser.id }
    })
    transferResults.vacancies = vacancyUpdate.count

    // Delete system admin's vacancies first (to avoid constraint errors)
    await prisma.vacancy.deleteMany({
      where: { authorId: systemAdmin.id }
    })

    // Now safely delete the system admin
    await prisma.user.delete({
      where: { id: systemAdmin.id }
    })

    return NextResponse.json({
      message: 'System admin automatically deleted successfully',
      deletedUser: {
        id: systemAdmin.id,
        email: systemAdmin.email,
        name: systemAdmin.name
      },
      contentTransferred: transferResults,
      remainingUser: currentUser.email
    })

  } catch (error) {
    console.error('Auto delete system admin error:', error)
    return NextResponse.json({
      error: 'Failed to auto delete system admin',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}