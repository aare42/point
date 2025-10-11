import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getLocalizedText } from '@/lib/utils/multilingual'

// GET - fetch student dashboard data
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const language = (searchParams.get('lang') || 'en') as 'en' | 'uk'
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

    // Localize the text fields
    const localizedRecentChanges = recentChanges.map(change => ({
      ...change,
      topic: {
        ...change.topic,
        name: getLocalizedText(change.topic.name as any, language)
      }
    }))

    const localizedGoalsWithProgress = goalsWithProgress.map(goal => ({
      ...goal,
      name: typeof goal.name === 'string' ? goal.name : getLocalizedText(goal.name as any, language),
      motto: goal.motto ? (typeof goal.motto === 'string' ? goal.motto : getLocalizedText(goal.motto as any, language)) : null
    }))

    const localizedCoursesWithProgress = coursesWithProgress.map(course => ({
      ...course,
      name: typeof course.name === 'string' ? course.name : getLocalizedText(course.name as any, language),
      description: course.description ? (typeof course.description === 'string' ? course.description : getLocalizedText(course.description as any, language)) : null
    }))

    return NextResponse.json({
      statusCounts: statusCounts.reduce((acc, curr) => {
        acc[curr.status] = curr._count.status
        return acc
      }, {} as Record<string, number>),
      recentChanges: localizedRecentChanges,
      goals: localizedGoalsWithProgress,
      courses: localizedCoursesWithProgress
    })
  } catch (error) {
    console.error('Error fetching student dashboard:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}