import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import * as fs from 'fs'
import * as path from 'path'

export async function GET(request: NextRequest) {
  try {
    // Check authentication and admin role
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Read the backup file
    const backupPath = path.join(process.cwd(), 'public', 'backup.json')
    if (!fs.existsSync(backupPath)) {
      return NextResponse.json({ 
        error: 'Backup file not found. Please check if backup.json exists in public directory.' 
      }, { status: 404 })
    }

    const backupContent = fs.readFileSync(backupPath, 'utf8')
    const data = JSON.parse(backupContent)
    
    if (!data.data) {
      return NextResponse.json({ error: 'Invalid backup format' }, { status: 400 })
    }

    // Build mappings from backup data to current data using slugs/emails
    const topicMapping: Record<string, string> = {}
    const userMapping: Record<string, string> = {}
    
    // Map topics by slug
    if (data.data.topic && Array.isArray(data.data.topic)) {
      const currentTopics = await prisma.topic.findMany({ select: { id: true, slug: true } })
      for (const backupTopic of data.data.topic) {
        const currentTopic = currentTopics.find(t => t.slug === backupTopic.slug)
        if (currentTopic) {
          topicMapping[backupTopic.id] = currentTopic.id
        }
      }
    }

    // Map users by email  
    if (data.data.user && Array.isArray(data.data.user)) {
      const currentUsers = await prisma.user.findMany({ select: { id: true, email: true } })
      for (const backupUser of data.data.user) {
        const currentUser = currentUsers.find(u => u.email === backupUser.email)
        if (currentUser) {
          userMapping[backupUser.id] = currentUser.id
        }
      }
    }

    const results = {
      mappings: {
        topics: Object.keys(topicMapping).length,
        users: Object.keys(userMapping).length
      },
      restored: {
        topicPrerequisites: 0,
        courseTopics: 0,
        goalTopics: 0
      },
      errors: [] as string[]
    }

    // Restore topic prerequisites
    if (data.data.topicPrerequisite && Array.isArray(data.data.topicPrerequisite)) {
      for (const prereq of data.data.topicPrerequisite) {
        const newTopicId = topicMapping[prereq.topicId]
        const newPrereqId = topicMapping[prereq.prerequisiteId]
        
        if (newTopicId && newPrereqId) {
          try {
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
          } catch (error) {
            results.errors.push(`Failed to restore prerequisite: ${error instanceof Error ? error.message : 'Unknown error'}`)
          }
        }
      }
    }

    // Restore course topics (need to match courses by name + educator)
    const courseMapping: Record<string, string> = {}
    if (data.data.course && Array.isArray(data.data.course)) {
      const currentCourses = await prisma.course.findMany({ 
        select: { id: true, name: true, educatorId: true } 
      })
      
      for (const backupCourse of data.data.course) {
        const newEducatorId = userMapping[backupCourse.educatorId]
        if (newEducatorId) {
          const currentCourse = currentCourses.find(c => 
            c.name === backupCourse.name && c.educatorId === newEducatorId
          )
          if (currentCourse) {
            courseMapping[backupCourse.id] = currentCourse.id
          }
        }
      }
    }

    if (data.data.courseTopic && Array.isArray(data.data.courseTopic)) {
      for (const courseTopic of data.data.courseTopic) {
        const newCourseId = courseMapping[courseTopic.courseId]
        const newTopicId = topicMapping[courseTopic.topicId]
        
        if (newCourseId && newTopicId) {
          try {
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
          } catch (error) {
            results.errors.push(`Failed to restore course topic: ${error instanceof Error ? error.message : 'Unknown error'}`)
          }
        }
      }
    }

    // Restore goal topics (match goals by name + user)
    const goalMapping: Record<string, string> = {}
    if (data.data.goal && Array.isArray(data.data.goal)) {
      const currentGoals = await prisma.goal.findMany({ 
        select: { id: true, name: true, userId: true } 
      })
      
      for (const backupGoal of data.data.goal) {
        const newUserId = userMapping[backupGoal.userId]
        if (newUserId) {
          const currentGoal = currentGoals.find(g => 
            g.name === backupGoal.name && g.userId === newUserId
          )
          if (currentGoal) {
            goalMapping[backupGoal.id] = currentGoal.id
          }
        }
      }
    }

    if (data.data.goalTopic && Array.isArray(data.data.goalTopic)) {
      for (const goalTopic of data.data.goalTopic) {
        const newGoalId = goalMapping[goalTopic.goalId]
        const newTopicId = topicMapping[goalTopic.topicId]
        
        if (newGoalId && newTopicId) {
          try {
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
          } catch (error) {
            results.errors.push(`Failed to restore goal topic: ${error instanceof Error ? error.message : 'Unknown error'}`)
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Relationship restoration completed successfully!',
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

export async function POST(request: NextRequest) {
  // Also support POST with custom data
  return GET(request)
}