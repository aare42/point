#!/usr/bin/env node

const { execSync } = require('child_process');

console.log('🚀 Starting Point Educational Platform (Simple Mode)...');

// Just start Next.js without complex setup
console.log('🎯 Starting Next.js server...');
execSync('next start', { stdio: 'inherit' });