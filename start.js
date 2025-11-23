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

// Set up database schema safely (no data loss)
try {
  console.log('📦 Setting up database schema...');
  console.log('Database URL:', process.env.DATABASE_URL ? 'Set' : 'Missing');
  
  if (process.env.DATABASE_URL) {
    // Try to apply schema changes without data loss
    try {
      console.log('🔧 Applying safe database schema changes...');
      execSync('npx prisma db push', { stdio: 'inherit' });
      console.log('✅ Database schema updated safely');
    } catch (pushError) {
      console.log('⚠️  Database push failed, continuing anyway:', pushError.message.split('\n')[0]);
      // Continue without failing - existing database might be fine
    }
    
    // Generate Prisma client with current schema
    try {
      console.log('🔧 Generating Prisma client...');
      execSync('npx prisma generate', { stdio: 'inherit' });
      console.log('✅ Prisma client generated successfully');
    } catch (generateError) {
      console.log('⚠️  Prisma generate failed:', generateError.message);
    }
  } else {
    console.log('⚠️  No DATABASE_URL found, skipping database setup');
  }
} catch (error) {
  console.error('❌ Database setup failed:', error.message);
  console.log('🔄 Continuing without database setup - app should still work...');
  // Don't exit - allow the app to start even if DB setup fails
}

// Only seed database if explicitly enabled (not on Railway by default)
const shouldSeed = process.env.NODE_ENV === 'development' || 
                  process.env.ENABLE_SEEDING === 'true';
                  // Removed automatic Railway seeding to preserve production data

if (shouldSeed) {
  try {
    console.log('🌱 Seeding database if needed...');
    execSync('node create-mock-data.js', { stdio: 'inherit' });
    console.log('✅ Database seeded');
  } catch (error) {
    console.log('⚠️  Seeding failed:', error.message);
    console.log('🔄 Continuing without seeding...');
  }
} else {
  console.log('⏭️  Seeding skipped');
}

// Start the application
console.log('🎯 Starting Next.js server...');
execSync('next start', { stdio: 'inherit' });