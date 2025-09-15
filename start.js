#!/usr/bin/env node

const { execSync } = require('child_process');

console.log('🚀 Starting Point Educational Platform...');

// Run database migrations
try {
  console.log('📦 Running database migrations...');
  execSync('npx prisma migrate deploy', { stdio: 'inherit' });
  console.log('✅ Database migrations completed');
} catch (error) {
  console.log('⚠️  Migration failed, continuing anyway:', error.message);
}

// Seed database if empty
try {
  console.log('🌱 Seeding database if needed...');
  execSync('node create-mock-data.js', { stdio: 'inherit' });
  console.log('✅ Database seeded');
} catch (error) {
  console.log('⚠️  Seeding skipped:', error.message);
}

// Start the application
console.log('🎯 Starting Next.js server...');
execSync('next start', { stdio: 'inherit' });