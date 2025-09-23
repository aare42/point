#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function restoreBackup(backupFile) {
  console.log('🔄 Restoring database from backup...');

  try {
    // Read backup file
    const backupPath = backupFile.startsWith('/') 
      ? backupFile 
      : path.join(__dirname, '..', 'db-backups', backupFile);

    if (!fs.existsSync(backupPath)) {
      throw new Error(`Backup file not found: ${backupPath}`);
    }

    const backup = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
    console.log(`📅 Backup timestamp: ${backup.timestamp}`);
    console.log(`🏷️  Backup version: ${backup.version}`);

    // Clear existing data (in reverse dependency order)
    const clearOrder = [
      'goalTemplateTopic',
      'goalTopic', 
      'vacancyTopic',
      'courseTopic',
      'courseEnrollment',
      'studentTopic',
      'topicPrerequisite',
      'goal',
      'goalTemplate',
      'vacancy',
      'course',
      'topic',
      'user'
    ];

    console.log('🗑️  Clearing existing data...');
    for (const table of clearOrder) {
      try {
        const result = await prisma[table].deleteMany();
        console.log(`   Cleared ${result.count} records from ${table}`);
      } catch (error) {
        console.log(`   Skipped ${table}: ${error.message}`);
      }
    }

    // Restore data (in dependency order)
    const restoreOrder = [
      'user',
      'topic',
      'topicPrerequisite', 
      'studentTopic',
      'course',
      'courseEnrollment',
      'courseTopic',
      'goalTemplate',
      'goalTemplateTopic',
      'goal',
      'goalTopic',
      'vacancy',
      'vacancyTopic'
    ];

    console.log('📥 Restoring data...');
    for (const table of restoreOrder) {
      const data = backup.data[table] || [];
      if (data.length > 0) {
        try {
          await prisma[table].createMany({ data });
          console.log(`✅ Restored ${data.length} records to ${table}`);
        } catch (error) {
          console.log(`❌ Failed to restore ${table}: ${error.message}`);
        }
      } else {
        console.log(`⚪ No data for ${table}`);
      }
    }

    console.log('✅ Database restore completed!');
  } catch (error) {
    console.error('❌ Restore failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// CLI usage
if (require.main === module) {
  const backupFile = process.argv[2] || 'latest.json';
  restoreBackup(backupFile).catch(console.error);
}

module.exports = { restoreBackup };