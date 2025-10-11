#!/usr/bin/env node

/**
 * Production Database Testing Utility
 * Test production database connection and data
 */

const readline = require('readline')

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

function ask(question) {
  return new Promise(resolve => {
    rl.question(question, resolve)
  })
}

async function testProduction() {
  console.log('🔍 Production Database Testing Tool\n')
  
  const prodUrl = await ask('Enter your production URL (e.g., https://yourapp.railway.app): ')
  
  if (!prodUrl) {
    console.log('❌ Production URL required')
    rl.close()
    return
  }

  console.log('\n📊 Testing production endpoints...\n')

  const tests = [
    {
      name: 'Health Check',
      url: `${prodUrl}/api/health`,
      method: 'GET'
    },
    {
      name: 'Topics Count',
      url: `${prodUrl}/api/topics`,
      method: 'GET',
      test: (data) => {
        if (Array.isArray(data)) {
          return `✅ ${data.length} topics found`
        }
        return `❌ Invalid response: ${typeof data}`
      }
    },
    {
      name: 'Database Debug (requires admin login)',
      url: `${prodUrl}/api/admin/debug-import`,
      method: 'GET',
      note: 'Login to production as admin first, then visit this URL manually'
    }
  ]

  for (const test of tests) {
    try {
      console.log(`Testing: ${test.name}`)
      console.log(`URL: ${test.url}`)
      
      const response = await fetch(test.url)
      const data = await response.json()
      
      if (test.test) {
        console.log(test.test(data))
      } else if (response.ok) {
        console.log('✅ Success')
        if (test.note) {
          console.log(`📝 Note: ${test.note}`)
        }
      } else {
        console.log(`❌ Failed: ${response.status} ${response.statusText}`)
      }
    } catch (error) {
      console.log(`❌ Error: ${error.message}`)
    }
    console.log('')
  }

  console.log('🔧 Manual Testing Steps:')
  console.log('1. Visit your production site and sign in as admin')
  console.log(`2. Go to ${prodUrl}/admin`)
  console.log('3. Check if topics are visible in admin panel')
  console.log(`4. Visit ${prodUrl}/api/admin/debug-import for detailed database info`)
  console.log('5. Try exporting database to see what data exists')
  console.log('\n💡 Common Issues:')
  console.log('- Schema mismatch: Production might be using old schema')
  console.log('- User authorization: Topics might exist but not be visible')
  console.log('- Database connection: PostgreSQL connection issues')
  console.log('- Import duplication: Topics might be skipped due to existing slugs')

  rl.close()
}

testProduction().catch(console.error)