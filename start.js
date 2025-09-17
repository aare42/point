#!/usr/bin/env node

const { execSync } = require('child_process');

console.log('🚀 Starting Point Educational Platform...');

// Debug Railway environment
try {
  console.log('🔍 Running Railway environment debug...');
  execSync('node debug-railway-env.js', { stdio: 'inherit' });
} catch (error) {
  console.log('⚠️  Debug failed:', error.message);
}

// Set up database schema
try {
  console.log('📦 Setting up database schema...');
  console.log('Database URL:', process.env.DATABASE_URL ? 'Set' : 'Missing');
  
  // Use db push instead of migrate for clean PostgreSQL setup
  execSync('npx prisma db push --accept-data-loss', { stdio: 'inherit' });
  console.log('✅ Database schema created successfully');
} catch (error) {
  console.error('❌ Database setup failed:', error.message);
  process.exit(1); // Exit if database setup fails
}

// Seed database only in development
if (process.env.NODE_ENV === 'development' || process.env.ENABLE_SEEDING === 'true') {
  try {
    console.log('🌱 Seeding database if needed...');
    execSync('node create-mock-data.js', { stdio: 'inherit' });
    console.log('✅ Database seeded');
  } catch (error) {
    console.log('⚠️  Seeding skipped:', error.message);
  }
} else {
  console.log('⏭️  Seeding skipped in production');
}

// Start the application
console.log('🎯 Starting Next.js server...');
execSync('next start', { stdio: 'inherit' });