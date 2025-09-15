import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET - fetch course details with student progress for educator
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: courseId } = await params

    // Get course with topics and verify educator ownership
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      include: {
        topics: {
          include: {
            topic: {
              select: {
                id: true,
                name: true,
                slug: true,
                type: true
              }
            }
          },
          orderBy: {
            topic: { name: 'asc' }
          }
        },
        _count: {
          select: {
            enrollments: true,
            topics: true
          }
        }
      }
    })

    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 })
    }

    // Verify educator owns this course
    if (course.educatorId !== session.user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Get all enrolled students
    const enrollments = await prisma.courseEnrollment.findMany({
      where: { courseId },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: {
        student: { name: 'asc' }
      }
    })

    // Get topic IDs for this course
    const topicIds = course.topics.map(ct => ct.topic.id)

    // Get all student progress for these topics
    const studentProgress = await prisma.studentTopic.findMany({
      where: {
        topicId: { in: topicIds },
        userId: { in: enrollments.map(e => e.student.id) }
      },
      select: {
        userId: true,
        topicId: true,
        status: true,
        updatedAt: true
      }
    })

    // Organize progress data by student
    const studentsProgress = enrollments.map(enrollment => {
      const student = enrollment.student
      
      // Get this student's progress for all course topics
      const progress: { [topicId: string]: { status: string; updatedAt: string } } = {}
      let completedCount = 0

      course.topics.forEach(courseTopic => {
        const topicProgress = studentProgress.find(
          sp => sp.userId === student.id && sp.topicId === courseTopic.topic.id
        )
        
        if (topicProgress) {
          progress[courseTopic.topic.id] = {
            status: topicProgress.status,
            updatedAt: topicProgress.updatedAt.toISOString()
          }
          
          // Count completed topics (LEARNED or LEARNED_AND_VALIDATED)
          if (topicProgress.status === 'LEARNED' || topicProgress.status === 'LEARNED_AND_VALIDATED') {
            completedCount++
          }
        } else {
          progress[courseTopic.topic.id] = {
            status: 'NOT_LEARNED',
            updatedAt: new Date().toISOString()
          }
        }
      })

      const totalTopics = course.topics.length
      const completionPercentage = totalTopics > 0 ? Math.round((completedCount / totalTopics) * 100) : 0

      return {
        student,
        progress,
        totalCompleted: completedCount,
        totalTopics,
        completionPercentage
      }
    })

    return NextResponse.json({
      course,
      studentsProgress
    })

  } catch (error) {
    console.error('Error fetching course management data:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}