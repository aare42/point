import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET - fetch student dashboard data
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id

    // Get status counts
    const statusCounts = await prisma.studentTopic.groupBy({
      by: ['status'],
      where: { userId },
      _count: { status: true }
    })

    // Get recent topic changes (last 10)
    const recentChanges = await prisma.studentTopic.findMany({
      where: { userId },
      include: {
        topic: {
          select: { name: true, slug: true, type: true }
        }
      },
      orderBy: { updatedAt: 'desc' },
      take: 10
    })

    // Get goals with progress calculation
    const goals = await prisma.goal.findMany({
      where: { userId: userId },
      include: {
        topics: {
          include: {
            topic: {
              include: {
                studentTopics: {
                  where: { userId }
                }
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 5
    })

    const goalsWithProgress = goals.map(goal => {
      const totalTopics = goal.topics.length
      const completedTopics = goal.topics.filter(
        ({ topic }) => topic.studentTopics[0]?.status === 'LEARNED' || topic.studentTopics[0]?.status === 'LEARNED_AND_VALIDATED'
      ).length
      
      return {
        id: goal.id,
        name: goal.name,
        motto: goal.motto,
        deadline: goal.deadline?.toISOString(),
        progress: totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0,
        totalTopics,
        completedTopics
      }
    })

    // Get enrolled courses with progress
    const enrolledCourses = await prisma.courseEnrollment.findMany({
      where: { studentId: userId },
      include: {
        course: {
          include: {
            educator: {
              select: { name: true, email: true }
            },
            topics: {
              include: {
                topic: {
                  include: {
                    studentTopics: {
                      where: { userId }
                    }
                  }
                }
              }
            },
            _count: {
              select: { topics: true, enrollments: true }
            }
          }
        }
      },
      orderBy: { enrolledAt: 'desc' },
      take: 5
    })

    const coursesWithProgress = enrolledCourses.map(enrollment => {
      const course = enrollment.course
      const totalTopics = course.topics.length
      const completedTopics = course.topics.filter(
        ({ topic }) => topic.studentTopics[0]?.status === 'LEARNED' || topic.studentTopics[0]?.status === 'LEARNED_AND_VALIDATED'
      ).length
      
      return {
        id: course.id,
        name: course.name,
        description: course.description,
        educator: course.educator,
        enrolledAt: enrollment.enrolledAt.toISOString(),
        progress: totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0,
        totalTopics,
        completedTopics,
        totalEnrollments: course._count.enrollments
      }
    })

    return NextResponse.json({
      statusCounts: statusCounts.reduce((acc, curr) => {
        acc[curr.status] = curr._count.status
        return acc
      }, {} as Record<string, number>),
      recentChanges,
      goals: goalsWithProgress,
      courses: coursesWithProgress
    })
  } catch (error) {
    console.error('Error fetching student dashboard:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}