import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const userId = session.user.id

    // Check if course exists and educator is not blocked
    const course = await prisma.course.findUnique({
      where: { id },
      select: { 
        id: true, 
        name: true,
        educatorId: true,
        isBlocked: true,
        educator: {
          select: { isBlocked: true }
        },
        _count: {
          select: { enrollments: true }
        }
      }
    })

    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 })
    }

    if (course.isBlocked) {
      return NextResponse.json({ error: 'Course not available' }, { status: 403 })
    }

    if (course.educator.isBlocked) {
      return NextResponse.json({ error: 'Course not available' }, { status: 403 })
    }

    // Check if user is trying to enroll in their own course
    if (course.educatorId === userId) {
      return NextResponse.json({ error: 'Cannot enroll in your own course' }, { status: 400 })
    }

    // Check if already enrolled
    const existingEnrollment = await prisma.courseEnrollment.findUnique({
      where: {
        courseId_studentId: {
          courseId: id,
          studentId: userId
        }
      }
    })

    if (existingEnrollment) {
      return NextResponse.json({ error: 'Already enrolled in this course' }, { status: 400 })
    }

    // Get all topics for this course
    const courseTopics = await prisma.courseTopic.findMany({
      where: { courseId: id },
      include: { topic: true }
    })

    // Create enrollment and set all course topics to "LEARNING" status
    const enrollment = await prisma.$transaction(async (tx) => {
      // Create the enrollment
      const newEnrollment = await tx.courseEnrollment.create({
        data: {
          courseId: id,
          studentId: userId
        },
        include: {
          course: {
            select: { name: true }
          },
          student: {
            select: { name: true, email: true }
          }
        }
      })

      // Set all course topics to "LEARNING" status for this student
      const studentTopicPromises = courseTopics.map(courseTopic =>
        tx.studentTopic.upsert({
          where: {
            userId_topicId: {
              userId: userId,
              topicId: courseTopic.topicId
            }
          },
          update: {
            status: 'LEARNING',
            updatedAt: new Date()
          },
          create: {
            userId: userId,
            topicId: courseTopic.topicId,
            status: 'LEARNING'
          }
        })
      )

      await Promise.all(studentTopicPromises)
      return newEnrollment
    })

    return NextResponse.json({ 
      message: 'Successfully enrolled in course',
      enrollment 
    }, { status: 201 })
  } catch (error) {
    console.error('Error enrolling in course:', error)
    return NextResponse.json(
      { error: 'Failed to enroll in course' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const userId = session.user.id

    // Check if enrollment exists
    const enrollment = await prisma.courseEnrollment.findUnique({
      where: {
        courseId_studentId: {
          courseId: id,
          studentId: userId
        }
      }
    })

    if (!enrollment) {
      return NextResponse.json({ error: 'Not enrolled in this course' }, { status: 404 })
    }

    // Remove enrollment
    await prisma.courseEnrollment.delete({
      where: {
        courseId_studentId: {
          courseId: id,
          studentId: userId
        }
      }
    })

    return NextResponse.json({ message: 'Successfully unenrolled from course' })
  } catch (error) {
    console.error('Error unenrolling from course:', error)
    return NextResponse.json(
      { error: 'Failed to unenroll from course' },
      { status: 500 }
    )
  }
}