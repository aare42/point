import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const updateStatusSchema = z.object({
  status: z.enum(['LEARNING', 'LEARNED'])
})

// PUT - update student topic status (educator only)
export async function PUT(
  req: NextRequest,
  { params }: { 
    params: Promise<{ 
      id: string
      studentId: string
      topicId: string 
    }> 
  }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: courseId, studentId, topicId } = await params
    const body = await req.json()
    const { status } = updateStatusSchema.parse(body)

    // Verify the course belongs to the educator
    const course = await prisma.course.findUnique({
      where: { 
        id: courseId,
        educatorId: session.user.id
      },
      include: {
        topics: {
          where: { topicId }
        }
      }
    })

    if (!course) {
      return NextResponse.json({ error: 'Course not found or access denied' }, { status: 404 })
    }

    // Verify the topic is part of this course
    if (course.topics.length === 0) {
      return NextResponse.json({ error: 'Topic not found in course' }, { status: 400 })
    }

    // Verify the student is enrolled in the course
    const enrollment = await prisma.courseEnrollment.findUnique({
      where: {
        courseId_studentId: {
          courseId,
          studentId
        }
      }
    })

    if (!enrollment) {
      return NextResponse.json({ error: 'Student not enrolled in course' }, { status: 400 })
    }

    // Verify student and topic exist
    const [student, topic] = await Promise.all([
      prisma.user.findUnique({ where: { id: studentId } }),
      prisma.topic.findUnique({ where: { id: topicId } })
    ])

    if (!student || !topic) {
      return NextResponse.json({ error: 'Student or topic not found' }, { status: 404 })
    }

    // Update or create student topic status
    const result = await prisma.$transaction(async (tx) => {
      // Update the topic status
      const studentTopic = await tx.studentTopic.upsert({
        where: {
          userId_topicId: {
            userId: studentId,
            topicId: topicId
          }
        },
        update: { 
          status,
          updatedAt: new Date()
        },
        create: {
          userId: studentId,
          topicId: topicId,
          status
        }
      })

      // Check if all topics in the course are now LEARNED for this student
      if (status === 'LEARNED') {
        // Get all topics for this course
        const courseTopics = await tx.courseTopic.findMany({
          where: { courseId }
        })

        // Get this student's progress on all course topics
        const studentTopics = await tx.studentTopic.findMany({
          where: {
            userId: studentId,
            topicId: { in: courseTopics.map(ct => ct.topicId) }
          }
        })

        // Check if all course topics are LEARNED or LEARNED_AND_VALIDATED
        const allTopicsLearned = courseTopics.every(courseTopic => {
          const studentTopic = studentTopics.find(st => st.topicId === courseTopic.topicId)
          return studentTopic && (studentTopic.status === 'LEARNED' || studentTopic.status === 'LEARNED_AND_VALIDATED')
        })

        // If all topics are learned, validate them all
        if (allTopicsLearned) {
          await tx.studentTopic.updateMany({
            where: {
              userId: studentId,
              topicId: { in: courseTopics.map(ct => ct.topicId) },
              status: 'LEARNED'
            },
            data: {
              status: 'LEARNED_AND_VALIDATED',
              updatedAt: new Date(),
              validatedBy: session.user.id
            }
          })

          // Return the validated status
          return {
            userId: studentTopic.userId,
            topicId: studentTopic.topicId,
            status: 'LEARNED_AND_VALIDATED',
            updatedAt: new Date().toISOString(),
            courseCompleted: true
          }
        }
      }

      return {
        userId: studentTopic.userId,
        topicId: studentTopic.topicId,
        status: studentTopic.status,
        updatedAt: studentTopic.updatedAt.toISOString(),
        courseCompleted: false
      }
    })

    return NextResponse.json({
      success: true,
      studentTopic: result
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Invalid request data', 
        details: error.issues 
      }, { status: 400 })
    }
    
    console.error('Error updating student topic status:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}