#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkAllTopics() {
  try {
    const topics = await prisma.topic.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        type: true,
        author: {
          select: {
            name: true,
            email: true
          }
        },
        createdAt: true
      },
      orderBy: {
        createdAt: 'asc'
      }
    });

    console.log(`📊 Total topics: ${topics.length}`);
    console.log('\n📚 All topics by creation date:');
    
    topics.forEach((topic, index) => {
      const date = new Date(topic.createdAt).toISOString().split('T')[0];
      console.log(`${index + 1}. ${topic.name} (${topic.type})`);
      console.log(`   Author: ${topic.author.name} (${topic.author.email})`);
      console.log(`   Created: ${date}`);
      console.log(`   ID: ${topic.id}`);
      console.log('');
    });

    // Group by author
    const byAuthor = topics.reduce((acc, topic) => {
      const authorName = topic.author.name;
      if (!acc[authorName]) acc[authorName] = [];
      acc[authorName].push(topic);
      return acc;
    }, {});

    console.log('\n👥 Topics by author:');
    Object.entries(byAuthor).forEach(([author, authorTopics]) => {
      console.log(`${author}: ${authorTopics.length} topics`);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkAllTopics();