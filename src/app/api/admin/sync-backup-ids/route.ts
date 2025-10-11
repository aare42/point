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

    // Read the current backup file
    const backupPath = path.join(process.cwd(), 'public', 'backup.json')
    if (!fs.existsSync(backupPath)) {
      return NextResponse.json({ error: 'Backup file not found' }, { status: 404 })
    }

    const backupContent = fs.readFileSync(backupPath, 'utf8')
    const data = JSON.parse(backupContent)

    const results = {
      mappings: {
        users: 0,
        topics: 0,
        courses: 0,
        goals: 0,
        goalTemplates: 0,
        vacancies: 0
      },
      updated: {
        topicPrerequisites: 0,
        courseTopics: 0,
        goalTopics: 0,
        goalTemplateTopics: 0,
        vacancyTopics: 0,
        studentTopics: 0,
        courseEnrollments: 0
      }
    }

    // Build ID mappings from current database
    const userMapping: Record<string, string> = {}
    const topicMapping: Record<string, string> = {}
    const courseMapping: Record<string, string> = {}
    const goalMapping: Record<string, string> = {}
    const goalTemplateMapping: Record<string, string> = {}
    const vacancyMapping: Record<string, string> = {}

    // Map users by email
    const currentUsers = await prisma.user.findMany({ select: { id: true, email: true } })
    if (data.data.user && Array.isArray(data.data.user)) {
      for (const backupUser of data.data.user) {
        const currentUser = currentUsers.find(u => u.email === backupUser.email)
        if (currentUser) {
          userMapping[backupUser.id] = currentUser.id
          results.mappings.users++
        }
      }
    }

    // Map topics by slug
    const currentTopics = await prisma.topic.findMany({ select: { id: true, slug: true } })
    if (data.data.topic && Array.isArray(data.data.topic)) {
      for (const backupTopic of data.data.topic) {
        const currentTopic = currentTopics.find(t => t.slug === backupTopic.slug)
        if (currentTopic) {
          topicMapping[backupTopic.id] = currentTopic.id
          results.mappings.topics++
        }
      }
    }

    // Map courses by name + educator
    const currentCourses = await prisma.course.findMany({ 
      select: { id: true, name: true, educatorId: true } 
    })
    if (data.data.course && Array.isArray(data.data.course)) {
      for (const backupCourse of data.data.course) {
        const newEducatorId = userMapping[backupCourse.educatorId]
        if (newEducatorId) {
          const currentCourse = currentCourses.find(c => 
            c.name === backupCourse.name && c.educatorId === newEducatorId
          )
          if (currentCourse) {
            courseMapping[backupCourse.id] = currentCourse.id
            results.mappings.courses++
          }
        }
      }
    }

    // Map goals by name + user
    const currentGoals = await prisma.goal.findMany({ 
      select: { id: true, name: true, userId: true } 
    })
    if (data.data.goal && Array.isArray(data.data.goal)) {
      for (const backupGoal of data.data.goal) {
        const newUserId = userMapping[backupGoal.userId]
        if (newUserId) {
          const currentGoal = currentGoals.find(g => 
            g.name === backupGoal.name && g.userId === newUserId
          )
          if (currentGoal) {
            goalMapping[backupGoal.id] = currentGoal.id
            results.mappings.goals++
          }
        }
      }
    }

    // Map goal templates by name + author
    const currentGoalTemplates = await prisma.goalTemplate.findMany({ 
      select: { id: true, name: true, authorId: true } 
    })
    if (data.data.goalTemplate && Array.isArray(data.data.goalTemplate)) {
      for (const backupTemplate of data.data.goalTemplate) {
        const newAuthorId = userMapping[backupTemplate.authorId]
        if (newAuthorId) {
          const currentTemplate = currentGoalTemplates.find(gt => 
            gt.name === backupTemplate.name && gt.authorId === newAuthorId
          )
          if (currentTemplate) {
            goalTemplateMapping[backupTemplate.id] = currentTemplate.id
            results.mappings.goalTemplates++
          }
        }
      }
    }

    // Map vacancies by name + author
    const currentVacancies = await prisma.vacancy.findMany({ 
      select: { id: true, name: true, authorId: true } 
    })
    if (data.data.vacancy && Array.isArray(data.data.vacancy)) {
      for (const backupVacancy of data.data.vacancy) {
        const newAuthorId = userMapping[backupVacancy.authorId]
        if (newAuthorId) {
          const currentVacancy = currentVacancies.find(v => 
            v.name === backupVacancy.name && v.authorId === newAuthorId
          )
          if (currentVacancy) {
            vacancyMapping[backupVacancy.id] = currentVacancy.id
            results.mappings.vacancies++
          }
        }
      }
    }

    // Now update all relationship tables with new IDs
    
    // Update topic prerequisites
    if (data.data.topicPrerequisite && Array.isArray(data.data.topicPrerequisite)) {
      for (const prereq of data.data.topicPrerequisite) {
        const newTopicId = topicMapping[prereq.topicId]
        const newPrereqId = topicMapping[prereq.prerequisiteId]
        if (newTopicId && newPrereqId) {
          prereq.topicId = newTopicId
          prereq.prerequisiteId = newPrereqId
          results.updated.topicPrerequisites++
        }
      }
    }

    // Update course topics
    if (data.data.courseTopic && Array.isArray(data.data.courseTopic)) {
      for (const courseTopic of data.data.courseTopic) {
        const newCourseId = courseMapping[courseTopic.courseId]
        const newTopicId = topicMapping[courseTopic.topicId]
        if (newCourseId && newTopicId) {
          courseTopic.courseId = newCourseId
          courseTopic.topicId = newTopicId
          results.updated.courseTopics++
        }
      }
    }

    // Update goal topics
    if (data.data.goalTopic && Array.isArray(data.data.goalTopic)) {
      for (const goalTopic of data.data.goalTopic) {
        const newGoalId = goalMapping[goalTopic.goalId]
        const newTopicId = topicMapping[goalTopic.topicId]
        if (newGoalId && newTopicId) {
          goalTopic.goalId = newGoalId
          goalTopic.topicId = newTopicId
          results.updated.goalTopics++
        }
      }
    }

    // Update goal template topics
    if (data.data.goalTemplateTopic && Array.isArray(data.data.goalTemplateTopic)) {
      for (const goalTemplateTopic of data.data.goalTemplateTopic) {
        const newTemplateId = goalTemplateMapping[goalTemplateTopic.goalTemplateId]
        const newTopicId = topicMapping[goalTemplateTopic.topicId]
        if (newTemplateId && newTopicId) {
          goalTemplateTopic.goalTemplateId = newTemplateId
          goalTemplateTopic.topicId = newTopicId
          results.updated.goalTemplateTopics++
        }
      }
    }

    // Update vacancy topics
    if (data.data.vacancyTopic && Array.isArray(data.data.vacancyTopic)) {
      for (const vacancyTopic of data.data.vacancyTopic) {
        const newVacancyId = vacancyMapping[vacancyTopic.vacancyId]
        const newTopicId = topicMapping[vacancyTopic.topicId]
        if (newVacancyId && newTopicId) {
          vacancyTopic.vacancyId = newVacancyId
          vacancyTopic.topicId = newTopicId
          results.updated.vacancyTopics++
        }
      }
    }

    // Update student topics
    if (data.data.studentTopic && Array.isArray(data.data.studentTopic)) {
      for (const studentTopic of data.data.studentTopic) {
        const newUserId = userMapping[studentTopic.userId]
        const newTopicId = topicMapping[studentTopic.topicId]
        const newValidatorId = studentTopic.validatedBy ? userMapping[studentTopic.validatedBy] : null
        if (newUserId && newTopicId) {
          studentTopic.userId = newUserId
          studentTopic.topicId = newTopicId
          if (studentTopic.validatedBy && newValidatorId) {
            studentTopic.validatedBy = newValidatorId
          }
          results.updated.studentTopics++
        }
      }
    }

    // Update course enrollments
    if (data.data.courseEnrollment && Array.isArray(data.data.courseEnrollment)) {
      for (const enrollment of data.data.courseEnrollment) {
        const newCourseId = courseMapping[enrollment.courseId]
        const newStudentId = userMapping[enrollment.studentId]
        if (newCourseId && newStudentId) {
          enrollment.courseId = newCourseId
          enrollment.studentId = newStudentId
          results.updated.courseEnrollments++
        }
      }
    }

    // Write the updated backup file
    const updatedBackupContent = JSON.stringify(data, null, 2)
    fs.writeFileSync(backupPath, updatedBackupContent, 'utf8')

    return NextResponse.json({
      success: true,
      message: 'Backup IDs synchronized successfully! All IDs now match current database.',
      results
    })

  } catch (error) {
    console.error('Sync backup IDs error:', error)
    return NextResponse.json({
      success: false,
      error: `ID synchronization failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    }, { status: 500 })
  }
}