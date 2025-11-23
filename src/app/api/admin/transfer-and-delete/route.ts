import { NextRequest, NextResponse } from 'next/server'
import { withRootAdminAuth } from '@/lib/auth/middleware'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  const authResult = await withRootAdminAuth(request)
  if (authResult instanceof NextResponse) {
    return authResult
  }

  try {
    const { fromUserId, toUserId, confirm } = await request.json()
    
    if (confirm !== 'TRANSFER_AND_DELETE' || !fromUserId || !toUserId) {
      return NextResponse.json({
        error: 'Send { "confirm": "TRANSFER_AND_DELETE", "fromUserId": "id", "toUserId": "id" }'
      }, { status: 400 })
    }

    // Prevent deleting yourself
    if (fromUserId === authResult.sub) {
      return NextResponse.json(
        { error: 'Cannot delete yourself' },
        { status: 400 }
      )
    }

    console.log('=== TRANSFER AND DELETE USER ===')

    // Find both users
    const fromUser = await prisma.user.findUnique({ where: { id: fromUserId } })
    const toUser = await prisma.user.findUnique({ where: { id: toUserId } })

    if (!fromUser || !toUser) {
      return NextResponse.json(
        { error: 'One or both users not found' },
        { status: 404 }
      )
    }

    console.log('Transferring from:', fromUser.email, 'to:', toUser.email)

    // Transfer all content
    const transferResults = {
      topics: 0,
      courses: 0,
      goals: 0,
      goalTemplates: 0,
      vacancies: 0,
      studentTopics: 0
    }

    // Transfer authored topics
    const topicUpdate = await prisma.topic.updateMany({
      where: { authorId: fromUserId },
      data: { authorId: toUserId }
    })
    transferResults.topics = topicUpdate.count

    // Transfer courses
    const courseUpdate = await prisma.course.updateMany({
      where: { educatorId: fromUserId },
      data: { educatorId: toUserId }
    })
    transferResults.courses = courseUpdate.count

    // Transfer goals
    const goalUpdate = await prisma.goal.updateMany({
      where: { userId: fromUserId },
      data: { userId: toUserId }
    })
    transferResults.goals = goalUpdate.count

    // Transfer goal templates
    const goalTemplateUpdate = await prisma.goalTemplate.updateMany({
      where: { authorId: fromUserId },
      data: { authorId: toUserId }
    })
    transferResults.goalTemplates = goalTemplateUpdate.count

    // Transfer vacancies
    const vacancyUpdate = await prisma.vacancy.updateMany({
      where: { authorId: fromUserId },
      data: { authorId: toUserId }
    })
    transferResults.vacancies = vacancyUpdate.count

    // Transfer student topics (learning progress)
    const studentTopicUpdate = await prisma.studentTopic.updateMany({
      where: { userId: fromUserId },
      data: { userId: toUserId }
    })
    transferResults.studentTopics = studentTopicUpdate.count

    // Transfer course enrollments
    const enrollmentUpdate = await prisma.courseEnrollment.updateMany({
      where: { studentId: fromUserId },
      data: { studentId: toUserId }
    })

    // Transfer validated topics
    const validatorUpdate = await prisma.studentTopic.updateMany({
      where: { validatedBy: fromUserId },
      data: { validatedBy: toUserId }
    })

    console.log('Transfer completed:', transferResults)

    // Now safely delete the user
    await prisma.user.delete({
      where: { id: fromUserId }
    })

    console.log('User deleted successfully')

    return NextResponse.json({
      message: 'User content transferred and user deleted successfully',
      deletedUser: {
        id: fromUser.id,
        email: fromUser.email,
        name: fromUser.name
      },
      transferredTo: {
        id: toUser.id,
        email: toUser.email,
        name: toUser.name
      },
      contentTransferred: transferResults
    })

  } catch (error) {
    console.error('Transfer and delete error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to transfer content and delete user',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}