import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET - fetch analytics data for admin
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true }
    })

    if (user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    // Get current date for recent activity calculation
    const oneWeekAgo = new Date()
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)

    // Parallel queries for better performance
    const [
      totalTopics,
      totalUsers,
      totalCourses,
      totalGoals,
      totalVacancies,
      totalEnrollments,
      topicsByType,
      usersByRole,
      newUsersThisWeek,
      newTopicsThisWeek,
      newCoursesThisWeek,
      newGoalsThisWeek,
      newVacanciesThisWeek,
      activeGoals,
      overdueGoals,
      avgTopicsPerGoal,
      avgTopicsPerCourse,
      avgTopicsPerVacancy,
      usersWithGoals,
      coursesWithEnrollments,
      avgEnrollmentsPerCourse
    ] = await Promise.all([
      // Count totals
      prisma.topic.count(),
      prisma.user.count(),
      prisma.course.count(),
      prisma.goal.count(),
      prisma.vacancy.count(),
      prisma.courseEnrollment.count(),
      
      // Count topics by type
      prisma.topic.groupBy({
        by: ['type'],
        _count: {
          type: true
        }
      }),
      
      // Count users by role
      prisma.user.groupBy({
        by: ['role'],
        _count: {
          role: true
        }
      }),
      
      // Recent activity (this week)
      prisma.user.count({
        where: {
          createdAt: {
            gte: oneWeekAgo
          }
        }
      }),
      
      prisma.topic.count({
        where: {
          createdAt: {
            gte: oneWeekAgo
          }
        }
      }),
      
      prisma.course.count({
        where: {
          createdAt: {
            gte: oneWeekAgo
          }
        }
      }),

      prisma.goal.count({
        where: {
          createdAt: {
            gte: oneWeekAgo
          }
        }
      }),

      prisma.vacancy.count({
        where: {
          createdAt: {
            gte: oneWeekAgo
          }
        }
      }),

      // Goals analytics
      prisma.goal.count({
        where: {
          OR: [
            { deadline: null },
            { deadline: { gt: new Date() } }
          ]
        }
      }),

      prisma.goal.count({
        where: {
          deadline: {
            lt: new Date()
          }
        }
      }),

      // Average topics per entity
      prisma.goalTopic.count(),
      prisma.courseTopic.count(),
      prisma.vacancyTopic.count(),

      // Users with goals
      prisma.user.count({
        where: {
          goals: {
            some: {}
          }
        }
      }),

      // Courses with enrollments
      prisma.course.count({
        where: {
          enrollments: {
            some: {}
          }
        }
      }),

      // Enrollments per course calculation
      prisma.courseEnrollment.count()
    ])

    // Transform topic counts into expected format
    const topicTypeBreakdown = {
      THEORY: 0,
      PRACTICE: 0,
      PROJECT: 0
    }
    
    topicsByType.forEach(item => {
      topicTypeBreakdown[item.type as keyof typeof topicTypeBreakdown] = item._count.type
    })

    // Transform user role counts into expected format
    const userRoleBreakdown = {
      USER: 0,
      EDITOR: 0,
      ADMIN: 0
    }
    
    usersByRole.forEach(item => {
      userRoleBreakdown[item.role as keyof typeof userRoleBreakdown] = item._count.role
    })

    const analyticsData = {
      totalTopics,
      totalUsers,
      totalCourses,
      totalGoals,
      totalVacancies,
      totalEnrollments,
      topicsByType: topicTypeBreakdown,
      usersByRole: userRoleBreakdown,
      recentActivity: {
        newUsersThisWeek,
        newTopicsThisWeek,
        newCoursesThisWeek,
        newGoalsThisWeek,
        newVacanciesThisWeek
      },
      goalsStats: {
        activeGoals,
        overdueGoals,
        avgTopicsPerGoal: totalGoals > 0 ? Math.round(avgTopicsPerGoal / totalGoals) : 0,
        usersWithGoals
      },
      coursesStats: {
        avgTopicsPerCourse: totalCourses > 0 ? Math.round(avgTopicsPerCourse / totalCourses) : 0,
        coursesWithEnrollments,
        avgEnrollmentsPerCourse: totalCourses > 0 ? Math.round(totalEnrollments / totalCourses) : 0
      },
      vacanciesStats: {
        avgTopicsPerVacancy: totalVacancies > 0 ? Math.round(avgTopicsPerVacancy / totalVacancies) : 0
      }
    }

    return NextResponse.json(analyticsData)
  } catch (error) {
    console.error('Error fetching analytics:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}