import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createMultilingualText } from '@/lib/utils/multilingual'

export async function POST(request: NextRequest) {
  try {
    // Check authentication and admin role
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const data = await request.json()
    
    // Validate JSON structure
    if (!data.data || typeof data.data !== 'object') {
      return NextResponse.json({ error: 'Invalid JSON format - missing data object' }, { status: 400 })
    }

    let importedCount = 0
    const results = []

    // Create user mapping for ID translation
    const userMapping: Record<string, string> = {}
    // Create topic mapping for ID translation
    const topicMapping: Record<string, string> = {}
    // Create course mapping for ID translation
    const courseMapping: Record<string, string> = {}
    
    // Get all existing users to use as fallback
    const allUsers = await prisma.user.findMany({
      select: { id: true, email: true }
    })

    // Import Users first (if any) - Use email as key, not ID
    if (data.data.user && Array.isArray(data.data.user)) {
      try {
        for (const importUser of data.data.user) {
          // Check if user already exists by email
          const existingUser = await prisma.user.findUnique({
            where: { email: importUser.email }
          })
          
          if (!existingUser) {
            // Create new user but let Prisma generate the ID
            const userData = {
              email: importUser.email,
              name: importUser.name,
              role: importUser.role || 'USER',
              image: importUser.image,
              isBlocked: importUser.isBlocked ?? false // Default to false for old exports
              // Don't include the old ID - let Prisma generate a new one
            }
            const newUser = await prisma.user.create({ data: userData })
            userMapping[importUser.id] = newUser.id
            importedCount++
          } else {
            // User exists, map old ID to existing ID
            userMapping[importUser.id] = existingUser.id
            
            // Update role if the imported user has a higher role
            if (importUser.role === 'ADMIN' && existingUser.role !== 'ADMIN') {
              await prisma.user.update({
                where: { id: existingUser.id },
                data: { role: 'ADMIN' }
              })
            } else if (importUser.role === 'EDITOR' && existingUser.role === 'USER') {
              await prisma.user.update({
                where: { id: existingUser.id },
                data: { role: 'EDITOR' }
              })
            }
          }
        }
        results.push(`${data.data.user.length} users processed`)
      } catch (error) {
        results.push(`Users import failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }

    // Import Topics
    if (data.data.topic && Array.isArray(data.data.topic)) {
      try {
        for (const topic of data.data.topic) {
          try {
            // Check if topic already exists
            const existingTopic = await prisma.topic.findUnique({
              where: { slug: topic.slug }
            })
            
            if (!existingTopic) {
              console.log(`Processing topic: ${topic.name} (slug: ${topic.slug})`)
              
              // Transform old string format to new multilingual format
              const transformedTopic = {
                ...topic,
                name: typeof topic.name === 'string' 
                  ? JSON.stringify(createMultilingualText(topic.name))
                  : JSON.stringify(topic.name),
                description: topic.description 
                  ? (typeof topic.description === 'string' 
                      ? JSON.stringify(createMultilingualText(topic.description))
                      : JSON.stringify(topic.description))
                  : null,
                keypoints: typeof topic.keypoints === 'string' 
                  ? JSON.stringify(createMultilingualText(topic.keypoints))
                  : JSON.stringify(topic.keypoints),
                // Use current admin user's ID if authorId is invalid
                authorId: session.user.id!
              }
              
              // Store the old ID before removing it
              const oldTopicId = topic.id
              // Remove old ID to let Prisma generate new one
              delete transformedTopic.id
              
              console.log(`Creating topic with data:`, transformedTopic)
              
              const newTopic = await prisma.topic.create({ data: transformedTopic })
              // Map old ID to new ID
              topicMapping[oldTopicId] = newTopic.id
              importedCount++
              
              console.log(`Successfully created topic: ${newTopic.id}`)
            } else {
              // Topic exists, map old ID to existing ID
              topicMapping[topic.id] = existingTopic.id
              console.log(`Topic already exists: ${topic.slug}`)
            }
          } catch (topicError) {
            console.error(`Failed to import individual topic ${topic.slug}:`, topicError)
            results.push(`Topic ${topic.slug} failed: ${topicError instanceof Error ? topicError.message : 'Unknown error'}`)
          }
        }
        results.push(`${data.data.topic.length} topics processed`)
      } catch (error) {
        console.error('Topics import failed:', error)
        results.push(`Topics import failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }

    // Import Topic Prerequisites (after all topics exist)
    if (data.data.topicPrerequisite && Array.isArray(data.data.topicPrerequisite)) {
      try {
        for (const prereq of data.data.topicPrerequisite) {
          // Map old IDs to new IDs
          const newTopicId = topicMapping[prereq.topicId]
          const newPrerequisiteId = topicMapping[prereq.prerequisiteId]
          
          // Skip if either topic doesn't exist in our mapping
          if (!newTopicId || !newPrerequisiteId) {
            continue
          }
          
          // Check if prerequisite relationship already exists
          const existing = await prisma.topicPrerequisite.findUnique({
            where: {
              topicId_prerequisiteId: {
                topicId: newTopicId,
                prerequisiteId: newPrerequisiteId
              }
            }
          })
          
          if (!existing) {
            await prisma.topicPrerequisite.create({ 
              data: {
                topicId: newTopicId,
                prerequisiteId: newPrerequisiteId
              }
            })
            importedCount++
          }
        }
        results.push(`${data.data.topicPrerequisite.length} prerequisites processed`)
      } catch (error) {
        results.push(`Prerequisites import failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }

    // Import Courses
    if (data.data.course && Array.isArray(data.data.course)) {
      try {
        for (const course of data.data.course) {
          // Check if course already exists by name+educator (since we'll have new IDs)
          const existingCourse = await prisma.course.findFirst({
            where: { 
              name: typeof course.name === 'string' ? course.name : JSON.stringify(course.name),
              educatorId: userMapping[course.educatorId] || allUsers[0]?.id
            }
          })
          
          if (!existingCourse) {
            // Transform course data  
            const transformedCourse = {
              name: typeof course.name === 'string' 
                ? course.name 
                : (course.name?.uk || course.name?.en || JSON.stringify(course.name)),
              description: course.description 
                ? (typeof course.description === 'string' 
                    ? course.description 
                    : (course.description?.uk || course.description?.en || JSON.stringify(course.description)))
                : null,
              isPublic: course.isPublic ?? true,
              isBlocked: course.isBlocked ?? false, // Default to false for old exports
              educatorId: userMapping[course.educatorId] || allUsers[0]?.id,
              createdAt: new Date(course.createdAt),
              updatedAt: new Date(course.updatedAt)
            }
            
            const newCourse = await prisma.course.create({ data: transformedCourse })
            // Map old course ID to new course ID
            courseMapping[course.id] = newCourse.id
            importedCount++
          } else {
            // Course exists, map old ID to existing ID
            courseMapping[course.id] = existingCourse.id
          }
        }
        results.push(`${data.data.course.length} courses processed`)
      } catch (error) {
        results.push(`Courses import failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }

    // Import Goal Templates
    if (data.data.goalTemplate && Array.isArray(data.data.goalTemplate)) {
      try {
        for (const template of data.data.goalTemplate) {
          // Check if template already exists by name+author
          const existingTemplate = await prisma.goalTemplate.findFirst({
            where: { 
              name: typeof template.name === 'string' ? template.name : JSON.stringify(template.name),
              authorId: userMapping[template.authorId] || allUsers[0]?.id
            }
          })
          
          if (!existingTemplate) {
            // Transform template data
            const transformedTemplate = {
              name: typeof template.name === 'string' 
                ? template.name 
                : (template.name?.uk || template.name?.en || JSON.stringify(template.name)),
              description: template.description 
                ? (typeof template.description === 'string' 
                    ? template.description 
                    : (template.description?.uk || template.description?.en || JSON.stringify(template.description)))
                : null,
              motto: template.motto 
                ? (typeof template.motto === 'string' 
                    ? template.motto 
                    : (template.motto?.uk || template.motto?.en || JSON.stringify(template.motto)))
                : null,
              authorId: userMapping[template.authorId] || allUsers[0]?.id,
              createdAt: new Date(template.createdAt),
              updatedAt: new Date(template.updatedAt)
            }
            
            await prisma.goalTemplate.create({ data: transformedTemplate })
            importedCount++
          }
        }
        results.push(`${data.data.goalTemplate.length} goal templates processed`)
      } catch (error) {
        results.push(`Goal templates import failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }

    // Import Vacancies  
    if (data.data.vacancy && Array.isArray(data.data.vacancy)) {
      try {
        for (const vacancy of data.data.vacancy) {
          // Check if vacancy already exists by name+author
          const existingVacancy = await prisma.vacancy.findFirst({
            where: { 
              name: typeof vacancy.name === 'string' ? vacancy.name : JSON.stringify(vacancy.name),
              authorId: userMapping[vacancy.authorId] || allUsers[0]?.id
            }
          })
          
          if (!existingVacancy) {
            // Transform vacancy data
            const transformedVacancy = {
              name: typeof vacancy.name === 'string' 
                ? vacancy.name 
                : (vacancy.name?.uk || vacancy.name?.en || JSON.stringify(vacancy.name)),
              authorId: userMapping[vacancy.authorId] || allUsers[0]?.id,
              createdAt: new Date(vacancy.createdAt),
              updatedAt: new Date(vacancy.updatedAt)
            }
            
            await prisma.vacancy.create({ data: transformedVacancy })
            importedCount++
          }
        }
        results.push(`${data.data.vacancy.length} vacancies processed`)
      } catch (error) {
        results.push(`Vacancies import failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }

    // Import Goals
    if (data.data.goal && Array.isArray(data.data.goal)) {
      try {
        for (const goal of data.data.goal) {
          // Check if goal already exists by name+userId (since we'll have new IDs)
          const mappedUserId = userMapping[goal.userId] || allUsers[0]?.id
          if (!mappedUserId) continue // Skip if no valid user
          
          const existingGoal = await prisma.goal.findFirst({
            where: { 
              name: typeof goal.name === 'string' ? goal.name : JSON.stringify(goal.name),
              userId: mappedUserId
            }
          })
          
          if (!existingGoal) {
            // Transform goal data with proper user mapping
            const transformedGoal = {
              name: typeof goal.name === 'string' 
                ? goal.name 
                : (goal.name?.uk || goal.name?.en || JSON.stringify(goal.name)),
              description: goal.description 
                ? (typeof goal.description === 'string' 
                    ? goal.description 
                    : (goal.description?.uk || goal.description?.en || JSON.stringify(goal.description)))
                : null,
              motto: goal.motto || null,
              deadline: goal.deadline ? new Date(goal.deadline) : null,
              userId: mappedUserId,
              goalTemplateId: goal.goalTemplateId, // This should be handled separately if needed
              createdAt: new Date(goal.createdAt),
              updatedAt: new Date(goal.updatedAt)
            }
            
            await prisma.goal.create({ data: transformedGoal })
            importedCount++
          }
        }
        results.push(`${data.data.goal.length} goals processed`)
      } catch (error) {
        results.push(`Goals import failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }

    // Import Student Topics (user-topic learning status)
    if (data.data.studentTopic && Array.isArray(data.data.studentTopic)) {
      try {
        for (const studentTopic of data.data.studentTopic) {
          const mappedUserId = userMapping[studentTopic.userId] || allUsers[0]?.id
          const mappedTopicId = topicMapping[studentTopic.topicId]
          
          // Skip if user or topic doesn't exist
          if (!mappedUserId || !mappedTopicId) continue
          
          const existing = await prisma.studentTopic.findUnique({
            where: {
              userId_topicId: {
                userId: mappedUserId,
                topicId: mappedTopicId
              }
            }
          })
          
          if (!existing) {
            const transformedStudentTopic = {
              userId: mappedUserId,
              topicId: mappedTopicId,
              status: studentTopic.status,
              createdAt: studentTopic.createdAt ? new Date(studentTopic.createdAt) : new Date(),
              updatedAt: studentTopic.updatedAt ? new Date(studentTopic.updatedAt) : new Date(),
              validatedBy: studentTopic.validatedById ? userMapping[studentTopic.validatedById] : null
            }
            await prisma.studentTopic.create({ data: transformedStudentTopic })
            importedCount++
          }
        }
        results.push(`${data.data.studentTopic.length} student topics processed`)
      } catch (error) {
        results.push(`Student topics import failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }

    // Import Course Topics (junction table for course-topic relationships)
    if (data.data.courseTopic && Array.isArray(data.data.courseTopic)) {
      try {
        for (const courseTopic of data.data.courseTopic) {
          const mappedCourseId = courseMapping[courseTopic.courseId]
          const mappedTopicId = topicMapping[courseTopic.topicId]
          
          // Skip if course or topic doesn't exist in our mappings
          if (!mappedCourseId || !mappedTopicId) continue
          
          const existing = await prisma.courseTopic.findUnique({
            where: {
              courseId_topicId: {
                courseId: mappedCourseId,
                topicId: mappedTopicId
              }
            }
          })
          
          if (!existing) {
            const transformedCourseTopic = {
              courseId: mappedCourseId,
              topicId: mappedTopicId
            }
            await prisma.courseTopic.create({ data: transformedCourseTopic })
            importedCount++
          }
        }
        results.push(`${data.data.courseTopic.length} course topics processed`)
      } catch (error) {
        results.push(`Course topics import failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }

    // Import Course Enrollments
    if (data.data.courseEnrollment && Array.isArray(data.data.courseEnrollment)) {
      try {
        for (const enrollment of data.data.courseEnrollment) {
          const mappedUserId = userMapping[enrollment.userId] || allUsers[0]?.id
          const mappedCourseId = courseMapping[enrollment.courseId]
          
          // Skip if user or course doesn't exist
          if (!mappedUserId || !mappedCourseId) continue
          
          const existing = await prisma.courseEnrollment.findUnique({
            where: {
              courseId_studentId: {
                studentId: mappedUserId,
                courseId: mappedCourseId
              }
            }
          })
          
          if (!existing) {
            const transformedEnrollment = {
              courseId: mappedCourseId,
              studentId: mappedUserId,
              enrolledAt: enrollment.enrolledAt ? new Date(enrollment.enrolledAt) : new Date()
            }
            await prisma.courseEnrollment.create({ data: transformedEnrollment })
            importedCount++
          }
        }
        results.push(`${data.data.courseEnrollment.length} course enrollments processed`)
      } catch (error) {
        results.push(`Course enrollments import failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }

    // Import Goal Topics
    if (data.data.goalTopic && Array.isArray(data.data.goalTopic)) {
      try {
        for (const goalTopic of data.data.goalTopic) {
          // We would need to map goal IDs here if we're creating new goals
          // For now, skip this if the goal doesn't exist
          const goalExists = await prisma.goal.findUnique({
            where: { id: goalTopic.goalId }
          })
          
          if (goalExists) {
            const existing = await prisma.goalTopic.findUnique({
              where: {
                goalId_topicId: {
                  goalId: goalTopic.goalId,
                  topicId: goalTopic.topicId
                }
              }
            })
            
            if (!existing) {
              await prisma.goalTopic.create({ data: goalTopic })
              importedCount++
            }
          }
        }
        results.push(`${data.data.goalTopic.length} goal topics processed`)
      } catch (error) {
        results.push(`Goal topics import failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }

    return NextResponse.json({
      message: `Import completed. ${importedCount} new records created. ${results.join(', ')}`
    })

  } catch (error) {
    console.error('Import error:', error)
    return NextResponse.json(
      { error: `Import failed: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    )
  }
}