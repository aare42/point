const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  console.log('Creating mock data...')

  // Create or find educator users
  const educator1 = await prisma.user.upsert({
    where: { email: 'educator1@example.com' },
    update: {},
    create: {
      email: 'educator1@example.com',
      name: 'Dr. Sarah Johnson',
      role: 'EDITOR',
    },
  })

  const educator2 = await prisma.user.upsert({
    where: { email: 'educator2@example.com' },
    update: {},
    create: {
      email: 'educator2@example.com',
      name: 'Prof. Michael Chen',
      role: 'EDITOR',
    },
  })

  console.log('Created educators')

  // Create topics
  const topics = await Promise.all([
    prisma.topic.create({
      data: {
        name: 'HTML Basics',
        slug: 'html-basics',
        type: 'THEORY',
        keypoints: JSON.stringify(['Tags and elements', 'Document structure', 'Semantic HTML']),
        description: 'Learn the fundamentals of HTML markup language',
        authorId: educator1.id,
      },
    }),
    prisma.topic.create({
      data: {
        name: 'CSS Fundamentals',
        slug: 'css-fundamentals',
        type: 'THEORY',
        keypoints: JSON.stringify(['Selectors', 'Properties', 'Box model', 'Flexbox']),
        description: 'Master CSS styling and layout techniques',
        authorId: educator1.id,
      },
    }),
    prisma.topic.create({
      data: {
        name: 'JavaScript Basics',
        slug: 'javascript-basics',
        type: 'THEORY',
        keypoints: JSON.stringify(['Variables', 'Functions', 'DOM manipulation', 'Events']),
        description: 'Introduction to JavaScript programming',
        authorId: educator1.id,
      },
    }),
    prisma.topic.create({
      data: {
        name: 'React Fundamentals',
        slug: 'react-fundamentals',
        type: 'THEORY',
        keypoints: JSON.stringify(['Components', 'Props', 'State', 'Hooks']),
        description: 'Learn React.js library for building user interfaces',
        authorId: educator2.id,
      },
    }),
    prisma.topic.create({
      data: {
        name: 'Build a Todo App',
        slug: 'build-todo-app',
        type: 'PROJECT',
        keypoints: JSON.stringify(['CRUD operations', 'State management', 'User interface']),
        description: 'Create a complete todo application using React',
        authorId: educator2.id,
      },
    }),
    prisma.topic.create({
      data: {
        name: 'Web Development Practice',
        slug: 'web-dev-practice',
        type: 'PRACTICE',
        keypoints: JSON.stringify(['Coding exercises', 'Problem solving', 'Best practices']),
        description: 'Hands-on practice with web development concepts',
        authorId: educator1.id,
      },
    }),
  ])

  console.log('Created topics')

  // Create topic prerequisites
  await prisma.topicPrerequisite.createMany({
    data: [
      { topicId: topics[1].id, prerequisiteId: topics[0].id }, // CSS requires HTML
      { topicId: topics[2].id, prerequisiteId: topics[0].id }, // JS requires HTML
      { topicId: topics[3].id, prerequisiteId: topics[2].id }, // React requires JS
      { topicId: topics[4].id, prerequisiteId: topics[3].id }, // Todo app requires React
      { topicId: topics[5].id, prerequisiteId: topics[1].id }, // Practice requires CSS
    ],
  })

  console.log('Created topic prerequisites')

  // Create courses
  const courses = await Promise.all([
    prisma.course.create({
      data: {
        name: 'Complete Web Development Bootcamp',
        description: 'Learn HTML, CSS, and JavaScript from scratch to build modern web applications',
        educatorId: educator1.id,
        topics: {
          create: [
            { topicId: topics[0].id },
            { topicId: topics[1].id },
            { topicId: topics[2].id },
            { topicId: topics[5].id },
          ],
        },
      },
    }),
    prisma.course.create({
      data: {
        name: 'React Development Mastery',
        description: 'Master React.js by building real-world projects and understanding core concepts',
        educatorId: educator2.id,
        topics: {
          create: [
            { topicId: topics[3].id },
            { topicId: topics[4].id },
          ],
        },
      },
    }),
    prisma.course.create({
      data: {
        name: 'Frontend Fundamentals',
        description: 'Essential skills for frontend development including HTML, CSS, and basic JavaScript',
        educatorId: educator1.id,
        topics: {
          create: [
            { topicId: topics[0].id },
            { topicId: topics[1].id },
          ],
        },
      },
    }),
  ])

  console.log('Created courses')
  console.log('Mock data created successfully!')
  
  console.log('\nSummary:')
  console.log(`- Created ${topics.length} topics`)
  console.log(`- Created ${courses.length} courses`)
  console.log('- Created 2 educator accounts')
  console.log('- Set up topic prerequisites')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })