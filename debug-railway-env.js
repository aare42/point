#!/usr/bin/env node

console.log('🔍 Railway Environment Debug Information');
console.log('=====================================');

console.log('📦 Node.js version:', process.version);
console.log('🏗️  Platform:', process.platform);
console.log('🏛️  Architecture:', process.arch);
console.log('📁 Working directory:', process.cwd());
console.log('🌍 NODE_ENV:', process.env.NODE_ENV);

console.log('\n📋 Package manager check:');
try {
  const { execSync } = require('child_process');
  console.log('npm version:', execSync('npm --version', { encoding: 'utf8' }).trim());
} catch (e) {
  console.log('npm check failed:', e.message);
}

console.log('\n🎨 CSS Build Tools:');
try {
  const postcssVersion = require('postcss/package.json').version;
  console.log('PostCSS version:', postcssVersion);
} catch (e) {
  console.log('PostCSS not found:', e.message);
}

try {
  const tailwindVersion = require('tailwindcss/package.json').version;
  console.log('Tailwind version:', tailwindVersion);
} catch (e) {
  console.log('Tailwind not found:', e.message);
}

console.log('\n🔧 Environment Variables:');
console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'Set (PostgreSQL)' : 'Missing');
console.log('NEXTAUTH_URL:', process.env.NEXTAUTH_URL ? 'Set' : 'Missing');
console.log('NEXTAUTH_SECRET:', process.env.NEXTAUTH_SECRET ? 'Set' : 'Missing');

console.log('\n📁 File System Check:');
const fs = require('fs');
const files = ['next.config.js', 'postcss.config.js', 'tailwind.config.ts', 'src/app/globals.css'];
files.forEach(file => {
  console.log(`${file}:`, fs.existsSync(file) ? '✅ Exists' : '❌ Missing');
});

console.log('\n✅ Debug complete');