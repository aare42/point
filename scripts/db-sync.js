#!/usr/bin/env node

/**
 * Database synchronization utility for Point Platform
 * Helps manage content between local SQLite and production PostgreSQL
 */

const fs = require('fs')
const path = require('path')

const COMMANDS = {
  'switch-local': {
    desc: 'Switch to SQLite for local development',
    action: () => switchToLocal()
  },
  'switch-prod': {
    desc: 'Switch to PostgreSQL for production',
    action: () => switchToProd()
  },
  'export-local': {
    desc: 'Export local SQLite data to JSON file',
    action: () => exportLocalData()
  },
  'help': {
    desc: 'Show this help message',
    action: () => showHelp()
  }
}

function switchToLocal() {
  console.log('🔄 Switching to SQLite (local development)...')
  
  // Copy main schema
  const localSchema = path.join(process.cwd(), 'prisma', 'schema.prisma')
  const content = fs.readFileSync(localSchema, 'utf8')
  
  if (content.includes('provider = "sqlite"')) {
    console.log('✅ Already using SQLite')
    return
  }
  
  const updatedContent = content.replace(
    'provider = "postgresql"',
    'provider = "sqlite"'
  )
  
  fs.writeFileSync(localSchema, updatedContent)
  console.log('✅ Updated schema.prisma to use SQLite')
  console.log('📝 Run: npx prisma generate && npx prisma migrate dev')
}

function switchToProd() {
  console.log('🔄 Switching to PostgreSQL (production)...')
  
  const localSchema = path.join(process.cwd(), 'prisma', 'schema.prisma')
  const prodSchema = path.join(process.cwd(), 'prisma', 'schema.production.prisma')
  
  if (!fs.existsSync(prodSchema)) {
    console.error('❌ Production schema not found at:', prodSchema)
    return
  }
  
  // Copy production schema to main schema
  const prodContent = fs.readFileSync(prodSchema, 'utf8')
  fs.writeFileSync(localSchema, prodContent)
  
  console.log('✅ Updated schema.prisma to use PostgreSQL')
  console.log('📝 Run: npx prisma generate && npx prisma migrate deploy')
}

function exportLocalData() {
  console.log('📤 Exporting local SQLite data...')
  console.log('📝 Use the web interface:')
  console.log('   1. Visit: http://localhost:3000')
  console.log('   2. Sign in as admin')
  console.log('   3. Go to admin panel')
  console.log('   4. Click "Export Database" button')
  console.log('   5. Save the JSON file')
}

function showHelp() {
  console.log('📚 Database Synchronization Utility\n')
  console.log('Available commands:')
  Object.entries(COMMANDS).forEach(([cmd, info]) => {
    console.log(`  ${cmd.padEnd(15)} ${info.desc}`)
  })
  console.log('\nUsage:')
  console.log('  node scripts/db-sync.js <command>')
  console.log('\nWorkflow for pushing content to production:')
  console.log('  1. Develop locally with SQLite')
  console.log('  2. Export data using admin panel')
  console.log('  3. Switch to production environment')
  console.log('  4. Import data using admin panel')
  console.log('\nEnvironment files:')
  console.log('  .env.local      - Local development (SQLite)')
  console.log('  .env.production - Production (PostgreSQL)')
}

// Main execution
const command = process.argv[2]

if (!command || !COMMANDS[command]) {
  console.error('❌ Invalid or missing command')
  showHelp()
  process.exit(1)
}

COMMANDS[command].action()