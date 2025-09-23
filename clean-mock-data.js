#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function cleanMockData() {
  try {
    console.log('🧹 Cleaning mock topics created by System Admin...');
    
    // Find System Admin user
    const systemAdmin = await prisma.user.findUnique({
      where: { email: 'admin@example.com' }
    });

    if (!systemAdmin) {
      console.log('ℹ️  No System Admin user found, nothing to clean');
      return;
    }

    // Find topics created by System Admin (mock data)
    const mockTopics = await prisma.topic.findMany({
      where: { authorId: systemAdmin.id },
      select: { id: true, name: true }
    });

    console.log(`📊 Found ${mockTopics.length} mock topics to delete`);

    if (mockTopics.length > 0) {
      // Delete prerequisites first (foreign key constraints)
      console.log('🔗 Deleting topic prerequisites...');
      const mockTopicIds = mockTopics.map(t => t.id);
      
      await prisma.topicPrerequisite.deleteMany({
        where: {
          OR: [
            { topicId: { in: mockTopicIds } },
            { prerequisiteId: { in: mockTopicIds } }
          ]
        }
      });

      // Delete the topics
      console.log('📚 Deleting mock topics...');
      const result = await prisma.topic.deleteMany({
        where: { authorId: systemAdmin.id }
      });

      console.log(`✅ Deleted ${result.count} mock topics`);
      
      // List deleted topics
      mockTopics.forEach(topic => {
        console.log(`   • ${topic.name}`);
      });

      // Show remaining count
      const remainingCount = await prisma.topic.count();
      console.log(`📊 Remaining topics: ${remainingCount}`);
    }

  } catch (error) {
    console.error('❌ Error cleaning mock data:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

cleanMockData();