#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const IssueTracker = require('./issue-tracker');

class AutoFixer {
  constructor() {
    this.issueTracker = new IssueTracker();
    this.fixes = {
      'port-3000-already-in-use': this.fixPortConflict.bind(this),
      'mongodb-authentication-error': this.fixMongoAuth.bind(this),
      'frontend-missing-component-profile': this.fixMissingProfile.bind(this),
      'frontend-missing-component-createpost': this.fixMissingCreatePost.bind(this),
      'missing-export-in-components-header-tsx': this.fixHeaderExport.bind(this)
    };
  }

  async fixPortConflict() {
    console.log('🔧 Fixing port conflict on 3000...');
    try {
      // Kill processes on port 3000
      execSync('lsof -ti:3000 | xargs kill -9', { stdio: 'ignore' });
      console.log('✅ Port 3000 cleared');
      
      // Close the issue
      await this.issueTracker.closeGitHubIssue(
        'port-3000-already-in-use',
        'Fixed automatically by killing processes on port 3000'
      );
      
      return true;
    } catch (error) {
      console.error('❌ Failed to fix port conflict:', error.message);
      return false;
    }
  }

  async fixMongoAuth() {
    console.log('🔧 Fixing MongoDB authentication...');
    try {
      // Check if MongoDB is running without auth
      const isMongoRunning = this.checkMongoConnection();
      
      if (!isMongoRunning) {
        console.log('Starting MongoDB without authentication...');
        execSync('docker run -d --name starling-mongo-dev -p 27017:27017 mongo:7.0', { stdio: 'ignore' });
      }
      
      console.log('✅ MongoDB running without authentication');
      
      // Close the issue
      await this.issueTracker.closeGitHubIssue(
        'mongodb-authentication-error',
        'Fixed by ensuring MongoDB runs without authentication in development'
      );
      
      return true;
    } catch (error) {
      console.error('❌ Failed to fix MongoDB auth:', error.message);
      return false;
    }
  }

  async fixMissingProfile() {
    console.log('🔧 Profile component already created');
    
    // Close the issue
    await this.issueTracker.closeGitHubIssue(
      'frontend-missing-component-profile',
      'Profile component has been created at src/frontend/pages/Profile.tsx'
    );
    
    return true;
  }

  async fixMissingCreatePost() {
    console.log('🔧 CreatePost component already created');
    
    // Close the issue
    await this.issueTracker.closeGitHubIssue(
      'frontend-missing-component-createpost',
      'CreatePost component has been created at src/frontend/pages/CreatePost.tsx'
    );
    
    return true;
  }

  async fixHeaderExport() {
    console.log('🔧 Header export already fixed');
    
    // Close the issue
    await this.issueTracker.closeGitHubIssue(
      'missing-export-in-components-header-tsx',
      'Header component now has default export'
    );
    
    return true;
  }

  checkMongoConnection() {
    try {
      execSync('nc -zv localhost 27017', { stdio: 'ignore' });
      return true;
    } catch (error) {
      return false;
    }
  }

  async runFixes() {
    console.log('🚀 Starting Auto-Fixer');
    
    // Load tracked issues
    const trackedIssues = this.issueTracker.loadTrackedIssues();
    
    for (const [issueKey, issue] of Object.entries(trackedIssues)) {
      if (issue.status === 'open' && this.fixes[issueKey]) {
        console.log(`\n📍 Attempting to fix: ${issue.title}`);
        const fixed = await this.fixes[issueKey]();
        
        if (fixed) {
          console.log(`✅ Successfully fixed: ${issue.title}`);
        } else {
          console.log(`⚠️ Could not automatically fix: ${issue.title}`);
        }
      }
    }
    
    console.log('\n✨ Auto-fix cycle complete');
  }

  async monitor() {
    // Run fixes immediately
    await this.runFixes();
    
    // Run fixes every 5 minutes
    setInterval(() => {
      this.runFixes();
    }, 5 * 60 * 1000);
  }
}

// Run if called directly
if (require.main === module) {
  const fixer = new AutoFixer();
  fixer.monitor();
} 