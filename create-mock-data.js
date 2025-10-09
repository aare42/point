#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function createMockData() {
  try {
    console.log('🌱 Starting database seeding...');

    // Check if database already has data
    const existingTopicsCount = await prisma.topic.count();
    console.log(`📊 Current topics in database: ${existingTopicsCount}`);

    if (existingTopicsCount > 0) {
      console.log('✅ Database already has data, skipping seeding');
      return;
    }

    // Read production data
    const dataPath = path.join(__dirname, 'public', 'production-data.json');
    if (!fs.existsSync(dataPath)) {
      console.log('⚠️  No production-data.json found, skipping seeding');
      return;
    }

    const rawData = fs.readFileSync(dataPath, 'utf8');
    const productionData = JSON.parse(rawData);

    if (!productionData.topics || !Array.isArray(productionData.topics)) {
      console.log('⚠️  Invalid production data format, skipping seeding');
      return;
    }

    console.log(`📥 Found ${productionData.topics.length} topics to import`);

    // Create a default admin user for topics
    let adminUser = await prisma.user.findFirst({
      where: { role: 'ADMIN' }
    });

    if (!adminUser) {
      // Create a system admin user if none exists
      adminUser = await prisma.user.create({
        data: {
          email: 'system@point.edu',
          name: 'System Admin',
          role: 'ADMIN'
        }
      });
      console.log('👤 Created system admin user');
    }

    // Import topics in transaction
    await prisma.$transaction(async (tx) => {
      const topicMapping = {};

      // First pass: Create all topics without prerequisites
      for (const topicData of productionData.topics) {
        const newTopic = await tx.topic.create({
          data: {
            name: typeof topicData.name === 'string' ? 
              topicData.name : 
              JSON.stringify(topicData.name),
            slug: topicData.slug,
            type: topicData.type,
            description: topicData.description ? (
              typeof topicData.description === 'string' ? 
                topicData.description : 
                JSON.stringify(topicData.description)
            ) : null,
            keypoints: topicData.keypoints ? (
              typeof topicData.keypoints === 'string' ? 
                topicData.keypoints : 
                JSON.stringify(topicData.keypoints)
            ) : null,
            authorId: adminUser.id
          }
        });
        topicMapping[topicData.id] = newTopic.id;
      }

      // Second pass: Create prerequisites
      for (const topicData of productionData.topics) {
        if (topicData.prerequisites && topicData.prerequisites.length > 0) {
          for (const prereq of topicData.prerequisites) {
            const topicId = topicMapping[topicData.id];
            const prerequisiteId = topicMapping[prereq.prerequisiteId];
            
            if (topicId && prerequisiteId) {
              await tx.topicPrerequisite.create({
                data: {
                  topicId,
                  prerequisiteId
                }
              });
            }
          }
        }
      }
    });

    console.log(`✅ Successfully imported ${productionData.topics.length} topics with prerequisites`);

  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  createMockData()
    .then(() => {
      console.log('🎉 Database seeding completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Database seeding failed:', error);
      process.exit(1);
    });
}

module.exports = createMockData;