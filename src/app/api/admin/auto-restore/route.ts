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

    // Read the backup file from the server
    const backupPath = path.join(process.cwd(), 'db-backups', 'use this db.json')
    
    if (!fs.existsSync(backupPath)) {
      return NextResponse.json({ 
        error: 'Backup file not found',
        path: backupPath 
      }, { status: 404 })
    }

    const backupContent = fs.readFileSync(backupPath, 'utf8')
    const data = JSON.parse(backupContent)
    
    if (!data.data) {
      return NextResponse.json({ error: 'Invalid backup format' }, { status: 400 })
    }

    const results = {
      topicMapping: {} as Record<string, string>,
      userMapping: {} as Record<string, string>,
      restored: {
        topicPrerequisites: 0,
        courseTopics: 0,
        goalTopics: 0,
        goalTemplateTopics: 0,
        vacancyTopics: 0,
        studentTopics: 0
      },
      errors: [] as string[],
      summary: {
        topicsInBackup: 0,
        topicsMatched: 0,
        usersInBackup: 0,
        usersMatched: 0
      }
    }

    // Step 1: Create topic mapping by slug
    if (data.data.topic && Array.isArray(data.data.topic)) {
      results.summary.topicsInBackup = data.data.topic.length
      const currentTopics = await prisma.topic.findMany({
        select: { id: true, slug: true }
      })
      
      for (const oldTopic of data.data.topic) {
        const currentTopic = currentTopics.find(t => t.slug === oldTopic.slug)
        if (currentTopic) {
          results.topicMapping[oldTopic.id] = currentTopic.id
          results.summary.topicsMatched++
        }
      }
    }

    // Step 2: Create user mapping by email
    if (data.data.user && Array.isArray(data.data.user)) {
      results.summary.usersInBackup = data.data.user.length
      const currentUsers = await prisma.user.findMany({
        select: { id: true, email: true }
      })
      
      for (const oldUser of data.data.user) {
        const currentUser = currentUsers.find(u => u.email === oldUser.email)
        if (currentUser) {
          results.userMapping[oldUser.id] = currentUser.id
          results.summary.usersMatched++
        }
      }
    }

    // Step 3: Restore topic prerequisites
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

    // Step 4: Restore course topics
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

    // Step 5: Restore goal topics
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
      message: 'Auto-restoration completed',
      results
    })

  } catch (error) {
    console.error('Auto-restore error:', error)
    return NextResponse.json({
      success: false,
      error: `Auto-restoration failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    }, { status: 500 })
  }
}