#!/usr/bin/env node

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

class StarlingMonitor {
  constructor() {
    this.config = {
      backendUrl: process.env.BACKEND_URL || 'http://localhost:3000',
      frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
      checkInterval: parseInt(process.env.CHECK_INTERVAL) || 30000, // 30 seconds
      logFile: process.env.LOG_FILE || 'logs/monitor.log',
      alertThreshold: parseInt(process.env.ALERT_THRESHOLD) || 3 // consecutive failures
    };
    
    this.stats = {
      backend: { healthy: true, lastCheck: null, consecutiveFailures: 0 },
      frontend: { healthy: true, lastCheck: null, consecutiveFailures: 0 },
      startTime: new Date(),
      totalChecks: 0,
      totalFailures: 0
    };

    this.ensureLogDirectory();
    this.startMonitoring();
  }

  ensureLogDirectory() {
    const logDir = path.dirname(this.config.logFile);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
  }

  log(message, level = 'INFO') {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${level}] ${message}`;
    
    console.log(logMessage);
    
    // Write to file
    fs.appendFileSync(this.config.logFile, logMessage + '\n');
  }

  async checkHealth(url, service) {
    return new Promise((resolve) => {
      const protocol = url.startsWith('https') ? https : http;
      const timeout = setTimeout(() => {
        resolve({ healthy: false, error: 'Timeout' });
      }, 5000);

      protocol.get(url + '/health', (res) => {
        clearTimeout(timeout);
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          try {
            const response = JSON.parse(data);
            resolve({ 
              healthy: res.statusCode === 200 && response.status === 'ok',
              statusCode: res.statusCode,
              response: response
            });
          } catch (error) {
            resolve({ healthy: false, error: 'Invalid JSON response' });
          }
        });
      }).on('error', (error) => {
        clearTimeout(timeout);
        resolve({ healthy: false, error: error.message });
      });
    });
  }

  async checkBackend() {
    const result = await this.checkHealth(this.config.backendUrl, 'backend');
    const wasHealthy = this.stats.backend.healthy;
    
    this.stats.backend.lastCheck = new Date();
    this.stats.backend.healthy = result.healthy;
    
    if (result.healthy) {
      this.stats.backend.consecutiveFailures = 0;
      if (!wasHealthy) {
        this.log(`✅ Backend recovered`, 'SUCCESS');
      }
    } else {
      this.stats.backend.consecutiveFailures++;
      this.stats.totalFailures++;
      
      this.log(`❌ Backend health check failed: ${result.error || result.statusCode}`, 'ERROR');
      
      if (this.stats.backend.consecutiveFailures >= this.config.alertThreshold) {
        this.log(`🚨 Backend alert: ${this.stats.backend.consecutiveFailures} consecutive failures`, 'ALERT');
      }
    }
  }

  async checkFrontend() {
    const result = await this.checkHealth(this.config.frontendUrl, 'frontend');
    const wasHealthy = this.stats.frontend.healthy;
    
    this.stats.frontend.lastCheck = new Date();
    this.stats.frontend.healthy = result.healthy;
    
    if (result.healthy) {
      this.stats.frontend.consecutiveFailures = 0;
      if (!wasHealthy) {
        this.log(`✅ Frontend recovered`, 'SUCCESS');
      }
    } else {
      this.stats.frontend.consecutiveFailures++;
      this.stats.totalFailures++;
      
      this.log(`❌ Frontend health check failed: ${result.error || result.statusCode}`, 'ERROR');
      
      if (this.stats.frontend.consecutiveFailures >= this.config.alertThreshold) {
        this.log(`🚨 Frontend alert: ${this.stats.frontend.consecutiveFailures} consecutive failures`, 'ALERT');
      }
    }
  }

  async performHealthChecks() {
    this.stats.totalChecks++;
    
    await Promise.all([
      this.checkBackend(),
      this.checkFrontend()
    ]);
    
    // Log summary every 10 checks
    if (this.stats.totalChecks % 10 === 0) {
      this.logSummary();
    }
  }

  logSummary() {
    const uptime = Date.now() - this.stats.startTime.getTime();
    const uptimeHours = Math.floor(uptime / (1000 * 60 * 60));
    const uptimeMinutes = Math.floor((uptime % (1000 * 60 * 60)) / (1000 * 60));
    
    const successRate = ((this.stats.totalChecks - this.stats.totalFailures) / this.stats.totalChecks * 100).toFixed(2);
    
    this.log(`📊 Monitor Summary - Uptime: ${uptimeHours}h ${uptimeMinutes}m, Checks: ${this.stats.totalChecks}, Failures: ${this.stats.totalFailures}, Success Rate: ${successRate}%`, 'INFO');
  }

  startMonitoring() {
    this.log(`🚀 Starling.ai Monitor started`, 'INFO');
    this.log(`📡 Backend URL: ${this.config.backendUrl}`, 'INFO');
    this.log(`🌐 Frontend URL: ${this.config.frontendUrl}`, 'INFO');
    this.log(`⏱️  Check interval: ${this.config.checkInterval}ms`, 'INFO');
    
    // Perform initial checks
    this.performHealthChecks();
    
    // Set up periodic checks
    setInterval(() => {
      this.performHealthChecks();
    }, this.config.checkInterval);
    
    // Handle graceful shutdown
    process.on('SIGINT', () => {
      this.log(`🛑 Monitor shutting down gracefully`, 'INFO');
      this.logSummary();
      process.exit(0);
    });
    
    process.on('SIGTERM', () => {
      this.log(`🛑 Monitor shutting down gracefully`, 'INFO');
      this.logSummary();
      process.exit(0);
    });
  }
}

// Start monitoring
new StarlingMonitor(); 