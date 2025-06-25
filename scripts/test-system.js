#!/usr/bin/env node

const http = require('http');
const https = require('https');

class SystemTester {
  constructor() {
    this.config = {
      backendUrl: process.env.BACKEND_URL || 'http://localhost:3000',
      frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
      timeout: 5000
    };
    
    this.results = {
      backend: { status: 'unknown', details: '' },
      frontend: { status: 'unknown', details: '' },
      database: { status: 'unknown', details: '' },
      api: { status: 'unknown', details: '' }
    };
  }

  log(message, level = 'INFO') {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [${level}] ${message}`);
  }

  async makeRequest(url, options = {}) {
    return new Promise((resolve) => {
      const protocol = url.startsWith('https') ? https : http;
      const timeout = setTimeout(() => {
        resolve({ success: false, error: 'Timeout' });
      }, this.config.timeout);

      const req = protocol.request(url, options, (res) => {
        clearTimeout(timeout);
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          try {
            const response = data ? JSON.parse(data) : {};
            resolve({ 
              success: res.statusCode >= 200 && res.statusCode < 300,
              statusCode: res.statusCode,
              data: response
            });
          } catch (error) {
            resolve({ 
              success: res.statusCode >= 200 && res.statusCode < 300,
              statusCode: res.statusCode,
              data: data
            });
          }
        });
      });

      req.on('error', (error) => {
        clearTimeout(timeout);
        resolve({ success: false, error: error.message });
      });

      if (options.body) {
        req.write(options.body);
      }
      
      req.end();
    });
  }

  async testBackend() {
    this.log('Testing backend health...');
    
    const result = await this.makeRequest(`${this.config.backendUrl}/health`);
    
    if (result.success && result.data.status === 'ok') {
      this.results.backend = { status: 'healthy', details: 'Backend is responding correctly' };
      this.log('✅ Backend is healthy', 'SUCCESS');
    } else {
      this.results.backend = { 
        status: 'unhealthy', 
        details: `Backend health check failed: ${result.error || result.statusCode}` 
      };
      this.log(`❌ Backend health check failed: ${result.error || result.statusCode}`, 'ERROR');
    }
  }

  async testFrontend() {
    this.log('Testing frontend...');
    
    const result = await this.makeRequest(this.config.frontendUrl);
    
    if (result.success) {
      this.results.frontend = { status: 'healthy', details: 'Frontend is responding correctly' };
      this.log('✅ Frontend is healthy', 'SUCCESS');
    } else {
      this.results.frontend = { 
        status: 'unhealthy', 
        details: `Frontend check failed: ${result.error || result.statusCode}` 
      };
      this.log(`❌ Frontend check failed: ${result.error || result.statusCode}`, 'ERROR');
    }
  }

  async testDatabase() {
    this.log('Testing database connection via API...');
    
    // Test a simple API call that requires database
    const result = await this.makeRequest(`${this.config.backendUrl}/api/users`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (result.success || result.statusCode === 401) {
      // 401 means the API is working but requires auth (which means DB is connected)
      this.results.database = { status: 'healthy', details: 'Database connection is working' };
      this.log('✅ Database connection is healthy', 'SUCCESS');
    } else if (result.statusCode === 500 && result.data.error && result.data.error.includes('Database')) {
      this.results.database = { 
        status: 'unhealthy', 
        details: 'Database connection failed' 
      };
      this.log('❌ Database connection failed', 'ERROR');
    } else {
      this.results.database = { 
        status: 'unknown', 
        details: 'Database status unclear' 
      };
      this.log('⚠️ Database status unclear', 'WARNING');
    }
  }

  async testAPI() {
    this.log('Testing API endpoints...');
    
    // Test registration endpoint
    const testUser = {
      username: `testuser_${Date.now()}`,
      email: `test_${Date.now()}@example.com`,
      password: 'password123',
      walletAddress: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6'
    };

    const result = await this.makeRequest(`${this.config.backendUrl}/api/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testUser)
    });
    
    if (result.success) {
      this.results.api = { status: 'healthy', details: 'API registration endpoint working' };
      this.log('✅ API registration endpoint is working', 'SUCCESS');
    } else if (result.statusCode === 409) {
      this.results.api = { status: 'healthy', details: 'API working (user already exists)' };
      this.log('✅ API is working (user already exists)', 'SUCCESS');
    } else {
      this.results.api = { 
        status: 'unhealthy', 
        details: `API registration failed: ${result.error || result.statusCode} - ${JSON.stringify(result.data)}` 
      };
      this.log(`❌ API registration failed: ${result.error || result.statusCode}`, 'ERROR');
      this.log(`Details: ${JSON.stringify(result.data)}`, 'ERROR');
    }
  }

  async runAllTests() {
    this.log('🚀 Starting Starling.ai System Tests', 'INFO');
    this.log(`📡 Backend URL: ${this.config.backendUrl}`, 'INFO');
    this.log(`🌐 Frontend URL: ${this.config.frontendUrl}`, 'INFO');
    
    await Promise.all([
      this.testBackend(),
      this.testFrontend(),
      this.testDatabase(),
      this.testAPI()
    ]);
    
    this.printSummary();
  }

  printSummary() {
    this.log('\n📊 System Test Summary', 'INFO');
    this.log('=' * 50, 'INFO');
    
    Object.entries(this.results).forEach(([component, result]) => {
      const status = result.status === 'healthy' ? '✅' : result.status === 'unhealthy' ? '❌' : '⚠️';
      this.log(`${status} ${component.toUpperCase()}: ${result.status}`, 'INFO');
      if (result.details) {
        this.log(`   Details: ${result.details}`, 'INFO');
      }
    });
    
    const healthyCount = Object.values(this.results).filter(r => r.status === 'healthy').length;
    const totalCount = Object.keys(this.results).length;
    
    this.log('\n' + '=' * 50, 'INFO');
    this.log(`Overall Status: ${healthyCount}/${totalCount} components healthy`, 'INFO');
    
    if (healthyCount === totalCount) {
      this.log('🎉 All systems operational!', 'SUCCESS');
    } else if (healthyCount >= totalCount / 2) {
      this.log('⚠️ Some systems need attention', 'WARNING');
    } else {
      this.log('🚨 Multiple system failures detected', 'ERROR');
    }
  }
}

// Run tests
const tester = new SystemTester();
tester.runAllTests().catch(console.error); 