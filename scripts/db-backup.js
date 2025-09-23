#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function createBackup() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = path.join(__dirname, '..', 'db-backups');
  
  // Create backup directory if it doesn't exist
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  console.log('🔄 Creating database backup...');

  try {
    const backup = {
      timestamp,
      version: process.env.npm_package_version || '1.0.0',
      data: {}
    };

    // Export all tables
    const tables = [
      'user',
      'topic', 
      'topicPrerequisite',
      'studentTopic',
      'course',
      'courseEnrollment',
      'courseTopic',
      'goal',
      'goalTopic',
      'goalTemplate',
      'goalTemplateTopic',
      'vacancy',
      'vacancyTopic'
    ];

    for (const table of tables) {
      try {
        const data = await prisma[table].findMany();
        backup.data[table] = data;
        console.log(`✅ Exported ${data.length} records from ${table}`);
      } catch (error) {
        console.log(`⚠️  Skipped ${table}: ${error.message}`);
        backup.data[table] = [];
      }
    }

    // Save backup file
    const filename = `backup-${timestamp}.json`;
    const filepath = path.join(backupDir, filename);
    fs.writeFileSync(filepath, JSON.stringify(backup, null, 2));

    console.log(`💾 Backup saved: ${filename}`);
    console.log(`📁 Location: ${filepath}`);
    
    // Create latest backup symlink
    const latestPath = path.join(backupDir, 'latest.json');
    if (fs.existsSync(latestPath)) {
      fs.unlinkSync(latestPath);
    }
    fs.writeFileSync(latestPath, JSON.stringify(backup, null, 2));
    
    return filename;
  } catch (error) {
    console.error('❌ Backup failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  createBackup().catch(console.error);
}

module.exports = { createBackup };