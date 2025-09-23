const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function checkAndUpdateUserRole() {
  try {
    // Get all users
    const users = await prisma.user.findMany({
      select: { id: true, email: true, name: true, role: true }
    })
    
    console.log('Current users in database:')
    users.forEach(user => {
      console.log(`ID: ${user.id}, Email: ${user.email}, Name: ${user.name}, Role: ${user.role}`)
    })

    // If there are users without ADMIN role, promote the first one
    const adminUsers = users.filter(user => user.role === 'ADMIN')
    
    if (adminUsers.length === 0 && users.length > 0) {
      console.log('\nNo admin users found. Promoting first user to ADMIN...')
      const firstUser = users[0]
      
      const updatedUser = await prisma.user.update({
        where: { id: firstUser.id },
        data: { role: 'ADMIN' },
        select: { id: true, email: true, name: true, role: true }
      })
      
      console.log('Updated user:', updatedUser)
    } else if (adminUsers.length > 0) {
      console.log('\nAdmin users found:', adminUsers.length)
    } else {
      console.log('\nNo users found in database')
    }

  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkAndUpdateUserRole()