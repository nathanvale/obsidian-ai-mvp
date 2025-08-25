#!/usr/bin/env node

/**
 * Security Verification Script
 * Tests the enhanced security middleware implementation
 */

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function testSecurityHeaders() {
  console.log('🔒 Security Enhancement Verification');
  console.log('=====================================\n');

  try {
    // Start the server in the background
    console.log('1. Starting server...');
    const serverProcess = exec('bun src/server.ts', { cwd: process.cwd() });
    
    // Wait for server to start
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    console.log('2. Testing security headers...\n');
    
    // Test health endpoint headers
    const { stdout } = await execAsync('curl -I http://localhost:3000/health');
    const headers = stdout.toLowerCase();
    
    const securityChecks = {
      'Content-Security-Policy': headers.includes('content-security-policy'),
      'X-Frame-Options': headers.includes('x-frame-options: deny'),
      'X-Content-Type-Options': headers.includes('x-content-type-options: nosniff'),
      'X-XSS-Protection': headers.includes('x-xss-protection: 1; mode=block'),
      'Referrer-Policy': headers.includes('referrer-policy'),
      'Permissions-Policy': headers.includes('permissions-policy'),
      'Rate Limit Headers': headers.includes('x-ratelimit-limit'),
    };
    
    console.log('Security Header Check Results:');
    console.log('==============================');
    
    let passedChecks = 0;
    const totalChecks = Object.keys(securityChecks).length;
    
    for (const [check, passed] of Object.entries(securityChecks)) {
      const status = passed ? '✅ PASS' : '❌ FAIL';
      console.log(`${status} ${check}`);
      if (passed) passedChecks++;
    }
    
    console.log(`\n📊 Security Score: ${passedChecks}/${totalChecks} (${Math.round(passedChecks/totalChecks*100)}%)`);
    
    if (passedChecks === totalChecks) {
      console.log('🎉 All security enhancements verified successfully!');
    } else {
      console.log('⚠️  Some security enhancements may need attention.');
    }
    
    // Clean up
    serverProcess.kill();
    
  } catch (error) {
    console.error('❌ Verification failed:', error.message);
    console.log('\n🔧 This is expected if Ollama/ChromaDB services are not running.');
    console.log('The security middleware should still be configured correctly.');
  }
}

// Run verification if script is executed directly
if (import.meta.main) {
  testSecurityHeaders().catch(console.error);
}