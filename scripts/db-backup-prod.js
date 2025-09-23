#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

// Use production database URL
const prodDatabaseUrl = "postgresql://postgres:iVxNFTfEIEIrZnEOBVMKoKAGVKeDsIVU@viaduct.proxy.rlwy.net:21747/railway";

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: prodDatabaseUrl
    }
  }
});

async function createProductionBackup() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = path.join(__dirname, '..', 'db-backups');
  
  // Create backup directory if it doesn't exist
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  console.log('🔄 Creating PRODUCTION database backup...');
  console.log('🌐 Connecting to Railway PostgreSQL...');

  try {
    const backup = {
      timestamp,
      source: 'production-railway',
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
    const filename = `backup-prod-${timestamp}.json`;
    const filepath = path.join(backupDir, filename);
    fs.writeFileSync(filepath, JSON.stringify(backup, null, 2));

    console.log(`💾 Production backup saved: ${filename}`);
    console.log(`📁 Location: ${filepath}`);
    
    // Create production latest backup
    const latestProdPath = path.join(backupDir, 'latest-prod.json');
    if (fs.existsSync(latestProdPath)) {
      fs.unlinkSync(latestProdPath);
    }
    fs.writeFileSync(latestProdPath, JSON.stringify(backup, null, 2));
    
    return filename;
  } catch (error) {
    console.error('❌ Production backup failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  createProductionBackup().catch(console.error);
}

module.exports = { createProductionBackup };