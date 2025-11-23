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

// Set up database schema and handle manual migration state
try {
  console.log('📦 Setting up database schema...');
  console.log('Database URL:', process.env.DATABASE_URL ? 'Set' : 'Missing');
  
  if (process.env.DATABASE_URL) {
    // First, try to resolve the manually applied migration
    try {
      console.log('🔧 Resolving manually applied migration...');
      execSync('npx prisma migrate resolve --applied 20251123082909_add_user_blocking', { stdio: 'inherit' });
      console.log('✅ Migration state resolved');
    } catch (resolveError) {
      console.log('⚠️  Migration resolve failed (might be already resolved):', resolveError.message);
    }
    
    // Then deploy any pending migrations
    try {
      console.log('🚀 Deploying migrations...');
      execSync('npx prisma migrate deploy', { stdio: 'inherit' });
      console.log('✅ Migrations deployed successfully');
    } catch (migrateError) {
      console.log('⚠️  Migration deploy failed, trying db push...');
      // Fallback to db push if migrations fail
      execSync('npx prisma db push --accept-data-loss', { stdio: 'inherit' });
      console.log('✅ Database schema created with db push');
    }
  } else {
    console.log('⚠️  No DATABASE_URL found, skipping database setup');
  }
} catch (error) {
  console.error('❌ Database setup failed:', error.message);
  console.log('🔄 Continuing without database setup...');
  // Don't exit - allow the app to start even if DB setup fails
}

// Seed database in development or if explicitly enabled
const shouldSeed = process.env.NODE_ENV === 'development' || 
                  process.env.ENABLE_SEEDING === 'true' ||
                  process.env.RAILWAY_ENVIRONMENT; // Enable on Railway

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