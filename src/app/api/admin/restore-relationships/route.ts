import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    // Check authentication and admin role
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const data = await request.json()
    
    if (!data.data) {
      return NextResponse.json({ error: 'Invalid JSON format - data object not found' }, { status: 400 })
    }

    const results = {
      topicMapping: {} as Record<string, string>, // old ID -> new ID
      userMapping: {} as Record<string, string>,   // old ID -> new ID  
      restored: {
        topicPrerequisites: 0,
        courseTopics: 0,
        goalTopics: 0,
        goalTemplateTopics: 0,
        vacancyTopics: 0,
        studentTopics: 0
      },
      errors: [] as string[]
    }

    // Step 1: Create mappings from old IDs to new IDs using slugs/emails
    
    // Map topics by slug
    if (data.data.topic && Array.isArray(data.data.topic)) {
      const currentTopics = await prisma.topic.findMany({
        select: { id: true, slug: true }
      })
      
      for (const oldTopic of data.data.topic) {
        const currentTopic = currentTopics.find(t => t.slug === oldTopic.slug)
        if (currentTopic) {
          results.topicMapping[oldTopic.id] = currentTopic.id
        }
      }
    }

    // Map users by email
    if (data.data.user && Array.isArray(data.data.user)) {
      const currentUsers = await prisma.user.findMany({
        select: { id: true, email: true }
      })
      
      for (const oldUser of data.data.user) {
        const currentUser = currentUsers.find(u => u.email === oldUser.email)
        if (currentUser) {
          results.userMapping[oldUser.id] = currentUser.id
        }
      }
    }

    // Step 2: Restore topic prerequisites
    if (data.data.topicPrerequisite && Array.isArray(data.data.topicPrerequisite)) {
      for (const prereq of data.data.topicPrerequisite) {
        try {
          const newTopicId = results.topicMapping[prereq.topicId]
          const newPrereqId = results.topicMapping[prereq.prerequisiteId]
          
          if (newTopicId && newPrereqId) {
            await prisma.topicPrerequisite.upsert({
              where: {
                topicId_prerequisiteId: {
                  topicId: newTopicId,
                  prerequisiteId: newPrereqId
                }
              },
              update: {},
              create: {
                topicId: newTopicId,
                prerequisiteId: newPrereqId
              }
            })
            results.restored.topicPrerequisites++
          }
        } catch (error) {
          results.errors.push(`Failed to restore prerequisite: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
      }
    }

    // Step 3: Restore course topics (need to map courses first)
    const courseMapping: Record<string, string> = {}
    if (data.data.course && Array.isArray(data.data.course)) {
      const currentCourses = await prisma.course.findMany({
        select: { id: true, name: true, educatorId: true }
      })
      
      for (const oldCourse of data.data.course) {
        const newEducatorId = results.userMapping[oldCourse.educatorId]
        if (newEducatorId) {
          const currentCourse = currentCourses.find(c => 
            c.name === oldCourse.name && c.educatorId === newEducatorId
          )
          if (currentCourse) {
            courseMapping[oldCourse.id] = currentCourse.id
          }
        }
      }
    }

    if (data.data.courseTopic && Array.isArray(data.data.courseTopic)) {
      for (const courseTopic of data.data.courseTopic) {
        try {
          const newCourseId = courseMapping[courseTopic.courseId]
          const newTopicId = results.topicMapping[courseTopic.topicId]
          
          if (newCourseId && newTopicId) {
            await prisma.courseTopic.upsert({
              where: {
                courseId_topicId: {
                  courseId: newCourseId,
                  topicId: newTopicId
                }
              },
              update: {},
              create: {
                courseId: newCourseId,
                topicId: newTopicId
              }
            })
            results.restored.courseTopics++
          }
        } catch (error) {
          results.errors.push(`Failed to restore course topic: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
      }
    }

    // Step 4: Restore goal topics (similar pattern for goals)
    const goalMapping: Record<string, string> = {}
    if (data.data.goal && Array.isArray(data.data.goal)) {
      const currentGoals = await prisma.goal.findMany({
        select: { id: true, name: true, userId: true }
      })
      
      for (const oldGoal of data.data.goal) {
        const newUserId = results.userMapping[oldGoal.userId]
        if (newUserId) {
          const currentGoal = currentGoals.find(g => 
            g.name === oldGoal.name && g.userId === newUserId
          )
          if (currentGoal) {
            goalMapping[oldGoal.id] = currentGoal.id
          }
        }
      }
    }

    if (data.data.goalTopic && Array.isArray(data.data.goalTopic)) {
      for (const goalTopic of data.data.goalTopic) {
        try {
          const newGoalId = goalMapping[goalTopic.goalId]
          const newTopicId = results.topicMapping[goalTopic.topicId]
          
          if (newGoalId && newTopicId) {
            await prisma.goalTopic.upsert({
              where: {
                goalId_topicId: {
                  goalId: newGoalId,
                  topicId: newTopicId
                }
              },
              update: {},
              create: {
                goalId: newGoalId,
                topicId: newTopicId
              }
            })
            results.restored.goalTopics++
          }
        } catch (error) {
          results.errors.push(`Failed to restore goal topic: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Relationships restoration completed',
      results
    })

  } catch (error) {
    console.error('Restore relationships error:', error)
    return NextResponse.json({
      success: false,
      error: `Restoration failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    }, { status: 500 })
  }
}