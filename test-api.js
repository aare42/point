#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testTopicsAPI() {
  try {
    console.log('🔍 Testing topics API query...');
    
    // This mimics what the API endpoint does
    const topics = await prisma.topic.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        type: true,
        description: true,
        keypoints: true,
        prerequisites: {
          select: {
            prerequisite: {
              select: {
                id: true,
                name: true,
                slug: true,
                type: true
              }
            }
          }
        }
      }
    });

    console.log(`📊 Found ${topics.length} topics in database`);
    
    if (topics.length > 0) {
      console.log('\n📚 First 5 topics:');
      topics.slice(0, 5).forEach((topic, index) => {
        console.log(`${index + 1}. ${topic.name} (${topic.type})`);
        console.log(`   ID: ${topic.id}, Slug: ${topic.slug}`);
        console.log(`   Prerequisites: ${topic.prerequisites.length}`);
      });

      console.log('\n🔗 Topics with prerequisites:');
      const topicsWithPrereqs = topics.filter(t => t.prerequisites.length > 0);
      console.log(`Found ${topicsWithPrereqs.length} topics with prerequisites`);
      
      topicsWithPrereqs.slice(0, 3).forEach(topic => {
        console.log(`• ${topic.name}:`);
        topic.prerequisites.forEach(p => {
          console.log(`  → ${p.prerequisite.name}`);
        });
      });
    }

    // Also check what a student topic query would return
    console.log('\n👤 Checking student topics (with default status)...');
    const studentTopics = await prisma.topic.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        type: true,
        description: true,
        keypoints: true,
        prerequisites: {
          select: {
            prerequisite: {
              select: {
                id: true,
                name: true,
                slug: true,
                type: true
              }
            }
          }
        }
      }
    });

    // Add default status to each topic (mimicking the API)
    const topicsWithStatus = studentTopics.map(topic => ({
      ...topic,
      status: 'NOT_LEARNED' // Default status when no student topic exists
    }));

    console.log(`📊 Topics with status: ${topicsWithStatus.length}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

testTopicsAPI();