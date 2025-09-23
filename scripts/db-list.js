#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

function listBackups() {
  const backupDir = path.join(__dirname, '..', 'db-backups');
  
  if (!fs.existsSync(backupDir)) {
    console.log('📁 No backups directory found');
    return;
  }

  const files = fs.readdirSync(backupDir)
    .filter(file => file.endsWith('.json') && file !== 'latest.json')
    .sort()
    .reverse(); // newest first

  if (files.length === 0) {
    console.log('📦 No backups found');
    return;
  }

  console.log('📋 Available backups:');
  console.log('');

  files.forEach((file, index) => {
    const filePath = path.join(backupDir, file);
    const stats = fs.statSync(filePath);
    const size = (stats.size / 1024).toFixed(1);
    
    try {
      const backup = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      const recordCount = Object.values(backup.data || {})
        .reduce((total, table) => total + (table?.length || 0), 0);
      
      console.log(`${index + 1}. ${file}`);
      console.log(`   📅 ${backup.timestamp}`);
      console.log(`   🏷️  Version: ${backup.version}`);
      console.log(`   📊 Records: ${recordCount}`);
      console.log(`   💾 Size: ${size}KB`);
      console.log('');
    } catch (error) {
      console.log(`${index + 1}. ${file} (corrupted)`);
      console.log(`   💾 Size: ${size}KB`);
      console.log('');
    }
  });

  // Show latest info
  const latestPath = path.join(backupDir, 'latest.json');
  if (fs.existsSync(latestPath)) {
    console.log('🔗 Latest backup: latest.json');
  }
}

if (require.main === module) {
  listBackups();
}

module.exports = { listBackups };