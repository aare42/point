const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  console.log('Creating 30 mockup topics for matrix testing...')

  // Get the first educator (assuming it exists from previous scripts)
  let educator = await prisma.user.findFirst({
    where: { 
      role: 'USER',
      educatedCourses: {
        some: {}
      }
    }
  })

  // If no educator found, just use the first user
  if (!educator) {
    educator = await prisma.user.findFirst({
      where: { role: 'USER' }
    })
  }

  if (!educator) {
    console.error('No educator found. Please run the previous scripts first.')
    return
  }

  console.log(`Found educator: ${educator.name} (${educator.email})`)

  // Create 30 diverse topics
  const topicData = [
    { name: 'HTML Fundamentals', type: 'THEORY', keypoints: ['Elements', 'Attributes', 'Document structure'] },
    { name: 'CSS Basics', type: 'THEORY', keypoints: ['Selectors', 'Properties', 'Box model'] },
    { name: 'JavaScript Variables', type: 'THEORY', keypoints: ['var, let, const', 'Scope', 'Hoisting'] },
    { name: 'DOM Manipulation', type: 'PRACTICE', keypoints: ['querySelector', 'Event listeners', 'Element creation'] },
    { name: 'Responsive Design', type: 'PRACTICE', keypoints: ['Media queries', 'Flexbox', 'Grid'] },
    { name: 'REST API Concepts', type: 'THEORY', keypoints: ['HTTP methods', 'Status codes', 'JSON'] },
    { name: 'Fetch API Usage', type: 'PRACTICE', keypoints: ['GET requests', 'POST requests', 'Error handling'] },
    { name: 'React Components', type: 'THEORY', keypoints: ['JSX', 'Props', 'State'] },
    { name: 'React Hooks', type: 'PRACTICE', keypoints: ['useState', 'useEffect', 'Custom hooks'] },
    { name: 'Node.js Setup', type: 'PRACTICE', keypoints: ['npm init', 'Dependencies', 'Scripts'] },
    { name: 'Express.js Routing', type: 'PRACTICE', keypoints: ['Routes', 'Middleware', 'Parameters'] },
    { name: 'Database Design', type: 'THEORY', keypoints: ['Tables', 'Relationships', 'Normalization'] },
    { name: 'SQL Queries', type: 'PRACTICE', keypoints: ['SELECT', 'JOIN', 'WHERE clauses'] },
    { name: 'Git Version Control', type: 'PRACTICE', keypoints: ['Commits', 'Branches', 'Merging'] },
    { name: 'Testing Fundamentals', type: 'THEORY', keypoints: ['Unit tests', 'Integration tests', 'Mocking'] },
    { name: 'Jest Testing', type: 'PRACTICE', keypoints: ['Test suites', 'Assertions', 'Mocking'] },
    { name: 'CSS Animations', type: 'PRACTICE', keypoints: ['Transitions', 'Keyframes', 'Transform'] },
    { name: 'Webpack Configuration', type: 'PRACTICE', keypoints: ['Entry points', 'Loaders', 'Plugins'] },
    { name: 'TypeScript Basics', type: 'THEORY', keypoints: ['Types', 'Interfaces', 'Generics'] },
    { name: 'Async Programming', type: 'THEORY', keypoints: ['Promises', 'async/await', 'Error handling'] },
    { name: 'Web Security', type: 'THEORY', keypoints: ['XSS', 'CSRF', 'Authentication'] },
    { name: 'Performance Optimization', type: 'PRACTICE', keypoints: ['Minification', 'Lazy loading', 'Caching'] },
    { name: 'Docker Containers', type: 'PRACTICE', keypoints: ['Images', 'Containers', 'Dockerfile'] },
    { name: 'Cloud Deployment', type: 'PRACTICE', keypoints: ['Hosting', 'Environment variables', 'CI/CD'] },
    { name: 'Mobile Responsive', type: 'PRACTICE', keypoints: ['Touch events', 'Viewport', 'Progressive web apps'] },
    { name: 'State Management', type: 'THEORY', keypoints: ['Redux', 'Context API', 'Local storage'] },
    { name: 'GraphQL Queries', type: 'PRACTICE', keypoints: ['Schema', 'Resolvers', 'Mutations'] },
    { name: 'Accessibility (A11Y)', type: 'THEORY', keypoints: ['ARIA', 'Screen readers', 'Keyboard navigation'] },
    { name: 'Code Review Process', type: 'THEORY', keypoints: ['Pull requests', 'Code quality', 'Best practices'] },
    { name: 'Final Web Application', type: 'PROJECT', keypoints: ['Full-stack app', 'Deployment', 'Documentation'] }
  ]

  console.log('Creating topics...')
  const createdTopics = []
  
  for (const topicInfo of topicData) {
    const topic = await prisma.topic.create({
      data: {
        name: topicInfo.name,
        slug: topicInfo.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
        type: topicInfo.type,
        keypoints: JSON.stringify(topicInfo.keypoints),
        authorId: educator.id
      }
    })
    createdTopics.push(topic)
    console.log(`✓ Created topic: ${topic.name}`)
  }

  console.log(`\nCreated ${createdTopics.length} topics`)

  // Create a large course with all topics
  console.log('Creating large test course...')
  const course = await prisma.course.create({
    data: {
      name: 'Full-Stack Web Development Bootcamp',
      description: 'Comprehensive web development course covering frontend, backend, databases, and deployment. Perfect for testing the matrix view with many topics.',
      educatorId: educator.id
    }
  })

  console.log(`✓ Created course: ${course.name}`)

  // Add all topics to the course
  console.log('Adding topics to course...')
  for (const topic of createdTopics) {
    await prisma.courseTopic.create({
      data: {
        courseId: course.id,
        topicId: topic.id
      }
    })
  }

  console.log(`✓ Added ${createdTopics.length} topics to the course`)

  // Get all students
  const students = await prisma.user.findMany({
    where: { 
      role: 'USER',
      email: { contains: '@' },
      id: { not: educator.id } // Exclude the educator
    }
  })

  console.log(`Found ${students.length} students to enroll`)

  // Enroll all students in the course
  console.log('Enrolling students in the large course...')
  let enrolledCount = 0
  
  for (const student of students) {
    try {
      // Create enrollment
      await prisma.courseEnrollment.create({
        data: {
          courseId: course.id,
          studentId: student.id
        }
      })

      // Set all topics to LEARNING status for this student
      const studentTopicPromises = createdTopics.map(topic =>
        prisma.studentTopic.upsert({
          where: {
            userId_topicId: {
              userId: student.id,
              topicId: topic.id
            }
          },
          update: {
            status: 'LEARNING',
            updatedAt: new Date()
          },
          create: {
            userId: student.id,
            topicId: topic.id,
            status: 'LEARNING'
          }
        })
      )

      await Promise.all(studentTopicPromises)

      // Randomly set some topics to LEARNED for variety
      const learnedTopics = createdTopics
        .sort(() => 0.5 - Math.random())
        .slice(0, Math.floor(Math.random() * 15) + 5) // 5-20 learned topics per student

      for (const topic of learnedTopics) {
        await prisma.studentTopic.update({
          where: {
            userId_topicId: {
              userId: student.id,
              topicId: topic.id
            }
          },
          data: {
            status: 'LEARNED',
            updatedAt: new Date()
          }
        })
      }

      enrolledCount++
      console.log(`✓ Enrolled ${student.name} with ${learnedTopics.length} learned topics`)
    } catch (error) {
      console.log(`✗ Failed to enroll ${student.name}:`, error.message)
    }
  }

  console.log(`\n🎉 Large course test setup completed!`)
  console.log(`📚 Course: "${course.name}"`)
  console.log(`📋 Topics: ${createdTopics.length}`)
  console.log(`👥 Enrolled students: ${enrolledCount}`)
  console.log(`🌐 Course URL: http://localhost:3000/educator/courses/${course.id}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })