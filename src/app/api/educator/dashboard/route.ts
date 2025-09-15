import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET - fetch educator dashboard data
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id

    // Get educator's courses with topic and enrollment counts
    const courses = await prisma.course.findMany({
      where: { educatorId: userId },
      include: {
        _count: {
          select: {
            topics: true,
            enrollments: true
          }
        },
        topics: {
          include: {
            topic: {
              select: { name: true, type: true }
            }
          }
        },
        enrollments: {
          include: {
            student: {
              select: { name: true, email: true }
            }
          },
          orderBy: { enrolledAt: 'desc' }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    // Get recent enrollments across all courses
    const recentEnrollments = await prisma.courseEnrollment.findMany({
      where: {
        course: { educatorId: userId }
      },
      include: {
        course: {
          select: { name: true }
        },
        student: {
          select: { name: true, email: true }
        }
      },
      orderBy: { enrolledAt: 'desc' },
      take: 10
    })

    // Calculate totals
    const totalCourses = courses.length
    const totalStudents = courses.reduce((sum, course) => sum + course._count.enrollments, 0)
    const totalTopics = courses.reduce((sum, course) => sum + course._count.topics, 0)

    return NextResponse.json({
      courses,
      recentEnrollments,
      stats: {
        totalCourses,
        totalStudents,
        totalTopics
      }
    })
  } catch (error) {
    console.error('Error fetching educator dashboard:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}