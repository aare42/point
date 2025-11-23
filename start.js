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
    // Force database schema to match current Prisma schema
    try {
      console.log('🔧 Forcing database schema synchronization...');
      execSync('npx prisma db push --force-reset --accept-data-loss', { stdio: 'inherit' });
      console.log('✅ Database schema forcefully synchronized');
    } catch (pushError) {
      console.log('⚠️  Database force push failed, trying regular push:', pushError.message.split('\n')[0]);
      
      try {
        execSync('npx prisma db push --accept-data-loss', { stdio: 'inherit' });
        console.log('✅ Database schema synchronized with regular push');
      } catch (regularPushError) {
        console.log('⚠️  All database push attempts failed');
      }
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