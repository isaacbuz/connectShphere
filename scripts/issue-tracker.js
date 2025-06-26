#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class IssueTracker {
  constructor() {
    this.config = {
      logFile: process.env.LOG_FILE || 'logs/monitor.log',
      issuesFile: 'logs/tracked-issues.json',
      githubRepo: process.env.GITHUB_REPO || 'isaacbuz/connectShphere',
      checkInterval: parseInt(process.env.ISSUE_CHECK_INTERVAL) || 60000 // 1 minute
    };
    
    this.trackedIssues = this.loadTrackedIssues();
    this.errorPatterns = [
      {
        pattern: /MongoServerError: Command .+ requires authentication/,
        title: 'MongoDB Authentication Error',
        labels: ['bug', 'database', 'high-priority'],
        body: 'MongoDB requires authentication but the connection is not configured properly.'
      },
      {
        pattern: /Failed to resolve import "\.\/pages\/(.*?)" from/,
        title: 'Frontend Missing Component: $1',
        labels: ['bug', 'frontend', 'missing-file'],
        body: 'Frontend component is missing and needs to be created.'
      },
      {
        pattern: /Error: listen EADDRINUSE: address already in use :::(\d+)/,
        title: 'Port $1 Already in Use',
        labels: ['bug', 'infrastructure', 'port-conflict'],
        body: 'Port conflict detected. Another process is using the same port.'
      },
      {
        pattern: /No matching export in "(.*?)" for import/,
        title: 'Missing Export in $1',
        labels: ['bug', 'frontend', 'import-error'],
        body: 'Module is missing the expected export.'
      }
    ];
  }

  loadTrackedIssues() {
    try {
      if (fs.existsSync(this.config.issuesFile)) {
        return JSON.parse(fs.readFileSync(this.config.issuesFile, 'utf8'));
      }
    } catch (error) {
      console.error('Error loading tracked issues:', error);
    }
    return {};
  }

  saveTrackedIssues() {
    try {
      const dir = path.dirname(this.config.issuesFile);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.config.issuesFile, JSON.stringify(this.trackedIssues, null, 2));
    } catch (error) {
      console.error('Error saving tracked issues:', error);
    }
  }

  async scanLogs() {
    try {
      if (!fs.existsSync(this.config.logFile)) {
        console.log('No log file found to scan');
        return;
      }

      const logs = fs.readFileSync(this.config.logFile, 'utf8');
      const lines = logs.split('\n').slice(-1000); // Last 1000 lines

      for (const line of lines) {
        for (const errorPattern of this.errorPatterns) {
          const match = line.match(errorPattern.pattern);
          if (match) {
            await this.handleError(line, errorPattern, match);
          }
        }
      }
    } catch (error) {
      console.error('Error scanning logs:', error);
    }
  }

  async handleError(logLine, errorPattern, match) {
    let title = errorPattern.title;
    let body = errorPattern.body;
    
    // Replace placeholders with matched groups
    for (let i = 1; i < match.length; i++) {
      title = title.replace(`$${i}`, match[i]);
      body = body.replace(`$${i}`, match[i]);
    }

    const issueKey = this.generateIssueKey(title);
    
    if (!this.trackedIssues[issueKey]) {
      console.log(`📝 New issue detected: ${title}`);
      await this.createGitHubIssue(title, body, errorPattern.labels, issueKey);
    } else if (this.trackedIssues[issueKey].status === 'closed') {
      console.log(`🔄 Issue reopened: ${title}`);
      await this.reopenGitHubIssue(this.trackedIssues[issueKey].number, issueKey);
    }
  }

  generateIssueKey(title) {
    return title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  }

  async createGitHubIssue(title, body, labels, issueKey) {
    try {
      const fullBody = `${body}\n\n---\n**Detected by**: Automated Issue Tracker\n**Timestamp**: ${new Date().toISOString()}\n**Issue Key**: ${issueKey}`;
      
      const command = `gh issue create --repo ${this.config.githubRepo} --title "${title}" --body "${fullBody}" --label "${labels.join(',')}"`;
      
      console.log(`Creating GitHub issue: ${title}`);
      const output = execSync(command, { encoding: 'utf8' });
      
      // Extract issue number from output
      const issueMatch = output.match(/#(\d+)/);
      if (issueMatch) {
        const issueNumber = parseInt(issueMatch[1]);
        this.trackedIssues[issueKey] = {
          number: issueNumber,
          title: title,
          status: 'open',
          createdAt: new Date().toISOString()
        };
        this.saveTrackedIssues();
        console.log(`✅ Created issue #${issueNumber}: ${title}`);
      }
    } catch (error) {
      console.error(`Failed to create GitHub issue: ${error.message}`);
    }
  }

  async reopenGitHubIssue(issueNumber, issueKey) {
    try {
      const command = `gh issue reopen ${issueNumber} --repo ${this.config.githubRepo}`;
      execSync(command, { encoding: 'utf8' });
      
      this.trackedIssues[issueKey].status = 'open';
      this.trackedIssues[issueKey].reopenedAt = new Date().toISOString();
      this.saveTrackedIssues();
      
      console.log(`✅ Reopened issue #${issueNumber}`);
    } catch (error) {
      console.error(`Failed to reopen GitHub issue: ${error.message}`);
    }
  }

  async closeGitHubIssue(issueKey, comment) {
    const issue = this.trackedIssues[issueKey];
    if (!issue || issue.status === 'closed') return;

    try {
      const command = `gh issue close ${issue.number} --repo ${this.config.githubRepo} --comment "${comment}"`;
      execSync(command, { encoding: 'utf8' });
      
      this.trackedIssues[issueKey].status = 'closed';
      this.trackedIssues[issueKey].closedAt = new Date().toISOString();
      this.saveTrackedIssues();
      
      console.log(`✅ Closed issue #${issue.number}: ${issue.title}`);
    } catch (error) {
      console.error(`Failed to close GitHub issue: ${error.message}`);
    }
  }

  async checkGitHubCLI() {
    try {
      execSync('gh --version', { encoding: 'utf8' });
      return true;
    } catch (error) {
      console.error('❌ GitHub CLI (gh) is not installed or not in PATH');
      console.error('Please install it from: https://cli.github.com/');
      return false;
    }
  }

  async start() {
    console.log('🚀 Starting Issue Tracker');
    
    // Check if GitHub CLI is available
    const hasGitHubCLI = await this.checkGitHubCLI();
    if (!hasGitHubCLI) {
      console.log('📝 Running in log-only mode (no GitHub integration)');
    }

    // Initial scan
    await this.scanLogs();

    // Set up periodic scanning
    setInterval(() => {
      this.scanLogs();
    }, this.config.checkInterval);

    console.log(`📊 Monitoring logs every ${this.config.checkInterval / 1000} seconds`);
  }
}

// Export for use in other scripts
module.exports = IssueTracker;

// Run if called directly
if (require.main === module) {
  const tracker = new IssueTracker();
  tracker.start();
} 