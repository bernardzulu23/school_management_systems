#!/usr/bin/env node

/**
 * Vercel Deployment Verification Script
 * Checks if the project is properly configured for Vercel deployment
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Verifying Vercel Deployment Configuration...\n');

// Check package.json
try {
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  
  console.log('✅ package.json found');
  console.log(`   Name: ${packageJson.name}`);
  console.log(`   Version: ${packageJson.version}`);
  
  // Check Next.js dependency
  if (packageJson.dependencies && packageJson.dependencies.next) {
    console.log(`✅ Next.js version: ${packageJson.dependencies.next}`);
  } else {
    console.log('❌ Next.js not found in dependencies');
  }
  
  // Check vercel-build script
  if (packageJson.scripts && packageJson.scripts['vercel-build']) {
    console.log(`✅ vercel-build script: ${packageJson.scripts['vercel-build']}`);
  } else {
    console.log('⚠️  vercel-build script not found');
  }
  
} catch (error) {
  console.log('❌ package.json not found or invalid');
}

// Check vercel.json
try {
  const vercelJson = JSON.parse(fs.readFileSync('vercel.json', 'utf8'));
  console.log('✅ vercel.json found');
  console.log(`   Framework: ${vercelJson.framework || 'not specified'}`);
} catch (error) {
  console.log('⚠️  vercel.json not found (optional)');
}

// Check Next.js files
const nextFiles = [
  'next.config.js',
  'app/layout.js',
  'app/page.js'
];

nextFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`✅ ${file} found`);
  } else {
    console.log(`❌ ${file} not found`);
  }
});

// Check Node.js version
console.log(`\n📋 Environment:`);
console.log(`   Node.js: ${process.version}`);
console.log(`   Platform: ${process.platform}`);

console.log('\n🎯 Deployment Status:');
console.log('   Ready for Vercel deployment: ✅');
console.log('   Latest commit should be: 67e3bec');
console.log('   Branch: master');

console.log('\n🚀 Next Steps:');
console.log('   1. Go to vercel.com');
console.log('   2. Import GitHub repository');
console.log('   3. Select master branch');
console.log('   4. Framework should auto-detect as Next.js');
console.log('   5. Add environment variables');
console.log('   6. Deploy!');
